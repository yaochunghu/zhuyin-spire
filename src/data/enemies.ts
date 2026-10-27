/**
 * Monster pool + set behaviors (patterns).
 *
 * Roles teach kids one habit each:
 * - fodder: low HP, soft hits — clear first in multi
 * - striker: attack-heavy — need block
 * - tank: guards often — chip through 🛡️
 * - swarm: multi small hits — shield still helps
 * - heavy: telegraphs 💥 — block the boom turn
 * - buffer: makes a neighbor's later attack bigger
 * - listener: a correct 注音 cast softens its later attack
 * - summoner: calls one friend, who waits until the next enemy phase
 * - scaling: its own later attacks grow once
 * - elite / boss: longer loops, bosses can change phase
 */

export type IntentKind = 'attack' | 'heavy' | 'multi' | 'block';

export type EnemyRole =
  | 'fodder'
  | 'striker'
  | 'tank'
  | 'swarm'
  | 'heavy'
  | 'buffer'
  | 'listener'
  | 'summoner'
  | 'scaling'
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
  /** Other living enemies gain this much strength for attacks after this phase. */
  grantStrength?: number;
  /** This enemy gains this much strength for its own attacks after this phase. */
  grantSelfStrength?: number;
  /** Spawn this enemy once, if the row has room. It does not act this phase. */
  summon?: string;
}

export interface EnemyPhase {
  /** Enter after the current action once hp is at or below this and still above 0. */
  belowHp: number;
  /** Shown as 下回合 when the line is crossed, then played once. */
  enter: IntentStep;
  pattern: IntentStep[];
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
  /** Parent coach line when this enemy is the fight's main teacher. */
  coachTip?: string;
  /** Successful casts reduce a later attack. The current pill does not change. */
  listens?: boolean;
  /** Most strength this enemy will keep. Omitted means it does not grow. */
  strengthCap?: number;
  phases?: EnemyPhase[];
  isBoss?: boolean;
  isElite?: boolean;
}

