import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, IndianRupee, ArrowRight, Sparkles, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('50000');
  const [monthlyExpenses, setMonthlyExpenses] = useState('25000');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (forgotStep === 1) {
        const res = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'No account found with this email');
        }
        setForgotUsername(data.username);
        setForgotStep(2);
      } else {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, password: newPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update password');
        }
        setSuccessMsg('Account recovered! Your password has been updated successfully. Please sign in below.');
        setIsForgot(false);
        setForgotStep(1);
        setForgotEmail('');
        setForgotUsername('');
        setNewPassword('');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { email, password }
      : {
          username,
          email,
          password,
          monthlyIncome: Number(monthlyIncome) || 0,
          monthlyExpenses: Number(monthlyExpenses) || 0,
        };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuthSuccess(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3.5 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/10 mb-4 transition-transform hover:scale-105 duration-300">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
          DebtRelief AI
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          Financial recovery & intelligent lender negotiations platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-md py-8 px-4 shadow-xl shadow-slate-200/50 border border-slate-200/60 rounded-3xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {isForgot ? (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 font-display">Account Recovery</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {forgotStep === 1 
                    ? "Enter your registered email address to locate your account profile."
                    : `Welcome back, ${forgotUsername}! Set your new account access password.`}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleForgotSubmit}>
                {forgotStep === 1 ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Registered Email Address
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex flex-col gap-1">
                      <div className="flex justify-between items-center border-b border-blue-100 pb-1 mb-1">
                        <span className="font-bold text-blue-900">Profile Located</span>
                        <span className="bg-blue-100 text-blue-800 font-mono text-[10px] px-1.5 py-0.5 rounded">Verified</span>
                      </div>
                      <span className="text-slate-600 font-medium">Name: <strong className="text-slate-900">{forgotUsername}</strong></span>
                      <span className="text-slate-600 font-medium">Email: <strong className="text-slate-900">{forgotEmail}</strong></span>
                    </div>

                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Choose New Password
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{forgotStep === 1 ? 'Locate My Account' : 'Reset My Password'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(false);
                    setForgotStep(1);
                    setError('');
                  }}
                  className="text-xs text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); setSuccessMsg(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    isLogin
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); setSuccessMsg(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    !isLogin
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="John Doe"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgot(true);
                          setForgotStep(1);
                          setForgotEmail(email);
                          setError('');
                        }}
                        className="text-xs text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Monthly Income
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <IndianRupee className="h-4 w-4" />
                        </div>
                        <input
                          type="number"
                          required
                          value={monthlyIncome}
                          onChange={(e) => setMonthlyIncome(e.target.value)}
                          placeholder="50000"
                          className="block w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Living Expenses
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <IndianRupee className="h-4 w-4" />
                        </div>
                        <input
                          type="number"
                          required
                          value={monthlyExpenses}
                          onChange={(e) => setMonthlyExpenses(e.target.value)}
                          placeholder="25000"
                          className="block w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-4 text-center">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isLogin ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setIsLogin(false); setError(''); setSuccessMsg(''); }}
                        className="text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
                      >
                        Register here
                      </button>
                    </>
                  ) : (
                    <>
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => { setIsLogin(true); setError(''); setSuccessMsg(''); }}
                        className="text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
                      >
                        Login here
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
