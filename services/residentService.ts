import { connectDB } from '@/lib/db';
import { ResidentProfile } from '@/models/ResidentProfile';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { PGProperty } from '@/models/PGProperty';
import { SecurityDeposit } from '@/models/SecurityDeposit';
import { DepositTransaction } from '@/models/DepositTransaction';
import { ResidentDocument } from '@/models/ResidentDocument';
import { RentRecord } from '@/models/RentRecord';
import { hashPassword } from '@/lib/auth';
import { createInAppNotification } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';
import { sendResidentWelcomeEmail } from '@/lib/mailer';
import { uploadDocument } from '@/services/documentService';

export async function getResidents(filters: { propertyId?: string; status?: string; search?: string } = {}) {
  await connectDB();
  const query: any = {};
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.$or = [
      { fullName: { $regex: filters.search, $options: 'i' } },
      { phone: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
    ];
  }

  return ResidentProfile.find(query)
    .populate('propertyId', 'name address city')
    .populate('roomId', 'roomNumber floor roomType rentalType defaultRent')
    .sort({ createdAt: -1 });
}

export async function getResidentById(id: string) {
  await connectDB();
  const resident = await ResidentProfile.findById(id)
    .populate('propertyId', 'name address city contactPerson contactNumber facilities rules')
    .populate('roomId', 'roomNumber floor roomType rentalType defaultRent maxCapacity')
    .populate('userId', 'email phone isActive createdAt');
  if (!resident) throw new Error('Resident not found');

  // Also fetch financial & document summary for detail page
  const { RentRecord } = await import('@/models/RentRecord');
  const { PaymentSubmission } = await import('@/models/PaymentSubmission');
  const { ResidentDocument } = await import('@/models/ResidentDocument');
  const { SecurityDeposit } = await import('@/models/SecurityDeposit');

  const [rents, payments, docs, deposit] = await Promise.all([
    RentRecord.find({ residentId: id }).sort({ rentMonth: -1 }),
    PaymentSubmission.find({ residentId: id }).sort({ paymentDate: -1 }),
    ResidentDocument.find({ residentId: id }).sort({ createdAt: -1 }),
    SecurityDeposit.findOne({ residentId: id }),
  ]);

  return {
    ...resident.toObject(),
    rentRecords: rents,
    payments,
    documents: docs,
    securityDepositRecord: deposit,
  };
}

