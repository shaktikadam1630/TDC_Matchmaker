import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Spinner } from './common.jsx';
import { formatHeight, humanize } from '../utils/format.js';

/**
 * Two-step send: (1) fetch a personalised draft (AI or template) (2) let the matchmaker
 * review/edit, then confirm. Nothing is sent until the explicit click.
 */
export default function SendMatchModal({ customer, match, onClose, onSent }) {
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const dialogRef = useRef(null);
  const p = match.profile;

  useEffect(() => {
    const ctrl = new AbortController();
    api.draftIntro(customer.id, p.id, ctrl.signal)
      .then((d) => setDraft({ ...d.draft, recipient: d.recipient }))
      .catch((e) => { if (e.name !== 'AbortError') setError(e); });
    return () => ctrl.abort();
  }, [customer.id, p.id]);

  // Escape closes (unless mid-send); focus moves into the dialog.
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !sending) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  async function confirm() {
    setSending(true);
    try {
      await api.sendMatch(customer.id, p.id, draft.subject, draft.body);
      toast.success(`Match sent to ${draft.recipient}`);
      onSent(p.id);
    } catch (e) {
      if (e.code === 'ALREADY_SENT') {
        toast.info('This match was already sent.');
        onSent(p.id);
      } else {
        toast.error(e.message);
        setSending(false);
      }
    }
  }

  const valid = draft && draft.subject.trim().length >= 3 && draft.body.trim().length >= 20;

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="send-title" tabIndex={-1} ref={dialogRef}>
        <h2 id="send-title">Send match to {customer.firstName}</h2>
        <p className="muted">To: {customer.email}</p>

        {!draft && !error && <Spinner label="Drafting a personalised intro…" />}
        {error && <div className="state state-error" role="alert">{error.message}</div>}

        {draft && (
          <>
            <label className="field">Subject
              <input value={draft.subject} maxLength={150} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </label>
            <label className="field">Message {draft.source === 'openai' && <span className="chip">✨ AI drafted</span>}
              <textarea rows={8} value={draft.body} maxLength={3000} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            </label>
            <div className="card-preview">
              <strong>Included profile</strong>
              <dl>
                <dt>Name</dt><dd>{p.fullName}</dd>
                <dt>Age</dt><dd>{p.age}</dd>
                <dt>City</dt><dd>{p.city}, {p.country}</dd>
                <dt>Height</dt><dd>{formatHeight(p.heightCm)}</dd>
                <dt>Work</dt><dd>{[p.designation, p.company].filter(Boolean).join(' at ') || '—'}</dd>
                <dt>Community</dt><dd>{p.religion}{p.caste ? `, ${p.caste}` : ''} · {humanize(p.maritalStatus)}</dd>
              </dl>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={!valid || sending}>
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}
