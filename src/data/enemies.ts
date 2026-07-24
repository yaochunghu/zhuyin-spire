/**
 * Monster pool + set behaviors (patterns).
 *
 * Roles teach kids one habit each:
 * - fodder: low HP, soft hits — clear first in multi
 * - striker: attack-heavy — need block
 * - tank: guards often — chip through 🛡️
 * - swarm: multi small hits — shield still helps
 * - heavy: telegraphs 💥 — block the boom turn
 * - elite / boss: longer scary loops
 */

export type IntentKind = 'attack' | 'heavy' | 'multi' | 'block';

export type EnemyRole =
  | 'fodder'
  | 'striker'
  | 'tank'
  | 'swarm'
  | 'heavy'
  | 'elite'
  | 'boss';

export interface Intent {
  kind: IntentKind;
  /** Damage per hit (attack/heavy/multi) or block amount (block). */
  value: number;
  hits?: number;
}

export interface IntentStep {
  kind: IntentKind;
  value: number;
  hits?: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  emoji: string;
  maxHp: number;
  pattern: IntentStep[];
  role: EnemyRole;
  /** Act where this unit primarily appears (1–3). */
  act: 1 | 2 | 3;
  tier: 'normal' | 'elite' | 'boss';
  /** Adult one-liner — what set behavior to teach. */
  behaviorNote: string;
  isBoss?: boolean;
  isElite?: boolean;
}

function atk(value: number): IntentStep {
  return { kind: 'attack', value };
}
function heavy(value: number): IntentStep {
  return { kind: 'heavy', value };
}
/** Multi-hit: value = damage **per** hit, hits = count (total = value × hits). */
function multi(value: number, hits: number): IntentStep {
  return { kind: 'multi', value, hits };
}
function guard(value: number): IntentStep {
  return { kind: 'block', value };
}

/**
 * Preschool damage budgets for 15-climb-floor-plus-boss acts (unblocked peak):
 * Act I ~3–7 · Act II ~6–9 · Act III ~8–11
 * Elites/bosses tankier; campfires (40% max HP) are the recovery beat
 */
