import { deckCounts } from '../game/state';
import { sfx } from '../game/audio';
import { cardFaceHtml } from './cards';
import { lockPageScroll, trapModalFocus } from './modal';
import { run } from './runtime';

let bodyRoot: HTMLElement | null = null;

function deckContent(): { head: HTMLElement; grid: HTMLElement } {
  const head = document.createElement('div');
  head.className = 'deck-viewer-head';
  head.innerHTML = `
    <div class="kid-prompt">🃏 牌組 ×${run().deck.length}</div>
    <p class="adult-text">你現在擁有的注音牌（相同的會疊數字）</p>
  `;

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
  return { head, grid };
}

export function renderDeckViewer(onClose: () => void): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'deck-viewer map-deck-viewer';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '目前牌組');
  const { head, grid } = deckContent();
  overlay.append(head, grid);

  const close = document.createElement('button');
  close.className = 'btn-primary btn-kid-main deck-viewer-close';
  close.innerHTML = '<span class="btn-emoji">✅</span>';
  close.setAttribute('aria-label', '關閉牌組');
  close.addEventListener('click', () => {
    sfx.click();
    onClose();
  });
  overlay.appendChild(close);
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
  bodyRoot.querySelector<HTMLButtonElement>('.deck-viewer-close')?.focus();
}
