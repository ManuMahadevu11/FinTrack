import React, { useState } from 'react';
import { useAuthKey } from '../context/AuthKeyContext';
import { ShieldCheck, Lock, KeyRound, AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';

export const LockScreen: React.FC = () => {
  const { isInitialized, unlockSession, setupMasterPassword, emergencyReset } = useAuthKey();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError('');
    setIsSubmitting(true);

    try {
      const success = await unlockSession(password);
      if (!success) {
        setError('Incorrect password. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await setupMasterPassword(password);
    } catch (err) {
      setError('Failed to set up master password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmergencyReset = async () => {
    setIsSubmitting(true);
    try {
      await emergencyReset();
      setShowResetConfirm(false);
      setPassword('');
      setConfirmPassword('');
      setError('');
    } catch (err) {
      setError('Reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Soft background accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 blur-[90px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-600/30">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome to FinTrack</h1>
          <p className="text-xs text-slate-500">
            Your private personal finance app
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {!isInitialized ? (
          // ONBOARDING SETUP
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
              <span>
                Create a Master Password to keep your data private and secure on this device.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Create Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none pl-10"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none pl-10"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? 'Setting up...' : 'Save & Continue'}
            </Button>
          </form>
        ) : (
          // UNLOCK SESSION
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Master Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none pl-10"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? 'Unlocking...' : 'Unlock App'}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-slate-500 hover:text-rose-600 underline transition"
              >
                Forgot Password? Reset App Data
              </button>
            </div>
          </form>
        )}

        {showResetConfirm && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Reset Local App Data
            </h4>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              If you reset, all saved data on this device will be cleared. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="danger" size="sm" className="w-full" onClick={handleEmergencyReset}>
                Reset Data
              </Button>
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-slate-500 z-10">
        Private & Secure • Runs entirely on your browser
      </div>
    </div>
  );
};
