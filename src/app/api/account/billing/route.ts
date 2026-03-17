import { NextResponse } from 'next/server';
import { requireSessionUserId } from '@/lib/auth/session';
import { CREDIT_PACKS } from '@/lib/billing/catalog';
import { getBillingSnapshot } from '@/lib/billing/ledger';
import { getMonetizedSurfaceNotice } from '@/lib/support-matrix/capabilities';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireSessionUserId();

    if (auth.response) {
      return auth.response;
    }

    const snapshot = await getBillingSnapshot(auth.userId);

    return NextResponse.json({
      balance: snapshot.balance,
      emailVerified: snapshot.emailVerified,
      transactions: snapshot.transactions,
      packs: CREDIT_PACKS,
      supportNotice: getMonetizedSurfaceNotice(),
    });
  } catch (error) {
    console.error('Billing snapshot error:', error);
    return NextResponse.json({ error: 'Failed to load billing data' }, { status: 500 });
  }
}
