import { Notification } from '@/models/Notification';
import mongoose from 'mongoose';

export async function createInAppNotification({
  recipientId,
  title,
  message,
  type,
  referenceId,
}: {
  recipientId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'Rent' | 'Payment' | 'Receipt' | 'Deposit' | 'Complaint' | 'Announcement' | 'System';
  referenceId?: string;
}) {
  try {
    const notif = await Notification.create({
      recipientId,
      title,
      message,
      type,
      referenceId: referenceId || '',
      isRead: false,
    });
    // If recipient has an FCM token, trigger simulated/FCM push
    console.log(`[FCM Notification Simulated] To User: ${recipientId} | Title: ${title} | Body: ${message}`);
    return notif;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

