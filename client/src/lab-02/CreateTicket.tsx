import { useEffect, useState } from 'react';

import type { Requester } from './RequesterSelection';

type ReferenceItem = { id: number; name: string };
type Status = 'idle' | 'loading' | 'success' | 'error';
type SubmitStatus = 'idle' | 'submitting' | 'error' | 'done';

interface CreateTicketProps {
  requester: Requester;
}

export function CreateTicket({ requester }: CreateTicketProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [systems, setSystems] = useState<ReferenceItem[]>([]);

  const [categoryId, setCategoryId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [priority, setPriority] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');

  useEffect(() => {
    async function load() {
      setStatus('loading');
      try {
        const [catResp, sysResp] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/related-systems')
        ]);
        const [cats, sys] = await Promise.all([
          catResp.json(),
          sysResp.json()
        ]);
        setCategories(cats);
        setSystems(sys);
        setStatus('success');
      } catch {
        setStatus('error');
      }
    }
    load();
  }, []);

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

  async function handleSubmit() {
    if (!validate() || submitStatus === 'submitting') return;
    setSubmitStatus('submitting');
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
      await response.json();
      setSubmitStatus('done');
    } catch {
      setSubmitStatus('error');
    }
  }

  return (
    <main className="container py-4" style={{ maxWidth: '46rem' }}>
      <h1 className="h4 mb-4">Create Ticket</h1>

      <section className="card mb-3">
        <h2 className="h6 card-header">System Info</h2>
        <div className="card-body row g-2">
          <div className="col-md-4">
            <span className="text-muted d-block">Ticket Number</span>
            <em className="text-muted">Auto-generated</em>
          </div>
          <div className="col-md-4">
            <span className="text-muted d-block">Ticket Date</span>
            <em className="text-muted">Auto-set</em>
          </div>
          <div className="col-md-4">
            <span className="text-muted d-block">Requester</span>
            <strong>{requester.name}</strong>
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
                  Category {errors.category && (
                    <span className="text-danger">({errors.category})</span>
                  )}
                </label>
                <select
                  id="category"
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="relatedSystem" className="form-label">
                  Related System
                </label>
                <select
                  id="relatedSystem"
                  className="form-select"
                  value={systemId}
                  onChange={(e) => setSystemId(e.target.value)}
                >
                  <option value="">Select a system</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="priority" className="form-label">
                  Requested Priority
                </label>
                <select
                  id="priority"
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="">Select priority</option>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card mb-3">
            <h2 className="h6 card-header">Details</h2>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="summary" className="form-label">
                  Summary
                </label>
                <input
                  id="summary"
                  className="form-control"
                  value={summary}
                  maxLength={150}
                  aria-invalid={!!errors.summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
                {errors.summary && (
                  <small className="text-danger" role="alert">
                    {errors.summary}
                  </small>
                )}
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  className="form-control"
                  rows={5}
                  value={description}
                  maxLength={2000}
                  aria-invalid={!!errors.description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {errors.description && (
                  <small className="text-danger" role="alert">
                    {errors.description}
                  </small>
                )}
              </div>
            </div>
          </section>

          {submitStatus === 'error' && (
            <p className="text-danger" role="alert">
              Unable to create ticket. Please try again.
            </p>
          )}
          {submitStatus === 'done' && (
            <p className="text-success" role="status">
              Ticket created successfully!
            </p>
          )}

          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary">
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