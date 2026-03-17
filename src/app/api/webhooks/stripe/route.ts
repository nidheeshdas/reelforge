import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fulfillStripeCheckout } from '@/lib/billing/ledger';
import { getStripeClient, getStripeWebhookSecret } from '@/lib/billing/stripe';
import { sendPurchaseReceiptEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  try {
    const body = await request.text();
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());

    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true, ignored: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const userId = Number.parseInt(session.metadata?.userId ?? '', 10);
    const packId = session.metadata?.packId ?? '';

    if (Number.isNaN(userId) || !packId) {
      return NextResponse.json({ error: 'Missing checkout metadata' }, { status: 400 });
    }

    const fulfillment = await fulfillStripeCheckout({
      eventId: event.id,
      payload: {
        type: event.type,
        userId,
        packId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      },
    });

    if (fulfillment.processed && 'email' in fulfillment && fulfillment.email) {
      void sendPurchaseReceiptEmail({
        to: fulfillment.email,
        name: fulfillment.name,
        packName: fulfillment.pack.name,
        credits: fulfillment.pack.credits,
        amountCents: fulfillment.pack.priceCents,
        balance: fulfillment.balance,
      }).catch((error) => {
        console.error('Purchase receipt email failed:', error);
      });
    }

    return NextResponse.json({ received: true, processed: fulfillment.processed });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Invalid Stripe webhook' }, { status: 400 });
  }
}
