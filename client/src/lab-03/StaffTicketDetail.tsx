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
  updatedAt: string;
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

function DropdownChevron() {
  return (
    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
    </span>
  );
}

export function StaffTicketDetail() {
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
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [pendingOwner, setPendingOwner] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function load() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}`, { credentials: 'include' });
      if (res.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (res.status === 403) {
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
    fetch('/api/staff/users', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { users?: { id: number; name: string }[] } | { id: number; name: string }[] | null) => {
        if (!data) return;
        const list = Array.isArray(data) ? data : data.users;
        if (list) setUsers(list);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function handleClaim() {
    setSaving('owner');
    setSaveError(null);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const payload = await res.json().catch(() => ({} as { error?: { message?: string } }));
      if (!res.ok) {
        setSaveError(payload.error?.message ?? 'Failed to claim');
        return;
      }
      await load();
    } catch {
      setSaveError('Failed to claim');
    } finally {
      setSaving(null);
    }
  }

  async function handleOwnerChange(value: string) {
    setOwnerDraft(value);
    if (value === '' && ticket && ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'].includes(ticket.currentStatus)) {
      setPendingOwner(value);
      setShowUnassignConfirm(true);
      return;
    }
    await doAssign(value);
  }

  async function doAssign(ownerValue?: string) {
    const value = ownerValue ?? pendingOwner ?? ownerDraft;
    setSaving('owner');
    setSaveError(null);
    setShowUnassignConfirm(false);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: value ? Number(value) : null })
      });
      const payload = await res.json().catch(() => ({} as { error?: { message?: string; details?: { message?: string }[] } }));
      if (!res.ok) {
        setSaveError(payload.error?.message ?? payload.error?.details?.[0]?.message ?? 'Failed to assign');
        return;
      }
      await load();
    } catch {
      setSaveError('Failed to assign');
    } finally {
      setSaving(null);
      setPendingOwner(null);
    }
  }

  async function handlePriorityChange(value: string) {
    setPriorityDraft(value);
    setSaving('priority');
    setSaveError(null);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/priority`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itPriority: value })
      });
      const payload = await res.json().catch(() => ({} as { error?: { message?: string } }));
      if (!res.ok) {
        setSaveError(payload.error?.message ?? 'Failed to update priority');
        return;
      }
      await load();
    } catch {
      setSaveError('Failed to update priority');
    } finally {
      setSaving(null);
    }
  }

  async function handleStatusChange(value: string) {
    setStatusDraft(value);
    if (value === 'CANCELLED') {
      setPendingStatus(value);
      setShowCancelConfirm(true);
      return;
    }
    await doStatusSave(value);
  }

  async function doStatusSave(statusValue?: string) {
    const value = statusValue ?? pendingStatus ?? statusDraft;
    setSaving('status');
    setSaveError(null);
    setShowCancelConfirm(false);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: value })
      });
      const payload = await res.json().catch(() => ({} as { error?: { message?: string; details?: { message?: string }[] } }));
      if (!res.ok) {
        setSaveError(payload.error?.message ?? payload.error?.details?.[0]?.message ?? 'Failed to update status');
        return;
      }
      await load();
    } catch {
      setSaveError('Failed to update status');
    } finally {
      setSaving(null);
      setPendingStatus(null);
    }
  }

  async function postComment() {
    const text = commentBody.trim();
    if (!text) {
      setPostError('Comment must not be empty');
      return;
    }
    setPostError(null);
    const res = await fetch(`/api/staff/tickets/${ticketId}/comments`, {
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
    const res = await fetch(`/api/staff/tickets/${ticketId}/notes`, {
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

  async function handleDownload(att: { id: number; filename: string }) {
    setDownloadError(null);
    try {
      const res = await fetch(`/api/staff/attachments/${att.id}/download`, { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: { code?: string; message?: string } }));
        if (body.error?.code === 'REMOVED') setDownloadError('Attachment has been removed');
        else if (res.status === 401) navigate('/login', { replace: true });
        else setDownloadError(body.error?.message ?? 'Failed to download');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Failed to download');
    }
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
            <div style={{ position: 'relative' }}>
              <select
                className="form-select"
                style={{ paddingRight: '2rem' }}
                value={statusDraft}
                disabled={!!saving}
                onChange={(e) => handleStatusChange(e.target.value)}
                aria-label="Current Status"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
              <DropdownChevron />
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Ticket Owner</label>
            <div className="d-flex gap-2">
              <div style={{ position: 'relative', flex: 1 }}>
                <select
                  className="form-select"
                  style={{ paddingRight: '2rem' }}
                  value={ownerDraft}
                  disabled={!!saving}
                  onChange={(e) => handleOwnerChange(e.target.value)}
                  aria-label="Ticket Owner"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} (ID {u.id})</option>
                  ))}
                </select>
                <DropdownChevron />
              </div>
              {ticket.owner === null && (
                <button type="button" className="btn btn-outline-primary btn-sm" disabled={!!saving} onClick={handleClaim}>
                  {saving === 'owner' ? 'Saving...' : 'Claim'}
                </button>
              )}
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label">IT Priority</label>
            <div style={{ position: 'relative' }}>
              <select
                className="form-select"
                style={{ paddingRight: '2rem' }}
                value={priorityDraft}
                disabled={!!saving}
                onChange={(e) => handlePriorityChange(e.target.value)}
                aria-label="IT Priority"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <DropdownChevron />
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Created Date</label>
            <div className="zen-readonly">{new Date(ticket.ticketDate).toLocaleDateString()}</div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Last Updated</label>
            <div className="zen-readonly">{new Date(ticket.updatedAt).toLocaleDateString()}</div>
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
          {downloadError && <p className="text-danger col-12" role="alert">{downloadError}</p>}
          {saving && <p className="text-muted col-12" role="status">Saving...</p>}
        </div>
      </section>

      {showUnassignConfirm && (
        <div className="card mb-3 border-warning" role="dialog" aria-label="Confirm unassign">
          <div className="card-body">
            <p>Unassign will clear the owner and return active work to NEW. Keep RESOLVED/CLOSED/CANCELLED as is. Continue?</p>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-warning btn-sm" onClick={doAssign}>Confirm Unassign</button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowUnassignConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="card mb-3 border-danger" role="dialog" aria-label="Confirm cancel">
          <div className="card-body">
            <p>Cancel this ticket? This cannot be undone without Reopen.</p>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-danger btn-sm" onClick={doStatusSave}>Confirm Cancel</button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowCancelConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex gap-2 mb-2" role="tablist">
        <button type="button" role="tab" aria-selected={activeTab === 'public'} className={`btn btn-sm ${activeTab === 'public' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab('public')}>
          Public Comments ({ticket.publicComments.length})
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'internal'} className={`btn btn-sm ${activeTab === 'internal' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab('internal')}>
          Internal Notes ({ticket.internalNotes.length}) Private - IT &amp; Admin only
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
            <div className="mt-3">
              <label htmlFor="detail-comment" className="form-label">Add Public Comment</label>
              <textarea id="detail-comment" className="form-control" rows={3} value={commentBody} maxLength={2000} onChange={(e) => setCommentBody(e.target.value)} placeholder="Type your comment here..." />
              {postError && activeTab === 'public' && <small className="text-danger mt-1 d-block" role="alert">{postError}</small>}
              <button type="button" className="btn btn-primary btn-sm mt-2" onClick={postComment}>Post Comment</button>
            </div>
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
            <div className="mt-3">
              <label htmlFor="detail-note" className="form-label">Add Internal Note (private)</label>
              <textarea id="detail-note" className="form-control" rows={3} value={noteBody} maxLength={2000} onChange={(e) => setNoteBody(e.target.value)} placeholder="Type internal note... (private)" />
              {postError && activeTab === 'internal' && <small className="text-danger mt-1 d-block" role="alert">{postError}</small>}
              <button type="button" className="btn btn-warning btn-sm mt-2" onClick={postNote}>Post Note</button>
            </div>
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
                {!a.isRemoved ? (
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => handleDownload(a)}>Download</button>
                ) : (
                  <small className="text-muted">Download blocked</small>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
