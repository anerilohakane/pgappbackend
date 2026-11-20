import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  module: string;
  recordId: string;
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    module: { type: String, required: true },
    recordId: { type: String, required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adminName: { type: String, required: true },
    previousValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

