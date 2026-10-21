import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar, EmptyState, ErrorState, Spinner, VerifiedMark } from '../components/common.jsx';
import Biodata from '../components/Biodata.jsx';
import MatchCard from '../components/MatchCard.jsx';
import NotesPanel from '../components/NotesPanel.jsx';
import SendMatchModal from '../components/SendMatchModal.jsx';
import SentList from '../components/SentList.jsx';
import { STATUS } from '../utils/format.js';

const TABS = [
  ['biodata', 'Biodata'],
  ['matches', 'Suggested matches'],
  ['notes', 'Notes'],
  ['sent', 'Sent'],
];

/**
 * Loads matches in two phases: the rule-based ranking renders immediately, then the
 * AI-enriched version (slower, optional) replaces it. A failed AI call never hides results.
 */
function useMatches(customerId, { limit, enabled, verifiedOnly }) {
  const [state, setState] = useState({ data: null, error: null, loading: true, aiLoading: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    api.matches(customerId, { limit, ai: 0, verifiedOnly: verifiedOnly ? 1 : 0 }, ctrl.signal)
      .then((base) => {
        setState({ data: base, error: null, loading: false, aiLoading: base.meta.aiEnabled && base.matches.length > 0 });
        if (!base.meta.aiEnabled || !base.matches.length) return null;
        return api.matches(customerId, { limit, ai: 1, verifiedOnly: verifiedOnly ? 1 : 0 }, ctrl.signal)
          .then((enriched) => setState({ data: enriched, error: null, loading: false, aiLoading: false }))
          .catch((e) => { if (e.name !== 'AbortError') setState((s) => ({ ...s, aiLoading: false })); });
      })
      .catch((error) => { if (error.name !== 'AbortError') setState({ data: null, error, loading: false, aiLoading: false }); });

    return () => ctrl.abort();
  }, [customerId, limit, enabled, verifiedOnly, tick]);

  return { ...state, reload: useCallback(() => setTick((t) => t + 1), []) };
}

function MatchesTab({ customer, onSent, sentVersion }) {
  const [limit, setLimit] = useState(10);
  const [minTier, setMinTier] = useState('all');
  const [sending, setSending] = useState(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(null); // { loading, error, data } for the natural-language search
  const { data, error, loading, aiLoading, reload } = useMatches(customer.id, { limit, enabled: true, verifiedOnly });
  const toast = useToast();

  async function ask(e) {
    e.preventDefault();
    const text = question.trim();
    if (text.length < 3) return;
    setAsked({ loading: true });
    try {
      setAsked({ loading: false, data: await api.ask(customer.id, text, verifiedOnly) });
    } catch (err) {
      setAsked(null);
      toast.error(err.message);
    }
  }
  // Reload after a send so "Sent" state and ordering stay correct.
  useEffect(() => { if (sentVersion) { reload(); setAsked(null); } }, [sentVersion, reload]);

  if (loading && !data) return <Spinner label="Finding compatible profiles…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const order = { high: 0, good: 1, fair: 2, low: 3 };
  const active = asked?.data; // natural-language results replace the default list while shown
  const source = active ?? data;
  const topPick = !active && minTier === 'all' ? data.meta.topPick : null;
  const pickMatch = topPick && data.matches.find((m) => m.profile.id === topPick.profileId);
  const shown = source.matches.filter((m) => minTier === 'all' || order[m.tier.key] <= order[minTier]);

  return (
    <div>
      <form className="ask" onSubmit={ask}>
        <label className="sr-only" htmlFor="ask-q">Ask AI to find a match</label>
        <input id="ask-q" value={question} maxLength={200} onChange={(e) => setQuestion(e.target.value)} placeholder='✨ Ask AI, e.g. "doctor in Mumbai, vegetarian, above 20 LPA"' />
        <button className="btn btn-primary" disabled={question.trim().length < 3 || asked?.loading}>{asked?.loading ? 'Searching…' : 'Ask AI'}</button>
      </form>
      {active && (
        <div className="ask-result">
          <span>Understood:</span>
          {active.query.understood.map((u) => <span key={u} className="chip">{u}</span>)}
          <span className="muted">· {active.matches.length} result(s) · {active.query.source === 'openai' ? 'by AI' : 'by smart parser'}</span>
          <button type="button" className="link" onClick={() => { setAsked(null); setQuestion(''); }}>Clear</button>
        </div>
      )}

      {pickMatch && (
        <section className="suggestion" aria-label="AI suggestion">
          <div>
            <p className="insight-title">{topPick.source === 'openai' ? '✨ AI suggestion' : '🧠 Smart suggestion'} · suggested next step</p>
            <p>{topPick.text}</p>
            {topPick.watchOut && <p className="watch">⚠ {topPick.watchOut}</p>}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setSending(pickMatch)}>Send {pickMatch.profile.firstName}</button>
        </section>
      )}

      <div className="match-toolbar">
        <p className="muted">
          Scored {data.meta.pool} profiles · {data.meta.excludedByDealBreakers} excluded by deal-breakers ·{' '}
          {data.meta.aiEnabled ? 'AI insights on' : 'AI off (smart rule-based insights)'}
        </p>
        <div className="toolbar-controls">
          <label className="check"><input type="checkbox" checked={verifiedOnly} onChange={(e) => { setVerifiedOnly(e.target.checked); setAsked(null); }} /> Verified only</label>
          <label>Show <select value={minTier} onChange={(e) => setMinTier(e.target.value)}>
            <option value="all">All matches</option>
            <option value="fair">Worth exploring +</option>
            <option value="good">Good +</option>
            <option value="high">High potential only</option>
          </select></label>
          <label>Top <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select></label>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title={active ? 'Nothing matches that request' : 'No matches at this level'} hint={active ? 'Try loosening one of the conditions above.' : "Loosen the filter, or review the customer's preferences and missing details."} />
      ) : (
        <div className="match-grid">
          {shown.map((m) => (
            <MatchCard key={m.profile.id} match={m} aiLoading={aiLoading} onSend={setSending} />
          ))}
        </div>
      )}

      {sending && (
        <SendMatchModal
          customer={customer}
          match={sending}
          onClose={() => setSending(null)}
          onSent={() => { setSending(null); onSent(); }}
        />
      )}
    </div>
  );
}

