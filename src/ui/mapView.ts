import {
  ACT_CLEAR_HEAL,
  continueAfterActClear,
  deckCounts,
  getActiveRelic,
  getAvailableMapNodes,
  getCurrentAct,
  getCurrentActNodes,
  selectMapNode,
} from '../game/state';
import type { MapNode } from '../data/map';
import { sfx } from '../game/audio';
import { gameplayMs } from '../game/settings';
import { cardFaceHtml } from './cards';
import { appendCoach, render, run, session } from './runtime';

const SELECT_FLASH_MS = 480;

function nodeCenter(
  n: MapNode,
  cols: number,
  maxRow: number,
): { x: number; y: number } {
  const xBase = cols <= 1 ? 50 : 8 + (n.col / (cols - 1)) * 84;
  const yBase = maxRow <= 0 ? 50 : 4 + ((maxRow - n.row) / maxRow) * 92;
  return {
    x: Math.max(4, Math.min(96, xBase + (n.layoutX ?? 0) * 0.16)),
    y: Math.max(3, Math.min(97, yBase + (n.layoutY ?? 0) * 0.11)),
  };
}

export function renderMap(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen map-screen';

  const act = getCurrentAct(run());
  const actNodes = getCurrentActNodes(run());
  const actIdSet = new Set(actNodes.map((n) => n.id));
  const available = getAvailableMapNodes(run()).filter((n) => actIdSet.has(n.id));
  const availableIds = new Set(available.map((n) => n.id));
  const visited = new Set(run().visitedIds.filter((id) => actIdSet.has(id)));
  const pathSet = new Set(run().pathIds.filter((id) => actIdSet.has(id)));
  const curId = run().currentNodeId;
  const currentOnThisAct = curId && actIdSet.has(curId) ? curId : null;
  const relic = getActiveRelic(run());

  const stage = document.createElement('div');
  stage.className = 'map-stage';
  stage.setAttribute('data-map-stage', '');

  // —— Top HUD ——
  const top = document.createElement('div');
  top.className = 'map-stage-top';
  top.innerHTML = `
    <div class="kid-status map-status-bar">
      <span class="kid-stat act-pill" data-map-act title="只顯示目前這一幕"></span>
      <span class="kid-stat" data-map-hp></span>
      <span class="kid-stat" data-map-gold></span>
    </div>
    <div class="map-stage-title">
      <span class="kid-prompt map-act-title"></span>
      <span class="kid-stat map-floor-progress"></span>
      <span class="adult-text map-stage-hint">亮圈＝可走 · 由下往上</span>
    </div>
  `;
  top.querySelector<HTMLElement>('[data-map-act]')!.textContent =
    `${act.emoji} 第${run().actIndex + 1}幕`;
  const hp = top.querySelector<HTMLElement>('[data-map-hp]')!;
  hp.textContent = `🥋❤️${run().heroHp}`;
  if (run().heroHp <= 8) hp.classList.add('danger-hp');
  top.querySelector<HTMLElement>('[data-map-gold]')!.textContent = `🪙${run().gold}`;
  top.querySelector<HTMLElement>('.map-act-title')!.textContent = `${act.emoji} ${act.title}`;
  top.querySelector<HTMLElement>('.map-floor-progress')!.textContent =
    `目前第 ${Math.min(15, (available[0]?.row ?? act.maxRow) + 1)}/15 層`;
  if (relic) {
    const relicPill = document.createElement('span');
    relicPill.className = 'kid-stat relic-pill';
    relicPill.title = relic.name;
    relicPill.textContent = relic.emoji;
    top.querySelector('.map-status-bar')!.appendChild(relicPill);
  }
  stage.appendChild(top);

  // —— Organic fitted graph (centered; side margins on stage) ——
  const graphW = 1000;
  const graphH = 1000;
  const pos = (n: MapNode) => nodeCenter(n, act.cols, act.maxRow);

  const panel = document.createElement('div');
  panel.className = 'map-panel';
  const canvas = document.createElement('div');
  canvas.className = 'map-web';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-edges');
  svg.setAttribute('width', String(graphW));
  svg.setAttribute('height', String(graphH));
  svg.setAttribute('viewBox', `0 0 ${graphW} ${graphH}`);
  // HTML nodes use percentages across the whole map-web. Stretching this
  // normalized SVG plane to the same box keeps every edge endpoint aligned on
  // rectangular tablet layouts instead of letterboxing the routes as a square.
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');

  for (const n of actNodes) {
    const from = pos(n);
    for (const nextId of n.nextIds) {
      if (!actIdSet.has(nextId)) continue;
      const t = actNodes.find((x) => x.id === nextId);
      if (!t) continue;
      const to = pos(t);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String((from.x / 100) * graphW));
      line.setAttribute('y1', String((from.y / 100) * graphH));
      line.setAttribute('x2', String((to.x / 100) * graphW));
      line.setAttribute('y2', String((to.y / 100) * graphH));
      line.dataset.fromNodeId = n.id;
      line.dataset.toNodeId = t.id;
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      const onPath =
        pathSet.has(n.id) && (pathSet.has(t.id) || availableIds.has(t.id));
      const fromVisited = visited.has(n.id) || n.id === currentOnThisAct;
      line.setAttribute(
        'class',
        'map-edge' + (onPath ? ' edge-path' : fromVisited ? ' edge-dim' : ''),
      );
      svg.appendChild(line);
    }
  }
  canvas.appendChild(svg);

  for (const n of actNodes) {
    const p = pos(n);
    const isAvail = availableIds.has(n.id);
    const isHere = n.id === currentOnThisAct;
    const isDone = visited.has(n.id);
    const isLocked = !isAvail && !isDone && !isHere;
    const size = n.kind === 'boss' ? 64 : 56;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `map-dot kind-${n.kind}`;
    if (isAvail) btn.classList.add('available');
    if (isHere) btn.classList.add('current');
    if (isDone) btn.classList.add('done');
    if (isLocked) btn.classList.add('locked');
    if (n.kind === 'boss') btn.classList.add('boss');
    btn.style.left = `${p.x}%`;
    btn.style.top = `${p.y}%`;
    btn.style.width = `${size}px`;
    btn.style.height = `${size}px`;
    btn.style.fontSize = `${Math.max(0.95, size * 0.028)}rem`;
    btn.dataset.nodeId = n.id;
    btn.dataset.act = String(n.act);
    const emoji = document.createElement('span');
    emoji.className = 'map-dot-emoji';
    emoji.textContent = n.emoji;
    btn.appendChild(emoji);
    btn.setAttribute(
      'aria-label',
      `${n.label}${isAvail ? '（可前進）' : isDone ? '（已完成）' : '（未解鎖）'}`,
    );
    btn.disabled = !isAvail;

    if (isAvail) {
      btn.addEventListener('click', () => {
        if (session.mapSelectBusy) return;
        session.mapSelectBusy = true;
        sfx.mapStep();
        if (n.kind === 'elite' || n.kind === 'boss') sfx.elite();
        session.deckViewerOpen = false;
        btn.classList.add('selected-flash');
        window.setTimeout(() => {
          selectMapNode(run(), n.id);
          session.mapSelectBusy = false;
          render();
        }, gameplayMs(SELECT_FLASH_MS));
      });
    }
    canvas.appendChild(btn);
  }

  panel.appendChild(canvas);
  stage.appendChild(panel);

  // —— Bottom chrome ——
  const bottom = document.createElement('div');
  bottom.className = 'map-stage-bottom';

  const legend = document.createElement('div');
  legend.className = 'map-legend adult-text';
  legend.textContent =
    '⚔️戰鬥  💀菁英  🔥休息  🏪商店  💎寶箱  🐉Boss · 亮圈＝可點';
  bottom.appendChild(legend);

  const actions = document.createElement('div');
  actions.className = 'map-actions';

  if (!currentOnThisAct && available.length > 0) {
    const tip = document.createElement('span');
    tip.className = 'kid-prompt map-pick-tip';
    tip.textContent = '👆 點下面亮起來的房間';
    actions.appendChild(tip);
  }

  const deckBtn = document.createElement('button');
  deckBtn.className = 'btn-secondary btn-kid-main map-deck-btn';
  deckBtn.innerHTML = `<span class="btn-emoji">🃏</span><span class="map-deck-count">${run().deck.length}</span>`;
  deckBtn.setAttribute('aria-label', '查看牌組');
  deckBtn.addEventListener('click', () => {
    sfx.click();
    session.deckViewerOpen = !session.deckViewerOpen;
    render();
  });
  actions.appendChild(deckBtn);
  bottom.appendChild(actions);

  if (available.length === 0 && currentOnThisAct) {
    const warn = document.createElement('p');
    warn.className = 'warn-banner adult-text';
    warn.textContent = '沒有下一格（請回報 bug）';
    bottom.appendChild(warn);
  }

  stage.appendChild(bottom);

  // Floating coach (collapsed by default — does not steal graph space)
  appendCoach(stage);

  if (session.deckViewerOpen) {
    stage.appendChild(renderDeckViewer());
  }

  el.appendChild(stage);

  requestAnimationFrame(() => {
    panel.querySelector<HTMLElement>('.map-dot.available')?.scrollIntoView({
      block: 'center',
      inline: 'center',
    });
  });

  return el;
}

