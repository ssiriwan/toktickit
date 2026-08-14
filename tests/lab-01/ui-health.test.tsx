import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../client/src/App';

const categoriesJson = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
  { id: 3, name: 'Software' },
  { id: 4, name: 'Network' }
];

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

describe('TokTickIT health check UI', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loading state while the request is in flight, then the online status', async () => {
    let resolveHealth: (value: unknown) => void;
    const healthPending = new Promise((resolve) => {
      resolveHealth = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/health')) {
        return healthPending;
      }
      return Promise.resolve(jsonResponse(categoriesJson));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Check System/i }));

    expect(screen.getByText(/checking system/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain('/api/health');

    resolveHealth!(jsonResponse({ status: 'ok', service: 'TokTickIT API' }));

    expect(
      await screen.findByText(/System Status: Online/i)
    ).toBeInTheDocument();
  });

  it('shows a useful error message when the backend is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Check System/i }));

    expect(
      await screen.findByText(/unable to reach the backend/i)
    ).toBeInTheDocument();
  });
});
