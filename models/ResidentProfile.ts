import mongoose, { Schema, Document } from 'mongoose';

export interface IResidentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  profileImage?: string;
  permanentAddress: string;
  dateOfBirth?: Date;
  occupation: 'Student' | 'Working Professional' | 'Other';
  companyOrCollege?: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  joiningDate: Date;
  propertyId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  bedId?: mongoose.Types.ObjectId;
  occupancyType: 'Full Room' | 'Shared';
  monthlyRent: number; // Custom rent agreed with admin
  rentDueDay: number;
  securityDeposit: number; // Custom deposit agreed with admin
  securityDepositPaid: number;
  advancePayment: number;
  agreementStartDate?: Date;
  agreementEndDate?: Date;
  noticePeriodDays: number;
  status: 'Active' | 'Notice Period' | 'Vacated';
  noticeDate?: Date;
  vacatingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResidentProfileSchema = new Schema<IResidentProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    profileImage: { type: String, default: '' },
    permanentAddress: { type: String, required: true },
    dateOfBirth: { type: Date },
    occupation: { type: String, enum: ['Student', 'Working Professional', 'Other'], default: 'Working Professional' },
    companyOrCollege: { type: String, default: '' },
    emergencyContactName: { type: String, required: true },
    emergencyContactNumber: { type: String, required: true },
    joiningDate: { type: Date, required: true, default: Date.now },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed' },
    occupancyType: { type: String, enum: ['Full Room', 'Shared'], default: 'Shared' },
    monthlyRent: { type: Number, required: true },
    rentDueDay: { type: Number, default: 5 },
    securityDeposit: { type: Number, required: true, default: 0 },
    securityDepositPaid: { type: Number, default: 0 },
    advancePayment: { type: Number, default: 0 },
    agreementStartDate: { type: Date },
    agreementEndDate: { type: Date },
    noticePeriodDays: { type: Number, default: 30 },
    status: { type: String, enum: ['Active', 'Notice Period', 'Vacated'], default: 'Active', index: true },
    noticeDate: { type: Date },
    vacatingDate: { type: Date },
  },
  { timestamps: true }
);

export const ResidentProfile =
  mongoose.models.ResidentProfile || mongoose.model<IResidentProfile>('ResidentProfile', ResidentProfileSchema);
