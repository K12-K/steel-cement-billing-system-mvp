import { Router, Response } from 'express';
import { getDatabase, saveDatabase, Customer } from './db.js';
import { AuthRequest } from './auth.js';

export const customersRouter = Router();

// Get all non-deleted customers
customersRouter.get('/', (req: AuthRequest, res: Response) => {
  const { search, district, state } = req.query;
  const db = getDatabase();

  let customers = db.customers.filter(c => !c.deleted_at);

  if (district && typeof district === 'string' && district !== 'All') {
    customers = customers.filter(c => c.district.toLowerCase() === district.toLowerCase());
  }

  if (state && typeof state === 'string' && state !== 'All') {
    customers = customers.filter(c => c.state.toLowerCase() === state.toLowerCase());
  }

  if (search && typeof search === 'string') {
    const term = search.toLowerCase().trim();
    customers = customers.filter(c => 
      c.name.toLowerCase().includes(term) ||
      (c.account_number && c.account_number.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      c.address.toLowerCase().includes(term) ||
      c.taluko.toLowerCase().includes(term) ||
      c.district.toLowerCase().includes(term)
    );
  }

  // Calculate customer financial summary
  const enriched = customers.map(cust => {
    const custBills = db.bills.filter(b => b.customer_id === cust.id && !b.deleted_at);
    const totalBilled = custBills.reduce((sum, b) => sum + b.total_amount, 0);
    const totalPaid = custBills.reduce((sum, b) => sum + b.paid_amount, 0);
    const totalPending = custBills.reduce((sum, b) => sum + b.pending_amount, 0);
    const pendingBillsCount = custBills.filter(b => b.payment_status !== 'Full Paid').length;

    return {
      ...cust,
      total_bills: custBills.length,
      total_billed: Math.round(totalBilled * 100) / 100,
      total_paid: Math.round(totalPaid * 100) / 100,
      total_pending: Math.round(totalPending * 100) / 100,
      pending_bills_count: pendingBillsCount,
    };
  });

  return res.json({
    success: true,
    customers: enriched,
  });
});

// Lookup customer by exact Party Account Number
customersRouter.get('/by-account/:accountNumber', (req: AuthRequest, res: Response) => {
  const { accountNumber } = req.params;
  const db = getDatabase();
  const accTerm = (accountNumber || '').trim().toLowerCase();
  if (!accTerm) {
    return res.status(400).json({ success: false, message: 'Account number is required.' });
  }

  const customer = db.customers.find(
    c => !c.deleted_at && c.account_number && c.account_number.trim().toLowerCase() === accTerm
  );

  if (!customer) {
    return res.status(404).json({ success: false, message: 'No party found for this account number.' });
  }

  return res.json({
    success: true,
    customer,
  });
});

// Get single customer with detailed billing & payment history
customersRouter.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const customer = db.customers.find(c => c.id === id && !c.deleted_at);

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  const bills = db.bills
    .filter(b => b.customer_id === id && !b.deleted_at)
    .sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime());

  const payments = db.payments
    .filter(p => p.customer_id === id)
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  const totalBilled = bills.reduce((sum, b) => sum + b.total_amount, 0);
  const totalPaid = bills.reduce((sum, b) => sum + b.paid_amount, 0);
  const totalPending = bills.reduce((sum, b) => sum + b.pending_amount, 0);

  return res.json({
    success: true,
    customer: {
      ...customer,
      bills,
      payments,
      total_bills: bills.length,
      total_billed: Math.round(totalBilled * 100) / 100,
      total_paid: Math.round(totalPaid * 100) / 100,
      total_pending: Math.round(totalPending * 100) / 100,
    },
  });
});

// Create customer
customersRouter.post('/', (req: AuthRequest, res: Response) => {
  const { account_number, name, phone, address, taluko, district, state, gst_number } = req.body;

  if (!name || (!phone && !account_number)) {
    return res.status(400).json({
      success: false,
      message: 'Customer name and either Party Account Number or Phone Number are required.',
    });
  }

  const db = getDatabase();
  const cleanAcc = account_number ? String(account_number).trim() : '';

  if (cleanAcc) {
    const duplicate = db.customers.find(
      c => !c.deleted_at && c.account_number && c.account_number.trim().toLowerCase() === cleanAcc.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Party Account Number "${cleanAcc}" is already assigned to ${duplicate.name}.`,
      });
    }
  }

  const now = new Date().toISOString();
  const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newCustomer: Customer = {
    id: customerId,
    account_number: cleanAcc || undefined,
    name: name.trim(),
    phone: phone ? phone.trim() : '',
    address: address ? address.trim() : '',
    taluko: taluko ? taluko.trim() : '',
    district: district ? district.trim() : '',
    state: state ? state.trim() : '',
    gst_number: gst_number ? gst_number.trim() : undefined,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  db.customers.unshift(newCustomer);
  saveDatabase();

  return res.status(201).json({
    success: true,
    message: 'Customer saved successfully.',
    customer: newCustomer,
  });
});

// Update customer
customersRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { account_number, name, phone, address, taluko, district, state, gst_number } = req.body;

  const db = getDatabase();
  const customer = db.customers.find(c => c.id === id && !c.deleted_at);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  if (account_number !== undefined) {
    const cleanAcc = String(account_number).trim();
    if (cleanAcc) {
      const duplicate = db.customers.find(
        c =>
          c.id !== id &&
          !c.deleted_at &&
          c.account_number &&
          c.account_number.trim().toLowerCase() === cleanAcc.toLowerCase()
      );
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Party Account Number "${cleanAcc}" is already assigned to ${duplicate.name}.`,
        });
      }
      customer.account_number = cleanAcc;
    } else {
      customer.account_number = undefined;
    }
  }

  if (name) customer.name = name.trim();
  if (phone !== undefined) customer.phone = phone.trim();
  if (address !== undefined) customer.address = address.trim();
  if (taluko !== undefined) customer.taluko = taluko.trim();
  if (district !== undefined) customer.district = district.trim();
  if (state !== undefined) customer.state = state.trim();
  if (gst_number !== undefined) customer.gst_number = gst_number.trim();
  customer.updated_at = new Date().toISOString();

  // Also sync customer account number / name / phone in active bills for consistent presentation
  for (const b of db.bills) {
    if (b.customer_id === id) {
      b.customer_name = customer.name;
      b.customer_phone = customer.phone;
      b.customer_account_number = customer.account_number;
    }
  }

  saveDatabase();

  return res.json({
    success: true,
    message: 'Customer updated successfully.',
    customer,
  });
});

// Soft delete customer
customersRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const customer = db.customers.find(c => c.id === id && !c.deleted_at);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  customer.deleted_at = new Date().toISOString();
  saveDatabase();

  return res.json({
    success: true,
    message: 'Customer archived (soft deleted). Historical bills and audit records remain preserved.',
  });
});
