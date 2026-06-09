import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../utils/translations';
import api from '../services/api';
import Header from '../components/Header';
import '../styles/auth.css';

const GuestSignIn = () => {
  const navigate = useNavigate();
  const { language, login, setLoading, loading } = useApp();
  const t = translations[language];

  const [step, setStep] = useState('phone'); // 'phone' | 'verify'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const validatePhoneFormat = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9 || cleaned.length > 15) {
      return { valid: false, message: 'Phone number must be 9-15 digits' };
    }
    return { valid: true };
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    const validation = validatePhoneFormat(phoneNumber);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setLoading(true);

    try {
      const response = await api.registerGuest(phoneNumber);
      if (response.success) {
        setSuccessMessage(response.message);
        setStep('verify');
      } else {
        setError(response.message || 'Failed to start guest sign in');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Guest sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Verification code is required');
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setError('Verification code must be 6 digits');
      return;
    }

    setLoading(true);

    try {
      const response = await api.verifyGuestPhone(phoneNumber, code);
      if (response.success && response.data) {
        login(response.data.user, response.data.token);
        navigate('/dashboard');
      } else {
        setError(response.message || 'Verification failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await api.resendGuestVerification(phoneNumber);
      if (response.success) {
        setSuccessMessage(response.message);
      } else {
        setError(response.message || 'Failed to resend code');
      }
    } catch (err) {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="auth-container">
        <div className="auth-card">
          {step === 'phone' ? (
            <>
              <div className="auth-header">
                <h1>{t.guestSignIn}</h1>
                <p>{t.checkPhone}</p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="auth-form">
                {error && <div className="error-message">{error}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}

                <div className="form-group">
                  <label htmlFor="phoneNumber">{t.phoneNumber}</label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={t.phoneNumber}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                >
                  {loading ? t.loading : t.next}
                </button>
              </form>

              <div className="auth-divider"></div>

              <div className="auth-link">
                <button
                  onClick={() => navigate('/login')}
                  className="link-primary"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t.signIn}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-header">
                <h1>{t.verifyPhone}</h1>
                <p>{t.enterVerificationCode}</p>
              </div>

              <form onSubmit={handleVerifySubmit} className="auth-form">
                {error && <div className="error-message">{error}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}

                <div className="form-group">
                  <label htmlFor="code">{t.verificationCode}</label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t.verificationCode}
                    required
                    maxLength="6"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                >
                  {loading ? t.loading : t.finish}
                </button>
              </form>

              <div className="auth-divider"></div>

              <div className="auth-link">
                <p>{t.dontHaveAccount}</p>
                <button
                  onClick={handleResendCode}
                  className="link-primary"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  disabled={loading}
                >
                  {t.resendCode}
                </button>
              </div>

              <button
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                }}
                className="link-secondary"
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '10px' }}
              >
                {t.back}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default GuestSignIn;
