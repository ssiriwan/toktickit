import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['../tests/lab-01/**/*.test.tsx'],
    setupFiles: './src/test/setup.ts'
  }
});
