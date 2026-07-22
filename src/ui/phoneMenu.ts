import { getVolume, setVolume, sfx, type VolLevel } from '../game/audio';
import type { Screen } from '../game/state';
import { lockPageScroll, trapModalFocus } from './modal';

export interface PhoneMenuOptions {
  screen: Screen;
  canViewDeck: boolean;
  onPause: () => void;
  onResume: () => void;
  onOpenOptions: (onClose: () => void) => void;
  onOpenDeck: () => void;
}

let root: HTMLElement | null = null;

function screenLabel(screen: Screen): string {
  if (screen === 'combat') return '戰鬥暫停';
  if (screen === 'castCheck' || screen === 'practice') return '注音暫停';
  if (screen === 'map') return '爬塔選單';
  return '遊戲選單';
}

export function openPhoneMenu(options: PhoneMenuOptions): void {
  if (root) return;
  const previousFocus = document.activeElement as HTMLElement | null;
  const releaseScroll = lockPageScroll();
  options.onPause();

  root = document.createElement('div');
  root.id = 'zhuyin-phone-menu-root';
  let resumed = false;
  const resume = (): void => {
    if (resumed) return;
    resumed = true;
    options.onResume();
  };
  const close = (shouldResume = true): void => {
    root?.remove();
    root = null;
    releaseScroll();
    if (shouldResume) resume();
    previousFocus?.focus();
  };

  const backdrop = document.createElement('div');
  backdrop.className = 'phone-menu-backdrop';
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });

  const dialog = document.createElement('div');
  dialog.className = 'phone-menu-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', screenLabel(options.screen));
  dialog.innerHTML = `
    <div class="phone-menu-head">
      <div>
        <div class="kid-prompt">⏸️ ${screenLabel(options.screen)}</div>
        <p class="adult-text">遊戲已停在這裡</p>
      </div>
    </div>
  `;

  const resumeButton = document.createElement('button');
  resumeButton.type = 'button';
  resumeButton.className = 'btn-primary phone-menu-resume';
  resumeButton.textContent = '▶️ 繼續玩';
  resumeButton.addEventListener('click', () => {
    sfx.click();
    close();
  });
  dialog.appendChild(resumeButton);

  const volumeLabel = document.createElement('p');
  volumeLabel.className = 'phone-menu-label adult-text';
  volumeLabel.textContent = '音量';
  dialog.appendChild(volumeLabel);
  const volumeRow = document.createElement('div');
  volumeRow.className = 'phone-menu-volume';
  const levels: Array<{ value: VolLevel; label: string }> = [
    { value: 1, label: '🔊 大' },
    { value: 0.45, label: '🔉 小' },
    { value: 0, label: '🔇 靜音' },
  ];
  const paintVolume = (): void => {
    volumeRow.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      const active = Number(button.dataset.volume) === getVolume();
      button.classList.toggle('on', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  for (const item of levels) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-secondary phone-menu-volume-btn';
    button.dataset.volume = String(item.value);
    button.textContent = item.label;
    button.addEventListener('click', () => {
      setVolume(item.value);
      sfx.click();
      paintVolume();
    });
    volumeRow.appendChild(button);
  }
  paintVolume();
  dialog.appendChild(volumeRow);

  const links = document.createElement('div');
  links.className = 'phone-menu-links';
  const optionsButton = document.createElement('button');
  optionsButton.type = 'button';
  optionsButton.className = 'btn-secondary';
  optionsButton.textContent = '⚙️ 完整選項';
  optionsButton.addEventListener('click', () => {
    sfx.click();
    close(false);
    options.onOpenOptions(resume);
  });
  links.appendChild(optionsButton);

  if (options.canViewDeck) {
    const deck = document.createElement('button');
    deck.type = 'button';
    deck.className = 'btn-secondary';
    deck.textContent = '🃏 查看牌組';
    deck.addEventListener('click', () => {
      sfx.click();
      close();
      options.onOpenDeck();
    });
    links.appendChild(deck);
  }

  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true') {
    const debug = document.createElement('button');
    debug.type = 'button';
    debug.className = 'btn-secondary phone-menu-debug';
    debug.textContent = '🐛 測試工具';
    debug.addEventListener('click', () => {
      close();
      window.dispatchEvent(new CustomEvent('zhuyin-debug-open-phone'));
    });
    links.appendChild(debug);
  }
  dialog.appendChild(links);
  backdrop.appendChild(dialog);
  root.appendChild(backdrop);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    trapModalFocus(root!, event);
  });
  document.body.appendChild(root);
  resumeButton.focus();
}