export const ENEMIES: Record<string, EnemyDef> = {
  /** First-run only. Never placed in generated maps or encounter pools. */
  tutorialSlime: {
    id: 'tutorialSlime',
    name: '練習史萊姆',
    emoji: '🟢',
    maxHp: 6,
    role: 'fodder',
    act: 1,
    tier: 'normal',
    behaviorNote: '教學限定：固定的輕攻擊，讓孩子先學會護盾',
    pattern: [atk(3)],
  },
  // ─── Act I normals (distinct roles) ─────────────────────────────
  slimeWeak: {
    id: 'slimeWeak',
    name: '軟軟史萊姆',
    emoji: '🟢',
    maxHp: 10,
    role: 'fodder',
    act: 1,
    tier: 'normal',
    behaviorNote: '小血量、輕攻擊；雙怪時先清它',
    pattern: [atk(3), atk(3), multi(2, 2)],
  },
  slime: {
    id: 'slime',
    name: '小史萊姆',
    emoji: '🟢',
    maxHp: 13,
    role: 'fodder',
    act: 1,
    tier: 'normal',
    behaviorNote: '略硬的小怪；夾一回合防禦',
    pattern: [atk(4), guard(4), atk(4), atk(5)],
  },
  rock: {
    id: 'rock',
    name: '小石怪',
    emoji: '🪨',
    maxHp: 17,
    role: 'tank',
    act: 1,
    tier: 'normal',
    behaviorNote: '先盾再打；要打穿護盾',
    pattern: [guard(7), atk(4), guard(6), atk(5)],
  },
  bat: {
    id: 'bat',
    name: '小蝙蝠',
    emoji: '🦇',
    maxHp: 12,
    role: 'swarm',
    act: 1,
    tier: 'normal',
    behaviorNote: '連擊很多下，總傷中等',
    pattern: [multi(2, 2), multi(2, 3), atk(4), multi(2, 2)],
  },
  ember: {
    id: 'ember',
    name: '小火苗',
    emoji: '🔥',
    maxHp: 14,
    role: 'heavy',
    act: 1,
    tier: 'normal',
    behaviorNote: '輕打後重擊；看下回合意圖擋爆',
    pattern: [atk(3), heavy(7), guard(4), atk(4), heavy(7)],
  },
  fang: {
    id: 'fang',
    name: '尖牙怪',
    emoji: '🦷',
    maxHp: 16,
    role: 'striker',
    act: 1,
    tier: 'normal',
    behaviorNote: '攻擊為主、少防禦；要準備盾',
    pattern: [atk(5), atk(5), multi(3, 2), atk(6)],
  },

  /** Soft striker alias (early multi packs / old maps) */
  fangSoft: {
    id: 'fangSoft',
    name: '小尖牙',
    emoji: '🦷',
    maxHp: 12,
    role: 'striker',
    act: 1,
    tier: 'normal',
    behaviorNote: '比尖牙怪更軟的攻擊型',
    pattern: [atk(4), atk(4), multi(2, 2), atk(5)],
  },

  // ─── Act II normals ─────────────────────────────────────────────
  armor: {
    id: 'armor',
    name: '盔甲怪',
    emoji: '🛡️',
    maxHp: 22,
    role: 'tank',
    act: 2,
    tier: 'normal',
    behaviorNote: '厚盾；慢慢磨',
    pattern: [guard(9), atk(5), guard(7), multi(3, 2), atk(6)],
  },
  spike: {
    id: 'spike',
    name: '尖刺怪',
    emoji: '🌵',
    maxHp: 24,
    role: 'striker',
    act: 2,
    tier: 'normal',
    behaviorNote: '中層主力輸出 + 連擊',
    pattern: [atk(6), multi(3, 2), atk(7), guard(5), multi(2, 3)],
  },
  fangHard: {
    id: 'fangHard',
    name: '兇尖牙怪',
    emoji: '🦷',
    maxHp: 20,
    role: 'heavy',
    act: 2,
    tier: 'normal',
    behaviorNote: '會放重擊；下回合 💥 要擋',
    pattern: [atk(5), heavy(9), multi(3, 2), guard(5), atk(6)],
  },
  toad: {
    id: 'toad',
    name: '毒蛙',
    emoji: '🐸',
    maxHp: 21,
    role: 'swarm',
    act: 2,
    tier: 'normal',
    behaviorNote: '三連輕咬，總傷不低',
    pattern: [multi(2, 3), atk(6), multi(3, 2), guard(6)],
  },

  // ─── Act III normals ────────────────────────────────────────────
  wraith: {
    id: 'wraith',
    name: '幽影',
    emoji: '👻',
    maxHp: 28,
    role: 'striker',
    act: 3,
    tier: 'normal',
    behaviorNote: '後期攻擊手；夾防與重擊',
    pattern: [atk(7), guard(7), multi(3, 3), heavy(11), atk(8)],
  },
  owl: {
    id: 'owl',
    name: '夜梟',
    emoji: '🦉',
    maxHp: 27,
    role: 'heavy',
    act: 3,
    tier: 'normal',
    behaviorNote: '蓄力重擊；看意圖準備盾',
    pattern: [atk(6), heavy(12), multi(3, 2), guard(8), heavy(11)],
  },
  crystal: {
    id: 'crystal',
    name: '晶盾怪',
    emoji: '💠',
    maxHp: 30,
    role: 'tank',
    act: 3,
    tier: 'normal',
    behaviorNote: '超厚盾再回擊',
    pattern: [guard(12), atk(7), guard(10), multi(4, 2), atk(8)],
  },

  // ─── Elites ─────────────────────────────────────────────────────
  eliteArmor: {
    id: 'eliteArmor',
    name: '重甲守護',
    emoji: '🛡️',
    maxHp: 30,
    role: 'elite',
    act: 1,
    tier: 'elite',
    behaviorNote: '菁英坦克：盾多、偶發重擊',
    pattern: [guard(10), atk(5), multi(3, 2), heavy(9), guard(8)],
    isElite: true,
  },
  eliteBee: {
    id: 'eliteBee',
    name: '蜂刺菁英',
    emoji: '🐝',
    maxHp: 25,
    role: 'elite',
    act: 1,
    tier: 'elite',
    behaviorNote: '菁英連擊：三下刺',
    pattern: [multi(2, 3), atk(6), multi(2, 3), guard(5)],
    isElite: true,
  },
  eliteBoom: {
    id: 'eliteBoom',
    name: '爆裂菁英',
    emoji: '💣',
    maxHp: 26,
    role: 'elite',
    act: 1,
    tier: 'elite',
    behaviorNote: '菁英重擊：爆一下',
    pattern: [atk(5), heavy(10), multi(3, 2), guard(6)],
    isElite: true,
  },
  eliteStorm: {
    id: 'eliteStorm',
    name: '風暴菁英',
    emoji: '⛈️',
    maxHp: 34,
    role: 'elite',
    act: 2,
    tier: 'elite',
    behaviorNote: '中層菁英：多段 + 重擊',
    pattern: [multi(3, 3), guard(8), atk(8), heavy(12)],
    isElite: true,
  },
  eliteShadow: {
    id: 'eliteShadow',
    name: '暗影菁英',
    emoji: '🌑',
    maxHp: 36,
    role: 'elite',
    act: 3,
    tier: 'elite',
    behaviorNote: '後期菁英：高傷循環',
    pattern: [atk(8), heavy(12), multi(4, 2), guard(9)],
    isElite: true,
  },

  // ─── Bosses ─────────────────────────────────────────────────────
  boss1: {
    id: 'boss1',
    name: '塔守護獸',
    emoji: '🐉',
    maxHp: 42,
    role: 'boss',
    act: 1,
    tier: 'boss',
    behaviorNote: '一幕王：攻防連擊輪替',
    pattern: [atk(6), guard(8), multi(3, 2), heavy(10), multi(2, 3), atk(7)],
    isBoss: true,
  },
  boss2: {
    id: 'boss2',
    name: '雙翼監守',
    emoji: '🦅',
    maxHp: 58,
    role: 'boss',
    act: 2,
    tier: 'boss',
    behaviorNote: '二幕王：連擊與重擊',
    pattern: [atk(8), multi(4, 2), guard(10), heavy(13), multi(3, 3), atk(9)],
    isBoss: true,
  },
  boss3: {
    id: 'boss3',
    name: '注音終焉王',
    emoji: '👑',
    maxHp: 72,
    role: 'boss',
    act: 3,
    tier: 'boss',
    behaviorNote: '終焉王：長循環考驗牌組',
    pattern: [
      atk(9),
      multi(3, 3),
      guard(12),
      heavy(14),
      multi(4, 2),
      atk(10),
      heavy(12),
    ],
    isBoss: true,
  },
  /** @deprecated alias → boss1 */
  boss: {
    id: 'boss',
    name: '塔守護獸',
    emoji: '🐉',
    maxHp: 42,
    role: 'boss',
    act: 1,
    tier: 'boss',
    behaviorNote: '別名：同 boss1',
    pattern: [atk(6), guard(8), multi(3, 2), heavy(10), multi(2, 3), atk(7)],
    isBoss: true,
  },
};

