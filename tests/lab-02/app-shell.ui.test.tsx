import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '../../client/src/lab-02/AppShell';

const requestersJson = [
  { id: 1, name: 'Alice Carter', email: 'alice.carter@student.example' },
  { id: 2, name: 'Bob Nguyen', email: 'bob.nguyen@student.example' }
];

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

describe('TokTickIT requester context app shell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores the selected requester and offers a change option', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(requestersJson)))
    );

    render(<AppShell />);

    const select = await screen.findByLabelText(/development requester/i);
    await userEvent.selectOptions(select, '1');
    await userEvent.click(
      screen.getByRole('button', { name: /continue/i })
    );

    expect(
      screen.getByText(/signed in as/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/alice carter/i).length
    ).toBeGreaterThanOrEqual(1);

    await userEvent.click(
      screen.getByRole('button', { name: /change requester/i })
    );
    expect(
      screen.getByLabelText(/development requester/i)
    ).toBeInTheDocument();
  });
});