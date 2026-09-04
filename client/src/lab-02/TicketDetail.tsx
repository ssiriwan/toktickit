import { useEffect, useState } from 'react';

import type { Requester } from './RequesterSelection';

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
  const [removeReason, setRemoveReason] = useState<Record<number, string>>({});
  const [showReasonFor, setShowReasonFor] = useState<number | null>(null);

  async function load() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/tickets/${ticketId}?requesterId=${requester.id}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, requester.id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setUploadError('File type not allowed. Permitted: JPG, JPEG, PNG, WEBP, PDF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/tickets/${ticketId}/attachments?requesterId=${requester.id}`, {
      method: 'POST',
      body: form
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUploadError(body.error?.message || 'Failed to upload');
    } else {
      await load();
    }
    e.target.value = '';
  }

  async function handleDownload(att: Attachment) {
    if (att.isRemoved) return;
    window.open(`/api/attachments/${att.id}/download?requesterId=${requester.id}`, '_blank');
  }

  async function handleRemove(id: number) {
    const reason = removeReason[id]?.trim();
    if (!reason) {
      setUploadError('Reason is required');
      return;
    }
    const res = await fetch(`/api/attachments/${id}/remove?requesterId=${requester.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUploadError(body.error?.message || 'Failed to remove');
    } else {
      setShowReasonFor(null);
      await load();
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
          <p><strong>Summary:</strong> {ticket.summary}</p>
          <p><strong>Category:</strong> {ticket.category.name}</p>
          <p><strong>System:</strong> {ticket.relatedSystem.name}</p>
          <p><strong>Priority:</strong> {ticket.requestedPriority}</p>
          <p><strong>Status:</strong> {ticket.currentStatus}</p>
          <p><strong>Created:</strong> {new Date(ticket.ticketDate).toLocaleString()}</p>
          <p className="mb-0"><strong>Description:</strong></p>
          <p>{ticket.description}</p>
        </div>
      </section>

      <section className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Attachments ({activeCount}/5)</span>
          <label className="btn btn-outline-secondary btn-sm mb-0">
            Upload File
            <input type="file" hidden onChange={handleUpload} accept=".jpg,.jpeg,.png,.webp,.pdf" />
          </label>
        </div>
        <div className="card-body">
          {uploadError && <p className="text-danger" role="alert">{uploadError}</p>}
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