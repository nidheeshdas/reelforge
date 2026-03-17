import { CreditTransactionType, Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { getCreditPack, RENDER_CREDIT_COST } from '@/lib/billing/catalog';

export class InsufficientCreditsError extends Error {
  code = 'INSUFFICIENT_CREDITS' as const;
  status = 402;

  constructor(
    public readonly available: number,
    public readonly required: number,
  ) {
    super('Insufficient credits');
  }
}

export async function createSignupBonusTransaction(userId: number, balanceAfter: number) {
  return prisma.creditTransaction.create({
    data: {
      userId,
      type: CreditTransactionType.signup_bonus,
      amount: balanceAfter,
      balanceAfter,
      description: 'Welcome credits',
    },
  });
}

export async function createRenderWithDebit({
  userId,
  vidscript,
  resolution,
}: {
  userId: number;
  vidscript: string;
  resolution: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
      },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    if (user.credits < RENDER_CREDIT_COST) {
      throw new InsufficientCreditsError(user.credits, RENDER_CREDIT_COST);
    }

    const render = await tx.render.create({
      data: {
        userId,
        vidscript,
        status: 'pending',
        progress: 0,
        resolution,
        creditsUsed: RENDER_CREDIT_COST,
      },
    });

    const nextBalance = user.credits - RENDER_CREDIT_COST;

    await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: RENDER_CREDIT_COST } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: CreditTransactionType.render_debit,
        amount: -RENDER_CREDIT_COST,
        balanceAfter: nextBalance,
        description: `Render #${render.id} started`,
        renderId: render.id,
        metadata: {
          resolution,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return {
      render,
      user,
      balance: nextBalance,
    };
  });
}

export async function refundRenderCredit(renderId: number, reason: string) {
  return prisma.$transaction(async (tx) => {
    const existingRefund = await tx.creditTransaction.findUnique({
      where: {
        renderId_type: {
          renderId,
          type: CreditTransactionType.render_refund,
        },
      },
    });

    if (existingRefund) {
      const user = await tx.user.findUnique({
        where: { id: existingRefund.userId },
        select: { credits: true, email: true, name: true },
      });

      return user
        ? {
            refunded: false,
            amount: 0,
            balance: user.credits,
            email: user.email,
            name: user.name,
          }
        : null;
    }

    const render = await tx.render.findUnique({
      where: { id: renderId },
      select: {
        id: true,
        userId: true,
        creditsUsed: true,
      },
    });

    if (!render) {
      return null;
    }

    const debit = await tx.creditTransaction.findUnique({
      where: {
        renderId_type: {
          renderId,
          type: CreditTransactionType.render_debit,
        },
      },
    });

    if (!debit) {
      return null;
    }

    const user = await tx.user.findUnique({
      where: { id: render.userId },
      select: { credits: true, email: true, name: true },
    });

    if (!user) {
      return null;
    }

    const refundAmount = Math.max(render.creditsUsed, 1);
    const nextBalance = user.credits + refundAmount;

    await tx.user.update({
      where: { id: render.userId },
      data: { credits: { increment: refundAmount } },
    });

    await tx.creditTransaction.create({
      data: {
        userId: render.userId,
        type: CreditTransactionType.render_refund,
        amount: refundAmount,
        balanceAfter: nextBalance,
        description: `Refund for failed render #${render.id}`,
        renderId: render.id,
        metadata: {
          reason,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return {
      refunded: true,
      amount: refundAmount,
      balance: nextBalance,
      email: user.email,
      name: user.name,
    };
  });
}

export async function fulfillStripeCheckout({
  eventId,
  payload,
}: {
  eventId: string;
  payload: {
    type: string;
    userId: number;
    packId: string;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId?: string | null;
    stripeCustomerId?: string | null;
  };
}) {
  const pack = getCreditPack(payload.packId);

  if (!pack) {
    throw new Error(`Unknown credit pack: ${payload.packId}`);
  }

  const eventRecord = await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: eventId,
      type: payload.type,
      status: 'processing',
      payload: payload satisfies Prisma.InputJsonValue,
    },
  }).catch(async (error: unknown) => {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.stripeWebhookEvent.findUnique({
        where: { stripeEventId: eventId },
      });

      if (existing) {
        return existing;
      }
    }

    throw error;
  });

  if (eventRecord.processedAt) {
    return { processed: false, reason: 'already-processed' as const };
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new Error('Stripe checkout references a missing user.');
    }

    const existingPurchase = await tx.creditTransaction.findUnique({
      where: {
        stripeCheckoutSessionId_type: {
          stripeCheckoutSessionId: payload.stripeCheckoutSessionId,
          type: CreditTransactionType.stripe_purchase,
        },
      },
    });

    if (existingPurchase) {
      await tx.stripeWebhookEvent.update({
        where: { stripeEventId: eventId },
        data: {
          status: 'processed',
          processedAt: existingPurchase.createdAt,
          lastError: null,
        },
      });

      return {
        processed: false,
        reason: 'already-fulfilled' as const,
        email: user.email,
        name: user.name,
        balance: user.credits,
        pack,
      };
    }

    const nextBalance = user.credits + pack.credits;

    await tx.user.update({
      where: { id: user.id },
      data: {
        credits: { increment: pack.credits },
        stripeCustomerId: payload.stripeCustomerId ?? user.stripeCustomerId ?? undefined,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        type: CreditTransactionType.stripe_purchase,
        amount: pack.credits,
        balanceAfter: nextBalance,
        description: `${pack.name} purchase`,
        packId: pack.id,
        packName: pack.name,
        stripeCheckoutSessionId: payload.stripeCheckoutSessionId,
        stripePaymentIntentId: payload.stripePaymentIntentId ?? undefined,
        metadata: {
          priceCents: pack.priceCents,
          credits: pack.credits,
        } satisfies Prisma.InputJsonValue,
      },
    });

    await tx.stripeWebhookEvent.update({
      where: { stripeEventId: eventId },
      data: {
        status: 'processed',
        processedAt: new Date(),
        lastError: null,
      },
    });

    return {
      processed: true,
      reason: 'fulfilled' as const,
      email: user.email,
      name: user.name,
      balance: nextBalance,
      pack,
    };
  }).catch(async (error) => {
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: eventId },
      data: {
        status: 'failed',
        lastError: error instanceof Error ? error.message : 'Unknown webhook fulfillment error',
      },
    });

    throw error;
  });

  return result;
}

export async function getBillingSnapshot(userId: number) {
  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        emailVerified: true,
      },
    }),
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        packId: true,
        packName: true,
        renderId: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error('User not found.');
  }

  return {
    balance: user.credits,
    emailVerified: user.emailVerified,
    transactions,
  };
}
