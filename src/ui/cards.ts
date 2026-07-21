import { getCard, type CardDef } from '../data/cards';

export function typeIcon(type: string): string {
  if (type === 'attack') return '⚔️';
  if (type === 'block') return '🛡️';
  return '✨';
}

export function typeLabel(type: string): string {
  if (type === 'attack') return '攻擊';
  if (type === 'block') return '技能';
  return '能力';
}

export function effectLabel(def: CardDef): string {
  if (def.type === 'attack') {
    if (def.hits && def.hits > 1) return `${def.value}×${def.hits}`;
    if (def.bonusBlock) return `${def.value}+🛡${def.bonusBlock}`;
    return String(def.value);
  }
  if (def.type === 'block') return String(def.value);
  if (def.draw) return `+${def.draw}`;
  return '';
}

/** StS-like full description (prefer authoring; fall back to generated). */
export function formatCardDescription(def: CardDef): string {
  if (def.description && def.description.trim().length > 0) {
    return def.description.trim();
  }
  if (def.type === 'attack') {
    if (def.hits && def.hits > 1) {
      return `造成 ${def.value} 點傷害 ${def.hits} 次。`;
    }
    let s = `造成 ${def.value} 點傷害。`;
    if (def.bonusBlock) s += ` 獲得 ${def.bonusBlock} 點護盾。`;
    return s;
  }
  if (def.type === 'block') {
    return `獲得 ${def.value} 點護盾。`;
  }
  if (def.draw) {
    return `抽 ${def.draw} 張牌。`;
  }
  return '使用此牌。';
}

/**
 * StS-style card face: cost · type · 注音 art · name plate · description box.
 * Still text/emoji — sized for 1080p combat hand readability.
 */
export function cardFaceHtml(def: CardDef | ReturnType<typeof getCard>): string {
  const emoji = def.cues[0]?.emoji ?? '';
  const desc = formatCardDescription(def);
  return `
    <div class="card-top">
      <div class="cost" aria-hidden="true">${def.cost}</div>
      <div class="card-type-badge" aria-hidden="true" title="${typeLabel(def.type)}">${typeIcon(def.type)}</div>
    </div>
    <div class="card-art">
      <div class="zhuyin">${def.zhuyin}</div>
      <div class="card-emoji" aria-hidden="true">${emoji}</div>
    </div>
    <div class="card-name">${def.name}</div>
    <div class="card-desc-box">
      <div class="card-desc">${desc}</div>
    </div>
  `;
}
