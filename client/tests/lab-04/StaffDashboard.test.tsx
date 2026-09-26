import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StaffDashboard } from '../../src/lab-04/StaffDashboard';

const staffPayload = {
  metrics: {
    newCount: 2, openCount: 3, inProgressCount: 4, waitingForRequesterCount: 1,
    myAssignedCount: 5, unassignedCount: 6, urgentCount: 2
  },
  recentTickets: [
    {
      id: 14, ticketNumber: 'TK-20260922-0014', summary: 'Laptop battery drains quickly',
      currentStatus: 'IN_PROGRESS', itPriority: 'HIGH', updatedAt: '2026-09-22T09:14:00.000Z',
      owner: { id: 2, name: 'Michael Staff' }
    }
  ]
};

const adminPayload = {
  ...staffPayload,
  userSummary: { totalUsers: 12, activeRequesters: 5, activeStaff: 4, activeAdmins: 2, inactiveUsers: 1 }
};

function stubDashboard(response: object, calls: string[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      calls.push(String(url));
      return Promise.resolve({ ok: true, status: 200, json: async () => response });
    })
  );
}

function renderDash(role: 'IT_STAFF' | 'ADMINISTRATOR' = 'IT_STAFF') {
  return render(
    <MemoryRouter>
      <StaffDashboard userName="IT Alice" role={role} />
    </MemoryRouter>
  );
}

describe('Lab 4 StaffDashboard (UI-04)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders 7 metric cards with values and queue drill-down links', async () => {
    stubDashboard(staffPayload, []);
    renderDash();

    expect(await screen.findByText(/welcome back, it alice!/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2 new/i })).toHaveAttribute('href', '/staff/queue?status=NEW');
    expect(screen.getByRole('link', { name: /3 open/i })).toHaveAttribute('href', '/staff/queue?status=OPEN');
    expect(screen.getByRole('link', { name: /my assigned/i })).toHaveAttribute('href', '/staff/queue?owner=me');
    expect(screen.getByRole('link', { name: /unassigned/i })).toHaveAttribute(
      'href',
      '/staff/queue?owner=unassigned'
    );
    expect(screen.getByRole('link', { name: /urgent/i })).toHaveAttribute('href', '/staff/queue?itPriority=URGENT');
    expect(screen.getByRole('link', { name: /^my queue$/i })).toHaveAttribute('href', '/staff/queue?owner=me');
    expect(screen.getByRole('link', { name: /search tickets/i })).toHaveAttribute('href', '/staff/queue');
    expect(screen.queryByText(/user summary/i)).not.toBeInTheDocument();
  });

  it('refresh refetches and admin sees the user summary strip', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    stubDashboard(adminPayload, calls);
    renderDash('ADMINISTRATOR');

    await screen.findByText(/welcome back, it alice!/i);
    expect(screen.getByText(/user summary/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin users/i })).toHaveAttribute('href', '/admin/users');

    const before = calls.filter((u) => u.includes('/api/admin/dashboard')).length;
    await user.click(screen.getByRole('button', { name: /refresh/i }));
    expect(calls.filter((u) => u.includes('/api/admin/dashboard')).length).toBe(before + 1);
  });

  it('lists recent tickets linking to staff detail', async () => {
    stubDashboard(staffPayload, []);
    renderDash();

    const recent = await screen.findByRole('link', { name: /laptop battery drains quickly/i });
    expect(recent).toHaveAttribute('href', '/staff/tickets/14');
  });
});
