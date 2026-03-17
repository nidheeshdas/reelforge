import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireSessionUserId } from '@/lib/auth/session';
import { getCreditPack } from '@/lib/billing/catalog';
import { getStripeClient } from '@/lib/billing/stripe';
import { getAppUrl } from '@/lib/app-url';

function getBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUserId();

    if (auth.response) {
      return auth.response;
    }

    const { packId } = (await request.json()) as { packId?: string };

    if (!packId) {
      return NextResponse.json({ error: 'Pack ID is required' }, { status: 400 });
    }

    const pack = getCreditPack(packId);

    if (!pack) {
      return NextResponse.json({ error: 'Unknown credit pack' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stripe = getStripeClient();
    const baseUrl = getAppUrl(getBaseUrl(request));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: String(auth.userId),
      customer: user.stripeCustomerId ?? undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      success_url: `${baseUrl}/account?tab=billing&checkout=success`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      metadata: {
        userId: String(auth.userId),
        packId: pack.id,
        credits: String(pack.credits),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pack.priceCents,
            product_data: {
              name: `${pack.name} — ${pack.credits} credits`,
              description: pack.description,
            },
          },
        },
      ],
      allow_promotion_codes: false,
      submit_type: 'pay',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
