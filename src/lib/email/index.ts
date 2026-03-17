import { sendEmail } from '@/lib/email/provider';

export async function sendPasswordResetEmail({ to, name, resetUrl }: { to: string; name?: string | null; resetUrl: string }) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : 'Hi,';

  return sendEmail({
    to,
    subject: 'Reset your ReelForge password',
    text: `${greeting}\n\nWe received a request to reset your ReelForge password. Use the secure link below to choose a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour and can only be used once. If you did not request this change, you can ignore this email.`,
    html: `<p>${greeting}</p><p>We received a request to reset your ReelForge password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour and can only be used once. If you did not request this change, you can ignore this email.</p>`,
  });
}

export async function sendEmailVerificationEmail({ to, name, verifyUrl }: { to: string; name?: string | null; verifyUrl: string }) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : 'Hi,';

  return sendEmail({
    to,
    subject: 'Verify your ReelForge email',
    text: `${greeting}\n\nPlease confirm your email address for ReelForge by opening the link below:\n\n${verifyUrl}\n\nYou can still sign in before verification, but confirming your email helps with billing receipts and account recovery.`,
    html: `<p>${greeting}</p><p>Please confirm your email address for ReelForge.</p><p><a href="${verifyUrl}">Verify email address</a></p><p>You can still sign in before verification, but confirming your email helps with billing receipts and account recovery.</p>`,
  });
}

export async function sendPurchaseReceiptEmail({
  to,
  name,
  packName,
  credits,
  amountCents,
  balance,
}: {
  to: string;
  name?: string | null;
  packName: string;
  credits: number;
  amountCents: number;
  balance: number;
}) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : 'Hi,';
  const amount = `$${(amountCents / 100).toFixed(2)}`;

  return sendEmail({
    to,
    subject: 'Your ReelForge credit receipt',
    text: `${greeting}\n\nThanks for your purchase. Your ${packName} added ${credits} credits to your ReelForge workspace for ${amount}.\n\nCurrent balance: ${balance} credits.`,
    html: `<p>${greeting}</p><p>Thanks for your purchase.</p><p><strong>${packName}</strong> added <strong>${credits} credits</strong> to your ReelForge workspace for <strong>${amount}</strong>.</p><p>Current balance: <strong>${balance} credits</strong>.</p>`,
  });
}

export async function sendRenderFailureEmail({
  to,
  name,
  renderId,
  errorMessage,
  refundedCredits,
  balance,
}: {
  to: string;
  name?: string | null;
  renderId: number;
  errorMessage: string;
  refundedCredits: number;
  balance: number;
}) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : 'Hi,';

  return sendEmail({
    to,
    subject: 'Your ReelForge render failed',
    text: `${greeting}\n\nRender #${renderId} did not complete successfully.\n\nReason: ${errorMessage}\n\nWe refunded ${refundedCredits} credit${refundedCredits === 1 ? '' : 's'} automatically. Your current balance is ${balance}.`,
    html: `<p>${greeting}</p><p>Render <strong>#${renderId}</strong> did not complete successfully.</p><p><strong>Reason:</strong> ${errorMessage}</p><p>We refunded <strong>${refundedCredits} credit${refundedCredits === 1 ? '' : 's'}</strong> automatically. Your current balance is <strong>${balance}</strong>.</p>`,
  });
}
