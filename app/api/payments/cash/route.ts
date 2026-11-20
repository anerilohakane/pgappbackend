import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { recordCashPayment } from '@/services/paymentService';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { residentId, rentRecordId, amount, remarks } = await req.json();
    if (!residentId || !rentRecordId || !amount) {
      return NextResponse.json({ error: 'residentId, rentRecordId, and amount are required' }, { status: 400 });
    }

    const result = await recordCashPayment({
      residentId,
      rentRecordId,
      amount: Number(amount),
      remarks,
      adminId: auth.user.userId,
      adminName: auth.user.name,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

