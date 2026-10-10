import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Zap, KeyRound, CheckCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      if (err.message === 'ACCOUNT_DEACTIVATED') {
        setError('This account has been deactivated by the administrator. Access is disabled.');
      } else {
        setError(
          err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
            ? 'Invalid email or password. Please try again.'
            : err.message || 'Login failed'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address above first to reset your password.');
      return;
    }
    setError('');
    setResetMessage('');
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage(`Password reset link sent to ${email}. Check your inbox/spam folder.`);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email. Verify your email address.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-600 rounded-full opacity-5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gold-500 rounded-full opacity-5 blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gold-gradient opacity-60" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="card p-5 sm:p-8 border-dark-400">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo mark */}
            <div className="mx-auto w-24 h-24 mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="MAN POWER Logo" className="w-full h-full object-contain filter drop-shadow-lg" />
            </div>
            <h1 className="text-3xl font-black text-cream-100 font-heading tracking-tight">
              MAN POWER
            </h1>
            <p className="text-gold-500 text-sm font-medium mt-1 tracking-widest uppercase">
              CBE — Workforce Management
            </p>
            <div className="gold-divider mt-4" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs text-gold-400 hover:text-gold-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound size={12} /> {resetLoading ? 'Sending...' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-500 hover:text-gold-400 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {resetMessage && (
              <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                <span>{resetMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-dark-900 border-t-transparent" />
              ) : (
                <Zap size={16} />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-cream-500 mt-6">
            ManPower CBE — Coimbatore Workforce Solutions
          </p>
          <p className="text-center text-xs text-dark-300 mt-1">
            manpowerofcbe@gmail.com · @manpower_cbe
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
