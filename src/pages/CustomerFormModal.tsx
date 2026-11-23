import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, MapPin, Hash } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit: Customer | null;
  onSuccess: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [taluko, setTaluko] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [state, setState] = useState<string>('Gujarat');
  const [gstNumber, setGstNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setAccountNumber(customerToEdit.account_number || '');
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone || '');
      setAddress(customerToEdit.address || '');
      setTaluko(customerToEdit.taluko || '');
      setDistrict(customerToEdit.district || '');
      setState(customerToEdit.state || 'Gujarat');
      setGstNumber(customerToEdit.gst_number || '');
    } else {
      setAccountNumber('');
      setName('');
      setPhone('');
      setAddress('');
      setTaluko('');
      setDistrict('');
      setState('Gujarat');
      setGstNumber('');
    }
    setError(null);
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || (!phone.trim() && !accountNumber.trim())) {
      setError('Customer name and either Party Account Number or Phone Number are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        account_number: accountNumber.trim(),
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        taluko: taluko.trim(),
        district: district.trim(),
        state: state.trim(),
        gst_number: gstNumber.trim(),
      };

      if (customerToEdit) {
        const res = await api.customers.update(customerToEdit.id, payload);
        showToast(res.message, 'success');
      } else {
        const res = await api.customers.create(payload);
        showToast(res.message, 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save customer.');
      showToast(err.message || 'Failed to save customer.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {customerToEdit ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <p className="text-xs text-slate-400">
                Assign a unique Party Account Number for quick automatic bill linkage.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1.5">
                Party A/C No.
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 105"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-amber-500/40 rounded-xl text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Customer / Firm Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Patel (Patel Developers)"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number {!accountNumber.trim() && <span className="text-rose-400">*</span>}
              {accountNumber.trim() && <span className="text-[10px] text-slate-400 normal-case font-normal ml-1">(Optional when A/C No. is set)</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98250 12345"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                required={!accountNumber.trim()}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Site / Billing Address
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Plot no, Street, Landmark or Construction Site Location"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Taluko / Tehsil
              </label>
              <input
                type="text"
                value={taluko}
                onChange={(e) => setTaluko(e.target.value)}
                placeholder="e.g. Daskroi"
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                District
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Ahmedabad"
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Gujarat"
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              GST Number (Optional)
            </label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              placeholder="e.g. 24AAACB1234F1Z5"
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors shadow-lg shadow-amber-950/50 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Customer Details'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
