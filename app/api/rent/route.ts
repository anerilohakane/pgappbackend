import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getRentRecords, generateMonthlyRentForActiveResidents, adjustRent } from '@/services/rentService';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    let residentId = url.searchParams.get('residentId') || undefined;
    const propertyId = url.searchParams.get('propertyId') || undefined;
    const rentMonth = url.searchParams.get('rentMonth') || undefined;
    const status = url.searchParams.get('status') || undefined;

    // Enforce resident can only query self
    if (auth.user.role === 'resident') {
      residentId = auth.user.residentId;
    }

    const records = await getRentRecords({ propertyId, residentId, rentMonth, status });
    return NextResponse.json({ success: true, rentRecords: records });
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
    const billingMonth = body.billingMonth || new Date().toISOString().slice(0, 7);
    const result = await generateMonthlyRentForActiveResidents({
      billingMonth,
      adminId: auth.user.userId,
      adminName: auth.user.name,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  // Adjustment endpoint
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { rentRecordId, adjustmentAmount, adjustmentReason } = await req.json();
    const updated = await adjustRent({
      rentRecordId,
      adjustmentAmount: Number(adjustmentAmount),
      adjustmentReason,
      adminId: auth.user.userId,
      adminName: auth.user.name,
    });
    return NextResponse.json({ success: true, rentRecord: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

