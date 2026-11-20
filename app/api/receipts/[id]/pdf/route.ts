import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { PaymentReceipt } from '@/models/PaymentReceipt';
import { PGProperty } from '@/models/PGProperty';
import { ResidentProfile } from '@/models/ResidentProfile';
import { generateReceiptPDF } from '@/lib/pdf';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const receipt = await PaymentReceipt.findById(params.id);
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    if (auth.user.role === 'resident' && auth.user.residentId !== receipt.residentId.toString()) {
      return NextResponse.json({ error: 'Access denied: cannot access another resident receipt' }, { status: 403 });
    }

    const property = await PGProperty.findById(receipt.propertyId);
    const resident = await ResidentProfile.findById(receipt.residentId).populate('roomId').populate('bedId');

    const pdfBuffer = generateReceiptPDF({ receipt, property, resident });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Receipt_${receipt.receiptNumber}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
