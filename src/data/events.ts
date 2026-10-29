/**
 * Act I–III and shared events.
 *
 * Every id, choice, reward, and cost comes from docs/EVENT_ENCOUNTER_BIBLE.md.
 * Nothing in this table is an invented event. Difficulty 15 replaces the whole
 * effect list for that choice; Leave never changes.
 */

import { curseName } from './curses';

export type EventAct = 1 | 2 | 3 | 'shared';
export type CardTypeGroup = 'attack' | 'skill' | 'power';
export type EventRelicRarity = 'common' | 'uncommon' | 'rare';

export type EventCondition =
  | { op: 'damaged' }
  | { op: 'hpAtLeast'; amount: number }
  | { op: 'goldAtLeast'; amount: number }
  | { op: 'upgradeable'; count?: number; cardType?: CardTypeGroup }
  | { op: 'upgradeablePair' }
  | { op: 'removable'; count?: number }
  | { op: 'removableCurse' }
  | { op: 'nonBasic' }
  | { op: 'unupgradedBasic' }
  | { op: 'unlocked'; rarity: EventRelicRarity; count?: number }
  | { op: 'libraryReady' }
  | { op: 'notOwned'; relicId: string }
  | { op: 'relicAvailable'; rarity: EventRelicRarity }
  | { op: 'potionSlots'; count: number }
  | { op: 'bindable' };

export type EventEffect =
  | { op: 'loseHp'; amount: number }
  | { op: 'heal'; amount: number }
  | { op: 'healFull' }
  | { op: 'healMissingPercent'; percent: number }
  | { op: 'gainMaxHp'; amount: number }
  | { op: 'loseMaxHp'; amount: number }
  | { op: 'gainGold'; amount: number }
  | { op: 'payGold'; amount: number }
  | { op: 'upgrade'; count: number; cardType?: CardTypeGroup; allBasics?: boolean }
  | { op: 'upgradePair' }
  | { op: 'remove'; count: number; curseOnly?: boolean }
  | { op: 'transform'; count: number; upgradeResult?: boolean }
  | { op: 'gainCard'; rarity: EventRelicRarity; count: number; distinct?: boolean }
  | { op: 'copy' }
  | { op: 'gainRelic'; relicId: string }
  | { op: 'gainRandomRelic'; rarity: EventRelicRarity }
  | { op: 'gainCurse'; curseId: string; count?: number }
  | { op: 'gainPotion'; count: number }
  | { op: 'bind' }
  | { op: 'fight'; encounterId: string; reward: EventEffect[] }
  | { op: 'bossEnergy'; amount: number }
  | { op: 'futureNormalHp'; percent: number; fights: number }
  | { op: 'shrine'; questions: number; hpPerMiss: number; then: EventEffect[] }
  | { op: 'library'; preferCommon: boolean };

export interface EventChoiceDef {
  id: string;
  label: string;
  /** Extra gates beyond the price written on the effects. */
  eligibility: EventCondition[];
  effects: EventEffect[];
  /** Full replacement at difficulty 15. Leave stays empty. */
  a15: EventEffect[];
  confirm: boolean;
  /** Hide the button when its eligibility fails. Resource prices still show a reason. */
  hideUnlessEligible?: boolean;
}

export interface EventDef {
  id: string;
  act: EventAct;
  title: string;
  icon: string;
  /** Read aloud once. One short sentence. */
  presentation: string;
  /** Parent coach copy. */
  rationale: string;
  /** OR of AND-groups. A choice must also be legal. */
  eligibility: EventCondition[][];
  choices: EventChoiceDef[];
}

const DANGEROUS = new Set<EventEffect['op']>([
  'loseHp',
  'loseMaxHp',
  'gainCurse',
  'remove',
  'transform',
  'copy',
  'fight',
  'shrine',
  'bind',
  'futureNormalHp',
]);

export function effectsNeedConfirm(effects: readonly EventEffect[]): boolean {
  return effects.some((effect) => DANGEROUS.has(effect.op));
}

function choice(
  id: string,
  label: string,
  effects: EventEffect[],
  a15: EventEffect[],
  eligibility: EventCondition[] = [],
  hideUnlessEligible = false,
): EventChoiceDef {
  return {
    id,
    label,
    eligibility,
    effects,
    a15,
    confirm: effectsNeedConfirm(effects),
    hideUnlessEligible,
  };
}

function leave(label = '離開'): EventChoiceDef {
  return choice('leave', label, [], []);
}

