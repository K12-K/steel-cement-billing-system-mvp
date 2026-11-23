/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';

// Auth Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

// Application Pages
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Customers } from './pages/Customers';
import { CreateBill } from './pages/CreateBill';
import { Bills } from './pages/Bills';
import { BillDetail } from './pages/BillDetail';
import { EditBill } from './pages/EditBill';
import { PendingPayments } from './pages/PendingPayments';
import { PaymentAudit } from './pages/PaymentAudit';
import { Rozmel } from './pages/Rozmel';
import { Settings } from './pages/Settings';

function AppContent() {
  const { user, loading, isAuthenticated } = useAuth();

  // Navigation state
  const [currentPath, setCurrentPath] = useState<string>('dashboard');
  const [activeParamId, setActiveParamId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Auth flow states (for forgot -> reset password)
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>('login');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetCode, setResetCode] = useState<string>('');

  const navigate = (path: string, id?: string) => {
    setCurrentPath(path);
    setActiveParamId(id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading spinner during session verification
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Loading Steel &amp; Cement Billing Portal...
        </p>
      </div>
    );
  }

  // Unauthenticated routes: Redirect to Login/Register/Password Reset
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <Register onNavigate={(view) => setAuthView(view as any)} />;
    }
    if (authView === 'forgot-password') {
      return (
        <ForgotPassword
          onNavigate={(view) => setAuthView(view as any)}
          onCodeGenerated={(email, code) => {
            setResetEmail(email);
            if (code) setResetCode(code);
          }}
        />
      );
    }
    if (authView === 'reset-password') {
      return (
        <ResetPassword
          initialEmail={resetEmail}
          initialCode={resetCode}
          onNavigate={(view) => setAuthView(view as any)}
        />
      );
    }
    return <Login onNavigate={(view) => setAuthView(view as any)} />;
  }

  // Determine current page title
  const getPageTitle = () => {
    switch (currentPath) {
      case 'dashboard':
        return 'Business Dashboard';
      case 'products':
        return 'Products & Inventory';
      case 'customers':
        return 'Customer Directory';
      case 'create-bill':
        return 'Create Material Bill';
      case 'bills':
        return 'Invoices & Bills';
      case 'bill-detail':
        return 'Bill / Cash Memo Details';
      case 'bill-edit':
        return 'Edit Bill';
      case 'pending-payments':
        return 'Pending Dues & Reminders';
      case 'rozmel':
        return 'Rozmel / Daily Cash Book';
      case 'payment-audit':
        return 'Payment Audit Trail';
      case 'settings':
        return 'Settings & Profile';
      default:
        return 'Steel & Cement Portal';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Responsive Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={navigate}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Wrapper with Sidebar Offset */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <Navbar
          title={getPageTitle()}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigate={navigate}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentPath === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {currentPath === 'products' && <Products />}
          {currentPath === 'customers' && <Customers onNavigate={navigate} />}
          {currentPath === 'create-bill' && (
            <CreateBill onNavigate={navigate} initialCustomerId={activeParamId} />
          )}
          {currentPath === 'bills' && <Bills onNavigate={navigate} />}
          {currentPath === 'bill-detail' && activeParamId && (
            <BillDetail billId={activeParamId} onNavigate={navigate} />
          )}
          {currentPath === 'bill-edit' && activeParamId && (
            <EditBill billId={activeParamId} onNavigate={navigate} />
          )}
          {currentPath === 'pending-payments' && <PendingPayments onNavigate={navigate} />}
          {currentPath === 'rozmel' && <Rozmel />}
          {currentPath === 'payment-audit' && <PaymentAudit />}
          {currentPath === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
