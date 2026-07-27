import {
  CARDS,
  getCardAtUpgrade,
  resolveCard,
  type CardDef,
  type CardRarity,
  type CardType,
  type EffectDef,
} from '../data/cards';
import type { DeckCardV2 } from '../game/cardInstances';
import { sfx } from '../game/audio';
import { cardFaceHtml, jobLabel, rarityLabel, typeLabel } from './cards';
import { lockPageScroll, trapModalFocus } from './modal';
import { run } from './runtime';

let bodyRoot: HTMLElement | null = null;

type ViewerMode = 'deck' | 'catalog';
type SortMode = 'deck' | 'zhuyin' | 'name' | 'cost';

interface ViewerState {
  mode: ViewerMode;
  query: string;
  type: 'all' | CardType;
  rarity: 'all' | CardRarity;
  sort: SortMode;
  selectedKey: string | null;
}

interface ViewerEntry {
  key: string;
  def: CardDef;
  card?: DeckCardV2;
  deckIndex?: number;
}

const TARGET_LABELS: Record<string, string> = {
  self: '自己',
  singleEnemy: '一名敵人',
  allEnemies: '所有敵人',
};

const POOL_LABELS: Record<string, string> = {
  starter: '起始牌',
  resonanceWarrior: '共鳴武者',
  shared: '共用',
  status: '狀態牌',
  curse: '詛咒牌',
};

function effectText(effect: EffectDef): string {
  switch (effect.kind) {
    case 'damage':
      return `${effect.damageType === 'direct' ? '非攻擊傷害' : '攻擊傷害'} ${effect.amount}${(effect.hits ?? 1) > 1 ? ` × ${effect.hits}` : ''}`;
    case 'block':
      return `獲得 ${effect.amount} 護盾`;
    case 'draw':
      return `抽 ${effect.amount} 張牌`;
    case 'energy':
      return `獲得 ${effect.amount} 能量`;
    case 'applyVulnerable':
      return `施加 ${effect.amount} 回合易傷`;
    case 'addBasicAttackDamage':
      return `本場戰鬥的基礎攻擊每下 +${effect.amount}`;
  }
}

function option(value: string, label: string): HTMLOptionElement {
  const item = document.createElement('option');
  item.value = value;
  item.textContent = label;
  return item;
}

function entriesFor(state: ViewerState): ViewerEntry[] {
  const entries: ViewerEntry[] = state.mode === 'deck'
    ? run().deck.map((card, deckIndex) => ({
        key: card.uid,
        card,
        deckIndex,
        def: getCardAtUpgrade(card.defId, card.upgradeLevel),
      }))
    : Object.values(CARDS).map((def) => ({ key: `catalog:${def.id}`, def }));

  const query = state.query.trim().toLocaleLowerCase('zh-Hant');
  const filtered = entries.filter(({ def }) => {
    if (state.type !== 'all' && def.type !== state.type) return false;
    if (state.rarity !== 'all' && def.rarity !== state.rarity) return false;
    if (!query) return true;
    return [def.id, def.name, def.zhuyin, def.description, jobLabel(def.job)]
      .join(' ')
      .toLocaleLowerCase('zh-Hant')
      .includes(query);
  });

  if (state.sort === 'deck') return filtered;
  return filtered.sort((a, b) => {
    if (state.sort === 'cost') return a.def.cost - b.def.cost || a.def.name.localeCompare(b.def.name, 'zh-Hant');
    if (state.sort === 'name') return a.def.name.localeCompare(b.def.name, 'zh-Hant');
    return a.def.zhuyin.localeCompare(b.def.zhuyin, 'zh-Hant');
  });
}

function makeCardEntry(entry: ViewerEntry, state: ViewerState, rebuild: () => void): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'designer-card-entry';
  const selected = state.selectedKey === entry.key;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `deck-viewer-card card ${entry.def.type}${selected ? ' selected' : ''}`;
  button.innerHTML = cardFaceHtml(entry.def, {
    upgradeLevel: entry.card?.upgradeLevel ?? 0,
  });
  button.setAttribute(
    'aria-label',
    `${entry.def.name}，${typeLabel(entry.def.type)}，${rarityLabel(entry.def.rarity)}，查看完整資料`,
  );
  button.setAttribute('aria-pressed', String(selected));
  button.addEventListener('click', () => {
    sfx.click();
    state.selectedKey = selected ? null : entry.key;
    rebuild();
  });
  wrapper.appendChild(button);

  const identity = document.createElement('div');
  identity.className = 'designer-card-identity adult-text';
  identity.textContent = entry.card
    ? `牌組第 ${(entry.deckIndex ?? 0) + 1} 張 · ${entry.card.upgradeLevel > 0 ? `升級 +${entry.card.upgradeLevel}` : '未升級'}`
    : `${entry.def.id} · ${POOL_LABELS[entry.def.pool] ?? entry.def.pool}`;
  wrapper.appendChild(identity);
  return wrapper;
}

