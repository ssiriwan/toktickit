import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type DetailTicket = {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  currentStatus: string;
  requestedPriority: string;
  itPriority: string;
  appearsResolved: boolean;
  appearsResolvedAt: string | null;
  ticketDate: string;
  requester: { id: number; name: string; email: string };
  owner: { id: number; name: string } | null;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  publicComments: { id: number; body: string; createdAt: string; author: { id: number; name: string; role: string } }[];
  internalNotes: { id: number; body: string; createdAt: string; author: { id: number; name: string; role: string } }[];
  attachments: { id: number; filename: string; mimeType: string; fileSize: number; isRemoved: boolean; createdAt: string }[];
};

const STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function formatStatus(s: string) {
  return s.replace(/_/g, ' ');
}

export function StaffTicketDetail({ readOnly }: { readOnly: boolean }) {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<DetailTicket | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'forbidden'>('loading');
  const [activeTab, setActiveTab] = useState<'public' | 'internal' | 'attachments'>('public');

  const [ownerDraft, setOwnerDraft] = useState('');
  const [priorityDraft, setPriorityDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [postError, setPostError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);

  async function load() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}`, { credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        setStatus('forbidden');
        return;
      }
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as DetailTicket;
      setTicket(data);
      setOwnerDraft(data.owner ? String(data.owner.id) : '');
      setPriorityDraft(data.itPriority);
      setStatusDraft(data.currentStatus);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    fetch('/api/admin/users', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { users?: { id: number; name: string }[] } | null) => {
        if (data?.users) setUsers(data.users);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function patch(field: string, body: unknown, key: string) {
    setSaving(key);
    setSaveError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/${field}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const payload = await res.json().catch(() => ({} as { error?: { message?: string; details?: { message?: string }[] } }));
      if (!res.ok) {
        setSaveError(payload.error?.message ?? payload.error?.details?.[0]?.message ?? 'Failed to update');
        return;
      }
      await load();
    } catch {
      setSaveError('Failed to update');
    } finally {
      setSaving(null);
    }
  }

  async function postComment() {
    const text = commentBody.trim();
    if (!text) {
      setPostError('Comment must not be empty');
      return;
    }
    setPostError(null);
    const res = await fetch(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { error?: { message?: string } }));
      setPostError(body.error?.message ?? 'Failed to post');
      return;
    }
    setCommentBody('');
    await load();
  }

  async function postNote() {
    const text = noteBody.trim();
    if (!text) {
      setPostError('Note must not be empty');
      return;
    }
    setPostError(null);
    const res = await fetch(`/api/tickets/${ticketId}/notes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { error?: { message?: string } }));
      setPostError(body.error?.message ?? 'Failed to post note');
      return;
    }
    setNoteBody('');
    await load();
  }

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return (
      <main className="container py-4">
        <p role="alert" className="text-danger">Invalid ticket</p>
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/staff/queue')}>
          &larr; Back to Queue
        </button>
      </main>
    );
  }

  if (status === 'loading') return <p role="status" className="container py-4">Loading ticket...</p>;
  if (status === 'forbidden') return <p role="alert" className="container py-4 text-danger">You do not have access to this ticket.</p>;
  if (status === 'error' || !ticket) return <p role="alert" className="container py-4 text-danger">Unable to load ticket.</p>;

  return (
    <main className="container py-4" style={{ maxWidth: '56rem' }}>
      <button type="button" className="btn btn-outline-secondary mb-3" onClick={() => navigate('/staff/queue')}>
        &larr; Back to Queue
      </button>
      {ticket.appearsResolved && (
        <div className="alert alert-warning" role="status">
          Requester indicates this appears resolved at {ticket.appearsResolvedAt ? new Date(ticket.appearsResolvedAt).toLocaleString() : 'unknown time'}. Please verify before Resolving/Closing.
        </div>
      )}
      <h1 className="h4">Ticket {ticket.ticketNumber}</h1>
      <section className="card mb-3">
        <div className="card-body row g-2">
          <div className="col-md-4">
            <label className="form-label">Ticket No.</label>
            <div className="zen-readonly">{ticket.ticketNumber}</div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Category</label>
            <div className="zen-readonly">{ticket.category.name}</div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Related System</label>
            <div className="zen-readonly">{ticket.relatedSystem.name}</div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Requester</label>
            <div className="zen-readonly">{ticket.requester.name} ({ticket.requester.email})</div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Requested Priority</label>
            <span className={`badge badge-priority-${ticket.requestedPriority}`}>{ticket.requestedPriority}</span>
          </div>
          <div className="col-md-4">
            <label className="form-label">Current Status</label>
            {readOnly ? (
              <span className={`badge badge-status-${ticket.currentStatus}`}>{formatStatus(ticket.currentStatus)}</span>
            ) : (
              <select
                className="form-select"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                aria-label="Current Status"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
            )}
          </div>
          <div className="col-md-4">
            <label className="form-label">Ticket Owner</label>
            {readOnly ? (
              <div className="zen-readonly">{ticket.owner ? ticket.owner.name : 'Unassigned'}</div>
            ) : (
              <select
                className="form-select"
                value={ownerDraft}
                onChange={(e) => setOwnerDraft(e.target.value)}
                aria-label="Ticket Owner"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} (ID {u.id})</option>
                ))}
              </select>
            )}
          </div>
          <div className="col-md-4">
            <label className="form-label">IT Priority</label>
            {readOnly ? (
              <span className={`badge badge-priority-${ticket.itPriority}`}>{ticket.itPriority}</span>
            ) : (
              <select
                className="form-select"
                value={priorityDraft}
                onChange={(e) => setPriorityDraft(e.target.value)}
                aria-label="IT Priority"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
          </div>
          <div className="col-12">
            <label className="form-label">Summary</label>
            <div className="zen-readonly">{ticket.summary}</div>
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <div className="zen-readonly">{ticket.description}</div>
          </div>
          {saveError && <p className="text-danger col-12" role="alert">{saveError}</p>}
          {!readOnly && (
            <div className="col-12 d-flex gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={!!saving} onClick={() => patch('owner', { ownerId: ownerDraft ? Number(ownerDraft) : null }, 'owner')}>
                {saving === 'owner' ? 'Saving...' : 'Save Owner'}
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!!saving} onClick={() => patch('priority', { itPriority: priorityDraft }, 'priority')}>
                {saving === 'priority' ? 'Saving...' : 'Save Priority'}
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!!saving} onClick={() => patch('status', { status: statusDraft }, 'status')}>
                {saving === 'status' ? 'Saving...' : 'Save Status'}
              </button>
            </div>
          )}
          {readOnly && <small className="text-muted col-12">Read-only</small>}
        </div>
      </section>

      <div className="d-flex gap-2 mb-2" role="tablist">
        <button type="button" role="tab" aria-selected={activeTab === 'public'} className={`btn btn-sm ${activeTab === 'public' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab('public')}>
          Public Comments ({ticket.publicComments.length})
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'internal'} className={`btn btn-sm ${activeTab === 'internal' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab('internal')}>
          Internal Notes ({ticket.internalNotes.length}) 🔒 Private — IT & Admin only
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'attachments'} className={`btn btn-sm ${activeTab === 'attachments' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab('attachments')}>
          Attachments ({ticket.attachments.length})
        </button>
      </div>

      {activeTab === 'public' && (
        <section className="card" style={{ background: '#F9FFF9' }}>
          <div className="card-body">
            {ticket.publicComments.length === 0 && <p className="text-muted">No comments yet.</p>}
            {ticket.publicComments.map((c) => (
              <div key={c.id} className="border-bottom py-2">
                <div>
                  <strong>{c.author.name}</strong> <span className="badge bg-secondary">{c.author.role}</span>{' '}
                  <small className="text-muted">{new Date(c.createdAt).toLocaleString()}</small>
                </div>
                <div>{c.body}</div>
              </div>
            ))}
            {!readOnly && (
              <div className="mt-3">
                <label htmlFor="detail-comment" className="form-label">Add Public Comment</label>
                <textarea id="detail-comment" className="form-control" rows={3} value={commentBody} maxLength={2000} onChange={(e) => setCommentBody(e.target.value)} placeholder="Type your comment here..." />
                {postError && activeTab === 'public' && <small className="text-danger mt-1 d-block" role="alert">{postError}</small>}
                <button type="button" className="btn btn-primary btn-sm mt-2" onClick={postComment}>Post Comment</button>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'internal' && (
        <section className="card" style={{ background: '#FFFAEB', borderColor: '#F59E0B' }}>
          <div className="card-body">
            {ticket.internalNotes.length === 0 && <p className="text-muted">No internal notes yet.</p>}
            {ticket.internalNotes.map((n) => (
              <div key={n.id} className="border-bottom py-2">
                <div>
                  <strong>{n.author.name}</strong> <span className="badge bg-warning text-dark">{n.author.role}</span>{' '}
                  <small className="text-muted">{new Date(n.createdAt).toLocaleString()}</small>
                </div>
                <div>{n.body}</div>
              </div>
            ))}
            {!readOnly && (
              <div className="mt-3">
                <label htmlFor="detail-note" className="form-label">Add Internal Note 🔒 (private)</label>
                <textarea id="detail-note" className="form-control" rows={3} value={noteBody} maxLength={2000} onChange={(e) => setNoteBody(e.target.value)} placeholder="Type internal note... (private)" />
                {postError && activeTab === 'internal' && <small className="text-danger mt-1 d-block" role="alert">{postError}</small>}
                <button type="button" className="btn btn-warning btn-sm mt-2" onClick={postNote}>Post Note</button>
              </div>
            )}
            {readOnly && <small className="text-muted">Read-only</small>}
          </div>
        </section>
      )}

      {activeTab === 'attachments' && (
        <section className="card">
          <div className="card-body">
            {ticket.attachments.length === 0 && <p className="text-muted">No attachments yet.</p>}
            {ticket.attachments.map((a) => (
              <div key={a.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                  {a.isRemoved ? <s>{a.filename}</s> : a.filename}
                  <small className="text-muted ms-2">({(a.fileSize / 1024).toFixed(1)} KB)</small>
                  {a.isRemoved && <span className="badge bg-secondary ms-2">Removed</span>}
                </div>
                <small className={a.isRemoved ? 'text-muted' : ''}>{a.isRemoved ? 'Download blocked' : 'View in Lab 2'}</small>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