function atk(value: number, extra?: Partial<IntentStep>): IntentStep {
  return { kind: 'attack', value, ...extra };
}
function heavy(value: number, extra?: Partial<IntentStep>): IntentStep {
  return { kind: 'heavy', value, ...extra };
}
/** Multi-hit: value = damage **per** hit, hits = count (total = value × hits). */
function multi(value: number, hits: number, extra?: Partial<IntentStep>): IntentStep {
  return { kind: 'multi', value, hits, ...extra };
}
function guard(value: number, extra?: Partial<IntentStep>): IntentStep {
  return { kind: 'block', value, ...extra };
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
    strengthCap: 1,
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

  // ─── New Act I teachers ─────────────────────────────────────────
  echoBug: {
    id: 'echoBug',
    name: '跟讀蟲',
    emoji: '🐛',
    maxHp: 13,
    role: 'listener',
    act: 1,
    tier: 'normal',
    listens: true,
    behaviorNote: '拼對注音會讓牠下一手的攻擊變輕，本回合數字不變',
    coachTip: '跟讀蟲（ㄍㄣ ㄉㄨˊ）在聽。每拼對一次，牠下一手的攻擊少 1，最少還是 1。這一手的數字不會變。',
    pattern: [atk(4), atk(5), guard(4), atk(4)],
  },
  drumlet: {
    id: 'drumlet',
    name: '小鼓手',
    emoji: '🥁',
    maxHp: 11,
    role: 'buffer',
    act: 1,
    tier: 'normal',
    behaviorNote: '敲鼓不會痛，但會讓旁邊那隻的下一手 +1',
    coachTip: '小鼓手（ㄍㄨˇ ㄕㄡˇ）敲鼓的那一手是盾，不是攻擊。旁邊那隻的下一手會 +1。可以先打鼓手。',
    pattern: [atk(3), guard(3, { grantStrength: 1 }), atk(4)],
  },

  // ─── New Act II teachers ────────────────────────────────────────
  bellMoth: {
    id: 'bellMoth',
    name: '鐘粉蛾',
    emoji: '🦋',
    maxHp: 19,
    role: 'listener',
    act: 2,
    tier: 'normal',
    listens: true,
    behaviorNote: '中層的聽眾：拼對會讓下一手變輕',
    coachTip: '鐘粉蛾（ㄓㄨㄥ ㄈㄣˇ ㄜˊ）也在聽拼字。拼對會讓牠下一手變輕，這一手的數字不變。',
    pattern: [atk(5), guard(6), multi(2, 3), atk(6)],
  },
  dustDrum: {
    id: 'dustDrum',
    name: '塵鼓',
    emoji: '🥁',
    maxHp: 23,
    role: 'scaling',
    act: 2,
    tier: 'normal',
    strengthCap: 1,
    behaviorNote: '防禦之後，自己後面的每一擊 +1，只加一次',
    coachTip: '塵鼓（ㄔㄣˊ ㄍㄨˇ）做完一次防禦，後面的攻擊就 +1，只加一次。防禦那一手是打牠的好時機。',
    pattern: [guard(8, { grantSelfStrength: 1 }), atk(6), multi(2, 3), atk(6)],
  },
  noteWisp: {
    id: 'noteWisp',
    name: '小音符',
    emoji: '✨',
    maxHp: 9,
    role: 'fodder',
    act: 2,
    tier: 'normal',
    strengthCap: 1,
    behaviorNote: '被叫出來的小幫手。出現的那一輪先休息，第一手是盾',
    coachTip: '小音符（ㄒㄧㄠˇ ㄧㄣ ㄈㄨˊ）是被叫來的。出現的那一輪它先休息，下一手先舉盾。',
    pattern: [guard(3), atk(3)],
  },
  littleConductor: {
    id: 'littleConductor',
    name: '小指揮',
    emoji: '🎼',
    maxHp: 18,
    role: 'summoner',
    act: 2,
    tier: 'normal',
    behaviorNote: '防禦時叫出一隻小音符，新來的先休息',
    coachTip: '小指揮（ㄓˇ ㄏㄨㄟ）舉盾時會叫一隻小音符。新來的這一輪先不出手。',
    pattern: [atk(6), guard(5, { summon: 'noteWisp' }), multi(2, 3)],
  },
  bellWisp: {
    id: 'bellWisp',
    name: '鐘音符',
    emoji: '🔔',
    maxHp: 14,
    role: 'fodder',
    act: 2,
    tier: 'normal',
    strengthCap: 1,
    behaviorNote: '指揮菁英叫來的音符。重擊那一輪它在舉盾',
    coachTip: '鐘音符是樂團指揮叫來的。它出現的那一輪先休息，被加力的數字寫在下一手。',
    pattern: [atk(4), atk(4), guard(3), atk(3)],
  },

  // ─── New Act III teachers ───────────────────────────────────────
  mirrorNote: {
    id: 'mirrorNote',
    name: '鏡音',
    emoji: '🪞',
    maxHp: 26,
    role: 'listener',
    act: 3,
    tier: 'normal',
    listens: true,
    behaviorNote: '後期聽眾：拼對會把下一手的重擊變輕一點',
    coachTip: '鏡音（ㄐㄧㄥˋ ㄧㄣ）在聽。每拼對一次，下一手少 1。重擊的數字會跟著變，這一手不會。',
    pattern: [atk(7), guard(8), multi(3, 2), heavy(11)],
  },
  crownBell: {
    id: 'crownBell',
    name: '冠鐘',
    emoji: '🔔',
    maxHp: 30,
    role: 'scaling',
    act: 3,
    tier: 'normal',
    strengthCap: 1,
    behaviorNote: '先防禦一次，自己後面的每一擊 +1',
    coachTip: '冠鐘（ㄍㄨㄢ ㄓㄨㄥ）先舉盾。盾過了以後，自己的每一擊 +1，只加一次。',
    pattern: [guard(8, { grantSelfStrength: 1 }), atk(8), multi(3, 2), heavy(11)],
  },
  starWisp: {
    id: 'starWisp',
    name: '星螢',
    emoji: '🌟',
    maxHp: 12,
    role: 'fodder',
    act: 3,
    tier: 'normal',
    strengthCap: 1,
    behaviorNote: '塔頂叫來的小光點。出現的那一輪先休息，第一手是盾',
    coachTip: '星螢（ㄒㄧㄥ ㄧㄥˊ）是被叫來的小光。出現的那一輪先休息，下一手先舉盾。',
    pattern: [guard(4), atk(4)],
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
  eliteChorus: {
    id: 'eliteChorus',
    name: '和聲蛹',
    emoji: '🐛',
    maxHp: 28,
    role: 'summoner',
    act: 1,
    tier: 'elite',
    isElite: true,
    behaviorNote: '重擊先出手，下一手舉盾才叫史萊姆',
    coachTip: '和聲蛹（ㄏㄜˊ ㄕㄥ ㄩㄥˇ）先出重擊。下一手舉盾時才叫一隻軟軟史萊姆。新來的這一輪先不出手。',
    pattern: [atk(5), heavy(8), guard(6, { summon: 'slimeWeak' }), multi(2, 3)],
  },
  eliteConductor: {
    id: 'eliteConductor',
    name: '樂團指揮',
    emoji: '🎶',
    maxHp: 36,
    role: 'summoner',
    act: 2,
    tier: 'elite',
    isElite: true,
    behaviorNote: '重擊先出手，舉盾才叫音符，下一手才加力',
    coachTip: '樂團指揮（ㄩㄝˋ ㄉㄨㄟˋ ㄓˇ ㄏㄨㄟ）先出重擊。舉盾時叫一隻鐘音符，再下一手讓它 +1。加過的數字寫在圖示上。',
    pattern: [atk(7), heavy(12), guard(8, { summon: 'bellWisp' }), atk(6, { grantStrength: 1 })],
  },
  eliteMuteDrum: {
    id: 'eliteMuteDrum',
    name: '慢拍鼓',
    emoji: '🥁',
    maxHp: 38,
    role: 'scaling',
    act: 2,
    tier: 'elite',
    isElite: true,
    strengthCap: 1,
    behaviorNote: '防禦之後每一擊 +1，重擊是這個菁英的大動作',
    coachTip: '慢拍鼓（ㄇㄢˋ ㄆㄞ ㄍㄨˇ）防禦之後，後面每一擊 +1，只加一次。先看下一手的數字再決定要不要擋。',
    pattern: [atk(7), guard(10, { grantSelfStrength: 1 }), multi(3, 2), heavy(11)],
  },
  elitePrism: {
    id: 'elitePrism',
    name: '七音晶',
    emoji: '💠',
    maxHp: 44,
    role: 'tank',
    act: 3,
    tier: 'elite',
    isElite: true,
    behaviorNote: '厚盾只擋到它下一次行動之前',
    coachTip: '七音晶（ㄑㄧ ㄧㄣ ㄐㄧㄥ）會先疊很高的盾。盾只留到它下一次行動，這一回合把盾敲掉就打得到血。',
    pattern: [guard(12), atk(8), guard(10), multi(3, 3), heavy(12)],
  },
  eliteStarCaller: {
    id: 'eliteStarCaller',
    name: '喚星使',
    emoji: '🌟',
    maxHp: 40,
    role: 'summoner',
    act: 3,
    tier: 'elite',
    isElite: true,
    behaviorNote: '重擊先出手，下一手舉盾才叫星螢',
    coachTip: '喚星使（ㄏㄨㄢˋ ㄒㄧㄥ ㄕˇ）先出重擊。下一手舉盾時才叫出星螢。星螢這一輪先休息，再下一手先舉盾。',
    pattern: [atk(8), heavy(12), guard(10, { summon: 'starWisp' }), multi(4, 2)],
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
    behaviorNote: '血量過半後先舉盾，下一手重擊，再叫史萊姆',
    coachTip: '塔守護獸血量變少以後，下一手先舉盾，再下一手是大重擊。重擊之後才叫一隻軟軟史萊姆。新來的那一輪先休息。',
    pattern: [atk(6), guard(8), multi(3, 2)],
    phases: [{
      belowHp: 21,
      enter: guard(8),
      pattern: [heavy(10), guard(6, { summon: 'slimeWeak' }), multi(2, 3), atk(7)],
    }],
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
    behaviorNote: '血量過半後先舉盾，下一手重擊，再叫小音符',
    coachTip: '雙翼監守血量過半以後，下一手先舉盾，再下一手是重擊。重擊之後才叫出小音符。小音符那一輪先休息。',
    pattern: [atk(8), multi(4, 2), guard(10)],
    phases: [{
      belowHp: 29,
      enter: guard(12),
      pattern: [heavy(13), guard(8, { summon: 'noteWisp' }), multi(3, 3), atk(9)],
    }],
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
    behaviorNote: '血量過半後先舉盾並 +1，下一手重擊，再叫星螢',
    strengthCap: 1,
    coachTip: '注音終焉王血量變少後，下一手先舉盾，自己的攻擊 +1。變大的重擊數字寫在圖示上。重擊之後才叫出星螢。星螢那一輪先休息。',
    pattern: [atk(9), multi(3, 3), guard(12)],
    phases: [{
      belowHp: 36,
      enter: guard(14, { grantSelfStrength: 1 }),
      pattern: [heavy(13), guard(10, { summon: 'starWisp' }), multi(4, 2), atk(9), heavy(12)],
    }],
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
    coachTip: '塔守護獸血量變少以後，下一手先舉盾，再下一手是大重擊。重擊之後才叫一隻軟軟史萊姆。新來的那一輪先休息。',
    pattern: [atk(6), guard(8), multi(3, 2)],
    phases: [{
      belowHp: 21,
      enter: guard(8),
      pattern: [heavy(10), guard(6, { summon: 'slimeWeak' }), multi(2, 3), atk(7)],
    }],
    isBoss: true,
  },
};

/** Opening solos. Act I uses these for the first three normal fights; later acts, the first two. */
export const ACT_EASY_SOLOS: Record<1 | 2 | 3, string[]> = {
  1: ['slimeWeak', 'slime', 'bat'],
  2: ['armor', 'toad', 'bellMoth'],
  3: ['wraith', 'owl', 'mirrorNote'],
};

/** Later solos. Minions stay out of this list; a summoner brings them in. */
export const ACT_HARD_SOLOS: Record<1 | 2 | 3, string[]> = {
  1: ['rock', 'ember', 'fang', 'echoBug'],
  2: ['spike', 'fangHard', 'dustDrum', 'littleConductor'],
  3: ['crystal', 'crownBell'],
};

/** Single-enemy fight pools by act (easy then hard). Map generation uses the split lists. */
export const ACT_NORMAL_POOL: Record<1 | 2 | 3, string[]> = {
  1: [...ACT_EASY_SOLOS[1], ...ACT_HARD_SOLOS[1]],
  2: [...ACT_EASY_SOLOS[2], ...ACT_HARD_SOLOS[2]],
  3: [...ACT_EASY_SOLOS[3], ...ACT_HARD_SOLOS[3]],
};

export const ACT_ELITE_POOL: Record<1 | 2 | 3, string[]> = {
  1: ['eliteArmor', 'eliteBee', 'eliteBoom', 'eliteChorus'],
  2: ['eliteStorm', 'eliteConductor', 'eliteMuteDrum'],
  3: ['eliteShadow', 'elitePrism', 'eliteStarCaller'],
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
  'eliteChorus',
  'eliteStorm',
  'eliteConductor',
  'eliteMuteDrum',
  'eliteShadow',
  'elitePrism',
  'eliteStarCaller',
] as const;

const COACH_RANK: Partial<Record<EnemyRole, number>> = {
  boss: 5,
  elite: 4,
  summoner: 3,
  listener: 3,
  buffer: 3,
  scaling: 3,
};

/** Parent line for the most important teacher currently alive. */
export function coachBodyForEnemies(defIds: string[]): string | null {
  const ranked = defIds
    .map((id) => ENEMIES[id])
    .filter((def): def is EnemyDef => !!def?.coachTip)
    .sort((a, b) => (COACH_RANK[b.role] ?? 0) - (COACH_RANK[a.role] ?? 0));
  return ranked[0]?.coachTip ?? null;
}

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

/** Damage this intent deals to the hero (0 for pure block). Weak floors each hit to 75%. */
export function intentTotalDamage(intent: Intent, weak = false): number {
  if (intent.kind === 'block') return 0;
  const perHit = weak ? Math.max(0, Math.floor(intent.value * 0.75)) : intent.value;
  return perHit * (intent.hits ?? 1);
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
export function intentLabel(intent: Intent, weak = false): string {
  if (intent.kind === 'block') {
    return `🛡️ +${intent.value}`;
  }
  const total = intentTotalDamage(intent, weak);
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
export function intentTotalLabel(intent: Intent, weak = false): string {
  if (intent.kind === 'block') return `🛡️ +${intent.value}`;
  const total = intentTotalDamage(intent, weak);
  if (intent.kind === 'heavy') return `💥 ${total}`;
  if (intent.kind === 'multi') return `⚔️ ${total}`;
  return `⚔️ ${total}`;
}

export function intentMultiHint(intent: Intent, weak = false): string | null {
  if (intent.kind === 'multi') {
    const hits = intent.hits ?? 1;
    const perHit = weak ? Math.max(0, Math.floor(intent.value * 0.75)) : intent.value;
    return `${hits}下 ×${perHit}`;
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
export function intentNextHint(intent: Intent, weak = false): string {
  if (intent.kind === 'block') return `下回合 🛡️+${intent.value}`;
  const total = intentTotalDamage(intent, weak);
  if (intent.kind === 'multi') {
    return `下回合 ⚔️${total}（${intent.hits ?? 1}下）`;
  }
  if (intent.kind === 'heavy') return `下回合 💥${total}`;
  return `下回合 ⚔️${total}`;
}

/** True if this intent is scary enough that kids should strongly consider block. */
export function intentIsUrgent(
  intent: Intent,
  heroHp: number,
  heroBlock: number,
  weak = false,
): boolean {
  const dmg = intentTotalDamage(intent, weak);
  if (dmg <= 0) return false;
  if (intent.kind === 'heavy') return true;
  if (dmg >= 7) return true;
  // Would drop hero low even with current block
  const through = Math.max(0, dmg - heroBlock);
  return through >= Math.max(4, Math.ceil(heroHp * 0.35));
}
