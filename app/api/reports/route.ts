import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDashboardStats, getRentReport, getCollectionReport } from '@/services/reportService';
import { generateExcelBuffer } from '@/lib/excel';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'dashboard';
    const propertyId = url.searchParams.get('propertyId') || undefined;
    const month = url.searchParams.get('month') || undefined;
    const format = url.searchParams.get('format') || 'json';

    if (type === 'dashboard') {
      const stats = await getAdminDashboardStats(propertyId, month);
      return NextResponse.json({ success: true, ...stats });
    }

    if (type === 'rent') {
      const records = await getRentReport({ propertyId, month });
      if (format === 'excel') {
        const rows = records.map((r: any) => ({
          'Resident Name': r.residentId?.fullName,
          'Phone': r.residentId?.phone,
          'Property': r.propertyId?.name,
          'Room': r.roomId?.roomNumber,
          'Month': r.rentMonth,
          'Rent Amount': r.rentAmount,
          'Previous Outstanding': r.previousOutstanding,
          'Total Payable': r.totalPayable,
          'Amount Paid': r.amountPaid,
          'Outstanding Balance': r.outstandingAmount,
          'Status': r.status,
          'Due Date': new Date(r.dueDate).toLocaleDateString('en-IN'),
        }));
        const buffer = generateExcelBuffer([{ sheetName: 'Rent Report', rows }]);
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Rent_Report_${month || 'All'}.xlsx"`,
          },
        });
      }
      return NextResponse.json({ success: true, report: records });
    }

    if (type === 'collection') {
      const records = await getCollectionReport({ propertyId });
      if (format === 'excel') {
        const rows = records.map((r: any) => ({
          'Receipt No': r.receiptNumber,
          'Resident': r.residentId?.fullName,
          'Month': r.rentMonth,
          'Amount': r.amount,
          'Payment Method': r.paymentMethod,
          'Payment Date': new Date(r.paymentDate).toLocaleDateString('en-IN'),
          'Txn Reference': r.transactionReference,
          'Remaining Balance': r.remainingBalance,
        }));
        const buffer = generateExcelBuffer([{ sheetName: 'Collection Report', rows }]);
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="Collection_Report.xlsx"',
          },
        });
      }
      return NextResponse.json({ success: true, report: records });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
