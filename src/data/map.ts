/**
 * Spire-style map generation for zhuyin-spire.
 *
 * Path topology ported from (MIT):
 *   silverua/slay-the-spire-map-in-unity — Assets/Scripts/MapGenerator.cs
 * Pipeline: full grid → paths (start→pre-boss→boss) → connections →
 * remove crosses → prune isolates → room kinds / encounters.
 *
 * Product layout: 15 climb floors × 7 lanes, then a boss floor
 * (rows 0..14 climb, row 15 boss).
 */

import {
  GOLD_DANGER_BONUS,
  GOLD_ELITE_BASE,
  GOLD_FIGHT_BASE,
  REST_HEAL,
  restHealAmount,
  SHOP_CARD_PRICES,
} from './balance';
import { ACT_MULTI_ENCOUNTERS } from './encounters';
import {
  ACT_ELITE_POOL,
  ACT_NORMAL_POOL,
  BOSS_ID,
} from './enemies';

export type NodeKind =
  | 'fight'
  | 'elite'
  | 'rest'
  | 'shop'
  | 'treasure'
  | 'boss';
export type RewardTier = 'normal' | 'elite';
export type CastStage = 'early' | 'mid' | 'elite' | 'boss';
export type ActNumber = 1 | 2 | 3;

export interface MapNode {
  id: string;
  act: ActNumber;
  row: number;
  col: number;
  kind: NodeKind;
  emoji: string;
  label: string;
  enemyId?: string;
  encounterId?: string;
  castStage: CastStage;
  nextIds: string[];
  rewardTier?: RewardTier;
  goldBonus?: number;
  layoutX?: number;
  layoutY?: number;
}

export interface ActMap {
  act: ActNumber;
  title: string;
  emoji: string;
  cols: number;
  maxRow: number;
  nodes: MapNode[];
  startIds: string[];
  bossId: string;
}

export interface RunMap {
  acts: ActMap[];
}

const KIND_EMOJI: Record<NodeKind, string> = {
  fight: '⚔️',
  elite: '💀',
  rest: '🔥',
  shop: '🏪',
  treasure: '💎',
  boss: '🐉',
};

/** Climb rows 0..14, followed by the boss on row 15. */
export const CLIMB_ROWS = 15;
export const MAP_COLS = 7;
export const TREASURE_FLOOR = 8;

const WEIGHT_FIGHT = 10;
const WEIGHT_REST = 3.5;
const WEIGHT_SHOP = 2.2;
const WEIGHT_ELITE = 1.4;
const WEIGHT_TREASURE = 1.6;

const ACT_META: Record<
  ActNumber,
  { title: string; emoji: string; middleRows: number; cols: number }