export async function registerResident(data: {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  permanentAddress: string;
  dateOfBirth?: string;
  occupation?: 'Student' | 'Working Professional' | 'Other';
  companyOrCollege?: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  joiningDate: string;
  propertyId: string;
  roomId: string;
  occupancyType: 'Full Room' | 'Shared';
  monthlyRent: number; // Admin custom rent
  rentDueDay?: number;
  securityDeposit: number; // Admin custom deposit
  advancePayment?: number;
  agreementStartDate?: string;
  agreementEndDate?: string;
  noticePeriodDays?: number;
  aadhaarNumber?: string;
  panNumber?: string;
  aadhaarFrontFile?: { name: string; type: string; size: number; base64: string };
  aadhaarBackFile?: { name: string; type: string; size: number; base64: string };
  panCardFile?: { name: string; type: string; size: number; base64: string };
  adminId: string;
  adminName: string;
}) {
  await connectDB();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email.trim())) {
    throw new Error('Please provide a valid email address.');
  }

  // Validate phone format (10-digit Indian mobile)
  const phoneDigits = data.phone.replace(/\D/g, '');
  if (phoneDigits.length !== 10) {
    throw new Error('Phone number must be a valid 10-digit number.');
  }

  // Validate Aadhaar number (12 digits required)
  const aadhaarDigits = (data.aadhaarNumber || '').replace(/\D/g, '');
  if (aadhaarDigits.length !== 12) {
    throw new Error('Aadhaar number must be exactly 12 digits.');
  }

  // Validate PAN format (5 uppercase letters, 4 digits, 1 uppercase letter)
  const panUpper = (data.panNumber || '').trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(panUpper)) {
    throw new Error('PAN Card number is invalid. Format must be 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).');
  }

  // Validate required proofs
  if (!data.aadhaarFrontFile?.base64) {
    throw new Error('Aadhaar Card Front image is required.');
  }
  if (!data.aadhaarBackFile?.base64) {
    throw new Error('Aadhaar Card Back image is required.');
  }
  if (!data.panCardFile?.base64) {
    throw new Error('PAN Card document image is required.');
  }

  // Check unique email and phone
  const existingUser = await User.findOne({
    $or: [{ email: data.email.toLowerCase().trim() }, { phone: data.phone.trim() }],
  });
  if (existingUser) {
    throw new Error('A user with this email or phone number already exists.');
  }

  // Check room capacity
  const room = await Room.findById(data.roomId);
  if (!room) throw new Error('Selected room not found.');

  const existingOccupants = await ResidentProfile.countDocuments({
    roomId: data.roomId,
    status: { $in: ['Active', 'Notice Period'] },
  });

  if (room.rentalType === 'Full Room (Single Tenant)' && existingOccupants >= 1) {
    throw new Error(`Room ${room.roomNumber} is rented as Full Room (Single Tenant) and is already fully occupied.`);
  }

  if (room.rentalType === 'Sharing' && existingOccupants >= room.maxCapacity) {
    throw new Error(`Room ${room.roomNumber} has reached its maximum capacity of ${room.maxCapacity} tenants.`);
  }

  // Create User Login
  const defaultPassword = data.password || 'Resident@123';
  const hashedPassword = await hashPassword(defaultPassword);

  const newUser = await User.create({
    name: data.fullName,
    email: data.email.toLowerCase().trim(),
    phone: data.phone.trim(),
    password: hashedPassword,
    role: 'resident',
    propertyId: data.propertyId,
    isActive: true,
  });

  // Create Resident Profile
  const profile = await ResidentProfile.create({
    userId: newUser._id,
    fullName: data.fullName,
    email: data.email.toLowerCase().trim(),
    phone: data.phone.trim(),
    permanentAddress: data.permanentAddress,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    occupation: data.occupation || 'Working Professional',
    companyOrCollege: data.companyOrCollege || '',
    emergencyContactName: data.emergencyContactName,
    emergencyContactNumber: data.emergencyContactNumber,
    joiningDate: new Date(data.joiningDate),
    propertyId: data.propertyId,
    roomId: data.roomId,
    occupancyType: data.occupancyType || (room.rentalType === 'Full Room (Single Tenant)' ? 'Full Room' : 'Shared'),
    monthlyRent: Number(data.monthlyRent),
    rentDueDay: data.rentDueDay || 5,
    securityDeposit: Number(data.securityDeposit),
    securityDepositPaid: Number(data.advancePayment || 0),
    advancePayment: Number(data.advancePayment || 0),
    agreementStartDate: data.agreementStartDate ? new Date(data.agreementStartDate) : undefined,
    agreementEndDate: data.agreementEndDate ? new Date(data.agreementEndDate) : undefined,
    noticePeriodDays: data.noticePeriodDays || 30,
    status: 'Active',
  });

  // Update room occupancy
  const updatedOccupants = existingOccupants + 1;
  const isNowFull =
    room.rentalType === 'Full Room (Single Tenant)'
      ? updatedOccupants >= 1
      : updatedOccupants >= room.maxCapacity;

  await Room.findByIdAndUpdate(data.roomId, {
    currentOccupants: updatedOccupants,
    status: isNowFull ? 'Full' : 'Available',
  });

  // Create Security Deposit Record
  const depositRecord = await SecurityDeposit.create({
    residentId: profile._id,
    propertyId: data.propertyId,
    depositRequired: Number(data.securityDeposit),
    depositReceived: Number(data.advancePayment || 0),
    depositOutstanding: Math.max(0, Number(data.securityDeposit) - Number(data.advancePayment || 0)),
    refundStatus: 'Not Applicable',
  });

  if (data.advancePayment && Number(data.advancePayment) > 0) {
    await DepositTransaction.create({
      depositId: depositRecord._id,
      residentId: profile._id,
      type: 'Payment',
      amount: Number(data.advancePayment),
      paymentMethod: 'Cash',
      notes: 'Initial deposit/advance paid during onboarding',
      createdBy: data.adminId,
    });
  }

  // Auto-create initial Monthly Rent Record for onboarding month so pending rent is immediately available
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dueDay = profile.rentDueDay || 5;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
    const rentAmount = profile.monthlyRent || 0;

    await RentRecord.create({
      residentId: profile._id,
      propertyId: profile.propertyId,
      roomId: profile.roomId,
      bedId: profile.bedId,
      rentMonth: currentMonth,
      rentAmount,
      dueDate,
      previousOutstanding: 0,
      totalPayable: rentAmount,
      amountPaid: 0,
      outstandingAmount: rentAmount,
      status: 'Unpaid',
    });
  } catch (rentErr: any) {
    console.error('[ResidentService] Error creating initial rent record on onboarding:', rentErr.message);
  }

  // Upload Aadhaar and PAN Card proofs to Cloudinary & local storage
  // When uploaded during Admin onboarding, mark as auto-verified directly
  if (data.aadhaarFrontFile?.base64) {
    try {
      const buffer = Buffer.from(data.aadhaarFrontFile.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await uploadDocument({
        residentId: profile._id.toString(),
        category: 'Aadhaar Front',
        documentName: 'Aadhaar Card (Front)',
        originalFileName: data.aadhaarFrontFile.name || 'aadhaar_front.jpg',
        mimeType: data.aadhaarFrontFile.type || 'image/jpeg',
        fileSize: data.aadhaarFrontFile.size || buffer.length,
        fileBuffer: buffer,
        documentNumber: data.aadhaarNumber,
        isUploadedByAdmin: true,
        uploadedByAdminName: data.adminId || 'Admin',
      });
    } catch (e: any) {
      console.error('[ResidentService] Error saving Aadhaar front proof:', e.message);
    }
  }

  if (data.aadhaarBackFile?.base64) {
    try {
      const buffer = Buffer.from(data.aadhaarBackFile.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await uploadDocument({
        residentId: profile._id.toString(),
        category: 'Aadhaar Back',
        documentName: 'Aadhaar Card (Back)',
        originalFileName: data.aadhaarBackFile.name || 'aadhaar_back.jpg',
        mimeType: data.aadhaarBackFile.type || 'image/jpeg',
        fileSize: data.aadhaarBackFile.size || buffer.length,
        fileBuffer: buffer,
        documentNumber: data.aadhaarNumber,
        isUploadedByAdmin: true,
        uploadedByAdminName: data.adminId || 'Admin',
      });
    } catch (e: any) {
      console.error('[ResidentService] Error saving Aadhaar back proof:', e.message);
    }
  }

  if (data.panCardFile?.base64) {
    try {
      const buffer = Buffer.from(data.panCardFile.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await uploadDocument({
        residentId: profile._id.toString(),
        category: 'PAN Card',
        documentName: 'PAN Card Proof',
        originalFileName: data.panCardFile.name || 'pan_card.jpg',
        mimeType: data.panCardFile.type || 'image/jpeg',
        fileSize: data.panCardFile.size || buffer.length,
        fileBuffer: buffer,
        documentNumber: data.panNumber,
        isUploadedByAdmin: true,
        uploadedByAdminName: data.adminId || 'Admin',
      });
    } catch (e: any) {
      console.error('[ResidentService] Error saving PAN card proof:', e.message);
    }
  }

  // Update User and ResidentProfile with uploaded document URLs for immediate direct fetching
  try {
    const uploadedDocs = await ResidentDocument.find({ residentId: profile._id });
    const docsSummary = uploadedDocs.map(d => ({
      category: d.category,
      documentName: d.documentName,
      cloudinaryUrl: d.cloudinaryUrl,
      uploadedAt: d.createdAt,
    }));
    const aadhaarUrl = docsSummary.find(d => d.category.includes('Aadhaar'))?.cloudinaryUrl || '';
    const panUrl = docsSummary.find(d => d.category.includes('PAN'))?.cloudinaryUrl || '';

    await Promise.all([
      User.findByIdAndUpdate(newUser._id, {
        documents: docsSummary,
        aadhaarCardUrl: aadhaarUrl,
        panCardUrl: panUrl,
      }),
      ResidentProfile.findByIdAndUpdate(profile._id, {
        documents: docsSummary,
        aadhaarCardUrl: aadhaarUrl,
        panCardUrl: panUrl,
      }),
    ]);
  } catch (err: any) {
    console.error('[ResidentService] Error embedding document references into User/Profile:', err.message);
  }

  // Welcome Notification
  await createInAppNotification({
    recipientId: newUser._id,
    title: 'Welcome to your PG!',
    message: `Welcome ${profile.fullName}! Room ${room.roomNumber} has been allocated at agreed rent ₹${profile.monthlyRent}/month.`,
    type: 'System',
    referenceId: profile._id.toString(),
  });

  // Fetch property name for welcome email
  let propertyName = 'PG Accommodation';
  try {
    const prop = await PGProperty.findById(data.propertyId);
    if (prop) propertyName = prop.name;
  } catch (e) {
    // continue
  }

  // Send Login Credentials via Email in background so API responds immediately without lag
  let emailSentPromise = sendResidentWelcomeEmail({
    to: profile.email,
    residentName: profile.fullName,
    pgName: propertyName,
    roomNumber: room.roomNumber,
    email: profile.email,
    password: defaultPassword,
    monthlyRent: profile.monthlyRent,
    securityDeposit: profile.securityDeposit,
  }).catch((e) => {
    console.error('[ResidentService] Welcome email failed:', e.message);
    return { success: false, error: e.message };
  });

  // Audit Log
  await logAudit({
    action: 'Resident Registered',
    module: 'Residents',
    recordId: profile._id.toString(),
    adminId: data.adminId,
    adminName: data.adminName,
    newValues: {
      residentName: profile.fullName,
      roomNumber: room.roomNumber,
      occupancyType: profile.occupancyType,
      monthlyRent: profile.monthlyRent,
      securityDeposit: profile.securityDeposit,
    },
  });

  return {
    ...profile.toObject(),
    generatedPassword: defaultPassword,
    emailSent: true,
  };
}

export async function updateResident(
  id: string,
  data: Partial<any>,
  adminInfo: { adminId: string; adminName: string }
) {
  await connectDB();
  const existing = await ResidentProfile.findById(id);
  if (!existing) throw new Error('Resident not found');

  const previousValues = existing.toObject();
  const updated = await ResidentProfile.findByIdAndUpdate(id, data, { new: true });

  const userUpdates: any = {};
  if (data.fullName) userUpdates.name = data.fullName.trim();
  if (data.email) userUpdates.email = data.email.toLowerCase().trim();
  if (data.phone) userUpdates.phone = data.phone.trim();
  if (data.password && data.password.trim()) {
    userUpdates.password = await hashPassword(data.password.trim());
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(existing.userId, userUpdates);
  }

  await logAudit({
    action: 'Resident Updated',
    module: 'Residents',
    recordId: id,
    adminId: adminInfo.adminId,
    adminName: adminInfo.adminName,
    previousValues,
    newValues: { ...data, password: data.password ? '[UPDATED]' : undefined },
  });

  return updated;
}

export async function checkoutResident({
  residentId,
  vacatingDate,
  damageDeductions = 0,
  otherDeductions = 0,
  refundMethod,
  refundReference,
  notes,
  adminId,
  adminName,
}: {
  residentId: string;
  vacatingDate: string;
  damageDeductions?: number;
  otherDeductions?: number;
  refundMethod?: 'UPI' | 'Bank Transfer' | 'Cash';
  refundReference?: string;
  notes?: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const resident = await ResidentProfile.findById(residentId);
  if (!resident) throw new Error('Resident not found');

  // Check deposit
  const deposit = await SecurityDeposit.findOne({ residentId });
  const totalReceivedDeposit = deposit ? deposit.depositReceived : 0;
  const netRefundable = Math.max(0, totalReceivedDeposit - damageDeductions - otherDeductions);

  // Update Resident Profile Status
  resident.status = 'Vacated';
  resident.vacatingDate = new Date(vacatingDate);
  await resident.save();

  // Update room occupancy
  if (resident.roomId) {
    const activeOccupantsCount = await ResidentProfile.countDocuments({
      roomId: resident.roomId,
      status: { $in: ['Active', 'Notice Period'] },
    });
    await Room.findByIdAndUpdate(resident.roomId, {
      currentOccupants: activeOccupantsCount,
      status: 'Available',
    });
  }

  // Deactivate User Login
  await User.findByIdAndUpdate(resident.userId, { isActive: false });

  // Update Deposit
  if (deposit) {
    deposit.refundStatus = 'Refunded';
    deposit.refundAmount = netRefundable;
    deposit.damageDeductions = damageDeductions;
    deposit.otherDeductions = otherDeductions;
    deposit.refundDate = new Date();
    deposit.notes = notes || '';
    await deposit.save();

    if (netRefundable > 0) {
      await DepositTransaction.create({
        depositId: deposit._id,
        residentId: resident._id,
        type: 'Refund',
        amount: netRefundable,
        paymentMethod: refundMethod || 'UPI',
        transactionReference: refundReference || '',
        notes: `Refund on checkout. Damage: ₹${damageDeductions}, Other: ₹${otherDeductions}`,
        createdBy: adminId,
      });
    }
  }

  // Notification
  await createInAppNotification({
    recipientId: resident.userId,
    title: 'Checkout Completed',
    message: `Your PG checkout has been completed. Refund of ₹${netRefundable} has been processed.`,
    type: 'System',
    referenceId: resident._id.toString(),
  });

  await logAudit({
    action: 'Resident Checkout',
    module: 'Residents',
    recordId: residentId,
    adminId,
    adminName,
    newValues: {
      vacatingDate,
      damageDeductions,
      netRefundable,
    },
  });

  return { resident, netRefundable };
}
