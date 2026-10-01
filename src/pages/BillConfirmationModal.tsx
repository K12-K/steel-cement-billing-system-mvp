import React from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowLeft, 
  Receipt, 
  User, 
  Calendar, 
  Clock, 
  CreditCard, 
  IndianRupee,
  Layers,
  AlertCircle
} from 'lucide-react';

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
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    customer_taluko?: string;
    customer_district?: string;
    customer_state?: string;
    items: BillItemInput[];
    subtotal: number;
    total_amount: number;
    payment_status: 'Pending' | 'Partial Paid' | 'Full Paid';
    paid_amount: number;
    pending_amount: number;
    payment_mode: string;
    reminder_type: string;
    reminder_date?: string | null;
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
                Verify customer details, dispatch items, stock reductions, and payment amounts before committing.
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
              {billData.reminder_type !== 'No Reminder' && (
                <div className="text-xs text-amber-300 mt-1 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Reminder: {billData.reminder_type} {billData.reminder_date && `(${billData.reminder_date})`}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Customer Details
              </span>
              <div className="font-bold text-white text-sm">
                {billData.customer_name}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Phone: {billData.customer_phone}
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

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {billData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400">{item.variant_name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{item.unit}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                        {item.quantity.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        ₹{item.rate.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        ₹{item.total.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Grand Total Summary */}
          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-400">Grand Total Amount:</span>
              <span className="text-lg font-black text-white">
                ₹{billData.total_amount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">Payment Status:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                billData.payment_status === 'Full Paid'
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
