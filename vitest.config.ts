import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The solar layer is pure: no DOM, so no browser environment is needed.
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // M0 ships the scaffold with no tests yet; M1 adds the first ones.
    passWithNoTests: true,
  },
});