function detailPanel(entry: ViewerEntry): HTMLElement {
  const base = CARDS[entry.def.id]!;
  const upgraded = base.upgrade ? resolveCard(base, 1) : null;
  const panel = document.createElement('section');
  panel.className = 'designer-detail';
  panel.setAttribute('aria-label', `${base.name}完整資料`);

  const title = document.createElement('div');
  title.className = 'designer-detail-title';
  title.textContent = `${base.icon ?? '🃏'} ${base.name} · ${base.zhuyin}`;
  panel.appendChild(title);

  const meta = document.createElement('dl');
  meta.className = 'designer-meta-grid';
  const rows: Array<[string, string]> = [
    ['定義 ID', base.id],
    ['實體 UID', entry.card?.uid ?? '目錄預覽（沒有實體 UID）'],
    ['分類', typeLabel(base.type)],
    ['稀有度', rarityLabel(base.rarity)],
    ['能量', String(base.cost)],
    ['目標', TARGET_LABELS[base.target ?? (base.type === 'attack' ? 'singleEnemy' : 'self')] ?? '自己'],
    ['牌池', POOL_LABELS[base.pool] ?? base.pool],
    ['用途', jobLabel(base.job) || '尚未分類'],
    ['標籤', base.tags.length > 0 ? base.tags.join('、') : '無'],
    ['關鍵字', base.keywords.length > 0 ? base.keywords.join('、') : '無'],
    ['解鎖層級', base.unlockTier === 0 ? '立即開放' : String(base.unlockTier)],
    ['注音題數', String(base.cues.length)],
  ];
  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    meta.append(dt, dd);
  }
  panel.appendChild(meta);

  const effects = document.createElement('div');
  effects.className = 'designer-effects';
  const effectHeading = document.createElement('strong');
  effectHeading.textContent = '結算順序';
  effects.appendChild(effectHeading);
  const list = document.createElement('ol');
  base.effects.forEach((effect) => {
    const li = document.createElement('li');
    li.textContent = effectText(effect);
    list.appendChild(li);
  });
  effects.appendChild(list);
  panel.appendChild(effects);

  const comparison = document.createElement('div');
  comparison.className = 'designer-comparison';
  const baseFace = document.createElement('div');
  baseFace.className = `designer-preview card ${base.type}`;
  baseFace.innerHTML = `<div class="designer-preview-label">基礎</div>${cardFaceHtml(base)}`;
  comparison.appendChild(baseFace);
  if (upgraded) {
    const plusFace = document.createElement('div');
    plusFace.className = `designer-preview card ${upgraded.type}`;
    plusFace.innerHTML = `<div class="designer-preview-label">升級</div>${cardFaceHtml(upgraded, { upgradeLevel: 1 })}`;
    comparison.appendChild(plusFace);
  } else {
    const pending = document.createElement('div');
    pending.className = 'designer-upgrade-pending adult-text';
    pending.textContent = '這張牌的升級尚未進入目前實作波次。';
    comparison.appendChild(pending);
  }
  panel.appendChild(comparison);

  const cueBlock = document.createElement('div');
  cueBlock.className = 'designer-cues';
  const cueTitle = document.createElement('strong');
  cueTitle.textContent = '施放題庫';
  cueBlock.appendChild(cueTitle);
  const cueList = document.createElement('div');
  cueList.className = 'designer-cue-list';
  for (const cue of base.cues) {
    const chip = document.createElement('span');
    chip.textContent = `${cue.emoji} ${cue.word} · ${cue.spell}`;
    cueList.appendChild(chip);
  }
  cueBlock.appendChild(cueList);
  panel.appendChild(cueBlock);

  const note = document.createElement('p');
  note.className = 'designer-balance-note adult-text';
  note.textContent = `平衡備註：${base.balanceNote}`;
  panel.appendChild(note);
  return panel;
}

