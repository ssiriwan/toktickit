import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MyTickets } from '../../client/src/lab-02/MyTickets';
import type { Requester } from '../../client/src/lab-02/RequesterSelection';

const requester: Requester = { id: 1, name: 'Alice Carter', email: 'alice.carter@student.example' };

const tickets = [
  {
    id: 1,
    ticketNumber: 'TK-20260904-0001',
    summary: 'Laptop battery issue',
    currentStatus: 'NEW',
    requestedPriority: 'MEDIUM',
    ticketDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: { id: 2, name: 'Hardware' },
    relatedSystem: { id: 7, name: 'Corporate Laptop' }
  },
  {
    id: 2,
    ticketNumber: 'TK-20260904-0002',
    summary: 'VPN not working',
    currentStatus: 'NEW',
    requestedPriority: 'HIGH',
    ticketDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: { id: 1, name: 'Account and Access' },
    relatedSystem: { id: 3, name: 'VPN' }
  }
];

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function mockFetchFor(body: unknown) {
  return vi.fn(() => Promise.resolve(jsonResponse({ tickets: body, pagination: { page: 1, pageSize: 10, totalItems: (body as unknown[]).length, totalPages: 1 } })));
}

describe('TokTickIT My Tickets screen', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows loading state while fetching', async () => {
    let resolve: (v: unknown) => void;
    const pending = new Promise((r) => (resolve = r));
    vi.stubGlobal('fetch', vi.fn(() => pending));
    render(<MyTickets requester={requester} />);
    expect(await screen.findByText(/loading tickets/i)).toBeInTheDocument();
    resolve!(jsonResponse({ tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }));
  });

  it('renders ticket list', async () => {
    vi.stubGlobal('fetch', mockFetchFor(tickets));
    render(<MyTickets requester={requester} />);
    expect(await screen.findByText(/TK-20260904-0001/)).toBeInTheDocument();
    expect(screen.getByText(/VPN not working/)).toBeInTheDocument();
  });

  it('filters via search input', async () => {
    vi.stubGlobal('fetch', mockFetchFor(tickets));
    render(<MyTickets requester={requester} />);
    await screen.findByText(/Laptop battery issue/);
    const search = screen.getByPlaceholderText(/search tickets/i);
    await userEvent.type(search, 'VPN');
    expect(search).toHaveValue('VPN');
  });

  it('shows empty state when no tickets', async () => {
    vi.stubGlobal('fetch', mockFetchFor([]));
    render(<MyTickets requester={requester} />);
    expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse({ message: 'boom' }, false))));
    render(<MyTickets requester={requester} />);
    expect(await screen.findByText(/unable to load tickets/i)).toBeInTheDocument();
  });
});