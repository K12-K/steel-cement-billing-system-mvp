import { Router, Response } from 'express';
import { getDatabase, saveDatabase, Payment, Bill } from './db.js';
import { AuthRequest } from './auth.js';

export const paymentsRouter = Router();

// Record a new payment against an existing bill
paymentsRouter.post('/record', (req: AuthRequest, res: Response) => {
  const { bill_id, amount, payment_date, payment_mode, reference_number, notes } = req.body;

  if (!bill_id || amount === undefined) {
    return res.status(400).json({ success: false, message: 'Bill ID and payment amount are required.' });
  }

  const payAmount = Math.round((parseFloat(amount) || 0) * 100) / 100;
  if (payAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
  }

  const db = getDatabase();
  const bill = db.bills.find(b => b.id === bill_id && !b.deleted_at);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found or has been deleted.' });
  }

  if (bill.pending_amount <= 0) {
    return res.status(400).json({ success: false, message: `This bill (${bill.bill_number}) is already fully paid.` });
  }

  if (payAmount > bill.pending_amount) {
    return res.status(400).json({ 
      success: false, 
      message: `Payment amount (₹${payAmount}) cannot exceed outstanding pending amount (₹${bill.pending_amount}).` 
    });
  }

  const prevPaid = bill.paid_amount;
  const newPaid = Math.round((prevPaid + payAmount) * 100) / 100;
  const newPending = Math.round((bill.total_amount - newPaid) * 100) / 100;
  const newStatus: 'Pending' | 'Partial Paid' | 'Full Paid' = newPending === 0 ? 'Full Paid' : 'Partial Paid';

  const now = new Date().toISOString();
  const paymentDate = payment_date || now.split('T')[0];

  // Create immutable Payment Audit record
  const paymentRecord: Payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    bill_id: bill.id,
    bill_number: bill.bill_number,
    customer_id: bill.customer_id,
    customer_name: bill.customer_name,
    payment_date: paymentDate,
    amount: payAmount,
    previous_paid_amount: prevPaid,
    new_paid_amount: newPaid,
    remaining_amount: newPending,
    payment_status: newStatus,
    payment_mode: payment_mode || 'Cash',
    reference_number: reference_number ? reference_number.trim() : undefined,
    notes: notes ? notes.trim() : 'Payment received against outstanding balance',
    created_by: req.user?.email || 'admin',
    created_at: now,
  };

  db.payments.unshift(paymentRecord);

  // Update Bill record
  bill.paid_amount = newPaid;
  bill.pending_amount = newPending;
  bill.payment_status = newStatus;
  bill.updated_at = now;

  saveDatabase();

  return res.status(201).json({
    success: true,
    message: `Payment of ₹${payAmount.toLocaleString('en-IN')} recorded successfully for Bill ${bill.bill_number}.`,
    payment: paymentRecord,
    bill,
  });
});

// Get Payment Audit Log with filters
paymentsRouter.get('/audit', (req: AuthRequest, res: Response) => {
  const { 
    search, 
    customer_id, 
    bill_number, 
    payment_mode, 
    from_date, 
    to_date,
    page = '1',
    limit = '50'
  } = req.query;

  const db = getDatabase();
  let list = [...db.payments];

  if (customer_id && typeof customer_id === 'string' && customer_id !== 'All') {
    list = list.filter(p => p.customer_id === customer_id);
  }

  if (bill_number && typeof bill_number === 'string') {
    list = list.filter(p => p.bill_number.toLowerCase().includes(bill_number.toLowerCase()));
  }

  if (payment_mode && typeof payment_mode === 'string' && payment_mode !== 'All') {
    list = list.filter(p => p.payment_mode === payment_mode);
  }

  if (from_date && typeof from_date === 'string') {
    list = list.filter(p => p.payment_date >= from_date);
  }

  if (to_date && typeof to_date === 'string') {
    list = list.filter(p => p.payment_date <= to_date);
  }

  if (search && typeof search === 'string') {
    const term = search.toLowerCase().trim();
    list = list.filter(p => 
      p.bill_number.toLowerCase().includes(term) ||
      p.customer_name.toLowerCase().includes(term) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(term)) ||
      (p.notes && p.notes.toLowerCase().includes(term))
    );
  }

  // Chronological sort: newest first
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalAmountReceived = list.reduce((sum, p) => sum + p.amount, 0);

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
  const total = list.length;
  const paginated = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return res.json({
    success: true,
    payments: paginated,
    total_received: Math.round(totalAmountReceived * 100) / 100,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    },
  });
});

// Get Pending Payments list
paymentsRouter.get('/pending', (req: AuthRequest, res: Response) => {
  const { search, customer_id, reminder_due, status_filter } = req.query;
  const db = getDatabase();

  let pendingBills = db.bills.filter(b => !b.deleted_at && (b.payment_status === 'Pending' || b.payment_status === 'Partial Paid'));

  if (status_filter && typeof status_filter === 'string' && status_filter !== 'All') {
    pendingBills = pendingBills.filter(b => b.payment_status === status_filter);
  }

  if (customer_id && typeof customer_id === 'string' && customer_id !== 'All') {
    pendingBills = pendingBills.filter(b => b.customer_id === customer_id);
  }

  if (search && typeof search === 'string') {
    const term = search.toLowerCase().trim();
    pendingBills = pendingBills.filter(b => 
      b.bill_number.toLowerCase().includes(term) ||
      b.customer_name.toLowerCase().includes(term) ||
      b.customer_phone.toLowerCase().includes(term) ||
      b.customer_district.toLowerCase().includes(term)
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (reminder_due === 'true') {
    pendingBills = pendingBills.filter(b => b.reminder_date && b.reminder_date <= todayStr);
  }

  // Sort by pending amount descending or bill date
  pendingBills.sort((a, b) => b.pending_amount - a.pending_amount);

  const totalPendingAmount = pendingBills.reduce((sum, b) => sum + b.pending_amount, 0);

  return res.json({
    success: true,
    bills: pendingBills,
    total_pending_amount: Math.round(totalPendingAmount * 100) / 100,
    total_pending_bills: pendingBills.length,
  });
});
