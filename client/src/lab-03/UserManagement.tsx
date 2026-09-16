import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type UserRole = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

interface FieldError {
  field: string;
  message: string;
}

const ROLE_OPTIONS: { value: '' | UserRole; label: string }[] = [
  { value: '', label: 'All roles' },
  { value: 'REQUESTER', label: 'Requester' },
  { value: 'IT_STAFF', label: 'IT Staff' },
  { value: 'ADMINISTRATOR', label: 'Administrator' }
];

function roleBadgeClass(): string {
  return 'bg-secondary';
}

export function UserManagement({ currentUserId }: { currentUserId: number }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'forbidden' | 'error'>('loading');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [notice, setNotice] = useState('');

  const [drawer, setDrawer] = useState<null | { kind: 'create' } | { kind: 'edit'; user: ManagedUser }>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('REQUESTER');
  const [isActive, setIsActive] = useState(true);
  const [initialPassword, setInitialPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const params = new URLSearchParams();
      if (appliedSearch) params.set('search', appliedSearch);
      if (roleFilter) params.set('role', roleFilter);
      const query = params.toString();
      const res = await fetch(`/api/admin/users${query ? `?${query}` : ''}`, { credentials: 'include' });
      if (res.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (res.status === 403) {
        setStatus('forbidden');
        return;
      }
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = (await res.json()) as { users: ManagedUser[] };
      setUsers(Array.isArray(data.users) ? data.users : []);
      setStatus('loaded');
    } catch {
      setStatus('error');
    }
  }, [appliedSearch, roleFilter, navigate]);

  useEffect(() => {
    load();
  }, [load, reloadTick]);

  function openCreate() {
    setDrawer({ kind: 'create' });
    setName('');
    setEmail('');
    setRole('REQUESTER');
    setIsActive(true);
    setInitialPassword('');
    setResetPassword('');
    setFieldErrors({});
    setBanner('');
    setResetMsg('');
    setNotice('');
  }

  function openEdit(user: ManagedUser) {
    setDrawer({ kind: 'edit', user });
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setIsActive(user.isActive);
    setInitialPassword('');
    setResetPassword('');
    setFieldErrors({});
    setBanner('');
    setResetMsg('');
    setNotice('');
  }

  function applyDetails(details: unknown): Record<string, string> {
    const mapped: Record<string, string> = {};
    if (Array.isArray(details)) {
      for (const d of details as FieldError[]) {
        if (d && typeof d.field === 'string' && typeof d.message === 'string') mapped[d.field] = d.message;
      }
    }
    return mapped;
  }

  async function readErrorBody(res: Response): Promise<{ message: string; details: unknown }> {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; details?: unknown };
    };
    return { message: body.error?.message ?? 'Something went wrong. Please try again.', details: body.error?.details };
  }

  async function handleSave() {
    if (!drawer || saving) return;
    setSaving(true);
    setFieldErrors({});
    setBanner('');
    try {
      const isCreate = drawer.kind === 'create';
      const url = isCreate ? '/api/admin/users' : `/api/admin/users/${drawer.user.id}`;
      const payload: Record<string, unknown> = isCreate
        ? { name: name.trim(), email: email.trim(), role, isActive, initialPassword }
        : { name: name.trim(), email: email.trim(), role, isActive };
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const err = await readErrorBody(res);
        setFieldErrors(applyDetails(err.details));
        setBanner(err.message);
        return;
      }
      setDrawer(null);
      setNotice(isCreate ? 'User created.' : 'User updated.');
      setReloadTick((t) => t + 1);
    } catch {
      setBanner('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!drawer || drawer.kind !== 'edit' || saving) return;
    const target = drawer.user;
    const next = !target.isActive;
    if (!next && target.id === currentUserId) return;
    if (!next && !window.confirm(`Deactivate ${target.name}? They will no longer be able to sign in.`)) return;
    setSaving(true);
    setBanner('');
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next })
      });
      if (res.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const err = await readErrorBody(res);
        setBanner(err.message);
        return;
      }
      const updated = (await res.json()) as ManagedUser;
      setDrawer({ kind: 'edit', user: updated });
      setIsActive(updated.isActive);
      setNotice(next ? 'User activated.' : 'User deactivated.');
      setReloadTick((t) => t + 1);
    } catch {
      setBanner('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!drawer || drawer.kind !== 'edit' || saving) return;
    setSaving(true);
    setBanner('');
    setResetMsg('');
    try {
      const res = await fetch(`/api/admin/users/${drawer.user.id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialPassword: resetPassword })
      });
      if (res.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const err = await readErrorBody(res);
        const mapped = applyDetails(err.details);
        if (mapped.initialPassword) {
          setFieldErrors((prev) => ({ ...prev, resetPassword: mapped.initialPassword }));
        } else {
          setBanner(err.message);
        }
        return;
      }
      setResetPassword('');
      setResetMsg('Initial password reset. The user must change it at next login.');
      setReloadTick((t) => t + 1);
    } catch {
      setBanner('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <p role="status" className="container py-4">
        Loading users...
      </p>
    );
  }

  if (status === 'forbidden') {
    return (
      <p role="alert" className="container py-4 text-danger">
        You do not have access to user management.
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className="container py-4">
        <p role="alert" className="text-danger">
          Failed to load users.
        </p>
        <button type="button" className="btn btn-outline-secondary" onClick={() => setReloadTick((t) => t + 1)}>
          Retry
        </button>
      </div>
    );
  }

  const editing = drawer?.kind === 'edit' ? drawer.user : null;
  const selfDeactivateDisabled = !!editing && editing.id === currentUserId && editing.isActive;

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Users</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Create User
        </button>
      </div>

      {notice && (
        <p role="status" className="text-success">
          {notice}
        </p>
      )}

      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-end">
          <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
            <label htmlFor="admin-search" className="form-label visually-hidden">
              Search users
            </label>
            <div className="input-group">
              <input
                id="admin-search"
                type="search"
                className="form-control"
                placeholder="Search users by name or email"
                aria-label="Search users"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAppliedSearch(search.trim());
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label="Search users"
                onClick={() => setAppliedSearch(search.trim())}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="admin-role-filter" className="form-label">
              Role
            </label>
            <select
              id="admin-role-filter"
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <p role="status">No users found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col" className="d-none d-md-table-cell">
                  Email
                </th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Edit</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name}
                    <div className="d-md-none">
                      <small className="text-muted">{u.email}</small>
                    </div>
                  </td>
                  <td className="d-none d-md-table-cell">{u.email}</td>
                  <td>
                    <span className={`badge ${roleBadgeClass()}`}>{u.role}</span>
                  </td>
                  <td>
                    {u.isActive ? (
                      <span className="badge bg-success">Active</span>
                    ) : (
                      <span className="badge bg-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawer && (
        <div
          className="card mb-3"
          role="dialog"
          aria-label={drawer.kind === 'create' ? 'Create New User' : 'Edit User'}
        >
          <div className="card-body">
            <h2 className="h5 mb-3">{drawer.kind === 'create' ? 'Create New User' : 'Edit User'}</h2>
            {banner && (
              <p role="alert" className="text-danger">
                {banner}
              </p>
            )}
            <div className="mb-3">
              <label htmlFor="admin-name" className="form-label">
                Full Name *
              </label>
              <input
                id="admin-name"
                className={`form-control${fieldErrors.name ? ' is-invalid' : ''}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-required="true"
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
            </div>
            <div className="mb-3">
              <label htmlFor="admin-email" className="form-label">
                Email Address *
              </label>
              <input
                id="admin-email"
                type="email"
                className={`form-control${fieldErrors.email ? ' is-invalid' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-required="true"
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
            </div>
            <div className="mb-3">
              <label htmlFor="admin-user-role" className="form-label">
                User Role *
              </label>
              <select
                id="admin-user-role"
                className={`form-select${fieldErrors.role ? ' is-invalid' : ''}`}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                aria-required="true"
                aria-invalid={!!fieldErrors.role}
              >
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
              {fieldErrors.role && <div className="invalid-feedback">{fieldErrors.role}</div>}
            </div>
            <div className="form-check mb-3">
              <input
                id="admin-active"
                type="checkbox"
                className="form-check-input"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="admin-active" className="form-check-label">
                Active
              </label>
            </div>
            {drawer.kind === 'create' && (
              <div className="mb-3">
                <label htmlFor="admin-initial-password" className="form-label">
                  Initial Password *
                </label>
                <input
                  id="admin-initial-password"
                  type="password"
                  className={`form-control${fieldErrors.initialPassword ? ' is-invalid' : ''}`}
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  aria-required="true"
                  aria-invalid={!!fieldErrors.initialPassword}
                  aria-describedby="admin-password-hint"
                />
                <div id="admin-password-hint" className="form-text">
                  At least 8 characters with upper/lower case, a number, and a special character. User must change at next login.
                </div>
                {fieldErrors.initialPassword && <div className="invalid-feedback">{fieldErrors.initialPassword}</div>}
              </div>
            )}
            <div className="d-flex gap-2 mb-2">
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save User'}
              </button>
              <button type="button" className="btn btn-outline-secondary" disabled={saving} onClick={() => setDrawer(null)}>
                Cancel
              </button>
            </div>
            {editing && (
              <div className="border-top pt-3 mt-2">
                <button
                  type="button"
                  className={`btn btn-sm ${editing.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                  disabled={saving || selfDeactivateDisabled}
                  title={selfDeactivateDisabled ? 'You cannot deactivate your own account' : undefined}
                  onClick={handleToggleActive}
                >
                  {editing.isActive ? 'Deactivate User' : 'Activate User'}
                </button>
                <div className="mt-3">
                  <label htmlFor="admin-reset-password" className="form-label">
                    Set Initial Password
                  </label>
                  <div className="input-group">
                    <input
                      id="admin-reset-password"
                      type="password"
                      className={`form-control${fieldErrors.resetPassword ? ' is-invalid' : ''}`}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      aria-invalid={!!fieldErrors.resetPassword}
                    />
                    <button type="button" className="btn btn-outline-secondary" disabled={saving || !resetPassword} onClick={handleResetPassword}>
                      Reset
                    </button>
                  </div>
                  {fieldErrors.resetPassword && <div className="invalid-feedback d-block">{fieldErrors.resetPassword}</div>}
                  {resetMsg && (
                    <p role="status" className="text-success mt-2 mb-0">
                      {resetMsg}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
