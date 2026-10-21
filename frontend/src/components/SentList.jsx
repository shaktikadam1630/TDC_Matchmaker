import { useState } from 'react';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { EmptyState, ErrorState, Spinner } from './common.jsx';
import { formatDateTime } from '../utils/format.js';

/** History of matches already emailed to this customer, with the exact email that went out. */
export default function SentList({ customerId, refreshKey }) {
  const { data, error, loading, reload } = useFetch((s) => api.sent(customerId, s), [customerId, refreshKey]);
  const [openId, setOpenId] = useState(null);

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.data.length) return <EmptyState title="Nothing sent yet" hint="Use “Send Match” on a suggestion to email it to the customer." />;

  return (
    <ul className="sent">
      {data.data.map((s) => (
        <li key={s.id}>
          <button type="button" className="sent-row" aria-expanded={openId === s.id} onClick={() => setOpenId(openId === s.id ? null : s.id)}>
            <strong>{s.profile?.fullName}, {s.profile?.age}</strong>
            <span className="muted">{s.profile?.designation} · {s.profile?.city}</span>
            <span className="chip">{s.tier} · {s.score}</span>
            <span className="muted">{formatDateTime(s.createdAt)}</span>
          </button>
          {openId === s.id && (
            <pre className="email-preview">{`To: ${s.sentTo}\nSubject: ${s.subject}\n\n${s.body}`}</pre>
          )}
        </li>
      ))}
    </ul>
  );
}
