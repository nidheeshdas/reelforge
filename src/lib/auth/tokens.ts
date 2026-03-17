import { createHash, randomBytes } from 'node:crypto';
import prisma from '@/lib/db/prisma';

const PASSWORD_RESET_WINDOW_MS = 1000 * 60 * 60;
const EMAIL_VERIFICATION_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function createRawToken() {
  return randomBytes(32).toString('hex');
}

export async function createPasswordResetToken(userId: number) {
  const token = createRawToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function consumePasswordResetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  return prisma.$transaction(async (tx) => {
    const tokenRecord = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      return null;
    }

    await tx.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    return tokenRecord;
  });
}

export async function createEmailVerificationToken(userId: number) {
  const token = createRawToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_WINDOW_MS);

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function consumeEmailVerificationToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  return prisma.$transaction(async (tx) => {
    const tokenRecord = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      return null;
    }

    const verifiedAt = tokenRecord.user.emailVerified ?? new Date();

    await Promise.all([
      tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      tx.user.update({
        where: { id: tokenRecord.userId },
        data: { emailVerified: verifiedAt },
      }),
    ]);

    return tokenRecord;
  });
}
