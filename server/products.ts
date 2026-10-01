import { Router, Response } from 'express';
import { getDatabase, saveDatabase, Product, ProductVariant, StockTransaction } from './db.js';
import { AuthRequest } from './auth.js';

export const productsRouter = Router();

// Get all non-deleted products with their variants
productsRouter.get('/', (req: AuthRequest, res: Response) => {
  const { category, search, low_stock } = req.query;
  const db = getDatabase();

  let products = db.products.filter(p => !p.deleted_at);

  if (category && typeof category === 'string' && category !== 'All') {
    products = products.filter(p => p.category === category);
  }

  if (search && typeof search === 'string') {
    const term = search.toLowerCase().trim();
    products = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.description && p.description.toLowerCase().includes(term))
    );
  }

  // Attach variants to each product
  const result = products.map(product => {
    const variants = db.variants.filter(v => v.product_id === product.id && !v.deleted_at);
    const hasLowStock = variants.some(v => v.stock_quantity <= v.low_stock_threshold);
    return {
      ...product,
      variants,
      variant_count: variants.length,
      has_low_stock: hasLowStock,
    };
  });

  if (low_stock === 'true') {
    return res.json({
      success: true,
      products: result.filter(p => p.has_low_stock),
    });
  }

  return res.json({
    success: true,
    products: result,
  });
});

// Get single product with variants
productsRouter.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const product = db.products.find(p => p.id === id && !p.deleted_at);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const variants = db.variants.filter(v => v.product_id === product.id && !v.deleted_at);
  const transactions = db.stock_transactions
    .filter(st => variants.some(v => v.id === st.variant_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30);

  return res.json({
    success: true,
    product: {
      ...product,
      variants,
      stock_history: transactions,
    },
  });
});

// Create product with optional initial variants
productsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { name, category, description, variants } = req.body;
  if (!name || !category) {
    return res.status(400).json({ success: false, message: 'Product name and category are required.' });
  }

  const validCategories = ['Steel Sariya', 'Cement', 'Other Equipment', 'Other Materials'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ success: false, message: `Invalid category. Allowed: ${validCategories.join(', ')}` });
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newProduct: Product = {
    id: productId,
    name: name.trim(),
    category,
    status: 'active',
    description: description ? description.trim() : '',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  db.products.unshift(newProduct);

  const createdVariants: ProductVariant[] = [];
  if (Array.isArray(variants) && variants.length > 0) {
    for (const v of variants) {
      if (!v.variant_name || !v.unit) continue;
      const variantId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const stock = Math.max(0, parseFloat(v.stock_quantity) || 0);
      const price = Math.max(0, parseFloat(v.price) || 0);
      const threshold = Math.max(0, parseFloat(v.low_stock_threshold) || 10);

      const newVariant: ProductVariant = {
        id: variantId,
        product_id: productId,
        variant_name: v.variant_name.trim(),
        sku: v.sku ? v.sku.trim() : undefined,
        unit: v.unit.trim(),
        stock_quantity: stock,
        low_stock_threshold: threshold,
        price,
        status: 'active',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      db.variants.push(newVariant);
      createdVariants.push(newVariant);

      if (stock > 0) {
        db.stock_transactions.push({
          id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          variant_id: variantId,
          product_name: newProduct.name,
          variant_name: newVariant.variant_name,
          bill_id: null,
          bill_number: null,
          transaction_type: 'restock',
          quantity: stock,
          previous_stock: 0,
          new_stock: stock,
          notes: 'Initial opening stock creation',
          created_by: req.user?.email || 'admin',
          created_at: now,
        });
      }
    }
  }

  saveDatabase();

  return res.status(201).json({
    success: true,
    message: 'Product created successfully.',
    product: {
      ...newProduct,
      variants: createdVariants,
    },
  });
});

// Update product
productsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, category, description, status } = req.body;

  const db = getDatabase();
  const product = db.products.find(p => p.id === id && !p.deleted_at);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  if (name) product.name = name.trim();
  if (category) product.category = category;
  if (description !== undefined) product.description = description.trim();
  if (status && (status === 'active' || status === 'inactive')) product.status = status;
  product.updated_at = new Date().toISOString();

  saveDatabase();

  return res.json({
    success: true,
    message: 'Product updated successfully.',
    product,
  });
});

// Soft delete product
productsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const product = db.products.find(p => p.id === id && !p.deleted_at);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const now = new Date().toISOString();
  product.deleted_at = now;

  // Soft delete all variants
  for (const v of db.variants) {
    if (v.product_id === id && !v.deleted_at) {
      v.deleted_at = now;
    }
  }

  saveDatabase();

  return res.json({
    success: true,
    message: 'Product and variants moved to archive (soft deleted). Historical bills remain preserved.',
  });
});

