import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, Layers, IndianRupee } from 'lucide-react';
import { Product } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: Product | null;
  onSuccess: () => void;
}

interface VariantInput {
  id?: string;
  variant_name: string;
  sku: string;
  unit: string;
  stock_quantity: number | string;
  low_stock_threshold: number | string;
  price: number | string;
  status: 'active' | 'inactive';
}

const COMMON_UNITS = ['KG', 'Ton', 'Bag (50KG)', 'Bag (25KG)', 'Piece', 'Bundle', 'Box', 'Brass (100 CFT)', 'Meter', 'Packet'];
const CATEGORIES: ('Steel Sariya' | 'Cement' | 'Other Equipment' | 'Other Materials')[] = [
  'Steel Sariya',
  'Cement',
  'Other Equipment',
  'Other Materials',
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<'Steel Sariya' | 'Cement' | 'Other Equipment' | 'Other Materials'>('Steel Sariya');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategory(productToEdit.category);
      setDescription(productToEdit.description || '');
      setStatus(productToEdit.status);
      setVariants(
        (productToEdit.variants || []).map(v => ({
          id: v.id,
          variant_name: v.variant_name,
          sku: v.sku || '',
          unit: v.unit,
          stock_quantity: v.stock_quantity,
          low_stock_threshold: v.low_stock_threshold,
          price: v.price,
          status: v.status,
        }))
      );
    } else {
      setName('');
      setCategory('Steel Sariya');
      setDescription('');
      setStatus('active');
      // Default initial variant
      setVariants([
        {
          variant_name: '12mm Sariya',
          sku: '',
          unit: 'KG',
          stock_quantity: 1000,
          low_stock_threshold: 200,
          price: 64,
          status: 'active',
        },
      ]);
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddVariantRow = () => {
    const defaultUnit = category === 'Steel Sariya' ? 'KG' : category === 'Cement' ? 'Bag (50KG)' : 'Piece';
    setVariants(prev => [
      ...prev,
      {
        variant_name: '',
        sku: '',
        unit: defaultUnit,
        stock_quantity: 100,
        low_stock_threshold: 20,
        price: 0,
        status: 'active',
      },
    ]);
  };

  const handleRemoveVariantRow = (index: number) => {
    if (variants.length <= 1) {
      setError('Each product must maintain at least one variant.');
      return;
    }
    setVariants(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleVariantChange = (index: number, field: keyof VariantInput, value: any) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    if (variants.length === 0) {
      setError('At least one variant is required.');
      return;
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.variant_name.trim()) {
        setError(`Variant #${i + 1} must have a name.`);
        return;
      }
      if (!v.unit.trim()) {
        setError(`Variant #${i + 1} must have a unit.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (productToEdit) {
        // Update product base
        await api.products.update(productToEdit.id, {
          name: name.trim(),
          category,
          description: description.trim(),
          status,
        });

        // Add any newly appended variants
        for (const v of variants) {
          if (!v.id) {
            await api.products.addVariant(productToEdit.id, {
              variant_name: v.variant_name,
              sku: v.sku,
              unit: v.unit,
              stock_quantity: Number(v.stock_quantity) || 0,
              low_stock_threshold: Number(v.low_stock_threshold) || 10,
              price: Number(v.price) || 0,
              status: v.status,
            });
          } else {
            await api.products.updateVariant(v.id, {
              variant_name: v.variant_name,
              sku: v.sku,
              unit: v.unit,
              low_stock_threshold: Number(v.low_stock_threshold) || 10,
              price: Number(v.price) || 0,
              status: v.status,
            });
          }
        }

        showToast('Product and variants updated successfully.', 'success');
      } else {
        // Create product with variants
        await api.products.create({
          name: name.trim(),
          category,
          description: description.trim(),
          variants: variants.map(v => ({
            variant_name: v.variant_name.trim(),
            sku: v.sku.trim(),
            unit: v.unit.trim(),
            stock_quantity: Number(v.stock_quantity) || 0,
            low_stock_threshold: Number(v.low_stock_threshold) || 10,
            price: Number(v.price) || 0,
            status: v.status,
          })),
        });

        showToast('Product and variants registered successfully.', 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving product.');
      showToast(err.message || 'Error saving product.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative my-8 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {productToEdit ? 'Edit Product & Variants' : 'Add New Product & Variants'}
              </h2>
              <p className="text-xs text-slate-400">
                Setup product name, category, and multi-variant pricing &amp; stock.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Product Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. TMT 550D Sariya or Ultratech Cement"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description / Technical Specifications (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. High corrosion resistance Fe-550D thermo-mechanically treated"
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Product Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
              >
                <option value="active">Active (Available for Billing)</option>
                <option value="inactive">Inactive (Disabled)</option>
              </select>
            </div>
          </div>

          {/* Product Variants Section */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Product Variants ({variants.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddVariantRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Variant</span>
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center relative group"
                >
                  {/* Variant Name */}
                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5 sm:hidden">
                      Variant Name
                    </label>
                    <input
                      type="text"
                      value={v.variant_name}
                      onChange={(e) => handleVariantChange(idx, 'variant_name', e.target.value)}
                      placeholder="e.g. 10mm or 50 KG"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500"
                      required
                    />
                  </div>

                  {/* Unit */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5 sm:hidden">
                      Unit
                    </label>
                    <input
                      type="text"
                      list={`units-list-${idx}`}
                      value={v.unit}
                      onChange={(e) => handleVariantChange(idx, 'unit', e.target.value)}
                      placeholder="Unit"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500"
                      required
                    />
                    <datalist id={`units-list-${idx}`}>
                      {COMMON_UNITS.map(u => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>

                  {/* Selling Price / Rate */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5 sm:hidden">
                      Selling Rate (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-[11px] text-slate-500">₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={v.price}
                        onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                        placeholder="Rate"
                        className="w-full pl-5 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Stock Quantity */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5 sm:hidden">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={v.stock_quantity}
                      disabled={!!v.id} // if existing variant, use stock-adjust to maintain audit log!
                      onChange={(e) => handleVariantChange(idx, 'stock_quantity', e.target.value)}
                      placeholder="Stock"
                      className={`w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500 ${
                        v.id ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      title={v.id ? 'Stock of existing variants should be adjusted via the Adjust Stock modal for audit compliance' : 'Initial stock'}
                      required
                    />
                  </div>

                  {/* Low Stock Alert Threshold */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5 sm:hidden">
                      Low Alert At
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={v.low_stock_threshold}
                      onChange={(e) => handleVariantChange(idx, 'low_stock_threshold', e.target.value)}
                      placeholder="Low Alert"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300 focus:outline-hidden focus:border-amber-500"
                      title="Threshold when low-stock alert triggers"
                    />
                  </div>

                  {/* Delete button */}
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveVariantRow(idx)}
                      disabled={variants.length <= 1}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30"
                      title="Remove variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Tip: For existing variants, update base price and low alert threshold here. To restock or correct physical count, use &quot;Adjust Stock&quot; to maintain audit records.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors shadow-lg shadow-amber-950/50 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Product & Variants'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
