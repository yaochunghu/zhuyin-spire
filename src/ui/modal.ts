import { teachingTimers } from './pauseTimers';
import { cancelSpeech } from '../game/speech';

let scrollLocks = 0;

export function lockPageScroll(): () => void {
  scrollLocks += 1;
  document.body.classList.add('modal-open');
  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.classList.remove('modal-open');
  };
}

export function trapModalFocus(root: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const focusable = [
    ...root.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Full-viewport top-layer shell; existing responsive panels keep their layout. */
export function createModalShell(label: string): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.className = 'native-modal-shell';
  dialog.setAttribute('aria-label', label);
  return dialog;
}

const modalPauseReasons = new WeakMap<HTMLDialogElement, string>();
let modalSerial = 0;

export function showModalShell(dialog: HTMLDialogElement, onCancel: () => void): void {
  const reason = `modal-${++modalSerial}`;
  modalPauseReasons.set(dialog, reason);
  teachingTimers.pause(reason);
  cancelSpeech();
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    onCancel();
  });
  if (!dialog.isConnected) document.body.appendChild(dialog);
  dialog.showModal();
}

export function dismissModalShell(dialog: HTMLDialogElement | null): void {
  if (!dialog) return;
  const reason = modalPauseReasons.get(dialog);
  if (reason) teachingTimers.resume(reason);
  modalPauseReasons.delete(dialog);
  dialog.close();
  dialog.remove();
}
