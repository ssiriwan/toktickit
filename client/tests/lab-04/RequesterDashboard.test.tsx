import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequesterDashboard } from '../../src/lab-04/RequesterDashboard';

const payload = {
  metrics: { totalOpen: 3, waitingForRequester: 1, recentlyUpdated: 2, recentlyResolved: 1, closed: 4 },
  recentTickets: [
    {
      id: 14, ticketNumber: 'TK-20260922-0014', summary: 'Laptop battery drains quickly',
      currentStatus: 'IN_PROGRESS', requestedPriority: 'HIGH', updatedAt: '2026-09-22T09:14:00.000Z'
    }
  ]
};

function stubDashboard(response: object | null, calls: string[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      calls.push(String(url));
      if (response === null) {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => response });
    })
  );
}

function renderDash() {
  return render(
    <MemoryRouter>
      <RequesterDashboard userName="Requester One" />
    </MemoryRouter>
  );
}

describe('Lab 4 RequesterDashboard (UI-03)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders 5 metric cards with values and drill-down links', async () => {
    stubDashboard(payload, []);
    renderDash();

    expect(await screen.findByText(/welcome back, requester one!/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    const waiting = screen.getByRole('link', { name: /waiting for requester/i });
    expect(waiting).toHaveAttribute('href', '/tickets?status=WAITING_FOR_REQUESTER');
    expect(screen.getByRole('link', { name: /recently updated/i })).toHaveAttribute(
      'href',
      '/tickets?sort=updatedAt&order=desc'
    );
    expect(screen.getByRole('link', { name: /recently resolved/i })).toHaveAttribute(
      'href',
      '/tickets?status=RESOLVED'
    );
    expect(screen.getByRole('link', { name: /closed/i })).toHaveAttribute('href', '/tickets?status=CLOSED');
    expect(screen.getByRole('link', { name: /my open tickets/i })).toHaveAttribute('href', '/tickets');
  });

  it('lists recent tickets linking to detail and offers quick actions', async () => {
    stubDashboard(payload, []);
    renderDash();

    const recent = await screen.findByRole('link', { name: /laptop battery drains quickly/i });
    expect(recent).toHaveAttribute('href', '/tickets/14');
    expect(screen.getByRole('link', { name: /create ticket/i })).toHaveAttribute('href', '/create');
    expect(screen.getByRole('link', { name: /view my tickets/i })).toHaveAttribute('href', '/tickets');
  });

  it('shows error with retry that refetches', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    stubDashboard(null, calls);
    renderDash();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(calls.filter((u) => u.includes('/api/requester/dashboard')).length).toBeGreaterThanOrEqual(2);
  });
});
