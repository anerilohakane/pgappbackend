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
    const body = await req.json();
    const { action, notificationId, fcmToken, title, message, type = 'Announcement', targetResidentId } = body;

    if (action === 'send' && auth.user.role === 'admin') {
      if (!title || !message) {
        return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
      }

      if (targetResidentId) {
        const { ResidentProfile } = await import('@/models/ResidentProfile');
        const profile = await ResidentProfile.findById(targetResidentId);
        if (profile) {
          await Notification.create({
            recipientId: profile.userId,
            title,
            message,
            type,
            isRead: false,
          });
        }
      } else {
        // Broadcast to all active resident users
        const { User } = await import('@/models/User');
        const residents = await User.find({ role: 'resident', isActive: true });
        const notifs = residents.map(u => ({
          recipientId: u._id,
          title,
          message,
          type,
          isRead: false,
        }));
        if (notifs.length > 0) {
          await Notification.insertMany(notifs);
        }
      }
      return NextResponse.json({ success: true, message: 'Notification sent successfully' });
    }

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

