import { connectDB } from '@/lib/db';
import { Complaint } from '@/models/Complaint';
import { ResidentProfile } from '@/models/ResidentProfile';
import { createInAppNotification } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';

export async function getComplaints(filters: { propertyId?: string; residentId?: string; status?: string } = {}) {
  await connectDB();
  const query: any = {};
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.residentId) query.residentId = filters.residentId;
  if (filters.status) query.status = filters.status;

  return Complaint.find(query)
    .populate('residentId', 'fullName phone email')
    .populate('propertyId', 'name')
    .populate('roomId', 'roomNumber')
    .sort({ createdAt: -1 });
}

export async function createComplaint({
  residentId,
  title,
  category,
  description,
  priority = 'Medium',
  images = [],
}: {
  residentId: string;
  title: string;
  category: any;
  description: string;
  priority?: any;
  images?: string[];
}) {
  await connectDB();
  const resident = await ResidentProfile.findById(residentId);
  if (!resident) throw new Error('Resident not found');

  return Complaint.create({
    residentId,
    propertyId: resident.propertyId,
    roomId: resident.roomId,
    title,
    category,
    description,
    priority,
    images,
    status: 'Open',
  });
}

export async function updateComplaintStatus({
  complaintId,
  status,
  adminRemarks,
  assignedTo,
  adminId,
  adminName,
}: {
  complaintId: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  adminRemarks?: string;
  assignedTo?: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new Error('Complaint not found');

  complaint.status = status;
  if (adminRemarks !== undefined) complaint.adminRemarks = adminRemarks;
  if (assignedTo !== undefined) complaint.assignedTo = assignedTo;
  if (status === 'Resolved' || status === 'Closed') {
    complaint.resolvedAt = new Date();
    complaint.resolvedBy = adminId as any;
  }
  await complaint.save();

  // Notify resident
  const resident = await ResidentProfile.findById(complaint.residentId);
  if (resident) {
    await createInAppNotification({
      recipientId: resident.userId,
      title: `Complaint Status: ${status}`,
      message: `Your complaint "${complaint.title}" has been updated to "${status}". Remarks: ${adminRemarks || 'None'}`,
      type: 'Complaint',
      referenceId: complaint._id.toString(),
    });
  }

  await logAudit({
    action: 'Complaint Updated',
    module: 'Complaints',
    recordId: complaintId,
    adminId,
    adminName,
    newValues: { status, adminRemarks, assignedTo },
  });

  return complaint;
}

