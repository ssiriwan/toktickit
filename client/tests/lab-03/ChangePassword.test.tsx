import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../src/lab-03/AuthContext';
import { ChangePassword } from '../../src/lab-03/ChangePassword';

function renderChangePassword(onChanged = vi.fn()) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ChangePassword onChanged={onChanged} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Lab 3 ChangePassword (UI-02)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the rule checklist and blocks submit until valid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 401, json: async () => ({}) }))
    );
    renderChangePassword();
    expect(await screen.findByText(/be at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/current.*password/i), 'Requester123!');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'Newpass123!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'Newpass123!');
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('warns on confirmation mismatch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 401, json: async () => ({}) }))
    );
    renderChangePassword();
    await userEvent.type(screen.getByLabelText(/^new password/i), 'Newpass123!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'Different123!');
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('submits and reports success', async () => {
    const user = { id: 1, name: 'R', email: 'r@toktickit.local', role: 'REQUESTER', isActive: true, mustChangePassword: false };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('/api/auth/change-password')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ user }) });
        }
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      })
    );
    const onChanged = vi.fn();
    renderChangePassword(onChanged);
    await userEvent.type(screen.getByLabelText(/current.*password/i), 'Requester123!');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'Newpass123!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'Newpass123!');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onChanged).toHaveBeenCalled();
  });

  it('shows safe failure from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('/api/auth/change-password')) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } })
          });
        }
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      })
    );
    renderChangePassword();
    await userEvent.type(screen.getByLabelText(/current.*password/i), 'Wrong123!');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'Newpass123!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'Newpass123!');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument();
  });
});
