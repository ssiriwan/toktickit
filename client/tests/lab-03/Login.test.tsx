import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../src/lab-03/AuthContext';
import { Login } from '../../src/lab-03/Login';

function renderLogin(onLoggedIn = vi.fn()) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login onLoggedIn={onLoggedIn} />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockMe(user: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok, status: ok ? 200 : 401, json: async () => ({ user }) }))
  );
}

describe('Lab 3 Login (UI-01, UI-07)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('validates empty fields inline', async () => {
    mockMe(null, false);
    renderLogin();
    await screen.findByLabelText(/email address/i);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('logs in and reports mustChange flag', async () => {
    const user = {
      id: 1,
      name: 'Requester One',
      email: 'requester1@toktickit.local',
      role: 'REQUESTER',
      isActive: true,
      mustChangePassword: true
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('/api/auth/login')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ user }) });
        }
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      })
    );
    const onLoggedIn = vi.fn();
    renderLogin(onLoggedIn);
    await userEvent.type(screen.getByLabelText(/email address/i), 'requester1@toktickit.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Requester123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onLoggedIn).toHaveBeenCalledWith(true);
  });

  it('shows safe failure for invalid credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('/api/auth/login')) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } })
          });
        }
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      })
    );
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email address/i), 'a@toktickit.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Wrong123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('shows deactivated message for inactive accounts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('/api/auth/login')) {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: async () => ({ error: { code: 'ACCOUNT_INACTIVE', message: 'Account is deactivated. Please contact support.' } })
          });
        }
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      })
    );
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email address/i), 'x@toktickit.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Whatever123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/account is deactivated/i)).toBeInTheDocument();
  });

  it('disables submit while signing in', async () => {
    let resolve!: (v: unknown) => void;
    const pending = new Promise((r) => (resolve = r));
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('/api/auth/login')) return pending;
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      })
    );
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email address/i), 'a@toktickit.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Whatever123!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    const busyButton = await screen.findByRole('button', { name: /signing in/i });
    expect(busyButton).toBeDisabled();
    resolve({ ok: true, status: 200, json: async () => ({ user: null }) });
  });
});