/** Single-enemy fight pools by act (map normals). */
export const ACT_NORMAL_POOL: Record<1 | 2 | 3, string[]> = {
  1: ['slimeWeak', 'slime', 'rock', 'bat', 'ember', 'fang'],
  2: ['armor', 'spike', 'fangHard', 'toad', 'fang'],
  3: ['wraith', 'owl', 'crystal', 'spike', 'fangHard'],
};

export const ACT_ELITE_POOL: Record<1 | 2 | 3, string[]> = {
  1: ['eliteArmor', 'eliteBee', 'eliteBoom'],
  2: ['eliteBee', 'eliteBoom', 'eliteArmor', 'eliteStorm'],
  3: ['eliteStorm', 'eliteBoom', 'eliteShadow'],
};

export const BOSS_ID: Record<1 | 2 | 3, string> = {
  1: 'boss1',
  2: 'boss2',
  3: 'boss3',
};

export const ELITE_ENEMY_IDS = [
  'eliteArmor',
  'eliteBee',
  'eliteBoom',
  'eliteStorm',
  'eliteShadow',
] as const;

export function getEnemyDef(id: string): EnemyDef {
  return ENEMIES[id] ?? ENEMIES.slime!;
}

export function intentAt(enemy: EnemyDef, turnIndex: number): Intent {
  const step = enemy.pattern[turnIndex % enemy.pattern.length]!;
  return {
    kind: step.kind,
    value: step.value,
    hits: step.hits,
  };
}

