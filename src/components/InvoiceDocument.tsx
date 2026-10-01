import React, { forwardRef } from 'react';
import { Bill } from '../types';

interface InvoiceDocumentProps {
  bill: Bill;
  id?: string;
  className?: string;
}

export const InvoiceDocument = forwardRef<HTMLDivElement, InvoiceDocumentProps>(
  ({ bill, id = 'printable-invoice', className = '' }, ref) => {
    const settings = bill.settings;

    return (
      <div
        ref={ref}
        id={id}
        className={`bg-white text-slate-900 p-4 sm:p-8 md:p-12 rounded-2xl shadow-2xl border border-slate-200 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-full print:rounded-none print:text-black ${className}`}
      >
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 pb-6 border-b-2 border-slate-800">
          <div className="space-y-1 w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-xs">
                {(settings?.company_name?.[0] || 'B').toUpperCase()}
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 break-words">
                {settings?.company_name || 'Bhawani Steel & Cement Traders'}
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {settings?.tagline || 'Dealers in TMT 550D Sariya, UltraTech/Ambuja Cement & Construction Materials'}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {[settings?.address, settings?.city, settings?.state].filter(Boolean).join(', ')}
              {settings?.pincode ? ` - ${settings.pincode}` : ''}
            </p>
            <p className="text-xs text-slate-700">
              {settings?.phone && (
                <>Phone: <span className="font-semibold">{settings.phone}</span> </>
              )}
              {settings?.email && (
                <>• Email: <span>{settings.email}</span></>
              )}
            </p>
            {settings?.gstin && (
              <p className="text-xs font-bold text-slate-900">
                GSTIN: <span className="font-mono tracking-wider">{settings.gstin}</span>
              </p>
            )}
          </div>

          <div className="sm:text-right shrink-0 w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 bg-amber-600 text-white text-[11px] font-black uppercase tracking-widest rounded-md mb-2 shadow-xs">
                Tax Invoice / Cash Memo
              </span>
              <div className="text-sm font-black text-slate-900 font-mono tracking-tight">
                Invoice #{bill.bill_number}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Date: <span className="font-bold text-slate-900">{bill.bill_date}</span>
              </div>
            </div>

            <div className="mt-0 sm:mt-2 text-right">
              <span
                className={`inline-block font-bold uppercase px-2.5 py-0.5 rounded text-[11px] border ${
                  bill.payment_status === 'Full Paid'
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
        </div>

        {/* Bill To & Dispatch Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-5 sm:py-6 border-b border-slate-200">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Billed To (Customer):
            </span>
            <h2 className="text-base font-black text-slate-950 break-words">{bill.customer_name}</h2>
            <p className="text-xs text-slate-700 font-medium">
              Contact: <span className="font-semibold">{bill.customer_phone}</span>
            </p>
            {bill.customer_address && (
              <p className="text-xs text-slate-600 leading-relaxed break-words">
                Site / Address: {bill.customer_address}
              </p>
            )}
            <p className="text-xs text-slate-600">
              {[bill.customer_taluko, bill.customer_district, bill.customer_state].filter(Boolean).join(', ')}
            </p>
          </div>

          <div className="sm:text-right space-y-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Dispatch &amp; Credit Terms:
            </span>
            <div className="text-xs text-slate-700">
              Payment Terms: <span className="font-bold text-slate-900">{bill.payment_status}</span>
            </div>
            {bill.reminder_type && bill.reminder_type !== 'No Reminder' && (
              <div className="text-xs text-slate-700">
                Payment Reminder: <span className="font-bold text-amber-700">{bill.reminder_type}</span>{' '}
                {bill.reminder_date && `(Due: ${bill.reminder_date})`}
              </div>
            )}
            {bill.notes && (
              <div className="text-xs text-slate-600 italic break-words">
                Remark: {bill.notes}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Swipe Hint (hidden in print and excluded from PDF export) */}
        <div
          data-pdf-ignore="true"
          className="sm:hidden flex items-center justify-between text-[11px] text-slate-500 pt-3 pb-1 font-medium select-none print:hidden"
        >
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Swipe table to view all columns
          </span>
          <span className="text-amber-800 font-semibold text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Scroll ↔
          </span>
        </div>

        {/* Product Items Table with Smooth Horizontal Scrolling on Mobile */}
        <div className="py-3 sm:py-6 overflow-x-auto print:overflow-visible -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-[580px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-[11px] font-black text-slate-900 uppercase tracking-wider">
                  <th className="py-2.5 sm:py-3 px-3 w-10 text-center whitespace-nowrap">#</th>
                  <th className="py-2.5 sm:py-3 px-3 min-w-[160px]">Material / Product Description</th>
                  <th className="py-2.5 sm:py-3 px-3 whitespace-nowrap">Variant / Grade</th>
                  <th className="py-2.5 sm:py-3 px-3 whitespace-nowrap text-center">Unit</th>
                  <th className="py-2.5 sm:py-3 px-3 text-right whitespace-nowrap">Quantity</th>
                  <th className="py-2.5 sm:py-3 px-3 text-right whitespace-nowrap">Rate (₹)</th>
                  <th className="py-2.5 sm:py-3 px-3 text-right whitespace-nowrap">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(bill.items || []).map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 sm:py-3 px-3 text-center text-slate-500 font-bold whitespace-nowrap">
                      {index + 1}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 font-bold text-slate-900">
                      {item.product_name_snapshot}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 text-slate-700 whitespace-nowrap">
                      {item.variant_name_snapshot}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 text-slate-600 font-medium whitespace-nowrap text-center">
                      {item.unit}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                      {item.quantity.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 text-right text-slate-700 whitespace-nowrap">
                      ₹{item.rate.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 text-right font-black text-slate-950 whitespace-nowrap">
                      ₹{item.total.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation & Bank Details Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t-2 border-slate-900">
          {/* Bank & Payment Details */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-800 block text-[11px]">
              Bank Transfer Details:
            </span>
            <div className="text-slate-700">
              Bank Name: <span className="font-bold text-slate-900">{settings?.bank_name || 'Bank of Baroda'}</span>
            </div>
            <div className="text-slate-700">
              Account No: <span className="font-mono font-bold text-slate-900">{settings?.account_number || '38190200001234'}</span>
            </div>
            <div className="text-slate-700">
              IFSC Code: <span className="font-mono font-bold text-slate-900">{settings?.ifsc_code || 'BARB0VADODAX'}</span>
            </div>
            <div className="text-slate-700">
              Branch: <span className="font-semibold text-slate-900">{settings?.branch || 'Main Market Branch'}</span>
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-600 font-medium">Subtotal Amount:</span>
              <span className="font-bold text-slate-900">₹{bill.subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm">
              <span className="font-black text-slate-900 uppercase">Total Bill Amount:</span>
              <span className="font-black text-slate-950 text-base">
                ₹{bill.total_amount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between py-1 text-emerald-800">
              <span className="font-bold">Total Paid Amount:</span>
              <span className="font-black">₹{bill.paid_amount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between py-1.5 bg-amber-50 p-2 rounded-lg text-amber-900 border border-amber-200/60">
              <span className="font-black uppercase tracking-wider">Balance Pending:</span>
              <span className="font-black text-base">₹{bill.pending_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions and Authorized Signature */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 sm:pt-8 mt-6 border-t border-slate-200">
          <div className="text-[10px] text-slate-500 leading-relaxed space-y-1">
            <span className="font-bold uppercase text-slate-700 block">Terms &amp; Conditions:</span>
            <pre className="font-sans whitespace-pre-line text-slate-600">
              {settings?.terms_conditions || 'Goods once sold will not be accepted back without inspection.'}
            </pre>
          </div>

          <div className="sm:text-right flex flex-col justify-end items-start sm:items-end pt-4 sm:pt-0">
            <div className="w-full sm:w-48 border-t border-slate-400 pt-2 text-center">
              <p className="text-xs font-bold text-slate-900">Authorized Signatory</p>
              <p className="text-[10px] text-slate-500">For {settings?.company_name || 'Bhawani Steel & Cement Traders'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InvoiceDocument.displayName = 'InvoiceDocument';
