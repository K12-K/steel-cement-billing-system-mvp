import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Plus,
  Search,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { RozmelEntry, RozmelSummary, RozmelDailyBreakdown } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from '../components/ConfirmationModal';

const CATEGORY_SUGGESTIONS = [
  'General Cash',
  'Cash Sale',
  'Labor / Majuri',
  'Transport / Diesel',
  'Shop Expense',
  'Supplier Cash',
  'Personal Withdrawal',
  'Miscellaneous',
];

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const Rozmel: React.FC = () => {
  const { showToast } = useToast();

  const [entries, setEntries] = useState<RozmelEntry[]>([]);
  const [summary, setSummary] = useState<RozmelSummary>({
    filtered_in: 0,
    filtered_out: 0,
    filtered_net: 0,
    today_in: 0,
    today_out: 0,
    today_net: 0,
    overall_in: 0,
    overall_out: 0,
    overall_balance: 0,
    total_entries: 0,
  });
  const [dailyBreakdown, setDailyBreakdown] = useState<RozmelDailyBreakdown[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'single' | 'range'>('all');
  const [singleDate, setSingleDate] = useState<string>(getTodayDateString());
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [search, setSearch] = useState<string>('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<RozmelEntry | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [entryDate, setEntryDate] = useState<string>(getTodayDateString());
  const [entryTime, setEntryTime] = useState<string>(getCurrentTimeString());
  const [entryType, setEntryType] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState<string>('');
  const [particulars, setParticulars] = useState<string>('');
  const [category, setCategory] = useState<string>('General Cash');
  const [notes, setNotes] = useState<string>('');

  // Delete Confirmation Modal
  const [entryToDelete, setEntryToDelete] = useState<RozmelEntry | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params: { date?: string; from_date?: string; to_date?: string; type?: string; search?: string } = {};

      if (dateFilterMode === 'single' && singleDate) {
        params.date = singleDate;
      } else if (dateFilterMode === 'range') {
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.rozmel.list(params);
      if (res.success) {
        setEntries(res.entries);
        setSummary(res.summary);
        setDailyBreakdown(res.daily_breakdown);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load Rozmel cash book entries.', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFilterMode, singleDate, fromDate, toDate, typeFilter, search, showToast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const openAddModal = (defaultType: 'in' | 'out') => {
    setEditingEntry(null);
    setEntryDate(dateFilterMode === 'single' && singleDate ? singleDate : getTodayDateString());
    setEntryTime(getCurrentTimeString());
    setEntryType(defaultType);
    setAmount('');
    setParticulars('');
    setCategory('General Cash');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (entry: RozmelEntry) => {
    setEditingEntry(entry);
    setEntryDate(entry.entry_date);
    setEntryTime(entry.entry_time || '09:00');
    setEntryType(entry.type);
    setAmount(String(entry.amount));
    setParticulars(entry.particulars);
    setCategory(entry.category || 'General Cash');
    setNotes(entry.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast('Please enter a valid amount greater than zero.', 'error');
      return;
    }
    if (!particulars.trim()) {
      showToast('Particulars / description is required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        entry_date: entryDate || getTodayDateString(),
        entry_time: entryTime || getCurrentTimeString(),
        type: entryType,
        amount: numericAmount,
        particulars: particulars.trim(),
        category: category.trim() || 'General Cash',
        notes: notes.trim(),
      };

      if (editingEntry) {
        const res = await api.rozmel.update(editingEntry.id, payload);
        if (res.success) {
          showToast('Rozmel entry updated successfully.', 'success');
          setIsModalOpen(false);
          fetchEntries();
        }
      } else {
        const res = await api.rozmel.create(payload);
        if (res.success) {
          showToast(res.message || 'Rozmel entry recorded.', 'success');
          setIsModalOpen(false);
          fetchEntries();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save Rozmel entry.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    try {
      setDeleting(true);
      const res = await api.rozmel.delete(entryToDelete.id);
      if (res.success) {
        showToast('Rozmel entry deleted.', 'success');
        setEntryToDelete(null);
        fetchEntries();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete entry.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setDateFilterMode('all');
    setSingleDate(getTodayDateString());
    setFromDate('');
    setToDate('');
    setTypeFilter('all');
    setSearch('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Standalone Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Rozmel / Daily Cash Book</h2>
              <p className="text-xs text-slate-400">
                Standalone daily cash inflow &amp; outflow ledger — completely independent from bills and pending dues.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openAddModal('in')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Cash In (Jama)</span>
          </button>
          <button
            onClick={() => openAddModal('out')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Cash Out (Udhar)</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-emerald-900/40 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Today&apos;s Cash In</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-300">
            ₹{summary.today_in.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cash received today ({getTodayDateString()})</p>
        </div>

        <div className="p-4 bg-slate-900 border border-rose-900/40 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Today&apos;s Cash Out</span>
            <span className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-300">
            ₹{summary.today_out.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cash paid out / expenses today</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today&apos;s Net</span>
            <span className="p-1.5 rounded-lg bg-slate-800 text-amber-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className={`mt-2 text-2xl font-black ${summary.today_net >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {summary.today_net >= 0 ? '+' : '-'}₹{Math.abs(summary.today_net).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Today&apos;s inflow minus outflow</p>
        </div>

        <div className="p-4 bg-slate-900 border border-amber-600/30 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Overall Cash Balance</span>
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className={`mt-2 text-2xl font-black ${summary.overall_balance >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
            {summary.overall_balance < 0 ? '-' : ''}₹{Math.abs(summary.overall_balance).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total In: ₹{summary.overall_in.toLocaleString('en-IN')} • Out: ₹{summary.overall_out.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Search */}
          <div className="md:col-span-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Search Entries
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search particulars, category, or notes..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Entry Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'in' | 'out')}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="all">All (In &amp; Out)</option>
              <option value="in">Cash In (Jama) Only</option>
              <option value="out">Cash Out (Udhar) Only</option>
            </select>
          </div>

          {/* Date Filter Mode */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Date Scope
            </label>
            <select
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value as 'all' | 'single' | 'range')}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="all">All Dates</option>
              <option value="single">Specific Date</option>
              <option value="range">Date Range</option>
            </select>
          </div>

          {/* Dynamic Date Picker(s) */}
          {dateFilterMode === 'single' && (
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Select Date
              </label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          )}

          {dateFilterMode === 'range' && (
            <>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </>
          )}

          {/* Quick Buttons */}
          <div className={`flex items-center gap-2 ${dateFilterMode === 'all' ? 'md:col-span-4 justify-end' : dateFilterMode === 'single' ? 'md:col-span-1 justify-end' : 'md:col-span-12 justify-end'}`}>
            <button
              onClick={() => {
                setDateFilterMode('single');
                setSingleDate(getTodayDateString());
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                dateFilterMode === 'single' && singleDate === getTodayDateString()
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Today
            </button>
            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={fetchEntries}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filtered Period Totals Strip */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>Showing <strong className="text-white">{summary.total_entries}</strong> ledger entries</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-emerald-400 font-semibold">
              Filtered In: +₹{summary.filtered_in.toLocaleString('en-IN')}
            </span>
            <span className="text-rose-400 font-semibold">
              Filtered Out: -₹{summary.filtered_out.toLocaleString('en-IN')}
            </span>
            <span className={`font-bold px-2.5 py-0.5 rounded-lg border ${
              summary.filtered_net >= 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              Period Net: {summary.filtered_net >= 0 ? '+' : '-'}₹{Math.abs(summary.filtered_net).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Quick Strip */}
      {dailyBreakdown.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Daily Cash Summary (Click a day to filter)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {dailyBreakdown.slice(0, 8).map((day) => {
              const isSelected = dateFilterMode === 'single' && singleDate === day.date;
              return (
                <button
                  key={day.date}
                  onClick={() => {
                    if (isSelected) {
                      setDateFilterMode('all');
                    } else {
                      setDateFilterMode('single');
                      setSingleDate(day.date);
                    }
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-md'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      {day.date}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                      {day.count} {day.count === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-medium">In: ₹{day.cash_in.toLocaleString('en-IN')}</span>
                    <span className="text-rose-400 font-medium">Out: ₹{day.cash_out.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={`mt-1 pt-1 border-t border-slate-800/80 text-xs font-bold flex justify-between ${
                    day.net >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    <span className="text-slate-400 font-normal">Day Net:</span>
                    <span>{day.net >= 0 ? '+' : '-'}₹{Math.abs(day.net).toLocaleString('en-IN')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Entries Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading Rozmel entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <BookOpen className="w-12 h-12 text-amber-500/50 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Rozmel Entries Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            {search || typeFilter !== 'all' || dateFilterMode !== 'all'
              ? 'No daily cash entries match your active filters. Try resetting filters or adding a new entry.'
              : 'Start recording your daily manual cash inflow (Jama) and cash outflow (Udhar) here.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => openAddModal('in')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              + Add Cash In
            </button>
            <button
              onClick={() => openAddModal('out')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
            >
              + Add Cash Out
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Date &amp; Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Particulars &amp; Notes</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                      <div className="font-semibold text-white">{entry.entry_date}</div>
                      {entry.entry_time && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{entry.entry_time}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {entry.type === 'in' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          Cash In (Jama)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Cash Out (Udhar)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{entry.particulars}</div>
                      {entry.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">{entry.notes}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                        {entry.category || 'General Cash'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className={`text-sm font-black ${entry.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {entry.type === 'in' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(entry)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Edit Entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEntryToDelete(entry)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Delete Entry"
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
        </div>
      )}

      {/* Add / Edit Rozmel Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <BookOpen className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-white">
                  {editingEntry ? 'Edit Rozmel Cash Entry' : 'New Rozmel Cash Entry'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="p-6 space-y-4">
              {/* Type Toggle */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEntryType('in')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      entryType === 'in'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Cash In (Jama)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('out')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      entryType === 'out'
                        ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Cash Out (Udhar)</span>
                  </button>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter cash amount..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Particulars */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Particulars / Description *
                </label>
                <input
                  type="text"
                  required
                  value={particulars}
                  onChange={(e) => setParticulars(e.target.value)}
                  placeholder="e.g., Counter cash sales, Tempo diesel, Tea/Shop expense..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  list="rozmel-categories"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Select or type category"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
                <datalist id="rozmel-categories">
                  {CATEGORY_SUGGESTIONS.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional manual remark..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition-all disabled:opacity-50 ${
                    entryType === 'in'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : editingEntry ? 'Update Entry' : 'Save Cash Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Rozmel Entry"
        message={
          entryToDelete
            ? `Are you sure you want to delete "${entryToDelete.particulars}" (${entryToDelete.type === 'in' ? '+' : '-'}₹${entryToDelete.amount.toLocaleString('en-IN')}) dated ${entryToDelete.entry_date}?`
            : ''
        }
        confirmText="Delete Entry"
        isDestructive
        isLoading={deleting}
      />
    </div>
  );
};