> = {
  1: {
    title: '第一幕 · 入門塔',
    emoji: '🌱',
    middleRows: CLIMB_ROWS,
    cols: MAP_COLS,
  },
  2: {
    title: '第二幕 · 中層',
    emoji: '🔥',
    middleRows: CLIMB_ROWS,
    cols: MAP_COLS,
  },
  3: {
    title: '第三幕 · 塔頂',
    emoji: '👑',
    middleRows: CLIMB_ROWS,
    cols: MAP_COLS,
  },
};

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function randInt(min: number, maxInclusive: number, rng: () => number): number {
  return min + Math.floor(rng() * (maxInclusive - min + 1));
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function castStageFor(
  act: ActNumber,
  kind: NodeKind,
  row: number,
  maxMiddle: number,
): CastStage {
  if (kind === 'boss') return act === 1 ? 'mid' : act === 2 ? 'elite' : 'boss';
  if (kind === 'elite') return 'elite';
  const t = row / Math.max(1, maxMiddle - 1);
  if (act === 1) {
    if (t < 0.35) return 'early';
    if (t < 0.7) return 'mid';
    return 'elite';
  }
  if (act === 2) {
    if (t < 0.4) return 'mid';
    return 'elite';
  }
  if (t < 0.35) return 'elite';
  return 'boss';
}

function labelFor(kind: NodeKind, row: number): string {
  if (kind === 'rest') return '營火';
  if (kind === 'shop') return '商店';
  if (kind === 'elite') return '菁英';
  if (kind === 'treasure') return '寶箱';
  if (kind === 'boss') return 'Boss';
  return `戰鬥 ${row + 1}`;
}

// —— STS-style provisional grid node ——
interface GridPt {
  col: number;
  row: number;
}

interface ProvNode {
  pt: GridPt;
  next: GridPt[];
  incoming: GridPt[];
  layoutX: number;
  layoutY: number;
}

function ptKey(p: GridPt): string {
  return `${p.col},${p.row}`;
}

function ptEq(a: GridPt, b: GridPt): boolean {
  return a.col === b.col && a.row === b.row;
}

function hasPt(list: GridPt[], p: GridPt): boolean {
  return list.some((x) => ptEq(x, p));
}

function addOutgoing(n: ProvNode, p: GridPt): void {
  if (!hasPt(n.next, p)) n.next.push(p);
}

function addIncoming(n: ProvNode, p: GridPt): void {
  if (!hasPt(n.incoming, p)) n.incoming.push(p);
}

function removeOutgoing(n: ProvNode, p: GridPt): void {
  n.next = n.next.filter((x) => !ptEq(x, p));
}

function removeIncoming(n: ProvNode, p: GridPt): void {
  n.incoming = n.incoming.filter((x) => !ptEq(x, p));
}

/**
 * Full grid: climb rows 0..climbRows-1 have gridWidth cols;
 * boss row has single center cell (we still index full width for cross logic
 * but only boss col is used).
 *
 * Port of MapGenerator.PlaceLayer + GetFinalNode.
 */
function placeGrid(
  climbRows: number,
  gridWidth: number,
  rng: () => number,
): ProvNode[][] {
  const nodes: ProvNode[][] = [];
  for (let row = 0; row < climbRows; row += 1) {
    const layer: ProvNode[] = [];
    for (let col = 0; col < gridWidth; col += 1) {
      layer.push({
        pt: { col, row },
        next: [],
        incoming: [],
        layoutX: 0,
        layoutY: 0,
      });
    }
    nodes.push(layer);
  }
  // Boss layer: one logical row with gridWidth slots; only center used
  const bossRow = climbRows;
  const bossLayer: ProvNode[] = [];
  for (let col = 0; col < gridWidth; col += 1) {
    bossLayer.push({
      pt: { col, row: bossRow },
      next: [],
      incoming: [],
      layoutX: 0,
      layoutY: 0,
    });
  }
  nodes.push(bossLayer);
  void rng;
  return nodes;
}

function getNode(nodes: ProvNode[][], p: GridPt): ProvNode | null {
  if (p.row < 0 || p.row >= nodes.length) return null;
  const layer = nodes[p.row]!;
  if (p.col < 0 || p.col >= layer.length) return null;
  return layer[p.col]!;
}

function getFinalNode(gridWidth: number, bossRow: number): GridPt {
  return { col: Math.floor(gridWidth / 2), row: bossRow };
}

/**
 * Random path bottom-up with |dx| budget vs remaining height.
 * Port of MapGenerator.Path.
 */
function pathBetween(
  from: GridPt,
  to: GridPt,
  gridWidth: number,
  rng: () => number,
): GridPt[] {
  const toRow = to.row;
  const toCol = to.col;
  let lastCol = from.col;
  const path: GridPt[] = [{ col: from.col, row: from.row }];

  for (let row = from.row + 1; row < toRow; row += 1) {
    const candidates: number[] = [];
    const verticalDistance = toRow - row;

    for (const col of [lastCol, lastCol - 1, lastCol + 1]) {
      if (col < 0 || col >= gridWidth) continue;
      const horizontalDistance = Math.abs(toCol - col);
      if (horizontalDistance <= verticalDistance) candidates.push(col);
    }
    if (candidates.length === 0) candidates.push(lastCol);

    const candidateCol = pick(candidates, rng);
    path.push({ col: candidateCol, row });
    lastCol = candidateCol;
  }

  path.push({ col: to.col, row: to.row });
  return path;
}

/**
 * Port of MapGenerator.GeneratePaths.
 */
function generatePaths(
  gridWidth: number,
  climbRows: number,
  rng: () => number,
  opts: {
    numStarting: number;
    numPreBoss: number;
    extraPaths: number;
  },
): GridPt[][] {
  const bossRow = climbRows;
  const finalNode = getFinalNode(gridWidth, bossRow);
  const preBossRow = bossRow - 1;

  const cols = Array.from({ length: gridWidth }, (_, i) => i);
  shuffleInPlace(cols, rng);
  const startingXs = cols.slice(0, opts.numStarting);
  const startingPoints = startingXs.map((x) => ({ col: x, row: 0 }));

  shuffleInPlace(cols, rng);
  const preBossXs = cols.slice(0, opts.numPreBoss);
  const preBossPoints = preBossXs.map((x) => ({ col: x, row: preBossRow }));

  const numOfPaths =
    Math.max(opts.numStarting, opts.numPreBoss) + Math.max(0, opts.extraPaths);
  const paths: GridPt[][] = [];

  for (let i = 0; i < numOfPaths; i += 1) {
    const start = startingPoints[i % opts.numStarting]!;
    const end = preBossPoints[i % opts.numPreBoss]!;
    const path = pathBetween(start, end, gridWidth, rng);
    // Ensure last pre-boss then boss
    const last = path[path.length - 1]!;
    if (last.row !== preBossRow || last.col !== end.col) {
      path.push({ col: end.col, row: preBossRow });
    }
    path.push(finalNode);
    paths.push(path);
  }

  return paths;
}

function setUpConnections(nodes: ProvNode[][], paths: GridPt[][]): void {
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i += 1) {
      const a = getNode(nodes, path[i]!);
      const b = getNode(nodes, path[i + 1]!);
      if (!a || !b) continue;
      addOutgoing(a, b.pt);
      addIncoming(b, a.pt);
    }
  }
}

