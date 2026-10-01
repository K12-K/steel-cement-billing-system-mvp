import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Printer,
  Share2,
  Download,
  Edit3,
  CreditCard,
  History,
  CheckCircle2,
  FileText,
  Loader2
} from 'lucide-react';
import { Bill } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { shareOrDownloadPdf, generateInvoicePdfFromData } from '../utils/invoicePdf';

interface BillDetailProps {
  billId: string;
  onNavigate: (view: string, id?: string) => void;
}

export const BillDetail: React.FC<BillDetailProps> = ({ billId, onNavigate }) => {
  const { showToast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isSharingPdf, setIsSharingPdf] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

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

  const handleSharePdf = async () => {
    if (!bill) return;
    try {
      setIsSharingPdf(true);
      await shareOrDownloadPdf(null, bill, (msg, type) => {
        showToast(msg, type);
      });
    } catch (err: any) {
      showToast(err.message || 'Could not share invoice PDF.', 'error');
    } finally {
      setIsSharingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!bill) return;
    try {
      setIsDownloadingPdf(true);
      const { pdf, fileName } = generateInvoicePdfFromData(bill);
      pdf.save(fileName);
      showToast(`Invoice PDF downloaded (${fileName})!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not download invoice PDF.', 'error');
    } finally {
      setIsDownloadingPdf(false);
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

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <button
          onClick={() => onNavigate('bills')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Bills</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {bill.pending_amount > 0 && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('bill-edit', bill.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Bill</span>
          </button>

          {/* Share PDF Button */}
          <button
            onClick={handleSharePdf}
            disabled={isSharingPdf || isDownloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-md shadow-amber-950/40 transition-all disabled:opacity-50"
            title="Share exact tax invoice view as PDF via WhatsApp, Email, etc."
          >
            {isSharingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Preparing PDF...</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share PDF</span>
              </>
            )}
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isSharingPdf || isDownloadingPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Save PDF file to your device"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* Direct Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            title="Print directly or use browser print to PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Invoice Document (Responsive & Screen-friendly, Printable & Exportable) */}
      <div className="w-full overflow-hidden sm:overflow-visible">
        <InvoiceDocument bill={bill} />
      </div>

      {/* Payment Receipts Audit History Table for this bill */}
      <div className="print:hidden p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
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
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
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
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left text-xs min-w-[580px]">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 whitespace-nowrap">Date</th>
                  <th className="py-2.5 whitespace-nowrap">Mode</th>
                  <th className="py-2.5 whitespace-nowrap">Reference No</th>
                  <th className="py-2.5 text-right whitespace-nowrap">Previous Paid</th>
                  <th className="py-2.5 text-right whitespace-nowrap">Received Amount</th>
                  <th className="py-2.5 text-right whitespace-nowrap">Remaining Balance</th>
                  <th className="py-2.5 whitespace-nowrap">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(bill.payments || []).map(p => (
                  <tr key={p.id}>
                    <td className="py-2.5 text-slate-300 whitespace-nowrap">{p.payment_date}</td>
                    <td className="py-2.5 text-white font-medium whitespace-nowrap">{p.payment_mode}</td>
                    <td className="py-2.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">{p.reference_number || '-'}</td>
                    <td className="py-2.5 text-right text-slate-400 whitespace-nowrap">₹{p.previous_paid_amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400 whitespace-nowrap">+₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right font-bold text-amber-400 whitespace-nowrap">₹{p.remaining_amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-slate-400 text-[11px] whitespace-nowrap">{p.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
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
