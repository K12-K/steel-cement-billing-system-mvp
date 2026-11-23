import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  CreditCard,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  User,
  ShieldCheck
} from 'lucide-react';
import { BusinessSettings } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Settings: React.FC = () => {
  const { user, changePassword } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.settings.get();
        if (res.success) {
          setSettings(res.settings);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load business settings.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [showToast]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSavingSettings(true);
    try {
      const res = await api.settings.update(settings);
      if (res.success) {
        showToast(res.message, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in current and new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    const success = await changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    setChangingPassword(false);

    if (success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError('Failed to change password. Please verify your current password.');
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-3 text-xs text-slate-400">Loading business configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-amber-500" />
            Business Profile &amp; Invoice Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure trade name, GSTIN, warehouse address, bank payment details, and account security.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Business Information & Bank Details */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Firm Information */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Business Entity &amp; Contact Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Company / Firm Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    GSTIN Number (Profile Record)
                  </label>
                  <input
                    type="text"
                    value={settings.gstin}
                    onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                    placeholder="Optional (hidden on bills unless enabled below)"
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-mono text-amber-400 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Cash Memo & GSTIN Display Controls */}
              <div className="p-4 bg-slate-950/70 border border-amber-500/25 rounded-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white">Show GSTIN on Bills &amp; Exported PDFs</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Keep OFF for Cash Memo bills so your GSTIN is never printed or shared on any bill.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        show_gstin_on_bills: !(settings.show_gstin_on_bills ?? false),
                      })
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 ${settings.show_gstin_on_bills
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/50'
                      }`}
                  >
                    {settings.show_gstin_on_bills ? 'ON — GSTIN Visible on Bills' : 'OFF — GSTIN Hidden (Cash Memo)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Bill Header Title
                    </label>
                    <select
                      value={
                        ['CASH MEMO', 'CASH MEMO / રોકડ મેમો', 'TAX INVOICE', 'ESTIMATE / BILL'].includes(
                          settings.bill_header_title || 'CASH MEMO'
                        )
                          ? settings.bill_header_title || 'CASH MEMO'
                          : 'CUSTOM'
                      }
                      onChange={(e) => {
                        if (e.target.value !== 'CUSTOM') {
                          setSettings({ ...settings, bill_header_title: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="CASH MEMO">CASH MEMO (Recommended)</option>
                      <option value="CASH MEMO / રોકડ મેમો">CASH MEMO / રોકડ મેમો (Screen Bilingual)</option>
                      <option value="TAX INVOICE">TAX INVOICE</option>
                      <option value="ESTIMATE / BILL">ESTIMATE / BILL</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div>
                      <div className="text-[11px] font-bold text-slate-200">Show Bank Details on Bills</div>
                      <div className="text-[10px] text-slate-400">Include Bank A/C &amp; IFSC box</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          show_bank_details_on_bills: !(settings.show_bank_details_on_bills ?? false),
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all shrink-0 ${settings.show_bank_details_on_bills
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-700 text-slate-400'
                        }`}
                    >
                      {settings.show_bank_details_on_bills ? 'Shown' : 'Hidden'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Business Subtitle / Tagline
                </label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Numbers
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Yard / Warehouse Street Address
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={settings.state}
                    onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={settings.pincode}
                    onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Bank Settlement Details (Shown on Printed Invoices)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={settings.bank_name}
                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={settings.account_number}
                    onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-mono text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={settings.ifsc_code}
                    onChange={(e) => setSettings({ ...settings, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={settings.branch}
                    onChange={(e) => setSettings({ ...settings, branch: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Standard Invoice Terms &amp; Conditions
                </label>
                <textarea
                  rows={4}
                  value={settings.terms_conditions}
                  onChange={(e) => setSettings({ ...settings, terms_conditions: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-950/50 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Saving Profile...' : 'Save Business Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: User Profile & Change Password */}
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-lg">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-white text-sm truncate">{user?.name || 'Administrator'}</h3>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Authorized Manager
                </span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Lock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Change Password
              </h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              {passwordError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors disabled:opacity-50"
              >
                {changingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