export function renderDeckViewer(onClose: () => void): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'deck-viewer map-deck-viewer designer-viewer';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '牌組與卡牌設計檢視器');

  const state: ViewerState = {
    mode: 'deck',
    query: '',
    type: 'all',
    rarity: 'all',
    sort: 'deck',
    selectedKey: null,
  };

  const rebuild = (): void => {
    overlay.replaceChildren();
    const entries = entriesFor(state);

    const head = document.createElement('div');
    head.className = 'deck-viewer-head';
    head.innerHTML = `
      <div class="kid-prompt">${state.mode === 'deck' ? `🃏 我的牌組 ×${run().deck.length}` : `🧰 設計檢視 ×${Object.keys(CARDS).length}`}</div>
      <p class="adult-text">${state.mode === 'deck' ? '每一張實體牌都分開顯示；重複牌不合併。' : '搜尋、篩選並檢查定義、效果順序、升級、題庫與平衡備註。'}</p>
    `;
    overlay.appendChild(head);

    const tabs = document.createElement('div');
    tabs.className = 'designer-tabs';
    for (const [mode, label] of [['deck', '🃏 我的牌組'], ['catalog', '🧰 設計檢視']] as const) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = mode === state.mode ? 'active' : '';
      tab.textContent = label;
      tab.setAttribute('aria-pressed', String(mode === state.mode));
      tab.addEventListener('click', () => {
        sfx.click();
        state.mode = mode;
        state.sort = mode === 'deck' ? 'deck' : 'zhuyin';
        state.selectedKey = null;
        rebuild();
      });
      tabs.appendChild(tab);
    }
    overlay.appendChild(tabs);

    const filters = document.createElement('div');
    filters.className = 'designer-filters';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = '搜尋名稱、ID、注音、用途';
    search.setAttribute('aria-label', '搜尋卡牌');
    search.value = state.query;
    let composing = false;
    search.addEventListener('compositionstart', () => {
      composing = true;
    });
    search.addEventListener('compositionend', () => {
      composing = false;
      state.query = search.value;
      rebuild();
      overlay.querySelector<HTMLInputElement>('.designer-filters input')?.focus();
    });
    search.addEventListener('input', () => {
      if (composing) return;
      state.query = search.value;
      rebuild();
      overlay.querySelector<HTMLInputElement>('.designer-filters input')?.focus();
    });

    const type = document.createElement('select');
    type.setAttribute('aria-label', '按卡牌分類篩選');
    type.append(
      option('all', '全部分類'),
      option('attack', '攻擊'),
      option('skill', '技能'),
      option('power', '能力'),
      option('status', '狀態'),
      option('curse', '詛咒'),
    );
    type.value = state.type;
    type.addEventListener('change', () => {
      state.type = type.value as ViewerState['type'];
      state.selectedKey = null;
      rebuild();
    });

    const rarity = document.createElement('select');
    rarity.setAttribute('aria-label', '按稀有度篩選');
    rarity.append(
      option('all', '全部稀有度'),
      option('basic', '基礎'),
      option('common', '普通'),
      option('uncommon', '罕見'),
      option('rare', '稀有'),
      option('special', '特殊'),
    );
    rarity.value = state.rarity;
    rarity.addEventListener('change', () => {
      state.rarity = rarity.value as ViewerState['rarity'];
      state.selectedKey = null;
      rebuild();
    });

    const sort = document.createElement('select');
    sort.setAttribute('aria-label', '卡牌排序');
    if (state.mode === 'deck') sort.appendChild(option('deck', '牌組順序'));
    sort.append(option('zhuyin', '注音排序'), option('name', '名稱排序'), option('cost', '能量排序'));
    sort.value = state.sort;
    sort.addEventListener('change', () => {
      state.sort = sort.value as SortMode;
      rebuild();
    });
    filters.append(search, type, rarity, sort);
    overlay.appendChild(filters);

    const count = document.createElement('div');
    count.className = 'designer-result-count adult-text';
    count.textContent = `顯示 ${entries.length} 張`;
    overlay.appendChild(count);

    const selected = entries.find((entry) => entry.key === state.selectedKey);
    const body = document.createElement('div');
    body.className = `designer-viewer-body${selected ? ' has-detail' : ''}`;
    const grid = document.createElement('div');
    grid.className = 'deck-viewer-grid designer-card-grid';
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'adult-text center';
      empty.textContent = '沒有符合條件的卡牌。';
      grid.appendChild(empty);
    } else {
      entries.forEach((entry) => grid.appendChild(makeCardEntry(entry, state, rebuild)));
    }
    body.appendChild(grid);
    if (selected) body.appendChild(detailPanel(selected));
    overlay.appendChild(body);

    const close = document.createElement('button');
    close.className = 'btn-primary btn-kid-main deck-viewer-close';
    close.innerHTML = '<span class="btn-emoji">✅</span><span class="adult-text">完成</span>';
    close.setAttribute('aria-label', '關閉卡牌檢視器');
    close.addEventListener('click', () => {
      sfx.click();
      onClose();
    });
    overlay.appendChild(close);
  };

  rebuild();
  return overlay;
}

export function openDeckViewer(): void {
  if (bodyRoot) return;
  const previousFocus = document.activeElement as HTMLElement | null;
  const releaseScroll = lockPageScroll();
  bodyRoot = document.createElement('div');
  bodyRoot.id = 'zhuyin-deck-viewer-root';
  const close = (): void => {
    bodyRoot?.remove();
    bodyRoot = null;
    releaseScroll();
    previousFocus?.focus();
  };
  const backdrop = document.createElement('div');
  backdrop.className = 'deck-viewer-backdrop';
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.appendChild(renderDeckViewer(close));
  bodyRoot.appendChild(backdrop);
  bodyRoot.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    trapModalFocus(bodyRoot!, event);
  });
  document.body.appendChild(bodyRoot);
  bodyRoot.querySelector<HTMLButtonElement>('.designer-tabs button')?.focus();
}
