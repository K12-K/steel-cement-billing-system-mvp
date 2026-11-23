import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '../types';
import { numberToIndianRupeesWords } from './numberToWords';

/**
 * Strips characters outside Latin-1/ASCII for standard jsPDF Helvetica font
 * so non-Latin script never renders garbled bytes in exported PDFs.
 */
function toPdfSafeText(text: string | undefined | null, fallback = ''): string {
  if (!text) return fallback;
  const cleaned = text
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || fallback;
}

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generates a crisp A4 vector PDF matching the Cash Memo bill format:
 * - Navy blue firm banner
 * - CASH MEMO header (GSTIN shown ONLY if settings.show_gstin_on_bills is true)
 * - 3-row bordered Bill & Customer info grid
 * - Navy blue bordered items table (including Labor / Majuri items)
 * - Amount in Words + Totals Breakdown (Total Amount, Labor, Discount, Final Bill Amount)
 * - Terms / Note + Driver Signature & Authorized/Seller Signature boxes
 */
export function generateInvoicePdfFromData(
  bill: Bill
): { pdf: jsPDF; file: File; blob: Blob; fileName: string } {
  const sanitizedBillNum = bill.bill_number.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Bill_${sanitizedBillNum}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const settings = bill.settings;
  const showGstin = settings?.show_gstin_on_bills === true && Boolean(settings?.gstin?.trim());
  const showBank = settings?.show_bank_details_on_bills === true;

  const companyName = toPdfSafeText(settings?.company_name, 'Bhawani Steel & Cement Traders');
  const rawTitle = settings?.bill_header_title?.trim() || 'CASH MEMO';
  const headerTitle = toPdfSafeText(rawTitle, 'CASH MEMO').toUpperCase();

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  let currentY = 12;

  // --- 1. TOP NAVY BLUE BANNER ---
  const firmAddress = [settings?.address, settings?.city, settings?.state]
    .filter(Boolean)
    .join(', ');
  const firmAddressFull = firmAddress + (settings?.pincode ? ` - ${settings.pincode}` : '');
  const firmSubline = toPdfSafeText(
    [firmAddressFull, settings?.phone ? `Ph: ${settings.phone}` : ''].filter(Boolean).join('  |  ')
  );

  const bannerHeight = firmSubline ? 17 : 13;
  pdf.setFillColor(30, 58, 95); // #1e3a5f
  pdf.rect(margin, currentY, contentWidth, bannerHeight, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(companyName, pageWidth / 2, currentY + (firmSubline ? 8.2 : 8.5), { align: 'center' });

  if (firmSubline) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(226, 232, 240);
    pdf.text(firmSubline, pageWidth / 2, currentY + 13.5, { align: 'center' });
  }

  currentY += bannerHeight + 5;

  // --- 2. BILL SUBTITLE (CASH MEMO / TAX INVOICE) & OPTIONAL GSTIN ---
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(headerTitle, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  if (showGstin && settings?.gstin) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`GSTIN: ${toPdfSafeText(settings.gstin)}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;
  }

  currentY += 1.5;

  // --- 3. CUSTOMER & BILL DETAILS BORDERED GRID ---
  const col1W = contentWidth * 0.34;
  const col2W = contentWidth * 0.42;
  const col3W = contentWidth * 0.24;
  const rowH = 7.5;

  const fullCustomerAddress = toPdfSafeText(
    [bill.customer_address, bill.customer_taluko, bill.customer_district, bill.customer_state]
      .filter(Boolean)
      .join(', '),
    '-'
  );
  const addressLines = pdf.splitTextToSize(fullCustomerAddress, contentWidth - 26);
  const row3H = Math.max(7.5, addressLines.length * 4 + 3.5);

  const hasExtraInfo = Boolean(bill.reminder_date || bill.notes || bill.reminder_note);
  const extraParts: string[] = [];
  if (bill.reminder_date) {
    extraParts.push(
      `Reminder: ${bill.reminder_date}${bill.reminder_time ? ` at ${bill.reminder_time}` : ''}${
        bill.reminder_note ? ` (${toPdfSafeText(bill.reminder_note)})` : ''
      }`
    );
  }
  if (bill.notes) {
    extraParts.push(`Note: ${toPdfSafeText(bill.notes)}`);
  }
  const extraLineText = extraParts.join('  |  ');
  const row4H = hasExtraInfo ? 7 : 0;

  const infoBoxHeight = rowH * 2 + row3H + row4H;

  pdf.setDrawColor(148, 163, 184); // slate-400
  pdf.setLineWidth(0.3);
  pdf.rect(margin, currentY, contentWidth, infoBoxHeight, 'S');

  // Row 1 dividers
  pdf.line(margin, currentY + rowH, margin + contentWidth, currentY + rowH);
  pdf.line(margin + col1W, currentY, margin + col1W, currentY + rowH);
  pdf.line(margin + col1W + col2W, currentY, margin + col1W + col2W, currentY + rowH);

  // Row 1 Content
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bill No.:', margin + 2.5, currentY + 5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(toPdfSafeText(bill.bill_number), margin + 17, currentY + 5);

  pdf.setTextColor(51, 65, 85);
  pdf.text('Date:', margin + col1W + 2.5, currentY + 5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(bill.bill_date, margin + col1W + 13, currentY + 5);

  if (bill.customer_account_number) {
    pdf.setTextColor(180, 83, 9);
    pdf.setFontSize(8);
    pdf.text(`A/C #${toPdfSafeText(bill.customer_account_number)}`, margin + col1W + col2W - 3, currentY + 5, {
      align: 'right',
    });
  }

  pdf.setFontSize(8);
  pdf.setTextColor(
    bill.payment_status === 'Full Paid' ? 6 : bill.payment_status === 'Partial Paid' ? 180 : 159,
    bill.payment_status === 'Full Paid' ? 95 : bill.payment_status === 'Partial Paid' ? 83 : 18,
    bill.payment_status === 'Full Paid' ? 70 : bill.payment_status === 'Partial Paid' ? 9 : 57
  );
  pdf.text(bill.payment_status.toUpperCase(), margin + col1W + col2W + col3W / 2, currentY + 5, {
    align: 'center',
  });

  // Row 2 dividers & content (Customer Name | Mo./Phone)
  const row2Y = currentY + rowH;
  const nameSplitX = margin + contentWidth * 0.58;
  pdf.line(margin, row2Y + rowH, margin + contentWidth, row2Y + rowH);
  pdf.line(nameSplitX, row2Y, nameSplitX, row2Y + rowH);

  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer Name:', margin + 2.5, row2Y + 5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(toPdfSafeText(bill.customer_name), margin + 28, row2Y + 5);

  pdf.setTextColor(51, 65, 85);
  pdf.text('Mo./Phone:', nameSplitX + 2.5, row2Y + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.text(toPdfSafeText(bill.customer_phone, '-'), nameSplitX + 21, row2Y + 5);

  // Row 3 content (Address)
  const row3Y = row2Y + rowH;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);
  pdf.text('Address:', margin + 2.5, row3Y + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.text(addressLines, margin + 19, row3Y + 5);

  // Optional Row 4 (Reminder / Note)
  if (hasExtraInfo) {
    const row4Y = row3Y + row3H;
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, row4Y, contentWidth, row4H, 'F');
    pdf.line(margin, row4Y, margin + contentWidth, row4Y);
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(extraLineText, margin + 2.5, row4Y + 4.7);
  }

  currentY += infoBoxHeight + 5;

  // --- 4. ITEMS TABLE (Navy Blue Header, Bordered Grid) ---
  const materialRows = (bill.items || []).map((item, index) => [
    String(index + 1),
    toPdfSafeText(
      item.variant_name_snapshot
        ? `${item.product_name_snapshot} (${item.variant_name_snapshot})`
        : item.product_name_snapshot
    ),
    `${item.quantity.toLocaleString('en-IN')} ${toPdfSafeText(item.unit)}`,
    formatRs(item.rate),
    formatRs(item.total),
  ]);

  const laborRows: string[][] = [];
  if (bill.labor_items && bill.labor_items.length > 0) {
    bill.labor_items.forEach((l, lIdx) => {
      laborRows.push([
        String(materialRows.length + lIdx + 1),
        `${toPdfSafeText(l.description, 'Labor Charges')} [Majuri]`,
        l.quantity.toLocaleString('en-IN'),
        formatRs(l.rate),
        formatRs(l.amount),
      ]);
    });
  } else if (bill.labor_charges && bill.labor_charges > 0) {
    laborRows.push([
      String(materialRows.length + 1),
      'Labor Charges (Majuri)',
      '1',
      formatRs(bill.labor_charges),
      formatRs(bill.labor_charges),
    ]);
  }

  const tableRows = [...materialRows, ...laborRows];

  autoTable(pdf, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Sr.', 'Item Name / Description', 'Qty', 'Rate (Rs.)', 'Amount (Rs.)']],
    body: tableRows,
    theme: 'grid',
    styles: {
      lineColor: [148, 163, 184],
      lineWidth: 0.25,
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.6,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [30, 58, 95], // #1e3a5f
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 82, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
  });

  const afterTableY = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 5 : currentY + 45;
  let calcY = afterTableY;

  const hasLabor = (bill.labor_charges || 0) > 0;
  const totalSummaryRows = 3 + (hasLabor ? 1 : 0); // Total Amount, (Labor), Discount, Final Bill Amount
  const summaryRowH = 7;
  const summaryBoxH = totalSummaryRows * summaryRowH;
  const footerBoxH = 28;
  const neededBottomSpace = summaryBoxH + footerBoxH + (showBank ? 16 : 0) + 14;

  if (calcY + neededBottomSpace > pdf.internal.pageSize.getHeight() - margin) {
    pdf.addPage();
    calcY = margin + 4;
  }

  // --- 5. AMOUNT IN WORDS & TOTALS SUMMARY BOX ---
  const leftSummaryW = contentWidth * 0.5;
  const rightSummaryW = contentWidth * 0.5;
  const rightLabelW = rightSummaryW * 0.55;
  const rightStartX = margin + leftSummaryW;

  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.rect(margin, calcY, contentWidth, summaryBoxH, 'S');
  pdf.line(rightStartX, calcY, rightStartX, calcY + summaryBoxH);

  // Left: Amount in Words + Paid/Balance
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Amount in Words:', margin + 3, calcY + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  const words = numberToIndianRupeesWords(bill.total_amount);
  const wordsLines = pdf.splitTextToSize(words, leftSummaryW - 6);
  pdf.text(wordsLines, margin + 3, calcY + 9.5);

  if (bill.paid_amount > 0 || bill.pending_amount > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(6, 95, 70);
    pdf.text(`Paid: ${formatRs(bill.paid_amount)}`, margin + 3, calcY + summaryBoxH - 2.5);
    pdf.setTextColor(bill.pending_amount > 0 ? 180 : 100, bill.pending_amount > 0 ? 83 : 116, bill.pending_amount > 0 ? 9 : 139);
    pdf.text(`Balance: ${formatRs(bill.pending_amount)}`, rightStartX - 3, calcY + summaryBoxH - 2.5, {
      align: 'right',
    });
  }

  // Right: Stacked Total Rows
  let rowIdx = 0;
  const drawSummaryRow = (
    label: string,
    valText: string,
    opts?: { fill?: [number, number, number]; labelColor?: [number, number, number]; valColor?: [number, number, number]; bold?: boolean }
  ) => {
    const ry = calcY + rowIdx * summaryRowH;
    if (opts?.fill) {
      pdf.setFillColor(opts.fill[0], opts.fill[1], opts.fill[2]);
      pdf.rect(rightStartX, ry, rightSummaryW, summaryRowH, 'F');
    }
    if (rowIdx > 0) {
      pdf.setDrawColor(148, 163, 184);
      pdf.line(rightStartX, ry, margin + contentWidth, ry);
    }
    pdf.setDrawColor(148, 163, 184);
    pdf.line(rightStartX + rightLabelW, ry, rightStartX + rightLabelW, ry + summaryRowH);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    const lc = opts?.labelColor || [30, 41, 59];
    pdf.setTextColor(lc[0], lc[1], lc[2]);
    pdf.text(label, rightStartX + 3, ry + 4.8);

    const vc = opts?.valColor || [15, 23, 42];
    pdf.setTextColor(vc[0], vc[1], vc[2]);
    pdf.text(valText, margin + contentWidth - 3, ry + 4.8, { align: 'right' });
    rowIdx++;
  };

  drawSummaryRow('Total Amount', formatRs(bill.subtotal));

  if (hasLabor) {
    drawSummaryRow('+ Labor (Majuri)', `+${formatRs(bill.labor_charges || 0)}`, {
      labelColor: [180, 83, 9],
      valColor: [180, 83, 9],
    });
  }

  const discAmt = bill.discount_amount || 0;
  drawSummaryRow('Discount', discAmt > 0 ? `-${formatRs(discAmt)}` : formatRs(0), {
    valColor: discAmt > 0 ? [6, 95, 70] : [15, 23, 42],
  });

  drawSummaryRow('Final Bill Amount', formatRs(bill.total_amount), {
    fill: [224, 238, 251], // #e0eefb
    labelColor: [15, 23, 42],
    valColor: [15, 23, 42],
    bold: true,
  });

  // Re-stroke outer border of summary box cleanly
  pdf.setDrawColor(148, 163, 184);
  pdf.rect(margin, calcY, contentWidth, summaryBoxH, 'S');

  calcY += summaryBoxH + 5;

  // --- OPTIONAL BANK DETAILS (only if enabled in Settings) ---
  if (showBank) {
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(148, 163, 184);
    pdf.rect(margin, calcY, contentWidth, 10, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(30, 41, 59);
    const bankLine = `Bank: ${toPdfSafeText(settings?.bank_name, '-')}   |   A/C: ${toPdfSafeText(settings?.account_number, '-')}   |   IFSC: ${toPdfSafeText(settings?.ifsc_code, '-')}   |   Branch: ${toPdfSafeText(settings?.branch, '-')}`;
    pdf.text(bankLine, margin + 3, calcY + 6.2);
    calcY += 14;
  }

  // --- 6. TERMS / NOTE & DUAL SIGNATURE BOXES ---
  const termsText = toPdfSafeText(
    settings?.terms_conditions,
    'Goods once checked and taken away. Shop return terms apply.'
  );
  const termsLines = pdf.splitTextToSize(termsText, leftSummaryW - 6);
  const dynamicFooterH = Math.max(footerBoxH, termsLines.length * 3.5 + 10);

  pdf.setDrawColor(148, 163, 184);
  pdf.rect(margin, calcY, contentWidth, dynamicFooterH, 'S');
  pdf.line(rightStartX, calcY, rightStartX, calcY + dynamicFooterH);
  pdf.line(rightStartX, calcY + dynamicFooterH / 2, margin + contentWidth, calcY + dynamicFooterH / 2);

  // Left: Terms / Note
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Terms / Note:', margin + 3, calcY + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(71, 85, 105);
  pdf.text(termsLines, margin + 3, calcY + 9.5);

  // Right Top: Driver Signature
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Driver Signature', rightStartX + rightSummaryW / 2, calcY + 5, { align: 'center' });

  // Right Bottom: Authorized / Seller Signature
  pdf.text(
    'Authorized / Seller Signature',
    rightStartX + rightSummaryW / 2,
    calcY + dynamicFooterH / 2 + 5,
    { align: 'center' }
  );
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`For ${companyName}`, rightStartX + rightSummaryW / 2, calcY + dynamicFooterH - 2.5, {
    align: 'center',
  });

  // --- 7. BOTTOM CENTERED COMPANY NAME ---
  calcY += dynamicFooterH + 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  pdf.text(companyName, pageWidth / 2, calcY, { align: 'center' });

  const blob = pdf.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  return { pdf, file, blob, fileName };
}

