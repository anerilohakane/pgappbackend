import { connectDB } from '@/lib/db';
import { PaymentSubmission } from '@/models/PaymentSubmission';
import { RentRecord } from '@/models/RentRecord';
import { PaymentReceipt } from '@/models/PaymentReceipt';
import { ResidentProfile } from '@/models/ResidentProfile';
import { AppSettings } from '@/models/AppSettings';
import { createInAppNotification } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';

export async function submitPayment({
  residentId,
  rentRecordId,
  amount,
  paymentMethod,
  transactionId,
  screenshotPath,
  remarks,
}: {
  residentId: string;
  rentRecordId: string;
  amount: number;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash';
  transactionId?: string;
  screenshotPath?: string;
  remarks?: string;
}) {
  await connectDB();
  const rentRecord = await RentRecord.findById(rentRecordId);
  if (!rentRecord) throw new Error('Rent record not found');

  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  // UPI requires transaction reference and proof
  if (paymentMethod === 'UPI') {
    if (!transactionId || transactionId.trim() === '') {
      throw new Error('Transaction ID / UTR is required for UPI payment.');
    }
  }

  const submission = await PaymentSubmission.create({
    residentId,
    rentRecordId,
    rentMonth: rentRecord.rentMonth,
    amount,
    paymentMethod,
    paymentDate: new Date(),
    transactionId: transactionId || '',
    screenshotPath: screenshotPath || '',
    remarks: remarks || '',
    status: 'Pending',
  });

  // Update rent record status to Verification Pending
  rentRecord.status = 'Verification Pending';
  await rentRecord.save();

  return submission;
}

