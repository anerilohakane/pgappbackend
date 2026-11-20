import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: 'admin' | 'resident';
  propertyId?: mongoose.Types.ObjectId;
  fcmToken?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'resident'], default: 'resident' },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty' },
    fcmToken: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

