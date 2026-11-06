import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CARDS, getCard, resolveCard, type CardDef } from '../../src/data/cards';
import {
  CARD_ART,
  CARD_ART_BY_CARD_ID,
  cardArtHtml,
  cardArtKeyFor,
} from '../../src/ui/assets';
import {
  cardFaceHtml,
  formatCardDescription,
  jobLabel,
  typeIcon,
  typeLabel,
} from '../../src/ui/cards';

const RYUU_ART_CARD_IDS = Array.from(
  { length: 15 },
  (_, i) => `ab_m${String(i + 1).padStart(3, '0')}`,
);

/** The card face as it was before card art: every card without art must match it. */
function emojiCardFaceHtml(def: CardDef | ReturnType<typeof getCard>, cost = def.cost): string {
  const emoji = def.icon ?? def.cues[0]?.emoji ?? '';
  const desc = formatCardDescription(def);
  const job = jobLabel(def.job);
  return `
    ${'upgraded' in def && def.upgraded ? '<div class="card-upgrade-badge" aria-label="已升級">+</div>' : ''}
    <div class="card-top">
      <div class="cost" aria-hidden="true">${cost}</div>
      <div class="card-type-badge" aria-hidden="true" title="${typeLabel(def.type)}">${typeIcon(def.type)}</div>
    </div>
    <div class="card-art">
      <div class="zhuyin">${def.zhuyin}</div>
      <div class="card-emoji" aria-hidden="true">${emoji}</div>
    </div>
    <div class="card-name">${def.name}</div>
    <div class="card-desc-box">
      ${job ? `<div class="card-job">${job}</div>` : ''}
      <div class="card-desc">${desc}</div>
    </div>
  `;
}

describe('card art', () => {
  it('maps exactly the fifteen Ryuu cards ab_m001..ab_m015, one art key each', () => {
    expect(Object.keys(CARD_ART_BY_CARD_ID).sort()).toEqual(RYUU_ART_CARD_IDS);
    const keys = Object.values(CARD_ART_BY_CARD_ID);
    expect(new Set(keys).size).toBe(keys.length);
    expect(Object.keys(CARD_ART).sort()).toEqual([...keys].sort());
    for (const id of RYUU_ART_CARD_IDS) {
      expect(CARDS[id], id).toBeDefined();
      expect(cardArtKeyFor(id)).toBe(CARD_ART_BY_CARD_ID[id]);
    }
    expect(cardArtKeyFor('bo')).toBeNull();
    expect(cardArtKeyFor('toString')).toBeNull();
  });

  it('ships each 512x384 WebP and labels it with the card emoji and name', () => {
    for (const id of RYUU_ART_CARD_IDS) {
      const file = `card-${id.replace('_', '-')}.webp`;
      const url = new URL(`../../src/assets/art/cards/${file}`, import.meta.url);
      const path = fileURLToPath(url);
      expect(existsSync(path), file).toBe(true);

      const bytes = readFileSync(path);
      expect(bytes.subarray(0, 4).toString('ascii'), file).toBe('RIFF');
      expect(bytes.subarray(8, 16).toString('ascii'), file).toBe('WEBPVP8 ');
      // Lossy VP8 frame header: 14-bit width and height after the start code.
      expect(bytes.readUInt16LE(26) & 0x3fff, file).toBe(512);
      expect(bytes.readUInt16LE(28) & 0x3fff, file).toBe(384);

      const asset = CARD_ART[CARD_ART_BY_CARD_ID[id]];
      const card = getCard(id);
      expect(asset.src).toMatch(new RegExp(`${file}(?:$|\\?)`));
      expect(asset.fallback).toBe(card.icon);
      expect(asset.alt).toBe(card.name);
    }
  });

  it('draws the art window with game-rendered badges on every face of an art card', () => {
    for (const id of RYUU_ART_CARD_IDS) {
      for (const level of [0, 1] as const) {
        const def = resolveCard(id, level);
        const html = cardFaceHtml(def);
        expect(html).toContain('class="card-art has-art"');
        expect(html).toContain('class="card-art-window"');
        expect(html).toContain(CARD_ART[CARD_ART_BY_CARD_ID[id]].src);
        expect(html).toContain(`<div class="card-art-badge">${def.zhuyin}</div>`);
        expect(html).toContain(`<div class="cost" aria-hidden="true">${def.cost}</div>`);
        expect(html).toContain(`<div class="card-name">${def.name}</div>`);
        expect(html).toContain(formatCardDescription(def));
        // The emoji stays as the load-failure fallback inside the art.
        expect(html).toContain(`<span class="art-image-fallback" aria-hidden="true">${def.icon}</span>`);
        expect(html).not.toContain('<div class="card-emoji" aria-hidden="true">');
      }
    }
    expect(cardArtHtml('ab_m001')).toContain('data-art-key="card:cardAbM001"');
  });

  it('leaves every card without art on its exact emoji face', () => {
    const plain = Object.keys(CARDS).filter((id) => !cardArtKeyFor(id));
    expect(plain.length).toBe(Object.keys(CARDS).length - RYUU_ART_CARD_IDS.length);
    for (const id of plain) {
      expect(cardArtHtml(id)).toBeNull();
      for (const level of [0, 1] as const) {
        const def = resolveCard(id, level);
        expect(cardFaceHtml(def), `${id}+${level}`).toBe(emojiCardFaceHtml(def));
        expect(cardFaceHtml(def, 0), `${id}+${level} cost 0`).toBe(emojiCardFaceHtml(def, 0));
      }
    }
  });
});
