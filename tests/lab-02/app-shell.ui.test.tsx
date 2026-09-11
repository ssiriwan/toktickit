import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '../../client/src/lab-02/AppShell';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

const requesterUser = {
  id: 1,
  name: 'Requester One',
  email: 'requester1@toktickit.local',
  role: 'REQUESTER',
  isActive: true,
  mustChangePassword: false
};

describe('TokTickIT auth app shell (Lab 3 regression)', () => {
  beforeEach(() => {
    // BrowserRouter shares window history across tests in this file.
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the login screen when unauthenticated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ error: { code: 'UNAUTHENTICATED' } }, false, 401)))
    );

    render(<AppShell />);

    expect(await screen.findByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows the authenticated shell with name, role, and logout (no requester selector)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('/api/auth/me')) {
          return Promise.resolve(jsonResponse({ user: requesterUser }));
        }
        return Promise.resolve(jsonResponse({ tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }));
      })
    );

    render(<AppShell />);

    expect(await screen.findByText(/signed in as/i)).toBeInTheDocument();
    expect(screen.getByText('REQUESTER')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.queryByText(/change requester/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/development requester/i)).not.toBeInTheDocument();
  });

  it('forces password change before the app', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ user: { ...requesterUser, mustChangePassword: true } })))
    );

    render(<AppShell />);

    expect(await screen.findByRole('heading', { name: /change your password/i })).toBeInTheDocument();
    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
  });

  it('logs out back to the login screen', async () => {
    const fetchMock = vi.fn((url: string, init?: { method?: string }) => {
      if (String(url).includes('/api/auth/logout')) {
        return Promise.resolve({ ok: true, status: 204, json: async () => ({}) });
      }
      if (String(url).includes('/api/auth/me') && init?.method !== 'POST') {
        return Promise.resolve(jsonResponse({ user: requesterUser }));
      }
      return Promise.resolve(jsonResponse({ tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<AppShell />);
    await screen.findByText(/signed in as/i);

    // Subsequent /me calls now report anonymous.
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve(jsonResponse({ error: { code: 'UNAUTHENTICATED' } }, false, 401));
      }
      return Promise.resolve({ ok: true, status: 204, json: async () => ({}) });
    });

    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(await screen.findByLabelText(/email address/i)).toBeInTheDocument();
  });
});
