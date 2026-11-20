import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAllProperties, createProperty } from '@/services/propertyService';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const properties = await getAllProperties();
    return NextResponse.json({ success: true, properties });
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
    const property = await createProperty(body);

    await logAudit({
      action: 'PG Property Created',
      module: 'Properties',
      recordId: property._id.toString(),
      adminId: auth.user.userId,
      adminName: auth.user.name,
      newValues: { name: property.name, city: property.city },
    });

    return NextResponse.json({ success: true, property }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

