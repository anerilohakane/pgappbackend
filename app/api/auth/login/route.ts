import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/services/authService';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 });
    }

    const result = await authenticateUser(parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 401 });
  }
}

