import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequesterSelection } from '../../client/src/lab-02/RequesterSelection';

const requestersJson = [
  { id: 1, name: 'Alice Carter', email: 'alice.carter@student.example' },
  { id: 2, name: 'Bob Nguyen', email: 'bob.nguyen@student.example' },
  { id: 3, name: 'Carol Martinez', email: 'carol.martinez@student.example' },
  { id: 4, name: 'David Kim', email: 'david.kim@student.example' }
];

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function renderSelection() {
  const onContinue = vi.fn();
  render(<RequesterSelection onContinue={onContinue} />);
  return { onContinue };
}

describe('TokTickIT Requester Selection screen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a dropdown with active requesters from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(requestersJson)))
    );

    renderSelection();

    const select = await screen.findByLabelText(/development requester/i);
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toContain('Alice Carter');
    expect(options.map((o) => o.textContent)).toContain('David Kim');
  });

  it('does not enable Continue until a requester is selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(requestersJson)))
    );

    const { onContinue } = renderSelection();

    const continueButton = await screen.findByRole('button', {
      name: /continue/i
    });
    expect(continueButton).toBeDisabled();

    await userEvent.selectOptions(
      screen.getByLabelText(/development requester/i),
      '2'
    );
    expect(continueButton).toBeEnabled();

    await userEvent.click(continueButton);
    expect(onContinue).toHaveBeenCalled();
  });

  it('shows an empty state message when no active requesters exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse([])))
    );

    renderSelection();

    expect(
      await screen.findByText(/no active requesters found/i)
    ).toBeInTheDocument();
  });

  it('shows an error state with retry when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ message: 'boom' }, false)))
    );

    renderSelection();

    expect(
      await screen.findByText(/unable to load requesters/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /retry/i })
    ).toBeInTheDocument();
  });
});