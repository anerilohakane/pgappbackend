import mongoose, { Schema, Document } from 'mongoose';

export interface IComplaint extends Document {
  residentId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  title: string;
  category: 'Water' | 'Electricity' | 'Wi-Fi' | 'Cleaning' | 'Food' | 'Maintenance' | 'Room issues' | 'Other';
  description: string;
  images: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  adminRemarks?: string;
  assignedTo?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'ResidentProfile', required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'PGProperty', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Water', 'Electricity', 'Wi-Fi', 'Cleaning', 'Food', 'Maintenance', 'Room issues', 'Other'],
      required: true,
    },
    description: { type: String, required: true },
    images: [{ type: String }],
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open', index: true },
    adminRemarks: { type: String, default: '' },
    assignedTo: { type: String, default: '' },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Complaint = mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', ComplaintSchema);

