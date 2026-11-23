import { Router, Response } from 'express';
import { 
  getDatabase, 
  saveDatabase, 
  generateNextBillNumber, 
  Bill, 
  BillItem, 
  LaborChargeItem,
  Payment, 
  StockTransaction,
  Customer
} from './db.js';
import { AuthRequest } from './auth.js';

export const billsRouter = Router();

function processLaborItems(rawLaborItems: any): { items: LaborChargeItem[]; total: number } {
  if (!Array.isArray(rawLaborItems) || rawLaborItems.length === 0) {
    return { items: [], total: 0 };
  }
  const processed: LaborChargeItem[] = [];
  let sum = 0;

  for (let i = 0; i < rawLaborItems.length; i++) {
    const raw = rawLaborItems[i];
    const desc = (raw.description || '').trim();
    const qty = raw.quantity !== undefined ? parseFloat(raw.quantity) : 1;
    const rate = raw.rate !== undefined ? parseFloat(raw.rate) : parseFloat(raw.amount || 0);
    let amount = raw.amount !== undefined ? parseFloat(raw.amount) : qty * rate;

    if (isNaN(amount) || amount < 0) amount = 0;
    const safeQty = !isNaN(qty) && qty > 0 ? qty : 1;
    const safeRate = !isNaN(rate) && rate >= 0 ? rate : amount;
    const finalAmt = Math.round(amount * 100) / 100;

    if (!desc && finalAmt <= 0) continue;

    processed.push({
      id: raw.id || `labor_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
      description: desc || 'Labor Charges (Majuri)',
      quantity: safeQty,
      rate: Math.round(safeRate * 100) / 100,
      amount: finalAmt,
    });
    sum += finalAmt;
  }

  return {
    items: processed,
    total: Math.round(sum * 100) / 100,
  };
}

// Get next available bill number
billsRouter.get('/next-number', (req: AuthRequest, res: Response) => {
  const nextNum = generateNextBillNumber();
  return res.json({ success: true, bill_number: nextNum });
});

// List bills with filters and pagination
billsRouter.get('/', (req: AuthRequest, res: Response) => {
  const { 
    search, 
    payment_status, 
    from_date, 
    to_date, 
    product_id, 
    customer_id,
    page = '1', 
    limit = '50',
    sort_by = 'bill_date',
    sort_order = 'desc' 
  } = req.query;

  const db = getDatabase();
  let bills = db.bills.filter(b => !b.deleted_at);

  if (payment_status && typeof payment_status === 'string' && payment_status !== 'All') {
    bills = bills.filter(b => b.payment_status === payment_status);
  }

  if (customer_id && typeof customer_id === 'string' && customer_id !== 'All') {
    bills = bills.filter(b => b.customer_id === customer_id);
  }

  if (from_date && typeof from_date === 'string') {
    bills = bills.filter(b => b.bill_date >= from_date);
  }

  if (to_date && typeof to_date === 'string') {
    bills = bills.filter(b => b.bill_date <= to_date);
  }

  if (product_id && typeof product_id === 'string' && product_id !== 'All') {
    const matchingBillIds = new Set(
      db.bill_items.filter(item => item.product_id === product_id).map(i => i.bill_id)
    );
    bills = bills.filter(b => matchingBillIds.has(b.id));
  }

  if (search && typeof search === 'string') {
    const term = search.toLowerCase().trim();
    bills = bills.filter(b => 
      b.bill_number.toLowerCase().includes(term) ||
      (b.customer_account_number && b.customer_account_number.toLowerCase().includes(term)) ||
      b.customer_name.toLowerCase().includes(term) ||
      (b.customer_phone && b.customer_phone.toLowerCase().includes(term)) ||
      b.customer_district.toLowerCase().includes(term)
    );
  }

  // Sorting
  bills.sort((a, b) => {
    let valA = a[sort_by as keyof Bill] ?? '';
    let valB = b[sort_by as keyof Bill] ?? '';

    if (sort_by === 'total_amount' || sort_by === 'pending_amount' || sort_by === 'paid_amount') {
      return sort_order === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    }

    if (String(valA) < String(valB)) return sort_order === 'asc' ? -1 : 1;
    if (String(valA) > String(valB)) return sort_order === 'asc' ? 1 : -1;
    return 0;
  });

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
  const total = bills.length;
  const paginated = bills.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  // Attach item count to each bill summary
  const enriched = paginated.map(bill => {
    const items = db.bill_items.filter(item => item.bill_id === bill.id);
    return {
      ...bill,
      item_count: items.length,
      items_summary: items.map(i => `${i.quantity} ${i.unit} ${i.variant_name_snapshot}`).join(', '),
    };
  });

  return res.json({
    success: true,
    bills: enriched,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    },
  });
});

// Get single bill with full details, items snapshot, and payment audit history
billsRouter.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const bill = db.bills.find(b => b.id === id && !b.deleted_at);

  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  const items = db.bill_items.filter(item => item.bill_id === bill.id);
  const payments = db.payments
    .filter(p => p.bill_id === bill.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json({
    success: true,
    bill: {
      ...bill,
      items,
      payments,
      settings: db.settings,
    },
  });
});

// Create and confirm a new bill
billsRouter.post('/', (req: AuthRequest, res: Response) => {
  const {
    customer_id,
    customer_account_number,
    customer_name,
    customer_phone,
    customer_address,
    customer_taluko,
    customer_district,
    customer_state,
    save_as_new_customer,
    bill_number,
    bill_date,
    items,
    labor_items,
    labor_charges,
    discount_amount,
    payment_status,
    paid_amount,
    payment_mode,
    reminder_date,
    reminder_time,
    reminder_note,
    notes,
  } = req.body;

  // Validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one product item is required in the bill.' });
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  const cleanAccountNum = customer_account_number ? String(customer_account_number).trim() : '';

  // Automatic Party Linkage via Account Number first, then customer_id
  let linkedCustomer: Customer | undefined;
  if (cleanAccountNum) {
    linkedCustomer = db.customers.find(
      c => !c.deleted_at && c.account_number && c.account_number.trim().toLowerCase() === cleanAccountNum.toLowerCase()
    );
  }
  if (!linkedCustomer && customer_id) {
    linkedCustomer = db.customers.find(c => !c.deleted_at && c.id === customer_id);
  }

  const resolvedName = linkedCustomer ? linkedCustomer.name : (customer_name ? String(customer_name).trim() : '');
  const resolvedPhone = linkedCustomer
    ? (customer_phone ? String(customer_phone).trim() : linkedCustomer.phone)
    : (customer_phone ? String(customer_phone).trim() : '');

  if (!resolvedName || (!resolvedPhone && !cleanAccountNum && !linkedCustomer)) {
    return res.status(400).json({
      success: false,
      message: 'Customer name and either Party Account Number or Phone Number are required.',
    });
  }

  // Handle customer record & account book linkage
  let actualCustomerId = linkedCustomer ? linkedCustomer.id : '';
  let resolvedAccountNum = linkedCustomer?.account_number || cleanAccountNum || undefined;

  if (!actualCustomerId) {
    // Check if phone matches an existing customer when phone is provided
    if (resolvedPhone && !save_as_new_customer) {
      const byPhone = db.customers.find(c => !c.deleted_at && c.phone && c.phone === resolvedPhone);
      if (byPhone) {
        actualCustomerId = byPhone.id;
        if (!byPhone.account_number && cleanAccountNum) {
          byPhone.account_number = cleanAccountNum;
          byPhone.updated_at = now;
        }
        resolvedAccountNum = byPhone.account_number || cleanAccountNum || undefined;
      }
    }

    if (!actualCustomerId) {
      actualCustomerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newCust: Customer = {
        id: actualCustomerId,
        account_number: cleanAccountNum || undefined,
        name: resolvedName,
        phone: resolvedPhone,
        address: customer_address ? customer_address.trim() : '',
        taluko: customer_taluko ? customer_taluko.trim() : '',
        district: customer_district ? customer_district.trim() : '',
        state: customer_state ? customer_state.trim() : '',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      db.customers.unshift(newCust);
    }
  } else if (linkedCustomer && cleanAccountNum && !linkedCustomer.account_number) {
    linkedCustomer.account_number = cleanAccountNum;
    linkedCustomer.updated_at = now;
    resolvedAccountNum = cleanAccountNum;
  }

  // Generate or check unique bill number
  let actualBillNumber = bill_number ? bill_number.trim() : generateNextBillNumber();
  const existingBill = db.bills.find(b => b.bill_number.toLowerCase() === actualBillNumber.toLowerCase() && !b.deleted_at);
  if (existingBill) {
    actualBillNumber = generateNextBillNumber(); // safely resolve collision
  }

  // Calculate Subtotal and validate quantities/rates
  let subtotal = 0;
  const processedItems: BillItem[] = [];
  const billId = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty = parseFloat(item.quantity);
    const rate = parseFloat(item.rate);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `Item #${i + 1} (${item.variant_name_snapshot || 'item'}) must have quantity greater than 0.` });
    }

    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({ success: false, message: `Item #${i + 1} cannot have a negative rate.` });
    }

    // Verify stock availability
    const variant = db.variants.find(v => v.id === item.variant_id && !v.deleted_at);
    if (!variant) {
      return res.status(400).json({ success: false, message: `Product variant for item #${i + 1} not found or has been removed.` });
    }

    if (variant.stock_quantity < qty) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock for ${variant.variant_name}. Available: ${variant.stock_quantity} ${variant.unit}, Requested: ${qty} ${variant.unit}.` 
      });
    }

    const itemTotal = Math.round(qty * rate * 100) / 100;
    subtotal += itemTotal;

    const product = db.products.find(p => p.id === variant.product_id);

    processedItems.push({
      id: `item_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
      bill_id: billId,
      product_id: variant.product_id,
      variant_id: variant.id,
      product_name_snapshot: product ? product.name : (item.product_name_snapshot || 'Material'),
      variant_name_snapshot: variant.variant_name,
      unit: variant.unit,
      quantity: qty,
      rate,
      total: itemTotal,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;

  // Process Labor Charges (Majuri)
  const laborResult = processLaborItems(labor_items);
  const finalLaborTotal = laborResult.items.length > 0
    ? laborResult.total
    : Math.max(0, Math.round((parseFloat(labor_charges) || 0) * 100) / 100);

  // Process Manual Net Discount
  const finalDiscount = Math.max(0, Math.round((parseFloat(discount_amount) || 0) * 100) / 100);
  const grossBeforeDiscount = Math.round((subtotal + finalLaborTotal) * 100) / 100;

  if (finalDiscount > grossBeforeDiscount) {
    return res.status(400).json({
      success: false,
      message: `Net discount (₹${finalDiscount}) cannot exceed gross total (₹${grossBeforeDiscount}).`,
    });
  }

  const totalAmount = Math.max(0, Math.round((grossBeforeDiscount - finalDiscount) * 100) / 100);

  // Validate Payment logic
  let finalPaid = 0;
  let finalStatus: 'Pending' | 'Partial Paid' | 'Full Paid' = payment_status || 'Pending';

  if (finalStatus === 'Pending') {
    finalPaid = 0;
  } else if (finalStatus === 'Full Paid') {
    finalPaid = totalAmount;
  } else if (finalStatus === 'Partial Paid') {
    finalPaid = Math.round((parseFloat(paid_amount) || 0) * 100) / 100;
    if (finalPaid <= 0) {
      return res.status(400).json({ success: false, message: 'For Partial Paid bills, please specify a valid paid amount greater than 0.' });
    }
    if (finalPaid > totalAmount) {
      return res.status(400).json({ success: false, message: `Paid amount (₹${finalPaid}) cannot exceed total bill amount (₹${totalAmount}).` });
    }
    if (finalPaid === totalAmount) {
      finalStatus = 'Full Paid';
    }
  }

  const finalPending = Math.round((totalAmount - finalPaid) * 100) / 100;
  const billDateClean = bill_date || now.split('T')[0];

  // Manual reminder date & time (no automatic intervals)
  const cleanReminderDate = reminder_date ? String(reminder_date).trim() || null : null;
  const cleanReminderTime = cleanReminderDate && reminder_time ? String(reminder_time).trim() || null : null;
  const reminderTypeClean = cleanReminderDate ? 'Custom' : 'No Reminder';

  // Stock deduction & stock transaction audit
  for (const item of processedItems) {
    const variant = db.variants.find(v => v.id === item.variant_id)!;
    const prevStock = variant.stock_quantity;
    const newStock = Math.round((prevStock - item.quantity) * 100) / 100;

    variant.stock_quantity = newStock;
    variant.updated_at = now;

    db.stock_transactions.push({
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      variant_id: variant.id,
      product_name: item.product_name_snapshot,
      variant_name: item.variant_name_snapshot,
      bill_id: billId,
      bill_number: actualBillNumber,
      transaction_type: 'bill_deduction',
      quantity: item.quantity,
      previous_stock: prevStock,
      new_stock: newStock,
      notes: `Bill #${actualBillNumber} dispatch for ${resolvedName}`,
      created_by: req.user?.email || 'admin',
      created_at: now,
    });
  }

  const finalAddress = linkedCustomer && !customer_address ? linkedCustomer.address : (customer_address ? customer_address.trim() : '');
  const finalTaluko = linkedCustomer && !customer_taluko ? linkedCustomer.taluko : (customer_taluko ? customer_taluko.trim() : '');
  const finalDistrict = linkedCustomer && !customer_district ? linkedCustomer.district : (customer_district ? customer_district.trim() : '');
  const finalState = linkedCustomer && !customer_state ? linkedCustomer.state : (customer_state ? customer_state.trim() : '');

  const newBill: Bill = {
    id: billId,
    bill_number: actualBillNumber,
    customer_id: actualCustomerId,
    customer_account_number: resolvedAccountNum,
    customer_name: resolvedName,
    customer_phone: resolvedPhone,
    customer_address: finalAddress,
    customer_taluko: finalTaluko,
    customer_district: finalDistrict,
    customer_state: finalState,
    bill_date: billDateClean,
    subtotal,
    labor_items: laborResult.items,
    labor_charges: finalLaborTotal,
    discount_amount: finalDiscount,
    total_amount: totalAmount,
    paid_amount: finalPaid,
    pending_amount: finalPending,
    payment_status: finalStatus,
    reminder_type: reminderTypeClean,
    reminder_date: cleanReminderDate,
    reminder_time: cleanReminderTime,
    reminder_note: reminder_note ? String(reminder_note).trim() : undefined,
    notes: notes ? notes.trim() : '',
    status: 'confirmed',
    created_by: req.user?.email || 'admin',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  db.bills.unshift(newBill);
  db.bill_items.push(...processedItems);

  // If payment was made on creation, record in Payment Audit log
  if (finalPaid > 0) {
    const paymentRecord: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bill_id: billId,
      bill_number: actualBillNumber,
      customer_id: actualCustomerId,
      customer_name: resolvedName,
      payment_date: billDateClean,
      amount: finalPaid,
      previous_paid_amount: 0,
      new_paid_amount: finalPaid,
      remaining_amount: finalPending,
      payment_status: finalStatus,
      payment_mode: payment_mode || 'Cash',
      notes: 'Initial payment recorded during bill confirmation',
      created_by: req.user?.email || 'admin',
      created_at: now,
    };
    db.payments.unshift(paymentRecord);
  }

  saveDatabase();

  return res.status(201).json({
    success: true,
    message: `Bill ${actualBillNumber} created and confirmed successfully. Inventory updated.`,
    bill: {
      ...newBill,
      items: processedItems,
    },
  });
});

