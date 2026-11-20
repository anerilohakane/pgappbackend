import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPropertyById, updateProperty, deleteProperty } from '@/services/propertyService';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const data = await getPropertyById(params.id);
    return NextResponse.json({ success: true, ...data });
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
    const updated = await updateProperty(params.id, body);

    await logAudit({
      action: 'PG Property Updated',
      module: 'Properties',
      recordId: params.id,
      adminId: auth.user.userId,
      adminName: auth.user.name,
      newValues: body,
    });

    return NextResponse.json({ success: true, property: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const property = await deleteProperty(params.id);
    return NextResponse.json({ success: true, message: 'Property deactivated', property });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

