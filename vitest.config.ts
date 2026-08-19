import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Until M1 adds the first tests.
    passWithNoTests: true,
  },
});
