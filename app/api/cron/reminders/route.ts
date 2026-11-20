import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { RentRecord } from '@/models/RentRecord';
import { ResidentProfile } from '@/models/ResidentProfile';
import { createInAppNotification } from '@/lib/notifications';
import { generateMonthlyRentForActiveResidents } from '@/services/rentService';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.CRON_SECRET || 'pg_cron_secure_key_12345';
    
    // Check cron authorization header or allow logged-in admin token
    const isCronSecret = authHeader === `Bearer ${secret}`;
    const user = requireAuth(req);
    const isAdmin = !('error' in user) && user.user.role === 'admin';

    if (!isCronSecret && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin or valid cron secret required' }, { status: 401 });
    }

    await connectDB();
    const now = new Date();
    const currentBillingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Automatic monthly rent generation if not yet generated
    const rentGenResult = await generateMonthlyRentForActiveResidents({
      billingMonth: currentBillingMonth,
      adminName: 'Automated Cron Scheduler',
    });

    // 2. Scheduled Rent Reminders
    const unpaidRentRecords = await RentRecord.find({
      status: { $in: ['Unpaid', 'Partially Paid', 'Overdue'] },
      outstandingAmount: { $gt: 0 },
    }).populate('residentId');

    let remindersSent = 0;
    const todayMs = now.getTime();

    for (const record of unpaidRentRecords) {
      const resident: any = record.residentId;
      if (!resident || resident.status === 'Vacated') continue;

      const dueMs = new Date(record.dueDate).getTime();
      const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));

      // Schedules: 5 days before, 1 day before, due date (0), 3 days overdue (-3), every 7 days overdue
      const isEligibleReminder =
        diffDays === 5 ||
        diffDays === 1 ||
        diffDays === 0 ||
        diffDays === -3 ||
        (diffDays < -3 && diffDays % 7 === 0);

      if (isEligibleReminder) {
        let title = `Rent Reminder: ${record.rentMonth}`;
        if (diffDays < 0) {
          title = `OVERDUE NOTICE: Rent for ${record.rentMonth}`;
          record.status = 'Overdue';
          await record.save();
        }

        await createInAppNotification({
          recipientId: resident.userId,
          title,
          message: `Dear ${resident.fullName}, your rent of ₹${record.rentAmount} for ${record.rentMonth} has an outstanding balance of ₹${record.outstandingAmount}. Due date: ${new Date(record.dueDate).toLocaleDateString('en-IN')}. Please submit your payment.`,
          type: 'Rent',
          referenceId: record._id.toString(),
        });
        remindersSent++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled cron execution completed',
      billingMonth: currentBillingMonth,
      rentGeneration: rentGenResult,
      remindersSent,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

