import mongoose, { Schema, Document } from 'mongoose';

export interface IDepositTransaction extends Document {
  depositId: mongoose.Types.ObjectId;
  residentId: mongoose.Types.ObjectId;
  type: 'Payment' | 'Refund' | 'Deduction';
  amount: number;
  paymentMethod?: 'UPI' | 'Bank Transfer' | 'Cash';
  transactionReference?: string;
  proofPath?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DepositTransactionSchema = new Schema<IDepositTransaction>(
  {
    depositId: { type: Schema.Types.ObjectId, ref: 'SecurityDeposit', required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile', required: true, index: true },
    type: { type: String, enum: ['Payment', 'Refund', 'Deduction'], required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['UPI', 'Bank Transfer', 'Cash'] },
    transactionReference: { type: String, default: '' },
    proofPath: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const DepositTransaction =
  mongoose.models.DepositTransaction ||
  mongoose.model<IDepositTransaction>('DepositTransaction', DepositTransactionSchema);

