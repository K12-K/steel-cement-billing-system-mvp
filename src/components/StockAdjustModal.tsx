import React, { useState } from 'react';
import { X, Layers, AlertCircle, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { ProductVariant } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: ProductVariant | null;
  productName: string;
  onSuccess: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  variant,
  productName,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'reduce' | 'set'>('add');
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !variant) return null;

  const currentStock = variant.stock_quantity;
  const numQty = parseFloat(quantity) || 0;

  let calculatedStock = currentStock;
  if (adjustmentType === 'add') {
    calculatedStock = currentStock + numQty;
  } else if (adjustmentType === 'reduce') {
    calculatedStock = Math.max(0, currentStock - numQty);
  } else if (adjustmentType === 'set') {
    calculatedStock = numQty;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numQty < 0) {
      setError('Quantity cannot be negative.');
      return;
    }

    if (adjustmentType === 'reduce' && numQty > currentStock) {
      setError(`Cannot reduce by more than current stock (${currentStock} ${variant.unit}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.products.adjustStock(variant.id, {
        adjustment_type: adjustmentType,
        quantity: numQty,
        notes: notes || `Manual stock update (${adjustmentType})`,
      });

      if (res.success) {
        showToast(res.message, 'success');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock.');
      showToast(err.message || 'Failed to adjust stock.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Adjust Stock / Restock</h2>
              <p className="text-xs text-slate-400">{productName} • {variant.variant_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Stock Banner */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center flex justify-between items-center px-4">
            <span className="text-xs text-slate-400">Current In-Stock:</span>
            <span className="text-base font-bold text-white">
              {currentStock.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">{variant.unit}</span>
            </span>
          </div>

          {/* Operation Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Action Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  adjustmentType === 'add'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Add (Restock)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('reduce')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  adjustmentType === 'reduce'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                Reduce
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('set')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  adjustmentType === 'set'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Set Total
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {adjustmentType === 'add' && 'Quantity to Add'}
              {adjustmentType === 'reduce' && 'Quantity to Reduce'}
              {adjustmentType === 'set' && 'New Total Quantity'} ({variant.unit}) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white font-semibold text-base focus:outline-hidden focus:border-amber-500"
              required
              autoFocus
            />
          </div>

          {/* New Stock Preview */}
          {numQty > 0 && (
            <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs flex justify-between items-center">
              <span className="text-slate-300">Updated New Stock:</span>
              <span className="font-bold text-amber-400 text-sm">
                {calculatedStock.toLocaleString('en-IN')} {variant.unit}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Reason / Audit Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received new consignment from Jindal Panther"
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
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
              disabled={isSubmitting || numQty <= 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors shadow-lg shadow-amber-950/50 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Stock Adjustment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
