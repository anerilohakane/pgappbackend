import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getRooms, createRoom } from '@/services/roomService';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const propertyId = url.searchParams.get('propertyId') || undefined;
    const rooms = await getRooms(propertyId);
    return NextResponse.json({ success: true, rooms });
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
    const room = await createRoom(body);

    await logAudit({
      action: 'Room Created',
      module: 'Rooms',
      recordId: room._id.toString(),
      adminId: auth.user.userId,
      adminName: auth.user.name,
      newValues: { roomNumber: room.roomNumber, capacity: room.capacity },
    });

    return NextResponse.json({ success: true, room }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

