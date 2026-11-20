import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { allocateBed, vacateBed } from '@/services/roomService';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { action, bedId, residentId } = await req.json();
    if (action === 'allocate') {
      const bed = await allocateBed({ bedId, residentId });
      await logAudit({
        action: 'Bed Allocated',
        module: 'Beds',
        recordId: bedId,
        adminId: auth.user.userId,
        adminName: auth.user.name,
        newValues: { residentId, status: 'Occupied' },
      });
      return NextResponse.json({ success: true, bed });
    } else if (action === 'vacate') {
      const bed = await vacateBed(bedId);
      await logAudit({
        action: 'Bed Vacated',
        module: 'Beds',
        recordId: bedId,
        adminId: auth.user.userId,
        adminName: auth.user.name,
        newValues: { status: 'Vacant' },
      });
      return NextResponse.json({ success: true, bed });
    } else {
      return NextResponse.json({ error: 'Invalid action. Expected allocate or vacate' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

