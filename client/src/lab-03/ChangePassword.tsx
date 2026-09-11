import { useState } from 'react';

import { useAuth } from './AuthContext';

const RULES = [
  { id: 'length', label: 'Be at least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'case', label: 'Include upper and lower case letters', test: (v: string) => /[A-Z]/.test(v) && /[a-z]/.test(v) },
  { id: 'number', label: 'Include a number', test: (v: string) => /[0-9]/.test(v) },
  { id: 'special', label: 'Include a special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) }
];

export function ChangePassword({ onChanged }: { onChanged?: () => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const allRulesPass = RULES.every((r) => r.test(next));
  const valid = current.length > 0 && allRulesPass && !mismatch && confirm.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setFailure(null);
    const result = await changePassword(current, next, confirm);
    setBusy(false);
    if (!result.ok) {
      setFailure(result.message);
      return;
    }
    onChanged?.();
  }

  return (
    <main className="container py-5" style={{ maxWidth: '26rem' }}>
      <h1 className="h4 mb-1">Change Your Password</h1>
      <p className="text-muted mb-4">You must change your password to continue.</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="cp-current" className="form-label">
            Current (temporary) password
          </label>
          <input
            id="cp-current"
            type="password"
            className="form-control"
            value={current}
            autoComplete="current-password"
            aria-required="true"
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="cp-new" className="form-label">
            New password
          </label>
          <input
            id="cp-new"
            type="password"
            className="form-control"
            value={next}
            autoComplete="new-password"
            aria-required="true"
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="cp-confirm" className="form-label">
            Confirm new password
          </label>
          <input
            id="cp-confirm"
            type="password"
            className="form-control"
            value={confirm}
            autoComplete="new-password"
            aria-required="true"
            aria-invalid={mismatch}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && (
            <small className="text-danger mt-1 d-block" role="alert">
              Passwords do not match
            </small>
          )}
        </div>
        <ul className="list-unstyled small mb-3" aria-label="Password rules">
          {RULES.map((r) => {
            const pass = r.test(next);
            return (
              <li key={r.id} className={pass ? 'text-success' : 'text-muted'}>
                {pass ? '✓ ' : '○ '}{r.label}
              </li>
            );
          })}
        </ul>
        {failure && (
          <p className="text-danger" role="alert">
            {failure}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-100" disabled={!valid || busy}>
          {busy ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </main>
  );
}
