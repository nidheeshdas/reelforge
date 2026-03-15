import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';

interface UpsertConnectionInput {
  userId: number;
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
}

export async function upsertConnectedApp({
  userId,
  provider,
  accessToken,
  refreshToken,
  expiresAt,
  metadata = {},
}: UpsertConnectionInput) {
  return prisma.connectedApp.upsert({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    create: {
      userId,
      provider,
      accessToken: encrypt(accessToken),
      refreshToken: refreshToken ? encrypt(refreshToken) : null,
      expiresAt: expiresAt ?? null,
      metadata,
    },
    update: {
      accessToken: encrypt(accessToken),
      refreshToken: refreshToken ? encrypt(refreshToken) : null,
      expiresAt: expiresAt ?? null,
      metadata,
    },
  });
}