// Add variant to product
productsRouter.post('/:id/variants', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { variant_name, sku, unit, stock_quantity, low_stock_threshold, price, status } = req.body;

  if (!variant_name || !unit) {
    return res.status(400).json({ success: false, message: 'Variant name and unit are required.' });
  }

  const db = getDatabase();
  const product = db.products.find(p => p.id === id && !p.deleted_at);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const now = new Date().toISOString();
  const variantId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const stock = Math.max(0, parseFloat(stock_quantity) || 0);
  const rate = Math.max(0, parseFloat(price) || 0);
  const threshold = Math.max(0, parseFloat(low_stock_threshold) || 10);

  const newVariant: ProductVariant = {
    id: variantId,
    product_id: id,
    variant_name: variant_name.trim(),
    sku: sku ? sku.trim() : undefined,
    unit: unit.trim(),
    stock_quantity: stock,
    low_stock_threshold: threshold,
    price: rate,
    status: status === 'inactive' ? 'inactive' : 'active',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  db.variants.push(newVariant);

  if (stock > 0) {
    db.stock_transactions.push({
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      variant_id: variantId,
      product_name: product.name,
      variant_name: newVariant.variant_name,
      bill_id: null,
      bill_number: null,
      transaction_type: 'restock',
      quantity: stock,
      previous_stock: 0,
      new_stock: stock,
      notes: 'Initial stock on variant creation',
      created_by: req.user?.email || 'admin',
      created_at: now,
    });
  }

  saveDatabase();

  return res.status(201).json({
    success: true,
    message: 'Product variant created successfully.',
    variant: newVariant,
  });
});

// Update variant
productsRouter.put('/variants/:variantId', (req: AuthRequest, res: Response) => {
  const { variantId } = req.params;
  const { variant_name, sku, unit, price, low_stock_threshold, status } = req.body;

  const db = getDatabase();
  const variant = db.variants.find(v => v.id === variantId && !v.deleted_at);
  if (!variant) {
    return res.status(404).json({ success: false, message: 'Variant not found.' });
  }

  if (variant_name) variant.variant_name = variant_name.trim();
  if (sku !== undefined) variant.sku = sku.trim();
  if (unit) variant.unit = unit.trim();
  if (price !== undefined) variant.price = Math.max(0, parseFloat(price) || 0);
  if (low_stock_threshold !== undefined) variant.low_stock_threshold = Math.max(0, parseFloat(low_stock_threshold) || 0);
  if (status && (status === 'active' || status === 'inactive')) variant.status = status;
  variant.updated_at = new Date().toISOString();

  saveDatabase();

  return res.json({
    success: true,
    message: 'Variant updated successfully.',
    variant,
  });
});

// Soft delete variant
productsRouter.delete('/variants/:variantId', (req: AuthRequest, res: Response) => {
  const { variantId } = req.params;
  const db = getDatabase();
  const variant = db.variants.find(v => v.id === variantId && !v.deleted_at);
  if (!variant) {
    return res.status(404).json({ success: false, message: 'Variant not found.' });
  }

  variant.deleted_at = new Date().toISOString();
  saveDatabase();

  return res.json({
    success: true,
    message: 'Variant archived (soft deleted).',
  });
});

// Manual Stock Adjustment / Restock
productsRouter.post('/variants/:variantId/stock-adjust', (req: AuthRequest, res: Response) => {
  const { variantId } = req.params;
  const { adjustment_type, quantity, notes } = req.body;
  // adjustment_type: 'add' (restock) or 'set' (correction) or 'reduce' (damage/leakage)

  if (!adjustment_type || quantity === undefined) {
    return res.status(400).json({ success: false, message: 'Adjustment type and quantity are required.' });
  }

  const db = getDatabase();
  const variant = db.variants.find(v => v.id === variantId && !v.deleted_at);
  if (!variant) {
    return res.status(404).json({ success: false, message: 'Variant not found.' });
  }

  const product = db.products.find(p => p.id === variant.product_id);
  const prevStock = variant.stock_quantity;
  const qty = parseFloat(quantity);

  if (isNaN(qty) || qty < 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be a non-negative number.' });
  }

  let newStock = prevStock;
  let txType: 'restock' | 'manual_adjustment' = 'manual_adjustment';

  if (adjustment_type === 'add') {
    newStock = prevStock + qty;
    txType = 'restock';
  } else if (adjustment_type === 'reduce') {
    if (qty > prevStock) {
      return res.status(400).json({ success: false, message: 'Cannot reduce stock below 0.' });
    }
    newStock = prevStock - qty;
    txType = 'manual_adjustment';
  } else if (adjustment_type === 'set') {
    newStock = qty;
    txType = 'manual_adjustment';
  } else {
    return res.status(400).json({ success: false, message: 'Invalid adjustment type.' });
  }

  variant.stock_quantity = Math.round(newStock * 100) / 100;
  variant.updated_at = new Date().toISOString();

  const now = new Date().toISOString();
  const transaction: StockTransaction = {
    id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    variant_id: variant.id,
    product_name: product ? product.name : 'Unknown Product',
    variant_name: variant.variant_name,
    bill_id: null,
    bill_number: null,
    transaction_type: txType,
    quantity: Math.abs(variant.stock_quantity - prevStock),
    previous_stock: prevStock,
    new_stock: variant.stock_quantity,
    notes: notes ? notes.trim() : `Manual stock update (${adjustment_type})`,
    created_by: req.user?.email || 'admin',
    created_at: now,
  };

  db.stock_transactions.push(transaction);
  saveDatabase();

  return res.json({
    success: true,
    message: 'Stock updated successfully.',
    variant,
    transaction,
  });
});
