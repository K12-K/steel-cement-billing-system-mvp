import React, { useState, useEffect, useCallback } from 'react';
import { 
  Edit3, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Layers, 
  Save, 
  AlertCircle, 
  Clock, 
  CreditCard 
} from 'lucide-react';
import { Bill, Product } from '../types';
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

interface EditBillProps {
  billId: string;
  onNavigate: (view: string, id?: string) => void;
}

export const EditBill: React.FC<EditBillProps> = ({ billId, onNavigate }) => {
  const { showToast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerTaluko, setCustomerTaluko] = useState<string>('');
  const [customerDistrict, setCustomerDistrict] = useState<string>('');
  const [customerState, setCustomerState] = useState<string>('');
  const [billDate, setBillDate] = useState<string>('');
  const [reminderType, setReminderType] = useState<string>('No Reminder');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<EditBillItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [billRes, prodRes] = await Promise.all([
        api.bills.get(billId),
        api.products.list(),
      ]);

      if (billRes.success && billRes.bill) {
        const b = billRes.bill;
        setBill(b);
        setCustomerName(b.customer_name);
        setCustomerPhone(b.customer_phone);
        setCustomerAddress(b.customer_address || '');
        setCustomerTaluko(b.customer_taluko || '');
        setCustomerDistrict(b.customer_district || '');
        setCustomerState(b.customer_state || '');
        setBillDate(b.bill_date);
        setReminderType(b.reminder_type || 'No Reminder');
        setNotes(b.notes || '');

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

  const subtotal = Math.round(items.reduce((s, it) => s + (it.total || 0), 0) * 100) / 100;
  const totalAmount = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Customer name and phone number are required.');
      return;
    }

    if (items.length === 0) {
      setError('Bill must have at least one item.');
      return;
    }

    if (bill && bill.paid_amount > totalAmount) {
      setError(`New bill total (₹${totalAmount}) cannot be less than already recorded payments (₹${bill.paid_amount}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        customer_taluko: customerTaluko.trim(),
        customer_district: customerDistrict.trim(),
        customer_state: customerState.trim(),
        bill_date: billDate,
        reminder_type: reminderType,
        notes: notes.trim(),
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
            Customer Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Updated Bill Total:
            </span>
            <span className="text-lg font-black text-white">
              ₹{totalAmount.toLocaleString('en-IN')}
            </span>
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
