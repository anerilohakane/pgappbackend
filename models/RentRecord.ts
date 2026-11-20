import mongoose, { Schema, Document } from 'mongoose';

export interface IRentRecord extends Document {
  residentId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  bedId?: mongoose.Types.ObjectId;
  rentMonth: string; // format YYYY-MM e.g. "2026-11"
  rentAmount: number;
  dueDate: Date;
  previousOutstanding: number;
  totalPayable: number;
  amountPaid: number;
  outstandingAmount: number;
  status: 'Unpaid' | 'Partially Paid' | 'Verification Pending' | 'Paid' | 'Overdue' | 'Rejected';
  adjustmentAmount: number;
  adjustmentReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RentRecordSchema = new Schema<IRentRecord>(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile', required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed' },
    rentMonth: { type: String, required: true, index: true },
    rentAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    previousOutstanding: { type: Number, default: 0 },
    totalPayable: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    outstandingAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Verification Pending', 'Paid', 'Overdue', 'Rejected'],
      default: 'Unpaid',
      index: true,
    },
    adjustmentAmount: { type: Number, default: 0 },
    adjustmentReason: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

RentRecordSchema.index({ residentId: 1, rentMonth: 1 }, { unique: true });

export const RentRecord = mongoose.models.RentRecord || mongoose.model<IRentRecord>('RentRecord', RentRecordSchema);
