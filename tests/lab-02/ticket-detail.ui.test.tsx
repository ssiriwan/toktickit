import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TicketDetail } from '../../client/src/lab-02/TicketDetail';
import type { Requester } from '../../client/src/lab-02/RequesterSelection';

const requester: Requester = { id: 1, name: 'Alice Carter', email: 'alice.carter@student.example' };

const ticketData = {
  id: 1,
  ticketNumber: 'TK-20260904-0001',
  summary: 'Laptop battery issue',
  description: 'battery drains fast',
  currentStatus: 'NEW',
  requestedPriority: 'MEDIUM',
  ticketDate: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  requester: { id: 1, name: 'Alice Carter', email: 'alice.carter@student.example' },
  category: { id: 2, name: 'Hardware' },
  relatedSystem: { id: 7, name: 'Corporate Laptop' },
  attachments: [
    {
      id: 1,
      filename: 'screenshot.png',
      mimeType: 'image/png',
      fileSize: 1024,
      isRemoved: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      filename: 'old-photo.jpg',
      mimeType: 'image/jpeg',
      fileSize: 2048,
      isRemoved: true,
      removalReason: 'Wrong file',
      removedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ]
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body, blob: async () => new Blob(), header: {} as never };
}

describe('TokTickIT Ticket Detail', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows read-only fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ticketData } as never))
    );
    render(<TicketDetail ticketId={1} requester={requester} onBack={vi.fn()} />);
    expect(await screen.findByText(/Laptop battery issue/)).toBeInTheDocument();
    expect(screen.getByText(/Hardware/)).toBeInTheDocument();
    expect(screen.getByText(/Alice Carter/)).toBeInTheDocument();
  });

  it('shows attachment section with upload/download/remove', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ticketData } as never))
    );
    render(<TicketDetail ticketId={1} requester={requester} onBack={vi.fn()} />);
    expect(await screen.findByText(/Attachments/)).toBeInTheDocument();
    expect(screen.getByText(/Upload File/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument();
  });

  it('removed attachment shows metadata and download blocked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ticketData } as never))
    );
    render(<TicketDetail ticketId={1} requester={requester} onBack={vi.fn()} />);
    expect(await screen.findByText(/old-photo.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/Removed/)).toBeInTheDocument();
    expect(screen.getByText(/Reason: Wrong file/)).toBeInTheDocument();
    expect(screen.getByText(/Download blocked/)).toBeInTheDocument();
  });

  it('soft-remove requires reason', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/api/tickets/')) {
          return Promise.resolve({ ok: true, json: async () => ticketData } as never);
        }
        return Promise.resolve({ ok: false, json: async () => ({ error: { message: 'boom' } }) } as never);
      })
    );
    render(<TicketDetail ticketId={1} requester={requester} onBack={vi.fn()} />);
    await screen.findByText(/screenshot.png/);
    await userEvent.click(screen.getByRole('button', { name: /Remove/ }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm/ }));
    expect(await screen.findByText(/Reason is required/)).toBeInTheDocument();
  });

  it('validates file type on selection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ticketData } as never))
    );
    render(<TicketDetail ticketId={1} requester={requester} onBack={vi.fn()} />);
    await screen.findByText(/Attachments/);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['dummy'], 'bad.exe', { type: 'application/octet-stream' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText(/File type not allowed/)).toBeInTheDocument();
  });
});