import type { RelicDef } from '../data/relics';
import { sfx } from '../game/audio';
import {
  createModalShell,
  dismissModalShell,
  showModalShell,
  trapModalFocus,
} from './modal';

let inspectDialog: HTMLDialogElement | null = null;
let inspectOpener: HTMLElement | null = null;

/** Collectible token for one owned relic. Opens the inspect dialog. */
export function relicBadgeButton(relic: RelicDef): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'relic-badge';
  button.dataset.relicId = relic.id;
  button.textContent = relic.emoji;
  button.setAttribute('aria-label', `查看遺物：${relic.name}`);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    sfx.click();
    openRelicInspect(relic, button);
  });
  return button;
}

export function renderRelicBadges(relics: readonly RelicDef[]): HTMLElement {
  const row = document.createElement('div');
  row.className = 'relic-badge-row';
  const names = relics.map((relic) => relic.name).join('、');
  row.setAttribute('aria-label', names ? `遺物：${names}` : '沒有遺物');
  for (const relic of relics) row.appendChild(relicBadgeButton(relic));
  return row;
}

export function closeRelicInspect(): void {
  if (!inspectDialog) return;
  dismissModalShell(inspectDialog);
  inspectDialog = null;
  const opener = inspectOpener;
  inspectOpener = null;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}

/** Touch inspect. Mounted on document.body so combat is not remounted. */
export function openRelicInspect(relic: RelicDef, opener?: HTMLElement): void {
  closeRelicInspect();
  inspectOpener = opener ?? null;
  const dialog = createModalShell(`查看遺物：${relic.name}`);
  dialog.classList.add('relic-inspect-dialog');
  const panel = document.createElement('div');
  panel.className = 'relic-inspect-panel';
  const emoji = document.createElement('p');
  emoji.className = 'relic-inspect-emoji';
  emoji.setAttribute('aria-hidden', 'true');
  emoji.textContent = relic.emoji;
  const name = document.createElement('h2');
  name.className = 'relic-inspect-name';
  name.textContent = relic.name;
  const blurb = document.createElement('p');
  blurb.className = 'relic-inspect-blurb';
  blurb.textContent = relic.blurb;
  const adult = document.createElement('p');
  adult.className = 'adult-text relic-inspect-adult';
  const adultLabel = document.createElement('span');
  adultLabel.className = 'relic-inspect-adult-label';
  adultLabel.textContent = '家長提示';
  adult.append(adultLabel, relic.adultNote);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'relic-inspect-close';
  close.textContent = '關閉';
  close.setAttribute('aria-label', '關閉遺物說明');
  close.addEventListener('click', () => {
    sfx.click();
    closeRelicInspect();
  });
  panel.append(emoji, name, blurb, adult, close);
  dialog.appendChild(panel);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeRelicInspect();
  });
  dialog.addEventListener('keydown', (event) => trapModalFocus(dialog, event));
  inspectDialog = dialog;
  showModalShell(dialog, closeRelicInspect);
  close.focus();
}
