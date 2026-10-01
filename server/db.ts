import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'staff';
  created_at: string;
  updated_at: string;
}

export interface PasswordResetToken {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: 'Steel Sariya' | 'Cement' | 'Other Equipment' | 'Other Materials';
  status: 'active' | 'inactive';
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku?: string;
  unit: string; // e.g. "KG", "Ton", "Bag (50KG)", "Piece", "Bundle", "Packet"
  stock_quantity: number;
  low_stock_threshold: number;
  price: number; // selling rate
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: 'Pending' | 'Partial Paid' | 'Full Paid';
  reminder_type: 'No Reminder' | '7 Days' | '2 Weeks' | '1 Month' | '3 Months' | '6 Months' | '1 Year';
  reminder_date: string | null;
  notes?: string;
  status: 'confirmed' | 'draft' | 'cancelled';
  items?: BillItem[];
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

export interface DatabaseSchema {
  users: User[];
  password_reset_tokens: PasswordResetToken[];
  products: Product[];
  variants: ProductVariant[];
  customers: Customer[];
  bills: Bill[];
  bill_items: BillItem[];
  payments: Payment[];
  stock_transactions: StockTransaction[];
  settings: BusinessSettings;
}

// In-memory cache loaded from JSON file
let dbInstance: DatabaseSchema | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialData(): DatabaseSchema {
  const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);
  const now = new Date().toISOString();

