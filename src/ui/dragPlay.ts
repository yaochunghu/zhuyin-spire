/**
 * Pointer drag-and-release card play (touch-first).
 * Invalid drop / cancel → no energy spent (caller only plays on valid drop).
 */

import type { CardDef } from '../data/cards';
import { cardTargetType } from '../game/battle/effects';

export type DropKind = 'enemy' | 'all' | 'self';

export interface DropTarget {
  kind: DropKind;
  /** Enemy instance ids for this drop */
  targetIds: string[];
  el: HTMLElement;
}

export interface DragPlayOptions {
  cardEl: HTMLElement;
  def: CardDef;
  enabled: boolean;
  /** Resolve current drop zones from the stage (re-queried on move/up). */
  getTargets: () => DropTarget[];
  /** Called only on valid release. */
  onPlay: (targetIds: string[]) => void;
  /** Tap without drag — optional fallback. */
  onTap?: () => void;
  /** Let touch users swipe the phone hand without accidentally playing a card. */
  allowHorizontalScroll?: boolean;
}

const DRAG_THRESHOLD_PX = 12;

export type CardGestureIntent = 'pending' | 'scroll' | 'drag' | 'cancel';

/** Pure classifier kept separate so phone gesture arbitration is testable. */
export function classifyCardGesture(
  dx: number,
  dy: number,
  thresholdPx = DRAG_THRESHOLD_PX,
): CardGestureIntent {
  if (Math.hypot(dx, dy) < thresholdPx) return 'pending';
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax >= ay * 1.05) return 'scroll';
  if (dy < 0) return 'drag';
  return 'cancel';
}

/** Remove every drag ghost / highlight left on the page (safe to call often). */
export function cleanupDragUi(root: ParentNode = document): void {
  document.querySelectorAll('.card-drag-ghost').forEach((el) => el.remove());
  root.querySelectorAll('.drop-hot, .drop-valid, .drop-dim, .card-dragging, .card-ghost-source').forEach(
    (el) => {
      el.classList.remove(
        'drop-hot',
        'drop-valid',
        'drop-dim',
        'card-dragging',
        'card-ghost-source',
      );
    },
  );
  // Also clear on body-level leftovers
  document.querySelectorAll('.drop-hot, .drop-valid, .drop-dim, .card-ghost-source').forEach((el) => {
    el.classList.remove('drop-hot', 'drop-valid', 'drop-dim', 'card-ghost-source');
  });
}

function elementFromPoint(x: number, y: number): Element | null {
  return document.elementFromPoint(x, y);
}

