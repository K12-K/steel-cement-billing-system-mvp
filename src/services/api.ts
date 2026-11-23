import { 
  User, 
  Product, 
  ProductVariant, 
  Customer, 
  Bill, 
  Payment, 
  StockTransaction, 
  BusinessSettings, 
  DashboardStats,
  RozmelEntry,
  RozmelSummary,
  RozmelDailyBreakdown,
  DueReminder
} from '../types';

const TOKEN_KEY = 'steel_cement_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'An unexpected server error occurred.');
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ success: boolean; token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    register: (data: { email: string; password: string; name?: string }) =>
      request<{ success: boolean; token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    forgotPassword: (email: string) =>
      request<{ success: boolean; message: string; reset_code?: string; expires_at?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (payload: { email: string; code: string; new_password: string }) =>
      request<{ success: boolean; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    me: () =>
      request<{ success: boolean; user: User }>('/api/auth/me'),

    changePassword: (payload: { current_password: string; new_password: string }) =>
      request<{ success: boolean; message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Products
  products: {
    list: (params?: { category?: string; search?: string; low_stock?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.category) q.set('category', params.category);
      if (params?.search) q.set('search', params.search);
      if (params?.low_stock) q.set('low_stock', 'true');
      return request<{ success: boolean; products: Product[] }>(`/api/products?${q.toString()}`);
    },

    get: (id: string) =>
      request<{ success: boolean; product: Product & { variants: ProductVariant[]; stock_history: StockTransaction[] } }>(`/api/products/${id}`),

    create: (data: Omit<Partial<Product>, 'variants'> & { variants?: Partial<ProductVariant>[] }) =>
      request<{ success: boolean; message: string; product: Product }>('/api/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<Product>) =>
      request<{ success: boolean; message: string; product: Product }>(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/products/${id}`, {
        method: 'DELETE',
      }),

    addVariant: (productId: string, data: Partial<ProductVariant>) =>
      request<{ success: boolean; message: string; variant: ProductVariant }>(`/api/products/${productId}/variants`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateVariant: (variantId: string, data: Partial<ProductVariant>) =>
      request<{ success: boolean; message: string; variant: ProductVariant }>(`/api/products/variants/${variantId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteVariant: (variantId: string) =>
      request<{ success: boolean; message: string }>(`/api/products/variants/${variantId}`, {
        method: 'DELETE',
      }),

    adjustStock: (variantId: string, payload: { adjustment_type: 'add' | 'reduce' | 'set'; quantity: number; notes?: string }) =>
      request<{ success: boolean; message: string; variant: ProductVariant; transaction: StockTransaction }>(`/api/products/variants/${variantId}/stock-adjust`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Customers
  customers: {
    list: (params?: { search?: string; district?: string; state?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params?.search);
      if (params?.district) q.set('district', params?.district);
      if (params?.state) q.set('state', params?.state);
      return request<{ success: boolean; customers: Customer[] }>(`/api/customers?${q.toString()}`);
    },

    get: (id: string) =>
      request<{ success: boolean; customer: Customer & { bills: Bill[]; payments: Payment[] } }>(`/api/customers/${id}`),

    byAccount: (accountNumber: string) =>
      request<{ success: boolean; customer: Customer }>(`/api/customers/by-account/${encodeURIComponent(accountNumber)}`),

    create: (data: Partial<Customer>) =>
      request<{ success: boolean; message: string; customer: Customer }>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<Customer>) =>
      request<{ success: boolean; message: string; customer: Customer }>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/customers/${id}`, {
        method: 'DELETE',
      }),
  },

  // Bills
  bills: {
    nextNumber: () =>
      request<{ success: boolean; bill_number: string }>('/api/bills/next-number'),

    list: (params?: Record<string, string | number | undefined>) => {
      const q = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') q.set(k, String(v));
        });
      }
      return request<{
        success: boolean;
        bills: Bill[];
        pagination: { total: number; page: number; limit: number; total_pages: number };
      }>(`/api/bills?${q.toString()}`);
    },

    get: (id: string) =>
      request<{ success: boolean; bill: Bill }>(`/api/bills/${id}`),

    create: (payload: any) =>
      request<{ success: boolean; message: string; bill: Bill }>('/api/bills', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: (id: string, payload: any) =>
      request<{ success: boolean; message: string; bill: Bill }>(`/api/bills/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/bills/${id}`, {
        method: 'DELETE',
      }),

    updateReminder: (id: string, payload: { reminder_date: string | null; reminder_time?: string | null; reminder_note?: string }) =>
      request<{ success: boolean; message: string; bill: Bill }>(`/api/bills/${id}/reminder`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  },

  // Payments
  payments: {
    record: (payload: {
      bill_id: string;
      amount: number;
      payment_date?: string;
      payment_mode?: string;
      reference_number?: string;
      notes?: string;
    }) =>
      request<{ success: boolean; message: string; payment: Payment; bill: Bill }>('/api/payments/record', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    audit: (params?: Record<string, string | number | undefined>) => {
      const q = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') q.set(k, String(v));
        });
      }
      return request<{
        success: boolean;
        payments: Payment[];
        total_received: number;
        pagination: { total: number; page: number; limit: number; total_pages: number };
      }>(`/api/payments/audit?${q.toString()}`);
    },

    pending: (params?: { search?: string; customer_id?: string; reminder_due?: boolean; status_filter?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.customer_id) q.set('customer_id', params.customer_id);
      if (params?.status_filter) q.set('status_filter', params.status_filter);
      if (params?.reminder_due) q.set('reminder_due', 'true');
      return request<{
        success: boolean;
        bills: Bill[];
        total_pending_amount: number;
        total_pending_bills: number;
      }>(`/api/payments/pending?${q.toString()}`);
    },

    customDues: {
      list: (params?: { search?: string; status?: string; reminder_due?: boolean }) => {
        const q = new URLSearchParams();
        if (params?.search) q.set('search', params.search);
        if (params?.status) q.set('status', params.status);
        if (params?.reminder_due) q.set('reminder_due', 'true');
        return request<{
          success: boolean;
          dues: DueReminder[];
          total_pending_amount: number;
        }>(`/api/payments/custom-dues?${q.toString()}`);
      },

      create: (payload: Partial<DueReminder>) =>
        request<{ success: boolean; message: string; due: DueReminder }>('/api/payments/custom-dues', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),

      update: (id: string, payload: Partial<DueReminder>) =>
        request<{ success: boolean; message: string; due: DueReminder }>(`/api/payments/custom-dues/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),

      delete: (id: string) =>
        request<{ success: boolean; message: string }>(`/api/payments/custom-dues/${id}`, {
          method: 'DELETE',
        }),
    },
  },

  // Dashboard
  dashboard: {
    stats: () =>
      request<DashboardStats & { success: boolean }>('/api/dashboard/stats'),
  },

  // Settings
  settings: {
    get: () =>
      request<{ success: boolean; settings: BusinessSettings }>('/api/settings'),

    update: (payload: Partial<BusinessSettings>) =>
      request<{ success: boolean; message: string; settings: BusinessSettings }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  // Rozmel / Cash Book (Standalone)
  rozmel: {
    list: (params?: { date?: string; from_date?: string; to_date?: string; type?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.date) q.set('date', params.date);
      if (params?.from_date) q.set('from_date', params.from_date);
      if (params?.to_date) q.set('to_date', params.to_date);
      if (params?.type) q.set('type', params.type);
      if (params?.search) q.set('search', params.search);
      return request<{
        success: boolean;
        entries: RozmelEntry[];
        summary: RozmelSummary;
        daily_breakdown: RozmelDailyBreakdown[];
      }>(`/api/rozmel?${q.toString()}`);
    },

    create: (payload: Partial<RozmelEntry>) =>
      request<{ success: boolean; message: string; entry: RozmelEntry }>('/api/rozmel', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: (id: string, payload: Partial<RozmelEntry>) =>
      request<{ success: boolean; message: string; entry: RozmelEntry }>(`/api/rozmel/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/rozmel/${id}`, {
        method: 'DELETE',
      }),
  },
};
