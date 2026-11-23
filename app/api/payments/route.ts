import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { submitPayment } from '@/services/paymentService';
import { PaymentSubmission } from '@/models/PaymentSubmission';
import { savePrivateFile } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    let residentId = url.searchParams.get('residentId') || undefined;

    if (auth.user.role === 'resident') {
      residentId = auth.user.residentId;
    }

    const query: any = {};
    if (status) query.status = status;
    if (residentId) query.residentId = residentId;

    const submissions = await PaymentSubmission.find(query)
      .populate('residentId', 'fullName phone')
      .populate('rentRecordId', 'rentMonth rentAmount outstandingAmount')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, payments: submissions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const rentRecordId = formData.get('rentRecordId') as string;
    const amount = Number(formData.get('amount'));
    const paymentMethod = (formData.get('paymentMethod') as any) || 'UPI';
    const transactionId = (formData.get('transactionId') as string) || '';
    const remarks = (formData.get('remarks') as string) || '';
    const screenshot = formData.get('screenshot') as File | null;

    let residentId = auth.user.residentId;
    if (auth.user.role === 'admin' && formData.get('residentId')) {
      residentId = formData.get('residentId') as string;
    }

    if (!residentId || !rentRecordId || !amount) {
      return NextResponse.json({ error: 'Missing required payment submission fields' }, { status: 400 });
    }

    // Strict validation for transaction ID and payment proof
    const cleanTxn = transactionId.trim();
    if (!cleanTxn || cleanTxn.length < 6) {
      return NextResponse.json({ error: 'A valid Transaction UTR / Reference ID (minimum 6 characters) is mandatory.' }, { status: 400 });
    }

    if (!screenshot || screenshot.size === 0) {
      return NextResponse.json({ error: 'Payment screenshot proof is mandatory. Please attach your payment screenshot.' }, { status: 400 });
    }

    let screenshotPath = '';
    if (screenshot) {
      const buffer = Buffer.from(await screenshot.arrayBuffer());
      const saved = await savePrivateFile('payments', screenshot.name, buffer);
      screenshotPath = saved.relativePath;
    }

    const submission = await submitPayment({
      residentId,
      rentRecordId,
      amount,
      paymentMethod,
      transactionId,
      screenshotPath,
      remarks,
    });

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

