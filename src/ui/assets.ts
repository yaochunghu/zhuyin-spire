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
  | 'enemyBoss1'
  | 'enemyBoss2'
  | 'enemyBoss3'
  | 'tokenGarden'
  | 'tokenLibrary'
  | 'tokenObservatory'
  | 'propBlossom'
  | 'propLantern'
  | 'propBooks'
  | 'propTelescope'
  | 'propStar';

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
    alt: '花園塔樓房間',
  },
  sceneLibrary: {
    src: new URL('../assets/art/act-library.webp', import.meta.url).href,
    fallback: '📚',
    alt: '燈籠圖書館塔樓房間',
  },
  sceneObservatory: {
    src: new URL('../assets/art/act-observatory.webp', import.meta.url).href,
    fallback: '🔭',
    alt: '星空觀測台塔樓房間',
  },
  transitionGardenLibrary: {
    src: new URL(
      '../assets/art/transitions/garden-to-library.webp',
      import.meta.url,
    ).href,
    fallback: '🌿📚',
    alt: '花園樹根變成圖書館書架的塔樓場景',
  },
  transitionLibraryObservatory: {
    src: new URL(
      '../assets/art/transitions/library-to-observatory.webp',
      import.meta.url,
    ).href,
    fallback: '📚🔭',
    alt: '圖書館書架變成星空觀測台的塔樓場景',
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
  enemyBoss1: {
    src: new URL('../assets/art/enemies/boss-1.webp', import.meta.url).href,
    fallback: '🐉',
    alt: '背著花園塔樓的守護龍玩具',
  },
  enemyBoss2: {
    src: new URL('../assets/art/enemies/boss-2.webp', import.meta.url).href,
    fallback: '🦅',
    alt: '拿著古書的雙翼監守玩具',
  },
  enemyBoss3: {
    src: new URL('../assets/art/enemies/boss-3.webp', import.meta.url).href,
    fallback: '👑',
    alt: '被星環包圍的注音終焉王玩具',
  },
  tokenGarden: {
    src: new URL('../assets/art/token-garden.webp', import.meta.url).href,
    fallback: '🌿',
    alt: '花園房間圓牌',
  },
  tokenLibrary: {
    src: new URL('../assets/art/token-library.webp', import.meta.url).href,
    fallback: '📚',
    alt: '圖書館房間圓牌',
  },
  tokenObservatory: {
    src: new URL('../assets/art/token-observatory.webp', import.meta.url).href,
    fallback: '✨',
    alt: '觀測台房間圓牌',
  },
  propBlossom: {
    src: new URL('../assets/art/prop-blossom.webp', import.meta.url).href,
    fallback: '🌸',
    alt: '梅花玩具擺件',
  },
  propLantern: {
    src: new URL('../assets/art/prop-lantern.webp', import.meta.url).href,
    fallback: '🏮',
    alt: '紙燈籠玩具擺件',
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
  propStar: {
    src: new URL('../assets/art/prop-star.webp', import.meta.url).href,
    fallback: '⭐',
    alt: '星星玩具擺件',
  },
} as const satisfies Record<ArtAssetKey, ArtAsset>;

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
  | 'eliteArmor'
  | 'eliteBee'
  | 'eliteBoom'
  | 'eliteStorm'
  | 'eliteShadow'
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
  eliteArmor: 'enemyEliteArmor',
  eliteBee: 'enemyEliteBee',
  eliteBoom: 'enemyEliteBoom',
  eliteStorm: 'enemyEliteStorm',
  eliteShadow: 'enemyEliteShadow',
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

export function artImageHtml(
  key: ArtAssetKey,
  className = '',
  decorative = false,
): string {
  const asset = ART_ASSETS[key];
  const classes = ['art-image', className].filter(Boolean).join(' ');
  return `<span class="${classes}" data-art-key="${key}">
    <span class="art-image-fallback" aria-hidden="true">${asset.fallback}</span>
    <img src="${asset.src}" alt="${decorative ? '' : asset.alt}" decoding="async" draggable="false"${
      decorative ? ' aria-hidden="true"' : ''
    }>
  </span>`;
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
  const labels = ['花園', '圖書館', '觀測台'];
  const icons = ['🌿', '📚', '🔭'];
  const rail = document.createElement('div');
  rail.className = 'tower-progress';
  rail.setAttribute(
    'aria-label',
    current < 0 ? '塔樓三幕：花園、圖書館、觀測台' : `塔樓進度：第${current + 1}幕，${labels[current]}`,
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
