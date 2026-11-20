import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentReceipt extends Document {
  receiptNumber: string;
  propertyId: mongoose.Types.ObjectId;
  residentId: mongoose.Types.ObjectId;
  rentRecordId: mongoose.Types.ObjectId;
  paymentSubmissionId?: mongoose.Types.ObjectId;
  rentMonth: string;
  amount: number;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash';
  paymentDate: Date;
  transactionReference?: string;
  remainingBalance: number;
  receivedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentReceiptSchema = new Schema<IPaymentReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile', required: true, index: true },
    rentRecordId: { type: Schema.Types.ObjectId, ref: 'RentRecord', required: true },
    paymentSubmissionId: { type: Schema.Types.ObjectId, ref: 'PaymentSubmission' },
    rentMonth: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['UPI', 'Bank Transfer', 'Cash'], default: 'UPI' },
    paymentDate: { type: Date, required: true },
    transactionReference: { type: String, default: '' },
    remainingBalance: { type: Number, required: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const PaymentReceipt =
  mongoose.models.PaymentReceipt || mongoose.model<IPaymentReceipt>('PaymentReceipt', PaymentReceiptSchema);

