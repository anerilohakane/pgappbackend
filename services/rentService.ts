import { connectDB } from '@/lib/db';
import { RentRecord } from '@/models/RentRecord';
import { ResidentProfile } from '@/models/ResidentProfile';
import { createInAppNotification } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';

export async function generateMonthlyRentForActiveResidents({
  billingMonth,
  adminId,
  adminName,
}: {
  billingMonth: string; // "YYYY-MM"
  adminId?: string;
  adminName?: string;
}) {
  await connectDB();
  const activeResidents = await ResidentProfile.find({
    status: { $in: ['Active', 'Notice Period'] },
  });

  const generatedRecords: any[] = [];
  const skippedRecords: string[] = [];

  for (const resident of activeResidents) {
    // Check if rent record already exists for this month
    const existing = await RentRecord.findOne({
      residentId: resident._id,
      rentMonth: billingMonth,
    });

    if (existing) {
      skippedRecords.push(resident.fullName);
      continue;
    }

    // Calculate previous unpaid outstanding
    const previousUnpaidRecords = await RentRecord.find({
      residentId: resident._id,
      rentMonth: { $lt: billingMonth },
      outstandingAmount: { $gt: 0 },
    });
    const previousOutstanding = previousUnpaidRecords.reduce((acc, curr) => acc + curr.outstandingAmount, 0);

    const [year, month] = billingMonth.split('-').map(Number);
    const dueDay = resident.rentDueDay || 5;
    const dueDate = new Date(year, month - 1, dueDay);

    const rentAmount = resident.monthlyRent;
    const totalPayable = rentAmount + previousOutstanding;

    const record = await RentRecord.create({
      residentId: resident._id,
      propertyId: resident.propertyId,
      roomId: resident.roomId,
      bedId: resident.bedId,
      rentMonth: billingMonth,
      rentAmount,
      dueDate,
      previousOutstanding,
      totalPayable,
      amountPaid: 0,
      outstandingAmount: totalPayable,
      status: 'Unpaid',
    });

    generatedRecords.push(record);

    // Send In-App & Email Notification to resident
    try {
      await createInAppNotification({
        recipientId: resident.userId,
        title: `Rent Due for ${billingMonth}`,
        message: `Dear ${resident.fullName}, your rent of ₹${rentAmount.toLocaleString('en-IN')} for ${billingMonth} is due on ${dueDate.toLocaleDateString('en-IN')}. Outstanding balance: ₹${totalPayable.toLocaleString('en-IN')}. Please submit payment.`,
        type: 'Rent',
        referenceId: record._id.toString(),
      });
    } catch (notifErr: any) {
      console.error('[RentService] Error dispatching rent notification:', notifErr.message);
    }
  }

  if (adminId && adminName) {
    await logAudit({
      action: 'Batch Rent Generated',
      module: 'Rent',
      recordId: billingMonth,
      adminId,
      adminName,
      newValues: {
        billingMonth,
        generatedCount: generatedRecords.length,
        skippedCount: skippedRecords.length,
      },
    });
  }

  return { generatedRecords, skippedRecords };
}

export async function getRentRecords(filters: {
  propertyId?: string;
  residentId?: string;
  rentMonth?: string;
  status?: string;
} = {}) {
  await connectDB();

  // If residentId is passed, auto-ensure rent record exists for current billing month
  if (filters.residentId) {
    try {
      const resident = await ResidentProfile.findById(filters.residentId);
      if (resident && resident.status !== 'Vacated') {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const existingCurrent = await RentRecord.findOne({
          residentId: resident._id,
          rentMonth: currentMonth,
        });

        if (!existingCurrent) {
          // Calculate previous unpaid outstanding
          const prevUnpaid = await RentRecord.find({
            residentId: resident._id,
            rentMonth: { $lt: currentMonth },
            outstandingAmount: { $gt: 0 },
          });
          const previousOutstanding = prevUnpaid.reduce((acc, curr) => acc + curr.outstandingAmount, 0);

          const dueDay = resident.rentDueDay || 5;
          const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
          const rentAmount = resident.monthlyRent || 0;
          const totalPayable = rentAmount + previousOutstanding;

          await RentRecord.create({
            residentId: resident._id,
            propertyId: resident.propertyId,
            roomId: resident.roomId,
            bedId: resident.bedId,
            rentMonth: currentMonth,
            rentAmount,
            dueDate,
            previousOutstanding,
            totalPayable,
            amountPaid: 0,
            outstandingAmount: totalPayable,
            status: 'Unpaid',
          });
        }
      }
    } catch (e: any) {
      console.error('[RentService] Error auto-generating current rent record:', e.message);
    }
  }

  const query: any = {};
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.residentId) query.residentId = filters.residentId;
  if (filters.rentMonth) query.rentMonth = filters.rentMonth;
  if (filters.status) query.status = filters.status;

  return RentRecord.find(query)
    .populate('residentId', 'fullName phone email')
    .populate('propertyId', 'name')
    .populate('roomId', 'roomNumber')
    .populate('bedId', 'bedNumber')
    .sort({ rentMonth: -1, dueDate: -1 });
}

export async function adjustRent({
  rentRecordId,
  adjustmentAmount,
  adjustmentReason,
  adminId,
  adminName,
}: {
  rentRecordId: string;
  adjustmentAmount: number; // positive or negative
  adjustmentReason: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const record = await RentRecord.findById(rentRecordId);
  if (!record) throw new Error('Rent record not found');

  const prevPayable = record.totalPayable;
  record.adjustmentAmount += adjustmentAmount;
  record.adjustmentReason = adjustmentReason;
  record.totalPayable += adjustmentAmount;
  record.outstandingAmount = Math.max(0, record.totalPayable - record.amountPaid);

  if (record.outstandingAmount === 0 && record.amountPaid >= record.totalPayable) {
    record.status = 'Paid';
  } else if (record.amountPaid > 0) {
    record.status = 'Partially Paid';
  }

  await record.save();

  await logAudit({
    action: 'Rent Adjusted',
    module: 'Rent',
    recordId: rentRecordId,
    adminId,
    adminName,
    previousValues: { totalPayable: prevPayable },
    newValues: { adjustmentAmount, newTotalPayable: record.totalPayable, adjustmentReason },
  });

  return record;
}

