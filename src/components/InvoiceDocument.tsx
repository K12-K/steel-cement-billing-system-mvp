import React, { forwardRef } from 'react';
import { Bill } from '../types';
import { numberToIndianRupeesWords } from '../utils/numberToWords';

interface InvoiceDocumentProps {
  bill: Bill;
  id?: string;
  className?: string;
}

export const InvoiceDocument = forwardRef<HTMLDivElement, InvoiceDocumentProps>(
  ({ bill, id = 'printable-invoice', className = '' }, ref) => {
    const settings = bill.settings;
    const showGstin = settings?.show_gstin_on_bills === true && Boolean(settings?.gstin?.trim());
    const showBank = settings?.show_bank_details_on_bills === true;
    const headerTitle = settings?.bill_header_title?.trim() || 'CASH MEMO';
    const companyName = settings?.company_name || 'Bhawani Steel & Cement Traders';

    const fullAddress = [
      bill.customer_address,
      bill.customer_taluko,
      bill.customer_district,
      bill.customer_state,
    ]
      .filter(Boolean)
      .join(', ');

    const firmAddress = [settings?.address, settings?.city, settings?.state]
      .filter(Boolean)
      .join(', ');

    const formatMoney = (val: number) =>
      `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const materialItems = bill.items || [];
    const laborRows =
      bill.labor_items && bill.labor_items.length > 0
        ? bill.labor_items
        : bill.labor_charges && bill.labor_charges > 0
          ? [
            {
              id: 'labor_summary',
              description: 'Labor Charges (Majuri)',
              quantity: 1,
              rate: bill.labor_charges,
              amount: bill.labor_charges,
            },
          ]
          : [];

    const amountInWords = numberToIndianRupeesWords(bill.total_amount);

    return (
      <div
        ref={ref}
        id={id}
        className={`bg-white text-slate-900 p-4 sm:p-7 md:p-10 rounded-2xl shadow-2xl border border-slate-200 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-full print:rounded-none print:text-black ${className}`}
      >
        {/* Top Navy Blue Banner (Matching Cash Memo PDF Format) */}
        <div className="bg-[#1e3a5f] text-white text-center py-3 px-4 rounded-sm">
          <h1 className="text-xl sm:text-2xl font-black tracking-wide break-words">
            {companyName}
          </h1>
          {(firmAddress || settings?.phone) && (
            <p className="text-[11px] text-slate-200 mt-0.5 leading-snug">
              {[firmAddress + (settings?.pincode ? ` - ${settings.pincode}` : ''), settings?.phone ? `Ph: ${settings.phone}` : '']
                .filter(Boolean)
                .join('  •  ')}
            </p>
          )}
        </div>

        {/* Subtitle: CASH MEMO (and optional GSTIN ONLY if explicitly enabled in Profile Settings) */}
        <div className="text-center py-2.5">
          <div className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
            {headerTitle}
          </div>
          {showGstin && (
            <div className="text-xs font-bold text-slate-700 mt-0.5">
              GSTIN: <span className="font-mono tracking-wider">{settings?.gstin}</span>
            </div>
          )}
        </div>

        {/* Customer & Bill Info Grid (Bordered 3-Row Format) */}
        <div className="border border-slate-400 text-xs mb-4">
          {/* Row 1: Bill No, Date, A/C No & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-slate-400">
            <div className="sm:col-span-4 px-3 py-2 border-b sm:border-b-0 sm:border-r border-slate-400 flex items-center gap-2">
              <span className="font-bold text-slate-700 shrink-0">Bill No.:</span>
              <span className="font-mono font-black text-slate-950">{bill.bill_number}</span>
            </div>
            <div className="sm:col-span-4 px-3 py-2 border-b sm:border-b-0 sm:border-r border-slate-400 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-700 mr-1.5">Date:</span>
                <span className="font-bold text-slate-950">{bill.bill_date}</span>
              </div>
              {bill.customer_account_number && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] font-bold">
                  A/C #{bill.customer_account_number}
                </span>
              )}
            </div>
            <div className="sm:col-span-4 px-3 py-2 flex items-center justify-between sm:justify-end gap-2">
              <span className="text-[11px] font-semibold text-slate-600 sm:hidden">Status:</span>
              <span
                className={`inline-block font-bold uppercase px-2 py-0.5 rounded text-[10px] border ${bill.payment_status === 'Full Paid'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : bill.payment_status === 'Partial Paid'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
              >
                {bill.payment_status}
              </span>
            </div>
          </div>

          {/* Row 2: Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-slate-400">
            <div className="sm:col-span-7 px-3 py-2 border-b sm:border-b-0 sm:border-r border-slate-400 flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 shrink-0">Customer Name:</span>
              <span className="font-black text-slate-950 break-words">{bill.customer_name}</span>
            </div>
            <div className="sm:col-span-5 px-3 py-2 flex items-center gap-2">
              <span className="font-bold text-slate-700 shrink-0">Mo./Phone:</span>
              <span className="font-semibold text-slate-900">{bill.customer_phone || '-'}</span>
            </div>
          </div>

          {/* Row 3: Address */}
          <div className="px-3 py-2 flex items-start gap-2">
            <span className="font-bold text-slate-700 shrink-0">Address:</span>
            <span className="text-slate-800 break-words">{fullAddress || '-'}</span>
          </div>

          {/* Optional Reminder / Remark Row (when present) */}
          {(bill.reminder_date || bill.notes || bill.reminder_note) && (
            <div className="px-3 py-1.5 border-t border-slate-300 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              {bill.reminder_date && (
                <div className="text-amber-800 font-semibold">
                  Reminder: {bill.reminder_date}
                  {bill.reminder_time ? ` at ${bill.reminder_time}` : ''}
                  {bill.reminder_note ? ` (${bill.reminder_note})` : ''}
                </div>
              )}
              {bill.notes && <div className="text-slate-600 italic">Note: {bill.notes}</div>}
            </div>
          )}
        </div>

        {/* Mobile Swipe Hint (hidden in print and excluded from PDF export) */}
        <div
          data-pdf-ignore="true"
          className="sm:hidden flex items-center justify-between text-[11px] text-slate-500 pb-1.5 font-medium select-none print:hidden"
        >
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f] animate-pulse" />
            Swipe table to view all columns
          </span>
          <span className="text-[#1e3a5f] font-semibold text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
            Scroll ↔
          </span>
        </div>

        {/* Items Table (Navy Blue Header, Bordered Grid) */}
        <div className="overflow-x-auto print:overflow-visible -mx-4 sm:mx-0 px-4 sm:px-0 mb-4">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-[540px] w-full text-left text-xs border-collapse border border-slate-400">
              <thead>
                <tr className="bg-[#1e3a5f] text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-2.5 w-12 text-center border-r border-slate-300/40 whitespace-nowrap">
                    Sr.
                  </th>
                  <th className="py-2.5 px-3 min-w-[180px] border-r border-slate-300/40">
                    Item Name / Description
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-300/40 whitespace-nowrap">
                    Qty
                  </th>
                  <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300/40 whitespace-nowrap">
                    Rate (₹)
                  </th>
                  <th className="py-2.5 px-3 w-32 text-right whitespace-nowrap">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {materialItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-300 ${index % 2 === 1 ? 'bg-slate-50/90' : 'bg-white'}`}
                  >
                    <td className="py-2 px-2.5 text-center text-slate-700 font-semibold border-r border-slate-300">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300">
                      <span className="font-bold text-slate-900">{item.product_name_snapshot}</span>
                      {item.variant_name_snapshot && (
                        <span className="text-slate-600 text-[11px] ml-1.5">
                          ({item.variant_name_snapshot})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">
                      {item.quantity.toLocaleString('en-IN')} {item.unit}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-800 border-r border-slate-300 whitespace-nowrap">
                      {formatMoney(item.rate)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-950 whitespace-nowrap">
                      {formatMoney(item.total)}
                    </td>
                  </tr>
                ))}

                {laborRows.map((labor, lIdx) => {
                  const rowIndex = materialItems.length + lIdx;
                  return (
                    <tr
                      key={labor.id || `labor_${lIdx}`}
                      className={`border-b border-slate-300 ${rowIndex % 2 === 1 ? 'bg-amber-50/40' : 'bg-amber-50/20'}`}
                    >
                      <td className="py-2 px-2.5 text-center text-amber-800 font-semibold border-r border-slate-300">
                        {rowIndex + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300">
                        <span className="font-bold text-slate-900">{labor.description}</span>
                        <span className="ml-1.5 text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                          Majuri / Labor
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">
                        {labor.quantity.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800 border-r border-slate-300 whitespace-nowrap">
                        {formatMoney(labor.rate)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-950 whitespace-nowrap">
                        {formatMoney(labor.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section: Amount in Words (Left) & Totals Breakdown (Right) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 border border-slate-400 text-xs mb-4">
          {/* Amount in Words + Paid / Pending Snapshot */}
          <div className="sm:col-span-6 p-3 border-b sm:border-b-0 sm:border-r border-slate-400 flex flex-col justify-between gap-3">
            <div>
              <span className="font-bold text-slate-800 block mb-1">Amount in Words:</span>
              <p className="text-slate-900 font-semibold leading-relaxed">{amountInWords}</p>
            </div>

            {(bill.paid_amount > 0 || bill.pending_amount > 0) && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                <span className="text-emerald-800 font-bold">
                  Paid: {formatMoney(bill.paid_amount)}
                </span>
                <span
                  className={`font-bold ${bill.pending_amount > 0 ? 'text-amber-800' : 'text-slate-500'
                    }`}
                >
                  Balance Pending: {formatMoney(bill.pending_amount)}
                </span>
              </div>
            )}
          </div>

          {/* Totals Column */}
          <div className="sm:col-span-6">
            <div className="grid grid-cols-2 border-b border-slate-300">
              <div className="px-3 py-2 font-bold text-slate-800 border-r border-slate-300">
                Total Amount
              </div>
              <div className="px-3 py-2 text-right font-bold text-slate-900">
                {formatMoney(bill.subtotal)}
              </div>
            </div>

            {(bill.labor_charges || 0) > 0 && (
              <div className="grid grid-cols-2 border-b border-slate-300 bg-amber-50/40">
                <div className="px-3 py-2 font-bold text-amber-900 border-r border-slate-300">
                  + Labor Charges (Majuri)
                </div>
                <div className="px-3 py-2 text-right font-bold text-amber-900">
                  +{formatMoney(bill.labor_charges || 0)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 border-b border-slate-300">
              <div className="px-3 py-2 font-bold text-slate-800 border-r border-slate-300">
                Discount
              </div>
              <div className="px-3 py-2 text-right font-bold text-emerald-700">
                {(bill.discount_amount || 0) > 0
                  ? `-${formatMoney(bill.discount_amount || 0)}`
                  : formatMoney(0)}
              </div>
            </div>

            <div className="grid grid-cols-2 bg-[#e0eefb]">
              <div className="px-3 py-2.5 font-black text-slate-950 border-r border-slate-300">
                Final Bill Amount
              </div>
              <div className="px-3 py-2.5 text-right font-black text-slate-950 text-sm">
                {formatMoney(bill.total_amount)}
              </div>
            </div>
          </div>
        </div>

        {/* Optional Bank Details (only shown if enabled in Profile Settings) */}
        {showBank && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-300 text-[11px] flex flex-wrap gap-x-6 gap-y-1">
            <span className="font-bold text-slate-800 uppercase">Bank Details:</span>
            <span>
              Bank: <strong className="text-slate-900">{settings?.bank_name || '-'}</strong>
            </span>
            <span>
              A/C No: <strong className="font-mono text-slate-900">{settings?.account_number || '-'}</strong>
            </span>
            <span>
              IFSC: <strong className="font-mono text-slate-900">{settings?.ifsc_code || '-'}</strong>
            </span>
            <span>
              Branch: <strong className="text-slate-900">{settings?.branch || '-'}</strong>
            </span>
          </div>
        )}

        {/* Footer Grid: Terms / Note (Left) + Driver Signature & Seller Signature (Right) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 border border-slate-400 text-xs">
          <div className="sm:col-span-6 p-3 border-b sm:border-b-0 sm:border-r border-slate-400 space-y-1">
            <span className="font-bold text-slate-800 block">Terms / Note:</span>
            <pre className="font-sans whitespace-pre-line text-[11px] text-slate-700 leading-relaxed">
              {settings?.terms_conditions ||
                'Goods once checked and taken away. Shop return terms apply.'}
            </pre>
          </div>

          <div className="sm:col-span-6 flex flex-col">
            <div className="flex-1 min-h-[54px] px-3 py-2 border-b border-slate-400 flex flex-col justify-between items-center text-center">
              <span className="font-bold text-slate-800 text-[11px]">Driver Signature</span>
              <span className="text-[10px] text-slate-400">&nbsp;</span>
            </div>
            <div className="flex-1 min-h-[54px] px-3 py-2 flex flex-col justify-between items-center text-center">
              <span className="font-bold text-slate-800 text-[11px]">
                Authorized / Seller Signature
              </span>
              <span className="text-[10px] text-slate-500">For {companyName}</span>
            </div>
          </div>
        </div>

        {/* Bottom Centered Company Name Footer */}
        <div className="text-center pt-4 text-[11px] font-semibold text-slate-600">
          {companyName}
        </div>
      </div>
    );
  }
);

InvoiceDocument.displayName = 'InvoiceDocument';
