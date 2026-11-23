import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { ResidentDocument } from '@/models/ResidentDocument';
import { ResidentProfile } from '@/models/ResidentProfile';
import { savePrivateFile, maskAadhaar } from '@/lib/storage';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { createInAppNotification } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';

export async function uploadDocument({
  residentId,
  category,
  documentName,
  originalFileName,
  mimeType,
  fileSize,
  fileBuffer,
  documentNumber,
  isUploadedByAdmin,
  uploadedByAdminName,
}: {
  residentId: string;
  category: 'Aadhaar Front' | 'Aadhaar Back' | 'PAN Card' | 'Passport' | 'Rental Agreement' | 'Other';
  documentName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileBuffer: Buffer;
  documentNumber?: string;
  isUploadedByAdmin?: boolean;
  uploadedByAdminName?: string;
}) {
  await connectDB();
  const resident = await ResidentProfile.findById(residentId);
  if (!resident) throw new Error('Resident not found');

  // Save securely locally as private file
  const { relativePath } = await savePrivateFile('documents', originalFileName, fileBuffer);

  // Upload to Cloudinary under secure resident_proofs folder
  let cloudinaryUrl = '';
  let cloudinaryPublicId = '';
  try {
    const cResult = await uploadToCloudinary(fileBuffer, 'pg_app/resident_proofs', originalFileName);
    if (cResult) {
      cloudinaryUrl = cResult.secure_url;
      cloudinaryPublicId = cResult.public_id;
    }
  } catch (err: any) {
    console.error('[DocumentService] Cloudinary upload notice:', err.message);
  }

  const maskedNumber =
    category.includes('Aadhaar') && documentNumber ? maskAadhaar(documentNumber) : documentNumber || '';

  // If uploaded by Admin (e.g. during onboarding or admin panel), auto-verify directly
  const isAutoVerified = Boolean(isUploadedByAdmin);

  // verifiedBy can be an ObjectId or null if string admin name
  let verifiedById = undefined;
  if (isAutoVerified && uploadedByAdminName && mongoose.Types.ObjectId.isValid(uploadedByAdminName)) {
    verifiedById = new mongoose.Types.ObjectId(uploadedByAdminName);
  }

  const doc = await ResidentDocument.create({
    residentId,
    category,
    documentName,
    originalFileName,
    filePath: relativePath,
    cloudinaryUrl,
    cloudinaryPublicId,
    mimeType,
    fileSize,
    documentNumberMasked: maskedNumber,
    verificationStatus: isAutoVerified ? 'Verified' : 'Pending',
    verifiedAt: isAutoVerified ? new Date() : undefined,
    verifiedBy: verifiedById,
  });

  return doc;
}

export async function getResidentDocuments(residentId: string) {
  await connectDB();
  return ResidentDocument.find({ residentId }).sort({ createdAt: -1 });
}

export async function verifyDocument({
  documentId,
  adminId,
  adminName,
}: {
  documentId: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const doc = await ResidentDocument.findById(documentId);
  if (!doc) throw new Error('Document not found');

  doc.verificationStatus = 'Verified';
  doc.verifiedBy = adminId as any;
  doc.verifiedAt = new Date();
  doc.rejectionReason = '';
  await doc.save();

  const resident = await ResidentProfile.findById(doc.residentId);
  if (resident) {
    await createInAppNotification({
      recipientId: resident.userId,
      title: 'Document Verified',
      message: `Your document "${doc.documentName}" (${doc.category}) has been verified successfully.`,
      type: 'System',
      referenceId: doc._id.toString(),
    });
  }

  await logAudit({
    action: 'Document Verified',
    module: 'Documents',
    recordId: documentId,
    adminId,
    adminName,
    newValues: { documentName: doc.documentName, status: 'Verified' },
  });

  return doc;
}

export async function rejectDocument({
  documentId,
  rejectionReason,
  adminId,
  adminName,
}: {
  documentId: string;
  rejectionReason: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const doc = await ResidentDocument.findById(documentId);
  if (!doc) throw new Error('Document not found');

  doc.verificationStatus = 'Rejected';
  doc.verifiedBy = adminId as any;
  doc.verifiedAt = new Date();
  doc.rejectionReason = rejectionReason;
  await doc.save();

  const resident = await ResidentProfile.findById(doc.residentId);
  if (resident) {
    await createInAppNotification({
      recipientId: resident.userId,
      title: 'Document Rejected',
      message: `Your document "${doc.documentName}" (${doc.category}) was rejected. Reason: ${rejectionReason}. Please re-upload.`,
      type: 'System',
      referenceId: doc._id.toString(),
    });
  }

  await logAudit({
    action: 'Document Rejected',
    module: 'Documents',
    recordId: documentId,
    adminId,
    adminName,
    newValues: { documentName: doc.documentName, status: 'Rejected', rejectionReason },
  });

  return doc;
}

