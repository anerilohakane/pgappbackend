import { jsPDF } from 'jspdf';
import { IPGProperty } from '@/models/PGProperty';
import { IResidentProfile } from '@/models/ResidentProfile';
import { IPaymentReceipt } from '@/models/PaymentReceipt';

export function generateReceiptPDF({
  receipt,
  property,
  resident,
}: {
  receipt: any;
  property: any;
  resident: any;
}): Buffer {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(30, 64, 175); // Deep Indigo
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(property?.name || 'PG ACCOMMODATION', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${property?.address || ''}, ${property?.city || ''} - ${property?.pincode || ''}`, 14, 26);
  doc.text(`Contact: ${property?.contactNumber || ''}`, 14, 31);

  // Receipt Title
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL RENT PAYMENT RECEIPT', 14, 48);

  doc.setDrawColor(220, 220, 220);
  doc.line(14, 52, 196, 52);

  // Receipt Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Receipt No:`, 14, 62);
  doc.setFont('helvetica', 'bold');
  doc.text(`${receipt.receiptNumber}`, 50, 62);

  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Date:`, 120, 62);
  doc.setFont('helvetica', 'bold');
  doc.text(`${new Date(receipt.paymentDate).toLocaleDateString('en-IN')}`, 160, 62);

  doc.setFont('helvetica', 'normal');
  doc.text(`Rent Billing Month:`, 14, 72);
  doc.setFont('helvetica', 'bold');
  doc.text(`${receipt.rentMonth}`, 50, 72);

  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Method:`, 120, 72);
  doc.setFont('helvetica', 'bold');
  doc.text(`${receipt.paymentMethod}`, 160, 72);

  if (receipt.transactionReference) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Txn Ref / UTR:`, 14, 82);
    doc.setFont('helvetica', 'bold');
    doc.text(`${receipt.transactionReference}`, 50, 82);
  }

  // Resident Details Box
  doc.setFillColor(245, 247, 250);
  doc.rect(14, 90, 182, 35, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Resident Details', 20, 98);

  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${resident?.fullName || 'Resident'}`, 20, 106);
  doc.text(`Phone: ${resident?.phone || 'N/A'}`, 20, 114);
  doc.text(`Room: ${resident?.roomId?.roomNumber || 'Room'}`, 110, 106);
  doc.text(`Bed: ${resident?.bedId?.bedNumber || 'Bed'}`, 110, 114);

  // Financial Table
  doc.setFillColor(238, 242, 255);
  doc.rect(14, 135, 182, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Particulars', 20, 142);
  doc.text('Amount (INR)', 160, 142);

  doc.setTextColor(33, 33, 33);
  doc.setFont('helvetica', 'normal');
  doc.text(`Monthly Rent payment for ${receipt.rentMonth}`, 20, 155);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${receipt.amount.toLocaleString('en-IN')}`, 160, 155);

  doc.setDrawColor(220, 220, 220);
  doc.line(14, 165, 196, 165);

  doc.setFont('helvetica', 'normal');
  doc.text(`Remaining Balance for this Month:`, 20, 175);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${receipt.remainingBalance.toLocaleString('en-IN')}`, 160, 175);

  // Signature
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signature & Seal:', 130, 215);
  doc.line(130, 235, 185, 235);
  doc.text(`${property?.contactPerson || 'Property Manager'}`, 130, 242);

  // Footer Note
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated receipt issued by PG Management Application.', 14, 275);

  return Buffer.from(doc.output('arraybuffer'));
}

