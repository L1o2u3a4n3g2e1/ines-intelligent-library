import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '../../api/auth.js';
import Button from '../../components/Button.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    token: params.get('token') || '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.password !== form.password_confirmation) {
      setError('Password confirmation does not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(form);
      navigate('/login', {
        replace: true,
        state: {
          email: params.get('email') || '',
          message: 'Password reset successfully. Sign in with your new password.',
        },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page login-page">
      <section className="login-showcase">
        <div className="login-showcase-copy">
          <img className="login-logo" src="/ines-logo.png" alt="INES-Ruhengeri logo" />
          <p className="eyebrow">INES-Ruhengeri</p>
          <h1>Create a new password</h1>
          <p>Use a strong password that you have not used previously for your library account.</p>
        </div>
      </section>
      <section className="auth-panel login-panel">
        <div className="auth-brand">
          <img src="/ines-logo.png" alt="" />
          <div><strong>INES Digital Library</strong><span>Secure account recovery</span></div>
        </div>
        <h2>Reset password</h2>
        {error && <div className="inline-error" role="alert">{error}</div>}
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            New password
            <input type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </label>
          <label>
            Confirm new password
            <input type="password" autoComplete="new-password" minLength="8" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} required />
          </label>
          <Button type="submit" disabled={loading || !form.token}>{loading ? 'Resetting...' : 'Set new password'}</Button>
        </form>
        {!form.token && <div className="inline-error">The reset token is missing. Request a new reset link.</div>}
        <div className="auth-links"><Link to="/forgot-password">Request another link</Link><Link to="/login">Back to login</Link></div>
      </section>
    </main>
  );
}
