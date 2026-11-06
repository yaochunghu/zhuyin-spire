import {
  ACT_PLACE_NAMES,
  CLIMB_ROWS,
  TOWER_SUMMIT_NAME,
  UPPER_FIRST_ROW,
  findNode,
  type MapNode,
  type NodeKind,
} from '../data/map';
import { ABACUS_CARDS } from '../data/abacusCards';
import { RELICS } from '../data/relics';
import type { RunState, Screen } from '../game/state';

export type ArtAssetKey =
  | 'sceneGarden'
  | 'sceneLibrary'
  | 'sceneObservatory'
  | 'sceneGardenUpper'
  | 'sceneGardenBoss'
  | 'sceneGardenCamp'
  | 'sceneGardenShop'
  | 'sceneLibraryUpper'
  | 'sceneLibraryBoss'
  | 'sceneLibraryCamp'
  | 'sceneLibraryShop'
  | 'sceneObservatoryUpper'
  | 'sceneObservatoryBoss'
  | 'sceneObservatoryCamp'
  | 'sceneObservatoryShop'
  | 'sceneHeartCamp'
  | 'sceneHeartShop'
  | 'sceneHeartRehearsal'
  | 'sceneHeartBoss'
  | 'sceneHeartBossOpen'
  | 'sceneFoyer'
  | 'sceneEventWhisperingDoor'
  | 'sceneEventTuningFountain'
  | 'sceneEventLostMetronome'
  | 'sceneEventBellRope'
  | 'sceneEventDustyScore'
  | 'sceneEventSleepingChime'
  | 'sceneEventLanternChoir'
  | 'sceneEventHeatedOrgan'
  | 'sceneEventBrokenBridge'
  | 'sceneEventEchoMarket'
  | 'sceneEventMothRehearsal'
  | 'sceneEventMoonMusicBox'
  | 'sceneEventDrippingRhythm'
  | 'sceneEventSilentClassroom'
  | 'sceneEventRainTube'
  | 'sceneEventMirrorStage'
  | 'sceneEventLastRehearsal'
  | 'sceneEventStarBell'
  | 'sceneEventBackwardSong'
  | 'sceneEventEmptyAudience'
  | 'sceneEventWindHall'
  | 'sceneEventPhoneticShrine'
  | 'sceneEventHummingWell'
  | 'sceneEventLuthier'
  | 'sceneEventMemoryAlbum'
  | 'sceneEventThreeDoors'
  | 'sceneEventTinyConductor'
  | 'sceneEventMoonGong'
  | 'sceneEventResonantAnvil'
  | 'sceneEventQuietLibrary'
  | 'transitionGardenLibrary'
  | 'transitionLibraryObservatory'
  | 'heroBeadFighter'
  | 'heroBeadFighterScuffed'
  | 'heroBeadFighterBeaten'
  | 'heroMartialArtist'
  | 'heroMartialArtistScuffed'
  | 'heroMartialArtistBeaten'
  | 'heroMartialArtistAttack'
  | 'heroMartialArtistCast'
  | 'heroMartialArtistDefend'
  | 'heroMartialArtistHurt'
  | 'heroMartialArtistFaint'
  | 'enemySlime'
  | 'enemyRock'
  | 'enemyBat'
  | 'enemyEmber'
  | 'enemyFang'
  | 'enemyFangSoft'
  | 'enemyArmor'
  | 'enemySpike'
  | 'enemyFangHard'
  | 'enemyToad'
  | 'enemyWraith'
  | 'enemyOwl'
  | 'enemyCrystal'
  | 'enemyEliteArmor'
  | 'enemyEliteBee'
  | 'enemyEliteBoom'
  | 'enemyEliteStorm'
  | 'enemyEliteShadow'
  | 'enemyEchoBug'
  | 'enemyDrumlet'
  | 'enemyBellMoth'
  | 'enemyDustDrum'
  | 'enemyNoteWisp'
  | 'enemyLittleConductor'
  | 'enemyBellWisp'
  | 'enemyMirrorNote'
  | 'enemyCrownBell'
  | 'enemyStarWisp'
  | 'enemyEliteChorus'
  | 'enemyEliteConductor'
  | 'enemyEliteMuteDrum'
  | 'enemyElitePrism'
  | 'enemyEliteStarCaller'
  | 'enemyBoss1'
  | 'enemyBoss2'
  | 'enemyBoss3'
  | 'enemyBoss1Scuffed'
  | 'enemyBoss1Beaten'
  | 'enemyBoss2Scuffed'
  | 'enemyBoss2Beaten'
  | 'enemyBoss3Scuffed'
  | 'enemyBoss3Beaten'
  | 'enemyTempoGolemScuffed'
  | 'enemyTempoGolemBeaten'
  | 'tokenGarden'
  | 'tokenLibrary'
  | 'tokenObservatory'
  | 'tokenHeart'
  | 'propBlossom'
  | 'propLantern'
  | 'propBooks'
  | 'propTelescope';

export type VisualTheme = 'foyer' | 'garden' | 'library' | 'observatory' | 'heart';

export interface ArtAsset {
  src: string;
  fallback: string;
  alt: string;
}

