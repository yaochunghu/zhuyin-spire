/**
 * Minimal event screen. A later design pass replaces the emoji objects.
 */

import { getCard } from '../data/cards';
import { ENCOUNTERS } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import { getEvent } from '../data/events';
import { sfx } from '../game/audio';
import {
  choiceChips,
  choiceIsHidden,
  choiceReason,
  currentPickCards,
  currentPickPrompt,
} from '../game/eventEngine';
import {
  cancelEventChoice,
  chooseEventChoice,
  confirmEventCard,
  confirmEventChoice,
  continueEventResult,
  startEventCombat,
  takeEventOfferCard,
  toggleEventCard,
} from '../game/state';
import { cardFaceHtml } from './cards';
import { appendCoach, render, run, session } from './runtime';
import { voiceButton, voiceCardRead, voiceEventChoice, voiceEventOpened } from './voiceDirector';

function cardButton(defId: string, selected: boolean, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'event-card' + (selected ? ' is-selected' : '');
  button.innerHTML = cardFaceHtml(getCard(defId));
  button.addEventListener('click', () => {
    sfx.click();
    onClick();
    render();
  });
  return button;
}

export function renderEvent(): HTMLElement {
  const state = run();
  const active = state.eventTrack.active;
  const event = active ? getEvent(active.eventId) : null;
  const el = document.createElement('div');
  el.className = 'screen event-screen';
  if (!event || !active) {
    el.textContent = '奇遇走丟了';
    return el;
  }
  el.dataset.eventId = event.id;
  el.dataset.act = String(state.actIndex + 1);
  el.dataset.phase = active.phase;

  if (session.eventSpokenId !== event.id) {
    session.eventSpokenId = event.id;
    // 老師 reads the title and the line (Web Speech keeps the line if a clip fails).
    voiceEventOpened(state, event);
  }

  const icon = document.createElement('div');
  icon.className = 'event-icon';
  icon.textContent = event.icon;
  const title = document.createElement('h2');
  title.tabIndex = -1;
  title.textContent = event.title;
  const line = document.createElement('p');
  line.className = 'event-presentation';
  line.textContent = event.presentation;
  const status = document.createElement('div');
  status.className = 'kid-status';
  const hp = document.createElement('span');
  hp.className = 'kid-stat';
  hp.textContent = `❤️${state.heroHp}/${state.heroMaxHp}`;
  const gold = document.createElement('span');
  gold.className = 'kid-stat';
  gold.textContent = `🪙${state.gold}`;
  status.append(hp, gold);
  // The intro sits on its own felt panel so text never rides on busy art;
  // the body column holds whatever the current phase asks the child to tap.
  const intro = document.createElement('div');
  intro.className = 'event-intro';
  intro.append(icon, title, line, status);
  const body = document.createElement('div');
  body.className = 'event-body';
  el.append(intro, body);
  appendCoach(el);

  if (session.eventFocusId !== event.id) {
    session.eventFocusId = event.id;
    queueMicrotask(() => title.focus());
  }

  if (active.phase === 'choose') {
    const choices = document.createElement('div');
    choices.className = 'event-choices';
    for (const [choiceIndex, choice] of event.choices.entries()) {
      if (choiceIsHidden(state, choice)) continue;
      const reason = choiceReason(state, choice);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'event-choice';
      button.disabled = reason !== null;
      const label = document.createElement('span');
      label.className = 'event-choice-label';
      label.textContent = choice.label;
      button.appendChild(label);
      for (const chip of choiceChips(state, choice)) {
        const chipEl = document.createElement('span');
        chipEl.className = 'event-chip';
        chipEl.textContent = chip;
        button.appendChild(chipEl);
      }
      if (reason) {
        const reasonEl = document.createElement('span');
        reasonEl.className = 'event-choice-reason';
        reasonEl.textContent = reason;
        button.appendChild(reasonEl);
      }
      button.addEventListener('click', () => {
        if (button.disabled) return;
        sfx.click();
        voiceEventChoice(event.id, choiceIndex);
        chooseEventChoice(run(), choice.id);
        render();
      });
      choices.appendChild(button);
    }
    body.appendChild(choices);
    return el;
  }

  if (active.phase === 'confirm') {
    const note = document.createElement('p');
    note.className = 'kid-prompt';
    note.textContent = '確定要這樣嗎？';
    const chips = document.createElement('div');
    chips.className = 'event-chips';
    const choice = event.choices.find((item) => item.id === active.choiceId);
    for (const chip of choice ? choiceChips(state, choice) : []) {
      const chipEl = document.createElement('span');
      chipEl.className = 'event-chip';
      chipEl.textContent = chip;
      chips.appendChild(chipEl);
    }
    const names = document.createElement('p');
    names.className = 'adult-text';
    names.textContent = active.chosenUids
      .map((uid) => state.deck.find((card) => card.uid === uid))
      .filter((card) => card)
      .map((card) => getCard(card!.defId).name)
      .join('、');
    const actions = document.createElement('div');
    actions.className = 'event-choices';
    actions.append(
      actionButton('確定', () => confirmEventChoice(run())),
      actionButton('回去', () => {
        voiceButton('u.back');
        cancelEventChoice(run());
      }),
    );
    body.append(note, chips, names, actions);
    return el;
  }

  if (active.phase === 'pick') {
    const prompt = document.createElement('p');
    prompt.className = 'kid-prompt';
    prompt.textContent = currentPickPrompt(state);
    const grid = document.createElement('div');
    grid.className = 'event-card-grid';
    for (const card of currentPickCards(state)) {
      const selected = active.draftUids.includes(card.uid);
      grid.appendChild(cardButton(
        card.defId,
        selected,
        () => {
          // Selecting (not committing) is the inspect moment: 老師 reads the card.
          if (!selected) voiceCardRead(card.defId);
          toggleEventCard(run(), card.uid);
        },
      ));
    }
    const actions = document.createElement('div');
    actions.className = 'event-choices';
    const confirm = actionButton('確定', () => confirmEventCard(run()));
    const stepNeed = active.pickSteps[active.pickIndex]?.need ?? 1;
    confirm.disabled = active.draftUids.length < stepNeed;
    actions.append(confirm, actionButton('回去', () => {
      voiceButton('u.back');
      cancelEventChoice(run());
    }));
    body.append(prompt, grid, actions);
    return el;
  }

  if (active.phase === 'offer') {
    const prompt = document.createElement('p');
    prompt.className = 'kid-prompt';
    prompt.textContent = '選一本，或不拿';
    const grid = document.createElement('div');
    grid.className = 'event-card-grid';
    for (const defId of active.offerIds) {
      grid.appendChild(cardButton(defId, false, () => takeEventOfferCard(run(), defId)));
    }
    const skip = actionButton('不拿也很好', () => {
      voiceButton('u.skipok');
      takeEventOfferCard(run(), null);
    });
    body.append(prompt, grid, skip);
    return el;
  }

  if (active.phase === 'fight') {
    const encounter = active.fightEncounterId ? ENCOUNTERS[active.fightEncounterId] : null;
    const names = (encounter?.enemyDefIds ?? [])
      .map((id) => ENEMIES[id]?.name ?? id)
      .join('、');
    const prompt = document.createElement('p');
    prompt.className = 'kid-prompt';
    prompt.textContent = names ? `要跟${names}打招呼` : '要開始了';
    body.append(prompt, actionButton('開始', () => {
      voiceButton('u.start');
      startEventCombat(run());
    }));
    return el;
  }

  const results = document.createElement('div');
  results.className = 'event-results';
  for (const result of active.resultLines) {
    const row = document.createElement('p');
    row.className = 'event-result';
    row.textContent = result;
    results.appendChild(row);
  }
  body.append(results, actionButton('繼續', () => {
    voiceButton('u.continue');
    continueEventResult(run());
  }));
  return el;
}

function actionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'event-choice';
  button.textContent = label;
  button.addEventListener('click', () => {
    sfx.click();
    onClick();
    render();
  });
  return button;
}
