import { defineConfig } from 'vitest/config';

/** Headless child-model runs. Kept out of `vitest.config.ts` so `npm test` stays fast. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/sim-entry.test.ts'],
    fileParallelism: false,
    testTimeout: 180_000,
    reporters: ['dot'],
    disableConsoleIntercept: true,
  },
});