export const ART_ASSETS = {
  sceneGarden: {
    src: new URL('../assets/art/act-garden.webp', import.meta.url).href,
    fallback: '🌿',
    alt: `${ACT_PLACE_NAMES[0]}塔樓房間`,
  },
  sceneLibrary: {
    src: new URL('../assets/art/act-library.webp', import.meta.url).href,
    fallback: '📚',
    alt: `${ACT_PLACE_NAMES[1]}塔樓房間`,
  },
  sceneObservatory: {
    src: new URL('../assets/art/act-observatory.webp', import.meta.url).href,
    fallback: '🔭',
    alt: `${ACT_PLACE_NAMES[2]}塔樓房間`,
  },
  // Backdrops are CSS backgrounds (see sceneKeysFor); alt is for the registry only.
  sceneGardenUpper: {
    src: new URL('../assets/art/backdrops/act-garden-upper.webp', import.meta.url).href,
    fallback: '🌿',
    alt: `${ACT_PLACE_NAMES[0]}塔樓上層房間`,
  },
  sceneGardenBoss: {
    src: new URL('../assets/art/backdrops/act-garden-boss.webp', import.meta.url).href,
    fallback: '🌿',
    alt: `${ACT_PLACE_NAMES[0]}塔樓頂層房間`,
  },
  sceneGardenCamp: {
    src: new URL('../assets/art/backdrops/scene-garden-camp.webp', import.meta.url).href,
    fallback: '🔥',
    alt: `${ACT_PLACE_NAMES[0]}營火房間`,
  },
  sceneGardenShop: {
    src: new URL('../assets/art/backdrops/scene-garden-shop.webp', import.meta.url).href,
    fallback: '🏪',
    alt: `${ACT_PLACE_NAMES[0]}商店房間`,
  },
  sceneLibraryUpper: {
    src: new URL('../assets/art/backdrops/act-library-upper.webp', import.meta.url).href,
    fallback: '📚',
    alt: `${ACT_PLACE_NAMES[1]}塔樓上層房間`,
  },
  sceneLibraryBoss: {
    src: new URL('../assets/art/backdrops/act-library-boss.webp', import.meta.url).href,
    fallback: '📚',
    alt: `${ACT_PLACE_NAMES[1]}塔樓頂層房間`,
  },
  sceneLibraryCamp: {
    src: new URL('../assets/art/backdrops/scene-library-camp.webp', import.meta.url).href,
    fallback: '🔥',
    alt: `${ACT_PLACE_NAMES[1]}營火房間`,
  },
  sceneLibraryShop: {
    src: new URL('../assets/art/backdrops/scene-library-shop.webp', import.meta.url).href,
    fallback: '🏪',
    alt: `${ACT_PLACE_NAMES[1]}商店房間`,
  },
  sceneObservatoryUpper: {
    src: new URL('../assets/art/backdrops/act-observatory-upper.webp', import.meta.url).href,
    fallback: '🔭',
    alt: `${ACT_PLACE_NAMES[2]}塔樓上層房間`,
  },
  sceneObservatoryBoss: {
    src: new URL('../assets/art/backdrops/act-observatory-boss.webp', import.meta.url).href,
    fallback: '🔭',
    alt: `${ACT_PLACE_NAMES[2]}塔樓頂層房間`,
  },
  sceneObservatoryCamp: {
    src: new URL('../assets/art/backdrops/scene-observatory-camp.webp', import.meta.url).href,
    fallback: '🔥',
    alt: `${ACT_PLACE_NAMES[2]}營火房間`,
  },
  sceneObservatoryShop: {
    src: new URL('../assets/art/backdrops/scene-observatory-shop.webp', import.meta.url).href,
    fallback: '🏪',
    alt: `${ACT_PLACE_NAMES[2]}商店房間`,
  },
  sceneHeartCamp: {
    src: new URL('../assets/art/backdrops/act-heart-camp.webp', import.meta.url).href,
    fallback: '🔥',
    alt: `${TOWER_SUMMIT_NAME}營火房間`,
  },
  sceneHeartShop: {
    src: new URL('../assets/art/backdrops/act-heart-shop.webp', import.meta.url).href,
    fallback: '🏪',
    alt: `${TOWER_SUMMIT_NAME}商店房間`,
  },
  sceneHeartRehearsal: {
    src: new URL('../assets/art/backdrops/act-heart-rehearsal.webp', import.meta.url).href,
    fallback: '🎼',
    alt: `${TOWER_SUMMIT_NAME}彩排房間`,
  },
  sceneHeartBoss: {
    src: new URL('../assets/art/backdrops/act-heart-boss.webp', import.meta.url).href,
    fallback: '💎',
    alt: `${TOWER_SUMMIT_NAME}水晶圓頂`,
  },
  sceneHeartBossOpen: {
    src: new URL('../assets/art/backdrops/scene-heart-boss-victory.webp', import.meta.url).href,
    fallback: '💎',
    alt: `${TOWER_SUMMIT_NAME}打開的塔頂門`,
  },
  sceneFoyer: {
    src: new URL('../assets/art/backdrops/foyer.webp', import.meta.url).href,
    fallback: '🏮',
    alt: '塔樓大廳',
  },
  sceneEventWhisperingDoor: {
    src: new URL('../assets/art/backdrops/scene-event-whispering-door.webp', import.meta.url).href,
    fallback: '❓',
    alt: '和聲門房間',
  },
  sceneEventTuningFountain: {
    src: new URL('../assets/art/backdrops/scene-event-tuning-fountain.webp', import.meta.url).href,
    fallback: '❓',
    alt: '調音噴泉房間',
  },
  sceneEventLostMetronome: {
    src: new URL('../assets/art/backdrops/scene-event-lost-metronome.webp', import.meta.url).href,
    fallback: '❓',
    alt: '迷路的節拍器房間',
  },
  sceneEventBellRope: {
    src: new URL('../assets/art/backdrops/scene-event-bell-rope.webp', import.meta.url).href,
    fallback: '❓',
    alt: '低垂的鐘繩房間',
  },
  sceneEventDustyScore: {
    src: new URL('../assets/art/backdrops/scene-event-dusty-score.webp', import.meta.url).href,
    fallback: '❓',
    alt: '灰塵樂譜房間',
  },
  sceneEventSleepingChime: {
    src: new URL('../assets/art/backdrops/scene-event-sleeping-chime.webp', import.meta.url).href,
    fallback: '❓',
    alt: '睡著的風鈴房間',
  },
  sceneEventLanternChoir: {
    src: new URL('../assets/art/backdrops/scene-event-lantern-choir.webp', import.meta.url).href,
    fallback: '❓',
    alt: '燈籠合唱房間',
  },
  sceneEventHeatedOrgan: {
    src: new URL('../assets/art/backdrops/scene-event-heated-organ.webp', import.meta.url).href,
    fallback: '❓',
    alt: '發熱風琴房間',
  },
  sceneEventBrokenBridge: {
    src: new URL('../assets/art/backdrops/scene-event-broken-bridge.webp', import.meta.url).href,
    fallback: '❓',
    alt: '斷掉的音橋房間',
  },
  sceneEventEchoMarket: {
    src: new URL('../assets/art/backdrops/scene-event-echo-market.webp', import.meta.url).href,
    fallback: '❓',
    alt: '回音小集房間',
  },
  sceneEventMothRehearsal: {
    src: new URL('../assets/art/backdrops/scene-event-moth-rehearsal.webp', import.meta.url).href,
    fallback: '❓',
    alt: '鐘蛾彩排房間',
  },
  sceneEventMoonMusicBox: {
    src: new URL('../assets/art/backdrops/scene-event-moon-music-box.webp', import.meta.url).href,
    fallback: '❓',
    alt: '月光音樂盒房間',
  },
  sceneEventDrippingRhythm: {
    src: new URL('../assets/art/backdrops/scene-event-dripping-rhythm.webp', import.meta.url).href,
    fallback: '❓',
    alt: '滴滴節拍房間',
  },
  sceneEventSilentClassroom: {
    src: new URL('../assets/art/backdrops/scene-event-silent-classroom.webp', import.meta.url).href,
    fallback: '❓',
    alt: '寧靜教室房間',
  },
  sceneEventRainTube: {
    src: new URL('../assets/art/backdrops/scene-event-rain-tube.webp', import.meta.url).href,
    fallback: '❓',
    alt: '靜電雨聲筒房間',
  },
  sceneEventMirrorStage: {
    src: new URL('../assets/art/backdrops/scene-event-mirror-stage.webp', import.meta.url).href,
    fallback: '❓',
    alt: '鏡子舞臺房間',
  },
  sceneEventLastRehearsal: {
    src: new URL('../assets/art/backdrops/scene-event-last-rehearsal.webp', import.meta.url).href,
    fallback: '❓',
    alt: '最後彩排房間',
  },
  sceneEventStarBell: {
    src: new URL('../assets/art/backdrops/scene-event-star-bell.webp', import.meta.url).href,
    fallback: '❓',
    alt: '星光鐘房間',
  },
  sceneEventBackwardSong: {
    src: new URL('../assets/art/backdrops/scene-event-backward-song.webp', import.meta.url).href,
    fallback: '❓',
    alt: '倒放的歌房間',
  },
  sceneEventEmptyAudience: {
    src: new URL('../assets/art/backdrops/scene-event-empty-audience.webp', import.meta.url).href,
    fallback: '❓',
    alt: '空空觀眾席房間',
  },
  sceneEventWindHall: {
    src: new URL('../assets/art/backdrops/scene-event-wind-hall.webp', import.meta.url).href,
    fallback: '❓',
    alt: '塔頂長風房間',
  },
  sceneEventPhoneticShrine: {
    src: new URL('../assets/art/backdrops/scene-event-phonetic-shrine.webp', import.meta.url).href,
    fallback: '❓',
    alt: '注音神龕房間',
  },
  sceneEventHummingWell: {
    src: new URL('../assets/art/backdrops/scene-event-humming-well.webp', import.meta.url).href,
    fallback: '❓',
    alt: '哼唱井房間',
  },
  sceneEventLuthier: {
    src: new URL('../assets/art/backdrops/scene-event-luthier.webp', import.meta.url).href,
    fallback: '❓',
    alt: '旅行調音師房間',
  },
  sceneEventMemoryAlbum: {
    src: new URL('../assets/art/backdrops/scene-event-memory-album.webp', import.meta.url).href,
    fallback: '❓',
    alt: '回憶相簿房間',
  },
  sceneEventThreeDoors: {
    src: new URL('../assets/art/backdrops/scene-event-three-doors.webp', import.meta.url).href,
    fallback: '❓',
    alt: '三扇彩門房間',
  },
  sceneEventTinyConductor: {
    src: new URL('../assets/art/backdrops/scene-event-tiny-conductor.webp', import.meta.url).href,
    fallback: '❓',
    alt: '小小合唱房間',
  },
  sceneEventMoonGong: {
    src: new URL('../assets/art/backdrops/scene-event-moon-gong.webp', import.meta.url).href,
    fallback: '❓',
    alt: '月光鑼房間',
  },
  sceneEventResonantAnvil: {
    src: new URL('../assets/art/backdrops/scene-event-resonant-anvil.webp', import.meta.url).href,
    fallback: '❓',
    alt: '共鳴鐵砧房間',
  },
  sceneEventQuietLibrary: {
    src: new URL('../assets/art/backdrops/scene-event-quiet-library.webp', import.meta.url).href,
    fallback: '❓',
    alt: '靜音圖書室房間',
  },
  transitionGardenLibrary: {
    src: new URL(
      '../assets/art/transitions/garden-to-library.webp',
      import.meta.url,
    ).href,
    fallback: '🌿📚',
    alt: `${ACT_PLACE_NAMES[0]}樹根變成${ACT_PLACE_NAMES[1]}書架的塔樓場景`,
  },
  transitionLibraryObservatory: {
    src: new URL(
      '../assets/art/transitions/library-to-observatory.webp',
      import.meta.url,
    ).href,
    fallback: '📚🔭',
    alt: `${ACT_PLACE_NAMES[1]}書架變成${ACT_PLACE_NAMES[2]}的塔樓場景`,
  },
  heroBeadFighter: {
    src: new URL('../assets/art/hero-bead-fighter.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '琉玩具角色',
  },
  heroBeadFighterScuffed: {
    src: new URL('../assets/art/hero-bead-fighter-scuffed.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '有點累的琉玩具角色',
  },
  heroBeadFighterBeaten: {
    src: new URL('../assets/art/hero-bead-fighter-beaten.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '很累的琉玩具角色',
  },
  heroMartialArtist: {
    src: new URL('../assets/art/hero-martial-artist.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '共鳴武者玩具角色',
  },
  // Damage stages and combat poses share the idle's 512² canvas (feet y=492),
  // so they swap in the same box with no offset. See src/ui/damageStage.ts.
  heroMartialArtistScuffed: {
    src: new URL('../assets/art/hero-martial-artist-scuffed.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '有點累的共鳴武者玩具角色',
  },
  heroMartialArtistBeaten: {
    src: new URL('../assets/art/hero-martial-artist-beaten.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '很累的共鳴武者玩具角色',
  },
  heroMartialArtistAttack: {
    src: new URL('../assets/art/hero-martial-artist-attack.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '出拳的共鳴武者玩具角色',
  },
  heroMartialArtistCast: {
    src: new URL('../assets/art/hero-martial-artist-cast.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '施展招式的共鳴武者玩具角色',
  },
  heroMartialArtistDefend: {
    src: new URL('../assets/art/hero-martial-artist-defend.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '舉手防守的共鳴武者玩具角色',
  },
  heroMartialArtistHurt: {
    src: new URL('../assets/art/hero-martial-artist-hurt.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '被打到的共鳴武者玩具角色',
  },
  heroMartialArtistFaint: {
    src: new URL('../assets/art/hero-martial-artist-faint.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '累倒休息的共鳴武者玩具角色',
  },
  enemySlime: {
    src: new URL('../assets/art/enemy-slime.webp', import.meta.url).href,
    fallback: '🟢',
    alt: '綠色史萊姆玩具怪物',
  },
  enemyRock: {
    src: new URL('../assets/art/enemies/rock.webp', import.meta.url).href,
    fallback: '🪨',
    alt: '長著青苔的小石怪玩具',
  },
  enemyBat: {
    src: new URL('../assets/art/enemies/bat.webp', import.meta.url).href,
    fallback: '🦇',
    alt: '紫色小蝙蝠玩具',
  },
  enemyEmber: {
    src: new URL('../assets/art/enemies/ember.webp', import.meta.url).href,
    fallback: '🔥',
    alt: '黃銅火盆裡的小火苗玩具',
  },
  enemyFang: {
    src: new URL('../assets/art/enemies/fang.webp', import.meta.url).href,
    fallback: '🦷',
    alt: '戴紅圍巾的尖牙怪玩具',
  },
  enemyFangSoft: {
    src: new URL('../assets/art/enemies/fang-soft.webp', import.meta.url).href,
    fallback: '🦷',
    alt: '戴綠圍巾的小尖牙玩具',
  },
  enemyArmor: {
    src: new URL('../assets/art/enemies/armor.webp', import.meta.url).href,
    fallback: '🛡️',
    alt: '藍灰色盔甲怪玩具',
  },
  enemySpike: {
    src: new URL('../assets/art/enemies/spike.webp', import.meta.url).href,
    fallback: '🌵',
    alt: '紫色尖刺怪玩具',
  },
  enemyFangHard: {
    src: new URL('../assets/art/enemies/fang-hard.webp', import.meta.url).href,
    fallback: '🦷',
    alt: '戴紫圍巾的兇尖牙怪玩具',
  },
  enemyToad: {
    src: new URL('../assets/art/enemies/toad.webp', import.meta.url).href,
    fallback: '🐸',
    alt: '青綠色毒蛙玩具',
  },
  enemyWraith: {
    src: new URL('../assets/art/enemies/wraith.webp', import.meta.url).href,
    fallback: '👻',
    alt: '戴月牙面具的幽影玩具',
  },
  enemyOwl: {
    src: new URL('../assets/art/enemies/owl.webp', import.meta.url).href,
    fallback: '🦉',
    alt: '拿著星圖的夜梟玩具',
  },
  enemyCrystal: {
    src: new URL('../assets/art/enemies/crystal.webp', import.meta.url).href,
    fallback: '💠',
    alt: '藍紫色晶盾怪玩具',
  },
  enemyEliteArmor: {
    src: new URL('../assets/art/enemies/elite-armor.webp', import.meta.url).href,
    fallback: '🛡️',
    alt: '金色重甲守護玩具',
  },
  enemyEliteBee: {
    src: new URL('../assets/art/enemies/elite-bee.webp', import.meta.url).href,
    fallback: '🐝',
    alt: '拿著蜂巢盾牌的蜂刺菁英玩具',
  },
  enemyEliteBoom: {
    src: new URL('../assets/art/enemies/elite-boom.webp', import.meta.url).href,
    fallback: '💣',
    alt: '紅黑色發條爆裂菁英玩具',
  },
  enemyEliteStorm: {
    src: new URL('../assets/art/enemies/elite-storm.webp', import.meta.url).href,
    fallback: '⛈️',
    alt: '深藍色風暴菁英玩具',
  },
  enemyEliteShadow: {
    src: new URL('../assets/art/enemies/elite-shadow.webp', import.meta.url).href,
    fallback: '🌑',
    alt: '月蝕盔甲暗影菁英玩具',
  },
  enemyEchoBug: {
    src: new URL('../assets/art/enemies/echo-bug.webp', import.meta.url).href,
    fallback: '🐛',
    alt: '頂著葉子的綠色跟讀蟲玩具',
  },
  enemyDrumlet: {
    src: new URL('../assets/art/enemies/drumlet.webp', import.meta.url).href,
    fallback: '🥁',
    alt: '抱著小鼓的橡實鼓手玩具',
  },
  enemyBellMoth: {
    src: new URL('../assets/art/enemies/bell-moth.webp', import.meta.url).href,
    fallback: '🦋',
    alt: '翅膀上有鈴鐺花紋的鐘粉蛾玩具',
  },
  enemyDustDrum: {
    src: new URL('../assets/art/enemies/dust-drum.webp', import.meta.url).href,
    fallback: '🪘',
    alt: '飄著灰塵的塵鼓玩具',
  },
  enemyNoteWisp: {
    src: new URL('../assets/art/enemies/note-wisp.webp', import.meta.url).href,
    fallback: '🎵',
    alt: '會跳的小音符精靈玩具',
  },
  enemyLittleConductor: {
    src: new URL('../assets/art/enemies/little-conductor.webp', import.meta.url).href,
    fallback: '🎼',
    alt: '拿指揮棒的小指揮鳥玩具',
  },
  enemyBellWisp: {
    src: new URL('../assets/art/enemies/bell-wisp.webp', import.meta.url).href,
    fallback: '🔔',
    alt: '長翅膀的金色鐘音符玩具',
  },
  enemyMirrorNote: {
    src: new URL('../assets/art/enemies/mirror-note.webp', import.meta.url).href,
    fallback: '🪞',
    alt: '鏡子水晶做的鏡音玩具',
  },
  enemyCrownBell: {
    src: new URL('../assets/art/enemies/crown-bell.webp', import.meta.url).href,
    fallback: '🛎️',
    alt: '戴皇冠的深藍冠鐘玩具',
  },
  enemyStarWisp: {
    src: new URL('../assets/art/enemies/star-wisp.webp', import.meta.url).href,
    fallback: '⭐',
    alt: '愛睏的小星螢玩具',
  },
  enemyEliteChorus: {
    src: new URL('../assets/art/enemies/elite-chorus.webp', import.meta.url).href,
    fallback: '🐛',
    alt: '掛在樹枝上的和聲蛹菁英玩具',
  },
  enemyEliteConductor: {
    src: new URL('../assets/art/enemies/elite-conductor.webp', import.meta.url).href,
    fallback: '🦉',
    alt: '揮著指揮棒的樂團指揮菁英玩具',
  },
  enemyEliteMuteDrum: {
    src: new URL('../assets/art/enemies/elite-mute-drum.webp', import.meta.url).href,
    fallback: '🥁',
    alt: '愛睏的重甲慢拍鼓菁英玩具',
  },
  enemyElitePrism: {
    src: new URL('../assets/art/enemies/elite-prism.webp', import.meta.url).href,
    fallback: '💎',
    alt: '頭上有七色水晶的七音晶菁英玩具',
  },
  enemyEliteStarCaller: {
    src: new URL('../assets/art/enemies/elite-star-caller.webp', import.meta.url).href,
    fallback: '🌟',
    alt: '拿星星法杖的喚星使菁英玩具',
  },
  enemyBoss1: {
    src: new URL('../assets/art/enemies/boss-1.webp', import.meta.url).href,
    fallback: '🐉',
    alt: `背著${ACT_PLACE_NAMES[0]}塔樓的守護龍玩具`,
  },
  enemyBoss2: {
    src: new URL('../assets/art/enemies/boss-2.webp', import.meta.url).href,
    fallback: '🦅',
    alt: '拿著古書的雙翼監守玩具',
  },
  enemyBoss3: {
    src: new URL('../assets/art/enemies/boss-3.webp', import.meta.url).href,
    fallback: '👑',
    alt: '被星環包圍的終焉王玩具',
  },
  // Boss damage stages share each fresh boss canvas and ground line.
  enemyBoss1Scuffed: {
    src: new URL('../assets/art/enemies/boss-1-scuffed.webp', import.meta.url).href,
    fallback: '🐉',
    alt: `有點受傷的${ACT_PLACE_NAMES[0]}守護龍玩具`,
  },
  enemyBoss1Beaten: {
    src: new URL('../assets/art/enemies/boss-1-beaten.webp', import.meta.url).href,
    fallback: '🐉',
    alt: `快要撐不住的${ACT_PLACE_NAMES[0]}守護龍玩具`,
  },
  enemyBoss2Scuffed: {
    src: new URL('../assets/art/enemies/boss-2-scuffed.webp', import.meta.url).href,
    fallback: '🦅',
    alt: '有點受傷的雙翼監守玩具',
  },
  enemyBoss2Beaten: {
    src: new URL('../assets/art/enemies/boss-2-beaten.webp', import.meta.url).href,
    fallback: '🦅',
    alt: '快要撐不住的雙翼監守玩具',
  },
  enemyBoss3Scuffed: {
    src: new URL('../assets/art/enemies/boss-3-scuffed.webp', import.meta.url).href,
    fallback: '👑',
    alt: '有點受傷的終焉王玩具',
  },
  enemyBoss3Beaten: {
    src: new URL('../assets/art/enemies/boss-3-beaten.webp', import.meta.url).href,
    fallback: '👑',
    alt: '快要撐不住的終焉王玩具',
  },
  // Dormant: no TempoGolem enemy or fresh idle exists yet (768² canvas, ground y=740).
  enemyTempoGolemScuffed: {
    src: new URL('../assets/art/enemies/boss-tempoGolem-scuffed.webp', import.meta.url).href,
    fallback: '🗿',
    alt: '有點受傷的節拍石像玩具',
  },
  enemyTempoGolemBeaten: {
    src: new URL('../assets/art/enemies/boss-tempoGolem-beaten.webp', import.meta.url).href,
    fallback: '🗿',
    alt: '快要撐不住的節拍石像玩具',
  },
  tokenGarden: {
    src: new URL('../assets/art/token-garden.webp', import.meta.url).href,
    fallback: '🌿',
    alt: `${ACT_PLACE_NAMES[0]}房間圓牌`,
  },
  tokenLibrary: {
    src: new URL('../assets/art/token-library.webp', import.meta.url).href,
    fallback: '📚',
    alt: `${ACT_PLACE_NAMES[1]}房間圓牌`,
  },
  tokenObservatory: {
    src: new URL('../assets/art/token-observatory.webp', import.meta.url).href,
    fallback: '✨',
    alt: `${ACT_PLACE_NAMES[2]}房間圓牌`,
  },
  tokenHeart: {
    src: new URL('../assets/art/token-heart.webp', import.meta.url).href,
    fallback: '💎',
    alt: `${TOWER_SUMMIT_NAME}房間圓牌`,
  },
  propBlossom: {
    src: new URL('../assets/art/prop-blossom.webp', import.meta.url).href,
    fallback: '🌸',
    alt: '梅花玩具擺件',
  },
  propLantern: {
    src: new URL('../assets/art/prop-lantern.webp', import.meta.url).href,
    fallback: '🏮',
    alt: '點燈人的銅提燈',
  },
  propBooks: {
    src: new URL('../assets/art/prop-books.webp', import.meta.url).href,
    fallback: '📚',
    alt: '書卷玩具擺件',
  },
  propTelescope: {
    src: new URL('../assets/art/prop-telescope.webp', import.meta.url).href,
    fallback: '🔭',
    alt: '黃銅望遠鏡玩具擺件',
  },
} as const satisfies Record<ArtAssetKey, ArtAsset>;

/**
 * Painted relic faces. A relic missing from this map keeps its emoji.
 * Legacy shieldCharm, coinPouch, morningSpark, and luckyDraw stay emoji.
 */
export const RELIC_ART = {
  tuningFork: {
    src: new URL('../assets/art/relics/relic-tuning-fork.webp', import.meta.url).href,
    fallback: RELICS.tuningFork.emoji,
    alt: RELICS.tuningFork.name,
  },
  gapThumb: {
    src: new URL('../assets/art/relics/relic-gap-thumb.webp', import.meta.url).href,
    fallback: RELICS.gapThumb.emoji,
    alt: RELICS.gapThumb.name,
  },
  trainingWrap: {
    src: new URL('../assets/art/relics/relic-training-wrap.webp', import.meta.url).href,
    fallback: RELICS.trainingWrap.emoji,
    alt: RELICS.trainingWrap.name,
  },
  tempoWood: {
    src: new URL('../assets/art/relics/relic-tempo-wood.webp', import.meta.url).href,
    fallback: RELICS.tempoWood.emoji,
    alt: RELICS.tempoWood.name,
  },
  listeningHeart: {
    src: new URL('../assets/art/relics/relic-listening-heart.webp', import.meta.url).href,
    fallback: RELICS.listeningHeart.emoji,
    alt: RELICS.listeningHeart.name,
  },
  trainingStance: {
    src: new URL('../assets/art/relics/relic-training-stance.webp', import.meta.url).href,
    fallback: RELICS.trainingStance.emoji,
    alt: RELICS.trainingStance.name,
  },
  woodBeads: {
    src: new URL('../assets/art/relics/relic-wood-beads.webp', import.meta.url).href,
    fallback: RELICS.woodBeads.emoji,
    alt: RELICS.woodBeads.name,
  },
  beadPouch: {
    src: new URL('../assets/art/relics/relic-bead-pouch.webp', import.meta.url).href,
    fallback: RELICS.beadPouch.emoji,
    alt: RELICS.beadPouch.name,
  },
  rulerCharm: {
    src: new URL('../assets/art/relics/relic-ruler-charm.webp', import.meta.url).href,
    fallback: RELICS.rulerCharm.emoji,
    alt: RELICS.rulerCharm.name,
  },
  tenBell: {
    src: new URL('../assets/art/relics/relic-ten-bell.webp', import.meta.url).href,
    fallback: RELICS.tenBell.emoji,
    alt: RELICS.tenBell.name,
  },
  eraser: {
    src: new URL('../assets/art/relics/relic-eraser.webp', import.meta.url).href,
    fallback: RELICS.eraser.emoji,
    alt: RELICS.eraser.name,
  },
  pocketMetronome: {
    src: new URL('../assets/art/relics/relic-pocket-metronome.webp', import.meta.url).href,
    fallback: RELICS.pocketMetronome.emoji,
    alt: RELICS.pocketMetronome.name,
  },
  moonMusicBox: {
    src: new URL('../assets/art/relics/relic-moon-music-box.webp', import.meta.url).href,
    fallback: RELICS.moonMusicBox.emoji,
    alt: RELICS.moonMusicBox.name,
  },
  rainSoundTube: {
    src: new URL('../assets/art/relics/relic-rain-sound-tube.webp', import.meta.url).href,
    fallback: RELICS.rainSoundTube.emoji,
    alt: RELICS.rainSoundTube.name,
  },
  choirRibbon: {
    src: new URL('../assets/art/relics/relic-choir-ribbon.webp', import.meta.url).href,
    fallback: RELICS.choirRibbon.emoji,
    alt: RELICS.choirRibbon.name,
  },
} as const satisfies Record<string, ArtAsset>;

function abacusCardArt(cardId: string, src: string): ArtAsset {
  const card = ABACUS_CARDS[cardId];
  return { src, fallback: card.icon ?? '🃏', alt: card.name };
}

/**
 * Painted 4:3 card windows. The game still draws cost, type, 注音 and text
 * around and over the art. A card missing from CARD_ART_BY_CARD_ID keeps
 * its emoji face.
 */
export const CARD_ART = {
  cardAbM001: abacusCardArt(
    'ab_m001',
    new URL('../assets/art/cards/card-ab-m001.webp', import.meta.url).href,
  ),
  cardAbM002: abacusCardArt(
    'ab_m002',
    new URL('../assets/art/cards/card-ab-m002.webp', import.meta.url).href,
  ),
  cardAbM003: abacusCardArt(
    'ab_m003',
    new URL('../assets/art/cards/card-ab-m003.webp', import.meta.url).href,
  ),
  cardAbM004: abacusCardArt(
    'ab_m004',
    new URL('../assets/art/cards/card-ab-m004.webp', import.meta.url).href,
  ),
  cardAbM005: abacusCardArt(
    'ab_m005',
    new URL('../assets/art/cards/card-ab-m005.webp', import.meta.url).href,
  ),
  cardAbM006: abacusCardArt(
    'ab_m006',
    new URL('../assets/art/cards/card-ab-m006.webp', import.meta.url).href,
  ),
  cardAbM007: abacusCardArt(
    'ab_m007',
    new URL('../assets/art/cards/card-ab-m007.webp', import.meta.url).href,
  ),
  cardAbM008: abacusCardArt(
    'ab_m008',
    new URL('../assets/art/cards/card-ab-m008.webp', import.meta.url).href,
  ),
  cardAbM009: abacusCardArt(
    'ab_m009',
    new URL('../assets/art/cards/card-ab-m009.webp', import.meta.url).href,
  ),
} as const satisfies Record<string, ArtAsset>;

export type CardArtKey = keyof typeof CARD_ART;

export const CARD_ART_BY_CARD_ID: Readonly<Record<string, CardArtKey>> = {
  ab_m001: 'cardAbM001',
  ab_m002: 'cardAbM002',
  ab_m003: 'cardAbM003',
  ab_m004: 'cardAbM004',
  ab_m005: 'cardAbM005',
  ab_m006: 'cardAbM006',
  ab_m007: 'cardAbM007',
  ab_m008: 'cardAbM008',
  ab_m009: 'cardAbM009',
};

export function cardArtKeyFor(cardId: string): CardArtKey | null {
  return Object.prototype.hasOwnProperty.call(CARD_ART_BY_CARD_ID, cardId)
    ? CARD_ART_BY_CARD_ID[cardId]
    : null;
}

export const REQUIRED_ART_ASSET_KEYS = Object.freeze(
  Object.keys(ART_ASSETS) as ArtAssetKey[],
);

export type EnemyArtDefId =
  | 'tutorialSlime'
  | 'slimeWeak'
  | 'slime'
  | 'rock'
  | 'bat'
  | 'ember'
  | 'fang'
  | 'fangSoft'
  | 'armor'
  | 'spike'
  | 'fangHard'
  | 'toad'
  | 'wraith'
  | 'owl'
  | 'crystal'
  | 'echoBug'
  | 'drumlet'
  | 'bellMoth'
  | 'dustDrum'
  | 'noteWisp'
  | 'littleConductor'
  | 'bellWisp'
  | 'mirrorNote'
  | 'crownBell'
  | 'starWisp'
  | 'eliteArmor'
  | 'eliteBee'
  | 'eliteBoom'
  | 'eliteStorm'
  | 'eliteShadow'
  | 'eliteChorus'
  | 'eliteConductor'
  | 'eliteMuteDrum'
  | 'elitePrism'
  | 'eliteStarCaller'
  | 'boss1'
  | 'boss2'
  | 'boss3'
  | 'boss';

export const ENEMY_ART_BY_DEF_ID = {
  tutorialSlime: 'enemySlime',
  slimeWeak: 'enemySlime',
  slime: 'enemySlime',
  rock: 'enemyRock',
  bat: 'enemyBat',
  ember: 'enemyEmber',
  fang: 'enemyFang',
  fangSoft: 'enemyFangSoft',
  armor: 'enemyArmor',
  spike: 'enemySpike',
  fangHard: 'enemyFangHard',
  toad: 'enemyToad',
  wraith: 'enemyWraith',
  owl: 'enemyOwl',
  crystal: 'enemyCrystal',
  echoBug: 'enemyEchoBug',
  drumlet: 'enemyDrumlet',
  bellMoth: 'enemyBellMoth',
  dustDrum: 'enemyDustDrum',
  noteWisp: 'enemyNoteWisp',
  littleConductor: 'enemyLittleConductor',
  bellWisp: 'enemyBellWisp',
  mirrorNote: 'enemyMirrorNote',
  crownBell: 'enemyCrownBell',
  starWisp: 'enemyStarWisp',
  eliteArmor: 'enemyEliteArmor',
  eliteBee: 'enemyEliteBee',
  eliteBoom: 'enemyEliteBoom',
  eliteStorm: 'enemyEliteStorm',
  eliteShadow: 'enemyEliteShadow',
  eliteChorus: 'enemyEliteChorus',
  eliteConductor: 'enemyEliteConductor',
  eliteMuteDrum: 'enemyEliteMuteDrum',
  elitePrism: 'enemyElitePrism',
  eliteStarCaller: 'enemyEliteStarCaller',
  boss1: 'enemyBoss1',
  boss2: 'enemyBoss2',
  boss3: 'enemyBoss3',
  boss: 'enemyBoss1',
} as const satisfies Record<EnemyArtDefId, ArtAssetKey>;

export function enemyArtKeyFor(enemyDefId: string): ArtAssetKey | null {
  return (
    ENEMY_ART_BY_DEF_ID[enemyDefId as EnemyArtDefId] ??
    null
  );
}

export function actTransitionArtKeyFor(
  clearedAct: number,
): ArtAssetKey | null {
  if (clearedAct === 1) return 'transitionGardenLibrary';
  if (clearedAct === 2) return 'transitionLibraryObservatory';
  return null;
}

const ACT_THEMES = ['garden', 'library', 'observatory', 'heart'] as const;

const THEME_ASSETS: Record<
  Exclude<VisualTheme, 'foyer'>,
  { scene: ArtAssetKey; token: ArtAssetKey; prop: ArtAssetKey }
> = {
  garden: {
    scene: 'sceneGarden',
    token: 'tokenGarden',
    prop: 'propBlossom',
  },
  library: {
    scene: 'sceneLibrary',
    token: 'tokenLibrary',
    prop: 'propBooks',
  },
  observatory: {
    scene: 'sceneObservatory',
    token: 'tokenObservatory',
    prop: 'propTelescope',
  },
  // Act IV has no prop of its own yet; it borrows the observatory telescope.
  heart: {
    scene: 'sceneHeartBoss',
    token: 'tokenHeart',
    prop: 'propTelescope',
  },
};

const FOYER_SCREENS: ReadonlySet<Screen> = new Set([
  'title',
  'relicPick',
  'practice',
]);

export function visualThemeFor(screen: Screen, actIndex: number): VisualTheme {
  if (FOYER_SCREENS.has(screen)) return 'foyer';
  if (screen === 'victory') return 'heart';
  const index = Math.max(0, Math.min(ACT_THEMES.length - 1, actIndex));
  return ACT_THEMES[index]!;
}

/*
 * Backdrop routing. Each act room is lower (rows 0..UPPER_FIRST_ROW-1),
 * upper (UPPER_FIRST_ROW..14) or the boss chamber (row 15).
 * See docs/ART_INVENTORY.md "Which screen shows which backdrop".
 */

/** Fight launched from an event (鐘蛾彩排): 'eventRoom' keeps the event's room; 'floor' uses the floor scene. */
export const EVENT_FIGHT_SCENE: 'eventRoom' | 'floor' = 'eventRoom';
/** Map: 'nextRow' shows the floor the kid is about to enter (capped at upper); 'currentRow' shows the last room's floor. */
export const MAP_SCENE_ROW: 'nextRow' | 'currentRow' = 'nextRow';
/** Act clear: 'nextActLower' shows the act just reached; 'clearedActBoss' shows the boss chamber just cleared. */
export const ACT_CLEAR_SCENE: 'nextActLower' | 'clearedActBoss' = 'nextActLower';

const ACT_ROOMS = [
  { lower: 'sceneGarden', upper: 'sceneGardenUpper', boss: 'sceneGardenBoss', camp: 'sceneGardenCamp', shop: 'sceneGardenShop' },
  { lower: 'sceneLibrary', upper: 'sceneLibraryUpper', boss: 'sceneLibraryBoss', camp: 'sceneLibraryCamp', shop: 'sceneLibraryShop' },
  { lower: 'sceneObservatory', upper: 'sceneObservatoryUpper', boss: 'sceneObservatoryBoss', camp: 'sceneObservatoryCamp', shop: 'sceneObservatoryShop' },
] as const satisfies readonly Record<'lower' | 'upper' | 'boss' | 'camp' | 'shop', ArtAssetKey>[];

/** Act events have their own room; shared events use one act-neutral room. */
export const EVENT_SCENE_BY_ID: Readonly<Record<string, ArtAssetKey>> = {
  event_a1_whispering_door: 'sceneEventWhisperingDoor',
  event_a1_tuning_fountain: 'sceneEventTuningFountain',
  event_a1_lost_metronome: 'sceneEventLostMetronome',
  event_a1_bell_rope: 'sceneEventBellRope',
  event_a1_dusty_score: 'sceneEventDustyScore',
  event_a1_sleeping_chime: 'sceneEventSleepingChime',
  event_a1_lantern_choir: 'sceneEventLanternChoir',
  event_a2_heated_organ: 'sceneEventHeatedOrgan',
  event_a2_broken_bridge: 'sceneEventBrokenBridge',
  event_a2_echo_market: 'sceneEventEchoMarket',
  event_a2_moth_rehearsal: 'sceneEventMothRehearsal',
  event_a2_glass_fork: 'sceneEventMoonMusicBox',
  event_a2_dripping_rhythm: 'sceneEventDrippingRhythm',
  event_a2_silent_classroom: 'sceneEventSilentClassroom',
  event_a3_static_crown: 'sceneEventRainTube',
  event_a3_mirror_stage: 'sceneEventMirrorStage',
  event_a3_last_rehearsal: 'sceneEventLastRehearsal',
  event_a3_star_bell: 'sceneEventStarBell',
  event_a3_backward_song: 'sceneEventBackwardSong',
  event_a3_empty_audience: 'sceneEventEmptyAudience',
  event_a3_roof_wind: 'sceneEventWindHall',
  event_shared_phonetic_shrine: 'sceneEventPhoneticShrine',
  event_shared_humming_well: 'sceneEventHummingWell',
  event_shared_traveling_luthier: 'sceneEventLuthier',
  event_shared_memory_album: 'sceneEventMemoryAlbum',
  event_shared_three_doors: 'sceneEventThreeDoors',
  event_shared_tiny_conductor: 'sceneEventTinyConductor',
  event_shared_moon_gong: 'sceneEventMoonGong',
  event_shared_resonant_anvil: 'sceneEventResonantAnvil',
  event_shared_quiet_library: 'sceneEventQuietLibrary',
};

/** Saved run fields the backdrop reads. Nothing here is new save data. */
export type SceneState = Pick<
  RunState,
  'actIndex' | 'activeNodeId' | 'currentNodeId' | 'runMap'
> & {
  eventTrack: Pick<RunState['eventTrack'], 'resolutions' | 'active'>;
};

export type SceneRegistryHas = (key: ArtAssetKey) => boolean;

const registeredArt: SceneRegistryHas = (key) =>
  Object.prototype.hasOwnProperty.call(ART_ASSETS, key);

const CAMP_SCREENS: ReadonlySet<Screen> = new Set(['rest', 'smith', 'removeCard']);
const SHOP_SCREENS: ReadonlySet<Screen> = new Set(['shop', 'shopRemove']);
const EVENT_SCREENS: ReadonlySet<Screen> = new Set(['event', 'eventCast']);
const HEART_ACT_INDEX = 3;
const HEART_FALLBACK: ArtAssetKey[] = ['sceneHeartBoss', 'sceneObservatory'];
const HEART_ROOM_BY_KIND: Partial<Record<NodeKind, ArtAssetKey>> = {
  rest: 'sceneHeartCamp',
  shop: 'sceneHeartShop',
  elite: 'sceneHeartRehearsal',
  boss: 'sceneHeartBoss',
};

/** A node id from the run map, ignoring stale ids from another act. */
function actNode(state: SceneState, nodeId: string | null): MapNode | null {
  const node = findNode(state.runMap, nodeId);
  return node && node.act === state.actIndex + 1 ? node : null;
}

function mapRow(state: SceneState): number {
  const current = actNode(state, state.currentNodeId);
  if (MAP_SCENE_ROW === 'currentRow') return current?.row ?? 0;
  // The map never shows the boss chamber: row 14 → 15 stays upper.
  return Math.min(current ? current.row + 1 : 0, CLIMB_ROWS - 1);
}

function actChain(
  act: number,
  screen: Screen,
  state: SceneState,
): ArtAssetKey[] {
  const rooms = ACT_ROOMS[act]!;
  const floor = (row: number): ArtAssetKey[] =>
    row >= UPPER_FIRST_ROW ? [rooms.upper, rooms.lower] : [rooms.lower];

  if (screen === 'actClear' && ACT_CLEAR_SCENE === 'clearedActBoss' && act > 0) {
    const cleared = ACT_ROOMS[act - 1]!;
    return [cleared.boss, cleared.lower];
  }
  const node = screen === 'map' || screen === 'actClear'
    ? null
    : actNode(state, state.activeNodeId);
  if (!node) {
    // No room on record (should not happen in play): keep camp and shop in their rooms.
    const room = floor(mapRow(state));
    if (CAMP_SCREENS.has(screen)) return [rooms.camp, ...room];
    if (SHOP_SCREENS.has(screen)) return [rooms.shop, ...room];
    return room;
  }

  const room = floor(node.row);
  const resolution = node.kind === 'unknown'
    ? state.eventTrack.resolutions[node.id]
    : undefined;
  const eventId = state.eventTrack.active?.nodeId === node.id
    ? state.eventTrack.active.eventId
    : resolution?.eventId;
  const eventRoom = eventId ? EVENT_SCENE_BY_ID[eventId] : undefined;
  const eventChain = eventRoom ? [eventRoom, ...room] : room;

  if (CAMP_SCREENS.has(screen)) return [rooms.camp, ...room];
  if (SHOP_SCREENS.has(screen)) return [rooms.shop, ...room];
  if (EVENT_SCREENS.has(screen)) return eventChain;
  if (node.kind === 'boss') return [rooms.boss, rooms.lower];
  if (resolution?.outcome === 'event') {
    return EVENT_FIGHT_SCENE === 'eventRoom' ? eventChain : room;
  }
  return room;
}

function heartChain(screen: Screen, state: SceneState): ArtAssetKey[] {
  let node = screen === 'map' ? null : findNode(state.runMap, state.activeNodeId);
  if (!node) {
    // The map pictures the next room on the route; before the first room, the camp.
    const current = findNode(state.runMap, state.currentNodeId);
    node = current ? findNode(state.runMap, current.nextIds[0]) : null;
  }
  const room = CAMP_SCREENS.has(screen)
    ? 'sceneHeartCamp'
    : SHOP_SCREENS.has(screen)
      ? 'sceneHeartShop'
      : HEART_ROOM_BY_KIND[node?.kind ?? 'rest'] ?? 'sceneHeartCamp';
  return [room, ...HEART_FALLBACK.filter((key) => key !== room)];
}

/**
 * Backdrops for one screen, best first; every later key is a fallback.
 * Only keys `has` reports as registered are returned. Empty means no image
 * (the foyer then paints its gradients).
 */
export function sceneKeysFor(
  state: SceneState,
  screen: Screen,
  has: SceneRegistryHas = registeredArt,
): ArtAssetKey[] {
  let chain: ArtAssetKey[];
  if (FOYER_SCREENS.has(screen)) chain = ['sceneFoyer'];
  else if (screen === 'victory') chain = ['sceneHeartBossOpen', ...HEART_FALLBACK];
  else if (state.actIndex >= HEART_ACT_INDEX) chain = heartChain(screen, state);
  else chain = actChain(Math.max(0, state.actIndex), screen, state);
  return chain.filter(has);
}

function cssUrl(src: string): string {
  return `url("${src.replaceAll('"', '\\"')}")`;
}

/** The first two scenes, stacked, so a failed load still shows the next one. */
export function sceneImageCss(keys: readonly ArtAssetKey[]): string {
  if (keys.length === 0) return 'none';
  return keys
    .slice(0, 2)
    .map((key) => cssUrl(ART_ASSETS[key].src))
    .join(', ');
}

export function applyVisualTheme(
  root: HTMLElement,
  screen: Screen,
  state: SceneState,
): VisualTheme {
  const theme = visualThemeFor(screen, state.actIndex);
  root.dataset.visualTheme = theme;
  root.dataset.actIndex = String(
    Math.max(0, Math.min(ACT_THEMES.length - 1, state.actIndex)),
  );
  document.documentElement.dataset.visualTheme = theme;
  root.style.setProperty('--scene-image', sceneImageCss(sceneKeysFor(state, screen)));

  if (theme === 'foyer') {
    root.style.setProperty('--room-token-image', cssUrl(ART_ASSETS.tokenGarden.src));
    root.style.setProperty('--theme-prop-image', cssUrl(ART_ASSETS.propLantern.src));
    return theme;
  }

  const themeAssets = THEME_ASSETS[theme];
  root.style.setProperty(
    '--room-token-image',
    cssUrl(ART_ASSETS[themeAssets.token].src),
  );
  root.style.setProperty(
    '--theme-prop-image',
    cssUrl(ART_ASSETS[themeAssets.prop].src),
  );
  return theme;
}

function artMarkup(
  key: string,
  asset: ArtAsset,
  className: string,
  decorative: boolean,
  fallbackSrc = '',
): string {
  const classes = ['art-image', className].filter(Boolean).join(' ');
  const fallbackAttr =
    fallbackSrc && fallbackSrc !== asset.src ? ` data-fallback-src="${fallbackSrc}"` : '';
  return `<span class="${classes}" data-art-key="${key}">
    <span class="art-image-fallback" aria-hidden="true">${asset.fallback}</span>
    <img src="${asset.src}" alt="${decorative ? '' : asset.alt}" decoding="async" draggable="false"${
      decorative ? ' aria-hidden="true"' : ''
    }${fallbackAttr}>
  </span>`;
}

/**
 * `fallbackKey` names the still to try when `key` fails to load (for example
 * the fresh hero behind a pose or damage stage); the emoji covers both.
 */
export function artImageHtml(
  key: ArtAssetKey,
  className = '',
  decorative = false,
  fallbackKey?: ArtAssetKey,
): string {
  return artMarkup(
    key,
    ART_ASSETS[key],
    className,
    decorative,
    fallbackKey ? ART_ASSETS[fallbackKey].src : '',
  );
}

/** Painted relic face, or the emoji when this relic has no icon. */
export function relicFaceHtml(relicId: string, emoji: string): string {
  if (!Object.prototype.hasOwnProperty.call(RELIC_ART, relicId)) return emoji;
  const asset = RELIC_ART[relicId as keyof typeof RELIC_ART];
  return artMarkup(`relic:${relicId}`, asset, 'relic-art', true);
}

/** Painted card window, or null when this card keeps its emoji face. */
export function cardArtHtml(cardId: string): string | null {
  const key = cardArtKeyFor(cardId);
  if (!key) return null;
  return artMarkup(`card:${key}`, CARD_ART[key], 'card-art-image', true);
}

const preloadedCardArt = new Set<string>();

/** Warm the cache so drawn cards show their art on the first frame. */
export function preloadCardArt(cardIds: Iterable<string>): void {
  if (typeof Image === 'undefined') return;
  for (const cardId of cardIds) {
    const key = cardArtKeyFor(cardId);
    if (!key) continue;
    const src = CARD_ART[key].src;
    if (preloadedCardArt.has(src)) continue;
    preloadedCardArt.add(src);
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  }
}

/** Replace the node's contents with the relic face. */
export function paintRelicFace(parent: HTMLElement, relicId: string, emoji: string): void {
  const markup = relicFaceHtml(relicId, emoji);
  parent.replaceChildren();
  if (markup === emoji) {
    parent.textContent = emoji;
    return;
  }
  parent.insertAdjacentHTML('beforeend', markup);
}

export function hydrateArtImages(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-art-key]').forEach((wrapper) => {
    const image = wrapper.querySelector<HTMLImageElement>('img');
    if (!image) {
      wrapper.classList.add('is-error');
      return;
    }

    // Listeners stay bound: combat swaps pose and damage-stage art in place.
    if (wrapper.dataset.artHydrated === '1') return;
    wrapper.dataset.artHydrated = '1';

    const markLoaded = () => {
      wrapper.classList.remove('is-error');
      wrapper.classList.add('is-loaded');
    };
    const markError = () => {
      const fallbackSrc = image.dataset.fallbackSrc;
      if (fallbackSrc && image.getAttribute('src') !== fallbackSrc) {
        image.src = fallbackSrc;
        return;
      }
      wrapper.classList.remove('is-loaded');
      wrapper.classList.add('is-error');
    };

    image.addEventListener('load', markLoaded);
    image.addEventListener('error', markError);
    if (image.complete) {
      if (image.naturalWidth > 0) markLoaded();
      else markError();
    }
  });
}

export function actAmbienceElement(theme: VisualTheme): HTMLElement | null {
  if (theme === 'foyer') return null;
  const layer = document.createElement('div');
  // Act IV has no ambience of its own yet; it reuses the observatory stars.
  const ambience = theme === 'heart' ? 'observatory' : theme;
  layer.className = `act-ambience act-ambience-${ambience}`;
  layer.setAttribute('aria-hidden', 'true');
  const count = ambience === 'observatory' ? 6 : 5;
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('span');
    particle.className = 'act-ambience-particle';
    particle.style.setProperty('--particle-index', String(index));
    layer.appendChild(particle);
  }
  return layer;
}

export function towerProgressElement(
  screen: Screen,
  actIndex: number,
): HTMLElement {
  const current = screen === 'title' || screen === 'relicPick' || screen === 'practice'
    ? -1
    : screen === 'victory'
      ? 2
      : Math.max(0, Math.min(2, actIndex));
  const place = ACT_PLACE_NAMES[current] ?? ACT_PLACE_NAMES[0];
  const icons = ['🌿', '📚', '🔭'];
  const rail = document.createElement('div');
  rail.className = 'tower-progress';
  rail.setAttribute(
    'aria-label',
    screen === 'victory'
      ? `塔樓進度：${TOWER_SUMMIT_NAME}`
      : current < 0
        ? `塔樓三幕：${ACT_PLACE_NAMES.join('、')}`
        : `塔樓進度：第${current + 1}幕，${place}`,
  );

  icons.forEach((icon, index) => {
    const floor = document.createElement('span');
    floor.className = 'tower-progress-floor';
    if (index === current) floor.classList.add('is-current');
    if (index < current || screen === 'victory') floor.classList.add('is-complete');
    floor.textContent = icon;
    floor.setAttribute('aria-hidden', 'true');
    rail.appendChild(floor);
  });
  return rail;
}
