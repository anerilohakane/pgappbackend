import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDeposits, recordDepositPayment, getDepositTransactions } from '@/services/depositService';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    let residentId = url.searchParams.get('residentId') || undefined;
    const propertyId = url.searchParams.get('propertyId') || undefined;

    if (auth.user.role === 'resident') {
      residentId = auth.user.residentId;
    }

    const deposits = await getDeposits({ propertyId, residentId });
    return NextResponse.json({ success: true, deposits });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const result = await recordDepositPayment({
      ...body,
      adminId: auth.user.userId,
      adminName: auth.user.name,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

