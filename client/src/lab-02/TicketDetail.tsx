import { useEffect, useState } from 'react';

import type { Requester } from '../lab-03/AuthContext';

type Attachment = {
  id: number;
  filename: string;
  mimeType: string;
  fileSize: number;
  isRemoved: boolean;
  removalReason?: string | null;
  removedAt?: string | null;
  createdAt: string;
};

type TicketDetailData = {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  currentStatus: string;
  requestedPriority: string;
  appearsResolved?: boolean;
  ticketDate: string;
  updatedAt: string;
  requester: { id: number; name: string; email: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  attachments: Attachment[];
};

interface TicketDetailProps {
  ticketId: number;
  requester: Requester;
  onBack: () => void;
}

export function TicketDetail({ ticketId, requester, onBack }: TicketDetailProps) {
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<Record<number, string>>({});
  const [removeReason, setRemoveReason] = useState<Record<number, string>>({});
  const [showReasonFor, setShowReasonFor] = useState<number | null>(null);
  const [comments, setComments] = useState<
    { id: number; body: string; createdAt: string; author: { id: number; name: string; role: string } }[]
  >([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  async function loadComments() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setComments(data);
    } catch {
      // comments are secondary; ticket already loaded
    }
  }

  async function load() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as TicketDetailData;
      setTicket(data);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setUploadError(null);
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setUploadError('File type not allowed. Permitted: JPG, JPEG, PNG, WEBP, PDF');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit');
      input.value = '';
      return;
    }
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
      method: 'POST',
      credentials: 'include',
      body: form
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUploadError(body.error?.message || 'Failed to upload');
    } else {
      await load();
    }
    input.value = '';
  }

  async function handleDownload(att: Attachment) {
    if (att.isRemoved) {
      setDownloadError('Attachment has been removed');
      return;
    }
    setDownloadError(null);
    try {
      const res = await fetch(`/api/attachments/${att.id}/download`, { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: { code?: string; message?: string } }));
        if (body.error?.code === 'REMOVED') setDownloadError('Attachment has been removed');
        else if (body.error?.code === 'ACCESS_DENIED') setDownloadError('Access denied');
        else if (res.status === 404) setDownloadError('Attachment not found');
        else setDownloadError(body.error?.message || 'Failed to download');
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

  async function handleRemove(id: number) {
    const reason = removeReason[id]?.trim();
    if (!reason) {
      setRemoveError({ ...removeError, [id]: 'Reason is required' });
      return;
    }
    setRemoveError({ ...removeError, [id]: '' });
    const res = await fetch(`/api/attachments/${id}/remove`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { error?: { message?: string } }));
      setRemoveError({ ...removeError, [id]: body.error?.message || 'Failed to remove' });
    } else {
      setShowReasonFor(null);
      setRemoveError({ ...removeError, [id]: '' });
      await load();
    }
  }

  async function handlePostComment() {
    const text = commentDraft.trim();
    if (!text || commentBusy) {
      if (!text) setCommentError('Comment must not be empty');
      return;
    }
    setCommentBusy(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: { message?: string } }));
        setCommentError(body.error?.message || 'Failed to post comment');
      } else {
        setCommentDraft('');
        await loadComments();
      }
    } catch {
      setCommentError('Failed to post comment');
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleAppearsResolved() {
    if (!window.confirm('Mark this ticket as appears resolved? IT Staff will verify.')) return;
    setResolveBusy(true);
    setResolveError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/appears-resolved`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!res.ok) {
        setResolveError('Failed to update. Please try again.');
      } else {
        await load();
      }
    } catch {
      setResolveError('Failed to update. Please try again.');
    } finally {
      setResolveBusy(false);
    }
  }

  if (status === 'loading') return <p role="status">Loading ticket...</p>;
  if (status === 'error' || !ticket) return <p role="alert">Unable to load ticket.</p>;

  const activeCount = ticket.attachments.filter((a) => !a.isRemoved).length;

  return (
    <main className="container py-4" style={{ maxWidth: '56rem' }}>
      <button type="button" className="btn btn-outline-secondary mb-3" onClick={onBack}>
        &larr; Back to My Tickets
      </button>
      <h1 className="h4">Ticket {ticket.ticketNumber}</h1>

      <section className="card mb-3">
        <div className="card-body">
          <p>
            <strong>Summary:</strong> <span className="zen-readonly ms-1">{ticket.summary}</span>
          </p>
          <p>
            <strong>Category:</strong> <span className="zen-readonly ms-1">{ticket.category.name}</span>
          </p>
          <p>
            <strong>System:</strong> <span className="zen-readonly ms-1">{ticket.relatedSystem.name}</span>
          </p>
          <p>
            <strong>Priority:</strong> <span className={`badge badge-priority-${ticket.requestedPriority} ms-1`}>{ticket.requestedPriority}</span>
          </p>
          <p>
            <strong>Status:</strong> <span className={`badge badge-status-${ticket.currentStatus} ms-1`}>{ticket.currentStatus.replace(/_/g, ' ')}</span>
          </p>
          <p>
            <strong>Requester:</strong> <span className="zen-readonly ms-1">{ticket.requester.name} ({ticket.requester.email})</span>
          </p>
          <p>
            <strong>Created:</strong> <span className="zen-readonly ms-1">{new Date(ticket.ticketDate).toLocaleString()}</span>
          </p>
          <p>
            <strong>Updated:</strong> <span className="zen-readonly ms-1">{new Date(ticket.updatedAt).toLocaleString()}</span>
          </p>
          <p className="mb-0">
            <strong>Description:</strong>
          </p>
          <div className="zen-readonly mt-1">{ticket.description}</div>
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-header">Public Comments ({comments.length})</div>
        <div className="card-body">
          {ticket.appearsResolved ? (
            <p className="alert alert-info" role="status">
              You marked this as appears resolved. Awaiting IT verification.
            </p>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-outline-success btn-sm mb-3"
                disabled={resolveBusy}
                onClick={handleAppearsResolved}
              >
                {resolveBusy ? 'Saving...' : 'Problem Appears Resolved'}
              </button>
              {resolveError && <p className="text-danger" role="alert">{resolveError}</p>}
            </>
          )}
          {comments.length === 0 && <p className="text-muted">No comments yet.</p>}
          {comments.map((c) => (
            <div key={c.id} className="border-bottom py-2">
              <div>
                <strong>{c.author.name}</strong>{' '}
                <span className="badge bg-secondary">{c.author.role}</span>{' '}
                <small className="text-muted">{new Date(c.createdAt).toLocaleString()}</small>
              </div>
              <div>{c.body}</div>
            </div>
          ))}
          <div className="mt-3">
            <label htmlFor="new-comment" className="form-label">
              Add Public Comment
            </label>
            <textarea
              id="new-comment"
              className="form-control"
              rows={3}
              value={commentDraft}
              maxLength={2000}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Type your comment here..."
            />
            {commentError && <small className="text-danger mt-1 d-block" role="alert">{commentError}</small>}
            <button
              type="button"
              className="btn btn-primary btn-sm mt-2"
              disabled={commentBusy}
              onClick={handlePostComment}
            >
              {commentBusy ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Attachments ({activeCount}/5)</span>
          <label className="btn btn-outline-secondary btn-sm mb-0">
            Upload File
            <input
              type="file"
              hidden
              data-testid="file-input"
              onChange={handleUpload}
              accept=".jpg,.jpeg,.png,.webp,.pdf"
            />
          </label>
        </div>
        <div className="card-body">
          {uploadError && <p className="text-danger" role="alert">{uploadError}</p>}
          {downloadError && <p className="text-danger" role="alert">{downloadError}</p>}
          {ticket.attachments.length === 0 && <p className="text-muted">No attachments yet.</p>}
          {ticket.attachments.map((att) => (
            <div key={att.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
              <div>
                {att.isRemoved ? <s>{att.filename}</s> : att.filename}
                <small className="text-muted ms-2">({(att.fileSize / 1024).toFixed(1)} KB)</small>
                {att.isRemoved && <span className="badge bg-secondary ms-2">Removed</span>}
                {att.isRemoved && att.removalReason && <div className="small text-muted">Reason: {att.removalReason}</div>}
              </div>
              <div className="d-flex gap-2 align-items-center">
                {!att.isRemoved ? (
                  <>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => handleDownload(att)}>
                      Download
                    </button>
                    {showReasonFor === att.id ? (
                      <div>
                        <div className="d-flex gap-1">
                          <input
                            placeholder="Reason"
                            className="form-control form-control-sm"
                            value={removeReason[att.id] || ''}
                            onChange={(e) => setRemoveReason({ ...removeReason, [att.id]: e.target.value })}
                          />
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemove(att.id)}>
                            Confirm
                          </button>
                        </div>
                        {removeError[att.id] && <small className="text-danger d-block mt-1" role="alert">{removeError[att.id]}</small>}
                      </div>
                    ) : (
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setShowReasonFor(att.id)}>
                        Remove
                      </button>
                    )}
                  </>
                ) : (
                  <small className="text-muted">Download blocked</small>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}