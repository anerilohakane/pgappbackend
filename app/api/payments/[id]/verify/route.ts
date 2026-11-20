import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { approvePayment, rejectPayment } from '@/services/paymentService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { action, rejectionReason } = await req.json();

    if (action === 'approve') {
      const result = await approvePayment({
        submissionId: params.id,
        adminId: auth.user.userId,
        adminName: auth.user.name,
      });
      return NextResponse.json({ success: true, ...result });
    } else if (action === 'reject') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }
      const submission = await rejectPayment({
        submissionId: params.id,
        rejectionReason,
        adminId: auth.user.userId,
        adminName: auth.user.name,
      });
      return NextResponse.json({ success: true, submission });
    } else {
      return NextResponse.json({ error: 'Invalid action. Expected approve or reject.' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

