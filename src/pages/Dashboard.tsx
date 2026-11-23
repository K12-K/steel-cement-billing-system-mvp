import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  IndianRupee,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Plus,
  Receipt
} from 'lucide-react';
import { DashboardStats, Bill, ProductVariant } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { StockAdjustModal } from '../components/StockAdjustModal';

interface DashboardProps {
  onNavigate: (view: string, id?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);
  const [selectedVariantForStock, setSelectedVariantForStock] = useState<{ variant: ProductVariant; productName: string } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.stats();
      if (res.success) {
        setData(res);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-4 text-xs font-medium text-slate-400">Loading business figures &amp; records...</p>
      </div>
    );
  }

  const stats = data?.stats;
  const recentBills = data?.recent_bills || [];
  const recentPayments = data?.recent_payments || [];
  const topPendingBills = data?.top_pending_bills || [];
  const lowStockVariants = data?.low_stock_variants || [];
  const monthlyData = data?.monthly_data || [];
  const paymentDist = data?.payment_distribution || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Business Overview &amp; Live Ledger</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time billing, inventory movement, and pending collection status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStats()}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh figures"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('create-bill')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-950/50 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Bill</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {lowStockVariants.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-200">
                Low Inventory Alert ({lowStockVariants.length} item{lowStockVariants.length > 1 ? 's' : ''} below threshold)
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5">
                {lowStockVariants.map(v => `${v.product_name} (${v.variant_name}: ${v.stock_quantity} ${v.unit})`).slice(0, 3).join(', ')}
                {lowStockVariants.length > 3 && ` +${lowStockVariants.length - 3} more`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/30 whitespace-nowrap self-start md:self-auto"
          >
            Manage Stock &rarr;
          </button>
        </div>
      )}

      {/* Top 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue Received</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              ₹{(stats?.total_revenue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Out of ₹{(stats?.total_billed || 0).toLocaleString('en-IN')} total billed
            </p>
          </div>
        </div>

        {/* Current Month Revenue */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Month Collection</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              ₹{(stats?.current_month_revenue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Collected this month
            </p>
          </div>
        </div>

        {/* Total Pending Payment */}
        <div className="p-5 bg-slate-900 border border-amber-900/40 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-700/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Total Pending Balance</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              ₹{(stats?.total_pending || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-slate-400">
                Across {stats?.pending_bills || 0} pending/partial bills
              </p>
              <button
                onClick={() => onNavigate('pending-payments')}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline"
              >
                View All
              </button>
            </div>
          </div>
        </div>

        {/* Total Bills & Status Breakdown */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bills Issued</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {stats?.total_bills || 0}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                {stats?.paid_bills || 0} Paid
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                {stats?.partial_paid_bills || 0} Partial
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                {stats?.pending_bills || 0} Pending
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Comparison (2 columns) */}
        <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Monthly Billed vs Received</h3>
              <p className="text-xs text-slate-400">Past 6 months billing and collection trend</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
                Billed
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Collected
              </span>
            </div>
          </div>

          <div className="space-y-4 my-2">
            {monthlyData.map((item, idx) => {
              const maxVal = Math.max(...monthlyData.map(m => Math.max(m.billed, m.received)), 1000);
              const billedPct = Math.min(100, Math.round((item.billed / maxVal) * 100));
              const receivedPct = Math.min(100, Math.round((item.received / maxVal) * 100));

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300 w-16">{item.month}</span>
                    <div className="flex gap-4 text-[11px]">
                      <span className="text-slate-400">Billed: ₹{item.billed.toLocaleString('en-IN')}</span>
                      <span className="text-amber-400 font-semibold">Collected: ₹{item.received.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="h-3.5 bg-slate-950 rounded-full overflow-hidden flex flex-col gap-0.5 p-0.5">
                    <div
                      className="h-1 bg-slate-600 rounded-full transition-all duration-500"
                      style={{ width: `${billedPct}%` }}
                    />
                    <div
                      className="h-1.5 bg-gradient-to-r from-amber-600 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${receivedPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>Figures auto-synced from verified transaction audits</span>
            <span>Current Year 2026</span>
          </div>
        </div>

        {/* Payment Status Distribution (1 column) */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Payment Status Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">Volume &amp; value breakdown</p>

            <div className="space-y-4">
              {paymentDist.map((dist, idx) => {
                const totalBillsCount = stats?.total_bills || 1;
                const percentage = Math.round((dist.count / totalBillsCount) * 100);

                let color = 'bg-emerald-500';
                let textColor = 'text-emerald-400';
                if (dist.name === 'Partial Paid') {
                  color = 'bg-amber-500';
                  textColor = 'text-amber-400';
                } else if (dist.name === 'Pending') {
                  color = 'bg-rose-500';
                  textColor = 'text-rose-400';
                }

                return (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        {dist.name}
                      </span>
                      <span className={`font-bold ${textColor}`}>
                        {dist.count} Bills ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
                      <span>Total Value:</span>
                      <span className="font-semibold text-slate-200">₹{dist.amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">Total Billed Volume:</span>
            <span className="text-xs font-bold text-white">
              ₹{(stats?.total_billed || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Top Pending Payments & Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pending Payments with Record Payment Action */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Urgent Pending Receivables
              </h3>
              <p className="text-xs text-slate-400">Bills requiring payment collection</p>
            </div>
            <button
              onClick={() => onNavigate('pending-payments')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline"
            >
              View All ({stats?.pending_bills || 0})
            </button>
          </div>

          {topPendingBills.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs flex-1 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 opacity-60" />
              All customer bills are fully cleared! No outstanding pending balance.
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {topPendingBills.map(bill => (
                <div
                  key={bill.id}
                  className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors gap-3"
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{bill.bill_number}</span>
                      {bill.customer_account_number && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          A/C #{bill.customer_account_number}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${bill.payment_status === 'Partial Paid' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                        {bill.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                      {bill.customer_name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Date: {bill.bill_date}
                      {bill.reminder_date && ` • Reminder: ${bill.reminder_date}${bill.reminder_time ? ` ${bill.reminder_time}` : ''}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-amber-400">
                      ₹{bill.pending_amount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      of ₹{bill.total_amount.toLocaleString('en-IN')}
                    </div>
                    <button
                      onClick={() => setSelectedBillForPayment(bill)}
                      className="mt-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
                    >
                      Receive &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bills */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-400" />
                Recent Invoices Generated
              </h3>
              <p className="text-xs text-slate-400">Latest dispatched bills</p>
            </div>
            <button
              onClick={() => onNavigate('bills')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline"
            >
              View All Bills
            </button>
          </div>

          {recentBills.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs flex-1 flex flex-col items-center justify-center">
              No bills generated yet. Click &quot;Generate New Bill&quot; to create your first invoice.
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {recentBills.map(bill => (
                <div
                  key={bill.id}
                  onClick={() => onNavigate('bill-detail', bill.id)}
                  className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer group"
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        {bill.bill_number}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {bill.bill_date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate mt-0.5">
                      {bill.customer_name}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-white">
                      ₹{bill.total_amount.toLocaleString('en-IN')}
                    </div>
                    <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold mt-0.5 ${bill.payment_status === 'Full Paid'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : bill.payment_status === 'Partial Paid'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                      {bill.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments Received Audit Strip */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Recent Payment Audit Logs
            </h3>
            <p className="text-xs text-slate-400">Latest funds recorded into system accounts</p>
          </div>
          <button
            onClick={() => onNavigate('payment-audit')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline"
          >
            Complete Audit Log &rarr;
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Bill Number</th>
                  <th className="pb-2.5">Customer</th>
                  <th className="pb-2.5">Mode</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Status After Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 text-slate-300 whitespace-nowrap">{p.payment_date}</td>
                    <td className="py-2.5 font-bold text-white whitespace-nowrap">{p.bill_number}</td>
                    <td className="py-2.5 text-slate-300">{p.customer_name}</td>
                    <td className="py-2.5 text-slate-400">{p.payment_mode}</td>
                    <td className="py-2.5 font-bold text-emerald-400 whitespace-nowrap">
                      +₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${p.payment_status === 'Full Paid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                        }`}>
                        {p.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {selectedBillForPayment && (
        <RecordPaymentModal
          isOpen={!!selectedBillForPayment}
          bill={selectedBillForPayment}
          onClose={() => setSelectedBillForPayment(null)}
          onSuccess={() => {
            setSelectedBillForPayment(null);
            fetchStats();
          }}
        />
      )}

      {/* Stock Adjust Modal */}
      {selectedVariantForStock && (
        <StockAdjustModal
          isOpen={!!selectedVariantForStock}
          variant={selectedVariantForStock.variant}
          productName={selectedVariantForStock.productName}
          onClose={() => setSelectedVariantForStock(null)}
          onSuccess={() => {
            setSelectedVariantForStock(null);
            fetchStats();
          }}
        />
      )}
    </div>
  );
};
