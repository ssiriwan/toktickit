import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const thisDir = dirname(fileURLToPath(import.meta.url));
const clientRoot = resolve(thisDir, '../..');

describe('Lab 4 Zen Green theme (UI-07)', () => {
  it('theme.css exposes action-status badges and readonly tokens', () => {
    const css = readFileSync(resolve(clientRoot, 'src/lab-02/theme.css'), 'utf-8');
    expect(css).toMatch(/--zen-primary/);
    expect(css).toMatch(/badge-action-PENDING|badge-action-IN_PROGRESS|badge-action-COMPLETED|badge-action-CANCELLED/);
    expect(css).toMatch(/zen-readonly|required-star/);
  });

  it('badges, readonly, and validation placement are referenced by Lab 4 components', async () => {
    const actions = readFileSync(resolve(clientRoot, 'src/lab-04/ActionsTakenList.tsx'), 'utf-8');
    expect(actions).toMatch(/badge-action-/);
    expect(actions).toMatch(/aria-required|aria-invalid/);
    expect(actions).toMatch(/role="alert"|role='alert'/);
    const dashboards = readFileSync(resolve(clientRoot, 'src/lab-04/StaffDashboard.tsx'), 'utf-8');
    expect(dashboards).toMatch(/Welcome back/);
    const requester = readFileSync(resolve(clientRoot, 'src/lab-04/RequesterDashboard.tsx'), 'utf-8');
    expect(requester).toMatch(/Welcome back/);
  });
});
