import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getResidentById, updateResident, checkoutResident } from '@/services/residentService';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Resident authorization check
  if (auth.user.role === 'resident' && auth.user.residentId !== params.id) {
    return NextResponse.json({ error: 'Access denied: You can only view your own profile.' }, { status: 403 });
  }

  try {
    const resident = await getResidentById(params.id);
    return NextResponse.json({ success: true, resident });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const resident = await updateResident(params.id, body, {
      adminId: auth.user.userId,
      adminName: auth.user.name,
    });
    return NextResponse.json({ success: true, resident });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Checkout endpoint
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const result = await checkoutResident({
      residentId: params.id,
      ...body,
      adminId: auth.user.userId,
      adminName: auth.user.name,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

