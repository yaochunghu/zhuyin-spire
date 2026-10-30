import { ACT_PLACE_NAMES, TOWER_SUMMIT_NAME } from '../data/map';
import { RELICS } from '../data/relics';
import type { Screen } from '../game/state';

export type ArtAssetKey =
  | 'sceneGarden'
  | 'sceneLibrary'
  | 'sceneObservatory'
  | 'transitionGardenLibrary'
  | 'transitionLibraryObservatory'
  | 'heroMartialArtist'
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
  | 'tokenGarden'
  | 'tokenLibrary'
  | 'tokenObservatory'
  | 'propBlossom'
  | 'propLantern'
  | 'propBooks'
  | 'propTelescope';

export type VisualTheme = 'foyer' | 'garden' | 'library' | 'observatory';

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
  heroMartialArtist: {
    src: new URL('../assets/art/hero-martial-artist.webp', import.meta.url).href,
    fallback: '🧒🥋',
    alt: '共鳴武者玩具角色',
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

const ACT_THEMES = ['garden', 'library', 'observatory'] as const;

/** Three act slots only. Per-floor, shop, camp, event, foyer, and Act IV plates are not wired. */

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
};

const FOYER_SCREENS: ReadonlySet<Screen> = new Set([
  'title',
  'relicPick',
  'practice',
]);

export function visualThemeFor(screen: Screen, actIndex: number): VisualTheme {
  if (FOYER_SCREENS.has(screen)) return 'foyer';
  if (screen === 'victory') return 'observatory';
  const index = Math.max(0, Math.min(ACT_THEMES.length - 1, actIndex));
  return ACT_THEMES[index]!;
}

function cssUrl(src: string): string {
  return `url("${src.replaceAll('"', '\\"')}")`;
}

export function applyVisualTheme(
  root: HTMLElement,
  screen: Screen,
  actIndex: number,
): VisualTheme {
  const theme = visualThemeFor(screen, actIndex);
  root.dataset.visualTheme = theme;
  root.dataset.actIndex = String(Math.max(0, Math.min(2, actIndex)));
  document.documentElement.dataset.visualTheme = theme;

  if (theme === 'foyer') {
    root.style.setProperty('--scene-image', 'none');
    root.style.setProperty('--room-token-image', cssUrl(ART_ASSETS.tokenGarden.src));
    root.style.setProperty('--theme-prop-image', cssUrl(ART_ASSETS.propLantern.src));
    return theme;
  }

  const themeAssets = THEME_ASSETS[theme];
  root.style.setProperty(
    '--scene-image',
    cssUrl(ART_ASSETS[themeAssets.scene].src),
  );
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
): string {
  const classes = ['art-image', className].filter(Boolean).join(' ');
  return `<span class="${classes}" data-art-key="${key}">
    <span class="art-image-fallback" aria-hidden="true">${asset.fallback}</span>
    <img src="${asset.src}" alt="${decorative ? '' : asset.alt}" decoding="async" draggable="false"${
      decorative ? ' aria-hidden="true"' : ''
    }>
  </span>`;
}

export function artImageHtml(
  key: ArtAssetKey,
  className = '',
  decorative = false,
): string {
  return artMarkup(key, ART_ASSETS[key], className, decorative);
}

/** Painted relic face, or the emoji when this relic has no icon. */
export function relicFaceHtml(relicId: string, emoji: string): string {
  if (!Object.prototype.hasOwnProperty.call(RELIC_ART, relicId)) return emoji;
  const asset = RELIC_ART[relicId as keyof typeof RELIC_ART];
  return artMarkup(`relic:${relicId}`, asset, 'relic-art', true);
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

    const markLoaded = () => {
      wrapper.classList.remove('is-error');
      wrapper.classList.add('is-loaded');
    };
    const markError = () => {
      wrapper.classList.remove('is-loaded');
      wrapper.classList.add('is-error');
    };

    if (image.complete) {
      if (image.naturalWidth > 0) markLoaded();
      else markError();
      return;
    }
    image.addEventListener('load', markLoaded, { once: true });
    image.addEventListener('error', markError, { once: true });
  });
}

export function actAmbienceElement(theme: VisualTheme): HTMLElement | null {
  if (theme === 'foyer') return null;
  const layer = document.createElement('div');
  layer.className = `act-ambience act-ambience-${theme}`;
  layer.setAttribute('aria-hidden', 'true');
  const count = theme === 'observatory' ? 6 : 5;
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
