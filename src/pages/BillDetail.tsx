import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  ArrowLeft, 
  Printer, 
  Share2, 
  Edit3, 
  CreditCard, 
  Building2, 
  Clock, 
  CheckCircle2, 
  History, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { Bill } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { RecordPaymentModal } from '../components/RecordPaymentModal';

interface BillDetailProps {
  billId: string;
  onNavigate: (view: string, id?: string) => void;
}

export const BillDetail: React.FC<BillDetailProps> = ({ billId, onNavigate }) => {
  const { showToast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  const fetchBill = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.bills.get(billId);
      if (res.success && res.bill) {
        setBill(res.bill);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load bill details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [billId, showToast]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!bill) return;
    const shareText = `*TAX INVOICE - BHAWANI STEEL & CEMENT*\nBill No: ${bill.bill_number}\nDate: ${bill.bill_date}\nCustomer: ${bill.customer_name}\nTotal Amount: ₹${bill.total_amount.toLocaleString('en-IN')}\nPaid: ₹${bill.paid_amount.toLocaleString('en-IN')}\nPending Balance: ₹${bill.pending_amount.toLocaleString('en-IN')}\nStatus: ${bill.payment_status}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${bill.bill_number}`,
          text: shareText,
        });
      } catch (e) {}
    } else {
      await navigator.clipboard.writeText(shareText);
      showToast('Bill details copied to clipboard!', 'success');
    }
  };

  if (loading || !bill) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-3 text-xs text-slate-400">Loading invoice details...</p>
      </div>
    );
  }

  const settings = bill.settings;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <button
          onClick={() => onNavigate('bills')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Bills</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {bill.pending_amount > 0 && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('bill-edit', bill.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Bill</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-950/40 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div 
        id="printable-invoice"
        className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl border border-slate-200 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-full"
      >
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-lg">
                B
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">
                {settings?.company_name || 'Bhawani Steel & Cement Traders'}
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {settings?.tagline || 'Dealers in TMT 550D Sariya, UltraTech/Ambuja Cement & Construction Materials'}
            </p>
            <p className="text-xs text-slate-600">
              {settings?.address}, {settings?.city}, {settings?.state} - {settings?.pincode}
            </p>
            <p className="text-xs text-slate-700">
              Phone: <span className="font-semibold">{settings?.phone}</span> • Email: {settings?.email}
            </p>
            <p className="text-xs font-bold text-slate-900">
              GSTIN: <span className="font-mono">{settings?.gstin}</span>
            </p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="inline-block px-3 py-1 bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-md mb-2">
              Tax Invoice / Cash Memo
            </span>
            <div className="text-sm font-black text-slate-900 font-mono">
              Invoice #{bill.bill_number}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Date: <span className="font-bold text-slate-900">{bill.bill_date}</span>
            </div>
            <div className="mt-2 text-xs">
              Status:{' '}
              <span className={`font-bold uppercase px-2 py-0.5 rounded text-[11px] ${
                bill.payment_status === 'Full Paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : bill.payment_status === 'Partial Paid'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {bill.payment_status}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To & Dispatch Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Billed To (Customer):
            </span>
            <h2 className="text-base font-black text-slate-950">{bill.customer_name}</h2>
            <p className="text-xs text-slate-700 mt-0.5 font-medium">
              Contact: {bill.customer_phone}
            </p>
            {bill.customer_address && (
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Site: {bill.customer_address}
              </p>
            )}
            <p className="text-xs text-slate-600">
              {[bill.customer_taluko, bill.customer_district, bill.customer_state].filter(Boolean).join(', ')}
            </p>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Dispatch &amp; Credit Terms:
            </span>
            <div className="text-xs text-slate-700">
              Payment Terms: <span className="font-bold text-slate-900">{bill.payment_status}</span>
            </div>
            {bill.reminder_type !== 'No Reminder' && (
              <div className="text-xs text-slate-700">
                Payment Reminder: <span className="font-bold">{bill.reminder_type}</span>{' '}
                {bill.reminder_date && `(Due by: ${bill.reminder_date})`}
              </div>
            )}
            {bill.notes && (
              <div className="text-xs text-slate-600 italic">
                Remark: {bill.notes}
              </div>
            )}
          </div>
        </div>

        {/* Product Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-[11px] font-black text-slate-900 uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">Material / Product Description</th>
                <th className="py-3 px-3">Variant / Grade</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-3 text-right">Quantity</th>
                <th className="py-3 px-3 text-right">Rate (₹)</th>
                <th className="py-3 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(bill.items || []).map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 text-center text-slate-500 font-bold">{index + 1}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {item.product_name_snapshot}
                  </td>
                  <td className="py-3 px-3 text-slate-700">{item.variant_name_snapshot}</td>
                  <td className="py-3 px-3 text-slate-600 font-medium">{item.unit}</td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">
                    {item.quantity.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">
                    ₹{item.rate.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-950">
                    ₹{item.total.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation & Bank Details Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-900">
          {/* Bank & Payment Details */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-800 block text-[11px]">
              Bank Transfer Details:
            </span>
            <div className="text-slate-700">
              Bank Name: <span className="font-bold text-slate-900">{settings?.bank_name}</span>
            </div>
            <div className="text-slate-700">
              Account No: <span className="font-mono font-bold text-slate-900">{settings?.account_number}</span>
            </div>
            <div className="text-slate-700">
              IFSC Code: <span className="font-mono font-bold text-slate-900">{settings?.ifsc_code}</span>
            </div>
            <div className="text-slate-700">
              Branch: <span className="font-semibold text-slate-900">{settings?.branch}</span>
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

            <div className="flex justify-between py-1.5 bg-amber-50 p-2 rounded-lg text-amber-900">
              <span className="font-black uppercase tracking-wider">Balance Pending:</span>
              <span className="font-black text-base">₹{bill.pending_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions and Authorized Signature */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-8 mt-6 border-t border-slate-200">
          <div className="text-[10px] text-slate-500 leading-relaxed space-y-1">
            <span className="font-bold uppercase text-slate-700 block">Terms &amp; Conditions:</span>
            <pre className="font-sans whitespace-pre-line text-slate-600">
              {settings?.terms_conditions || 'Goods once sold will not be accepted back without inspection.'}
            </pre>
          </div>

          <div className="sm:text-right flex flex-col justify-end items-end pt-8 sm:pt-0">
            <div className="w-48 border-t border-slate-400 pt-2 text-center">
              <p className="text-xs font-bold text-slate-900">Authorized Signatory</p>
              <p className="text-[10px] text-slate-500">For {settings?.company_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Receipts Audit History Table for this bill */}
      <div className="print:hidden p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Payment Receipts Audit Trail
            </h3>
            <p className="text-xs text-slate-400">All historical payments received against Bill #{bill.bill_number}</p>
          </div>
          {bill.pending_amount > 0 && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              + Record Payment
            </button>
          )}
        </div>

        {(bill.payments || []).length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No payments have been logged for this bill yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Mode</th>
                  <th className="py-2.5">Reference No</th>
                  <th className="py-2.5 text-right">Previous Paid</th>
                  <th className="py-2.5 text-right">Received Amount</th>
                  <th className="py-2.5 text-right">Remaining Balance</th>
                  <th className="py-2.5">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(bill.payments || []).map(p => (
                  <tr key={p.id}>
                    <td className="py-2.5 text-slate-300">{p.payment_date}</td>
                    <td className="py-2.5 text-white font-medium">{p.payment_mode}</td>
                    <td className="py-2.5 text-slate-400 font-mono text-[11px]">{p.reference_number || '-'}</td>
                    <td className="py-2.5 text-right text-slate-400">₹{p.previous_paid_amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">+₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right font-bold text-amber-400">₹{p.remaining_amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-slate-400 text-[11px]">{p.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          bill={bill}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            fetchBill();
          }}
        />
      )}
    </div>
  );
};
