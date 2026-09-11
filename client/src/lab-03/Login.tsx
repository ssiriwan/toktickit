import { useState } from 'react';

import { useAuth } from './AuthContext';

export function Login({ onLoggedIn }: { onLoggedIn?: (mustChangePassword: boolean) => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = 'Enter a valid email address';
    if (!password) next.password = 'Password is required';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setFailure(null);
    const result = await login(email.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setFailure(result.message);
      return;
    }
    onLoggedIn?.(result.user.mustChangePassword);
  }

  return (
    <main className="container py-5" style={{ maxWidth: '26rem' }}>
      <h1 className="h4 mb-1">TokTickIT</h1>
      <p className="text-muted mb-4">Sign in to your account</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="login-email" className="form-label">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            className="form-control"
            value={email}
            autoComplete="email"
            aria-required="true"
            aria-invalid={!!fieldErrors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email && (
            <small className="text-danger mt-1 d-block" role="alert">
              {fieldErrors.email}
            </small>
          )}
        </div>
        <div className="mb-3">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <div className="input-group">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              value={password}
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={!!fieldErrors.password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {fieldErrors.password && (
            <small className="text-danger mt-1 d-block" role="alert">
              {fieldErrors.password}
            </small>
          )}
        </div>
        {failure && (
          <p className="text-danger" role="alert">
            {failure}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-100" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}