// Edit bill (reverses old stock and applies new items)
billsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    customer_account_number,
    customer_name,
    customer_phone,
    customer_address,
    customer_taluko,
    customer_district,
    customer_state,
    bill_date,
    items,
    labor_items,
    labor_charges,
    discount_amount,
    notes,
    reminder_date,
    reminder_time,
    reminder_note,
  } = req.body;

  const db = getDatabase();
  const bill = db.bills.find(b => b.id === id && !b.deleted_at);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item is required.' });
  }

  const now = new Date().toISOString();

  // 1. First reverse existing stock deductions for this bill
  const existingItems = db.bill_items.filter(item => item.bill_id === bill.id);
  for (const oldItem of existingItems) {
    const variant = db.variants.find(v => v.id === oldItem.variant_id);
    if (variant) {
      const prevStock = variant.stock_quantity;
      const restoredStock = Math.round((prevStock + oldItem.quantity) * 100) / 100;
      variant.stock_quantity = restoredStock;

      db.stock_transactions.push({
        id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        variant_id: variant.id,
        product_name: oldItem.product_name_snapshot,
        variant_name: oldItem.variant_name_snapshot,
        bill_id: bill.id,
        bill_number: bill.bill_number,
        transaction_type: 'bill_reversal',
        quantity: oldItem.quantity,
        previous_stock: prevStock,
        new_stock: restoredStock,
        notes: `Reversal for editing Bill #${bill.bill_number}`,
        created_by: req.user?.email || 'admin',
        created_at: now,
      });
    }
  }

  // 2. Validate new items and new stock availability
  let subtotal = 0;
  const newProcessedItems: BillItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty = parseFloat(item.quantity);
    const rate = parseFloat(item.rate);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `Item #${i + 1} must have quantity greater than 0.` });
    }
    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({ success: false, message: `Item #${i + 1} rate cannot be negative.` });
    }

    const variant = db.variants.find(v => v.id === item.variant_id && !v.deleted_at);
    if (!variant) {
      return res.status(400).json({ success: false, message: `Product variant for item #${i + 1} not found.` });
    }

    if (variant.stock_quantity < qty) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock for ${variant.variant_name}. Available: ${variant.stock_quantity} ${variant.unit}, Requested: ${qty} ${variant.unit}.` 
      });
    }

    const itemTotal = Math.round(qty * rate * 100) / 100;
    subtotal += itemTotal;
    const product = db.products.find(p => p.id === variant.product_id);

    newProcessedItems.push({
      id: `item_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
      bill_id: bill.id,
      product_id: variant.product_id,
      variant_id: variant.id,
      product_name_snapshot: product ? product.name : (item.product_name_snapshot || 'Material'),
      variant_name_snapshot: variant.variant_name,
      unit: variant.unit,
      quantity: qty,
      rate,
      total: itemTotal,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;

  const laborResult = processLaborItems(labor_items);
  const finalLaborTotal = labor_items !== undefined
    ? laborResult.total
    : (labor_charges !== undefined ? Math.max(0, Math.round((parseFloat(labor_charges) || 0) * 100) / 100) : (bill.labor_charges || 0));

  const finalDiscount = discount_amount !== undefined
    ? Math.max(0, Math.round((parseFloat(discount_amount) || 0) * 100) / 100)
    : (bill.discount_amount || 0);

  const grossBeforeDiscount = Math.round((subtotal + finalLaborTotal) * 100) / 100;
  if (finalDiscount > grossBeforeDiscount) {
    return res.status(400).json({
      success: false,
      message: `Net discount (₹${finalDiscount}) cannot exceed gross total (₹${grossBeforeDiscount}).`,
    });
  }

  const totalAmount = Math.max(0, Math.round((grossBeforeDiscount - finalDiscount) * 100) / 100);

  if (bill.paid_amount > totalAmount) {
    return res.status(400).json({ 
      success: false, 
      message: `Total bill amount (₹${totalAmount}) cannot be less than already recorded paid amount (₹${bill.paid_amount}).` 
    });
  }

  // 3. Apply new stock deductions
  for (const item of newProcessedItems) {
    const variant = db.variants.find(v => v.id === item.variant_id)!;
    const prevStock = variant.stock_quantity;
    const newStock = Math.round((prevStock - item.quantity) * 100) / 100;

    variant.stock_quantity = newStock;

    db.stock_transactions.push({
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      variant_id: variant.id,
      product_name: item.product_name_snapshot,
      variant_name: item.variant_name_snapshot,
      bill_id: bill.id,
      bill_number: bill.bill_number,
      transaction_type: 'bill_deduction',
      quantity: item.quantity,
      previous_stock: prevStock,
      new_stock: newStock,
      notes: `Updated Bill #${bill.bill_number} dispatch`,
      created_by: req.user?.email || 'admin',
      created_at: now,
    });
  }

  // 4. Update bill records (and auto-link customer if account number changed & matches a party)
  db.bill_items = db.bill_items.filter(item => item.bill_id !== bill.id);
  db.bill_items.push(...newProcessedItems);

  const pendingAmount = Math.round((totalAmount - bill.paid_amount) * 100) / 100;
  let paymentStatus: 'Pending' | 'Partial Paid' | 'Full Paid' = 'Pending';
  if (pendingAmount === 0) {
    paymentStatus = 'Full Paid';
  } else if (bill.paid_amount > 0) {
    paymentStatus = 'Partial Paid';
  }

  if (customer_account_number !== undefined) {
    const cleanAcc = String(customer_account_number).trim();
    bill.customer_account_number = cleanAcc || undefined;
    if (cleanAcc) {
      const matchedCust = db.customers.find(
        c => !c.deleted_at && c.account_number && c.account_number.trim().toLowerCase() === cleanAcc.toLowerCase()
      );
      if (matchedCust) {
        bill.customer_id = matchedCust.id;
        bill.customer_name = matchedCust.name;
        bill.customer_phone = matchedCust.phone;
        bill.customer_address = matchedCust.address || '';
        bill.customer_taluko = matchedCust.taluko || '';
        bill.customer_district = matchedCust.district || '';
        bill.customer_state = matchedCust.state || '';
        // Sync existing payment records for this bill to the linked party
        for (const p of db.payments) {
          if (p.bill_id === bill.id) {
            p.customer_id = matchedCust.id;
            p.customer_name = matchedCust.name;
          }
        }
      }
    }
  }

  if (customer_name) bill.customer_name = customer_name.trim();
  if (customer_phone !== undefined) bill.customer_phone = customer_phone.trim();
  if (customer_address !== undefined) bill.customer_address = customer_address.trim();
  if (customer_taluko !== undefined) bill.customer_taluko = customer_taluko.trim();
  if (customer_district !== undefined) bill.customer_district = customer_district.trim();
  if (customer_state !== undefined) bill.customer_state = customer_state.trim();
  if (bill_date) bill.bill_date = bill_date;
  if (notes !== undefined) bill.notes = notes.trim();

  bill.subtotal = subtotal;
  if (labor_items !== undefined) {
    bill.labor_items = laborResult.items;
  }
  bill.labor_charges = finalLaborTotal;
  bill.discount_amount = finalDiscount;
  bill.total_amount = totalAmount;
  bill.pending_amount = pendingAmount;
  bill.payment_status = paymentStatus;

  if (reminder_date !== undefined) {
    const cleanDate = reminder_date ? String(reminder_date).trim() || null : null;
    bill.reminder_date = cleanDate;
    bill.reminder_time = cleanDate && reminder_time ? String(reminder_time).trim() || null : null;
    bill.reminder_type = cleanDate ? 'Custom' : 'No Reminder';
  }
  if (reminder_note !== undefined) {
    bill.reminder_note = String(reminder_note).trim() || undefined;
  }

  bill.updated_at = now;
  saveDatabase();

  return res.json({
    success: true,
    message: `Bill ${bill.bill_number} updated successfully. Inventory recalculated.`,
    bill: {
      ...bill,
      items: newProcessedItems,
    },
  });
});

