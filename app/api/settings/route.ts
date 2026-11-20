import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { AppSettings } from '@/models/AppSettings';
import { connectDB } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = await AppSettings.create({});
    }
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();
    const body = await req.json();
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = await AppSettings.create(body);
    } else {
      Object.assign(settings, body);
      await settings.save();
    }

    await logAudit({
      action: 'App Settings Updated',
      module: 'Settings',
      recordId: settings._id.toString(),
      adminId: auth.user.userId,
      adminName: auth.user.name,
      newValues: body,
    });

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

