import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Search,
  CreditCard,
  Eye,
  User,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Phone,
  Bell,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import { Bill, DueReminder } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface PendingPaymentsProps {
  onNavigate: (view: string, id?: string) => void;
}

function isReminderDueNow(reminderDate: string | null | undefined, reminderTime?: string | null): boolean {
  if (!reminderDate) return false;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (reminderDate < todayStr) return true;
  if (reminderDate > todayStr) return false;
  if (!reminderTime) return true;
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return reminderTime <= nowTime;
}

export const PendingPayments: React.FC<PendingPaymentsProps> = ({ onNavigate }) => {
  const { showToast } = useToast();

  // Tab & Filter State
  const [activeTab, setActiveTab] = useState<'all' | 'bills' | 'custom'>('all');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [customStatusFilter, setCustomStatusFilter] = useState<'All' | 'pending' | 'settled'>('pending');
  const [reminderDueOnly, setReminderDueOnly] = useState<boolean>(false);

  // Data State
  const [bills, setBills] = useState<Bill[]>([]);
  const [totalPendingBillsAmount, setTotalPendingBillsAmount] = useState<number>(0);
  const [customDues, setCustomDues] = useState<DueReminder[]>([]);
  const [totalCustomPendingAmount, setTotalCustomPendingAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Record Payment Modal
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);

  // Bill Reminder Date & Time Modal
  const [billForReminder, setBillForReminder] = useState<Bill | null>(null);
  const [billReminderDate, setBillReminderDate] = useState<string>('');
  const [billReminderTime, setBillReminderTime] = useState<string>('');
  const [billReminderNote, setBillReminderNote] = useState<string>('');
  const [savingBillReminder, setSavingBillReminder] = useState<boolean>(false);

  // Custom Due Item Modal (Create / Edit)
  const [isCustomDueModalOpen, setIsCustomDueModalOpen] = useState<boolean>(false);
  const [editingCustomDue, setEditingCustomDue] = useState<DueReminder | null>(null);
  const [duePartyName, setDuePartyName] = useState<string>('');
  const [duePartyAccount, setDuePartyAccount] = useState<string>('');
  const [duePartyPhone, setDuePartyPhone] = useState<string>('');
  const [dueTitle, setDueTitle] = useState<string>('');
  const [dueAmount, setDueAmount] = useState<string>('');
  const [dueReminderDate, setDueReminderDate] = useState<string>('');
  const [dueReminderTime, setDueReminderTime] = useState<string>('');
  const [dueNotes, setDueNotes] = useState<string>('');
  const [savingCustomDue, setSavingCustomDue] = useState<boolean>(false);

  // Delete Custom Due Confirmation
  const [customDueToDelete, setCustomDueToDelete] = useState<DueReminder | null>(null);
  const [deletingCustomDue, setDeletingCustomDue] = useState<boolean>(false);

  const fetchAllDues = useCallback(async () => {
    try {
      setLoading(true);
      const [billsRes, customRes] = await Promise.all([
        api.payments.pending({
          search: search.trim(),
          status_filter: statusFilter !== 'All' ? statusFilter : undefined,
          reminder_due: reminderDueOnly,
        }),
        api.payments.customDues.list({
          search: search.trim(),
          status: customStatusFilter,
          reminder_due: reminderDueOnly,
        }),
      ]);

      if (billsRes.success) {
        setBills(billsRes.bills);
        setTotalPendingBillsAmount(billsRes.total_pending_amount);
      }
      if (customRes.success) {
        setCustomDues(customRes.dues);
        setTotalCustomPendingAmount(customRes.total_pending_amount);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch pending dues & reminders.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, customStatusFilter, reminderDueOnly, showToast]);

  useEffect(() => {
    fetchAllDues();
  }, [fetchAllDues]);

  // Open Bill Reminder Modal
  const openBillReminderModal = (bill: Bill) => {
    setBillForReminder(bill);
    setBillReminderDate(bill.reminder_date || '');
    setBillReminderTime(bill.reminder_time || '');
    setBillReminderNote(bill.reminder_note || '');
  };

  const handleSaveBillReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForReminder) return;

    try {
      setSavingBillReminder(true);
      const res = await api.bills.updateReminder(billForReminder.id, {
        reminder_date: billReminderDate.trim() ? billReminderDate.trim() : null,
        reminder_time: billReminderDate.trim() && billReminderTime.trim() ? billReminderTime.trim() : null,
        reminder_note: billReminderNote.trim(),
      });
      if (res.success) {
        showToast(res.message || 'Bill reminder updated.', 'success');
        setBillForReminder(null);
        fetchAllDues();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update bill reminder.', 'error');
    } finally {
      setSavingBillReminder(false);
    }
  };

  const handleClearBillReminder = async () => {
    if (!billForReminder) return;
    try {
      setSavingBillReminder(true);
      const res = await api.bills.updateReminder(billForReminder.id, {
        reminder_date: null,
        reminder_time: null,
        reminder_note: '',
      });
      if (res.success) {
        showToast('Bill reminder cleared.', 'success');
        setBillForReminder(null);
        fetchAllDues();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to clear reminder.', 'error');
    } finally {
      setSavingBillReminder(false);
    }
  };

  // Custom Due Item Handlers
  const openCreateCustomDueModal = () => {
    setEditingCustomDue(null);
    setDuePartyName('');
    setDuePartyAccount('');
    setDuePartyPhone('');
    setDueTitle('');
    setDueAmount('');
    setDueReminderDate('');
    setDueReminderTime('');
    setDueNotes('');
    setIsCustomDueModalOpen(true);
  };

  const openEditCustomDueModal = (due: DueReminder) => {
    setEditingCustomDue(due);
    setDuePartyName(due.party_name);
    setDuePartyAccount(due.party_account_number || '');
    setDuePartyPhone(due.party_phone || '');
    setDueTitle(due.title || '');
    setDueAmount(String(due.due_amount));
    setDueReminderDate(due.reminder_date || '');
    setDueReminderTime(due.reminder_time || '');
    setDueNotes(due.notes || '');
    setIsCustomDueModalOpen(true);
  };

  const handleSaveCustomDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duePartyName.trim()) {
      showToast('Party name is required.', 'error');
      return;
    }
    const parsedAmt = parseFloat(dueAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      showToast('Please enter a valid due amount greater than zero.', 'error');
      return;
    }

    try {
      setSavingCustomDue(true);
      const payload = {
        party_name: duePartyName.trim(),
        party_account_number: duePartyAccount.trim(),
        party_phone: duePartyPhone.trim(),
        title: dueTitle.trim() || 'Manual Payment Follow-up',
        due_amount: parsedAmt,
        reminder_date: dueReminderDate.trim() ? dueReminderDate.trim() : null,
        reminder_time: dueReminderDate.trim() && dueReminderTime.trim() ? dueReminderTime.trim() : null,
        notes: dueNotes.trim(),
      };

      if (editingCustomDue) {
        const res = await api.payments.customDues.update(editingCustomDue.id, payload);
        if (res.success) {
          showToast('Due reminder updated.', 'success');
          setIsCustomDueModalOpen(false);
          fetchAllDues();
        }
      } else {
        const res = await api.payments.customDues.create(payload);
        if (res.success) {
          showToast('Manual due reminder added.', 'success');
          setIsCustomDueModalOpen(false);
          fetchAllDues();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save due reminder.', 'error');
    } finally {
      setSavingCustomDue(false);
    }
  };

  const handleToggleCustomDueStatus = async (due: DueReminder) => {
    try {
      const nextStatus = due.status === 'pending' ? 'settled' : 'pending';
      const res = await api.payments.customDues.update(due.id, { status: nextStatus });
      if (res.success) {
        showToast(
          nextStatus === 'settled' ? 'Marked as settled.' : 'Reopened as pending.',
          'success'
        );
        fetchAllDues();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handleDeleteCustomDueConfirm = async () => {
    if (!customDueToDelete) return;
    try {
      setDeletingCustomDue(true);
      const res = await api.payments.customDues.delete(customDueToDelete.id);
      if (res.success) {
        showToast('Manual due item deleted.', 'success');
        setCustomDueToDelete(null);
        fetchAllDues();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete due item.', 'error');
    } finally {
      setDeletingCustomDue(false);
    }
  };

  const combinedPendingTotal = Math.round((totalPendingBillsAmount + totalCustomPendingAmount) * 100) / 100;
  const triggeredBillsCount = bills.filter((b) => isReminderDueNow(b.reminder_date, b.reminder_time)).length;
  const triggeredCustomCount = customDues.filter(
    (d) => d.status === 'pending' && isReminderDueNow(d.reminder_date, d.reminder_time)
  ).length;
  const totalTriggeredCount = triggeredBillsCount + triggeredCustomCount;

  const showBillsSection = activeTab === 'all' || activeTab === 'bills';
  const showCustomSection = activeTab === 'all' || activeTab === 'custom';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Prominent Outstanding Balance & Reminders Banner */}
      <div className="p-6 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-600/30 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Bell className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Pending Dues &amp; Reminders</h2>
              <p className="text-xs text-slate-400">
                Track pending bill receivables &amp; custom due items with exact manual date and time reminders.
              </p>
            </div>
          </div>

          {totalTriggeredCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold mt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {totalTriggeredCount} reminder{totalTriggeredCount > 1 ? 's' : ''} due now or overdue!
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="p-4 bg-slate-950/80 rounded-xl border border-amber-500/30 text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Total Outstanding Dues
            </span>
            <div className="text-2xl font-black text-amber-300">
              ₹{combinedPendingTotal.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400">
              Bills: ₹{totalPendingBillsAmount.toLocaleString('en-IN')} • Manual: ₹{totalCustomPendingAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            onClick={openCreateCustomDueModal}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-950/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Due Reminder</span>
          </button>
        </div>
      </div>

      {/* Tabs + Search + Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        {/* Section Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${activeTab === 'all'
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
            >
              All Pending Dues ({bills.length + customDues.length})
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${activeTab === 'bills'
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
            >
              Pending Bills ({bills.length})
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${activeTab === 'custom'
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
            >
              Manual Due Items ({customDues.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReminderDueOnly(!reminderDueOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${reminderDueOnly
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Reminders Due Now ({totalTriggeredCount})</span>
            </button>

            <button
              onClick={fetchAllDues}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by party name, A/C No., phone, bill number, or title..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Bill Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              aria-label="Filter pending bill status"
            >
              <option value="All">Bills: All Pending &amp; Partial</option>
              <option value="Partial Paid">Bills: Partial Paid Only</option>
              <option value="Pending">Bills: Pending (0 Paid)</option>
            </select>
          </div>

          {/* Custom Due Status Filter */}
          <div>
            <select
              value={customStatusFilter}
              onChange={(e) => setCustomStatusFilter(e.target.value as 'All' | 'pending' | 'settled')}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              aria-label="Filter manual due status"
            >
              <option value="pending">Manual Dues: Pending</option>
              <option value="settled">Manual Dues: Settled</option>
              <option value="All">Manual Dues: All</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading pending dues &amp; reminders...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: Pending Bills */}
          {showBillsSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Pending Bill Receivables ({bills.length})
                </h3>
                <span className="text-xs font-semibold text-amber-300">
                  ₹{totalPendingBillsAmount.toLocaleString('en-IN')} pending
                </span>
              </div>

              {bills.length === 0 ? (
                <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                  <Clock className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white mb-1">No Pending Bills</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {search || statusFilter !== 'All' || reminderDueOnly
                      ? 'No pending bills matched your active search or filters.'
                      : 'All customer bills are fully cleared.'}
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
                          <th className="py-3 px-4">Party &amp; A/C No.</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4 text-right">Paid</th>
                          <th className="py-3 px-4 text-right">Pending</th>
                          <th className="py-3 px-4">Manual Reminder</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {bills.map((b) => {
                          const dueNow = isReminderDueNow(b.reminder_date, b.reminder_time);

                          return (
                            <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 sm:px-6 font-mono font-bold text-white whitespace-nowrap">
                                <button
                                  onClick={() => onNavigate('bill-detail', b.id)}
                                  className="hover:text-amber-400 transition-colors text-left"
                                >
                                  {b.bill_number}
                                </button>
                              </td>

                              <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{b.bill_date}</td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-white truncate max-w-xs">
                                    {b.customer_name}
                                  </span>
                                  {b.customer_account_number && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                                      A/C #{b.customer_account_number}
                                    </span>
                                  )}
                                </div>
                                {b.customer_phone && (
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3" />
                                    <span>{b.customer_phone}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right font-medium text-slate-300 whitespace-nowrap">
                                ₹{b.total_amount.toLocaleString('en-IN')}
                              </td>

                              <td className="py-3 px-4 text-right font-medium text-emerald-400 whitespace-nowrap">
                                ₹{b.paid_amount.toLocaleString('en-IN')}
                              </td>

                              <td className="py-3 px-4 text-right font-bold text-amber-400 text-sm whitespace-nowrap">
                                ₹{b.pending_amount.toLocaleString('en-IN')}
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                {b.reminder_date ? (
                                  <div className="space-y-0.5">
                                    <div
                                      className={`flex items-center gap-1.5 font-semibold text-[11px] ${dueNow ? 'text-rose-400 font-bold' : 'text-slate-200'
                                        }`}
                                    >
                                      <Calendar className="w-3 h-3 shrink-0" />
                                      <span>
                                        {b.reminder_date}
                                        {b.reminder_time ? ` • ${b.reminder_time}` : ''}
                                      </span>
                                      {dueNow ? (
                                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                                          Due!
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                          Scheduled
                                        </span>
                                      )}
                                    </div>
                                    {b.reminder_note && (
                                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={b.reminder_note}>
                                        {b.reminder_note}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openBillReminderModal(b)}
                                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
                                  >
                                    + Set Date &amp; Time
                                  </button>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${b.payment_status === 'Partial Paid'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    }`}
                                >
                                  {b.payment_status}
                                </span>
                              </td>

                              <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedBillForPayment(b)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-sm transition-colors"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Pay</span>
                                  </button>
                                  <button
                                    onClick={() => openBillReminderModal(b)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[11px] border border-slate-700 transition-colors"
                                    title="Set or Edit Reminder Date & Time"
                                  >
                                    <Bell className="w-3 h-3" />
                                    <span>Reminder</span>
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
            </div>
          )}

          {/* SECTION 2: Custom Manual Due Items & Reminders */}
          {showCustomSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Manual Due Items &amp; Reminders ({customDues.length})
                </h3>
                <button
                  onClick={openCreateCustomDueModal}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Due Item</span>
                </button>
              </div>

              {customDues.length === 0 ? (
                <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                  <Bell className="w-10 h-10 text-amber-500/50 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white mb-1">No Manual Due Items</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
                    Add standalone due items with exact date and time reminders for old balances or non-bill follow-ups.
                  </p>
                  <button
                    onClick={openCreateCustomDueModal}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
                  >
                    + Add Due Reminder
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4 sm:px-6">Party &amp; A/C No.</th>
                          <th className="py-3 px-4">Due Title &amp; Notes</th>
                          <th className="py-3 px-4 text-right">Due Amount</th>
                          <th className="py-3 px-4">Reminder Date &amp; Time</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {customDues.map((due) => {
                          const dueNow =
                            due.status === 'pending' && isReminderDueNow(due.reminder_date, due.reminder_time);

                          return (
                            <tr key={due.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 sm:px-6">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-white">{due.party_name}</span>
                                  {due.party_account_number && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                                      A/C #{due.party_account_number}
                                    </span>
                                  )}
                                </div>
                                {due.party_phone && (
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3" />
                                    <span>{due.party_phone}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-200">{due.title}</div>
                                {due.notes && (
                                  <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">{due.notes}</div>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right font-bold text-amber-400 text-sm whitespace-nowrap">
                                ₹{due.due_amount.toLocaleString('en-IN')}
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                {due.reminder_date ? (
                                  <div
                                    className={`flex items-center gap-1.5 font-semibold text-[11px] ${dueNow ? 'text-rose-400 font-bold' : 'text-slate-200'
                                      }`}
                                  >
                                    <Calendar className="w-3 h-3 shrink-0" />
                                    <span>
                                      {due.reminder_date}
                                      {due.reminder_time ? ` • ${due.reminder_time}` : ''}
                                    </span>
                                    {dueNow && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                                        Due!
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">No date set</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${due.status === 'settled'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    }`}
                                >
                                  {due.status === 'settled' ? 'Settled' : 'Pending'}
                                </span>
                              </td>

                              <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleToggleCustomDueStatus(due)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${due.status === 'pending'
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                      }`}
                                    title={due.status === 'pending' ? 'Mark Settled' : 'Reopen Pending'}
                                  >
                                    {due.status === 'pending' ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Settle</span>
                                      </>
                                    ) : (
                                      <>
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Reopen</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openEditCustomDueModal(due)}
                                    className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                                    title="Edit Due Reminder"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setCustomDueToDelete(due)}
                                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                                    title="Delete Due Item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
            </div>
          )}
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
            fetchAllDues();
          }}
        />
      )}

      {/* Bill Manual Date & Time Reminder Modal */}
      {billForReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Set Bill Reminder Date &amp; Time</h3>
              </div>
              <button
                onClick={() => setBillForReminder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillReminder} className="p-6 space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="font-mono font-bold text-white">{billForReminder.bill_number}</span>
                  <span className="font-bold text-amber-400">
                    Pending: ₹{billForReminder.pending_amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-slate-400">
                  {billForReminder.customer_name}
                  {billForReminder.customer_account_number && ` (A/C #${billForReminder.customer_account_number})`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Reminder Date
                  </label>
                  <input
                    type="date"
                    value={billReminderDate}
                    onChange={(e) => setBillReminderDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Reminder Time
                  </label>
                  <input
                    type="time"
                    value={billReminderTime}
                    onChange={(e) => setBillReminderTime(e.target.value)}
                    disabled={!billReminderDate}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500 disabled:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Reminder Note (Optional)
                </label>
                <input
                  type="text"
                  value={billReminderNote}
                  onChange={(e) => setBillReminderNote(e.target.value)}
                  placeholder="e.g., Call party at 5 PM for cheque collection"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClearBillReminder}
                  disabled={savingBillReminder}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/40 text-rose-400 text-xs font-semibold transition-colors"
                >
                  Clear Reminder
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBillForReminder(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBillReminder}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {savingBillReminder ? 'Saving...' : 'Save Reminder'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Due Item Create / Edit Modal */}
      {isCustomDueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {editingCustomDue ? 'Edit Manual Due Reminder' : 'Add Manual Due Reminder'}
                </h3>
              </div>
              <button
                onClick={() => setIsCustomDueModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomDue} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Party Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={duePartyName}
                    onChange={(e) => setDuePartyName(e.target.value)}
                    placeholder="Enter party / customer name"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Party A/C No.
                  </label>
                  <input
                    type="text"
                    value={duePartyAccount}
                    onChange={(e) => setDuePartyAccount(e.target.value)}
                    placeholder="e.g., 101"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Due Title / Reason
                  </label>
                  <input
                    type="text"
                    value={dueTitle}
                    onChange={(e) => setDueTitle(e.target.value)}
                    placeholder="e.g., Opening Khata Balance"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={duePartyPhone}
                    onChange={(e) => setDuePartyPhone(e.target.value)}
                    placeholder="Optional contact number"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Due Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={dueAmount}
                  onChange={(e) => setDueAmount(e.target.value)}
                  placeholder="Enter pending due amount..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Custom Reminder Date
                  </label>
                  <input
                    type="date"
                    value={dueReminderDate}
                    onChange={(e) => setDueReminderDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Custom Reminder Time
                  </label>
                  <input
                    type="time"
                    value={dueReminderTime}
                    onChange={(e) => setDueReminderTime(e.target.value)}
                    disabled={!dueReminderDate}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500 disabled:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={dueNotes}
                  onChange={(e) => setDueNotes(e.target.value)}
                  placeholder="Follow-up instructions or remarks..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomDueModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomDue}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingCustomDue ? 'Saving...' : editingCustomDue ? 'Update Due Reminder' : 'Save Due Reminder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!customDueToDelete}
        onClose={() => setCustomDueToDelete(null)}
        onConfirm={handleDeleteCustomDueConfirm}
        title="Delete Due Reminder"
        message={
          customDueToDelete
            ? `Are you sure you want to delete the manual due reminder for "${customDueToDelete.party_name}" (₹${customDueToDelete.due_amount.toLocaleString('en-IN')})?`
            : ''
        }
        confirmText="Delete"
        isDestructive
        isLoading={deletingCustomDue}
      />
    </div>
  );
};
