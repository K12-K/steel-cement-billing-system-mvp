import React, { useState, useEffect, useCallback } from 'react';
import {
  Edit3,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Clock,
  Hash,
  Hammer,
  Tag
} from 'lucide-react';
import { Bill, Customer, Product, LaborChargeItem } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface EditBillItem {
  variant_id: string;
  product_id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  unit: string;
  quantity: string;
  rate: string;
  total: number;
}

interface EditLaborItem {
  id: string;
  description: string;
  quantity: string;
  rate: string;
  amount: number;
}

interface EditBillProps {
  billId: string;
  onNavigate: (view: string, id?: string) => void;
}

export const EditBill: React.FC<EditBillProps> = ({ billId, onNavigate }) => {
  const { showToast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [customerAccountNumber, setCustomerAccountNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerTaluko, setCustomerTaluko] = useState<string>('');
  const [customerDistrict, setCustomerDistrict] = useState<string>('');
  const [customerState, setCustomerState] = useState<string>('');
  const [billDate, setBillDate] = useState<string>('');
  const [reminderDate, setReminderDate] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('');
  const [reminderNote, setReminderNote] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<EditBillItem[]>([]);
  const [laborItems, setLaborItems] = useState<EditLaborItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [billRes, prodRes, custRes] = await Promise.all([
        api.bills.get(billId),
        api.products.list(),
        api.customers.list(),
      ]);

      if (custRes.success) {
        setCustomers(custRes.customers);
      }

      if (billRes.success && billRes.bill) {
        const b = billRes.bill;
        setBill(b);
        setCustomerAccountNumber(b.customer_account_number || '');
        setCustomerName(b.customer_name);
        setCustomerPhone(b.customer_phone || '');
        setCustomerAddress(b.customer_address || '');
        setCustomerTaluko(b.customer_taluko || '');
        setCustomerDistrict(b.customer_district || '');
        setCustomerState(b.customer_state || '');
        setBillDate(b.bill_date);
        setReminderDate(b.reminder_date || '');
        setReminderTime(b.reminder_time || '');
        setReminderNote(b.reminder_note || '');
        setNotes(b.notes || '');
        setDiscountAmount(b.discount_amount ? String(b.discount_amount) : '');

        if (b.labor_items && b.labor_items.length > 0) {
          setLaborItems(
            b.labor_items.map(l => ({
              id: l.id,
              description: l.description,
              quantity: String(l.quantity),
              rate: String(l.rate),
              amount: l.amount,
            }))
          );
        } else if (b.labor_charges && b.labor_charges > 0) {
          setLaborItems([
            {
              id: `labor_${Date.now()}`,
              description: 'Labor Charges (Majuri)',
              quantity: '1',
              rate: String(b.labor_charges),
              amount: b.labor_charges,
            },
          ]);
        } else {
          setLaborItems([]);
        }

        setItems(
          (b.items || []).map(it => ({
            variant_id: it.variant_id,
            product_id: it.product_id,
            product_name_snapshot: it.product_name_snapshot,
            variant_name_snapshot: it.variant_name_snapshot,
            unit: it.unit,
            quantity: String(it.quantity),
            rate: String(it.rate),
            total: it.total,
          }))
        );
      }

      if (prodRes.success) {
        setProducts(prodRes.products.filter(p => p.status === 'active'));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load bill for editing.', 'error');
    } finally {
      setLoading(false);
    }
  }, [billId, showToast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleAccountNumberChange = (val: string) => {
    setCustomerAccountNumber(val);
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;
    const matched = customers.find(
      c => c.account_number && c.account_number.trim().toLowerCase() === trimmed
    );
    if (matched) {
      setCustomerName(matched.name);
      setCustomerPhone(matched.phone || '');
      setCustomerAddress(matched.address || '');
      setCustomerTaluko(matched.taluko || '');
      setCustomerDistrict(matched.district || '');
      setCustomerState(matched.state || '');
    }
  };

  const handleQtyChange = (index: number, val: string) => {
    setItems(prev => {
      const updated = [...prev];
      const qty = parseFloat(val) || 0;
      const rate = parseFloat(updated[index].rate) || 0;
      updated[index] = {
        ...updated[index],
        quantity: val,
        total: Math.round(qty * rate * 100) / 100,
      };
      return updated;
    });
  };

  const handleRateChange = (index: number, val: string) => {
    setItems(prev => {
      const updated = [...prev];
      const qty = parseFloat(updated[index].quantity) || 0;
      const rate = parseFloat(val) || 0;
      updated[index] = {
        ...updated[index],
        rate: val,
        total: Math.round(qty * rate * 100) / 100,
      };
      return updated;
    });
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    const firstVar = firstProd.variants[0];
    if (!firstVar) return;

    setItems(prev => [
      ...prev,
      {
        variant_id: firstVar.id,
        product_id: firstProd.id,
        product_name_snapshot: firstProd.name,
        variant_name_snapshot: firstVar.variant_name,
        unit: firstVar.unit,
        quantity: '10',
        rate: String(firstVar.price),
        total: Math.round(10 * firstVar.price * 100) / 100,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) {
      setError('Bill must have at least one product item.');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Labor handlers
  const handleAddLaborRow = () => {
    setLaborItems(prev => [
      ...prev,
      {
        id: `labor_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        description: 'Loading / Unloading (Majuri)',
        quantity: '1',
        rate: '500',
        amount: 500,
      },
    ]);
  };

  const handleRemoveLaborRow = (index: number) => {
    setLaborItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleLaborChange = (index: number, field: 'description' | 'quantity' | 'rate', val: string) => {
    setLaborItems(prev => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: val };
      const q = parseFloat(current.quantity) || 0;
      const r = parseFloat(current.rate) || 0;
      current.amount = Math.round(q * r * 100) / 100;
      updated[index] = current;
      return updated;
    });
  };

  const subtotal = Math.round(items.reduce((s, it) => s + (it.total || 0), 0) * 100) / 100;
  const laborTotal = Math.round(laborItems.reduce((s, l) => s + (l.amount || 0), 0) * 100) / 100;
  const grossBeforeDiscount = Math.round((subtotal + laborTotal) * 100) / 100;
  const parsedDiscount = Math.max(0, Math.round((parseFloat(discountAmount) || 0) * 100) / 100);
  const totalAmount = Math.max(0, Math.round((grossBeforeDiscount - parsedDiscount) * 100) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || (!customerPhone.trim() && !customerAccountNumber.trim())) {
      setError('Customer name and either Party Account Number or Phone Number are required.');
      return;
    }

    if (items.length === 0) {
      setError('Bill must have at least one item.');
      return;
    }

    if (parsedDiscount > grossBeforeDiscount) {
      setError(`Net discount (₹${parsedDiscount}) cannot exceed gross total (₹${grossBeforeDiscount}).`);
      return;
    }

    if (bill && bill.paid_amount > totalAmount) {
      setError(`New bill total (₹${totalAmount}) cannot be less than already recorded payments (₹${bill.paid_amount}).`);
      return;
    }

    const formattedLaborItems: LaborChargeItem[] = laborItems
      .filter(l => l.description.trim() || l.amount > 0)
      .map(l => ({
        id: l.id,
        description: l.description.trim() || 'Labor Charges (Majuri)',
        quantity: parseFloat(l.quantity) || 1,
        rate: parseFloat(l.rate) || 0,
        amount: l.amount,
      }));

    setIsSubmitting(true);
    try {
      const payload = {
        customer_account_number: customerAccountNumber.trim(),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        customer_taluko: customerTaluko.trim(),
        customer_district: customerDistrict.trim(),
        customer_state: customerState.trim(),
        bill_date: billDate,
        reminder_date: reminderDate || null,
        reminder_time: reminderDate && reminderTime ? reminderTime : null,
        reminder_note: reminderNote.trim(),
        notes: notes.trim(),
        labor_items: formattedLaborItems,
        labor_charges: laborTotal,
        discount_amount: parsedDiscount,
        items: items.map(it => ({
          variant_id: it.variant_id,
          quantity: parseFloat(it.quantity),
          rate: parseFloat(it.rate),
        })),
      };

      const res = await api.bills.update(billId, payload);
      if (res.success) {
        showToast(res.message, 'success');
        onNavigate('bill-detail', billId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update bill.');
      showToast(err.message || 'Failed to update bill.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !bill) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-3 text-xs text-slate-400">Loading bill for revision...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('bill-detail', bill.id)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-500" />
              Edit Bill #{bill.bill_number}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Modifying items will automatically reverse previous inventory deductions and apply new stock adjustments.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer Information */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-800">
            Party Account &amp; Customer Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1.5">
                Party A/C No.
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={customerAccountNumber}
                  onChange={(e) => handleAccountNumberChange(e.target.value)}
                  placeholder="e.g. 101"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-amber-500/40 rounded-xl text-sm font-mono font-bold text-amber-300 focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Customer Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
                required
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Bill Date
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Taluko
              </label>
              <input
                type="text"
                value={customerTaluko}
                onChange={(e) => setCustomerTaluko(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                District
              </label>
              <input
                type="text"
                value={customerDistrict}
                onChange={(e) => setCustomerDistrict(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Material Items ({items.length})
            </h3>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
              >
                <div className="sm:col-span-5">
                  <div className="text-xs font-bold text-white">{it.product_name_snapshot}</div>
                  <div className="text-[11px] text-slate-400">{it.variant_name_snapshot} ({it.unit})</div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                    Qty ({it.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                    Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={it.rate}
                    onChange={(e) => handleRateChange(idx, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2 text-right">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                    Total
                  </label>
                  <span className="text-xs font-black text-white">
                    ₹{it.total.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Labor Charges & Discount */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Hammer className="w-4 h-4 text-amber-400" />
              Labor Charges (Majuri) &amp; Net Discount
            </h3>
            <button
              type="button"
              onClick={handleAddLaborRow}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Labor Charge</span>
            </button>
          </div>

          {laborItems.length > 0 && (
            <div className="space-y-2.5">
              {laborItems.map((l, idx) => (
                <div key={l.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Description</label>
                    <input
                      type="text"
                      value={l.description}
                      onChange={(e) => handleLaborChange(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Qty</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={l.quantity}
                      onChange={(e) => handleLaborChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Rate (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={l.rate}
                      onChange={(e) => handleLaborChange(idx, 'rate', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 text-right">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Amount</label>
                    <span className="text-xs font-bold text-amber-300">+₹{l.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveLaborRow(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1.5">
                <Tag className="w-3.5 h-3.5" />
                Net Discount (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max={grossBeforeDiscount}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-bold text-emerald-400 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Materials Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>+ Labor Charges (Majuri):</span>
                <span>+₹{laborTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>- Net Discount:</span>
                <span>-₹{parsedDiscount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-sm">
                <span className="font-bold text-white uppercase">Updated Bill Total:</span>
                <span className="text-lg font-black text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Reminder Date & Time + Notes */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Payment Reminder Date &amp; Time + Notes
            </h3>
            {(reminderDate || reminderTime || reminderNote) && (
              <button
                type="button"
                onClick={() => {
                  setReminderDate('');
                  setReminderTime('');
                  setReminderNote('');
                }}
                className="text-[11px] text-slate-400 hover:text-white underline"
              >
                Clear Reminder
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Reminder Date</label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Reminder Time</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                disabled={!reminderDate}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white disabled:opacity-40"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Reminder Note</label>
              <input
                type="text"
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                placeholder="e.g. Call party before noon"
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Invoice Notes / Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => onNavigate('bill-detail', bill.id)}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-950/50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save &amp; Recalculate Inventory</span>
          </button>
        </div>
      </form>
    </div>
  );
};
