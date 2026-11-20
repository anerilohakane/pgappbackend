import { AuditLog } from '@/models/AuditLog';
import mongoose from 'mongoose';

export async function logAudit({
  action,
  module,
  recordId,
  adminId,
  adminName,
  previousValues,
  newValues,
  ipAddress,
}: {
  action: string;
  module: string;
  recordId: string;
  adminId: string | mongoose.Types.ObjectId;
  adminName: string;
  previousValues?: any;
  newValues?: any;
  ipAddress?: string;
}) {
  try {
    await AuditLog.create({
      action,
      module,
      recordId,
      adminId,
      adminName,
      previousValues,
      newValues,
      ipAddress: ipAddress || '',
    });
  } catch (err) {
    console.error('Audit log creation failed:', err);
  }
}

