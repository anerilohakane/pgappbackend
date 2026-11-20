import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  propertyId: mongoose.Types.ObjectId;
  roomNumber: string;
  floor: number;
  roomType: 'AC' | 'Non-AC';
  rentalType: 'Full Room (Single Tenant)' | 'Sharing';
  maxCapacity: number;
  currentOccupants: number;
  defaultRent: number;
  status: 'Available' | 'Full' | 'Maintenance';
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true, index: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, default: 1 },
    roomType: { type: String, enum: ['AC', 'Non-AC'], default: 'Non-AC' },
    rentalType: {
      type: String,
      enum: ['Full Room (Single Tenant)', 'Sharing'],
      default: 'Sharing',
    },
    maxCapacity: { type: Number, default: 2 },
    currentOccupants: { type: Number, default: 0 },
    defaultRent: { type: Number, default: 8000 },
    status: { type: String, enum: ['Available', 'Full', 'Maintenance'], default: 'Available' },
  },
  { timestamps: true }
);

RoomSchema.index({ propertyId: 1, roomNumber: 1 }, { unique: true });

export const Room = mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
