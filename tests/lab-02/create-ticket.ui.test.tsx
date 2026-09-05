import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateTicket } from '../../client/src/lab-02/CreateTicket';
import type { Requester } from '../../client/src/lab-02/RequesterSelection';

const requester: Requester = {
  id: 1,
  name: 'Alice Carter',
  email: 'alice.carter@student.example'
};

const categories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
  { id: 3, name: 'Software' },
  { id: 4, name: 'Network' }
];

const systems = [
  { id: 1, name: 'Email' },
  { id: 7, name: 'Corporate Laptop' }
];

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function defaultFetch() {
  return vi.fn((url: string) => {
    if (url.includes('/api/categories')) {
      return Promise.resolve(jsonResponse(categories));
    }
    if (url.includes('/api/related-systems')) {
      return Promise.resolve(jsonResponse(systems));
    }
    return Promise.resolve(jsonResponse({}, false));
  });
}

function renderForm(
  fetchMock: ReturnType<typeof defaultFetch> = defaultFetch()
) {
  vi.stubGlobal('fetch', fetchMock);
  render(<CreateTicket requester={requester} />);
  return fetchMock;
}

describe('TokTickIT Create Ticket screen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders all required fields with correct labels', async () => {
    renderForm();

    expect(
      await screen.findByRole('combobox', { name: /category/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /related system/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /requested priority/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('loads categories into the dropdown from the API', async () => {
    renderForm();

    const categorySelect = await screen.findByRole('combobox', {
      name: /category/i
    });
    const options = Array.from(categorySelect.querySelectorAll('option')).map(
      (o) => o.textContent
    );
    expect(options).toContain('Hardware');
    expect(options).toContain('Network');
  });

  it('shows the requester name as a read-only value', async () => {
    renderForm();

    expect(screen.getByText(/alice carter/i)).toBeInTheDocument();
  });

  it('reveals field-level validation errors on an empty submit', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return Promise.resolve(jsonResponse({}, false));
      if (url.includes('/api/categories')) {
        return Promise.resolve(jsonResponse(categories));
      }
      if (url.includes('/api/related-systems')) {
        return Promise.resolve(jsonResponse(systems));
      }
      return Promise.resolve(jsonResponse({}, false));
    });
    renderForm(fetchMock);

    await userEvent.click(
      await screen.findByRole('button', { name: /submit ticket/i })
    );

    expect(await screen.findByText(/summary is required/i)).toBeInTheDocument();
    expect(screen.getByText(/category is required/i)).toBeInTheDocument();
  });

  it('does not show a success state when submission fails', async () => {
    const fetchMock = renderForm();
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ error: { message: 'boom' } }, false))
    );

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: /category/i }),
      '2'
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /related system/i }),
      '1'
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /requested priority/i }),
      'HIGH'
    );
    await userEvent.type(screen.getByLabelText(/summary/i), 'Battery issue');
    await userEvent.type(
      screen.getByLabelText(/description/i),
      'Needs a replacement'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /submit ticket/i })
    );

    expect(await screen.findByText(/unable to create ticket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/summary/i)).toHaveValue('Battery issue');
  });

  it('allows selecting a file and uploads it sequentially after ticket creation', async () => {
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/categories')) return Promise.resolve(jsonResponse(categories));
      if (url.includes('/api/related-systems')) return Promise.resolve(jsonResponse(systems));
      if (url.includes('/api/tickets') && init?.method === 'POST') {
        if (url.includes('/attachments')) {
          return Promise.resolve(jsonResponse({ id: 1, filename: 'test.png', isRemoved: false }));
        }
        return Promise.resolve(jsonResponse({ id: 10, ticketNumber: 'TK-20260904-0001' }));
      }
      return Promise.resolve(jsonResponse({}, false));
    });
    renderForm(fetchMock);
    await screen.findByRole('combobox', { name: /category/i });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /category/i }), '2');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /related system/i }), '1');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /requested priority/i }), 'HIGH');
    await userEvent.type(screen.getByLabelText(/summary/i), 'Battery issue');
    await userEvent.type(screen.getByLabelText(/description/i), 'Needs a replacement');
    const fileInput = screen.getByTestId('create-file-input') as HTMLInputElement;
    await userEvent.upload(fileInput, file);
    expect(await screen.findByText(/test.png/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /submit ticket/i }));
    expect(await screen.findByText(/Ticket created successfully/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/tickets'), expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/attachments'), expect.anything());
  });
});