/** Damage this intent deals to the hero (0 for pure block). */
export function intentTotalDamage(intent: Intent): number {
  if (intent.kind === 'block') return 0;
  return intent.value * (intent.hits ?? 1);
}

export function intentHitCount(intent: Intent): number {
  if (intent.kind === 'block') return 0;
  if (intent.kind === 'multi') return intent.hits ?? 1;
  return 1;
}

/**
 * Kid-first intent: total damage is the big number.
 * Multi shows total first, hits as a small hint for adults.
 */
export function intentLabel(intent: Intent): string {
  if (intent.kind === 'block') {
    return `🛡️ +${intent.value}`;
  }
  const total = intentTotalDamage(intent);
  if (intent.kind === 'multi') {
    const hits = intent.hits ?? 1;
    return `⚔️ ${total} · ${hits}×${intent.value}`;
  }
  if (intent.kind === 'heavy') {
    return `💥 ${total}`;
  }
  return `⚔️ ${total}`;
}

/** Compact kid pill — total only (used when we split detail into HTML). */
export function intentTotalLabel(intent: Intent): string {
  if (intent.kind === 'block') return `🛡️ +${intent.value}`;
  const total = intentTotalDamage(intent);
  if (intent.kind === 'heavy') return `💥 ${total}`;
  if (intent.kind === 'multi') return `⚔️ ${total}`;
  return `⚔️ ${total}`;
}

export function intentMultiHint(intent: Intent): string | null {
  if (intent.kind === 'multi') {
    const hits = intent.hits ?? 1;
    return `${hits}下 ×${intent.value}`;
  }
  if (intent.kind === 'block') {
    return '防禦';
  }
  if (intent.kind === 'heavy') {
    return '重擊';
  }
  return null;
}

/** Short adult label for “next turn” strip. */
export function intentNextHint(intent: Intent): string {
  if (intent.kind === 'block') return `下回合 🛡️+${intent.value}`;
  const total = intentTotalDamage(intent);
  if (intent.kind === 'multi') {
    return `下回合 ⚔️${total}（${intent.hits ?? 1}下）`;
  }
  if (intent.kind === 'heavy') return `下回合 💥${total}`;
  return `下回合 ⚔️${total}`;
}

/** True if this intent is scary enough that kids should strongly consider block. */
export function intentIsUrgent(intent: Intent, heroHp: number, heroBlock: number): boolean {
  const dmg = intentTotalDamage(intent);
  if (dmg <= 0) return false;
  if (intent.kind === 'heavy') return true;
  if (dmg >= 7) return true;
  // Would drop hero low even with current block
  const through = Math.max(0, dmg - heroBlock);
  return through >= Math.max(4, Math.ceil(heroHp * 0.35));
}