export async function generateInvoicePdf(
  _invoiceElement: HTMLElement | null,
  bill: Bill
): Promise<{ pdf: jsPDF; file: File; blob: Blob; fileName: string }> {
  return generateInvoicePdfFromData(bill);
}

export async function shareOrDownloadPdf(
  _invoiceElement: HTMLElement | null,
  bill: Bill,
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  try {
    const { pdf, file, fileName } = generateInvoicePdfFromData(bill);
    const docTitle = toPdfSafeText(bill.settings?.bill_header_title, 'Cash Memo');

    const canShareFiles =
      typeof navigator !== 'undefined' &&
      !!navigator.canShare &&
      !!navigator.share &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({
          title: `${docTitle} ${bill.bill_number}`,
          text: `${docTitle} #${bill.bill_number} for ${bill.customer_name} (Total: Rs. ${bill.total_amount.toLocaleString('en-IN')})`,
          files: [file],
        });
        if (onNotify) {
          onNotify(`Shared bill PDF successfully!`, 'success');
        }
        return;
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return;
        }
      }
    }

    pdf.save(fileName);
    if (onNotify) {
      onNotify(`Bill PDF generated and downloaded (${fileName})!`, 'success');
    }
  } catch (error: any) {
    if (onNotify) {
      onNotify(error?.message || 'Failed to generate bill PDF.', 'error');
    }
    throw error;
  }
}
