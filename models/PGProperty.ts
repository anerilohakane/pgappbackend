import mongoose, { Schema, Document } from 'mongoose';

export interface IPGProperty extends Document {
  name: string;
  pgType: 'Gents' | 'Ladies' | 'Coliving';
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  contactNumber: string;
  description: string;
  facilities: string[];
  rules: string[];
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PGPropertySchema = new Schema<IPGProperty>(
  {
    name: { type: String, required: true, trim: true },
    pgType: { type: String, enum: ['Gents', 'Ladies', 'Coliving'], default: 'Coliving' },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    contactPerson: { type: String, required: true },
    contactNumber: { type: String, required: true },
    description: { type: String, default: '' },
    facilities: [{ type: String }],
    rules: [{ type: String }],
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PGProperty = mongoose.models.PGProperty || mongoose.model<IPGProperty>('PGProperty', PGPropertySchema);

