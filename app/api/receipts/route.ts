import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { PaymentReceipt } from '@/models/PaymentReceipt';
import { PGProperty } from '@/models/PGProperty';
import { ResidentProfile } from '@/models/ResidentProfile';
import { generateReceiptPDF } from '@/lib/pdf';

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

    const query: any = {};
    if (residentId) query.residentId = residentId;
    if (propertyId) query.propertyId = propertyId;

    const receipts = await PaymentReceipt.find(query)
      .populate('residentId', 'fullName phone')
      .populate('propertyId', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, receipts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

