import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Room } from '@/models/Room';
import { ResidentProfile } from '@/models/ResidentProfile';
import { updateRoom } from '@/services/roomService';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();
    const room = await Room.findById(params.id).populate('propertyId', 'name address city contactPerson contactNumber');
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Fetch all current and past occupants of this room
    const occupants = await ResidentProfile.find({ roomId: params.id })
      .select('fullName email phone monthlyRent securityDeposit joiningDate status occupancyType createdAt')
      .sort({ createdAt: -1 });

    const activeOccupants = occupants.filter((o) => o.status === 'Active' || o.status === 'Notice Period');
    const availableSlots =
      room.rentalType === 'Full Room (Single Tenant)'
        ? (activeOccupants.length === 0 ? 1 : 0)
        : Math.max(0, room.maxCapacity - activeOccupants.length);

    return NextResponse.json({
      success: true,
      room: {
        ...room.toObject(),
        occupants: activeOccupants,
        allHistoryOccupants: occupants,
        availableSlots,
        isFull: availableSlots === 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const updated = await updateRoom(params.id, body);
    return NextResponse.json({ success: true, room: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

