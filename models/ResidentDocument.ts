import mongoose, { Schema, Document } from 'mongoose';

export interface IResidentDocument extends Document {
  residentId: mongoose.Types.ObjectId;
  category: 'Aadhaar Front' | 'Aadhaar Back' | 'PAN Card' | 'Passport' | 'Rental Agreement' | 'Other';
  documentName: string;
  originalFileName: string;
  filePath: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  mimeType: string;
  fileSize: number;
  documentNumberMasked?: string;
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResidentDocumentSchema = new Schema<IResidentDocument>(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile', required: true, index: true },
    category: {
      type: String,
      enum: ['Aadhaar Front', 'Aadhaar Back', 'PAN Card', 'Passport', 'Rental Agreement', 'Other'],
      required: true,
    },
    documentName: { type: String, required: true },
    originalFileName: { type: String, required: true },
    filePath: { type: String, required: true },
    cloudinaryUrl: { type: String, default: '' },
    cloudinaryPublicId: { type: String, default: '' },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    documentNumberMasked: { type: String, default: '' },
    verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export const ResidentDocument =
  mongoose.models.ResidentDocument || mongoose.model<IResidentDocument>('ResidentDocument', ResidentDocumentSchema);

