import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifyDocument, rejectDocument } from '@/services/documentService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { action, rejectionReason } = await req.json();
    if (action === 'verify') {
      const doc = await verifyDocument({
        documentId: params.id,
        adminId: auth.user.userId,
        adminName: auth.user.name,
      });
      return NextResponse.json({ success: true, document: doc });
    } else if (action === 'reject') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }
      const doc = await rejectDocument({
        documentId: params.id,
        rejectionReason,
        adminId: auth.user.userId,
        adminName: auth.user.name,
      });
      return NextResponse.json({ success: true, document: doc });
    } else {
      return NextResponse.json({ error: 'Invalid action. Expected verify or reject' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

