import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">💞 TDC <span>Matchmaker</span></Link>
        <div className="topbar-user">
          <span>{user.name}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main className="container"><Outlet /></main>
    </>
  );
}
