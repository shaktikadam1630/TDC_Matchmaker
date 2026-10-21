export const STATUS = {
  onboarding: { label: 'Onboarding', tone: 'slate' },
  verified: { label: 'Profile Verified', tone: 'teal' },
  searching: { label: 'Searching', tone: 'blue' },
  match_sent: { label: 'Match Sent', tone: 'rose' },
  in_conversation: { label: 'In Conversation', tone: 'amber' },
  engaged: { label: 'Engaged', tone: 'green' },
  on_hold: { label: 'On Hold', tone: 'grey' },
};

/** snake_case enum -> "Snake case". */
export const humanize = (v) => (v ? String(v).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '—');

export const dash = (v) => (v === undefined || v === null || v === '' ? '—' : v);

export const formatIncome = (lpa) => (lpa === undefined || lpa === null ? '—' : `₹${lpa} LPA`);

export function formatHeight(cm) {
  if (!cm) return '—';
  const totalIn = Math.round(cm / 2.54);
  return `${cm} cm (${Math.floor(totalIn / 12)}′${totalIn % 12}″)`;
}

export const formatDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-IN', opts) : '—';

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const initials = (name = '') => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export const TIER_CLASS = { high: 'tier-high', good: 'tier-good', fair: 'tier-fair', low: 'tier-low' };