/**
 * Port of MapGenerator.RemoveCrossConnections.
 */
function removeCrossConnections(
  nodes: ProvNode[][],
  gridWidth: number,
  rng: () => number,
): void {
  const climbAndBoss = nodes.length;
  for (let i = 0; i < gridWidth - 1; i += 1) {
    for (let j = 0; j < climbAndBoss - 1; j += 1) {
      const node = getNode(nodes, { col: i, row: j });
      if (!node || (node.next.length === 0 && node.incoming.length === 0)) {
        continue;
      }
      const right = getNode(nodes, { col: i + 1, row: j });
      if (!right || (right.next.length === 0 && right.incoming.length === 0)) {
        continue;
      }
      const top = getNode(nodes, { col: i, row: j + 1 });
      if (!top) continue;
      const topRight = getNode(nodes, { col: i + 1, row: j + 1 });
      if (!topRight) continue;

      // Cross: node → topRight AND right → top
      if (!hasPt(node.next, topRight.pt)) continue;
      if (!hasPt(right.next, top.pt)) continue;

      // Uncross: add verticals
      addOutgoing(node, top.pt);
      addIncoming(top, node.pt);
      addOutgoing(right, topRight.pt);
      addIncoming(topRight, right.pt);

      const rnd = rng();
      if (rnd < 0.2) {
        removeOutgoing(node, topRight.pt);
        removeIncoming(topRight, node.pt);
        removeOutgoing(right, top.pt);
        removeIncoming(top, right.pt);
      } else if (rnd < 0.6) {
        removeOutgoing(node, topRight.pt);
        removeIncoming(topRight, node.pt);
      } else {
        removeOutgoing(right, top.pt);
        removeIncoming(top, right.pt);
      }
    }
  }
}

/** Organic jitter — port of RandomizeNodePositions (simplified). */
function randomizePositions(
  nodes: ProvNode[][],
  rng: () => number,
  randomize = 0.85,
): void {
  for (const layer of nodes) {
    for (const n of layer) {
      if (n.next.length === 0 && n.incoming.length === 0) continue;
      n.layoutX = Math.round((rng() - 0.5) * 2 * 16 * randomize);
      n.layoutY = Math.round((rng() - 0.5) * 2 * 12 * randomize);
    }
  }
}

function parentsOf(nodes: MapNode[], node: MapNode): MapNode[] {
  return nodes.filter((p) => p.nextIds.includes(node.id));
}

