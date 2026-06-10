import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiPhone } from 'react-icons/fi';
import AuthLayout from '../layouts/AuthLayout';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { MOCK_USER } from '../data/mockData';

export default function Login() {
  const { login, language } = useApp();
  const { t } = useTranslation(language);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guest state
  const [guestPhone, setGuestPhone] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 900));
      login({ ...MOCK_USER, email: form.email || MOCK_USER.email, name: 'Anne Louange' }, 'mock-token-123');
      navigate('/dashboard');
    } catch {
      setError(t('invalidCredentials'));
    } finally { setLoading(false); }
  };

  const handleGuestLogin = async () => {
    const clean = guestPhone.replace(/\s/g, '');
    if (!clean || clean.length < 9) {
      setGuestError(t('phoneInvalid'));
      return;
    }
    setGuestError('');
    setGuestLoading(true);
    await new Promise(r => setTimeout(r, 700));
    login({ id: `guest-${Date.now()}`, name: 'Guest', phone: clean, isGuest: true, avatar: null }, 'guest-token');
    navigate('/dashboard');
  };

  return (
    <AuthLayout title={t('login')} subtitle={t('loginSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">
            {error}
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-brand-800 mb-1.5">{t('email')}</label>
          <div className="relative">
            <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={16} />
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com" className="input-field pl-10" required />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-medium text-brand-800">{t('password')}</label>
            <Link to="/forgot-password" className="text-xs text-brand-500 hover:text-brand-600 transition-colors">{t('forgotPassword')}</Link>
          </div>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={16} />
            <input type={showPw ? 'text' : 'password'} value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••" className="input-field pl-10 pr-10" required />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600 transition-colors">
              {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            </button>
          </div>
        </div>

        <motion.button type="submit" disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
          className="btn-primary w-full py-3.5 text-base mt-2">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {t('signingIn')}
            </span>
          ) : (
            <span className="flex items-center gap-2">{t('login')} <FiArrowRight /></span>
          )}
        </motion.button>

        {/* Demo hint */}
        <div className="bg-brand-50 rounded-2xl px-4 py-3 text-center">
          <p className="text-xs text-gray-500">{t('demoHint')}</p>
        </div>

        {/* ── Continue as Guest ── */}
        <div className="relative flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-brand-100" />
          <span className="text-xs text-gray-400 font-medium">{t('orDivider')}</span>
          <div className="flex-1 h-px bg-brand-100" />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-brand-950 flex items-center gap-2">
            <FiPhone size={14} className="text-brand-500" /> {t('continueAsGuest')}
          </p>
          <p className="text-xs text-gray-500">{t('guestDesc')}</p>

          {guestError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-red-500">{guestError}</motion.p>
          )}

          <div className="relative">
            <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={16} />
            <input
              type="tel"
              value={guestPhone}
              onChange={e => { setGuestPhone(e.target.value); setGuestError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleGuestLogin()}
              placeholder="+250 7XX XXX XXX"
              className="input-field pl-10"
            />
          </div>

          <motion.button
            type="button"
            onClick={handleGuestLogin}
            disabled={guestLoading}
            whileHover={{ scale: guestLoading ? 1 : 1.02 }} whileTap={{ scale: 0.98 }}
            className="btn-secondary w-full py-3 text-sm">
            {guestLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                {t('connecting')}
              </span>
            ) : (
              <span className="flex items-center gap-2"><FiPhone size={14} /> {t('continueAsGuest')}</span>
            )}
          </motion.button>
        </div>

        <p className="text-center text-sm text-gray-500">
          {t('noAccount')}{' '}
          <Link to="/register" className="text-brand-600 font-semibold hover:text-brand-800 transition-colors">{t('register')}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