export async function approvePayment({
  submissionId,
  adminId,
  adminName,
}: {
  submissionId: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const submission = await PaymentSubmission.findById(submissionId);
  if (!submission) throw new Error('Payment submission not found');
  if (submission.status === 'Approved') {
    throw new Error('This payment submission is already approved.');
  }

  const rentRecord = await RentRecord.findById(submission.rentRecordId);
  if (!rentRecord) throw new Error('Linked rent record not found');

  // Mark submission approved
  submission.status = 'Approved';
  submission.verifiedBy = adminId as any;
  submission.verifiedAt = new Date();
  await submission.save();

  // Update RentRecord Ledger
  rentRecord.amountPaid += submission.amount;
  rentRecord.outstandingAmount = Math.max(0, rentRecord.totalPayable - rentRecord.amountPaid);
  if (rentRecord.outstandingAmount === 0) {
    rentRecord.status = 'Paid';
  } else {
    rentRecord.status = 'Partially Paid';
  }
  await rentRecord.save();

  // Generate Unique Receipt Number
  const settings = await AppSettings.findOne();
  const prefix = settings?.receiptPrefix || 'REC';
  const receiptNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const receipt = await PaymentReceipt.create({
    receiptNumber,
    propertyId: rentRecord.propertyId,
    residentId: submission.residentId,
    rentRecordId: rentRecord._id,
    paymentSubmissionId: submission._id,
    rentMonth: rentRecord.rentMonth,
    amount: submission.amount,
    paymentMethod: submission.paymentMethod,
    paymentDate: submission.paymentDate,
    transactionReference: submission.transactionId,
    remainingBalance: rentRecord.outstandingAmount,
    receivedBy: adminId,
  });

  // Notify resident
  const resident = await ResidentProfile.findById(submission.residentId);
  if (resident) {
    await createInAppNotification({
      recipientId: resident.userId,
      title: 'Payment Approved & Receipt Issued',
      message: `Your payment of ₹${submission.amount} for ${rentRecord.rentMonth} has been approved. Receipt ${receiptNumber} generated. Outstanding balance: ₹${rentRecord.outstandingAmount}.`,
      type: 'Payment',
      referenceId: receipt._id.toString(),
    });
  }

  // Audit Log
  await logAudit({
    action: 'Payment Approved',
    module: 'Payments',
    recordId: submissionId,
    adminId,
    adminName,
    newValues: {
      amount: submission.amount,
      receiptNumber,
      rentRecordStatus: rentRecord.status,
    },
  });

  return { submission, receipt, rentRecord };
}

export async function rejectPayment({
  submissionId,
  rejectionReason,
  adminId,
  adminName,
}: {
  submissionId: string;
  rejectionReason: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const submission = await PaymentSubmission.findById(submissionId);
  if (!submission) throw new Error('Payment submission not found');
  if (submission.status === 'Approved') {
    throw new Error('Approved payment cannot be rejected.');
  }

  submission.status = 'Rejected';
  submission.rejectionReason = rejectionReason;
  submission.verifiedBy = adminId as any;
  submission.verifiedAt = new Date();
  await submission.save();

  const rentRecord = await RentRecord.findById(submission.rentRecordId);
  if (rentRecord) {
    if (rentRecord.amountPaid === 0) {
      rentRecord.status = 'Unpaid';
    } else {
      rentRecord.status = 'Partially Paid';
    }
    await rentRecord.save();
  }

  const resident = await ResidentProfile.findById(submission.residentId);
  if (resident) {
    await createInAppNotification({
      recipientId: resident.userId,
      title: 'Payment Proof Rejected',
      message: `Your payment submission of ₹${submission.amount} for ${submission.rentMonth} was rejected. Reason: ${rejectionReason}. Please re-submit valid payment proof.`,
      type: 'Payment',
      referenceId: submission._id.toString(),
    });
  }

  await logAudit({
    action: 'Payment Rejected',
    module: 'Payments',
    recordId: submissionId,
    adminId,
    adminName,
    newValues: { rejectionReason },
  });

  return submission;
}

export async function recordCashPayment({
  residentId,
  rentRecordId,
  amount,
  remarks,
  adminId,
  adminName,
}: {
  residentId: string;
  rentRecordId: string;
  amount: number;
  remarks?: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const rentRecord = await RentRecord.findById(rentRecordId);
  if (!rentRecord) throw new Error('Rent record not found');

  // Create submission auto-approved for cash
  const submission = await PaymentSubmission.create({
    residentId,
    rentRecordId,
    rentMonth: rentRecord.rentMonth,
    amount,
    paymentMethod: 'Cash',
    paymentDate: new Date(),
    transactionId: 'CASH-' + Date.now().toString().slice(-6),
    remarks: remarks || 'Cash collected by admin',
    status: 'Approved',
    verifiedBy: adminId,
    verifiedAt: new Date(),
  });

  // Update RentRecord
  rentRecord.amountPaid += amount;
  rentRecord.outstandingAmount = Math.max(0, rentRecord.totalPayable - rentRecord.amountPaid);
  if (rentRecord.outstandingAmount === 0) {
    rentRecord.status = 'Paid';
  } else {
    rentRecord.status = 'Partially Paid';
  }
  await rentRecord.save();

  // Generate Receipt
  const settings = await AppSettings.findOne();
  const prefix = settings?.receiptPrefix || 'REC';
  const receiptNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const receipt = await PaymentReceipt.create({
    receiptNumber,
    propertyId: rentRecord.propertyId,
    residentId,
    rentRecordId: rentRecord._id,
    paymentSubmissionId: submission._id,
    rentMonth: rentRecord.rentMonth,
    amount,
    paymentMethod: 'Cash',
    paymentDate: new Date(),
    transactionReference: submission.transactionId,
    remainingBalance: rentRecord.outstandingAmount,
    receivedBy: adminId,
    notes: remarks || '',
  });

  const resident = await ResidentProfile.findById(residentId);
  if (resident) {
    await createInAppNotification({
      recipientId: resident.userId,
      title: 'Cash Payment Recorded',
      message: `Cash payment of ₹${amount} for ${rentRecord.rentMonth} has been received. Receipt ${receiptNumber} generated.`,
      type: 'Payment',
      referenceId: receipt._id.toString(),
    });
  }

  await logAudit({
    action: 'Cash Payment Recorded',
    module: 'Payments',
    recordId: receipt._id.toString(),
    adminId,
    adminName,
    newValues: { amount, receiptNumber },
  });

  return { submission, receipt, rentRecord };
}

