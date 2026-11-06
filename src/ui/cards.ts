import { getCard, type CardDef, type CardJob } from '../data/cards';
import { cardArtHtml } from './assets';

const JOB_LABELS: Record<CardJob, { icon: string; label: string }> = {
  frontload: { icon: '⚔️', label: '立刻攻擊' },
  area: { icon: '👥', label: '全體攻擊' },
  defense: { icon: '🛡️', label: '防守' },
  scaling: { icon: '🌱', label: '成長' },
  draw: { icon: '📖', label: '抽牌' },
  energy: { icon: '⚡', label: '能量' },
};

export function jobLabel(job?: CardJob): string {
  if (!job) return '';
  const data = JOB_LABELS[job];
  return `${data.icon} ${data.label}`;
}

export function typeIcon(type: string): string {
  if (type === 'attack') return '⚔️';
  if (type === 'block') return '🛡️';
  if (type === 'power') return '🌟';
  return '✨';
}

export function typeLabel(type: string): string {
  if (type === 'attack') return '攻擊';
  if (type === 'block') return '防守';
  if (type === 'power') return '能力';
  return '技能';
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

/** Screen-reader name. Math cards announce the card name. 注音 cards keep the syllable. */
export function cardAriaLabel(def: CardDef): string {
  if (def.cast?.gateId === 'math') return def.name;
  return `注音 ${def.zhuyin}`;
}

/**
 * StS-style card face: cost · type · 注音 art · name plate · description box.
 * Text/emoji, or a painted 4:3 window for cards in CARD_ART_BY_CARD_ID —
 * sized for 1080p combat hand readability.
 */
export function cardFaceHtml(
  def: CardDef | ReturnType<typeof getCard>,
  cost = def.cost,
): string {
  const emoji = def.icon ?? def.cues[0]?.emoji ?? '';
  const desc = formatCardDescription(def);
  const job = jobLabel(def.job);
  const art = cardArtHtml(def.id);
  // The hidden spacer keeps the art box the same size as the emoji face, so
  // hand, reward and shop layouts do not move when a card gains art.
  const artSlot = art
    ? `<div class="card-art has-art">
      <div class="card-art-spacer" aria-hidden="true">
        <div class="zhuyin">${def.zhuyin}</div>
        <div class="card-emoji">${emoji}</div>
      </div>
      <div class="card-art-window">
        <div class="card-art-frame">
          ${art}
          <div class="card-art-badge">${def.zhuyin}</div>
        </div>
      </div>
    </div>`
    : `<div class="card-art">
      <div class="zhuyin">${def.zhuyin}</div>
      <div class="card-emoji" aria-hidden="true">${emoji}</div>
    </div>`;
  return `
    ${'upgraded' in def && def.upgraded ? '<div class="card-upgrade-badge" aria-label="已升級">+</div>' : ''}
    <div class="card-top">
      <div class="cost" aria-hidden="true">${cost}</div>
      <div class="card-type-badge" aria-hidden="true" title="${typeLabel(def.type)}">${typeIcon(def.type)}</div>
    </div>
    ${artSlot}
    <div class="card-name">${def.name}</div>
    <div class="card-desc-box">
      ${job ? `<div class="card-job">${job}</div>` : ''}
      <div class="card-desc">${desc}</div>
    </div>
  `;
}
