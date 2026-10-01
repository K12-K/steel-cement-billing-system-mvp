import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle2, IndianRupee, AlertCircle } from 'lucide-react';
import { Bill } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  bill,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bill) {
      // Suggest full remaining pending balance by default
      setAmount(bill.pending_amount > 0 ? String(bill.pending_amount) : '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('Cash');
      setReferenceNumber('');
      setNotes('');
      setError(null);
    }
  }, [bill, isOpen]);

  if (!isOpen || !bill) return null;

  const numAmount = parseFloat(amount) || 0;
  const newTotalPaid = Math.round((bill.paid_amount + numAmount) * 100) / 100;
  const remainingPending = Math.max(0, Math.round((bill.total_amount - newTotalPaid) * 100) / 100);
  const isFullPayment = remainingPending === 0 && numAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Please enter a payment amount greater than zero.');
      return;
    }

    if (numAmount > bill.pending_amount) {
      setError(`Payment cannot exceed outstanding pending amount of ₹${bill.pending_amount.toLocaleString('en-IN')}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.payments.record({
        bill_id: bill.id,
        amount: numAmount,
        payment_date: paymentDate,
        payment_mode: paymentMode,
        reference_number: referenceNumber,
        notes: notes,
      });

      if (res.success) {
        showToast(res.message, 'success');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record payment.');
      showToast(err.message || 'Failed to record payment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Record Payment</h2>
              <p className="text-xs text-slate-400">Bill #{bill.bill_number} • {bill.customer_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Financial Overview Card */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Total Billed</span>
              <span className="text-sm font-bold text-white">₹{bill.total_amount.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block">Previously Paid</span>
              <span className="text-sm font-bold text-emerald-300">₹{bill.paid_amount.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider block">Current Pending</span>
              <span className="text-sm font-bold text-amber-300">₹{bill.pending_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Payment Received (₹) <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(String(bill.pending_amount))}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
              >
                Pay Full Pending (₹{bill.pending_amount.toLocaleString('en-IN')})
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="any"
                min="1"
                max={bill.pending_amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount received"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-base font-semibold focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Payment Calculation Preview */}
          {numAmount > 0 && (
            <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>New Total Paid:</span>
                <span className="font-semibold text-emerald-300">₹{newTotalPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Remaining Pending:</span>
                <span className="font-semibold text-amber-300">₹{remainingPending.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-700/40">
                <span>Resulting Status:</span>
                <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                  isFullPayment ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {isFullPayment ? 'Full Paid (Bill Cleared)' : 'Partial Paid'}
                </span>
              </div>
            </div>
          )}

          {/* Payment Date & Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Mode <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Bank Transfer/NEFT">Bank Transfer (NEFT/RTGS)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Reference / UTR / Cheque No. (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR1293812 or Cheque #49201"
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Payment Audit Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared at site counter by supervisor"
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numAmount <= 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-lg shadow-emerald-950/50 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Record ₹{numAmount > 0 ? numAmount.toLocaleString('en-IN') : '0'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