function loseHp(amount: number): EventEffect {
  return { op: 'loseHp', amount };
}
function heal(amount: number): EventEffect {
  return { op: 'heal', amount };
}
function gold(amount: number): EventEffect {
  return { op: 'gainGold', amount };
}
function pay(amount: number): EventEffect {
  return { op: 'payGold', amount };
}
function maxLoss(amount: number): EventEffect {
  return { op: 'loseMaxHp', amount };
}
function maxGain(amount: number): EventEffect {
  return { op: 'gainMaxHp', amount };
}

export const EVENTS: EventDef[] = [
  {
    id: 'event_a1_whispering_door',
    act: 1,
    title: '和聲門',
    icon: '🚪',
    presentation: '這扇門會輕輕說話。',
    rationale: '貼著聽會少一點心，換一張牌變強。輕輕敲直接拿金幣。可以離開。',
    eligibility: [[{ op: 'upgradeable', count: 1 }]],
    choices: [
      choice('listen', '貼著聽', [loseHp(4), { op: 'upgrade', count: 1 }], [loseHp(6), { op: 'upgrade', count: 1 }]),
      choice('knock', '輕輕敲', [gold(35)], [gold(25)]),
      leave(),
    ],
  },
  {
    id: 'event_a1_tuning_fountain',
    act: 1,
    title: '調音噴泉',
    icon: '⛲',
    presentation: '噴泉會把心補到新的高度。',
    rationale: '洗臉補心。裝瓶會少一點最大心，換一瓶藥水。腰帶滿了就不能裝。',
    eligibility: [[{ op: 'damaged' }], [{ op: 'potionSlots', count: 1 }]],
    choices: [
      choice('wash', '洗洗臉', [heal(10)], [heal(7)]),
      choice('bottle', '裝一瓶', [maxLoss(2), { op: 'gainPotion', count: 1 }], [maxLoss(3), { op: 'gainPotion', count: 1 }]),
      leave(),
    ],
  },
  {
    id: 'event_a1_lost_metronome',
    act: 1,
    title: '迷路的節拍器',
    icon: '⏱️',
    presentation: '小節拍器想找一個家。',
    rationale: '帶著它會少一點心，之後每一回合打出第三張牌就抽一張。交給收藏家拿金幣。',
    eligibility: [[{ op: 'notOwned', relicId: 'pocketMetronome' }]],
    choices: [
      choice('keep', '帶著它', [loseHp(5), { op: 'gainRelic', relicId: 'pocketMetronome' }], [loseHp(7), { op: 'gainRelic', relicId: 'pocketMetronome' }]),
      choice('sell', '交給收藏家', [gold(45)], [gold(35)]),
      leave(),
    ],
  },
  {
    id: 'event_a1_bell_rope',
    act: 1,
    title: '低垂的鐘繩',
    icon: '🪢',
    presentation: '鐘繩上掛著金幣和小牌子。',
    rationale: '輕拉拿確定的金幣。大力拉少一點心，換一張稀有度較高的牌。',
    eligibility: [[{ op: 'unlocked', rarity: 'uncommon', count: 1 }]],
    choices: [
      choice('tug', '輕拉', [gold(22)], [gold(16)]),
      choice('yank', '大力拉', [loseHp(5), { op: 'gainCard', rarity: 'uncommon', count: 1 }], [loseHp(7), { op: 'gainCard', rarity: 'uncommon', count: 1 }]),
      leave(),
    ],
  },
  {
    id: 'event_a1_dusty_score',
    act: 1,
    title: '灰塵樂譜',
    icon: '📜',
    presentation: '樂譜上有一層灰，可以擦，也可以改。',
    rationale: '擦乾淨會少一點心，拿掉一張牌。改寫把一張牌換成另一張差不多的牌。',
    eligibility: [[{ op: 'removable', count: 1 }]],
    choices: [
      choice('clean', '擦乾淨', [loseHp(6), { op: 'remove', count: 1 }], [loseHp(8), { op: 'remove', count: 1 }]),
      choice('rewrite', '改寫', [{ op: 'transform', count: 1 }], [loseHp(2), { op: 'transform', count: 1 }]),
      leave(),
    ],
  },
  {
    id: 'event_a1_sleeping_chime',
    act: 1,
    title: '睡著的風鈴',
    icon: '🎐',
    presentation: '風鈴在睡覺。可以一起休息，或輕輕叫醒。',
    rationale: '一起睡補心。叫醒它會拿到一件遺物，也會多一張不能出的失聲。',
    eligibility: [[{ op: 'damaged' }], [{ op: 'relicAvailable', rarity: 'common' }]],
    choices: [
      choice('nap', '一起睡', [heal(8)], [heal(6)]),
      choice(
        'wake',
        '叫醒它',
        [{ op: 'gainRandomRelic', rarity: 'common' }, { op: 'gainCurse', curseId: 'cu_silence' }],
        [loseHp(2), { op: 'gainRandomRelic', rarity: 'common' }, { op: 'gainCurse', curseId: 'cu_silence' }],
      ),
      leave(),
    ],
  },
  {
    id: 'event_a1_lantern_choir',
    act: 1,
    title: '燈籠合唱',
    icon: '🏮',
    presentation: '燈籠想一起唱歌。',
    rationale: '點一盞燈花金幣拿掉一張牌。一起唱讓最大心變長，也補一樣多的心。',
    eligibility: [[{ op: 'removable', count: 1 }], [{ op: 'goldAtLeast', amount: 20 }]],
    choices: [
      choice('lamp', '點一盞燈', [pay(20), { op: 'remove', count: 1 }], [pay(28), { op: 'remove', count: 1 }]),
      choice('sing', '一起唱', [maxGain(2)], [maxGain(1)]),
      leave(),
    ],
  },
  {
    id: 'event_a2_heated_organ',
    act: 2,
    title: '發熱風琴',
    icon: '🎹',
    presentation: '風琴暖暖的，可以調弦，也可以暖手。',
    rationale: '調弦少一點心，升級一張牌。暖手補心。看牌組和身體哪一個更需要。',
    eligibility: [[{ op: 'damaged' }], [{ op: 'upgradeable', count: 1 }]],
    choices: [
      choice('tune', '調弦', [loseHp(7), { op: 'upgrade', count: 1 }], [loseHp(10), { op: 'upgrade', count: 1 }]),
      choice('warm', '暖暖手', [heal(10)], [heal(7)]),
      leave(),
    ],
  },
  {
    id: 'event_a2_broken_bridge',
    act: 2,
    title: '斷掉的音橋',
    icon: '🌉',
    presentation: '前面的橋斷了。可以跳，也可以修。',
    rationale: '跳過去少比較多的心，換一大筆金幣。修橋花金幣，升級一張牌。繞路沒有獎懲。',
    eligibility: [
      [{ op: 'hpAtLeast', amount: 9 }],
      [{ op: 'goldAtLeast', amount: 40 }, { op: 'upgradeable', count: 1 }],
    ],
    choices: [
      choice('jump', '跳過去', [loseHp(8), gold(60)], [loseHp(11), gold(50)]),
      choice('repair', '修橋', [pay(40), { op: 'upgrade', count: 1 }], [pay(50), { op: 'upgrade', count: 1 }], [{ op: 'upgradeable', count: 1 }]),
      leave('繞路離開'),
    ],
  },
  {
    id: 'event_a2_echo_market',
    act: 2,
    title: '回音小集',
    icon: '🎪',
    presentation: '小集上可以買兩張牌，或換兩張舊的。',
    rationale: '買一對花金幣，拿兩張不同的進階牌。交換花少一點金幣，把兩張牌改成新的。',
    eligibility: [[{ op: 'goldAtLeast', amount: 60 }], [{ op: 'removable', count: 2 }]],
    choices: [
      choice(
        'buy',
        '買一對',
        [pay(60), { op: 'gainCard', rarity: 'uncommon', count: 2, distinct: true }],
        [pay(75), { op: 'gainCard', rarity: 'uncommon', count: 2, distinct: true }],
      ),
      choice(
        'trade',
        '交換',
        [pay(25), { op: 'transform', count: 2 }],
        [pay(35), { op: 'transform', count: 2 }],
        [{ op: 'removable', count: 2 }],
      ),
      leave(),
    ],
  },
  {
    id: 'event_a2_moth_rehearsal',
    act: 2,
    title: '鐘蛾彩排',
    icon: '🦋',
    presentation: '鐘粉蛾在彩排，可以加入，也可以拍手。',
    rationale: '加入彩排要打一場，贏了才拿遺物，沒有一般戰鬥的金幣和選牌。拍手花一點金幣補心。',
    eligibility: [[{ op: 'relicAvailable', rarity: 'uncommon' }]],
    choices: [
      choice(
        'join',
        '加入彩排',
        [{ op: 'fight', encounterId: 'eventBellPair', reward: [{ op: 'gainRandomRelic', rarity: 'uncommon' }] }],
        [{ op: 'fight', encounterId: 'eventBellTrio', reward: [{ op: 'gainRandomRelic', rarity: 'uncommon' }] }],
      ),
      choice('clap', '拍拍手', [pay(5), heal(5)], [pay(10), heal(4)]),
      leave(),
    ],
  },
  {
    id: 'event_a2_glass_fork',
    act: 2,
    title: '月光音樂盒',
    icon: '🌙',
    presentation: '音樂盒可以收好，也可以拆開。',
    rationale: '收好會少一點最大心，並綁定一張牌。那張牌每場第一次拼對就抽一張。拆開拿金幣，也得到失聲。',
    eligibility: [[{ op: 'notOwned', relicId: 'moonMusicBox' }, { op: 'bindable' }]],
    choices: [
      choice(
        'keep',
        '收好',
        [maxLoss(4), { op: 'gainRelic', relicId: 'moonMusicBox' }, { op: 'bind' }],
        [maxLoss(5), { op: 'gainRelic', relicId: 'moonMusicBox' }, { op: 'bind' }],
        [{ op: 'bindable' }],
      ),
      choice('open', '拆開', [gold(80), { op: 'gainCurse', curseId: 'cu_silence' }], [gold(65), { op: 'gainCurse', curseId: 'cu_silence' }]),
      leave(),
    ],
  },
  {
    id: 'event_a2_dripping_rhythm',
    act: 2,
    title: '滴滴節拍',
    icon: '💧',
    presentation: '水滴打著拍子。可以接住，也可以拿來洗牌。',
    rationale: '接住少一點心，想裝兩瓶藥水。藥水還沒到時這個鈕會說明。洗牌把一張牌換成另一張。',
    eligibility: [[{ op: 'potionSlots', count: 2 }], [{ op: 'removable', count: 1 }]],
    choices: [
      choice('catch', '接住', [loseHp(4), { op: 'gainPotion', count: 2 }], [loseHp(6), { op: 'gainPotion', count: 2 }]),
      choice('wash', '洗牌', [{ op: 'transform', count: 1 }], [pay(10), { op: 'transform', count: 1 }]),
      leave(),
    ],
  },
  {
    id: 'event_a2_silent_classroom',
    act: 2,
    title: '寧靜教室',
    icon: '🏫',
    presentation: '教室很安靜。可以學習、整理，或午睡。',
    rationale: '學習少一點心，升級一張技能。整理拿掉一張詛咒。午睡補心。沒有的選擇會說明原因。',
    eligibility: [
      [{ op: 'upgradeable', count: 1, cardType: 'skill' }],
      [{ op: 'removableCurse' }],
      [{ op: 'damaged' }],
    ],
    choices: [
      choice(
        'study',
        '學習',
        [loseHp(5), { op: 'upgrade', count: 1, cardType: 'skill' }],
        [loseHp(7), { op: 'upgrade', count: 1, cardType: 'skill' }],
        [{ op: 'upgradeable', count: 1, cardType: 'skill' }],
      ),
      choice(
        'tidy',
        '整理',
        [{ op: 'remove', count: 1, curseOnly: true }],
        [{ op: 'remove', count: 1, curseOnly: true }],
        [{ op: 'removableCurse' }],
      ),
      choice('nap', '午睡', [heal(7)], [heal(5)]),
      leave(),
    ],
  },
  {
    id: 'event_a3_static_crown',
    act: 3,
    title: '靜電雨聲筒',
    icon: '🌧️',
    presentation: '雨聲筒靜靜地亮著。',
    rationale: '收下會少一點最大心。沒有護盾時，怪物行動前先獲得 2 點護盾。導電少心，拿掉牌。',
    eligibility: [
      [{ op: 'notOwned', relicId: 'rainSoundTube' }],
      [{ op: 'hpAtLeast', amount: 11 }, { op: 'removable', count: 2 }],
    ],
    choices: [
      choice(
        'take',
        '收下',
        [maxLoss(3), { op: 'gainRelic', relicId: 'rainSoundTube' }],
        [maxLoss(4), { op: 'gainRelic', relicId: 'rainSoundTube' }],
        [{ op: 'notOwned', relicId: 'rainSoundTube' }],
      ),
      choice(
        'ground',
        '導電',
        [loseHp(10), { op: 'remove', count: 2 }],
        [loseHp(10), { op: 'remove', count: 1 }],
        [{ op: 'removable', count: 1 }],
      ),
      leave(),
    ],
  },
  {
    id: 'event_a3_mirror_stage',
    act: 3,
    title: '鏡子舞台',
    icon: '🪞',
    presentation: '鏡子裡有另一張一樣的牌。',
    rationale: '模仿少一點心，複製一張不是基礎牌的牌，複本沒有升級。轉身把兩張牌換成新的。',
    eligibility: [[{ op: 'nonBasic' }], [{ op: 'removable', count: 2 }]],
    choices: [
      choice('mimic', '模仿', [loseHp(6), { op: 'copy' }], [loseHp(9), { op: 'copy' }], [{ op: 'nonBasic' }]),
      choice(
        'turn',
        '轉身',
        [{ op: 'transform', count: 2 }],
        [{ op: 'transform', count: 2 }, { op: 'gainCurse', curseId: 'cu_stage_fright' }],
        [{ op: 'removable', count: 2 }],
      ),
      leave(),
    ],
  },
  {
    id: 'event_a3_last_rehearsal',
    act: 3,
    title: '最後彩排',
    icon: '🎭',
    presentation: '上台前可以再練一次，或先睡飽。',
    rationale: '練到底少很多心，把每一張還沒升級的基礎牌都升級。睡到飽補心，但會得到兩張失聲。',
    eligibility: [[{ op: 'unupgradedBasic' }], [{ op: 'damaged' }]],
    choices: [
      choice(
        'practice',
        '練到底',
        [loseHp(15), { op: 'upgrade', count: 1, allBasics: true }],
        [loseHp(18), { op: 'upgrade', count: 1, allBasics: true }],
        [{ op: 'unupgradedBasic' }],
      ),
      choice(
        'sleep',
        '睡到飽',
        [{ op: 'healFull' }, { op: 'gainCurse', curseId: 'cu_silence', count: 2 }],
        [{ op: 'healMissingPercent', percent: 75 }, { op: 'gainCurse', curseId: 'cu_silence', count: 2 }],
      ),
      leave(),
    ],
  },
  {
    id: 'event_a3_star_bell',
    act: 3,
    title: '星光鐘',
    icon: '🌟',
    presentation: '星光落在鐘上。',
    rationale: '接住星光少一點心，拿一張稀有牌。收集碎光拿金幣，也得到沉拍：抽到後下一回合少抽一張。',
    eligibility: [[{ op: 'unlocked', rarity: 'rare', count: 1 }]],
    choices: [
      choice('catch', '接住星光', [loseHp(8), { op: 'gainCard', rarity: 'rare', count: 1 }], [loseHp(11), { op: 'gainCard', rarity: 'rare', count: 1 }]),
      choice('gather', '收集碎光', [gold(75), { op: 'gainCurse', curseId: 'cu_heavy_beat' }], [gold(60), { op: 'gainCurse', curseId: 'cu_heavy_beat' }]),
      leave(),
    ],
  },
  {
    id: 'event_a3_backward_song',
    act: 3,
    title: '倒放的歌',
    icon: '⏪',
    presentation: '這首歌倒著唱，可以把牌改強，或把詛咒停掉。',
    rationale: '跟著唱會把一張牌換成另一張，而且新牌升級一次。按下停止只在有詛咒時出現，拿掉一張詛咒並少一點心。',
    eligibility: [[{ op: 'removable', count: 1 }]],
    choices: [
      choice('sing', '跟著唱', [{ op: 'transform', count: 1, upgradeResult: true }], [{ op: 'transform', count: 1 }]),
      choice(
        'stop',
        '按下停止',
        [{ op: 'remove', count: 1, curseOnly: true }, loseHp(6)],
        [{ op: 'remove', count: 1, curseOnly: true }, loseHp(9)],
        [{ op: 'removableCurse' }],
        true,
      ),
      leave(),
    ],
  },
  {
    id: 'event_a3_empty_audience',
    act: 3,
    title: '空空觀眾席',
    icon: '🎟️',
    presentation: '座位空空的。可以演奏，也可以找找金幣。',
    rationale: '演奏少心，最大心變長，這一幕的 Boss 第一回合多 1 點能量。找找座位只拿金幣。',
    eligibility: [[{ op: 'hpAtLeast', amount: 11 }]],
    choices: [
      choice(
        'perform',
        '演奏',
        [loseHp(10), maxGain(2), { op: 'bossEnergy', amount: 1 }],
        [loseHp(13), { op: 'bossEnergy', amount: 1 }],
      ),
      choice('search', '找找座位', [gold(40)], [gold(30)]),
      leave(),
    ],
  },
  {
    id: 'event_a3_roof_wind',
    act: 3,
    title: '塔頂長風',
    icon: '🌬️',
    presentation: '塔頂的風很大。可以練，也可以慢慢呼吸。',
    rationale: '迎風少比較多的心，升級兩張牌。慢慢呼吸補很多心。',
    eligibility: [[{ op: 'damaged' }], [{ op: 'upgradeable', count: 2 }]],
    choices: [
      choice('drill', '迎風練習', [loseHp(12), { op: 'upgrade', count: 2 }], [loseHp(16), { op: 'upgrade', count: 2 }]),
      choice('breathe', '慢慢呼吸', [heal(15)], [heal(10)]),
      leave(),
    ],
  },
  {
    id: 'event_shared_phonetic_shrine',
    act: 'shared',
    title: '注音神龕',
    icon: '🔤',
    presentation: '神龕想聽三題注音。',
    rationale: '練習三題都拼完後升級一張牌。每錯一題少一點心，錯到沒有心，這趟就先休息。許願只補心。',
    eligibility: [
      [{ op: 'upgradeable', count: 1 }, { op: 'hpAtLeast', amount: 10 }],
      [{ op: 'damaged' }],
    ],
    choices: [
      choice(
        'practice',
        '練習三題',
        [{ op: 'shrine', questions: 3, hpPerMiss: 2, then: [{ op: 'upgrade', count: 1 }] }],
        [{ op: 'shrine', questions: 3, hpPerMiss: 3, then: [{ op: 'upgrade', count: 1 }] }],
        [{ op: 'upgradeable', count: 1 }, { op: 'hpAtLeast', amount: 10 }],
      ),
      choice('wish', '安靜許願', [heal(6)], [heal(4)], [{ op: 'damaged' }]),
      leave(),
    ],
  },
  {
    id: 'event_shared_humming_well',
    act: 'shared',
    title: '哼唱井',
    icon: '🪣',
    presentation: '井裡有哼哼的回音。',
    rationale: '丟硬幣花金幣拿掉一張牌。靠近聽想得到一瓶藥水。藥水還沒到時會說原因。',
    eligibility: [
      [{ op: 'goldAtLeast', amount: 25 }, { op: 'removable', count: 1 }],
      [{ op: 'potionSlots', count: 1 }],
    ],
    choices: [
      choice('coin', '丟硬幣', [pay(25), { op: 'remove', count: 1 }], [pay(35), { op: 'remove', count: 1 }]),
      choice('listen', '趁近聽', [{ op: 'gainPotion', count: 1 }], [loseHp(2), { op: 'gainPotion', count: 1 }]),
      leave(),
    ],
  },
  {
    id: 'event_shared_traveling_luthier',
    act: 'shared',
    title: '旅行調音師',
    icon: '🪕',
    presentation: '調音師願意幫忙修理，也願意買舊譜。',
    rationale: '修理花金幣，升級一張牌再補一點心。賣舊譜拿掉一張牌，拿回一些金幣。',
    eligibility: [
      [{ op: 'goldAtLeast', amount: 50 }, { op: 'upgradeable', count: 1 }],
      [{ op: 'removable', count: 1 }],
    ],
    choices: [
      choice(
        'repair',
        '修理',
        [pay(50), { op: 'upgrade', count: 1 }, heal(5)],
        [pay(65), { op: 'upgrade', count: 1 }, heal(3)],
        [{ op: 'upgradeable', count: 1 }],
      ),
      choice('sell', '賣舊譜', [{ op: 'remove', count: 1 }, gold(20)], [{ op: 'remove', count: 1 }, gold(10)]),
      leave(),
    ],
  },
  {
    id: 'event_shared_memory_album',
    act: 'shared',
    title: '回憶相簿',
    icon: '📖',
    presentation: '相簿可以記住一張牌，或放下另一張。',
    rationale: '記住會複製一張不是基礎牌的牌，並少一點心。放下拿掉一張牌，也少一點心。',
    eligibility: [[{ op: 'nonBasic' }], [{ op: 'removable', count: 1 }]],
    choices: [
      choice('keep', '記住', [{ op: 'copy' }, loseHp(4)], [{ op: 'copy' }, loseHp(7)], [{ op: 'nonBasic' }]),
      choice('release', '放下', [{ op: 'remove', count: 1 }, loseHp(4)], [{ op: 'remove', count: 1 }, loseHp(7)]),
      leave(),
    ],
  },
  {
    id: 'event_shared_three_doors',
    act: 'shared',
    title: '三扇彩門',
    icon: '🚪',
    presentation: '三扇門把結果寫在門上。',
    rationale: '紅心補心，金幣拿金幣，星星少一點最大心換一張稀有牌。沒有驚喜。',
    eligibility: [[{ op: 'damaged' }], [{ op: 'unlocked', rarity: 'rare', count: 1 }]],
    choices: [
      choice('heart', '紅心門', [heal(12)], [heal(8)]),
      choice('coin', '金幣門', [gold(55)], [gold(40)]),
      choice('star', '星星門', [maxLoss(3), { op: 'gainCard', rarity: 'rare', count: 1 }], [maxLoss(4), { op: 'gainCard', rarity: 'rare', count: 1 }]),
      leave(),
    ],
  },
  {
    id: 'event_shared_tiny_conductor',
    act: 'shared',
    title: '小小合唱',
    icon: '🤝',
    presentation: '小小指揮想把緞帶交給你。',
    rationale: '買下緞帶後，每贏三場戰鬥補 5 點心。幫忙搬箱少一點心，拿金幣。',
    eligibility: [
      [{ op: 'goldAtLeast', amount: 60 }, { op: 'notOwned', relicId: 'choirRibbon' }],
      [{ op: 'hpAtLeast', amount: 6 }],
    ],
    choices: [
      choice(
        'buy',
        '買下緞帶',
        [pay(60), { op: 'gainRelic', relicId: 'choirRibbon' }],
        [pay(75), { op: 'gainRelic', relicId: 'choirRibbon' }],
        [{ op: 'notOwned', relicId: 'choirRibbon' }],
      ),
      choice('help', '幫忙搬箱', [loseHp(5), gold(45)], [loseHp(7), gold(35)]),
      leave(),
    ],
  },
  {
    id: 'event_shared_moon_gong',
    act: 'shared',
    title: '月光鑼',
    icon: '🌕',
    presentation: '月光鑼可以敲響，也可以擦亮。',
    rationale: '敲響拿一件稀有遺物，接下來兩場普通戰鬥的怪物最大心變多。擦亮只補心。',
    eligibility: [[{ op: 'relicAvailable', rarity: 'rare' }], [{ op: 'damaged' }]],
    choices: [
      choice(
        'ring',
        '敲響',
        [{ op: 'gainRandomRelic', rarity: 'rare' }, { op: 'futureNormalHp', percent: 20, fights: 2 }],
        [{ op: 'gainRandomRelic', rarity: 'rare' }, { op: 'futureNormalHp', percent: 30, fights: 2 }],
      ),
      choice('polish', '擦亮', [heal(8)], [heal(5)]),
      leave(),
    ],
  },
  {
    id: 'event_shared_resonant_anvil',
    act: 'shared',
    title: '共鳴鐵砧',
    icon: '⚒️',
    presentation: '鐵砧可以一起鍛造，或熔掉一張舊牌。',
    rationale: '一起鍛造少心，升級一張攻擊和一張技能。熔掉舊牌少少一點心，拿掉一張牌。',
    eligibility: [[{ op: 'upgradeablePair' }], [{ op: 'removable', count: 1 }]],
    choices: [
      choice('forge', '一起鍛造', [loseHp(8), { op: 'upgradePair' }], [loseHp(11), { op: 'upgradePair' }], [{ op: 'upgradeablePair' }]),
      choice('melt', '熔掉舊牌', [loseHp(4), { op: 'remove', count: 1 }], [loseHp(7), { op: 'remove', count: 1 }]),
      leave(),
    ],
  },
  {
    id: 'event_shared_quiet_library',
    act: 'shared',
    title: '靜音圖書室',
    icon: '📚',
    presentation: '圖書室有三本書，也可以關燈休息。',
    rationale: '選一本會看到攻擊、技能、能力各一張，可以拿一張，也可以不拿。關燈休息不拿牌，只補一點心。',
    eligibility: [[{ op: 'libraryReady' }]],
    choices: [
      choice('read', '選一本', [{ op: 'library', preferCommon: false }], [{ op: 'library', preferCommon: true }]),
      choice('rest', '關燈休息', [heal(4)], [heal(2)]),
      leave(),
    ],
  },
];

