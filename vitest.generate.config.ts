import { defineConfig } from 'vitest/config';

/** Runs the fixture generator only. `npm test` does not include this file. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/generate-save-fixtures.ts'],
  },
});
