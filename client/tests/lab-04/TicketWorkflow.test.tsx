import { render, screen, waitFor } from '@testing-library/react';
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
  updatedAt: '2026-09-20T10:00:00.000Z',
  requester: { id: 7, name: 'Requester One', email: 'requester1@toktickit.local' },
  owner: { id: 3, name: 'IT Alice' },
  category: { id: 2, name: 'Hardware' },
  relatedSystem: { id: 7, name: 'Corporate Laptop' },
  publicComments: [],
  internalNotes: [],
  attachments: []
};

type FetchCall = { url: string; options?: { method?: string; body?: string } };

function stubDetail(calls: FetchCall[], actions: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: { method?: string; body?: string }) => {
      calls.push({ url: String(url), options });
      const u = String(url);
      if (u.endsWith('/api/staff/tickets/1/actions')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => actions });
      }
      if (u.endsWith('/api/staff/users')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [{ id: 3, name: 'IT Alice' }] });
      }
      if (u.endsWith('/api/staff/tickets/1')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ticket });
      }
      if (u.endsWith('/api/staff/tickets/1/status') && options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 1, currentStatus: 'RESOLVED', updatedAt: '2026-09-21T10:00:00.000Z' }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    })
  );
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/staff/tickets/1']}>
      <Routes>
        <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Lab 4 TicketWorkflow (UI-05/06)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('UI-05: status control lists only matrix-allowed targets', async () => {
    stubDetail([], []);
    renderDetail();
    await screen.findByText('TK-20260910-0001');

    const select = screen.getByLabelText('Current Status') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    // IN_PROGRESS → WAITING_FOR_REQUESTER, RESOLVED, CANCELLED (+ current).
    expect(values).toEqual(expect.arrayContaining(['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED']));
    expect(values).not.toContain('NEW');
    expect(values).not.toContain('OPEN');
    expect(values).not.toContain('CLOSED');
    expect(values).not.toContain('REOPENED');
  });

  it('UI-06: gate warning blocks RESOLVED without a Completed action (no PATCH sent)', async () => {
    const user = userEvent.setup();
    const calls: FetchCall[] = [];
    stubDetail(calls, []);
    renderDetail();
    await screen.findByText('TK-20260910-0001');

    await user.selectOptions(screen.getByLabelText('Current Status'), 'RESOLVED');
    expect(await screen.findByText(/resolution gate/i)).toBeInTheDocument();
    expect(calls.filter((c) => c.options?.method === 'PATCH')).toHaveLength(0);
  });

  it('UI-06b: stale 409 renders the refresh-and-retry banner', async () => {
    const user = userEvent.setup();
    const calls: FetchCall[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: { method?: string; body?: string }) => {
        calls.push({ url: String(url), options });
        const u = String(url);
        if (u.endsWith('/api/staff/tickets/1/actions')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [] });
        }
        if (u.endsWith('/api/staff/users')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [] });
        }
        if (u.endsWith('/api/staff/tickets/1')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ticket });
        }
        if (u.endsWith('/api/staff/tickets/1/status') && options?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: async () => ({ error: { code: 'STALE_UPDATE', message: 'Ticket was updated by someone else.' } })
});
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      })
    );
    renderDetail();
    await screen.findByText('TK-20260910-0001');

    await user.selectOptions(screen.getByLabelText('Current Status'), 'CANCELLED');
    // Confirm dialog appears for CANCELLED; confirm to send the PATCH.
    await user.click(await screen.findByRole('button', { name: /confirm cancel/i }));
    expect(await screen.findByText(/updated elsewhere|refresh and retry/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(calls.filter((c) => c.options?.method === 'PATCH')).toHaveLength(1);
    });
  });
  it('UI-06c: completing an action refreshes the gate — RESOLVED then sends PATCH', async () => {
    const user = userEvent.setup();
    const calls: FetchCall[] = [];
    let actionRows: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: { method?: string; body?: string }) => {
        calls.push({ url: String(url), options });
        const u = String(url);
        if (u.endsWith('/api/staff/tickets/1/actions') && (!options?.method || options.method === 'GET')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => actionRows });
        }
        if (u.endsWith('/api/staff/tickets/1/actions') && options?.method === 'POST') {
          const body = JSON.parse(options.body ?? '{}') as Record<string, unknown>;
          const created = { id: 11, ticketId: 1, performedBy: { id: 3, name: 'IT Alice', role: 'IT_STAFF' }, ...body };
          actionRows = [created];
          return Promise.resolve({ ok: true, status: 201, json: async () => created });
        }
        if (u.endsWith('/api/staff/users')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [{ id: 3, name: 'IT Alice' }] });
        }
        if (u.endsWith('/api/auth/me')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: { id: 3 } }) });
        }
        if (u.endsWith('/api/staff/tickets/1')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ticket });
        }
        if (u.endsWith('/api/staff/tickets/1/status') && options?.method === 'PATCH') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 1, currentStatus: 'RESOLVED', updatedAt: '2026-09-21T10:00:00.000Z' }) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      })
    );
    renderDetail();
    await screen.findByText('TK-20260910-0001');

    // Gate blocks first (no actions yet).
    await user.selectOptions(screen.getByLabelText('Current Status'), 'RESOLVED');
    expect(await screen.findByText(/resolution gate/i)).toBeInTheDocument();

    // Complete an action through the child form…
    await user.click(screen.getByRole('button', { name: /add action taken/i }));
    await user.type(screen.getByLabelText(/description/i), 'Fixed it');
    await user.selectOptions(screen.getByLabelText('Status'), 'COMPLETED');
    await user.type(screen.getByLabelText(/^result/i), 'Works now');
    await user.click(screen.getByRole('button', { name: /^save action$/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // …gate is refreshed: RESOLVED now sends the PATCH.
    await user.selectOptions(screen.getByLabelText('Current Status'), 'RESOLVED');
    await waitFor(() => {
      expect(calls.filter((c) => c.url.endsWith('/api/staff/tickets/1/status') && c.options?.method === 'PATCH')).toHaveLength(1);
    });
    expect(screen.queryByText(/resolution gate/i)).not.toBeInTheDocument();
  });
});
