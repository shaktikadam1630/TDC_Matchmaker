import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { Avatar, EmptyState, ErrorState, Spinner, StatusBadge, VerifiedMark } from '../components/common.jsx';
import { STATUS, humanize } from '../utils/format.js';

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim(), 300);

  // Any filter change returns to page 1.
  useEffect(() => setPage(1), [q, status, verifiedOnly]);

  const stats = useFetch((s) => api.stats(s), []);
  const list = useFetch((s) => api.customers({ q, status, verified: verifiedOnly ? 'true' : undefined, page, limit: PAGE_SIZE }, s), [q, status, verifiedOnly, page]);

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Your customers</h1>
          <p className="muted">{stats.data ? `${stats.data.total} customers assigned to you` : ' '}</p>
        </div>
      </div>

      <div className="chips" role="group" aria-label="Filter by status">
        <button type="button" className={`pill ${status === '' ? 'active' : ''}`} onClick={() => setStatus('')}>
          All {stats.data && <b>{stats.data.total}</b>}
        </button>
        {Object.entries(STATUS).map(([key, s]) => (
          <button key={key} type="button" className={`pill ${status === key ? 'active' : ''}`} onClick={() => setStatus(status === key ? '' : key)}>
            {s.label} {stats.data && <b>{stats.data.byStatus[key] ?? 0}</b>}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <input type="search" className="search" placeholder="Search by name or city…" aria-label="Search customers" value={search} maxLength={60} onChange={(e) => setSearch(e.target.value)} />
      <label className="check"><input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Verified profiles only</label>
      </div>

      {list.loading && !list.data ? (
        <Spinner />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : rows.length === 0 ? (
        <EmptyState title="No customers found" hint={q || status ? 'Try clearing the search or status filter.' : 'Customers assigned to you will appear here.'} />
      ) : (
        <div className={`table-wrap ${list.loading ? 'is-loading' : ''}`}>
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Age</th><th>City</th><th>Marital status</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}>
                  <td>
                    <Link to={`/customers/${c.id}`} className="name-cell" onClick={(e) => e.stopPropagation()}>
                      <Avatar name={c.fullName} gender={c.gender} />
                      <span><strong>{c.fullName}</strong><br /><VerifiedMark verified={c.verified} /></span>
                    </Link>
                  </td>
                  <td>{c.age}</td>
                  <td>{c.city}</td>
                  <td>{humanize(c.maritalStatus)}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.pages > 1 && (
        <nav className="pager" aria-label="Pagination">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
          <span>Page {meta.page} of {meta.pages}</span>
          <button type="button" className="btn btn-ghost" disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>Next →</button>
        </nav>
      )}
    </div>
  );
}