// Update manual reminder date & time on any bill without touching inventory
billsRouter.patch('/:id/reminder', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reminder_date, reminder_time, reminder_note } = req.body;

  const db = getDatabase();
  const bill = db.bills.find(b => b.id === id && !b.deleted_at);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  const cleanDate = reminder_date ? String(reminder_date).trim() || null : null;
  const cleanTime = cleanDate && reminder_time ? String(reminder_time).trim() || null : null;

  bill.reminder_date = cleanDate;
  bill.reminder_time = cleanTime;
  bill.reminder_type = cleanDate ? 'Custom' : 'No Reminder';
  if (reminder_note !== undefined) {
    bill.reminder_note = String(reminder_note).trim() || undefined;
  }
  bill.updated_at = new Date().toISOString();

  saveDatabase();

  return res.json({
    success: true,
    message: cleanDate
      ? `Reminder scheduled for ${cleanDate}${cleanTime ? ` at ${cleanTime}` : ''}.`
      : 'Reminder cleared.',
    bill,
  });
});

// Soft delete bill (reverses inventory deductions and marks bill deleted)
billsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const bill = db.bills.find(b => b.id === id && !b.deleted_at);

  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found.' });
  }

  const now = new Date().toISOString();

  // Reverse stock deductions
  const items = db.bill_items.filter(item => item.bill_id === bill.id);
  for (const item of items) {
    const variant = db.variants.find(v => v.id === item.variant_id);
    if (variant) {
      const prevStock = variant.stock_quantity;
      const restoredStock = Math.round((prevStock + item.quantity) * 100) / 100;
      variant.stock_quantity = restoredStock;

      db.stock_transactions.push({
        id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        variant_id: variant.id,
        product_name: item.product_name_snapshot,
        variant_name: item.variant_name_snapshot,
        bill_id: bill.id,
        bill_number: bill.bill_number,
        transaction_type: 'bill_reversal',
        quantity: item.quantity,
        previous_stock: prevStock,
        new_stock: restoredStock,
        notes: `Inventory restored from soft-deleted Bill #${bill.bill_number}`,
        created_by: req.user?.email || 'admin',
        created_at: now,
      });
    }
  }

  bill.deleted_at = now;
  bill.status = 'cancelled';
  saveDatabase();

  return res.json({
    success: true,
    message: `Bill ${bill.bill_number} archived (soft deleted). Stock restored to inventory and audit history preserved.`,
  });
});
