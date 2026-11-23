import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  Edit3,
  Trash2,
  FileText,
  CreditCard,
  IndianRupee,
  RefreshCw,
  Clock,
  Eye,
  CheckCircle2,
  FilePlus2
} from 'lucide-react';
import { Customer, Bill, Payment } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { CustomerFormModal } from './CustomerFormModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface CustomersProps {
  onNavigate: (view: string, id?: string) => void;
  onSelectCustomerForBill?: (customer: Customer) => void;
}

export const Customers: React.FC<CustomersProps> = ({ onNavigate, onSelectCustomerForBill }) => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    customerId: string | null;
    customerName: string;
  }>({
    isOpen: false,
    customerId: null,
    customerName: '',
  });

  const [ledgerCustomer, setLedgerCustomer] = useState<{
    customer: Customer;
    bills: Bill[];
    payments: Payment[];
  } | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.customers.list({
        search: search.trim(),
      });
      if (res.success) {
        setCustomers(res.customers);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch customer directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDeleteCustomer = async () => {
    if (!deleteConfirmation.customerId) return;
    try {
      const res = await api.customers.delete(deleteConfirmation.customerId);
      if (res.success) {
        showToast(res.message, 'success');
        setDeleteConfirmation({ isOpen: false, customerId: null, customerName: '' });
        fetchCustomers();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete customer.', 'error');
    }
  };

  const handleOpenLedger = async (customer: Customer) => {
    try {
      const res = await api.customers.get(customer.id);
      if (res.success) {
        setLedgerCustomer({
          customer: res.customer,
          bills: res.customer.bills || [],
          payments: res.customer.payments || [],
        });
      }
    } catch (err: any) {
      showToast('Could not load customer ledger.', 'error');
    }
  };

  const handleCreateBillForCustomer = (customer: Customer) => {
    if (onSelectCustomerForBill) {
      onSelectCustomerForBill(customer);
    }
    onNavigate('create-bill', customer.id);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Customer &amp; Contractor Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Maintain customer site addresses, contact numbers, credit ledger, and pending balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCustomers()}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCustomerToEdit(null);
              setIsCustomerModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-950/50 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Search & Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search */}
        <div className="sm:col-span-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by A/C No., customer name, phone, taluko, or district..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-slate-400 hover:text-white whitespace-nowrap px-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Directory Count */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between px-5">
          <span className="text-xs text-slate-400">Total Registered Customers</span>
          <span className="text-base font-bold text-white">{customers.length}</span>
        </div>
      </div>

      {/* Customers Table / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading customer directory...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Customers Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {search ? 'No customer matched your search query.' : 'Add your first customer to begin billing.'}
          </p>
          <button
            onClick={() => {
              setCustomerToEdit(null);
              setIsCustomerModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white"
          >
            + Add Customer Now
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">A/C No.</th>
                  <th className="py-3 px-4">Customer / Firm</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Location (Taluko / District)</th>
                  <th className="py-3 px-4 text-right">Total Billed</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Pending Balance</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((cust) => {
                  const hasPending = (cust.total_pending || 0) > 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Account Number */}
                      <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                        {cust.account_number ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 font-mono font-bold text-amber-300 text-xs">
                            #{cust.account_number}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>

                      {/* Name & GST */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs">{cust.name}</div>
                        {cust.gst_number && (
                          <span className="text-[10px] font-mono text-slate-500">
                            GST: {cust.gst_number}
                          </span>
                        )}
                        {cust.address && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                            {cust.address}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{cust.phone || '-'}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        {cust.taluko ? `${cust.taluko}, ` : ''}
                        {cust.district || '-'}
                        {cust.state ? ` (${cust.state})` : ''}
                      </td>

                      {/* Total Billed */}
                      <td className="py-3 px-4 text-right font-medium text-slate-300 whitespace-nowrap">
                        ₹{(cust.total_billed || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-4 text-right font-medium text-emerald-400 whitespace-nowrap">
                        ₹{(cust.total_paid || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Pending Balance */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${hasPending ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                          ₹{(cust.total_pending || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCreateBillForCustomer(cust)}
                            className="p-1.5 text-amber-400 hover:text-white rounded-lg hover:bg-amber-600/30 transition-colors"
                            title="Create Bill for Customer"
                          >
                            <FilePlus2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenLedger(cust)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="View Ledger & Bills"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCustomerToEdit(cust);
                              setIsCustomerModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Edit Customer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmation({
                                isOpen: true,
                                customerId: cust.id,
                                customerName: cust.name,
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Archive Customer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Customer Form Modal */}
      {isCustomerModalOpen && (
        <CustomerFormModal
          isOpen={isCustomerModalOpen}
          customerToEdit={customerToEdit}
          onClose={() => {
            setIsCustomerModalOpen(false);
            setCustomerToEdit(null);
          }}
          onSuccess={() => {
            fetchCustomers();
          }}
        />
      )}

      {/* Customer Ledger Modal */}
      {ledgerCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                  <Users className="w-4 h-4 text-amber-500" />
                  {ledgerCustomer.customer.account_number && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 font-mono text-xs text-amber-300">
                      A/C #{ledgerCustomer.customer.account_number}
                    </span>
                  )}
                  <span>{ledgerCustomer.customer.name} • Account Book</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Phone: {ledgerCustomer.customer.phone || '-'} • {ledgerCustomer.customer.address || 'No address'}
                </p>
              </div>
              <button
                onClick={() => setLedgerCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Invoiced</span>
                <span className="text-sm font-bold text-white">
                  ₹{(ledgerCustomer.customer.total_billed || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Total Received</span>
                <span className="text-sm font-bold text-emerald-300">
                  ₹{(ledgerCustomer.customer.total_paid || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-amber-400 uppercase font-semibold block">Outstanding Pending</span>
                <span className="text-sm font-bold text-amber-300">
                  ₹{(ledgerCustomer.customer.total_pending || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Tabbed view: Bills vs Payments */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  Bills Issued ({ledgerCustomer.bills.length})
                </h4>
                {ledgerCustomer.bills.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                    No bills generated for this customer yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ledgerCustomer.bills.map(b => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setLedgerCustomer(null);
                          onNavigate('bill-detail', b.id);
                        }}
                        className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{b.bill_number}</span>
                            <span className="text-[11px] text-slate-400">{b.bill_date}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Status: <span className="font-semibold text-slate-300">{b.payment_status}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">₹{b.total_amount.toLocaleString('en-IN')}</div>
                          {b.pending_amount > 0 && (
                            <div className="text-[10px] text-amber-400 font-semibold">
                              Pending: ₹{b.pending_amount.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  Payments Received ({ledgerCustomer.payments.length})
                </h4>
                {ledgerCustomer.payments.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                    No payment receipts logged yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ledgerCustomer.payments.map(p => (
                      <div key={p.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400">+₹{p.amount.toLocaleString('en-IN')}</span>
                            <span className="text-[11px] text-slate-400">{p.payment_date}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">{p.payment_mode}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            For Bill #{p.bill_number} {p.notes ? `• ${p.notes}` : ''}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          Balance Left: ₹{p.remaining_amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => handleCreateBillForCustomer(ledgerCustomer.customer)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                + Create New Bill for {ledgerCustomer.customer.name.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Archive Customer"
        message={`Are you sure you want to soft delete "${deleteConfirmation.customerName}"? Existing bills and payment receipts will remain intact.`}
        confirmText="Archive Customer"
        isDestructive={true}
        onClose={() => setDeleteConfirmation({ isOpen: false, customerId: null, customerName: '' })}
        onConfirm={handleDeleteCustomer}
      />
    </div>
  );
};
