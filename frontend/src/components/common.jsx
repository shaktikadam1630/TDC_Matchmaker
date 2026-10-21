import { Component } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { STATUS, initials } from '../utils/format.js';

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="center-pad" role="status"><span className="spinner" aria-hidden="true" /> {label}</div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div className="state state-error" role="alert">
    <p>{error?.message ?? 'Something went wrong.'}</p>
    {onRetry && <button type="button" className="btn btn-ghost" onClick={onRetry}>Try again</button>}
  </div>
);

export const EmptyState = ({ title, hint }) => (
  <div className="state">
    <strong>{title}</strong>
    {hint && <p>{hint}</p>}
  </div>
);

export const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? { label: status, tone: 'grey' };
  return <span className={`badge badge-${s.tone}`}>{s.label}</span>;
};

export const Avatar = ({ name, gender, size = 40 }) => (
  <span className={`avatar avatar-${gender}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
    {initials(name)}
  </span>
);

export const VerifiedMark = ({ verified }) =>
  verified ? <span className="verified" title="Verified profile">✔ Verified</span> : <span className="unverified">Unverified</span>;

/** Redirects to /login while signed out; remembers where the user was going. */
export function ProtectedRoute({ children }) {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** Last line of defence: a render error shows a recoverable message instead of a white screen. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) { console.error('UI crash', error, info); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="center-pad">
        <ErrorState error={{ message: 'The page hit an unexpected error.' }} onRetry={() => window.location.reload()} />
      </div>
    );
  }
}
