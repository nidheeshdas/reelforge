import { randomUUID } from 'node:crypto';
import { clearMockEmails, listMockEmails, pushMockEmail, type MockEmailRecord } from '@/lib/email/mock-store';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailSendResult = {
  id: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    const id = randomUUID();
    console.info('Console email provider:', { id, ...message });
    return { id };
  }
}

class MockEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    const id = randomUUID();
    pushMockEmail({
      id,
      ...message,
      createdAt: new Date().toISOString(),
    });
    return { id };
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      throw new Error('RESEND_API_KEY and EMAIL_FROM are required for the Resend email provider.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend email failed: ${body}`);
    }

    const data = (await response.json()) as { id?: string };
    return { id: data.id ?? randomUUID() };
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (provider === 'resend') {
    return new ResendEmailProvider();
  }

  if (provider === 'mock') {
    return new MockEmailProvider();
  }

  return new ConsoleEmailProvider();
}

export async function sendEmail(message: EmailMessage, provider = getEmailProvider()) {
  return provider.send(message);
}

export function getMockEmailLog(): MockEmailRecord[] {
  return listMockEmails();
}

export function resetMockEmailLog() {
  clearMockEmails();
}
