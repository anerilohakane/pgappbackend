import { connectDB } from '@/lib/db';
import { SecurityDeposit } from '@/models/SecurityDeposit';
import { DepositTransaction } from '@/models/DepositTransaction';
import { ResidentProfile } from '@/models/ResidentProfile';
import { logAudit } from '@/lib/audit';

export async function getDeposits(filters: { propertyId?: string; residentId?: string } = {}) {
  await connectDB();
  const query: any = {};
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.residentId) query.residentId = filters.residentId;

  return SecurityDeposit.find(query)
    .populate('residentId', 'fullName phone email status')
    .populate('propertyId', 'name')
    .sort({ createdAt: -1 });
}

export async function recordDepositPayment({
  depositId,
  amount,
  paymentMethod,
  transactionReference,
  notes,
  adminId,
  adminName,
}: {
  depositId: string;
  amount: number;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash';
  transactionReference?: string;
  notes?: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const deposit = await SecurityDeposit.findById(depositId);
  if (!deposit) throw new Error('Deposit record not found');

  deposit.depositReceived += amount;
  deposit.depositOutstanding = Math.max(0, deposit.depositRequired - deposit.depositReceived);
  await deposit.save();

  // Also update ResidentProfile securityDepositPaid
  await ResidentProfile.findByIdAndUpdate(deposit.residentId, {
    securityDepositPaid: deposit.depositReceived,
  });

  const transaction = await DepositTransaction.create({
    depositId: deposit._id,
    residentId: deposit.residentId,
    type: 'Payment',
    amount,
    paymentMethod,
    transactionReference: transactionReference || '',
    notes: notes || 'Deposit installment received',
    createdBy: adminId,
  });

  await logAudit({
    action: 'Deposit Payment Recorded',
    module: 'Deposits',
    recordId: depositId,
    adminId,
    adminName,
    newValues: { amount, depositReceived: deposit.depositReceived },
  });

  return { deposit, transaction };
}

export async function getDepositTransactions(depositId: string) {
  await connectDB();
  return DepositTransaction.find({ depositId }).sort({ createdAt: -1 });
}

