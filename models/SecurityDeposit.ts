import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityDeposit extends Document {
  residentId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  depositRequired: number;
  depositReceived: number;
  depositOutstanding: number;
  refundStatus: 'Not Applicable' | 'Pending' | 'Partially Refunded' | 'Refunded';
  refundAmount?: number;
  damageDeductions?: number;
  pendingRentDeductions?: number;
  otherDeductions?: number;
  refundDate?: Date;
  refundProofPath?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SecurityDepositSchema = new Schema<ISecurityDeposit>(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile', required: true, unique: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true },
    depositRequired: { type: Number, required: true },
    depositReceived: { type: Number, default: 0 },
    depositOutstanding: { type: Number, required: true },
    refundStatus: {
      type: String,
      enum: ['Not Applicable', 'Pending', 'Partially Refunded', 'Refunded'],
      default: 'Not Applicable',
    },
    refundAmount: { type: Number, default: 0 },
    damageDeductions: { type: Number, default: 0 },
    pendingRentDeductions: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    refundDate: { type: Date },
    refundProofPath: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const SecurityDeposit =
  mongoose.models.SecurityDeposit || mongoose.model<ISecurityDeposit>('SecurityDeposit', SecurityDepositSchema);

