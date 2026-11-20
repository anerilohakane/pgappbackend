import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserProfile } from '@/services/authService';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const profile = await getUserProfile(auth.user.userId);
    return NextResponse.json({ success: true, ...profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

