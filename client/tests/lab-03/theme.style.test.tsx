import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const thisDir = dirname(fileURLToPath(import.meta.url));
const clientRoot = resolve(thisDir, '../..');

describe('Lab 3 Zen Green theme (STYLE-02/UI-06)', () => {
  it('theme.css exposes badge and readonly tokens', () => {
    const css = readFileSync(resolve(clientRoot, 'src/lab-02/theme.css'), 'utf-8');
    expect(css).toMatch(/--zen-/);
    expect(css).toMatch(/badge-priority|badge-status/);
    expect(css).toMatch(/zen-readonly|required-star/);
  });

  it('badges and readonly classes are referenced by Lab 3 components', async () => {
    const queue = readFileSync(resolve(clientRoot, 'src/lab-03/StaffTicketDetail.tsx'), 'utf-8');
    expect(queue).toMatch(/badge-priority|badge-status/);
    expect(queue).toMatch(/zen-readonly/);
  });
});
