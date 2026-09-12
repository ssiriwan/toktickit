import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StaffTicketQueue } from '../../src/lab-03/StaffTicketQueue';

const rows = [
  {
    id: 1,
    ticketNumber: 'TK-20260910-0001',
    summary: 'Laptop battery drains quickly',
    currentStatus: 'IN_PROGRESS',
    requestedPriority: 'MEDIUM',
    itPriority: 'HIGH',
    ticketDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: { id: 2, name: 'Hardware' },
    relatedSystem: { id: 7, name: 'Corporate Laptop' },
    owner: { id: 3, name: 'IT Alice' }
  },
  {
    id: 2,
    ticketNumber: 'TK-20260910-0002',
    summary: 'Cannot connect to VPN',
    currentStatus: 'OPEN',
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    ticketDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: { id: 4, name: 'Network' },
    relatedSystem: { id: 3, name: 'VPN' },
    owner: null
  }
];

function mockQueue(tickets: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (String(url).includes('/api/staff/tickets')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            tickets,
            pagination: { page: 1, pageSize: 10, totalItems: tickets.length, totalPages: 1 }
          })
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    })
  );
}

describe('Lab 3 StaffTicketQueue (UI-03)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders rows with badges and an open action', async () => {
    const onOpen = vi.fn();
    mockQueue(rows);
    render(<StaffTicketQueue readOnly={false} onOpenTicket={onOpen} />);

    expect(await screen.findAllByText('TK-20260910-0001')).not.toHaveLength(0);
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThanOrEqual(1);
    const openButtons = screen.getAllByRole('button', { name: 'Open' });
    await userEvent.click(openButtons[0]);
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it('shows read-only tag for administrators', async () => {
    mockQueue(rows);
    render(<StaffTicketQueue readOnly onOpenTicket={() => {}} />);
    expect(await screen.findByText('Read-only')).toBeInTheDocument();
  });

  it('shows empty and no-results states', async () => {
    mockQueue([]);
    render(<StaffTicketQueue readOnly={false} onOpenTicket={() => {}} />);
    expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument();
  });

  it('shows forbidden card on 401/403', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('/api/staff/tickets')) {
          return Promise.resolve({ ok: false, status: 403, json: async () => ({}) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      })
    );
    render(<StaffTicketQueue readOnly={false} onOpenTicket={() => {}} />);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('exposes search, filters, sort, and pagination controls', async () => {
    mockQueue(rows);
    render(<StaffTicketQueue readOnly={false} onOpenTicket={() => {}} />);
    await screen.findAllByText('TK-20260910-0001');

    expect(screen.getByLabelText(/search queue/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Owner')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    expect(screen.getByLabelText('Page size')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });
});
