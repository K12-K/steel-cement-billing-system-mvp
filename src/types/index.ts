export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku?: string;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  price: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: 'Steel Sariya' | 'Cement' | 'Other Equipment' | 'Other Materials';
  status: 'active' | 'inactive';
  description?: string;
  variants: ProductVariant[];
  variant_count?: number;
  has_low_stock?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  stock_history?: StockTransaction[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  taluko: string;
  district: string;
  state: string;
  gst_number?: string;
  total_bills?: number;
  total_billed?: number;
  total_paid?: number;
  total_pending?: number;
  pending_bills_count?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BillItem {
  id: string;
  bill_id: string;
  product_id: string;
  variant_id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  unit: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_taluko: string;
  customer_district: string;
  customer_state: string;
  bill_date: string;
  subtotal: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: 'Pending' | 'Partial Paid' | 'Full Paid';
  reminder_type: 'No Reminder' | '7 Days' | '2 Weeks' | '1 Month' | '3 Months' | '6 Months' | '1 Year';
  reminder_date: string | null;
  notes?: string;
  status: 'confirmed' | 'draft' | 'cancelled';
  items?: BillItem[];
  item_count?: number;
  items_summary?: string;
  payments?: Payment[];
  settings?: BusinessSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Payment {
  id: string;
  bill_id: string;
  bill_number: string;
  customer_id: string;
  customer_name: string;
  payment_date: string;
  amount: number;
  previous_paid_amount: number;
  new_paid_amount: number;
  remaining_amount: number;
  payment_status: 'Pending' | 'Partial Paid' | 'Full Paid';
  payment_mode: 'Cash' | 'Bank Transfer/NEFT' | 'Cheque' | 'UPI';
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface StockTransaction {
  id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  bill_id: string | null;
  bill_number: string | null;
  transaction_type: 'bill_deduction' | 'bill_reversal' | 'manual_adjustment' | 'restock';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface BusinessSettings {
  company_name: string;
  tagline: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch: string;
  terms_conditions: string;
}

export interface DashboardStats {
  stats: {
    total_revenue: number;
    total_billed: number;
    current_month_revenue: number;
    total_pending: number;
    total_bills: number;
    paid_bills: number;
    partial_paid_bills: number;
    pending_bills: number;
  };
  monthly_data: { month: string; billed: number; received: number }[];
  payment_distribution: { name: string; count: number; amount: number }[];
  recent_bills: Bill[];
  recent_payments: Payment[];
  top_pending_bills: Bill[];
  low_stock_variants: (ProductVariant & { product_name: string; category: string })[];
}
