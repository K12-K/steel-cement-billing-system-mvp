import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Layers, 
  IndianRupee, 
  RefreshCw,
  SlidersHorizontal,
  History,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ProductFormModal } from './ProductFormModal';
import { StockAdjustModal } from '../components/StockAdjustModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

const CATEGORIES = ['All', 'Steel Sariya', 'Cement', 'Other Equipment', 'Other Materials'];

export const Products: React.FC = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [stockAdjustModalData, setStockAdjustModalData] = useState<{
    variant: ProductVariant;
    productName: string;
  } | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    productId: string | null;
    productName: string;
  }>({
    isOpen: false,
    productId: null,
    productName: '',
  });

  const [historyModalProduct, setHistoryModalProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.products.list({
        category: selectedCategory,
        search: search.trim(),
        low_stock: lowStockOnly,
      });
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch inventory products.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search, lowStockOnly, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteProduct = async () => {
    if (!deleteConfirmation.productId) return;
    try {
      const res = await api.products.delete(deleteConfirmation.productId);
      if (res.success) {
        showToast(res.message, 'success');
        setDeleteConfirmation({ isOpen: false, productId: null, productName: '' });
        fetchProducts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product.', 'error');
    }
  };

  const handleOpenHistory = async (product: Product) => {
    try {
      const res = await api.products.get(product.id);
      if (res.success) {
        setHistoryModalProduct(res.product);
      }
    } catch (err: any) {
      showToast('Could not load stock history.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            Products &amp; Stock Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-variant TMT steel bars, cement grades, building equipment, and real-time yard stock.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchProducts()}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-950/50 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Low Stock Toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                lowStockOnly
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Low Stock Alerts Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Cards & Variants List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading products &amp; inventory...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Products Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {search || lowStockOnly || selectedCategory !== 'All'
              ? 'No products matched your search or category filter. Try clearing filters.'
              : 'Start by adding your first construction material product with variants.'}
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('All');
              setLowStockOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const hasLowStockVariant = (product.variants || []).some(
              v => v.stock_quantity <= v.low_stock_threshold
            );

            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden hover:border-slate-700/80 transition-all"
              >
                {/* Product Header */}
                <div className="p-4 sm:px-6 sm:py-4 bg-slate-800/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 border border-slate-700/80 shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{product.name}</h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {product.category}
                        </span>
                        {hasLowStockVariant && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            Low Stock Alert
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Product Header Action buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleOpenHistory(product)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors text-xs font-medium flex items-center gap-1.5 px-2.5"
                      title="View Stock Movement Audit"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Stock Audit</span>
                    </button>
                    <button
                      onClick={() => {
                        setProductToEdit(product);
                        setIsProductModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors text-xs font-medium flex items-center gap-1.5 px-2.5"
                      title="Edit Product"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmation({
                          isOpen: true,
                          productId: product.id,
                          productName: product.name,
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors text-xs font-medium"
                      title="Archive Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Variants Table / Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4 sm:px-6">Variant Name</th>
                        <th className="py-2.5 px-4">Unit</th>
                        <th className="py-2.5 px-4">Selling Price / Rate</th>
                        <th className="py-2.5 px-4">Current Stock</th>
                        <th className="py-2.5 px-4">Low Alert Mark</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {(product.variants || []).map(variant => {
                        const isLowStock = variant.stock_quantity <= variant.low_stock_threshold;

                        return (
                          <tr key={variant.id} className="hover:bg-slate-800/25 transition-colors">
                            <td className="py-3 px-4 sm:px-6 font-semibold text-white whitespace-nowrap">
                              {variant.variant_name}
                              {variant.sku && (
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  SKU: {variant.sku}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                              {variant.unit}
                            </td>
                            <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                              ₹{variant.price.toLocaleString('en-IN')}{' '}
                              <span className="text-[10px] text-slate-400 font-normal">/ {variant.unit}</span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${isLowStock ? 'text-amber-400' : 'text-slate-200'}`}>
                                  {variant.stock_quantity.toLocaleString('en-IN')} {variant.unit}
                                </span>
                                {isLowStock && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                    Low
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                              &le; {variant.low_stock_threshold} {variant.unit}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                variant.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-700 text-slate-300'
                              }`}>
                                {variant.status === 'active' ? (
                                  <>
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-2.5 h-2.5" />
                                    Inactive
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                              <button
                                onClick={() => setStockAdjustModalData({ variant, productName: product.name })}
                                className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-colors"
                              >
                                Adjust Stock
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Form Modal */}
      {isProductModalOpen && (
        <ProductFormModal
          isOpen={isProductModalOpen}
          productToEdit={productToEdit}
          onClose={() => {
            setIsProductModalOpen(false);
            setProductToEdit(null);
          }}
          onSuccess={() => {
            fetchProducts();
          }}
        />
      )}

      {/* Stock Adjust Modal */}
      {stockAdjustModalData && (
        <StockAdjustModal
          isOpen={!!stockAdjustModalData}
          variant={stockAdjustModalData.variant}
          productName={stockAdjustModalData.productName}
          onClose={() => setStockAdjustModalData(null)}
          onSuccess={() => {
            setStockAdjustModalData(null);
            fetchProducts();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Archive Product"
        message={`Are you sure you want to soft delete "${deleteConfirmation.productName}"? Its variants will also be archived. Historical bills and payment audit logs will remain intact.`}
        confirmText="Archive Product"
        isDestructive={true}
        onClose={() => setDeleteConfirmation({ isOpen: false, productId: null, productName: '' })}
        onConfirm={handleDeleteProduct}
      />

      {/* Stock History Audit Modal */}
      {historyModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Stock Movement Audit History</h3>
                <p className="text-xs text-slate-400">{historyModalProduct.name}</p>
              </div>
              <button
                onClick={() => setHistoryModalProduct(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-2">
              {(historyModalProduct.stock_history || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No stock transactions recorded yet for this product.
                </div>
              ) : (
                (historyModalProduct.stock_history || []).map(tx => (
                  <div key={tx.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">{tx.variant_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {tx.notes || tx.transaction_type} • {tx.created_at.split('T')[0]}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-400">
                        {tx.previous_stock} &rarr; {tx.new_stock}
                      </div>
                      <span className="text-[10px] text-slate-500">{tx.transaction_type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
