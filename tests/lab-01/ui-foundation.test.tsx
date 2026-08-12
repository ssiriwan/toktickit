import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../../client/src/App';

describe('TokTickIT frontend foundation', () => {
  it('renders the TokTickIT heading', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /TokTickIT IT Service Desk/i })
    ).toBeInTheDocument();
  });

  it('renders the Bootstrap-styled check system button', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /Check System/i })).toHaveClass(
      'btn',
      'btn-primary'
    );
  });
});
