import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from ?? '/'} replace />;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.username.trim() || !form.password) return setError('Enter your username and password.');
    setBusy(true);
    setError('');
    try {
      await login(form.username.trim(), form.password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <main className="login">
      <div className="login-art" aria-hidden="true">
        <h1>Love, thoughtfully matched.</h1>
        <p>Every great match starts with a matchmaker who listens. This dashboard handles the rest.</p>
      </div>
      <form className="login-card" onSubmit={submit} noValidate>
        <h2>Matchmaker sign in</h2>
        <label className="field">Username
          <input autoFocus autoComplete="username" value={form.username} onChange={set('username')} />
        </label>
        <label className="field">Password
          <input type="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
