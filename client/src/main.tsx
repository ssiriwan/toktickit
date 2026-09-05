import 'bootstrap/dist/css/bootstrap.min.css';
import './lab-02/theme.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppShell } from './lab-02/AppShell';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppShell />
  </StrictMode>
);
