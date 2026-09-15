import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StaffTicketDetail } from '../../src/lab-03/StaffTicketDetail';

const ticket = {
  id: 1,
  ticketNumber: 'TK-20260910-0001',
  summary: 'Laptop battery drains quickly',
  description: 'Battery drains fast.',
  currentStatus: 'IN_PROGRESS',
  requestedPriority: 'MEDIUM',
  itPriority: 'MEDIUM',
  appearsResolved: false,
  appearsResolvedAt: null,
  ticketDate: new Date().toISOString(),
  requester: { id: 7, name: 'Requester One', email: 'requester1@toktickit.local' },
  owner: { id: 3, name: 'IT Alice' },
  category: { id: 2, name: 'Hardware' },
  relatedSystem: { id: 7, name: 'Corporate Laptop' },
  publicComments: [
    { id: 10, body: 'Still broken.', createdAt: new Date().toISOString(), author: { id: 7, name: 'Requester One', role: 'REQUESTER' } }
  ],
  internalNotes: [
    { id: 20, body: 'Check background tasks.', createdAt: new Date().toISOString(), author: { id: 3, name: 'IT Alice', role: 'IT_STAFF' } }
  ],
  attachments: []
};

function mockDetail(overrides: Partial<typeof ticket> = {}) {
  const data = { ...ticket, ...overrides };
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (String(url).includes('/api/staff/tickets/')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => data });
      }
      if (String(url).includes('/api/admin/users')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ users: [{ id: 3, name: 'IT Alice' }, { id: 4, name: 'IT Bob' }] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    })
  );
}

function renderDetail(readOnly = false) {
  return render(
    <MemoryRouter initialEntries={['/staff/tickets/1']}>
      <Routes>
        <Route path="/staff/tickets/:id" element={<StaffTicketDetail readOnly={readOnly} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Lab 3 StaffTicketDetail (UI-04 + style)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows read-only vs editable styling and distinct comment/note areas', async () => {
    mockDetail();
    renderDetail(false);
    expect(await screen.findByText('TK-20260910-0001')).toBeInTheDocument();
    expect(screen.getByLabelText('IT Priority')).toBeInTheDocument();
    expect(screen.getByText(/private — it & admin only/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type your comment/i)).toBeInTheDocument();
  });

  it('shows appears-resolved banner', async () => {
    mockDetail({ appearsResolved: true, appearsResolvedAt: new Date().toISOString() });
    renderDetail(false);
    expect(await screen.findByText(/appears resolved/i)).toBeInTheDocument();
  });

  it('saves owner/priority/status with validation feedback', async () => {
    mockDetail();
    renderDetail(false);
    await screen.findByText('TK-20260910-0001');
    const fetchSpy = vi.mocked(globalThis.fetch) as unknown as ReturnType<typeof vi.fn>;
    fetchSpy.mockImplementation((url: string) => {
      if (String(url).includes('/api/tickets/1/owner')) {
        return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: { message: 'Owner must be an active IT Staff or Administrator' } }) });
      }
      if (String(url).includes('/api/staff/tickets/')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ticket });
      }
      if (String(url).includes('/api/admin/users')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ users: [] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save Owner' }));
    expect(await screen.findByText(/owner must be/i)).toBeInTheDocument();
  });

  it('is read-only for administrators', async () => {
    mockDetail();
    renderDetail(true);
    await screen.findByText('TK-20260910-0001');
    expect(screen.getByText('Read-only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Owner' })).not.toBeInTheDocument();
  });
});
