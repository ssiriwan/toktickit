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

describe('TokTickIT category list UI', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loading state while categories are being requested', async () => {
    let resolveCategories: (value: unknown) => void;
    const categoriesPending = new Promise((resolve) => {
      resolveCategories = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve(
          jsonResponse({ status: 'ok', service: 'TokTickIT API' })
        );
      }
      return categoriesPending;
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Check System/i }));

    expect(
      await screen.findByText(/loading categories/i)
    ).toBeInTheDocument();

    resolveCategories!(jsonResponse(categoriesJson));

    expect(await screen.findByText(/Account and Access/i)).toBeInTheDocument();
  });

  it('displays the categories returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/health')) {
          return Promise.resolve(
            jsonResponse({ status: 'ok', service: 'TokTickIT API' })
          );
        }
        return Promise.resolve(jsonResponse(categoriesJson));
      })
    );

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Check System/i }));

    expect(
      await screen.findByText(/Supported Request Categories/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Account and Access/i)).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('shows an error message when the categories request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/health')) {
          return Promise.resolve(
            jsonResponse({ status: 'ok', service: 'TokTickIT API' })
          );
        }
        return Promise.resolve(jsonResponse({ message: 'boom' }, false));
      })
    );

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Check System/i }));

    expect(
      await screen.findByText(/unable to load categories/i)
    ).toBeInTheDocument();
  });
});
