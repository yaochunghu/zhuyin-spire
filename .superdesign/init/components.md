# Shared UI primitives

## Repository UI architecture

- Framework: Vite 8 + TypeScript, no component framework.
- Rendering: imperative DOM (`document.createElement`, `innerHTML`, native listeners).
- Component library: custom only.
- Styling: one vanilla stylesheet at `src/styles/main.css`.
- Interaction primitives remain native buttons, inputs, dialogs, and horizontally scrolling DOM cards.

## `src/ui/cards.ts` — card-face markup

The shared card renderer used by combat, rewards, shops, deck viewers, smithing, and removal flows.

```ts
import { getCard, type CardDef, type CardJob } from '../data/cards';

const JOB_LABELS: Record<CardJob, { icon: string; label: string }> = {
  frontload: { icon: '⚔️', label: '立刻攻擊' },
  area: { icon: '👥', label: '全體攻擊' },
  defense: { icon: '🛡️', label: '防守' },
  scaling: { icon: '🌱', label: '成長' },
  draw: { icon: '📖', label: '抽牌' },
  energy: { icon: '⚡', label: '能量' },
};

export function jobLabel(job?: CardJob): string {
  if (!job) return '';
  const data = JOB_LABELS[job];
  return `${data.icon} ${data.label}`;
}

export function typeIcon(type: string): string {
  if (type === 'attack') return '⚔️';
  if (type === 'block') return '🛡️';
  if (type === 'power') return '🌟';
  return '✨';
}

export function typeLabel(type: string): string {
  if (type === 'attack') return '攻擊';
  if (type === 'block') return '防守';
  if (type === 'power') return '能力';
  return '技能';
}

export function effectLabel(def: CardDef): string {
  if (def.type === 'attack') {
    if (def.hits && def.hits > 1) return `${def.value}×${def.hits}`;
    if (def.bonusBlock) return `${def.value}+🛡${def.bonusBlock}`;
    return String(def.value);
  }
  if (def.type === 'block') return String(def.value);
  if (def.draw) return `+${def.draw}`;
  return '';
}

export function formatCardDescription(def: CardDef): string {
  if (def.description && def.description.trim().length > 0) return def.description.trim();
  if (def.type === 'attack') {
    if (def.hits && def.hits > 1) return `造成 ${def.value} 點傷害 ${def.hits} 次。`;
    let s = `造成 ${def.value} 點傷害。`;
    if (def.bonusBlock) s += ` 獲得 ${def.bonusBlock} 點護盾。`;
    return s;
  }
  if (def.type === 'block') return `獲得 ${def.value} 點護盾。`;
  if (def.draw) return `抽 ${def.draw} 張牌。`;
  return '使用此牌。';
}

export function cardFaceHtml(def: CardDef | ReturnType<typeof getCard>): string {
  const emoji = def.icon ?? def.cues[0]?.emoji ?? '';
  const desc = formatCardDescription(def);
  const job = jobLabel(def.job);
  return `
    ${'upgraded' in def && def.upgraded ? '<div class="card-upgrade-badge" aria-label="已升級">+</div>' : ''}
    <div class="card-top">
      <div class="cost" aria-hidden="true">${def.cost}</div>
      <div class="card-type-badge" aria-hidden="true" title="${typeLabel(def.type)}">${typeIcon(def.type)}</div>
    </div>
    <div class="card-art">
      <div class="zhuyin">${def.zhuyin}</div>
      <div class="card-emoji" aria-hidden="true">${emoji}</div>
    </div>
    <div class="card-name">${def.name}</div>
    <div class="card-desc-box">
      ${job ? `<div class="card-job">${job}</div>` : ''}
      <div class="card-desc">${desc}</div>
    </div>
  `;
}
```

## `src/ui/modal.ts` — modal accessibility

Shared body scroll lock and keyboard focus trap for options, phone menu, and deck dialogs.

```ts
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
```

## `src/ui/responsive.ts` — phone-layout contract

```ts
const PHONE_LAYOUT_QUERY =
  '(max-width: 600px), (max-height: 500px) and (orientation: landscape)';

export function isPhoneLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_LAYOUT_QUERY).matches;
}
```

## Other shared primitives

- `src/ui/phoneMenu.ts`: native modal menu with pause/resume, volume, options, and deck entry.
- `src/ui/deckViewer.ts`: reusable deck modal with grouping, upgrades, focus trapping, and phone behavior.
- `src/ui/outcome.ts`: shared outcome/confetti overlays.
- `src/ui/cardFx.ts`: shared card and combat feedback animation helpers.
- `src/ui/pauseTimers.ts`: pause-aware timer registry.