const BY_ID = new Map(EVENTS.map((event) => [event.id, event]));

export function getEvent(id: string): EventDef {
  const event = BY_ID.get(id);
  if (!event) throw new Error(`Unknown event ${id}`);
  return event;
}

export function eventsForAct(act: 1 | 2 | 3): EventDef[] {
  return EVENTS.filter((event) => event.act === act || event.act === 'shared');
}

export function actEvents(act: 1 | 2 | 3): EventDef[] {
  return EVENTS.filter((event) => event.act === act);
}

export function sharedEvents(): EventDef[] {
  return EVENTS.filter((event) => event.act === 'shared');
}

/**
 * Child-facing words for a missing-heart percent. The heal still uses the percent.
 * 100 or more is full, 50–99 is large, and below 50 is small.
 */
export function missingHeartChip(percent: number): string {
  if (percent >= 100) return '心補滿';
  if (percent >= 50) return '補很多心';
  return '補一點心';
}

/** Chip and result line. The stored percent still changes the next fights. */
export const STURDIER_MONSTERS_LINE = '接下來幾場，怪物比較壯';

function typeLabel(type: CardTypeGroup): string {
  if (type === 'attack') return '攻擊';
  if (type === 'skill') return '技能';
  return '能力';
}

function rarityLabel(rarity: EventRelicRarity): string {
  if (rarity === 'common') return '普通';
  if (rarity === 'uncommon') return '進階';
  return '稀有';
}

