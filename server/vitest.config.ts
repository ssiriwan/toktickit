import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['../tests/lab-01/**/*.server.test.ts', '../tests/lab-02/**/*.server.test.ts'],
    fileParallelism: false
  }
});
