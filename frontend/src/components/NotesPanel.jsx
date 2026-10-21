import { useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { EmptyState } from './common.jsx';
import { formatDateTime } from '../utils/format.js';

/** Quick notes from meetings/calls. Server returns the full, sorted list after each change. */
export default function NotesPanel({ customerId, notes, onChange }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const res = await api.addNote(customerId, value);
      onChange(res.notes);
      setText('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(noteId) {
    if (!window.confirm('Delete this note?')) return;
    try {
      onChange((await api.deleteNote(customerId, noteId)).notes);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <form onSubmit={add} className="note-form">
        <label className="sr-only" htmlFor="note-text">New note</label>
        <textarea id="note-text" rows={3} maxLength={1000} placeholder="Add a quick note from your call or meeting…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="note-actions">
          <small className="muted">{text.length}/1000</small>
          <button className="btn btn-primary" disabled={!text.trim() || busy}>{busy ? 'Saving…' : 'Add note'}</button>
        </div>
      </form>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" hint="Notes you add here stay private to you." />
      ) : (
        <ul className="notes">
          {notes.map((n) => (
            <li key={n.id}>
              <p>{n.text}</p>
              <div className="note-meta">
                <span>{n.author ?? 'Matchmaker'} · {formatDateTime(n.createdAt)}</span>
                <button type="button" className="link danger" onClick={() => remove(n.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
