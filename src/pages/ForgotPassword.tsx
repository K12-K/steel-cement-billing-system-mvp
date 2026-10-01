import React, { useState } from 'react';
import { Mail, ArrowLeft, Building2, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ForgotPasswordProps {
  onNavigate: (view: string) => void;
  onCodeGenerated: (email: string, code?: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate, onCodeGenerated }) => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setSubmitted(true);
      if (res.reset_code) {
        setGeneratedCode(res.reset_code);
        onCodeGenerated(email.trim(), res.reset_code);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 items-center justify-center shadow-xl shadow-orange-950/40 text-white mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Reset Password
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Enter your account email to receive a password reset verification code.
          </p>
        </div>

        <div className="mt-8 bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {!submitted ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@steelsariya.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 active:bg-amber-700 shadow-lg shadow-amber-950/50 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending email code...
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-white mb-1">Reset Code Dispatched</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  We have simulated sending password reset instructions to{' '}
                  <span className="font-semibold text-white">{email}</span>.
                </p>
                {generatedCode && (
                  <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-700">
                    <span className="text-[11px] text-slate-400 uppercase font-medium block mb-1">
                      Verification Code:
                    </span>
                    <span className="text-lg font-mono font-bold tracking-widest text-amber-400">
                      {generatedCode}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onNavigate('reset-password')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/40"
              >
                <KeyRound className="w-4 h-4" />
                Enter Verification Code &amp; New Password
              </button>
            </div>
          )}

          <div className="mt-6 text-center pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