  const initialProducts: Product[] = [
    {
      id: 'prod_1',
      name: 'TMT 550D Steel Sariya',
      category: 'Steel Sariya',
      status: 'active',
      description: 'High tensile reinforcement thermo-mechanically treated bar for foundation and structural RCC work.',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'prod_2',
      name: 'Ultratech OPC 53 Cement',
      category: 'Cement',
      status: 'active',
      description: 'Grade 53 Ordinary Portland Cement offering superior compressive strength.',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'prod_3',
      name: 'Ambuja Kawach Waterproof Cement',
      category: 'Cement',
      status: 'active',
      description: 'Water-repellent hydrophobic cement specially crafted for roofs and wet zones.',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'prod_4',
      name: 'Binding Wire (18 Gauge)',
      category: 'Other Equipment',
      status: 'active',
      description: 'Annealed mild steel wire for tying reinforcement sariya cages.',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'prod_5',
      name: 'Steel Khili (Concrete Nails)',
      category: 'Other Equipment',
      status: 'active',
      description: 'Hardened wire nails for centering, shuttering, and scaffolding wooden planks.',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'prod_6',
      name: 'River Sand & Washed Aggregate',
      category: 'Other Materials',
      status: 'active',
      description: 'Graded aggregate 20mm and coarse sand for RCC slab casting.',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  const initialVariants: ProductVariant[] = [
    // Steel variants
    {
      id: 'var_1',
      product_id: 'prod_1',
      variant_name: '8mm Sariya',
      sku: 'SAR-8MM',
      unit: 'KG',
      stock_quantity: 4800,
      low_stock_threshold: 1000,
      price: 64.5,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'var_2',
      product_id: 'prod_1',
      variant_name: '10mm Sariya',
      sku: 'SAR-10MM',
      unit: 'KG',
      stock_quantity: 6200,
      low_stock_threshold: 1000,
      price: 63.0,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'var_3',
      product_id: 'prod_1',
      variant_name: '12mm Sariya',
      sku: 'SAR-12MM',
      unit: 'KG',
      stock_quantity: 7500,
      low_stock_threshold: 1500,
      price: 62.5,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'var_4',
      product_id: 'prod_1',
      variant_name: '16mm Sariya',
      sku: 'SAR-16MM',
      unit: 'KG',
      stock_quantity: 3400,
      low_stock_threshold: 800,
      price: 63.5,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'var_5',
      product_id: 'prod_1',
      variant_name: '20mm Sariya',
      sku: 'SAR-20MM',
      unit: 'KG',
      stock_quantity: 1800,
      low_stock_threshold: 500,
      price: 65.0,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    // Cement variants
    {
      id: 'var_6',
      product_id: 'prod_2',
      variant_name: '50 KG Bag',
      sku: 'CEM-ULTRA-50KG',
      unit: 'Bag (50KG)',
      stock_quantity: 450,
      low_stock_threshold: 80,
      price: 380,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'var_7',
      product_id: 'prod_2',
      variant_name: '1 Ton (20 Bags)',
      sku: 'CEM-ULTRA-1TON',
      unit: 'Ton',
      stock_quantity: 18,
      low_stock_threshold: 5,
      price: 7500,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'var_8',
      product_id: 'prod_3',
      variant_name: '50 KG Bag',
      sku: 'CEM-AMB-50KG',
      unit: 'Bag (50KG)',
      stock_quantity: 320,
      low_stock_threshold: 50,
      price: 410,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    // Equipment
    {
      id: 'var_9',
      product_id: 'prod_4',
      variant_name: 'Bundle (25 KG)',
      sku: 'WIRE-18G-25KG',
      unit: 'Bundle',
      stock_quantity: 85,
      low_stock_threshold: 15,
      price: 1950,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'var_10',
      product_id: 'prod_5',
      variant_name: '2.5 Inch Khili (Box 5 KG)',
      sku: 'NAIL-2.5-5KG',
      unit: 'Box',
      stock_quantity: 120,
      low_stock_threshold: 20,
      price: 420,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'var_11',
      product_id: 'prod_5',
      variant_name: '3.0 Inch Khili (Box 5 KG)',
      sku: 'NAIL-3.0-5KG',
      unit: 'Box',
      stock_quantity: 90,
      low_stock_threshold: 20,
      price: 430,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    // Materials
    {
      id: 'var_12',
      product_id: 'prod_6',
      variant_name: '20mm Black Trap Aggregate (1 Brass)',
      sku: 'AGG-20MM-BRASS',
      unit: 'Brass (100 CFT)',
      stock_quantity: 45,
      low_stock_threshold: 10,
      price: 3600,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  const initialCustomers: Customer[] = [
    {
      id: 'cust_1',
      name: 'Ramesh Patel (Patel Developers)',
      phone: '9825123456',
      address: 'Plot 42, Shivalik High Street, Near Science City',
      taluko: 'Daskroi',
      district: 'Ahmedabad',
      state: 'Gujarat',
      gst_number: '24AABCP1234E1Z4',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cust_2',
      name: 'Vikram Singh Shekhawat',
      phone: '9414098765',
      address: 'Near Old Bus Stand, Village Road',
      taluko: 'Kotputli',
      district: 'Jaipur',
      state: 'Rajasthan',
      gst_number: '',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cust_3',
      name: 'Kailash Choudhary (KK Infra)',
      phone: '9893011223',
      address: 'Sector 3, Industrial Area',
      taluko: 'Huzur',
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      gst_number: '23AACCK5566L1ZP',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cust_4',
      name: 'Mahesh Contractor',
      phone: '9726488990',
      address: 'Khodiyar Chowk, Main Market',
      taluko: 'Sanand',
      district: 'Ahmedabad',
      state: 'Gujarat',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
  ];

  const initialBills: Bill[] = [
    {
      id: 'bill_1',
      bill_number: 'BILL-2026-0001',
      customer_id: 'cust_1',
      customer_name: 'Ramesh Patel (Patel Developers)',
      customer_phone: '9825123456',
      customer_address: 'Plot 42, Shivalik High Street, Near Science City',
      customer_taluko: 'Daskroi',
      customer_district: 'Ahmedabad',
      customer_state: 'Gujarat',
      bill_date: '2026-09-20',
      subtotal: 104500,
      total_amount: 104500,
      paid_amount: 60000,
      pending_amount: 44500,
      payment_status: 'Partial Paid',
      reminder_type: '2 Weeks',
      reminder_date: '2026-10-04',
      notes: 'Foundation steel and cement delivery for Block-A.',
      status: 'confirmed',
      created_by: 'admin@steelsariya.com',
      created_at: '2026-09-20T10:15:00.000Z',
      updated_at: '2026-09-22T14:30:00.000Z',
      deleted_at: null,
    },
    {
      id: 'bill_2',
      bill_number: 'BILL-2026-0002',
      customer_id: 'cust_2',
      customer_name: 'Vikram Singh Shekhawat',
      customer_phone: '9414098765',
      customer_address: 'Near Old Bus Stand, Village Road',
      customer_taluko: 'Kotputli',
      customer_district: 'Jaipur',
      customer_state: 'Rajasthan',
      bill_date: '2026-09-25',
      subtotal: 52400,
      total_amount: 52400,
      paid_amount: 52400,
      pending_amount: 0,
      payment_status: 'Full Paid',
      reminder_type: 'No Reminder',
      reminder_date: null,
      notes: 'Full payment cleared in cash upon delivery.',
      status: 'confirmed',
      created_by: 'admin@steelsariya.com',
      created_at: '2026-09-25T11:00:00.000Z',
      updated_at: '2026-09-25T11:00:00.000Z',
      deleted_at: null,
    },
    {
      id: 'bill_3',
      bill_number: 'BILL-2026-0003',
      customer_id: 'cust_3',
      customer_name: 'Kailash Choudhary (KK Infra)',
      customer_phone: '9893011223',
      customer_address: 'Sector 3, Industrial Area',
      customer_taluko: 'Huzur',
      customer_district: 'Bhopal',
      customer_state: 'Madhya Pradesh',
      bill_date: '2026-09-28',
      subtotal: 78000,
      total_amount: 78000,
      paid_amount: 0,
      pending_amount: 78000,
      payment_status: 'Pending',
      reminder_type: '1 Month',
      reminder_date: '2026-10-28',
      notes: 'Credit terms 30 days approved.',
      status: 'confirmed',
      created_by: 'admin@steelsariya.com',
      created_at: '2026-09-28T09:45:00.000Z',
      updated_at: '2026-09-28T09:45:00.000Z',
      deleted_at: null,
    },
  ];

  const initialBillItems: BillItem[] = [
    // bill_1 items
    {
      id: 'item_1',
      bill_id: 'bill_1',
      product_id: 'prod_1',
      variant_id: 'var_2',
      product_name_snapshot: 'TMT 550D Steel Sariya',
      variant_name_snapshot: '10mm Sariya',
      unit: 'KG',
      quantity: 1000,
      rate: 63.0,
      total: 63000,
    },
    {
      id: 'item_2',
      bill_id: 'bill_1',
      product_id: 'prod_2',
      variant_id: 'var_6',
      product_name_snapshot: 'Ultratech OPC 53 Cement',
      variant_name_snapshot: '50 KG Bag',
      unit: 'Bag (50KG)',
      quantity: 100,
      rate: 380,
      total: 38000,
    },
    {
      id: 'item_3',
      bill_id: 'bill_1',
      product_id: 'prod_4',
      variant_id: 'var_9',
      product_name_snapshot: 'Binding Wire (18 Gauge)',
      variant_name_snapshot: 'Bundle (25 KG)',
      unit: 'Bundle',
      quantity: 2,
      rate: 1750,
      total: 3500,
    },
    // bill_2 items
    {
      id: 'item_4',
      bill_id: 'bill_2',
      product_id: 'prod_1',
      variant_id: 'var_3',
      product_name_snapshot: 'TMT 550D Steel Sariya',
      variant_name_snapshot: '12mm Sariya',
      unit: 'KG',
      quantity: 800,
      rate: 62.5,
      total: 50000,
    },
    {
      id: 'item_5',
      bill_id: 'bill_2',
      product_id: 'prod_5',
      variant_id: 'var_10',
      product_name_snapshot: 'Steel Khili (Concrete Nails)',
      variant_name_snapshot: '2.5 Inch Khili (Box 5 KG)',
      unit: 'Box',
      quantity: 5,
      rate: 480,
      total: 2400,
    },
    // bill_3 items
    {
      id: 'item_6',
      bill_id: 'bill_3',
      product_id: 'prod_3',
      variant_id: 'var_8',
      product_name_snapshot: 'Ambuja Kawach Waterproof Cement',
      variant_name_snapshot: '50 KG Bag',
      unit: 'Bag (50KG)',
      quantity: 150,
      rate: 410,
      total: 61500,
    },
    {
      id: 'item_7',
      bill_id: 'bill_3',
      product_id: 'prod_1',
      variant_id: 'var_1',
      product_name_snapshot: 'TMT 550D Steel Sariya',
      variant_name_snapshot: '8mm Sariya',
      unit: 'KG',
      quantity: 250,
      rate: 66.0,
      total: 16500,
    },
  ];

  const initialPayments: Payment[] = [
    {
      id: 'pay_1',
      bill_id: 'bill_1',
      bill_number: 'BILL-2026-0001',
      customer_id: 'cust_1',
      customer_name: 'Ramesh Patel (Patel Developers)',
      payment_date: '2026-09-20',
      amount: 40000,
      previous_paid_amount: 0,
      new_paid_amount: 40000,
      remaining_amount: 64500,
      payment_status: 'Partial Paid',
      payment_mode: 'Bank Transfer/NEFT',
      reference_number: 'NEFT-88392109',
      notes: 'Initial advance payment via RTGS',
      created_by: 'admin@steelsariya.com',
      created_at: '2026-09-20T10:20:00.000Z',
    },
    {
      id: 'pay_2',
      bill_id: 'bill_1',
      bill_number: 'BILL-2026-0001',
      customer_id: 'cust_1',
      customer_name: 'Ramesh Patel (Patel Developers)',
      payment_date: '2026-09-22',
      amount: 20000,
      previous_paid_amount: 40000,
      new_paid_amount: 60000,
      remaining_amount: 44500,
      payment_status: 'Partial Paid',
      payment_mode: 'UPI',
      reference_number: 'UPI/9928172901',
      notes: 'Second installment paid on delivery',
      created_by: 'admin@steelsariya.com',
      created_at: '2026-09-22T14:30:00.000Z',
    },
    {
      id: 'pay_3',
      bill_id: 'bill_2',
      bill_number: 'BILL-2026-0002',
      customer_id: 'cust_2',
      customer_name: 'Vikram Singh Shekhawat',
      payment_date: '2026-09-25',
      amount: 52400,
      previous_paid_amount: 0,
      new_paid_amount: 52400,
      remaining_amount: 0,
      payment_status: 'Full Paid',
      payment_mode: 'Cash',
      notes: 'Full payment received at yard',
      created_by: 'admin@steelsariya.com',
      created_at: '2026-09-25T11:00:00.000Z',
    },
  ];

  const initialStockTransactions: StockTransaction[] = [
    {
      id: 'st_1',
      variant_id: 'var_2',
      product_name: 'TMT 550D Steel Sariya',
      variant_name: '10mm Sariya',
      bill_id: 'bill_1',
      bill_number: 'BILL-2026-0001',
      transaction_type: 'bill_deduction',
      quantity: 1000,
      previous_stock: 7200,
      new_stock: 6200,
      notes: 'Dispatched for Bill #BILL-2026-0001',
      created_by: 'admin@steelsariya.com',
      created_at: '2026-09-20T10:15:00.000Z',
    },
    {
      id: 'st_2',
      variant_id: 'var_6',
      product_name: 'Ultratech OPC 53 Cement',
      variant_name: '50 KG Bag',
      bill_id: 'bill_1',
      bill_number: 'BILL-2026-0001',
      transaction_type: 'bill_deduction',
      quantity: 100,
      previous_stock: 550,
      new_stock: 450,
      notes: 'Dispatched for Bill #BILL-2026-0001',
      created_by: 'admin@steelsariya.com',
      created_at: '2026-09-20T10:15:00.000Z',
    },
  ];

  const initialSettings: BusinessSettings = {
    company_name: 'Bhawani Steel & Cement Traders',
    tagline: 'Wholesale & Retail Distributors of TMT Sariya, Cement & Building Hardware',
    gstin: '24AAACB9876C1ZD',
    phone: '+91 98250 99887 / +91 94260 11223',
    email: 'contact@bhawanisteel.com',
    address: 'Survey No. 128, National Highway 48, GIDC Phase-II',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382445',
    bank_name: 'State Bank of India',
    account_number: '389920192831',
    ifsc_code: 'SBIN0001234',
    branch: 'Commercial City Branch',
    terms_conditions: '1. Goods once sold will not be taken back without prior inspection.\n2. Interest @18% p.a. will be charged if payment is delayed beyond 15 days.\n3. Weight verified on yard weighbridge is final and binding.\n4. Subject to local jurisdiction only.',
  };

  return {
    users: [
      {
        id: 'user_admin',
        email: 'admin@steelsariya.com',
        password_hash: adminPasswordHash,
        name: 'Managing Director (Admin)',
        role: 'admin',
        created_at: now,
        updated_at: now,
      }
    ],
    password_reset_tokens: [],
    products: initialProducts,
    variants: initialVariants,
    customers: initialCustomers,
    bills: initialBills,
    bill_items: initialBillItems,
    payments: initialPayments,
    stock_transactions: initialStockTransactions,
    settings: initialSettings,
  };
}

export function getDatabase(): DatabaseSchema {
  if (dbInstance) return dbInstance;
  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      dbInstance = JSON.parse(content);
      return dbInstance!;
    } catch (e) {
      console.error('Error reading database file, reinitializing default data:', e);
    }
  }

  dbInstance = getInitialData();
  saveDatabase();
  return dbInstance;
}

export function saveDatabase(): void {
  if (!dbInstance) return;
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(dbInstance, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

// Helper to generate next unique bill number atomically
export function generateNextBillNumber(): string {
  const db = getDatabase();
  const year = new Date().getFullYear();
  const prefix = `BILL-${year}-`;
  
  // Find highest existing bill number for current year
  let maxSeq = 0;
  for (const b of db.bills) {
    if (b.bill_number && b.bill_number.startsWith(prefix)) {
      const part = b.bill_number.replace(prefix, '');
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `${prefix}${nextSeq}`;
}
