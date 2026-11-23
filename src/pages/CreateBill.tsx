import React, { useState, useEffect, useCallback } from 'react';
import {
  FilePlus2,
  User,
  Phone,
  Plus,
  Trash2,
  Layers,
  Clock,
  CreditCard,
  AlertCircle,
  ArrowRight,
  Search,
  Check,
  Hash,
  Hammer,
  Tag
} from 'lucide-react';
import { Customer, Product, LaborChargeItem } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { BillConfirmationModal } from './BillConfirmationModal';

interface BillItemState {
  productId: string;
  variantId: string;
  unit: string;
  availableStock: number;
  quantity: string;
  rate: string;
  total: number;
}

interface LaborItemState {
  id: string;
  description: string;
  quantity: string;
  rate: string;
  amount: number;
}

interface CreateBillProps {
  onNavigate: (view: string, id?: string) => void;
  initialCustomerId?: string | null;
}

export const CreateBill: React.FC<CreateBillProps> = ({ onNavigate, initialCustomerId }) => {
  const { showToast } = useToast();

  // Core Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Bill Header
  const [billNumber, setBillNumber] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Customer Section
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerAccountNumber, setCustomerAccountNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerTaluko, setCustomerTaluko] = useState<string>('');
  const [customerDistrict, setCustomerDistrict] = useState<string>('');
  const [customerState, setCustomerState] = useState<string>('Gujarat');
  const [saveCustomer, setSaveCustomer] = useState<boolean>(true);

  // Customer dropdown search
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

  // Product Items
  const [items, setItems] = useState<BillItemState[]>([]);

  // Labor Charges (Majuri)
  const [laborItems, setLaborItems] = useState<LaborItemState[]>([]);

  // Net Discount
  const [discountAmount, setDiscountAmount] = useState<string>('');

  // Payment & Manual Reminder Section
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Partial Paid' | 'Full Paid'>('Partial Paid');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [reminderDate, setReminderDate] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('');
  const [reminderNote, setReminderNote] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Modals & Submitting
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const applyLinkedCustomer = useCallback((c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerAccountNumber(c.account_number || '');
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerAddress(c.address || '');
    setCustomerTaluko(c.taluko || '');
    setCustomerDistrict(c.district || '');
    setCustomerState(c.state || 'Gujarat');
  }, []);

  // Load next bill number, customers, and active products
  const loadInitialData = useCallback(async () => {
    try {
      setLoadingInitial(true);
      const [numRes, custRes, prodRes] = await Promise.all([
        api.bills.nextNumber(),
        api.customers.list(),
        api.products.list(),
      ]);

      if (numRes.success) setBillNumber(numRes.bill_number);
      if (custRes.success) {
        setCustomers(custRes.customers);
        if (initialCustomerId) {
          const targetCust = custRes.customers.find(c => c.id === initialCustomerId);
          if (targetCust) {
            applyLinkedCustomer(targetCust);
          }
        }
      }

      if (prodRes.success) {
        const activeProds = prodRes.products.filter(p => p.status === 'active');
        setProducts(activeProds);

        if (activeProds.length > 0) {
          const firstProd = activeProds[0];
          const firstVar = firstProd.variants[0];
          if (firstVar) {
            setItems([
              {
                productId: firstProd.id,
                variantId: firstVar.id,
                unit: firstVar.unit,
                availableStock: firstVar.stock_quantity,
                quantity: '100',
                rate: String(firstVar.price),
                total: Math.round(100 * firstVar.price * 100) / 100,
              },
            ]);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize billing screen.', 'error');
    } finally {
      setLoadingInitial(false);
    }
  }, [initialCustomerId, applyLinkedCustomer, showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Automatic Party Linkage when Account Number is entered
  const handleAccountNumberChange = (val: string) => {
    setCustomerAccountNumber(val);
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) {
      if (selectedCustomerId) {
        setSelectedCustomerId('');
      }
      return;
    }

    const matched = customers.find(
      c => c.account_number && c.account_number.trim().toLowerCase() === trimmed
    );

    if (matched) {
      applyLinkedCustomer(matched);
      setCustomerAccountNumber(val); // preserve user typing casing/whitespace while linking
    } else if (selectedCustomerId) {
      setSelectedCustomerId('');
    }
  };

  // Handle Customer Selection from dropdown
  const handleSelectCustomer = (c: Customer) => {
    applyLinkedCustomer(c);
    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerAccountNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerTaluko('');
    setCustomerDistrict('');
    setCustomerState('Gujarat');
  };

  // Add Item Row
  const handleAddItemRow = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    const firstVar = firstProd.variants[0];
    if (!firstVar) return;

    setItems(prev => [
      ...prev,
      {
        productId: firstProd.id,
        variantId: firstVar.id,
        unit: firstVar.unit,
        availableStock: firstVar.stock_quantity,
        quantity: '50',
        rate: String(firstVar.price),
        total: Math.round(50 * firstVar.price * 100) / 100,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) {
      setValidationError('Bill must contain at least one product item.');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Item changes
  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find(p => p.id === newProductId);
    if (!prod || !prod.variants.length) return;
    const firstVar = prod.variants[0];

    setItems(prev => {
      const updated = [...prev];
      const qty = parseFloat(updated[index].quantity) || 0;
      updated[index] = {
        ...updated[index],
        productId: newProductId,
        variantId: firstVar.id,
        unit: firstVar.unit,
        availableStock: firstVar.stock_quantity,
        rate: String(firstVar.price),
        total: Math.round(qty * firstVar.price * 100) / 100,
      };
      return updated;
    });
  };

  const handleVariantChange = (index: number, newVariantId: string) => {
    const item = items[index];
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return;
    const variant = prod.variants.find(v => v.id === newVariantId);
    if (!variant) return;

    setItems(prev => {
      const updated = [...prev];
      const qty = parseFloat(updated[index].quantity) || 0;
      updated[index] = {
        ...updated[index],
        variantId: variant.id,
        unit: variant.unit,
        availableStock: variant.stock_quantity,
        rate: String(variant.price),
        total: Math.round(qty * variant.price * 100) / 100,
      };
      return updated;
    });
  };

  const handleQtyChange = (index: number, val: string) => {
    setItems(prev => {
      const updated = [...prev];
      const numQty = parseFloat(val) || 0;
      const numRate = parseFloat(updated[index].rate) || 0;
      updated[index] = {
        ...updated[index],
        quantity: val,
        total: Math.round(numQty * numRate * 100) / 100,
      };
      return updated;
    });
  };

  const handleRateChange = (index: number, val: string) => {
    setItems(prev => {
      const updated = [...prev];
      const numQty = parseFloat(updated[index].quantity) || 0;
      const numRate = parseFloat(val) || 0;
      updated[index] = {
        ...updated[index],
        rate: val,
        total: Math.round(numQty * numRate * 100) / 100,
      };
      return updated;
    });
  };

  // Labor Charges (Majuri) handlers
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

  // Totals Calculation: Materials Subtotal + Labor Charges - Net Discount
  const subtotal = Math.round(items.reduce((sum, item) => sum + (item.total || 0), 0) * 100) / 100;
  const laborTotal = Math.round(laborItems.reduce((sum, l) => sum + (l.amount || 0), 0) * 100) / 100;
  const grossBeforeDiscount = Math.round((subtotal + laborTotal) * 100) / 100;
  const parsedDiscount = Math.max(0, Math.round((parseFloat(discountAmount) || 0) * 100) / 100);
  const totalAmount = Math.max(0, Math.round((grossBeforeDiscount - parsedDiscount) * 100) / 100);

  // Real-time Payment & Pending sync
  let calculatedPaid = 0;
  if (paymentStatus === 'Full Paid') {
    calculatedPaid = totalAmount;
  } else if (paymentStatus === 'Pending') {
    calculatedPaid = 0;
  } else {
    calculatedPaid = Math.min(totalAmount, Math.max(0, parseFloat(paidAmount) || 0));
  }
  const pendingAmount = Math.max(0, Math.round((totalAmount - calculatedPaid) * 100) / 100);

  // Sync paidAmount when switching to Partial Paid
  useEffect(() => {
    if (paymentStatus === 'Partial Paid' && (!paidAmount || parseFloat(paidAmount) === 0)) {
      setPaidAmount(String(Math.round(totalAmount * 0.5)));
    }
  }, [paymentStatus, totalAmount]);

  // Validation before opening Review modal
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!customerName.trim() || (!customerPhone.trim() && !customerAccountNumber.trim() && !selectedCustomerId)) {
      setValidationError('Customer Name and either Party Account Number or Phone Number are required.');
      return;
    }

    if (items.length === 0) {
      setValidationError('Please add at least one material/product item to the bill.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = parseFloat(it.quantity) || 0;
      const rate = parseFloat(it.rate);

      if (qty <= 0) {
        setValidationError(`Item #${i + 1} must have a quantity greater than 0.`);
        return;
      }
      if (isNaN(rate) || rate < 0) {
        setValidationError(`Item #${i + 1} rate cannot be negative.`);
        return;
      }

      if (qty > it.availableStock) {
        const prod = products.find(p => p.id === it.productId);
        const variant = prod?.variants.find(v => v.id === it.variantId);
        setValidationError(
          `Insufficient stock for "${variant?.variant_name || 'item'}". Requested: ${qty} ${it.unit}, but only ${it.availableStock} ${it.unit} is currently in stock.`
        );
        return;
      }
    }

    if (parsedDiscount > grossBeforeDiscount) {
      setValidationError(`Net discount (₹${parsedDiscount}) cannot exceed gross total (₹${grossBeforeDiscount}).`);
      return;
    }

    if (paymentStatus === 'Partial Paid') {
      const numPaid = parseFloat(paidAmount) || 0;
      if (numPaid <= 0) {
        setValidationError('For Partial Paid bills, please specify a valid paid amount greater than 0.');
        return;
      }
      if (numPaid > totalAmount) {
        setValidationError(`Paid amount (₹${numPaid}) cannot exceed total bill amount (₹${totalAmount}).`);
        return;
      }
    }

    setIsReviewOpen(true);
  };

  const formattedLaborItems: LaborChargeItem[] = laborItems
    .filter(l => l.description.trim() || l.amount > 0)
    .map(l => ({
      id: l.id,
      description: l.description.trim() || 'Labor Charges (Majuri)',
      quantity: parseFloat(l.quantity) || 1,
      rate: parseFloat(l.rate) || 0,
      amount: l.amount,
    }));

  // Final Confirmation & Submission
  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    setValidationError(null);

    try {
      const payload = {
        bill_number: billNumber,
        bill_date: billDate,
        customer_id: selectedCustomerId || undefined,
        customer_account_number: customerAccountNumber.trim() || undefined,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        customer_taluko: customerTaluko.trim(),
        customer_district: customerDistrict.trim(),
        customer_state: customerState.trim(),
        save_as_new_customer: !selectedCustomerId && saveCustomer,
        items: items.map(it => {
          const prod = products.find(p => p.id === it.productId);
          const v = prod?.variants.find(varItem => varItem.id === it.variantId);
          return {
            variant_id: it.variantId,
            product_name_snapshot: prod?.name || 'Material',
            variant_name_snapshot: v?.variant_name || 'Variant',
            unit: it.unit,
            quantity: parseFloat(it.quantity),
            rate: parseFloat(it.rate),
          };
        }),
        labor_items: formattedLaborItems,
        labor_charges: laborTotal,
        discount_amount: parsedDiscount,
        payment_status: paymentStatus,
        paid_amount: calculatedPaid,
        payment_mode: paymentMode,
        reminder_date: reminderDate || null,
        reminder_time: reminderDate && reminderTime ? reminderTime : null,
        reminder_note: reminderNote.trim() || undefined,
        notes: notes.trim(),
      };

      const res = await api.bills.create(payload);
      if (res.success && res.bill) {
        showToast(res.message || 'Bill created and stock updated successfully.', 'success');
        setIsReviewOpen(false);
        onNavigate('bill-detail', res.bill.id);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save bill.');
      showToast(err.message || 'Failed to save bill.', 'error');
      setIsReviewOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-3 text-xs text-slate-400">Initializing invoice generator...</p>
      </div>
    );
  }

  const filteredCustomers = customers.filter(c =>
    customerSearchQuery === ''
      ? true
      : c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (c.account_number && c.account_number.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(customerSearchQuery))
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-amber-500" />
            Create Material Dispatch Bill
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter Party Account Number for auto-linkage, add material items, labor charges (Majuri), net discount, and custom reminder.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Bill No:</span>
            <span className="text-xs font-mono font-bold text-amber-400">{billNumber}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Date:</span>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="bg-transparent text-xs text-white font-medium focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleProceedToReview} className="space-y-6">
        {validationError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 1. Customer Section with Party Account Number Auto-Link */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                1. Party Account &amp; Site Details
              </h3>
            </div>

            {/* Existing Customer Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-amber-300 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>
                  {selectedCustomerId ? 'Change Party' : 'Browse Party Directory'}
                </span>
              </button>

              {showCustomerDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-72 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-2 z-30 overflow-y-auto">
                  <div className="p-1 mb-2">
                    <input
                      type="text"
                      placeholder="Search A/C No., name, or phone..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-900 text-xs transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white flex items-center gap-1.5 truncate">
                            {c.account_number && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                                #{c.account_number}
                              </span>
                            )}
                            <span className="truncate">{c.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{c.phone || 'No phone'} • {c.district || c.taluko || '-'}</div>
                        </div>
                        {selectedCustomerId === c.id && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No party matches found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedCustomerId && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between text-xs text-emerald-300 flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                Automatically linked to Party Account Book:
                {customerAccountNumber && (
                  <strong className="px-1.5 py-0.5 rounded bg-emerald-500/20 font-mono text-emerald-200">
                    A/C #{customerAccountNumber}
                  </strong>
                )}
                <strong>{customerName}</strong>
              </span>
              <button
                type="button"
                onClick={handleClearCustomer}
                className="text-[11px] underline hover:text-white"
              >
                Clear &amp; Enter New Party
              </button>
            </div>
          )}

          {/* Party Account Number + Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1.5">
                Party Account No.
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={customerAccountNumber}
                  onChange={(e) => handleAccountNumberChange(e.target.value)}
                  placeholder="e.g. 101"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-amber-500/40 rounded-xl text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Type A/C No. to auto-link party &amp; book
              </p>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Party / Customer Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (selectedCustomerId) setSelectedCustomerId('');
                }}
                placeholder="e.g. Ramesh Patel (Patel Developers)"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Phone Number {!customerAccountNumber.trim() && !selectedCustomerId && <span className="text-rose-400">*</span>}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional if A/C No. entered"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  required={!customerAccountNumber.trim() && !selectedCustomerId}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Site / Delivery Address
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Plot no, Construction site location"
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Taluko / Tehsil
              </label>
              <input
                type="text"
                value={customerTaluko}
                onChange={(e) => setCustomerTaluko(e.target.value)}
                placeholder="Daskroi"
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
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
                placeholder="Ahmedabad"
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {!selectedCustomerId && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={saveCustomer}
                onChange={(e) => setSaveCustomer(e.target.checked)}
                className="rounded border-slate-700 text-amber-600 focus:ring-amber-500"
              />
              <span>Save this party (with Account Number) into directory for future automatic linkage</span>
            </label>
          )}
        </div>

        {/* 2. Product Items Section */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Material Items ({items.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const currentProd = products.find(p => p.id === item.productId);
              const availableVariants = currentProd?.variants || [];
              const numQty = parseFloat(item.quantity) || 0;
              const isOverStock = numQty > item.availableStock;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${isOverStock
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-slate-950/70 border-slate-800'
                    }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                        Product
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                        Variant / Size / Unit
                      </label>
                      <select
                        value={item.variantId}
                        onChange={(e) => handleVariantChange(idx, e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500"
                      >
                        {availableVariants.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.variant_name} ({v.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">
                          Qty ({item.unit})
                        </label>
                        <span className={`text-[10px] font-bold ${item.availableStock <= 10 ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                          Avail: {item.availableStock}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        className={`w-full px-2.5 py-2 bg-slate-900 border rounded-xl text-xs font-bold text-white focus:outline-hidden ${isOverStock
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-slate-700 focus:border-amber-500'
                          }`}
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                        Rate (₹ / {item.unit})
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleRateChange(idx, e.target.value)}
                          className="w-full pl-6 pr-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1 text-right">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                        Item Total
                      </label>
                      <span className="text-xs font-bold text-white whitespace-nowrap block py-2">
                        ₹{item.total.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="sm:col-span-1 flex justify-end items-center sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length <= 1}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isOverStock && (
                    <div className="mt-2 text-[11px] text-rose-400 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Quantity exceeds available stock ({item.availableStock} {item.unit}). Please reduce quantity or restock first.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Materials Subtotal:
            </span>
            <span className="text-base font-bold text-white">
              ₹{subtotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* 3. Labor Charges (Majuri) & Net Discount Section */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Hammer className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                3. Labor Charges (Majuri) &amp; Net Discount
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddLaborRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Labor Charge (Majuri)</span>
            </button>
          </div>

          {laborItems.length === 0 ? (
            <div className="p-3.5 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
              <span>No labor charges (Majuri) added to this bill.</span>
              <button
                type="button"
                onClick={handleAddLaborRow}
                className="text-amber-400 hover:text-amber-300 font-semibold underline"
              >
                + Add Majuri Line Item
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {laborItems.map((l, idx) => (
                <div key={l.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                      Labor / Majuri Particulars
                    </label>
                    <input
                      type="text"
                      value={l.description}
                      onChange={(e) => handleLaborChange(idx, 'description', e.target.value)}
                      placeholder="e.g. Loading / Unloading / Hamali"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                      Qty / Trips
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={l.quantity}
                      onChange={(e) => handleLaborChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={l.rate}
                      onChange={(e) => handleLaborChange(idx, 'rate', e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2 text-right">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                      Labor Total
                    </label>
                    <span className="text-xs font-bold text-amber-300 block py-2">
                      +₹{l.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="sm:col-span-1 flex justify-end sm:pt-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveLaborRow(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove labor row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Net Discount & Final Bill Total Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5" />
                Manual Net Discount (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm text-slate-400">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={grossBeforeDiscount}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0 (Enter manual discount amount)"
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Directly deducted from the final bill amount for this party.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Materials Subtotal:</span>
                <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>+ Labor Charges (Majuri):</span>
                <span className="font-semibold">+₹{laborTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>- Net Discount:</span>
                <span className="font-semibold">-₹{parsedDiscount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                <span className="font-bold text-white uppercase tracking-wider">Final Net Bill Total:</span>
                <span className="text-xl font-black text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Payment & Manual Reminder Section */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              4. Payment &amp; Custom Due Reminder
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Status <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:border-amber-500"
              >
                <option value="Partial Paid">Partial Paid (Deposit / Advance)</option>
                <option value="Full Paid">Full Paid (100% Cleared)</option>
                <option value="Pending">Pending (Full Credit / 0 Advance)</option>
              </select>
            </div>

            {paymentStatus === 'Partial Paid' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Paid Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max={totalAmount}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="Enter advance amount"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-bold text-emerald-400 focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
              </div>
            )}

            {paymentStatus !== 'Pending' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Bank Transfer/NEFT">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            )}
          </div>

          {/* Manual Date & Time Reminder Picker (No preset intervals) */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                <span>Manual Payment Reminder Date &amp; Time (Optional)</span>
              </div>
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
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Exact Reminder Date
                </label>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Reminder Time
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  disabled={!reminderDate}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500 disabled:opacity-40"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Reminder Note
                </label>
                <input
                  type="text"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="e.g. Call before 5 PM"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Summary Box */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Net Bill Amount</span>
              <span className="text-base font-bold text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Amount Paid Today</span>
              <span className="text-base font-bold text-emerald-300">₹{calculatedPaid.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-semibold block">Remaining Pending</span>
              <span className="text-base font-bold text-amber-300">₹{pendingAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Invoice Notes / Special Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivered to Block C basement construction site via truck GJ-01-XX-1234"
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        {/* Submit & Review CTA */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => onNavigate('bills')}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-xl shadow-amber-950/60 transition-all hover:scale-[1.02]"
          >
            <span>Review &amp; Confirm Bill (₹{totalAmount.toLocaleString('en-IN')})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Bill Review / Confirmation Modal */}
      {isReviewOpen && (
        <BillConfirmationModal
          isOpen={isReviewOpen}
          isLoading={isSaving}
          onClose={() => setIsReviewOpen(false)}
          onConfirm={handleConfirmAndSave}
          billData={{
            bill_number: billNumber,
            bill_date: billDate,
            customer_account_number: customerAccountNumber.trim() || undefined,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            customer_taluko: customerTaluko,
            customer_district: customerDistrict,
            customer_state: customerState,
            items: items.map(it => {
              const prod = products.find(p => p.id === it.productId);
              const v = prod?.variants.find(varItem => varItem.id === it.variantId);
              return {
                product_id: it.productId,
                variant_id: it.variantId,
                product_name: prod?.name || 'Material',
                variant_name: v?.variant_name || 'Variant',
                unit: it.unit,
                quantity: parseFloat(it.quantity) || 0,
                rate: parseFloat(it.rate) || 0,
                total: it.total,
              };
            }),
            labor_items: formattedLaborItems,
            labor_charges: laborTotal,
            discount_amount: parsedDiscount,
            subtotal,
            total_amount: totalAmount,
            payment_status: paymentStatus,
            paid_amount: calculatedPaid,
            pending_amount: pendingAmount,
            payment_mode: paymentMode,
            reminder_type: reminderDate ? 'Custom' : 'No Reminder',
            reminder_date: reminderDate || null,
            reminder_time: reminderDate && reminderTime ? reminderTime : null,
            reminder_note: reminderNote.trim() || undefined,
            notes,
          }}
        />
      )}
    </div>
  );
};