function weightedKind(
  row: number,
  climbRows: number,
  parents: MapNode[],
  rng: () => number,
): NodeKind {
  const last = climbRows - 1;
  if (row === 0) return 'fight';

  const parentKinds = new Set(parents.map((p) => p.kind));
  const noEarlyRest = row < 3;

  type Opt = { kind: NodeKind; w: number };
  const opts: Opt[] = [{ kind: 'fight', w: WEIGHT_FIGHT }];

  if (!noEarlyRest && !parentKinds.has('rest')) {
    opts.push({ kind: 'rest', w: WEIGHT_REST });
  }
  if (!parentKinds.has('shop')) {
    opts.push({ kind: 'shop', w: WEIGHT_SHOP });
  }
  if (
    row >= 4 &&
    row < last &&
    row !== TREASURE_FLOOR &&
    !parentKinds.has('treasure')
  ) {
    opts.push({ kind: 'treasure', w: WEIGHT_TREASURE });
  }
  if (row >= 3 && row !== last && !parentKinds.has('elite')) {
    const eliteA = Math.floor(climbRows * 0.35);
    const eliteB = Math.floor(climbRows * 0.65);
    const boost = row === eliteA || row === eliteB ? 2.5 : 1;
    opts.push({ kind: 'elite', w: WEIGHT_ELITE * boost });
  }

  const total = opts.reduce((s, o) => s + o.w, 0);
  let roll = rng() * total;
  for (const o of opts) {
    roll -= o.w;
    if (roll <= 0) return o.kind;
  }
  return 'fight';
}

function assignKinds(
  act: ActNumber,
  mapNodes: MapNode[],
  climbRows: number,
  rng: () => number,
): void {
  const last = climbRows - 1;
  const byRow = new Map<number, MapNode[]>();
  for (const n of mapNodes) {
    const list = byRow.get(n.row) ?? [];
    list.push(n);
    byRow.set(n.row, list);
  }

  for (const n of byRow.get(0) ?? []) n.kind = 'fight';

  for (const n of byRow.get(TREASURE_FLOOR) ?? []) n.kind = 'treasure';

  // Floor 15 is the guaranteed recovery beat immediately before the boss.
  for (const n of byRow.get(last) ?? []) n.kind = 'rest';

  for (const n of mapNodes) {
    if (n.kind === 'boss') continue;
    if (n.row === 0 || n.row === TREASURE_FLOOR || n.row === last) continue;
    const parents = parentsOf(mapNodes, n);
    n.kind = weightedKind(n.row, climbRows, parents, rng);
  }

  // Ensure at least one rest on mid bands if any nodes exist there
  for (const band of [
    Math.max(3, Math.floor(climbRows * 0.28)),
    Math.floor(climbRows * 0.5),
    Math.floor(climbRows * 0.72),
  ]) {
    const rowNodes = byRow.get(band) ?? [];
    if (rowNodes.length && !rowNodes.some((n) => n.kind === 'rest')) {
      const c =
        rowNodes.find((n) => !parentsOf(mapNodes, n).some((p) => p.kind === 'rest')) ??
        rowNodes[0];
      if (c && c.row !== TREASURE_FLOOR) c.kind = 'rest';
    }
  }

  for (const n of mapNodes) {
    if (n.kind === 'boss') {
      n.emoji = act === 3 ? '👑' : act === 2 ? '🦅' : '🐉';
    } else {
      n.emoji = KIND_EMOJI[n.kind];
    }
    n.label = labelFor(n.kind, n.row);
    n.castStage = castStageFor(act, n.kind, n.row, climbRows);
  }
}

