import { useState } from 'react';
import { Avatar, VerifiedMark } from './common.jsx';
import { TIER_CLASS, formatHeight, formatIncome, humanize } from '../utils/format.js';

function ScoreRing({ score, tier }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className={`ring ${TIER_CLASS[tier.key]}`} aria-label={`Compatibility ${score} out of 100`}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} className="ring-bg" />
        <circle cx="28" cy="28" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 28 28)" />
      </svg>
      <span>{score}</span>
    </div>
  );
}

const barTone = (s) => (s >= 0.75 ? 'good' : s >= 0.45 ? 'mid' : 'bad');

export default function MatchCard({ match, aiLoading, onSend }) {
  const [open, setOpen] = useState(false);
  const { profile: p, tier, insight } = match;

  return (
    <article className={`match ${TIER_CLASS[tier.key]}`}>
      <header className="match-head">
        <Avatar name={p.fullName} gender={p.gender} size={48} />
        <div className="match-id">
          <h3>{p.fullName}, {p.age}</h3>
          <p className="muted">{[p.designation, p.company].filter(Boolean).join(' · ') || '—'}</p>
          <p className="muted">{p.city}, {p.country} · {formatHeight(p.heightCm)} · {formatIncome(p.incomeLpa)}</p>
        </div>
        <ScoreRing score={match.score} tier={tier} />
      </header>

      <div className="match-tags">
        <span className={`tier ${TIER_CLASS[tier.key]}`}>{tier.label}</span>
        <span className="chip">{p.religion}{p.caste ? ` · ${p.caste}` : ''}</span>
        <span className="chip">{humanize(p.maritalStatus)}</span>
        <VerifiedMark verified={p.verified} />
        {match.confidence < 0.7 && <span className="chip chip-warn" title="Several fields are missing, so this score is less certain">Limited data</span>}
      </div>

      <div className={`insight ${aiLoading ? 'insight-loading' : ''}`}>
        <p className="insight-title">
          {insight.source === 'openai' ? '✨ AI insight' : '🧠 Smart insight'}
          {aiLoading && <small> · refining with AI…</small>}
        </p>
        <p><strong>{insight.headline}</strong></p>
        <p>{insight.rationale}</p>
        {insight.talkingPoints?.length > 0 && (
          <ul>{insight.talkingPoints.map((t) => <li key={t}>{t}</li>)}</ul>
        )}
        {insight.watchOut && <p className="watch">⚠ {insight.watchOut}</p>}
      </div>

      <button type="button" className="link" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide' : 'Show'} score breakdown
      </button>
      {open && (
        <ul className="breakdown">
          {match.breakdown.map((f) => (
            <li key={f.key}>
              <span className="bd-label">{f.label} <small>({f.weight ? `${Math.round(f.weight * 100)}%` : `bonus`})</small></span>
              <span className="bar" aria-hidden="true">
                {f.score != null && <span className={`bar-fill bar-${barTone(f.score)}`} style={{ width: `${Math.round(f.score * 100)}%` }} />}
              </span>
              <span className="bd-note">{f.note}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className="match-foot">
        {match.alreadySent ? (
          <button type="button" className="btn" disabled>✓ Sent</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => onSend(match)}>Send Match</button>
        )}
      </footer>
    </article>
  );
}
