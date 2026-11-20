import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getBeds, allocateBed, vacateBed } from '@/services/roomService';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const propertyId = url.searchParams.get('propertyId') || undefined;
    const roomId = url.searchParams.get('roomId') || undefined;
    const beds = await getBeds(propertyId, roomId);
    return NextResponse.json({ success: true, beds });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