function attachEncounters(
  act: ActNumber,
  nodes: MapNode[],
  rng: () => number,
): void {
  for (const n of nodes) {
    n.enemyId = undefined;
    n.encounterId = undefined;
    n.rewardTier = undefined;
    n.goldBonus = undefined;

    if (n.kind === 'fight') {
      if (rng() < 0.32) {
        if (act === 1 && n.row >= 3 && rng() < 0.1) {
          n.encounterId = 'slimeTriple';
        } else {
          n.encounterId = pick(ACT_MULTI_ENCOUNTERS[act], rng);
        }
      } else {
        n.enemyId = pick(ACT_NORMAL_POOL[act], rng);
      }
      if (rng() < 0.15) {
        n.rewardTier = 'elite';
        n.goldBonus = GOLD_DANGER_BONUS;
        if (!n.encounterId) {
          n.enemyId = pick(
            act === 1 ? ['fang', 'ember', 'rock'] : ACT_NORMAL_POOL[act],
            rng,
          );
        }
      } else {
        n.rewardTier = 'normal';
      }
    } else if (n.kind === 'elite') {
      if (rng() < 0.35) n.encounterId = 'eliteDuo';
      else n.enemyId = pick(ACT_ELITE_POOL[act], rng);
      n.rewardTier = 'elite';
    } else if (n.kind === 'boss') {
      n.enemyId = BOSS_ID[act];
      n.rewardTier = 'elite';
    } else if (n.kind === 'treasure') {
      n.rewardTier = 'normal';
    }
  }
}

/**
 * Build one act using STS path-first generator.
 */
function generateAct(act: ActNumber, rng: () => number): ActMap {
  const meta = ACT_META[act];
  const { middleRows: climbRows, cols: gridWidth, title, emoji } = meta;
  const maxRow = climbRows; // boss row index
  const bossCol = Math.floor(gridWidth / 2);

  const numStarting = randInt(3, 4, rng);
  const numPreBoss = randInt(2, 3, rng);
  const extraPaths = randInt(1, 2, rng);

  // 1) Full grid
  const grid = placeGrid(climbRows, gridWidth, rng);

  // 2) Paths
  const paths = generatePaths(gridWidth, climbRows, rng, {
    numStarting,
    numPreBoss,
    extraPaths,
  });

  // 3) Connections
  setUpConnections(grid, paths);

  // 4) Uncross
  removeCrossConnections(grid, gridWidth, rng);

  // 5) Jitter
  randomizePositions(grid, rng, 0.9);

  // 6) Prune isolates → MapNode list
  // Boss must only be the center cell
  const bossId = `a${act}-boss`;
  const mapNodes: MapNode[] = [];
  const idByPt = new Map<string, string>();

  for (const layer of grid) {
    for (const pn of layer) {
      const isBossCell = pn.pt.row === maxRow;
      if (isBossCell && pn.pt.col !== bossCol) continue;
      if (!isBossCell && pn.next.length === 0 && pn.incoming.length === 0) {
        continue;
      }

      const id = isBossCell
        ? bossId
        : `a${act}-r${pn.pt.row}-c${pn.pt.col}`;
      idByPt.set(ptKey(pn.pt), id);

      const kind: NodeKind = isBossCell ? 'boss' : 'fight';
      mapNodes.push({
        id,
        act,
        row: pn.pt.row,
        col: pn.pt.col,
        kind,
        emoji: isBossCell
          ? act === 3
            ? '👑'
            : act === 2
              ? '🦅'
              : '🐉'
          : KIND_EMOJI.fight,
        label: isBossCell
          ? act === 1
            ? '一幕王'
            : act === 2
              ? '二幕王'
              : '終焉王'
          : labelFor('fight', pn.pt.row),
        castStage: castStageFor(act, kind, pn.pt.row, climbRows),
        nextIds: [],
        layoutX: isBossCell ? 0 : pn.layoutX,
        layoutY: isBossCell ? -8 : pn.layoutY,
        enemyId: isBossCell ? BOSS_ID[act] : undefined,
        rewardTier: isBossCell ? 'elite' : undefined,
      });
    }
  }

  // Resolve nextIds using pruned id map only
  for (const layer of grid) {
    for (const pn of layer) {
      const fromId = idByPt.get(ptKey(pn.pt));
      if (!fromId) continue;
      const fromNode = mapNodes.find((n) => n.id === fromId);
      if (!fromNode) continue;
      for (const q of pn.next) {
        const toId = idByPt.get(ptKey(q));
        if (toId && !fromNode.nextIds.includes(toId)) {
          fromNode.nextIds.push(toId);
        }
      }
    }
  }

  // Starts = row 0 survivors
  const startIds = mapNodes
    .filter((n) => n.row === 0)
    .sort((a, b) => a.col - b.col)
    .map((n) => n.id);

  // Safety: every start must reach boss — if not, add a straight column path
  for (const sid of startIds) {
    if (!canReach(mapNodes, sid, bossId)) {
      patchPathToBoss(mapNodes, sid, bossId, act, climbRows, bossCol, idByPt, grid);
    }
  }

  assignKinds(act, mapNodes, climbRows, rng);
  attachEncounters(act, mapNodes, rng);

  return {
    act,
    title,
    emoji,
    cols: gridWidth,
    maxRow,
    nodes: mapNodes,
    startIds,
    bossId,
  };
}

