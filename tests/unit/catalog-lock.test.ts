import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RESONANCE_CARDS } from '../../src/data/resonanceCards';

interface CatalogRow {
  id: string;
  name: string;
  type: string;
  cost: number;
  effect: string;
  rarity: string;
}

function cells(line: string): string[] {
  return line.split('|').map((cell) => cell.trim());
}

function finalCatalogRows(): CatalogRow[] {
  const source = fs.readFileSync(
    new URL('../../docs/RESONANCE_WARRIOR_DESIGN_PROCESS.md', import.meta.url),
    'utf8',
  );
  const section = source.match(
    /## Final 75-card pool\s+([\s\S]*?)\s+## Human playtest gates/,
  )?.[1];
  if (!section) throw new Error('Final 75-card pool section is missing');
  return section.split('\n').flatMap((line) => {
    if (!/^\| B\d{3} /.test(line)) return [];
    const row = cells(line);
    return [{
      id: row[1]!,
      name: row[2]!,
      type: row[3]!.toLowerCase(),
      cost: Number(row[4]),
      effect: row[5]!,
      rarity: row[6]!.toLowerCase(),
    }];
  });
}

function upgradeRows(): Map<string, { base: string; upgraded: string }> {
  const source = fs.readFileSync(
    new URL('../../docs/UPGRADE_BIBLE.md', import.meta.url),
    'utf8',
  );
  const rows = new Map<string, { base: string; upgraded: string }>();
  for (const line of source.split('\n')) {
    if (!/^\| `[^`]+` \| B\d{3} /.test(line)) continue;
    const row = cells(line);
    const designId = row[2]!.match(/^(B\d{3})\s/)?.[1];
    if (designId) rows.set(designId, { base: row[3]!, upgraded: row[4]! });
  }
  return rows;
}

describe('locked 共鳴武者 catalog', () => {
  it('keeps runtime base and upgrade faces aligned with both canonical tables', () => {
    const catalog = finalCatalogRows();
    const upgrades = upgradeRows();
    const runtime = new Map(
      Object.values(RESONANCE_CARDS).map((card) => [card.designId, card]),
    );

    expect(catalog).toHaveLength(75);
    expect(upgrades.size).toBe(75);
    expect(runtime.size).toBe(75);

    for (const row of catalog) {
      const card = runtime.get(row.id);
      const upgrade = upgrades.get(row.id);
      expect(card, row.id).toBeDefined();
      expect(upgrade, row.id).toBeDefined();
      expect(card).toMatchObject({
        designId: row.id,
        name: row.name,
        type: row.type,
        cost: row.cost,
        description: row.effect,
        rarity: row.rarity,
      });
      expect(upgrade!.base).toBe(row.effect);
      expect(card!.upgrade?.description).toBe(upgrade!.upgraded);
    }
  });

  it('keeps every upgrade on the same card job and prevents silent faces', () => {
    for (const card of Object.values(RESONANCE_CARDS)) {
      const upgrade = card.upgrade;
      expect(upgrade, card.designId).toBeDefined();
      expect(upgrade!.description, card.designId).not.toBe(card.description);

      const baseKinds = new Set((card.effects ?? []).map((effect) => effect.kind));
      const addedKinds = (upgrade!.effects ?? [])
        .map((effect) => effect.kind)
        .filter((kind) => !baseKinds.has(kind));
      expect(
        addedKinds.every((kind) => kind === 'draw'),
        `${card.designId} adds an unrelated effect kind`,
      ).toBe(true);
    }
  });

  it('locks self-target Powers and conditional structured effects', () => {
    const byDesignId = new Map(
      Object.values(RESONANCE_CARDS).map((card) => [card.designId, card]),
    );
    for (const designId of ['B024', 'B028', 'B030', 'B114', 'B100']) {
      expect(byDesignId.get(designId)?.target, designId).toBe('self');
    }

    expect(byDesignId.get('B017')?.effects).toEqual([
      { kind: 'damage', amount: 5 },
    ]);
    expect(byDesignId.get('B010')?.upgrade?.effects).toEqual([
      { kind: 'draw', amount: 1 },
      { kind: 'energy', amount: 1 },
    ]);
    expect(byDesignId.get('B032')?.upgrade?.effects).toEqual([
      { kind: 'draw', amount: 1 },
    ]);
    expect(byDesignId.get('B041')?.effects).toEqual([
      { kind: 'draw', amount: 1 },
    ]);
    expect(byDesignId.get('B041')?.upgrade?.effects).toEqual([
      { kind: 'draw', amount: 2 },
    ]);
    expect(byDesignId.get('B144')?.upgrade?.effects).toEqual([
      { kind: 'weak', amount: 2 },
    ]);
  });
});