function findDropUnderPoint(
  x: number,
  y: number,
  targets: DropTarget[],
): DropTarget | null {
  const hit = elementFromPoint(x, y);
  if (!hit) return null;
  for (const t of targets) {
    if (t.el === hit || t.el.contains(hit)) return t;
  }
  let node: Element | null = hit;
  while (node && node !== document.body) {
    const drop = (node as HTMLElement).dataset?.drop;
    if (drop) {
      const match = targets.find((t) => t.el === node || t.el.contains(node!));
      if (match) return match;
      if (drop === 'enemy') {
        const id = (node as HTMLElement).dataset.enemyId;
        const byId = targets.find(
          (t) => t.kind === 'enemy' && t.targetIds[0] === id,
        );
        if (byId) return byId;
      }
      if (drop === 'all') {
        const all = targets.find((t) => t.kind === 'all');
        if (all) return all;
      }
      if (drop === 'self') {
        const self = targets.find((t) => t.kind === 'self');
        if (self) return self;
      }
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Bind drag-and-release on a hand card button.
 * Uses pointer events + setPointerCapture for touch tablets.
 */
export function bindCardDrag(opts: DragPlayOptions): void {
  const {
    cardEl,
    def,
    enabled,
    getTargets,
    onPlay,
    onTap,
    allowHorizontalScroll = false,
  } = opts;
  if (!enabled) return;

  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let ghost: HTMLElement | null = null;
  let activeHot: DropTarget | null = null;
  let finished = false;
  let gesture: CardGestureIntent = 'pending';

  const targetType = cardTargetType(def);

  const removeGhost = (): void => {
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    // Belt-and-suspenders: never leave orphans on body
    document.querySelectorAll('.card-drag-ghost').forEach((el) => el.remove());
  };

  const endDrag = (): void => {
    const stage = cardEl.closest('.combat-stage') ?? document;
    cleanupDragUi(stage);
    cardEl.classList.remove('card-dragging', 'card-ghost-source');
    removeGhost();
    pointerId = null;
    dragging = false;
    gesture = 'pending';
    activeHot = null;
  };

  const finishOnce = (fn: () => void): void => {
    if (finished) return;
    finished = true;
    fn();
  };

  const updateHot = (x: number, y: number): void => {
    const targets = getTargets();
    if (ghost) ghost.style.pointerEvents = 'none';
    const next = findDropUnderPoint(x, y, targets);

    if (activeHot?.el !== next?.el) {
      activeHot?.el.classList.remove('drop-hot');
      next?.el.classList.add('drop-hot');
      activeHot = next;
    }
  };

  const startDrag = (e: PointerEvent): void => {
    dragging = true;
    gesture = 'drag';
    if (allowHorizontalScroll) {
      try {
        cardEl.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    cardEl.classList.add('card-ghost-source');
    document.querySelectorAll('.card-drag-ghost').forEach((el) => el.remove());
    ghost = document.createElement('div');
    ghost.className = `card-drag-ghost card ${def.type}`;
    ghost.innerHTML = cardEl.innerHTML;
    ghost.style.left = '0';
    ghost.style.top = '0';
    ghost.style.pointerEvents = 'none';
    document.body.appendChild(ghost);

    const stage = cardEl.closest('.combat-stage') ?? document;
    for (const target of getTargets()) target.el.classList.add('drop-valid');
    if (targetType === 'singleEnemy' || targetType === 'allEnemies') {
      stage.querySelectorAll<HTMLElement>('[data-drop="enemy"]').forEach((el) => {
        if (!el.classList.contains('drop-valid')) el.classList.add('drop-dim');
      });
    }
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (!enabled || e.button !== 0) return;
    if (cardEl.hasAttribute('disabled') || cardEl.classList.contains('unplayable')) {
      return;
    }
    finished = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    dragging = false;
    gesture = 'pending';
    // Phone touch must stay uncaptured until its intent is clear so the hand
    // can pan. A mouse has no competing native pan gesture, so retain the
    // immediate capture used by the larger-screen drag interaction.
    if (!allowHorizontalScroll || e.pointerType === 'mouse') {
      try {
        cardEl.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (pointerId !== e.pointerId || finished) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!dragging) {
      if (allowHorizontalScroll && e.pointerType !== 'mouse') {
        gesture = classifyCardGesture(dx, dy);
        if (gesture === 'pending') return;
        if (gesture === 'scroll' || gesture === 'cancel') return;
        e.preventDefault();
        startDrag(e);
      } else {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        startDrag(e);
      }
    }

    if (ghost) {
      const w = ghost.offsetWidth || 100;
      const h = ghost.offsetHeight || 130;
      ghost.style.transform = `translate(${e.clientX - w / 2}px, ${e.clientY - h / 2}px)`;
    }
    updateHot(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (pointerId !== e.pointerId) return;
    try {
      cardEl.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    finishOnce(() => {
      if (gesture === 'scroll' || gesture === 'cancel') {
        endDrag();
        cleanupDragUi();
        return;
      }
      if (dragging) {
        if (ghost) ghost.style.pointerEvents = 'none';
        const targets = getTargets();
        const drop = findDropUnderPoint(e.clientX, e.clientY, targets);
        // Clean UI **before** play/render so ghosts never survive a re-render race
        endDrag();
        if (
          drop &&
          (drop.kind === 'self' || drop.targetIds.length > 0 || drop.kind === 'all')
        ) {
          onPlay(drop.targetIds);
          // Play may re-render without unmounting body ghosts if something re-created them
          cleanupDragUi();
          return;
        }
        // Invalid drop — cancel
        cleanupDragUi();
        return;
      }

      endDrag();
      onTap?.();
      cleanupDragUi();
    });
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (pointerId !== e.pointerId) return;
    finishOnce(() => {
      endDrag();
      cleanupDragUi();
    });
  };

  // Lost capture / left window — still clean up
  const onLostCapture = (): void => {
    if (pointerId === null) return;
    finishOnce(() => {
      endDrag();
      cleanupDragUi();
    });
  };

  cardEl.addEventListener('pointerdown', onPointerDown);
  cardEl.addEventListener('pointermove', onPointerMove);
  cardEl.addEventListener('pointerup', onPointerUp);
  cardEl.addEventListener('pointercancel', onPointerCancel);
  cardEl.addEventListener('lostpointercapture', onLostCapture);
  cardEl.addEventListener('dragstart', (ev) => ev.preventDefault());
}

/** Collect drop zones from a combat stage root for a card. */
export function collectDropTargets(
  stage: ParentNode,
  def: CardDef,
  livingEnemyIds: string[],
): DropTarget[] {
  const t = cardTargetType(def);
  const out: DropTarget[] = [];

  if (t === 'self') {
    const self = stage.querySelector<HTMLElement>('[data-drop="self"]');
    if (self) out.push({ kind: 'self', targetIds: [], el: self });
  } else if (t === 'allEnemies') {
    const allZone = stage.querySelector<HTMLElement>('[data-drop="all"]');
    if (allZone) {
      out.push({ kind: 'all', targetIds: [...livingEnemyIds], el: allZone });
    }
    for (const id of livingEnemyIds) {
      const el = stage.querySelector<HTMLElement>(`[data-enemy-id="${id}"]`);
      if (el) out.push({ kind: 'all', targetIds: [...livingEnemyIds], el });
    }
  } else {
    for (const id of livingEnemyIds) {
      const el = stage.querySelector<HTMLElement>(`[data-enemy-id="${id}"]`);
      if (el) out.push({ kind: 'enemy', targetIds: [id], el });
    }
  }
  return out;
}
