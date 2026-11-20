const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://aneridelxn_db_user:nX3DIRhExFxHKYv2@cluster0.fgncbcl.mongodb.net/pg_management?retryWrites=true&w=majority';

async function seed() {
  try {
    console.log('[Seeder] Connecting to MongoDB Atlas Cluster...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('[Seeder] Connected successfully to Atlas cluster!');

    // Clean existing collections in this db
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const residentHashedPassword = await bcrypt.hash('Resident@123', 10);

    // 1. Admin User
    const adminUser = await mongoose.connection.db.collection('users').insertOne({
      name: 'Super Admin',
      email: 'admin@pgapp.com',
      phone: '9876543210',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. PG Property
    const property = await mongoose.connection.db.collection('pgproperties').insertOne({
      name: 'Stanza Living - Emerald House',
      pgType: 'Coliving',
      address: 'Plot 42, Green Glen Layout, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      contactPerson: 'Ramesh Sharma',
      contactNumber: '9988776655',
      description: '2 Floors, 14 Rooms total. Flexible Single Tenant Full-Room or Sharing without fixed cot rigidity.',
      facilities: ['High Speed Wi-Fi', '3-Time Meals', 'Daily Housekeeping', 'Air Conditioning', 'Power Backup', 'Washing Machine', 'Gym'],
      rules: ['No loud music after 10 PM', 'Guests allowed in common areas until 8 PM', 'Non-smoking building'],
      images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. 2 Floors with 7 Rooms each = 14 Rooms total
    // Floor 1: Rooms 101 to 107
    // Floor 2: Rooms 201 to 207
    let firstRoomId = null;

    for (let floor = 1; floor <= 2; floor++) {
      for (let roomIdx = 1; roomIdx <= 7; roomIdx++) {
        const roomNumber = `${floor}0${roomIdx}`;
        // Rooms can be Full Room (Single Tenant) or Sharing
        // Example: Rooms 101, 102, 201, 202 are Full Room (Single Tenant)
        // Other rooms are Sharing with flexible capacities
        const isSingleTenantFullRoom = roomIdx <= 2;
        const rentalType = isSingleTenantFullRoom ? 'Full Room (Single Tenant)' : 'Sharing';
        const maxCapacity = isSingleTenantFullRoom ? 1 : (roomIdx <= 5 ? 2 : 3);
        const roomType = roomIdx <= 4 ? 'AC' : 'Non-AC';
        const defaultRent = isSingleTenantFullRoom ? 15000 : (roomType === 'AC' ? 8500 : 6500);

        const roomInsert = await mongoose.connection.db.collection('rooms').insertOne({
          propertyId: property.insertedId,
          roomNumber,
          floor,
          roomType,
          rentalType,
          maxCapacity,
          currentOccupants: 0,
          defaultRent,
          status: 'Available',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (floor === 1 && roomIdx === 1) {
          firstRoomId = roomInsert.insertedId;
        }
      }
    }

    console.log('[Seeder] 2 Floors (14 Rooms) created without cot restrictions.');

    // 4. Resident User & Profile allocated to Room 101 with custom agreed charges
    const residentUser = await mongoose.connection.db.collection('users').insertOne({
      name: 'Aditya Verma',
      email: 'resident@pgapp.com',
      phone: '9845123456',
      password: residentHashedPassword,
      role: 'resident',
      propertyId: property.insertedId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const residentProfile = await mongoose.connection.db.collection('residentprofiles').insertOne({
      userId: residentUser.insertedId,
      fullName: 'Aditya Verma',
      email: 'resident@pgapp.com',
      phone: '9845123456',
      permanentAddress: '124, Civil Lines, Jaipur, Rajasthan',
      occupation: 'Working Professional',
      companyOrCollege: 'Google Bengaluru',
      emergencyContactName: 'Rajesh Verma (Father)',
      emergencyContactNumber: '9414012345',
      joiningDate: new Date('2026-10-01'),
      propertyId: property.insertedId,
      roomId: firstRoomId,
      occupancyType: 'Full Room',
      monthlyRent: 14000, // Custom negotiated rate set by Admin
      rentDueDay: 5,
      securityDeposit: 25000, // Custom agreed deposit
      securityDepositPaid: 25000,
      advancePayment: 14000,
      noticePeriodDays: 30,
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update Room 101 occupancy
    await mongoose.connection.db.collection('rooms').updateOne(
      { _id: firstRoomId },
      { $set: { currentOccupants: 1, status: 'Full' } }
    );

    // 5. Security Deposit
    await mongoose.connection.db.collection('securitydeposits').insertOne({
      residentId: residentProfile.insertedId,
      propertyId: property.insertedId,
      depositRequired: 25000,
      depositReceived: 25000,
      depositOutstanding: 0,
      refundStatus: 'Not Applicable',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6. Rent Records
    const octRent = await mongoose.connection.db.collection('rentrecords').insertOne({
      residentId: residentProfile.insertedId,
      propertyId: property.insertedId,
      roomId: firstRoomId,
      rentMonth: '2026-10',
      rentAmount: 14000,
      dueDate: new Date('2026-10-05'),
      previousOutstanding: 0,
      totalPayable: 14000,
      amountPaid: 14000,
      outstandingAmount: 0,
      status: 'Paid',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-03'),
    });

    await mongoose.connection.db.collection('paymentreceipts').insertOne({
      receiptNumber: 'STANZA-202610-001',
      propertyId: property.insertedId,
      residentId: residentProfile.insertedId,
      rentRecordId: octRent.insertedId,
      rentMonth: '2026-10',
      amount: 14000,
      paymentMethod: 'UPI',
      paymentDate: new Date('2026-10-03'),
      transactionReference: 'UPI/229988112344',
      remainingBalance: 0,
      receivedBy: adminUser.insertedId,
      createdAt: new Date('2026-10-03'),
      updatedAt: new Date('2026-10-03'),
    });

    const novRent = await mongoose.connection.db.collection('rentrecords').insertOne({
      residentId: residentProfile.insertedId,
      propertyId: property.insertedId,
      roomId: firstRoomId,
      rentMonth: '2026-11',
      rentAmount: 14000,
      dueDate: new Date('2026-11-05'),
      previousOutstanding: 0,
      totalPayable: 14000,
      amountPaid: 0,
      outstandingAmount: 14000,
      status: 'Overdue',
      createdAt: new Date('2026-11-01'),
      updatedAt: new Date('2026-11-01'),
    });

    // 7. Notification for Resident
    await mongoose.connection.db.collection('notifications').insertOne({
      recipientId: residentUser.insertedId,
      title: 'Rent Due for November 2026',
      message: 'Your agreed monthly rent of ₹14,000 for Room 101 (November 2026) is due. Please submit payment via UPI or Bank Transfer.',
      type: 'Rent',
      referenceId: novRent.insertedId.toString(),
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 8. AppSettings
    await mongoose.connection.db.collection('appsettings').insertOne({
      rentDueDay: 5,
      gracePeriodDays: 3,
      reminderSchedule: [-5, -1, 0, 3, 7],
      requirePaymentProof: true,
      allowPartialPayment: true,
      allowAdvancePayment: false,
      autoVerifyDocuments: false,
      complaintCategories: ['Water', 'Electricity', 'Wi-Fi', 'Cleaning', 'Food', 'Maintenance', 'Room issues', 'Other'],
      timezone: 'Asia/Kolkata',
      upiId: 'pgmanagement@okhdfcbank',
      bankDetails: {
        accountName: 'Stanza Emerald Property Ltd',
        accountNumber: '50200012345678',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank - Bellandur Branch',
      },
      receiptPrefix: 'STANZA',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('\n=============================================');
    console.log('MongoDB Atlas Database Seeded with Flexible Room Model!');
    console.log('Floors: 2 (Floor 1: 101-107, Floor 2: 201-207)');
    console.log('Rental Model: Full Room (Single Tenant) or Sharing with flexible custom charges');
    console.log('Admin: email="admin@pgapp.com", password="Admin@123"');
    console.log('Resident: email="resident@pgapp.com", password="Resident@123"');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error on Atlas:', err);
    process.exit(1);
  }
}

seed();