function canReach(nodes: MapNode[], fromId: string, bossId: string): boolean {
  const seen = new Set<string>();
  const q = [fromId];
  while (q.length) {
    const id = q.pop()!;
    if (id === bossId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = nodes.find((x) => x.id === id);
    if (!n) continue;
    for (const next of n.nextIds) q.push(next);
  }
  return false;
}

/** Rare repair: force a monotone path so start always reaches boss. */
function patchPathToBoss(
  mapNodes: MapNode[],
  startId: string,
  bossId: string,
  act: ActNumber,
  climbRows: number,
  bossCol: number,
  idByPt: Map<string, string>,
  grid: ProvNode[][],
): void {
  const start = mapNodes.find((n) => n.id === startId);
  if (!start) return;
  let col = start.col;
  let prev = start;
  for (let row = 1; row < climbRows; row += 1) {
    // step toward bossCol
    if (col < bossCol) col += 1;
    else if (col > bossCol) col -= 1;
    const key = ptKey({ col, row });
    let id = idByPt.get(key);
    if (!id) {
      // resurrect cell
      id = `a${act}-r${row}-c${col}`;
      idByPt.set(key, id);
      const pn = getNode(grid, { col, row });
      mapNodes.push({
        id,
        act,
        row,
        col,
        kind: 'fight',
        emoji: KIND_EMOJI.fight,
        label: labelFor('fight', row),
        castStage: castStageFor(act, 'fight', row, climbRows),
        nextIds: [],
        layoutX: pn?.layoutX ?? 0,
        layoutY: pn?.layoutY ?? 0,
      });
    }
    const cur = mapNodes.find((n) => n.id === id)!;
    if (!prev.nextIds.includes(id)) prev.nextIds.push(id);
    prev = cur;
  }
  if (!prev.nextIds.includes(bossId)) prev.nextIds.push(bossId);
}

export function generateRunMap(rng: () => number = Math.random): RunMap {
  return {
    acts: [generateAct(1, rng), generateAct(2, rng), generateAct(3, rng)],
  };
}

export function getActMap(runMap: RunMap, actIndex: number): ActMap {
  return runMap.acts[actIndex] ?? runMap.acts[0]!;
}

export function findNode(
  runMap: RunMap,
  nodeId: string | null | undefined,
): MapNode | null {
  if (!nodeId) return null;
  for (const act of runMap.acts) {
    const n = act.nodes.find((x) => x.id === nodeId);
    if (n) return n;
  }
  return null;
}

export function findNodeInAct(act: ActMap, nodeId: string): MapNode | null {
  return act.nodes.find((n) => n.id === nodeId) ?? null;
}

export function availableNextNodes(
  act: ActMap,
  currentNodeId: string | null,
): MapNode[] {
  if (!currentNodeId) {
    return act.startIds
      .map((id) => findNodeInAct(act, id))
      .filter((n): n is MapNode => !!n);
  }
  const cur = findNodeInAct(act, currentNodeId);
  if (!cur) return [];
  return cur.nextIds
    .map((id) => findNodeInAct(act, id))
    .filter((n): n is MapNode => !!n);
}

export function allStartsReachBoss(act: ActMap): boolean {
  for (const startId of act.startIds) {
    if (!canReach(act.nodes, startId, act.bossId)) return false;
  }
  return true;
}

export {
  REST_HEAL,
  restHealAmount,
  GOLD_FIGHT_BASE,
  GOLD_ELITE_BASE,
  SHOP_CARD_PRICES,
  GOLD_DANGER_BONUS,
};
