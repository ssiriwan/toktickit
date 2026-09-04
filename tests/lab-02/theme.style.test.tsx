import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themePath = path.resolve(__dirname, '../../client/src/lab-02/theme.css');
const theme = fs.existsSync(themePath) ? fs.readFileSync(themePath, 'utf-8') : '';

describe('Zen Green Theme checklist (ui-spec §10)', () => {
  it('defines Zen Green tokens', () => {
    expect(theme).toContain('--zen-primary: #006B3C');
    expect(theme).toContain('--zen-page-bg: #F5F7F6');
    expect(theme).toContain('--zen-readonly-bg: #F0F3F1');
    expect(theme).toContain('--zen-warning-bg: #FEF3C7');
    expect(theme).toContain('--zen-success-bg: #DCFCE7');
  });

  it('has no pure black #000000', () => {
    expect(theme.toLowerCase()).not.toContain('#000000');
  });

  it('has distinct read-only styling', () => {
    expect(theme).toContain('.zen-readonly');
    expect(theme).toContain('var(--zen-readonly-bg)');
  });

  it('has required asterisk styling', () => {
    expect(theme).toContain('.required-star');
  });

  it('has validation and badge styles', () => {
    expect(theme).toContain('.badge-priority-LOW');
    expect(theme).toContain('.badge-priority-URGENT');
    expect(theme).toContain('var(--zen-error-border)');
  });

  it('has responsive breakpoints and touch targets', () => {
    expect(theme).toContain('@media (min-width: 768px) and (max-width: 991px)');
    expect(theme).toContain('@media (max-width: 767px)');
    expect(theme).toContain('min-height: 44px');
  });

  it('MyTickets and TicketDetail wire badge and readonly classes', () => {
    const myTickets = fs.readFileSync(path.resolve(__dirname, '../../client/src/lab-02/MyTickets.tsx'), 'utf-8');
    const ticketDetail = fs.readFileSync(path.resolve(__dirname, '../../client/src/lab-02/TicketDetail.tsx'), 'utf-8');
    const createTicket = fs.readFileSync(path.resolve(__dirname, '../../client/src/lab-02/CreateTicket.tsx'), 'utf-8');
    expect(myTickets).toContain('badge-priority-');
    expect(ticketDetail).toContain('badge-priority-');
    expect(createTicket).toContain('required-star');
    expect(createTicket).toContain('zen-readonly');
    expect(ticketDetail).toContain('zen-readonly');
  });
});