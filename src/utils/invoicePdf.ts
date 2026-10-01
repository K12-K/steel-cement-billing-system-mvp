import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '../types';

/**
 * Generates an authentic, crisp, vector A4 Tax Invoice PDF matching
 * the on-screen invoice format.
 *
 * Using native jsPDF + jspdf-autotable guarantees:
 * 1. 100% reliable rendering (NEVER blank or empty).
 * 2. Complete immunity to CSS color parsing issues like Tailwind v4 oklch.
 * 3. Razor-sharp vector text and lines on any mobile or desktop screen.
 * 4. Lightweight file size (~30KB) for instant sharing via WhatsApp or Email.
 */
export function generateInvoicePdfFromData(
  bill: Bill
): { pdf: jsPDF; file: File; blob: Blob; fileName: string } {
  const sanitizedBillNum = bill.bill_number.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Invoice_${sanitizedBillNum}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const settings = bill.settings;
  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const margin = 12; // 12mm margins
  const contentWidth = pageWidth - margin * 2; // 186mm

  let currentY = 12;

  // --- HEADER SECTION ---
  // Company Logo Badge (Amber rounded box with initial letter)
  const initialLetter = (settings?.company_name?.[0] || 'B').toUpperCase();
  pdf.setFillColor(217, 119, 6); // amber-600
  pdf.roundedRect(margin, currentY, 12, 12, 2.5, 2.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(initialLetter, margin + 4, currentY + 8.5);

  // Company Name
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  const companyName = settings?.company_name || 'Bhawani Steel & Cement Traders';
  pdf.text(companyName.toUpperCase(), margin + 15, currentY + 5);

  // Tagline
  pdf.setTextColor(100, 116, 139); // slate-500
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  const tagline = settings?.tagline || 'Dealers in TMT 550D Sariya, UltraTech/Ambuja Cement & Construction Materials';
  pdf.text(tagline, margin + 15, currentY + 9);

  // Address
  const addressParts = [settings?.address, settings?.city, settings?.state].filter(Boolean).join(', ');
  const addressStr = addressParts + (settings?.pincode ? ` - ${settings.pincode}` : '');
  pdf.text(addressStr, margin + 15, currentY + 12.5);

  // Phone, Email & GSTIN
  const contactParts: string[] = [];
  if (settings?.phone) contactParts.push(`Phone: ${settings.phone}`);
  if (settings?.email) contactParts.push(`Email: ${settings.email}`);
  pdf.text(contactParts.join('  |  '), margin + 15, currentY + 16);

  if (settings?.gstin) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(`GSTIN: ${settings.gstin}`, margin + 15, currentY + 19.5);
  }

  // Right Header: Tax Invoice Badge & Invoice Meta
  const rightX = pageWidth - margin;
  
  // Tax Invoice Badge
  pdf.setFillColor(217, 119, 6); // amber-600
  pdf.roundedRect(rightX - 52, currentY, 52, 6, 1.5, 1.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('TAX INVOICE / CASH MEMO', rightX - 26, currentY + 4.2, { align: 'center' });

  // Invoice Number
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Invoice #${bill.bill_number}`, rightX, currentY + 11.5, { align: 'right' });

  // Date
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Date: `, rightX - 22, currentY + 16);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${bill.bill_date}`, rightX, currentY + 16, { align: 'right' });

  // Status Badge
  const isPaid = bill.payment_status === 'Full Paid';
  const isPartial = bill.payment_status === 'Partial Paid';
  if (isPaid) {
    pdf.setFillColor(236, 253, 245); // emerald-50
    pdf.setDrawColor(110, 231, 183); // emerald-300
    pdf.setTextColor(6, 95, 70); // emerald-800
  } else if (isPartial) {
    pdf.setFillColor(254, 243, 199); // amber-50
    pdf.setDrawColor(252, 211, 77); // amber-300
    pdf.setTextColor(146, 64, 14); // amber-800
  } else {
    pdf.setFillColor(255, 241, 242); // rose-50
    pdf.setDrawColor(253, 164, 175); // rose-300
    pdf.setTextColor(159, 18, 57); // rose-800
  }
  pdf.roundedRect(rightX - 30, currentY + 17.5, 30, 5, 1, 1, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text(bill.payment_status.toUpperCase(), rightX - 15, currentY + 21, { align: 'center' });

  // Header Divider Line
  currentY += 25;
  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.6);
  pdf.line(margin, currentY, pageWidth - margin, currentY);

  // --- BILL TO & DISPATCH SECTION ---
  currentY += 4;
  
  // Left: Customer Details
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('BILLED TO (CUSTOMER):', margin, currentY);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(bill.customer_name, margin, currentY + 4.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Contact: ${bill.customer_phone}`, margin, currentY + 8.5);

  if (bill.customer_address) {
    pdf.text(`Site: ${bill.customer_address}`, margin, currentY + 12.5);
  }

  const custRegion = [bill.customer_taluko, bill.customer_district, bill.customer_state].filter(Boolean).join(', ');
  if (custRegion) {
    pdf.text(custRegion, margin, currentY + (bill.customer_address ? 16.5 : 12.5));
  }

  // Right: Dispatch & Payment Details
  const rightColX = pageWidth / 2 + 10;
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('DISPATCH & CREDIT TERMS:', rightColX, currentY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Payment Terms: `, rightColX, currentY + 4.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`${bill.payment_status}`, rightColX + 24, currentY + 4.5);

  let rightOffset = 8.5;
  if (bill.reminder_type && bill.reminder_type !== 'No Reminder') {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Reminder: `, rightColX, currentY + rightOffset);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(180, 83, 9);
    pdf.text(`${bill.reminder_type}${bill.reminder_date ? ` (Due: ${bill.reminder_date})` : ''}`, rightColX + 16, currentY + rightOffset);
    rightOffset += 4;
  }

  if (bill.notes) {
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Remark: ${bill.notes}`, rightColX, currentY + rightOffset);
  }

  currentY += 21;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, currentY, pageWidth - margin, currentY);

  // --- ITEMS TABLE (via autoTable) ---
  const tableRows = (bill.items || []).map((item, index) => [
    String(index + 1),
    item.product_name_snapshot,
    item.variant_name_snapshot,
    item.unit,
    item.quantity.toLocaleString('en-IN'),
    `Rs. ${item.rate.toLocaleString('en-IN')}`,
    `Rs. ${item.total.toLocaleString('en-IN')}`,
  ]);

  autoTable(pdf, {
    startY: currentY + 3,
    margin: { left: margin, right: margin },
    head: [[
      '#',
      'Material / Product Description',
      'Variant / Grade',
      'Unit',
      'Quantity',
      'Rate',
      'Total Amount'
    ]],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42], // slate-900
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2.8,
    },
    bodyStyles: {
      textColor: [30, 41, 59], // slate-800
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: [100, 116, 139] },
      1: { cellWidth: 56, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 18, halign: 'center', textColor: [71, 85, 105] },
      4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      // Draw subtle row underline
      if (data.section === 'body') {
        pdf.setDrawColor(241, 245, 249);
        pdf.setLineWidth(0.15);
        pdf.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    },
  });

  // Get Y position after table
  const finalY = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 4 : currentY + 40;

  // --- CALCULATION & BANK DETAILS SECTION ---
  let calcY = finalY;

  // Check if we have room on this page or need a new page
  if (calcY + 55 > pdf.internal.pageSize.getHeight() - margin) {
    pdf.addPage();
    calcY = margin + 5;
  }

  // Divider above totals & bank details
  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.5);
  pdf.line(margin, calcY, pageWidth - margin, calcY);
  calcY += 4;

  // Left Box: Bank Transfer Details
  const bankBoxWidth = 85;
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.setDrawColor(226, 232, 240); // slate-200
  pdf.roundedRect(margin, calcY, bankBoxWidth, 32, 2, 2, 'FD');

  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('BANK TRANSFER DETAILS:', margin + 4, calcY + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Bank Name: ', margin + 4, calcY + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(settings?.bank_name || 'Bank of Baroda', margin + 24, calcY + 10);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Account No: ', margin + 4, calcY + 15);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(settings?.account_number || '38190200001234', margin + 24, calcY + 15);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text('IFSC Code: ', margin + 4, calcY + 20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(settings?.ifsc_code || 'BARB0VADODAX', margin + 24, calcY + 20);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Branch: ', margin + 4, calcY + 25);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(settings?.branch || 'Main Market Branch', margin + 24, calcY + 25);

  // Right: Totals Breakdown
  const totalsX = pageWidth / 2 + 10;
  const totalsValX = pageWidth - margin;

  // Subtotal
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Subtotal Amount:', totalsX, calcY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Rs. ${bill.subtotal.toLocaleString('en-IN')}`, totalsValX, calcY + 4, { align: 'right' });

  // Total Bill Amount
  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.4);
  pdf.line(totalsX, calcY + 7, totalsValX, calcY + 7);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('TOTAL BILL AMOUNT:', totalsX, calcY + 13);
  pdf.setFontSize(11);
  pdf.text(`Rs. ${bill.total_amount.toLocaleString('en-IN')}`, totalsValX, calcY + 13, { align: 'right' });

  pdf.setLineWidth(0.2);
  pdf.line(totalsX, calcY + 15.5, totalsValX, calcY + 15.5);

  // Paid Amount
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(6, 95, 70);
  pdf.text('Total Paid Amount:', totalsX, calcY + 20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Rs. ${bill.paid_amount.toLocaleString('en-IN')}`, totalsValX, calcY + 20, { align: 'right' });

  // Pending Amount (Amber highlight box)
  pdf.setFillColor(254, 243, 199); // amber-100
  pdf.setDrawColor(252, 211, 77); // amber-300
  pdf.roundedRect(totalsX - 2, calcY + 23, totalsValX - totalsX + 4, 8, 1.5, 1.5, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(146, 64, 14); // amber-800
  pdf.text('BALANCE PENDING:', totalsX + 2, calcY + 28);
  pdf.setFontSize(9.5);
  pdf.text(`Rs. ${bill.pending_amount.toLocaleString('en-IN')}`, totalsValX, calcY + 28, { align: 'right' });

  // --- TERMS & CONDITIONS & SIGNATURE ---
  calcY += 38;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, calcY, pageWidth - margin, calcY);
  calcY += 4;

  // Terms & Conditions
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('TERMS & CONDITIONS:', margin, calcY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  const termsText = settings?.terms_conditions || 'Goods once sold will not be accepted back without inspection.';
  const splitTerms = pdf.splitTextToSize(termsText, 100);
  pdf.text(splitTerms, margin, calcY + 3.5);

  // Authorized Signatory
  const sigX = pageWidth - margin - 50;
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.line(sigX, calcY + 12, pageWidth - margin, calcY + 12);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Authorized Signatory', sigX + 25, calcY + 16, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`For ${companyName}`, sigX + 25, calcY + 19.5, { align: 'center' });

  // Output
  const blob = pdf.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  return { pdf, file, blob, fileName };
}

/**
 * Backward compatibility wrapper: Generates the PDF using the reliable
 * native vector generator from bill data.
 */
export async function generateInvoicePdf(
  _invoiceElement: HTMLElement | null,
  bill: Bill
): Promise<{ pdf: jsPDF; file: File; blob: Blob; fileName: string }> {
  return generateInvoicePdfFromData(bill);
}

/**
 * Shares or downloads the PDF invoice.
 * Attempts native file sharing first (e.g. WhatsApp, Email, Drive on mobile).
 * Gracefully falls back to direct browser download if file sharing is not supported.
 */
export async function shareOrDownloadPdf(
  invoiceElement: HTMLElement | null,
  bill: Bill,
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  try {
    const { pdf, file, fileName } = generateInvoicePdfFromData(bill);

    // Check if the current browser and OS support sharing files via Web Share API
    const canShareFiles =
      typeof navigator !== 'undefined' &&
      !!navigator.canShare &&
      !!navigator.share &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({
          title: `Tax Invoice ${bill.bill_number}`,
          text: `Tax Invoice #${bill.bill_number} for ${bill.customer_name} (Total: Rs. ${bill.total_amount.toLocaleString('en-IN')})`,
          files: [file],
        });
        if (onNotify) {
          onNotify(`Shared invoice PDF successfully!`, 'success');
        }
        return;
      } catch (shareErr: any) {
        // If user cancelled the native share dialog, do not trigger error or download
        if (shareErr.name === 'AbortError') {
          return;
        }
        // If sharing failed for another reason, proceed to direct download fallback
      }
    }

    // Direct download fallback (or for desktop browsers)
    pdf.save(fileName);
    if (onNotify) {
      onNotify(`Invoice PDF generated and downloaded (${fileName})!`, 'success');
    }
  } catch (error: any) {
    if (onNotify) {
      onNotify(error?.message || 'Failed to generate invoice PDF.', 'error');
    }
    throw error;
  }
}
