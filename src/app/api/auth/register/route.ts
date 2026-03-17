import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { createEmailVerificationToken } from '@/lib/auth/tokens';
import { sendEmailVerificationEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/app-url';

const SIGNUP_CREDITS = 5;

export async function POST(request: Request) {
  try {
    const { email, password, name } = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string | null;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: name || normalizedEmail.split('@')[0],
          credits: SIGNUP_CREDITS,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: createdUser.id,
          type: 'signup_bonus',
          amount: SIGNUP_CREDITS,
          balanceAfter: SIGNUP_CREDITS,
          description: 'Welcome credits',
        },
      });

      return createdUser;
    });

    const { token } = await createEmailVerificationToken(user.id);
    const appUrl = getAppUrl(new URL(request.url).origin);
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    void sendEmailVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
    }).catch((error) => {
      console.error('Verification email send failed:', error);
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
