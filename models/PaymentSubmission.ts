import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentSubmission extends Document {
  residentId: mongoose.Types.ObjectId;
  rentRecordId: mongoose.Types.ObjectId;
  rentMonth: string;
  amount: number;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash';
  paymentDate: Date;
  transactionId?: string; // UTR for UPI or Bank Transfer
  screenshotPath?: string;
  remarks?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSubmissionSchema = new Schema<IPaymentSubmission>(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile', required: true, index: true },
    rentRecordId: { type: Schema.Types.ObjectId, ref: 'RentRecord', required: true, index: true },
    rentMonth: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['UPI', 'Bank Transfer', 'Cash'], default: 'UPI' },
    paymentDate: { type: Date, required: true, default: Date.now },
    transactionId: { type: String, trim: true },
    screenshotPath: { type: String, default: '' },
    remarks: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export const PaymentSubmission =
  mongoose.models.PaymentSubmission || mongoose.model<IPaymentSubmission>('PaymentSubmission', PaymentSubmissionSchema);

