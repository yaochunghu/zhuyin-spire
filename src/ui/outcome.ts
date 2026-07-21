import { sfx } from '../game/audio';
import { session } from './runtime';

function confettiLayer(): HTMLElement {
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  layer.setAttribute('aria-hidden', 'true');
  const colors = ['#ffd76a', '#7ee0c8', '#ff6b8a', '#9ad4ff', '#c9a0ff'];
  for (let i = 0; i < 28; i += 1) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    p.style.left = `${(i * 3.7 + Math.random() * 4) % 100}%`;
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--rot', `${Math.random() * 360}deg`);
    layer.appendChild(p);
  }
  return layer;
}

function burstParticles(container: HTMLElement, count: number, kind: 'star' | 'spark'): void {
  const glyphs = kind === 'star' ? ['✨', '⭐', '🌟', '💫'] : ['✨', '💥', '⭐', '・'];
  for (let i = 0; i < count; i += 1) {
    const s = document.createElement('span');
    s.className = `burst-particle burst-${kind}`;
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 48 + Math.random() * 70;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    s.style.animationDelay = `${Math.random() * 0.12}s`;
    s.textContent = glyphs[i % glyphs.length] ?? '✨';
    container.appendChild(s);
  }
}

export function createConfettiLayer(): HTMLElement {
  return confettiLayer();
}

/**
 * Full-screen outcome beat before reward / defeat.
 * Preschool-safe: poof + stars (kill), soft faint (death).
 */
export function playOutcomeOverlay(
  kind: 'kill' | 'faint',
  opts: { emoji: string; isBoss?: boolean; isElite?: boolean },
  onDone: () => void,
): void {
  if (session.outcomeAnimPlaying) {
    onDone();
    return;
  }
  session.outcomeAnimPlaying = true;

  const overlay = document.createElement('div');
  overlay.className = `outcome-overlay outcome-${kind}`;
  overlay.setAttribute('role', 'presentation');

  const stage = document.createElement('div');
  stage.className = 'outcome-stage';

  if (kind === 'kill') {
    sfx.monsterPoof();
    window.setTimeout(() => sfx.win(), 280);

    const monster = document.createElement('div');
    monster.className = 'outcome-actor kill-actor';
    monster.textContent = opts.emoji;

    const poof = document.createElement('div');
    poof.className = 'outcome-poof';
    poof.textContent = '💨';

    const burst = document.createElement('div');
    burst.className = 'outcome-burst';
    const stars = opts.isBoss ? 16 : opts.isElite ? 14 : 12;
    burstParticles(burst, stars, 'star');

    const caption = document.createElement('div');
    caption.className = 'outcome-caption kid-prompt';
    caption.textContent = opts.isBoss ? '🏆 登頂！' : opts.isElite ? '💪 菁英倒下！' : '✨ 打倒了！';

    stage.appendChild(monster);
    stage.appendChild(poof);
    stage.appendChild(burst);
    stage.appendChild(caption);
    if (opts.isBoss) overlay.appendChild(confettiLayer());
  } else {
    sfx.heroFaint();
    window.setTimeout(() => sfx.lose(), 400);

    const hero = document.createElement('div');
    hero.className = 'outcome-actor faint-actor';
    hero.textContent = '🧙';

    const zzz = document.createElement('div');
    zzz.className = 'outcome-zzz';
    zzz.innerHTML = '<span>z</span><span>z</span><span>z</span>';

    const burst = document.createElement('div');
    burst.className = 'outcome-burst';
    burstParticles(burst, 8, 'spark');

    const caption = document.createElement('div');
    caption.className = 'outcome-caption kid-prompt faint-caption';
    caption.textContent = '💫 休息一下…';

    stage.appendChild(hero);
    stage.appendChild(zzz);
    stage.appendChild(burst);
    stage.appendChild(caption);
  }

  overlay.appendChild(stage);
  document.body.appendChild(overlay);

  const ms = kind === 'kill' ? (opts.isBoss ? 1600 : 1200) : 1400;
  window.setTimeout(() => {
    overlay.classList.add('outcome-out');
    window.setTimeout(() => {
      overlay.remove();
      session.outcomeAnimPlaying = false;
      onDone();
    }, 220);
  }, ms);
}
