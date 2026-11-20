import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getComplaints, createComplaint, updateComplaintStatus } from '@/services/complaintService';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    let residentId = url.searchParams.get('residentId') || undefined;
    const propertyId = url.searchParams.get('propertyId') || undefined;
    const status = url.searchParams.get('status') || undefined;

    if (auth.user.role === 'resident') {
      residentId = auth.user.residentId;
    }

    const complaints = await getComplaints({ propertyId, residentId, status });
    return NextResponse.json({ success: true, complaints });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    let residentId = auth.user.residentId;
    if (auth.user.role === 'admin' && body.residentId) {
      residentId = body.residentId;
    }

    if (!residentId || !body.title || !body.category || !body.description) {
      return NextResponse.json({ error: 'Title, category, and description are required' }, { status: 400 });
    }

    const complaint = await createComplaint({
      residentId,
      title: body.title,
      category: body.category,
      description: body.description,
      priority: body.priority,
      images: body.images,
    });

    return NextResponse.json({ success: true, complaint }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

