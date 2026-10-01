import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Search, 
  CreditCard, 
  Eye, 
  User, 
  Calendar, 
  IndianRupee, 
  AlertTriangle, 
  RefreshCw,
  Phone,
  Filter
} from 'lucide-react';
import { Bill } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { RecordPaymentModal } from '../components/RecordPaymentModal';

interface PendingPaymentsProps {
  onNavigate: (view: string, id?: string) => void;
}

export const PendingPayments: React.FC<PendingPaymentsProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [totalPendingAmount, setTotalPendingAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [reminderDueOnly, setReminderDueOnly] = useState<boolean>(false);

  // Modal
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);

  const fetchPendingBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.payments.pending({
        search: search.trim(),
        status_filter: statusFilter !== 'All' ? statusFilter : undefined,
        reminder_due: reminderDueOnly,
      });

      if (res.success) {
        setBills(res.bills);
        setTotalPendingAmount(res.total_pending_amount);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch pending payments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, reminderDueOnly, showToast]);

  useEffect(() => {
    fetchPendingBills();
  }, [fetchPendingBills]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Prominent Outstanding Balance Banner */}
      <div className="p-6 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-600/30 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Pending Payment Collections</h2>
          </div>
          <p className="text-xs text-slate-400">
            Active credit settlements pending from contractors, builders, and site deliveries.
          </p>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-xl border border-amber-500/30 text-left md:text-right shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
            Total Outstanding Balance
          </span>
          <div className="text-2xl font-black text-amber-300">
            ₹{totalPendingAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400">
            Across {bills.length} bills pending clearance
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone, bill number, or taluko..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="All">All Pending &amp; Partial</option>
              <option value="Partial Paid">Partial Paid Only</option>
              <option value="Pending">Pending (0 Advance)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={() => setReminderDueOnly(!reminderDueOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              reminderDueOnly
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Reminder Due Date Passed / Today</span>
          </button>

          <button
            onClick={() => fetchPendingBills()}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading pending settlements...</p>
        </div>
      ) : bills.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <Clock className="w-12 h-12 text-emerald-500/60 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Pending Payments</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || statusFilter !== 'All' || reminderDueOnly
              ? 'No pending bills matched your search or filters.'
              : 'All bills have been cleared! Great job collecting receivables.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Bill Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer &amp; Phone</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Pending Amount</th>
                  <th className="py-3 px-4">Reminder Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bills.map(b => {
                  const isReminderOverdue = b.reminder_date && b.reminder_date <= todayStr;

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Bill No */}
                      <td className="py-3 px-4 sm:px-6 font-mono font-bold text-white whitespace-nowrap">
                        <button
                          onClick={() => onNavigate('bill-detail', b.id)}
                          className="hover:text-amber-400 transition-colors text-left"
                        >
                          {b.bill_number}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {b.bill_date}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white truncate max-w-xs">
                          {b.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{b.customer_phone}</span>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-medium text-slate-300 whitespace-nowrap">
                        ₹{b.total_amount.toLocaleString('en-IN')}
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-4 text-right font-medium text-emerald-400 whitespace-nowrap">
                        ₹{b.paid_amount.toLocaleString('en-IN')}
                      </td>

                      {/* Pending */}
                      <td className="py-3 px-4 text-right font-bold text-amber-400 text-sm whitespace-nowrap">
                        ₹{b.pending_amount.toLocaleString('en-IN')}
                      </td>

                      {/* Reminder */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {b.reminder_date ? (
                          <div className={`flex items-center gap-1 font-semibold text-[11px] ${
                            isReminderOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{b.reminder_date}</span>
                            {isReminderOverdue && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                                Due!
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          b.payment_status === 'Partial Paid'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {b.payment_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBillForPayment(b)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-sm transition-colors"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Record Payment</span>
                          </button>
                          <button
                            onClick={() => onNavigate('bill-detail', b.id)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onNavigate('customers', b.customer_id)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="View Customer Profile"
                          >
                            <User className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedBillForPayment && (
        <RecordPaymentModal
          isOpen={!!selectedBillForPayment}
          bill={selectedBillForPayment}
          onClose={() => setSelectedBillForPayment(null)}
          onSuccess={() => {
            setSelectedBillForPayment(null);
            fetchPendingBills();
          }}
        />
      )}
    </div>
  );
};
