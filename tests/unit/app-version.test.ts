import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appVersionLabel } from '../../src/ui/screens';

describe('app version label', () => {
  it('is v plus the package.json version', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(appVersionLabel()).toBe(`v${pkg.version}`);
  });
});
