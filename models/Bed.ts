import mongoose, { Schema, Document } from 'mongoose';

export interface IBed extends Document {
  propertyId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  bedNumber: string;
  isOccupied: boolean;
  currentResidentId?: mongoose.Types.ObjectId;
  status: 'Vacant' | 'Occupied' | 'Maintenance';
  createdAt: Date;
  updatedAt: Date;
}

const BedSchema = new Schema<IBed>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    bedNumber: { type: String, required: true, trim: true },
    isOccupied: { type: Boolean, default: false },
    currentResidentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile' },
    status: { type: String, enum: ['Vacant', 'Occupied', 'Maintenance'], default: 'Vacant' },
  },
  { timestamps: true }
);

BedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });

export const Bed = mongoose.models.Bed || mongoose.model<IBed>('Bed', BedSchema);

