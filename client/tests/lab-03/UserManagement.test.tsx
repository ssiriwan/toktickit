import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UserManagement } from '../../src/lab-03/UserManagement';

const adminRow = {
  id: 5, name: 'Admin One', email: 'admin1@toktickit.local', role: 'ADMINISTRATOR',
  isActive: true, mustChangePassword: false, createdAt: '2026-09-10T00:00:00.000Z'
};
const reqRow = {
  id: 7, name: 'Req One', email: 'requester1@toktickit.local', role: 'REQUESTER',
  isActive: true, mustChangePassword: false, createdAt: '2026-09-10T00:00:00.000Z'
};

function mockApi(impl: (url: string, init?: RequestInit) => unknown) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

function okList(users: unknown[]) {
  return { ok: true, status: 200, json: async () => ({ users }) };
}

function renderMgmt(currentUserId = 5) {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route path="/admin/users" element={<UserManagement currentUserId={currentUserId} />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Lab 3 UserManagement (UI-05)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders table with Email column, search and role filter', async () => {
    mockApi((url) =>
      String(url).includes('/api/admin/users') ? Promise.resolve(okList([adminRow, reqRow])) : Promise.reject(new Error('unexpected ' + url))
    );
    renderMgmt();

    expect((await screen.findAllByText('admin1@toktickit.local')).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText('requester1@toktickit.local')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    // Email is its own column header per ui-spec.
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
  });

  it('searches only after the magnifier button is pressed', async () => {
    const calls: string[] = [];
    mockApi((url) => {
      calls.push(String(url));
      return Promise.resolve(okList([adminRow]));
    });
    renderMgmt();
    await screen.findAllByText('admin1@toktickit.local');

    await userEvent.type(screen.getByPlaceholderText(/search users/i), 'req');
    expect(calls.filter((c) => c.includes('search=')).length).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: /search users/i }));
    await vi.waitFor(() => {
      expect(calls.some((c) => c.includes('search=req'))).toBe(true);
    });
  });

  it('creates a user through the drawer and reloads the list', async () => {
    mockApi((url, init) => {
      if (String(url).includes('/api/admin/users') && (!init || !init.method || init.method === 'GET')) {
        return Promise.resolve(okList([adminRow]));
      }
      if (String(url).endsWith('/api/admin/users') && init?.method === 'POST') {
        return Promise.resolve({ ok: true, status: 201, json: async () => ({ ...reqRow, id: 21 }) });
      }
      return Promise.reject(new Error('unexpected ' + url));
    });
    renderMgmt();
    await screen.findAllByText('admin1@toktickit.local');

    await userEvent.click(screen.getByRole('button', { name: /create user/i }));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Req Two');
    await userEvent.type(screen.getByLabelText(/email address/i), 'req2@toktickit.local');
    await userEvent.selectOptions(screen.getByLabelText(/user role/i), 'REQUESTER');
    await userEvent.type(screen.getByLabelText(/initial password/i), 'Requester123!');
    await userEvent.click(screen.getByRole('button', { name: /save user/i }));

    expect(await screen.findByText(/user created/i)).toBeInTheDocument();
  });

  it('shows a field error for duplicate email', async () => {
    mockApi((url, init) => {
      if (String(url).includes('/api/admin/users') && (!init || !init.method || init.method === 'GET')) {
        return Promise.resolve(okList([adminRow]));
      }
      return Promise.resolve({
        ok: false, status: 409,
        json: async () => ({ error: { code: 'DUPLICATE_EMAIL', message: 'Email is already in use', details: [{ field: 'email', message: 'Email is already in use' }] } })
      });
    });
    renderMgmt();
    await screen.findAllByText('admin1@toktickit.local');

    await userEvent.click(screen.getByRole('button', { name: /create user/i }));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Clone');
    await userEvent.type(screen.getByLabelText(/email address/i), 'admin1@toktickit.local');
    await userEvent.selectOptions(screen.getByLabelText(/user role/i), 'REQUESTER');
    await userEvent.type(screen.getByLabelText(/initial password/i), 'Requester123!');
    await userEvent.click(screen.getByRole('button', { name: /save user/i }));

    // Duplicate surfaces both as a banner and as a field-level error.
    expect(await screen.findByRole('alert')).toHaveTextContent('Email is already in use');
    expect(screen.getByLabelText(/email address/i)).toHaveClass('is-invalid');
  });

  it('disables deactivate on the own row with a tooltip', async () => {
    mockApi(() => Promise.resolve(okList([adminRow, reqRow])));
    renderMgmt(5);
    await screen.findAllByText('admin1@toktickit.local');

    await userEvent.click(screen.getByRole('button', { name: /edit admin one/i }));
    const deactivate = screen.getByRole('button', { name: /deactivate/i });
    expect(deactivate).toBeDisabled();
    expect(deactivate).toHaveAttribute('title', expect.stringMatching(/own account/i));
  });

  it('renders the forbidden card for non-admin and redirects to login on 401', async () => {
    mockApi(() => Promise.resolve({ ok: false, status: 403, json: async () => ({ error: { code: 'FORBIDDEN', message: 'Access denied' } }) }));
    renderMgmt();
    expect(await screen.findByText(/you do not have access/i)).toBeInTheDocument();
  });

  it('redirects to login on 401', async () => {
    mockApi(() => Promise.resolve({ ok: false, status: 401, json: async () => ({}) }));
    renderMgmt();
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
