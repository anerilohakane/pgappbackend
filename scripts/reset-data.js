const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://aneridelxn_db_user:nX3DIRhExFxHKYv2@cluster0.fgncbcl.mongodb.net/pg_management?retryWrites=true&w=majority';

async function resetDatabase() {
  try {
    console.log('[Reset] Connecting to MongoDB Atlas Cluster...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('[Reset] Connected successfully!');

    // Clean all collections completely
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      const name = collection.collectionName;
      await collection.deleteMany({});
      console.log(`[Reset] Cleared collection: ${name}`);
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Recreate only the core Admin user so you can log in to begin manual testing
    const adminUser = await mongoose.connection.db.collection('users').insertOne({
      name: 'System Admin',
      email: 'admin@pgapp.com',
      phone: '9876543210',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Default system settings (UPI / Bank details) for receipts
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
        accountName: 'PG Management Ltd',
        accountNumber: '50200012345678',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
      },
      receiptPrefix: 'REC',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('\n=============================================');
    console.log('DATABASE RESET COMPLETED!');
    console.log('All dummy data removed:');
    console.log('- 0 PG Properties');
    console.log('- 0 Rooms');
    console.log('- 0 Residents');
    console.log('- 0 Rent Records');
    console.log('- 0 Payment Receipts & Submissions');
    console.log('- 0 Complaints');
    console.log('- 0 Security Deposits');
    console.log('');
    console.log('Ready for manual testing with Admin login:');
    console.log('Email:    admin@pgapp.com');
    console.log('Password: Admin@123');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Reset error:', err);
    process.exit(1);
  }
}

resetDatabase();

