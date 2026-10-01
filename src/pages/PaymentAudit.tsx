import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  IndianRupee, 
  RefreshCw, 
  Download, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Payment } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const PaymentAudit: React.FC = () => {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.payments.audit({
        search: search.trim(),
        payment_mode: paymentMode !== 'All' ? paymentMode : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        limit: 25,
      });

      if (res.success) {
        setPayments(res.payments);
        setTotalReceived(res.total_received);
        setTotalPages(res.pagination.total_pages);
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load payment audit records.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, paymentMode, fromDate, toDate, page, showToast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const exportCSV = () => {
    if (payments.length === 0) return;
    const headers = ['Payment ID,Bill Number,Customer,Date,Mode,Ref No,Previous Paid,Amount Received,New Paid,Balance Remaining,Status,Notes,Created By'];
    const rows = payments.map(p => 
      `"${p.id}","${p.bill_number}","${p.customer_name}","${p.payment_date}","${p.payment_mode}","${p.reference_number || ''}",${p.previous_paid_amount},${p.amount},${p.new_paid_amount},${p.remaining_amount},"${p.payment_status}","${p.notes || ''}","${p.created_by}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payment_audit_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Payment audit records exported to CSV successfully.', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            Financial Payment Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable transaction records of all cash, UPI, bank transfers, and cheque receipts with ledger balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchPayments()}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            disabled={payments.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Box */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Funds Filtered &amp; Recorded
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">
            ₹{totalReceived.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Total audit entries found: <span className="font-bold text-white">{totalCount}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by customer, bill no, or UTR..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <select
              value={paymentMode}
              onChange={(e) => {
                setPaymentMode(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="All">All Modes (Cash, UPI, NEFT, Cheque)</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / QR</option>
              <option value="Bank Transfer/NEFT">Bank Transfer (NEFT/RTGS)</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2.5 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              title="From date"
            />
            <span className="text-slate-500 text-xs">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2.5 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading audit records...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Payment Records Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || paymentMode !== 'All' || fromDate
              ? 'No payments match the filter criteria.'
              : 'Payments recorded against bills will appear here with permanent audit history.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Payment ID</th>
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date &amp; Mode</th>
                  <th className="py-3 px-4 text-right">Previous Paid</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-right">New Paid</th>
                  <th className="py-3 px-4 text-right">Remaining Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 sm:px-6">Audit Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {p.id.split('_').slice(1).join('_')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {p.bill_number}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {p.customer_name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-300">{p.payment_date}</div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {p.payment_mode}
                      </span>
                      {p.reference_number && (
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Ref: {p.reference_number}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                      ₹{p.previous_paid_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-400 text-sm whitespace-nowrap">
                      +₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-200 whitespace-nowrap">
                      ₹{p.new_paid_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-400 whitespace-nowrap">
                      ₹{p.remaining_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.payment_status === 'Full Paid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-[11px] text-slate-400">
                      <div>By: {p.created_by}</div>
                      {p.notes && <div className="text-slate-500 italic truncate max-w-xs">{p.notes}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Page {page} of {totalPages} ({totalCount} total audit records)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
