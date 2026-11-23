import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  Eye,
  Edit3,
  Printer,
  Share2,
  Trash2,
  Plus,
  Clock,
  IndianRupee,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2
} from 'lucide-react';
import { Bill, Product } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { shareOrDownloadPdf } from '../utils/invoicePdf';

interface BillsProps {
  onNavigate: (view: string, id?: string) => void;
}

export const Bills: React.FC<BillsProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('All');
  const [productId, setProductId] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('bill_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals
  const [paymentModalBill, setPaymentModalBill] = useState<Bill | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    billId: string | null;
    billNumber: string;
  }>({
    isOpen: false,
    billId: null,
    billNumber: '',
  });

  const [sharingBillId, setSharingBillId] = useState<string | null>(null);

  const fetchProductsList = useCallback(async () => {
    try {
      const res = await api.products.list();
      if (res.success) {
        setProducts(res.products);
      }
    } catch (e) { }
  }, []);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.bills.list({
        search: search.trim(),
        payment_status: paymentStatus !== 'All' ? paymentStatus : undefined,
        product_id: productId !== 'All' ? productId : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit: 25,
      });

      if (res.success) {
        setBills(res.bills);
        setTotalPages(res.pagination.total_pages);
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch bills.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, paymentStatus, productId, fromDate, toDate, sortBy, sortOrder, page, showToast]);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleDeleteBill = async () => {
    if (!deleteConfirmation.billId) return;
    try {
      const res = await api.bills.delete(deleteConfirmation.billId);
      if (res.success) {
        showToast(res.message, 'success');
        setDeleteConfirmation({ isOpen: false, billId: null, billNumber: '' });
        fetchBills();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to archive bill.', 'error');
    }
  };

  const handleShareBill = async (bill: Bill) => {
    try {
      setSharingBillId(bill.id);
      showToast('Generating invoice PDF...', 'info');

      // Fetch complete bill details with snapshot items & settings if not already present
      let fullBill = bill;
      if (!bill.items || bill.items.length === 0 || !bill.settings) {
        const res = await api.bills.get(bill.id);
        if (res.success && res.bill) {
          fullBill = res.bill;
        }
      }

      await shareOrDownloadPdf(null, fullBill, (msg, type) => {
        showToast(msg, type);
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to share invoice PDF.', 'error');
    } finally {
      setSharingBillId(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setPaymentStatus('All');
    setProductId('All');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            Billing &amp; Invoices Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse, filter, view Cash Memo / bill layout, print, share, and track credit settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchBills()}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('create-bill')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-950/50 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Bill</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* General Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search bill no, A/C No., customer, phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="All">All Payment Statuses</option>
              <option value="Full Paid">Full Paid Only</option>
              <option value="Partial Paid">Partial Paid (Has Balance)</option>
              <option value="Pending">Pending (0 Received)</option>
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="All">All Product Categories</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker */}
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

        {/* Clear Filters CTA if active */}
        {(search || paymentStatus !== 'All' || productId !== 'All' || fromDate || toDate) && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400">
              Filtering results: Found {totalCount} matching bills
            </span>
            <button
              onClick={clearFilters}
              className="text-amber-400 hover:text-amber-300 font-semibold underline"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* DataTable */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading bills...</p>
        </div>
      ) : bills.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Invoices Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {search || paymentStatus !== 'All' || fromDate
              ? 'No bills matched your specified filters. Try resetting the filters.'
              : 'Create your first bill to see transaction records here.'}
          </p>
          <button
            onClick={() => onNavigate('create-bill')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white"
          >
            + Create Bill
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Bill Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer &amp; Phone</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Pending</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Bill Number */}
                    <td className="py-3 px-4 sm:px-6 font-mono font-bold text-white whitespace-nowrap">
                      <button
                        onClick={() => onNavigate('bill-detail', bill.id)}
                        className="hover:text-amber-400 transition-colors text-left"
                      >
                        {bill.bill_number}
                      </button>
                      {bill.items_summary && (
                        <span className="block text-[10px] text-slate-500 font-sans truncate max-w-xs font-normal">
                          {bill.items_summary}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {bill.bill_date}
                      {bill.reminder_date && (
                        <span className="block text-[10px] text-amber-400 flex items-center gap-1 font-medium">
                          <Clock className="w-2.5 h-2.5" />
                          Due: {bill.reminder_date}{bill.reminder_time ? ` ${bill.reminder_time}` : ''}
                        </span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white truncate max-w-xs flex items-center gap-1.5">
                        {bill.customer_account_number && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] shrink-0">
                            #{bill.customer_account_number}
                          </span>
                        )}
                        <span className="truncate">{bill.customer_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{bill.customer_phone || '-'}</div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 text-right font-bold text-white whitespace-nowrap">
                      ₹{bill.total_amount.toLocaleString('en-IN')}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3 px-4 text-right font-medium text-emerald-400 whitespace-nowrap">
                      ₹{bill.paid_amount.toLocaleString('en-IN')}
                    </td>

                    {/* Pending Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className={`font-bold ${bill.pending_amount > 0 ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                        ₹{bill.pending_amount.toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${bill.payment_status === 'Full Paid'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : bill.payment_status === 'Partial Paid'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                        {bill.payment_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {bill.pending_amount > 0 && (
                          <button
                            onClick={() => setPaymentModalBill(bill)}
                            className="p-1.5 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-600/30 transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onNavigate('bill-detail', bill.id)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="View / Print Bill"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleShareBill(bill)}
                          disabled={sharingBillId === bill.id}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                          title="Share Bill as PDF"
                        >
                          {sharingBillId === bill.id ? (
                            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onNavigate('bill-edit', bill.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Edit Bill & Items"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirmation({
                              isOpen: true,
                              billId: bill.id,
                              billNumber: bill.bill_number,
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Archive Bill (Restores Stock)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Page {page} of {totalPages} ({totalCount} total bills)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalBill && (
        <RecordPaymentModal
          isOpen={!!paymentModalBill}
          bill={paymentModalBill}
          onClose={() => setPaymentModalBill(null)}
          onSuccess={() => {
            setPaymentModalBill(null);
            fetchBills();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Archive Bill"
        message={`Are you sure you want to soft delete Bill #${deleteConfirmation.billNumber}? Deleting this bill will automatically reverse stock deductions and return items to inventory. Historical payment audits will remain preserved.`}
        confirmText="Archive Bill & Restore Stock"
        isDestructive={true}
        onClose={() => setDeleteConfirmation({ isOpen: false, billId: null, billNumber: '' })}
        onConfirm={handleDeleteBill}
      />
    </div>
  );
};
