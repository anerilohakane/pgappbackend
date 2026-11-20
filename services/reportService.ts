import { connectDB } from '@/lib/db';
import { PGProperty } from '@/models/PGProperty';
import { Room } from '@/models/Room';
import { ResidentProfile } from '@/models/ResidentProfile';
import { RentRecord } from '@/models/RentRecord';
import { PaymentSubmission } from '@/models/PaymentSubmission';
import { PaymentReceipt } from '@/models/PaymentReceipt';
import { SecurityDeposit } from '@/models/SecurityDeposit';
import { Complaint } from '@/models/Complaint';

export async function getAdminDashboardStats(propertyId?: string, month?: string) {
  await connectDB();
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const propQuery = propertyId ? { _id: propertyId } : {};
  const relPropQuery = propertyId ? { propertyId } : {};

  // Properties, Rooms, Capacities
  const totalProperties = await PGProperty.countDocuments(propQuery);
  const rooms = await Room.find(relPropQuery);
  const totalRooms = rooms.length;

  // Total room capacity
  const totalCapacity = rooms.reduce((acc, r) => acc + (r.rentalType === 'Full Room (Single Tenant)' ? 1 : r.maxCapacity), 0);

  // Residents
  const activeResidents = await ResidentProfile.countDocuments({ ...relPropQuery, status: 'Active' });
  const noticeResidents = await ResidentProfile.countDocuments({ ...relPropQuery, status: 'Notice Period' });

  // Full vs Available Rooms
  let fullRooms = 0;
  let availableRooms = 0;
  for (const r of rooms) {
    const occupants = await ResidentProfile.countDocuments({
      roomId: r._id,
      status: { $in: ['Active', 'Notice Period'] },
    });
    const isFull = r.rentalType === 'Full Room (Single Tenant)' ? occupants >= 1 : occupants >= r.maxCapacity;
    if (isFull) fullRooms++;
    else availableRooms++;
  }

  // Rent for selected month
  const rentRecordsForMonth = await RentRecord.find({
    ...relPropQuery,
    rentMonth: currentMonth,
  });

  const totalRentForMonth = rentRecordsForMonth.reduce((acc, r) => acc + r.totalPayable, 0);
  const rentCollected = rentRecordsForMonth.reduce((acc, r) => acc + r.amountPaid, 0);
  const pendingRent = rentRecordsForMonth.reduce((acc, r) => acc + r.outstandingAmount, 0);

  // Overdue rent
  const today = new Date();
  const overdueRentRecords = await RentRecord.find({
    ...relPropQuery,
    rentMonth: currentMonth,
    outstandingAmount: { $gt: 0 },
    dueDate: { $lt: today },
  });
  const overdueRent = overdueRentRecords.reduce((acc, r) => acc + r.outstandingAmount, 0);

  // Security Deposit Total
  const deposits = await SecurityDeposit.find(relPropQuery);
  const securityDepositTotal = deposits.reduce((acc, d) => acc + d.depositReceived, 0);

  // Pending Payment Verifications
  const pendingVerifications = await PaymentSubmission.countDocuments({ status: 'Pending' });

  // Recent Data
  const recentResidents = await ResidentProfile.find(relPropQuery)
    .populate('propertyId', 'name')
    .populate('roomId', 'roomNumber rentalType')
    .sort({ createdAt: -1 })
    .limit(5);

  const recentPayments = await PaymentSubmission.find()
    .populate('residentId', 'fullName phone')
    .sort({ createdAt: -1 })
    .limit(5);

  const recentComplaints = await Complaint.find(relPropQuery)
    .populate('residentId', 'fullName')
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    currentMonth,
    summaryCards: {
      totalProperties,
      totalRooms,
      totalCapacity,
      fullRooms,
      availableRooms,
      activeResidents,
      noticeResidents,
      totalRentForMonth,
      rentCollected,
      pendingRent,
      overdueRent,
      securityDepositTotal,
      pendingPaymentVerification: pendingVerifications,
    },
    recentResidents,
    recentPayments,
    recentComplaints,
  };
}

export async function getRentReport(filters: { propertyId?: string; month?: string }) {
  await connectDB();
  const query: any = {};
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.month) query.rentMonth = filters.month;

  return RentRecord.find(query)
    .populate('residentId', 'fullName phone email')
    .populate('propertyId', 'name')
    .populate('roomId', 'roomNumber rentalType')
    .sort({ rentMonth: -1 });
}

export async function getCollectionReport(filters: { propertyId?: string; paymentMethod?: string }) {
  await connectDB();
  const query: any = {};
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

  return PaymentReceipt.find(query)
    .populate('residentId', 'fullName phone')
    .populate('propertyId', 'name')
    .sort({ paymentDate: -1 });
}
