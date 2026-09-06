import { useEffect, useState } from 'react';

import type { Requester } from './RequesterSelection';

type ReferenceItem = { id: number; name: string };
type Status = 'idle' | 'loading' | 'success' | 'error';
type SubmitStatus = 'idle' | 'submitting' | 'error' | 'done';

interface CreateTicketProps {
  requester: Requester;
  onViewMyTickets?: () => void;
}

export function CreateTicket({ requester, onViewMyTickets }: CreateTicketProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [systems, setSystems] = useState<ReferenceItem[]>([]);

  const [categoryId, setCategoryId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [priority, setPriority] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setStatus('loading');
      try {
        const [catResp, sysResp] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/related-systems')
        ]);
        if (!catResp.ok || !sysResp.ok) {
          throw new Error('Failed to load reference data');
        }
        const [cats, sys] = await Promise.all([catResp.json(), sysResp.json()]);
        setCategories(cats);
        setSystems(sys);
        setStatus('success');
      } catch {
        setStatus('error');
      }
    }
    load();
  }, []);

  function resetForm() {
    setCategoryId('');
    setSystemId('');
    setPriority('');
    setSummary('');
    setDescription('');
    setFiles([]);
    setFileError(null);
    setUploadWarning(null);
    setErrors({});
    setSubmitStatus('idle');
    setCreatedTicketNumber(null);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!categoryId) next.category = 'Category is required';
    if (!systemId) next.system = 'Related system is required';
    if (!priority) next.priority = 'Priority is required';
    if (!summary.trim()) next.summary = 'Summary is required';
    if (!description.trim()) next.description = 'Description is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target as HTMLInputElement;
    const selected = input.files ? Array.from(input.files) : [];
    setFileError(null);
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const nextFiles = [...files];
    for (const f of selected) {
      if (!allowed.includes(f.type)) {
        setFileError('File type not allowed. Permitted: JPG, JPEG, PNG, WEBP, PDF');
        input.value = '';
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setFileError('File size exceeds 5MB limit');
        input.value = '';
        return;
      }
      if (nextFiles.length >= 5) {
        setFileError('Maximum 5 attachments per ticket');
        input.value = '';
        return;
      }
      nextFiles.push(f);
    }
    setFiles(nextFiles);
    input.value = '';
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
    setFileError(null);
  }

  async function handleSubmit() {
    if (!validate() || submitStatus === 'submitting') return;
    setSubmitStatus('submitting');
    setUploadWarning(null);
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: requester.id,
          categoryId: Number(categoryId),
          relatedSystemId: Number(systemId),
          requestedPriority: priority,
          summary: summary.trim(),
          description: description.trim()
        })
      });
      if (!response.ok) {
        throw new Error(`Ticket request failed: ${response.status}`);
      }
      const data = (await response.json()) as { id: number; ticketNumber: string };
      let failed = 0;
      for (const f of files) {
        const fd = new FormData();
        fd.append('file', f);
        const upRes = await fetch(`/api/tickets/${data.id}/attachments?requesterId=${requester.id}`, {
          method: 'POST',
          body: fd
        });
        if (!upRes.ok) failed++;
      }
      if (failed > 0) setUploadWarning(`Ticket created but ${failed} attachment(s) failed — retry in Detail`);
      setCreatedTicketNumber(data.ticketNumber);
      setSubmitStatus('done');
    } catch {
      setSubmitStatus('error');
    }
  }

  function RequiredStar() {
    return <span className="required-star"> *</span>;
  }

  if (submitStatus === 'done' && createdTicketNumber) {
    return (
      <main className="container py-4" style={{ maxWidth: '46rem' }}>
        <div className="alert alert-success" role="status">
          <h2 className="h5 mb-2">Ticket created successfully!</h2>
          <p className="mb-1">
            Your ticket number is{' '}
            <strong style={{ fontSize: '1.1rem' }}>{createdTicketNumber}</strong>
          </p>
          <p className="text-muted small mb-0">
            Ticket Number: {createdTicketNumber} — Status: NEW
          </p>
        </div>
        {uploadWarning && (
          <p className="text-warning mt-2" role="alert" style={{ color: '#92400E', background: '#FEF3C7', padding: '0.5rem', borderRadius: '0.25rem' }}>
            {uploadWarning}
          </p>
        )}
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-primary" onClick={onViewMyTickets}>
            View My Tickets
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
            Create another ticket
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-4" style={{ maxWidth: '46rem' }}>
      <h1 className="h4 mb-4">Create Ticket</h1>

      <section className="card mb-3">
        <h2 className="h6 card-header">System Info</h2>
        <div className="card-body row g-2">
          <div className="col-md-4">
            <span className="text-muted d-block">Ticket Number</span>
            <div className="zen-readonly">Auto-generated</div>
          </div>
          <div className="col-md-4">
            <span className="text-muted d-block">Ticket Date</span>
            <div className="zen-readonly">Auto-set</div>
          </div>
          <div className="col-md-4">
            <span className="text-muted d-block">Requester</span>
            <div className="zen-readonly">{requester.name}</div>
          </div>
        </div>
      </section>

      {status === 'loading' && (
        <p role="status" className="text-muted">
          Loading reference data...
        </p>
      )}

      {status === 'error' && (
        <p role="alert" className="text-danger">
          Unable to load reference data.
        </p>
      )}

      {status === 'success' && (
        <>
          <section className="card mb-3">
            <h2 className="h6 card-header">Classification</h2>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="category" className="form-label">
                  Category
                  <RequiredStar />
                </label>
                <select
                  id="category"
                  className="form-select"
                  value={categoryId}
                  aria-required="true"
                  aria-invalid={!!errors.category}
                  aria-describedby={errors.category ? 'category-error' : undefined}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <small id="category-error" className="text-danger mt-1 d-block" role="alert">
                    {errors.category}
                  </small>
                )}
              </div>
              <div className="mb-3">
                <label htmlFor="relatedSystem" className="form-label">
                  Related System
                  <RequiredStar />
                </label>
                <select
                  id="relatedSystem"
                  className="form-select"
                  value={systemId}
                  aria-required="true"
                  aria-invalid={!!errors.system}
                  aria-describedby={errors.system ? 'system-error' : undefined}
                  onChange={(e) => setSystemId(e.target.value)}
                >
                  <option value="">Select a system</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.system && (
                  <small id="system-error" className="text-danger mt-1 d-block" role="alert">
                    {errors.system}
                  </small>
                )}
              </div>
              <div className="mb-3">
                <label htmlFor="priority" className="form-label">
                  Requested Priority
                  <RequiredStar />
                </label>
                <select
                  id="priority"
                  className="form-select"
                  value={priority}
                  aria-required="true"
                  aria-invalid={!!errors.priority}
                  aria-describedby={errors.priority ? 'priority-error' : undefined}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="">Select priority</option>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {errors.priority && (
                  <small id="priority-error" className="text-danger mt-1 d-block" role="alert">
                    {errors.priority}
                  </small>
                )}
              </div>
            </div>
          </section>

          <section className="card mb-3">
            <h2 className="h6 card-header">Details</h2>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="summary" className="form-label">
                  Summary
                  <RequiredStar />
                </label>
                <input
                  id="summary"
                  className="form-control"
                  value={summary}
                  maxLength={150}
                  aria-required="true"
                  aria-invalid={!!errors.summary}
                  aria-describedby={errors.summary ? 'summary-error' : undefined}
                  onChange={(e) => setSummary(e.target.value)}
                />
                <div className="d-flex justify-content-between">
                  {errors.summary ? (
                    <small id="summary-error" className="text-danger mt-1" role="alert">
                      {errors.summary}
                    </small>
                  ) : (
                    <span />
                  )}
                  <small className="text-muted mt-1">{summary.length}/150</small>
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Description
                  <RequiredStar />
                </label>
                <textarea
                  id="description"
                  className="form-control"
                  rows={5}
                  value={description}
                  maxLength={2000}
                  aria-required="true"
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'description-error' : undefined}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="d-flex justify-content-between">
                  {errors.description ? (
                    <small id="description-error" className="text-danger mt-1" role="alert">
                      {errors.description}
                    </small>
                  ) : (
                    <span />
                  )}
                  <small className="text-muted mt-1">{description.length}/2000</small>
                </div>
              </div>
            </div>
          </section>

          <section className="card mb-3">
            <h2 className="h6 card-header">Attachments</h2>
            <div className="card-body">
              <label htmlFor="create-attachments" className="form-label">
                Attach files (JPG, PNG, WEBP, PDF — max 5MB each, max 5)
              </label>
              <input
                id="create-attachments"
                type="file"
                className="form-control"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                data-testid="create-file-input"
              />
              {fileError && (
                <small className="text-danger mt-1 d-block" role="alert">
                  {fileError}
                </small>
              )}
              {files.length > 0 && (
                <div className="mt-2">
                  {files.map((f, idx) => (
                    <div key={idx} className="d-flex justify-content-between align-items-center border-bottom py-1">
                      <span>
                        {f.name} <small className="text-muted">({(f.size / 1024).toFixed(1)} KB)</small>
                      </span>
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeFile(idx)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <small className="text-muted">{files.length}/5 attachments</small>
                </div>
              )}
            </div>
          </section>

          {submitStatus === 'error' && (
            <p className="text-danger mt-2" role="alert">
              Unable to create ticket. Please try again.
            </p>
          )}

          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitStatus === 'submitting'}
              onClick={handleSubmit}
            >
              {submitStatus === 'submitting' ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}