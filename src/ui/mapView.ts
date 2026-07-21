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
import { cardFaceHtml } from './cards';
import { appendCoach, render, run, session } from './runtime';

const SELECT_FLASH_MS = 480;
const STAGE_W = 1920;
const STAGE_H = 1080;

/**
 * Map graph panel: tall path web, **not** stretched full stage width.
 * Side margins stay empty so the climb feels organic (StS-like density).
 */
const PANEL_H = 860;
/** Preferred column pitch — denser than full-bleed 7-lane stretch */
const IDEAL_COL_W = 104;
const IDEAL_ROW_H = 54;
const MIN_SIDE_MARGIN = 200;
const MAX_GRAPH_W = 1180;

function applyStageScale(wrap: HTMLElement, stage: HTMLElement): void {
  const fit = () => {
    const sw = wrap.clientWidth || window.innerWidth;
    const sh = wrap.clientHeight || window.innerHeight;
    const scale = Math.min(sw / STAGE_W, sh / STAGE_H);
    stage.style.transform = `scale(${Math.max(0.2, scale)})`;
  };
  fit();
  requestAnimationFrame(fit);
}

/**
 * Organic density: tight columns/rows, centered with space on the sides.
 * Never stretches 7 lanes across the full 1920 stage.
 */
function layoutMetrics(cols: number, maxRow: number) {
  const padY = 24;
  const usableH = PANEL_H - padY * 2;
  const rowGaps = Math.max(1, maxRow);

  // Height-first fit (15 floors) then keep columns close
  let rowH = Math.min(IDEAL_ROW_H, usableH / rowGaps);
  rowH = Math.max(46, rowH);

  // Column pitch tracks row density (web, not stretched grid)
  let colW = IDEAL_COL_W * (rowH / IDEAL_ROW_H);
  colW = Math.max(88, Math.min(112, colW));

  const nodeSize = Math.max(48, Math.min(colW, rowH) * 0.72);
  const bossSize = nodeSize * 1.18;

  // Graph content width; center inside stage with generous side margins
  let graphW = (cols - 1) * colW + nodeSize + 48;
  graphW = Math.min(graphW, MAX_GRAPH_W);
  // If still too wide, compress columns slightly
  if ((cols - 1) * colW + nodeSize + 48 > MAX_GRAPH_W) {
    colW = (MAX_GRAPH_W - nodeSize - 48) / Math.max(1, cols - 1);
    graphW = MAX_GRAPH_W;
  }

  const padX = nodeSize / 2 + 16;
  // Outer panel is graph-sized; stage centers it for side breathing room
  const panelW = Math.max(graphW, (cols - 1) * colW + nodeSize + padX * 2);

  // Organic jitter — strong enough to break the lattice look
  const jitterScaleX = Math.min(1.35, (colW * 0.28) / 12);
  const jitterScaleY = Math.min(1.35, (rowH * 0.28) / 8);

  return {
    panelW,
    panelH: PANEL_H,
    padX,
    padY,
    colW,
    rowH,
    nodeSize,
    bossSize,
    jitterScaleX,
    jitterScaleY,
    minSideMargin: MIN_SIDE_MARGIN,
  };
}

function nodeCenter(
  n: MapNode,
  actMaxRow: number,
  m: ReturnType<typeof layoutMetrics>,
): { x: number; y: number } {
  const jx = (n.layoutX ?? 0) * m.jitterScaleX;
  const jy = (n.layoutY ?? 0) * m.jitterScaleY;
  return {
    x: m.padX + n.col * m.colW + jx,
    y: m.padY + (actMaxRow - n.row) * m.rowH + jy,
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
      <span class="kid-stat act-pill" title="只顯示目前這一幕">${act.emoji} 第${run().actIndex + 1}幕</span>
      <span class="kid-stat${run().heroHp <= 8 ? ' danger-hp' : ''}">🧙❤️${run().heroHp}</span>
      <span class="kid-stat">🪙${run().gold}</span>
      ${relic ? `<span class="kid-stat relic-pill" title="${relic.name}">${relic.emoji}</span>` : ''}
    </div>
    <div class="map-stage-title">
      <span class="kid-prompt map-act-title">${act.emoji} ${act.title}</span>
      <span class="adult-text map-stage-hint">亮圈＝可走 · 由下往上 · 一屏看完</span>
    </div>
  `;
  stage.appendChild(top);

  // —— Organic fitted graph (centered; side margins on stage) ——
  const m = layoutMetrics(act.cols, act.maxRow);
  const graphW = m.panelW;
  const graphH = m.panelH;
  const pos = (n: MapNode) => nodeCenter(n, act.maxRow, m);

  const panel = document.createElement('div');
  panel.className = 'map-panel';
  // Panel only as wide as the web — stage flex centers it → side space
  panel.style.width = `${graphW}px`;
  panel.style.height = `${graphH}px`;
  panel.style.maxWidth = `${MAX_GRAPH_W}px`;

  const canvas = document.createElement('div');
  canvas.className = 'map-web';
  canvas.style.width = `${graphW}px`;
  canvas.style.height = `${graphH}px`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-edges');
  svg.setAttribute('width', String(graphW));
  svg.setAttribute('height', String(graphH));
  svg.setAttribute('viewBox', `0 0 ${graphW} ${graphH}`);

  for (const n of actNodes) {
    const from = pos(n);
    for (const nextId of n.nextIds) {
      if (!actIdSet.has(nextId)) continue;
      const t = actNodes.find((x) => x.id === nextId);
      if (!t) continue;
      const to = pos(t);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(from.x));
      line.setAttribute('y1', String(from.y));
      line.setAttribute('x2', String(to.x));
      line.setAttribute('y2', String(to.y));
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
    const size = n.kind === 'boss' ? m.bossSize : m.nodeSize;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `map-dot kind-${n.kind}`;
    if (isAvail) btn.classList.add('available');
    if (isHere) btn.classList.add('current');
    if (isDone) btn.classList.add('done');
    if (isLocked) btn.classList.add('locked');
    if (n.kind === 'boss') btn.classList.add('boss');
    btn.style.left = `${p.x - size / 2}px`;
    btn.style.top = `${p.y - size / 2}px`;
    btn.style.width = `${size}px`;
    btn.style.height = `${size}px`;
    btn.style.fontSize = `${Math.max(0.85, size * 0.028)}rem`;
    btn.dataset.nodeId = n.id;
    btn.dataset.act = String(n.act);
    btn.innerHTML = `<span class="map-dot-emoji">${n.emoji}</span>`;
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
        }, SELECT_FLASH_MS);
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

  requestAnimationFrame(() => applyStageScale(el, stage));
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => applyStageScale(el, stage));
    ro.observe(el);
  }

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
    <p class="adult-text center">下一幕：${next.emoji} ${next.title}</p>
    <p class="kid-prompt" style="font-size:1.1rem">往上 · 第 ${nextAct} 幕</p>
  `;
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
