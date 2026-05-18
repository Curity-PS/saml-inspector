import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    exclude: ['node_modules', 'client', 'server/dist'],
    environment: 'node',
    globals: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['server/**/*.ts'],
      exclude: ['server/**/*.test.ts', 'server/dist/**', 'server/types/**']
    }
  }
});