export default function CustomerPage() {
  const { id } = useParams();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'biodata';
  const [sentVersion, setSentVersion] = useState(0);

  const { data, error, loading, reload } = useFetch((s) => api.customer(id, s), [id]);
  const [overrides, setOverrides] = useState({}); // local edits (status, notes) layered over the fetched record

  useEffect(() => setOverrides({}), [id]);

  if (loading && !data) return <Spinner />;
  if (error) {
    return (
      <div>
        <Link to="/" className="back">← All customers</Link>
        <ErrorState error={error.status === 404 ? { message: 'Customer not found, or not assigned to you.' } : error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    );
  }

  const customer = { ...data.customer, ...overrides };

  async function changeStatus(e) {
    const status = e.target.value;
    const prev = customer.status;
    setOverrides((o) => ({ ...o, status: status })); // optimistic
    try {
      await api.setStatus(id, status);
    } catch (err) {
      setOverrides((o) => ({ ...o, status: prev }));
      toast.error(err.message);
    }
  }

  const onSent = () => {
    setSentVersion((v) => v + 1);
    // The server may have advanced the status to "match_sent".
    api.customer(id).then((d) => setOverrides((o) => ({ ...o, status: d.customer.status }))).catch(() => {});
  };

  return (
    <div>
      <Link to="/" className="back">← All customers</Link>

      <section className="profile-head">
        <Avatar name={customer.fullName} gender={customer.gender} size={64} />
        <div className="profile-title">
          <h1>{customer.fullName}</h1>
          <p className="muted">{customer.age} yrs · {customer.city}, {customer.country} · <VerifiedMark verified={customer.verified} /></p>
        </div>
        <label className="status-select">Journey stage
          <select value={customer.status} onChange={changeStatus}>
            {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </label>
      </section>

      {customer.maritalStatus === 'awaiting_divorce' && (
        <div className="banner" role="note">Matching is paused: this customer's divorce is not yet finalised.</div>
      )}

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setParams({ tab: key }, { replace: true })}>
            {label}{key === 'notes' && customer.notes.length ? ` (${customer.notes.length})` : ''}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'biodata' && <Biodata c={customer} />}
        {tab === 'matches' && <MatchesTab customer={customer} onSent={onSent} sentVersion={sentVersion} />}
        {tab === 'notes' && <NotesPanel customerId={id} notes={customer.notes} onChange={(notes) => setOverrides((o) => ({ ...o, notes }))} />}
        {tab === 'sent' && <SentList customerId={id} refreshKey={sentVersion} />}
      </div>
    </div>
  );
}
