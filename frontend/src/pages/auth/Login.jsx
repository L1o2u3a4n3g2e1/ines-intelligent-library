import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getDashboardPath } from '../../utils/roles.js';

export default function Login() {
  const location = useLocation();
  const [form, setForm] = useState({
    email: location.state?.email || '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, authError } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await login(form.email, form.password);
      navigate(getDashboardPath(session.user.role), { replace: true });
    } catch (err) {
      setError(err.message);
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
          <h1>Welcome to INES Digital Library</h1>
          <p>Discover academic resources, explore faculty collections, submit books for approval, and listen with intelligent English narration.</p>
        </div>
      </section>
      <section className="auth-panel login-panel">
        <div className="auth-brand">
          <img src="/ines-logo.png" alt="" />
          <div>
            <strong>INES Digital Library</strong>
            <span>Knowledge, research, and intelligent access</span>
          </div>
        </div>
        <h2>Sign in to your account</h2>
        <p>Use your registered INES library credentials to continue.</p>
        {location.state?.message && <div className="inline-info" role="status">{location.state.message}</div>}
        {(error || authError) && <div className="inline-error" role="alert">{error || authError}</div>}
        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            Email
            <input type="email" autoComplete="email" placeholder="name@ines.ac.rw" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Password
            <input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Enter Digital Library'}</Button>
        </form>
        <div className="auth-links">
          <Link to="/register">Create account</Link>
          <Link to="/forgot-password">Forgot password</Link>
        </div>
      </section>
    </main>
  );
}
