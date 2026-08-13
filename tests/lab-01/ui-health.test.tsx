import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../client/src/App';

describe('TokTickIT health check UI', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loading state while the request is in flight, then the online status', async () => {
    let resolveRequest: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Check System/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/checking system/i);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/health')
    );

    resolveRequest!({
      ok: true,
      json: async () => ({ status: 'ok', service: 'TokTickIT API' })
    });

    expect(
      await screen.findByText(/System Status: Online/i)
    ).toBeInTheDocument();
  });

  it('shows a useful error message when the backend is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down'))
    );

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Check System/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /unable to reach the backend/i
    );
  });
});
