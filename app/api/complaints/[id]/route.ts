import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateComplaintStatus } from '@/services/complaintService';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const updated = await updateComplaintStatus({
      complaintId: params.id,
      status: body.status,
      adminRemarks: body.adminRemarks,
      assignedTo: body.assignedTo,
      adminId: auth.user.userId,
      adminName: auth.user.name,
    });
    return NextResponse.json({ success: true, complaint: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