export function effectChips(effects: readonly EventEffect[], quizVerb: '拼' | '算' = '拼'): string[] {
  const chips: string[] = [];
  for (const effect of effects) {
    switch (effect.op) {
      case 'loseHp':
        chips.push(`-${effect.amount}❤️`);
        break;
      case 'heal':
        chips.push(`+${effect.amount}❤️`);
        break;
      case 'healFull':
        chips.push('❤️回滿');
        break;
      case 'healMissingPercent':
        chips.push(missingHeartChip(effect.percent));
        break;
      case 'gainMaxHp':
        chips.push(`+${effect.amount}最大❤️`);
        chips.push(`+${effect.amount}❤️`);
        break;
      case 'loseMaxHp':
        chips.push(`-${effect.amount}最大❤️`);
        break;
      case 'gainGold':
        chips.push(`+${effect.amount}🪙`);
        break;
      case 'payGold':
        chips.push(`-${effect.amount}🪙`);
        break;
      case 'upgrade':
        if (effect.allBasics) chips.push('基礎牌都升級');
        else if (effect.cardType) chips.push(`升級 ${effect.count} 張${typeLabel(effect.cardType)}`);
        else chips.push(`升級 ${effect.count} 張`);
        break;
      case 'upgradePair':
        chips.push('升級攻擊和技能');
        break;
      case 'remove':
        chips.push(effect.curseOnly ? `移除 ${effect.count} 張詛咒` : `移除 ${effect.count} 張`);
        break;
      case 'transform':
        chips.push(effect.upgradeResult ? `改寫 ${effect.count} 張並升級` : `改寫 ${effect.count} 張`);
        break;
      case 'gainCard':
        chips.push(`${rarityLabel(effect.rarity)}牌 ${effect.count} 張`);
        break;
      case 'copy':
        chips.push('複製 1 張');
        break;
      case 'gainRelic':
        chips.push('獲得 🎁遺物');
        break;
      case 'gainRandomRelic':
        chips.push(`獲得${rarityLabel(effect.rarity)}🎁`);
        break;
      case 'gainCurse':
        chips.push(`得到 ${curseName(effect.curseId)}${(effect.count ?? 1) > 1 ? ` ×${effect.count}` : ''}`);
        break;
      case 'gainPotion':
        chips.push(`藥水 ${effect.count} 瓶`);
        break;
      case 'bind':
        chips.push('綁定 1 張牌');
        break;
      case 'fight':
        chips.push('打一場');
        chips.push(...effectChips(effect.reward, quizVerb).map((chip) => `贏了${chip}`));
        break;
      case 'bossEnergy':
        chips.push(`Boss 第1回合 +${effect.amount}⚡`);
        break;
      case 'futureNormalHp':
        chips.push(STURDIER_MONSTERS_LINE);
        break;
      case 'shrine':
        chips.push(`${quizVerb} ${effect.questions} 題`);
        chips.push(`錯一題 -${effect.hpPerMiss}❤️`);
        chips.push(...effectChips(effect.then, quizVerb));
        break;
      case 'library':
        chips.push('三張牌選 1 張');
        break;
      default: {
        const neverEffect: never = effect;
        void neverEffect;
      }
    }
  }
  return chips;
}
