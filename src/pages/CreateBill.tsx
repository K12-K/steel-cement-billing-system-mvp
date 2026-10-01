import React, { useState, useEffect, useCallback } from 'react';
import { 
  FilePlus2, 
  User, 
  Phone, 
  MapPin, 
  Plus, 
  Trash2, 
  Layers, 
  IndianRupee, 
  Clock, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Search,
  Check
} from 'lucide-react';
import { Customer, Product, ProductVariant } from '../types';
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

  // Payment Section
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Partial Paid' | 'Full Paid'>('Partial Paid');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [reminderType, setReminderType] = useState<string>('2 Weeks');
  const [notes, setNotes] = useState<string>('');

  // Modals & Submitting
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
            setSelectedCustomerId(targetCust.id);
            setCustomerName(targetCust.name);
            setCustomerPhone(targetCust.phone);
            setCustomerAddress(targetCust.address || '');
            setCustomerTaluko(targetCust.taluko || '');
            setCustomerDistrict(targetCust.district || '');
            setCustomerState(targetCust.state || 'Gujarat');
          }
        }
      }

      if (prodRes.success) {
        const activeProds = prodRes.products.filter(p => p.status === 'active');
        setProducts(activeProds);

        // Populate initial item row if variants exist
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
  }, [initialCustomerId, showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Customer Selection
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
    setCustomerTaluko(c.taluko || '');
    setCustomerDistrict(c.district || '');
    setCustomerState(c.state || 'Gujarat');
    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
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

  // Grand Total Calculation
  const subtotal = Math.round(items.reduce((sum, item) => sum + (item.total || 0), 0) * 100) / 100;
  const totalAmount = subtotal;

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
      setPaidAmount(String(Math.round(totalAmount * 0.5))); // suggest 50% advance
    }
  }, [paymentStatus, totalAmount]);

  // Validation before opening Review modal
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setValidationError('Customer Name and Phone Number are required.');
      return;
    }

    if (items.length === 0) {
      setValidationError('Please add at least one material/product item to the bill.');
      return;
    }

    // Check each item
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

      // Check stock availability
      if (qty > it.availableStock) {
        const prod = products.find(p => p.id === it.productId);
        const variant = prod?.variants.find(v => v.id === it.variantId);
        setValidationError(
          `Insufficient stock for "${variant?.variant_name || 'item'}". Requested: ${qty} ${it.unit}, but only ${it.availableStock} ${it.unit} is currently in stock.`
        );
        return;
      }
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

  // Final Confirmation & Submission
  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    setValidationError(null);

    try {
      const payload = {
        bill_number: billNumber,
        bill_date: billDate,
        customer_id: selectedCustomerId || undefined,
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
        payment_status: paymentStatus,
        paid_amount: calculatedPaid,
        payment_mode: paymentMode,
        reminder_type: reminderType,
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

  // Filtered customer list for quick select
  const filteredCustomers = customers.filter(c =>
    customerSearchQuery === ''
      ? true
      : c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery)
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
            Generate invoice for TMT steel, cement bags, or construction materials with real-time stock deduction.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

        {/* 1. Customer Section */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                1. Customer &amp; Site Details
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
                  {selectedCustomerId ? 'Change Customer' : 'Select Existing Customer'}
                </span>
              </button>

              {showCustomerDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-72 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-2 z-30 overflow-y-auto">
                  <div className="p-1 mb-2">
                    <input
                      type="text"
                      placeholder="Search name or phone..."
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
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-900 text-xs transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-white">{c.name}</div>
                          <div className="text-[10px] text-slate-400">{c.phone} • {c.district || c.taluko}</div>
                        </div>
                        {selectedCustomerId === c.id && <Check className="w-4 h-4 text-amber-400" />}
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No customer matches found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedCustomerId && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-300">
              <span>Selected registered customer: <strong>{customerName}</strong></span>
              <button
                type="button"
                onClick={handleClearCustomer}
                className="text-[11px] underline hover:text-white"
              >
                Clear &amp; Enter New Details
              </button>
            </div>
          )}

          {/* Customer Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Customer / Contractor Name <span className="text-rose-400">*</span>
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (selectedCustomerId) setSelectedCustomerId('');
                  }}
                  placeholder="98250 12345"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  required
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
              <span>Save this customer into directory for future billing</span>
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
                  className={`p-3.5 rounded-xl border transition-all ${
                    isOverStock
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Product Selector */}
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

                    {/* Variant Selector */}
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

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">
                          Qty ({item.unit})
                        </label>
                        <span className={`text-[10px] font-bold ${
                          item.availableStock <= 10 ? 'text-amber-400' : 'text-slate-400'
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
                        className={`w-full px-2.5 py-2 bg-slate-900 border rounded-xl text-xs font-bold text-white focus:outline-hidden ${
                          isOverStock
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-slate-700 focus:border-amber-500'
                        }`}
                        required
                      />
                    </div>

                    {/* Rate / Price */}
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

                    {/* Item Total */}
                    <div className="sm:col-span-1 text-right">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                        Item Total
                      </label>
                      <span className="text-xs font-bold text-white whitespace-nowrap block py-2">
                        ₹{item.total.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Remove Action */}
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

          {/* Subtotal Banner */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Materials Billed Amount:
            </span>
            <span className="text-xl font-black text-white">
              ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* 3. Payment & Reminder Section */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              3. Payment &amp; Credit Terms
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Status */}
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

            {/* Paid Amount */}
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

            {/* Payment Mode */}
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

            {/* Reminder Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Reminder Period
              </label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
              >
                <option value="No Reminder">No Reminder</option>
                <option value="7 Days">7 Days</option>
                <option value="2 Weeks">2 Weeks</option>
                <option value="1 Month">1 Month</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year</option>
              </select>
            </div>
          </div>

          {/* Payment Summary Box */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Bill Amount</span>
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
            subtotal,
            total_amount: totalAmount,
            payment_status: paymentStatus,
            paid_amount: calculatedPaid,
            pending_amount: pendingAmount,
            payment_mode: paymentMode,
            reminder_type: reminderType,
            notes,
          }}
        />
      )}
    </div>
  );
};
