import React from 'react';
import {
  X,
  CheckCircle2,
  ArrowLeft,
  Receipt,
  Clock,
  Layers,
  Hammer
} from 'lucide-react';
import { LaborChargeItem } from '../types';

interface BillItemInput {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  unit: string;
  quantity: number;
  rate: number;
  total: number;
}

interface BillConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  billData: {
    bill_number: string;
    bill_date: string;
    customer_account_number?: string;
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    customer_taluko?: string;
    customer_district?: string;
    customer_state?: string;
    items: BillItemInput[];
    labor_items?: LaborChargeItem[];
    labor_charges?: number;
    discount_amount?: number;
    subtotal: number;
    total_amount: number;
    payment_status: 'Pending' | 'Partial Paid' | 'Full Paid';
    paid_amount: number;
    pending_amount: number;
    payment_mode: string;
    reminder_type: string;
    reminder_date?: string | null;
    reminder_time?: string | null;
    reminder_note?: string;
    notes?: string;
  };
}

export const BillConfirmationModal: React.FC<BillConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  billData,
}) => {
  if (!isOpen) return null;

  const laborTotal = billData.labor_charges || 0;
  const discount = billData.discount_amount || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative my-6 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Review &amp; Confirm Bill</h2>
              <p className="text-xs text-slate-400">
                Verify party account, dispatch items, labor charges, discount, and payment amounts before committing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Bill Meta & Customer Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Bill Information
              </span>
              <div className="font-bold text-white text-sm">
                Bill No: <span className="text-amber-400">{billData.bill_number}</span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Date: {billData.bill_date}
              </div>
              {billData.reminder_date && (
                <div className="text-xs text-amber-300 mt-1 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Reminder: {billData.reminder_date}
                    {billData.reminder_time ? ` at ${billData.reminder_time}` : ''}
                  </span>
                </div>
              )}
              {billData.reminder_note && (
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Note: {billData.reminder_note}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Party &amp; Account Details
              </span>
              <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                {billData.customer_account_number && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px]">
                    A/C #{billData.customer_account_number}
                  </span>
                )}
                <span>{billData.customer_name}</span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Phone: {billData.customer_phone || '-'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                {[billData.customer_address, billData.customer_taluko, billData.customer_district, billData.customer_state]
                  .filter(Boolean)
                  .join(', ')}
              </div>
            </div>
          </div>

          {/* Items Summary Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Materials &amp; Dispatch Items ({billData.items.length})
            </h4>

            <div className="border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[460px]">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-3 whitespace-nowrap">Item</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Unit</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Quantity</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Rate</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {billData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400">{item.variant_name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{item.unit}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-300 whitespace-nowrap">
                        {item.quantity.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300 whitespace-nowrap">
                        ₹{item.rate.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white whitespace-nowrap">
                        ₹{item.total.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Labor Charges (Majuri) Summary if present */}
          {billData.labor_items && billData.labor_items.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Hammer className="w-3.5 h-3.5" />
                Labor Charges (Majuri) ({billData.labor_items.length})
              </h4>
              <div className="border border-slate-800 rounded-xl divide-y divide-slate-800/60 bg-slate-950/50 text-xs">
                {billData.labor_items.map((l, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <span className="font-semibold text-white">{l.description}</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        ({l.quantity} &times; ₹{l.rate.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <span className="font-bold text-amber-300">+₹{l.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment & Grand Total Summary */}
          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span>Materials Subtotal:</span>
              <span className="font-semibold">₹{billData.subtotal.toLocaleString('en-IN')}</span>
            </div>

            {laborTotal > 0 && (
              <div className="flex justify-between items-center text-xs text-amber-300">
                <span>+ Labor Charges (Majuri):</span>
                <span className="font-semibold">+₹{laborTotal.toLocaleString('en-IN')}</span>
              </div>
            )}

            {discount > 0 && (
              <div className="flex justify-between items-center text-xs text-emerald-400">
                <span>- Net Discount:</span>
                <span className="font-semibold">-₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
              <span className="font-semibold text-slate-200">Grand Total Amount:</span>
              <span className="text-lg font-black text-white">
                ₹{billData.total_amount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">Payment Status:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-xs ${billData.payment_status === 'Full Paid'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : billData.payment_status === 'Partial Paid'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}>
                {billData.payment_status}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-400 font-medium">
                Paid Amount Received ({billData.payment_mode}):
              </span>
              <span className="font-bold text-emerald-300">
                ₹{billData.paid_amount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-400 font-medium">Outstanding Balance Pending:</span>
              <span className="font-bold text-amber-300">
                ₹{billData.pending_amount.toLocaleString('en-IN')}
              </span>
            </div>

            {billData.notes && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Notes:</span> {billData.notes}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Edit</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors shadow-lg shadow-amber-950/50 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Confirming &amp; Updating Stock...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Dispatch Bill</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