export function renderDeckViewer(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'deck-viewer map-deck-viewer';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '目前牌組');

  const head = document.createElement('div');
  head.className = 'deck-viewer-head';
  head.innerHTML = `
    <div class="kid-prompt">🃏 牌組 ×${run().deck.length}</div>
    <p class="adult-text">你現在擁有的注音牌（相同的會疊數字）</p>
  `;
  overlay.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'deck-viewer-grid';
  for (const { def, count } of deckCounts(run())) {
    const cell = document.createElement('div');
    cell.className = `deck-viewer-card card ${def.type}`;
    cell.innerHTML = `
      ${cardFaceHtml(def)}
      ${count > 1 ? `<div class="deck-count-badge">×${count}</div>` : ''}
    `;
    grid.appendChild(cell);
  }
  overlay.appendChild(grid);

  const close = document.createElement('button');
  close.className = 'btn-primary btn-kid-main';
  close.innerHTML = `<span class="btn-emoji">✅</span>`;
  close.setAttribute('aria-label', '關閉牌組');
  close.addEventListener('click', () => {
    sfx.click();
    session.deckViewerOpen = false;
    render();
  });
  overlay.appendChild(close);
  return overlay;
}

export function renderActClear(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen act-clear-screen';
  const nextAct = run().actIndex + 1;
  const next = getCurrentAct(run());
  el.innerHTML = `
    <div class="end-emoji bounce-in">🏆</div>
    <div class="kid-prompt">第 ${run().lastClearedAct} 幕過關！</div>
    <div class="kid-stat">❤️+${ACT_CLEAR_HEAL}</div>
    <p class="adult-text center" data-next-act></p>
    <p class="kid-prompt" style="font-size:1.1rem">往上 · 第 ${nextAct} 幕</p>
  `;
  el.querySelector<HTMLElement>('[data-next-act]')!.textContent =
    `下一幕：${next.emoji} ${next.title}`;
  appendCoach(el);

  const go = document.createElement('button');
  go.className = 'btn-primary btn-kid-main';
  go.innerHTML = `<span class="btn-emoji">⬆️</span>`;
  go.setAttribute('aria-label', '進入下一幕');
  go.addEventListener('click', () => {
    sfx.win();
    continueAfterActClear(run());
    session.deckViewerOpen = false;
    render();
  });
  el.appendChild(go);
  return el;
}
