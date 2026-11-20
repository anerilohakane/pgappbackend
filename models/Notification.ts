import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId; // User ID
  title: string;
  message: string;
  type: 'Rent' | 'Payment' | 'Receipt' | 'Deposit' | 'Complaint' | 'Announcement' | 'System';
  referenceId?: string; // e.g. RentRecord ID, PaymentSubmission ID
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['Rent', 'Payment', 'Receipt', 'Deposit', 'Complaint', 'Announcement', 'System'],
      default: 'System',
    },
    referenceId: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Notification =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

