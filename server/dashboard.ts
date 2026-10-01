import { Router, Response } from 'express';
import { getDatabase } from './db.js';
import { AuthRequest } from './auth.js';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const nonDeletedBills = db.bills.filter(b => !b.deleted_at);

  // Total metrics
  const totalBilled = nonDeletedBills.reduce((sum, b) => sum + b.total_amount, 0);
  const totalReceived = nonDeletedBills.reduce((sum, b) => sum + b.paid_amount, 0);
  const totalPending = nonDeletedBills.reduce((sum, b) => sum + b.pending_amount, 0);

  const totalBills = nonDeletedBills.length;
  const paidBillsCount = nonDeletedBills.filter(b => b.payment_status === 'Full Paid').length;
  const partialPaidBillsCount = nonDeletedBills.filter(b => b.payment_status === 'Partial Paid').length;
  const pendingBillsCount = nonDeletedBills.filter(b => b.payment_status === 'Pending').length;

  // Current month revenue
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Payments received in current month
  const currentMonthPayments = db.payments.filter(p => p.payment_date && p.payment_date.startsWith(currentYearMonth));
  const currentMonthRevenue = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  // Monthly revenue trends (last 6 months)
  const monthlyData: { month: string; billed: number; received: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });

    const monthBills = nonDeletedBills.filter(b => b.bill_date && b.bill_date.startsWith(ym));
    const monthPayments = db.payments.filter(p => p.payment_date && p.payment_date.startsWith(ym));

    const billedVal = monthBills.reduce((s, b) => s + b.total_amount, 0);
    const receivedVal = monthPayments.reduce((s, p) => s + p.amount, 0);

    monthlyData.push({
      month: label,
      billed: Math.round(billedVal),
      received: Math.round(receivedVal),
    });
  }

  // Payment Status Distribution
  const paymentDistribution = [
    { name: 'Full Paid', count: paidBillsCount, amount: nonDeletedBills.filter(b => b.payment_status === 'Full Paid').reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Partial Paid', count: partialPaidBillsCount, amount: nonDeletedBills.filter(b => b.payment_status === 'Partial Paid').reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Pending', count: pendingBillsCount, amount: nonDeletedBills.filter(b => b.payment_status === 'Pending').reduce((s, b) => s + b.total_amount, 0) },
  ];

  // Recent Bills (last 6)
  const recentBills = [...nonDeletedBills]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  // Recent Payments (last 6)
  const recentPayments = [...db.payments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  // Top Pending Bills
  const topPendingBills = [...nonDeletedBills]
    .filter(b => b.payment_status !== 'Full Paid')
    .sort((a, b) => b.pending_amount - a.pending_amount)
    .slice(0, 6);

  // Low stock alerts
  const lowStockVariants = db.variants
    .filter(v => !v.deleted_at && v.stock_quantity <= v.low_stock_threshold)
    .map(v => {
      const prod = db.products.find(p => p.id === v.product_id);
      return {
        ...v,
        product_name: prod ? prod.name : 'Unknown Product',
        category: prod ? prod.category : 'General',
      };
    });

  return res.json({
    success: true,
    stats: {
      total_revenue: Math.round(totalReceived * 100) / 100,
      total_billed: Math.round(totalBilled * 100) / 100,
      current_month_revenue: Math.round(currentMonthRevenue * 100) / 100,
      total_pending: Math.round(totalPending * 100) / 100,
      total_bills: totalBills,
      paid_bills: paidBillsCount,
      partial_paid_bills: partialPaidBillsCount,
      pending_bills: pendingBillsCount,
    },
    monthly_data: monthlyData,
    payment_distribution: paymentDistribution,
    recent_bills: recentBills,
    recent_payments: recentPayments,
    top_pending_bills: topPendingBills,
    low_stock_variants: lowStockVariants,
  });
});
