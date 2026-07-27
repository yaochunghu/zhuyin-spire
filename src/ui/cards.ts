import { getCard, type CardDef, type CardJob, type CardRarity } from '../data/cards';
import type { DamagePreview } from '../game/combat';

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
  if (type === 'power') return '🌟';
  if (type === 'status') return '⚠️';
  if (type === 'curse') return '💀';
  return '✨';
}

export function typeLabel(type: string): string {
  if (type === 'attack') return '攻擊';
  if (type === 'power') return '能力';
  if (type === 'status') return '狀態';
  if (type === 'curse') return '詛咒';
  return '技能';
}

const RARITY_LABELS: Record<CardRarity, string> = {
  basic: '基礎',
  common: '普通',
  uncommon: '罕見',
  rare: '稀有',
  special: '特殊',
};

export function rarityLabel(rarity: CardRarity): string {
  return RARITY_LABELS[rarity];
}

export function effectLabel(def: CardDef): string {
  if (def.type === 'attack') {
    if (def.hits && def.hits > 1) return `${def.value}×${def.hits}`;
    if (def.bonusBlock) return `${def.value}+🛡${def.bonusBlock}`;
    return String(def.value);
  }
  const block = def.effects.find((effect) => effect.kind === 'block');
  if (block?.kind === 'block') return String(block.amount);
  const draw = def.effects.find((effect) => effect.kind === 'draw');
  if (draw?.kind === 'draw') return `+${draw.amount}`;
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
  return '使用此牌。';
}

export interface CardFaceOptions {
  upgradeLevel?: number;
  damagePreview?: DamagePreview | null;
}

/**
 * StS-style card face: cost · type · 注音 art · name plate · description box.
 * Still text/emoji — sized for 1080p combat hand readability.
 */
export function cardFaceHtml(
  def: CardDef | ReturnType<typeof getCard>,
  options: CardFaceOptions = {},
): string {
  const emoji = def.icon ?? def.cues[0]?.emoji ?? '';
  const desc = formatCardDescription(def);
  const job = jobLabel(def.job);
  const upgraded = (options.upgradeLevel ?? 0) > 0;
  const preview = options.damagePreview;
  const multiWithFirstHitBonus = !!preview && preview.hits > 1 && preview.effective !== preview.laterEffective;
  const areaWithFirstTargetBonus = !!preview && def.target === 'allEnemies' && preview.effective !== preview.laterEffective;
  const damageAria = !preview
    ? ''
    : multiWithFirstHitBonus
      ? `第一下傷害 ${preview.effective}，後續每下 ${preview.laterEffective}`
      : areaWithFirstTargetBonus
        ? `第一隻傷害 ${preview.effective}，其餘每隻 ${preview.laterEffective}`
        : `目前每下傷害 ${preview.effective}`;
  const damageLine = preview
    ? `<div class="card-damage-preview${preview.effective !== preview.base ? ' modified' : ''}" aria-label="${damageAria}">⚔️ ${
        multiWithFirstHitBonus
          ? `首下 ${preview.effective} · 後 ${preview.laterEffective}×${preview.hits - 1}`
          : areaWithFirstTargetBonus
            ? `首隻 ${preview.effective} · 其餘 ${preview.laterEffective}`
            : preview.effective === preview.base
          ? preview.effective
          : `${preview.base} → ${preview.effective}`
      }${preview.hits > 1 && !multiWithFirstHitBonus ? ` ×${preview.hits}` : ''}</div>`
    : '';
  return `
    <div class="card-top">
      <div class="cost" aria-hidden="true">${def.cost}</div>
      <div class="card-type-badge" aria-hidden="true" title="${typeLabel(def.type)} · ${rarityLabel(def.rarity)}">${typeIcon(def.type)}</div>
    </div>
    <div class="card-art">
      <div class="zhuyin">${def.zhuyin}</div>
      <div class="card-emoji" aria-hidden="true">${emoji}</div>
    </div>
    <div class="card-name">${def.name}${upgraded ? '<span class="card-upgrade-mark">+</span>' : ''}</div>
    <div class="card-desc-box">
      ${job ? `<div class="card-job">${job}</div>` : ''}
      ${damageLine}
      <div class="card-desc">${desc}</div>
    </div>
  `;
}
