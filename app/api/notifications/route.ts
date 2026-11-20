import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Notification } from '@/models/Notification';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const notifications = await Notification.find({ recipientId: auth.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ recipientId: auth.user.userId, isRead: false });

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { action, notificationId, fcmToken } = await req.json();

    if (action === 'read-all') {
      await Notification.updateMany({ recipientId: auth.user.userId }, { isRead: true });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    } else if (action === 'mark-read' && notificationId) {
      await Notification.findOneAndUpdate({ _id: notificationId, recipientId: auth.user.userId }, { isRead: true });
      return NextResponse.json({ success: true });
    } else if (action === 'register-fcm' && fcmToken) {
      await User.findByIdAndUpdate(auth.user.userId, { fcmToken });
      return NextResponse.json({ success: true, message: 'FCM Token registered' });
    }

    return NextResponse.json({ error: 'Invalid notification action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

