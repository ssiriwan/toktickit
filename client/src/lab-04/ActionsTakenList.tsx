import { useCallback, useEffect, useRef, useState } from 'react';

export interface ActionTakenItem {
  id: number;
  ticketId: number;
  actionDateTime: string;
  description: string;
  result: string | null;
  status: string;
  performedBy: { id: number; name: string; role: string };
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StaffUser {
  id: number;
  name: string;
  role?: string;
}

const ACTION_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'];
/** Client mirror of the server lifecycle (server still enforces; this only prevents the round-trip). */
const EDIT_STATUS_OPTIONS: Record<string, string[]> = {
  PENDING: ['PENDING', 'IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED']
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ');
}

interface FormState {
  description: string;
  dateTime: string;
  performedById: string;
  status: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

function emptyForm(defaultPerformer: string): FormState {
  return {
    description: '',
    dateTime: toLocalInputValue(new Date()),
    performedById: defaultPerformer,
    status: 'PENDING',
    result: '',
    followUpRequired: false,
    followUpNote: '',
    attachmentNotes: ''
  };
}

export function ActionsTakenList({ ticketId, mode }: { ticketId: number; mode: 'staff' | 'requester' }) {
  const [actions, setActions] = useState<ActionTakenItem[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error' | 'forbidden'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [myId, setMyId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ActionTakenItem | null>(null);
  const [editOriginalMinutes, setEditOriginalMinutes] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(''));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formBanner, setFormBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const listUrl = mode === 'staff' ? `/api/staff/tickets/${ticketId}/actions` : `/api/tickets/${ticketId}/actions`;

  const load = useCallback(async () => {
    setState('loading');
    setLoadError(null);
    try {
      const res = await fetch(listUrl, { credentials: 'include' });
      if (res.status === 403) {
        setState('forbidden');
        return;
      }
      if (!res.ok) throw new Error('Failed');
      const data = await res.json().catch(() => []);
      setActions(Array.isArray(data) ? data : []);
      setState('success');
    } catch {
      setState('error');
      setLoadError('Unable to load actions taken.');
    }
  }, [listUrl]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (mode !== 'staff') return;
    fetch('/api/staff/users', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: StaffUser[] | { users?: StaffUser[] } | null) => {
        if (!data) return;
        const list = Array.isArray(data) ? data : data.users;
        if (Array.isArray(list)) setStaffUsers(list);
      })
      .catch(() => {});
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: { id?: unknown } } | null) => {
        if (data && typeof data.user?.id === 'number') setMyId(data.user.id);
      })
      .catch(() => {});
  }, [mode]);

  function openCreate() {
    setEditing(null);
    setEditOriginalMinutes(null);
    const fallback = staffUsers.length > 0 ? String(staffUsers[0].id) : '';
    setForm(emptyForm(myId !== null ? String(myId) : fallback));
    setFieldErrors({});
    setFormBanner(null);
    setShowForm(true);
  }

  function openEdit(action: ActionTakenItem) {
    setEditing(action);
    const minuteValue = toLocalInputValue(new Date(action.actionDateTime));
    setEditOriginalMinutes(minuteValue);
    setForm({
      description: action.description,
      dateTime: minuteValue,
      performedById: String(action.performedBy.id),
      status: action.status,
      result: action.result ?? '',
      followUpRequired: action.followUpRequired,
      followUpNote: action.followUpNote ?? '',
      attachmentNotes: action.attachmentNotes ?? ''
    });
    setFieldErrors({});
    setFormBanner(null);
    setShowForm(true);
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    const desc = form.description.trim();
    if (!desc) errors.description = 'Description must not be empty';
    else if (desc.length > 2000) errors.description = 'Description must be at most 2000 characters';
    const when = new Date(form.dateTime);
    if (Number.isNaN(when.getTime())) errors.dateTime = 'Action date must be a valid date';
    else if (when.getTime() - Date.now() > 24 * 3600 * 1000) {
      errors.dateTime = 'Action date must not be more than 24 hours in the future';
    }
    if (!form.performedById) errors.performedById = 'Select who performed this action';
    if (form.status === 'COMPLETED' && !form.result.trim()) {
      errors.result = 'Result is required when completing an action';
    }
    if (form.followUpRequired && !form.followUpNote.trim()) {
      errors.followUpNote = 'Follow-up note is required when follow-up is requested';
    }
    return errors;
  }

  async function handleSave() {
    if (submittingRef.current) return;
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFormBanner(null);
    try {
      const base = {
        description: form.description.trim(),
        performedById: Number(form.performedById),
        status: form.status,
        result: form.result.trim() || null,
        followUpRequired: form.followUpRequired,
        followUpNote: form.followUpNote.trim() || null,
        attachmentNotes: form.attachmentNotes.trim() || null
      };
      // datetime-local drops seconds: resend only when the minute value changed.
      const dateTime =
        !editing || form.dateTime !== editOriginalMinutes ? new Date(form.dateTime).toISOString() : undefined;
      const payload = dateTime === undefined ? base : { ...base, actionDateTime: dateTime };
      const url = editing
        ? `/api/staff/tickets/${ticketId}/actions/${editing.id}`
        : `/api/staff/tickets/${ticketId}/actions`;
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({} as { error?: { message?: string; details?: { field?: string; message?: string }[] } }));
      if (!res.ok) {
        const mapped: Record<string, string> = {};
        for (const d of body.error?.details ?? []) {
          if (d.field) mapped[d.field] = d.message ?? 'Invalid value';
        }
        setFieldErrors(mapped);
        setFormBanner(body.error?.message ?? 'Failed to save action');
        return;
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch {
      setFormBanner('Failed to save action');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleQuickStatus(action: ActionTakenItem, status: 'COMPLETED' | 'CANCELLED') {
    setRowBusy(action.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/actions/${action.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; details?: { field?: string; message?: string }[] };
      };
      if (!res.ok) {
        const details: { field?: string; message?: string }[] = body.error?.details ?? [];
        const needsResult = details.some((d) => d.field === 'result');
        if (status === 'COMPLETED' && needsResult) {
          openEdit({ ...action, status: 'COMPLETED' });
          setFormBanner(body.error?.message ?? 'Result is required when completing an action');
          return;
        }
        setRowError(body.error?.message ?? `Failed to mark as ${formatStatus(status).toLowerCase()}`);
        return;
      }
      await load();
    } catch {
      setRowError('Failed to update action');
    } finally {
      setRowBusy(null);
    }
  }

  if (state === 'loading') return <p role="status" className="text-muted">Loading actions taken...</p>;
  if (state === 'forbidden') {
    return <p role="alert" className="text-danger">You do not have access to these actions.</p>;
  }
  if (state === 'error') {
    return (
      <div>
        <p role="alert" className="text-danger">{loadError}</p>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <section aria-label="Actions Taken">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h5 mb-0">Actions Taken ({actions.length})</h2>
        {mode === 'staff' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            + Add Action Taken
          </button>
        )}
      </div>
      {rowError && <p className="text-danger" role="alert">{rowError}</p>}
      {actions.length === 0 && (
        <p className="text-muted">
          {mode === 'staff' ? 'No actions recorded yet. Add the first action to start tracking work.' : 'No actions recorded yet — IT staff updates will appear here.'}
        </p>
      )}
      {actions.map((a) => (
        <article key={a.id} className="card mb-2">
          <div className="card-body py-2">
            <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
              <div>
                <span className={`badge badge-action-${a.status}`}>{formatStatus(a.status)}</span>{' '}
                <small className="text-muted">{new Date(a.actionDateTime).toLocaleString()}</small>
              </div>
              {mode === 'staff' && (
                <div className="d-flex gap-1">
                  <button type="button" className="btn btn-outline-secondary btn-sm" disabled={rowBusy === a.id} onClick={() => openEdit(a)}>
                    Edit
                  </button>
                  {!TERMINAL_STATUSES.includes(a.status) && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        disabled={rowBusy === a.id}
                        onClick={() => handleQuickStatus(a, 'COMPLETED')}
                      >
                        {rowBusy === a.id ? 'Saving...' : 'Mark completed'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={rowBusy === a.id}
                        onClick={() => handleQuickStatus(a, 'CANCELLED')}
                      >
                        Cancel action
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="mt-1">{a.description}</div>
            {a.result && <div className="mt-1"><strong>Result:</strong> {a.result}</div>}
            <div className="mt-1">
              <small className="text-muted">Performed by {a.performedBy.name} ({a.performedBy.role})</small>
            </div>
            {a.followUpRequired && (
              <div className="mt-1">
                <span className="badge bg-warning text-dark">Follow-up</span>{' '}
                <small>{a.followUpNote}</small>
              </div>
            )}
            {a.attachmentNotes && <div className="mt-1"><small className="text-muted">Attachments: {a.attachmentNotes}</small></div>}
          </div>
        </article>
      ))}

      {mode === 'staff' && showForm && (
        <div className="card border-primary" role="dialog" aria-label={editing ? 'Edit Action Taken' : 'Add Action Taken'}>
          <div className="card-body">
            <h3 className="h6">{editing ? 'Edit Action Taken' : 'Add Action Taken'}</h3>
            {formBanner && <p className="text-danger" role="alert">{formBanner}</p>}
            <div className="mb-2">
              <label htmlFor="action-description" className="form-label">Description <span className="required-star">*</span></label>
              <textarea
                id="action-description"
                className="form-control"
                rows={3}
                value={form.description}
                maxLength={2000}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                aria-required
                aria-invalid={!!fieldErrors.description}
              />
              {fieldErrors.description && <small className="text-danger d-block" role="alert">{fieldErrors.description}</small>}
            </div>
            <div className="row g-2">
              <div className="col-md-6 mb-2">
                <label htmlFor="action-datetime" className="form-label">Date/Time</label>
                <input
                  id="action-datetime"
                  type="datetime-local"
                  className="form-control"
                  value={form.dateTime}
                  onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                  aria-invalid={!!fieldErrors.dateTime}
                />
                {fieldErrors.dateTime && <small className="text-danger d-block" role="alert">{fieldErrors.dateTime}</small>}
              </div>
              <div className="col-md-6 mb-2">
                <label htmlFor="action-performer" className="form-label">Performed by <span className="required-star">*</span></label>
                <select
                  id="action-performer"
                  className="form-select"
                  value={form.performedById}
                  onChange={(e) => setForm({ ...form, performedById: e.target.value })}
                  aria-required
                  aria-invalid={!!fieldErrors.performedById}
                >
                  <option value="">Select staff...</option>
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                {fieldErrors.performedById && <small className="text-danger d-block" role="alert">{fieldErrors.performedById}</small>}
              </div>
              <div className="col-md-6 mb-2">
                <label htmlFor="action-status" className="form-label">Status</label>
                <select
                  id="action-status"
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {(editing ? (EDIT_STATUS_OPTIONS[editing.status] ?? [editing.status]) : ACTION_STATUSES).map((s) => (
                    <option key={s} value={s}>{formatStatus(s)}</option>
                  ))}
                </select>
                {fieldErrors.status && <small className="text-danger d-block" role="alert">{fieldErrors.status}</small>}
              </div>
              <div className="col-md-6 mb-2">
                <label htmlFor="action-attachments" className="form-label">Attachment Notes</label>
                <input
                  id="action-attachments"
                  type="text"
                  className="form-control"
                  value={form.attachmentNotes}
                  onChange={(e) => setForm({ ...form, attachmentNotes: e.target.value })}
                  placeholder="diagnostic_log.pdf"
                />
              </div>
            </div>
            <div className="mb-2">
              <label htmlFor="action-result" className="form-label">Result{form.status === 'COMPLETED' ? <span className="required-star"> *</span> : null}</label>
              <textarea
                id="action-result"
                className="form-control"
                rows={2}
                value={form.result}
                maxLength={2000}
                onChange={(e) => setForm({ ...form, result: e.target.value })}
                aria-invalid={!!fieldErrors.result}
              />
              {fieldErrors.result && <small className="text-danger d-block" role="alert">{fieldErrors.result}</small>}
            </div>
            <div className="form-check mb-2">
              <input
                id="action-followup"
                type="checkbox"
                className="form-check-input"
                checked={form.followUpRequired}
                onChange={(e) => setForm({ ...form, followUpRequired: e.target.checked })}
              />
              <label htmlFor="action-followup" className="form-check-label">Follow-up Required</label>
            </div>
            {form.followUpRequired && (
              <div className="mb-2">
                <label htmlFor="action-followup-note" className="form-label">Follow-up Note <span className="required-star">*</span></label>
                <textarea
                  id="action-followup-note"
                  className="form-control"
                  rows={2}
                  value={form.followUpNote}
                  maxLength={2000}
                  onChange={(e) => setForm({ ...form, followUpNote: e.target.value })}
                  aria-required
                  aria-invalid={!!fieldErrors.followUpNote}
                />
                {fieldErrors.followUpNote && <small className="text-danger d-block" role="alert">{fieldErrors.followUpNote}</small>}
              </div>
            )}
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={submitting} onClick={handleSave}>
                {submitting ? 'Saving...' : 'Save Action'}
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={submitting} onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
