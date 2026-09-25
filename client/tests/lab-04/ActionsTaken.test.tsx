import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionsTakenList } from '../../src/lab-04/ActionsTakenList';

const actions = [
  {
    id: 11,
    ticketId: 1,
    actionDateTime: '2026-09-20T10:00:00.000Z',
    description: 'Replaced faulty RAM stick',
    result: 'Memory test passed 100%',
    status: 'COMPLETED',
    performedBy: { id: 3, name: 'IT Alice', role: 'IT_STAFF' },
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: 'memtest_report.pdf',
    createdAt: '2026-09-20T10:05:00.000Z',
    updatedAt: '2026-09-20T10:30:00.000Z'
  },
  {
    id: 12,
    ticketId: 1,
    actionDateTime: '2026-09-21T10:00:00.000Z',
    description: 'Inspect network socket',
    result: null,
    status: 'IN_PROGRESS',
    performedBy: { id: 4, name: 'IT Bob', role: 'IT_STAFF' },
    followUpRequired: true,
    followUpNote: 'Order replacement wall plate',
    attachmentNotes: null,
    createdAt: '2026-09-21T10:05:00.000Z',
    updatedAt: '2026-09-21T10:05:00.000Z'
  }
];

const staffUsers = [
  { id: 3, name: 'IT Alice', role: 'IT_STAFF' },
  { id: 4, name: 'IT Bob', role: 'IT_STAFF' }
];

const me = { user: { id: 3, name: 'IT Alice', email: 'it1@toktickit.local', role: 'IT_STAFF' } };

type FetchCall = { url: string; options?: { method?: string; body?: string } };

function stubStaff(calls: FetchCall[], postImpl?: (body: Record<string, unknown>) => object) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: { method?: string; body?: string }) => {
      calls.push({ url: String(url), options });
      const u = String(url);
      if (u.endsWith('/api/auth/me')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => me });
      }
      if (u.endsWith('/api/staff/users')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => staffUsers });
      }
      if (u.endsWith('/api/staff/tickets/1/actions') && (!options?.method || options.method === 'GET')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => actions });
      }
      if (u.endsWith('/api/staff/tickets/1/actions') && options?.method === 'POST') {
        const body = JSON.parse(options.body ?? '{}') as Record<string, unknown>;
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => (postImpl ? postImpl(body) : { id: 13, ticketId: 1, ...body })
        });
      }
      if (/\/api\/staff\/tickets\/1\/actions\/\d+$/.test(u) && options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 12 }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    })
  );
}

describe('Lab 4 ActionsTaken (UI-01/02)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('UI-01: form validates client-side and double-submit sends one POST', async () => {
    const user = userEvent.setup();
    const calls: FetchCall[] = [];
    stubStaff(calls);
    render(<ActionsTakenList ticketId={1} mode="staff" />);
    expect(await screen.findByText('Replaced faulty RAM stick')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add action taken/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: /^save action$/i });

    // Empty description is blocked client-side with no POST.
    await user.click(save);
    expect(await screen.findByText(/description must not be empty/i)).toBeInTheDocument();
    expect(calls.filter((c) => c.options?.method === 'POST')).toHaveLength(0);

    // Follow-up without note is blocked client-side.
    await user.type(screen.getByLabelText(/description/i), 'Checked wall plate');
    await user.click(screen.getByLabelText(/follow-up required/i));
    await user.click(save);
    expect(await screen.findByText(/follow-up note is required/i)).toBeInTheDocument();
    expect(calls.filter((c) => c.options?.method === 'POST')).toHaveLength(0);

    // Valid form: rapid double-click still sends exactly one POST (debounced).
    await user.type(screen.getByLabelText(/follow-up note/i), 'Order a new plate');
    await user.dblClick(screen.getByRole('button', { name: /^save action$/i }));
    await waitFor(() => {
      expect(calls.filter((c) => c.options?.method === 'POST')).toHaveLength(1);
    });
    // Failed saves would keep the dialog open; success closes it.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('UI-02: requester sees actions read-only with no Add/Edit controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({ ok: true, status: 200, json: async () => (String(url).includes('/actions') ? actions : []) })
      )
    );
    render(<ActionsTakenList ticketId={1} mode="requester" />);

    expect(await screen.findByText('Replaced faulty RAM stick')).toBeInTheDocument();
    expect(screen.getByText('Inspect network socket')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add action taken/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark completed/i })).not.toBeInTheDocument();
  });
});
