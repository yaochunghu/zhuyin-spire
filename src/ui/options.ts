import { ALL_PHRASE_PACKS, type PhrasePack } from '../data/phrases';
import { CHARACTER_IDS, getCharacter } from '../data/characters';
import { getVolume, setVolume, sfx, type VolLevel } from '../game/audio';
import {
  countEligibleZhuyinPhrases,
  findUnavailableZhuyinCards,
} from '../game/casting/zhuyinProvider';
import type { CastingPreferences, ToneClass } from '../game/casting/types';
import {
  createProfile,
  deleteProfile,
  getActiveProfile,
  getCastingPreferences,
  getCharacterCardProgress,
  getProfiles,
  learnerAvatars,
  MAX_NICKNAME_LENGTH,
  maxLearnerProfiles,
  saveCastingPreferences,
  switchProfile,
} from '../game/profiles';
import {
  isTutorialComplete,
  loadGameSettings,
  resetTutorialCompletion,
  updateGameSettings,
} from '../game/settings';
import { clearAllAppData } from '../game/privacy';
import { exportPlaytestTelemetry } from '../game/playtestTelemetry';

const PACK_LABELS: Record<PhrasePack, string> = {
  core: '基礎本',
  home: '家裡',
  park: '公園',
  food: '食物',
  body: '身體',
  school: '學校',
  animals: '動物',
  nature: '自然',
  numbers: '數字',
  family: '家人',
};

interface OptionsContext {
  allowProfileSwitch?: boolean;
  focusProfiles?: boolean;
  focusPrivacy?: boolean;
  onClose?: () => void;
}

let root: HTMLElement | null = null;
let previousFocus: HTMLElement | null = null;
let context: OptionsContext = {};
let curriculumWarning = '';
let initialFocusPending = false;

function optionButton(
  label: string,
  active: boolean,
  onClick: () => void,
  disabled = false,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `option-choice${active ? ' on' : ''}`;
  button.textContent = label;
  button.disabled = disabled;
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  button.addEventListener('click', () => {
    sfx.click();
    onClick();
    paint();
  });
  return button;
}

function section(title: string): HTMLElement {
  const box = document.createElement('section');
  box.className = 'options-section';
  const heading = document.createElement('h2');
  heading.textContent = title;
  box.appendChild(heading);
  return box;
}

function commitCasting(next: CastingPreferences): boolean {
  const eligible = countEligibleZhuyinPhrases(next);
  if (eligible <= 0) {
    curriculumWarning = '這組設定沒有可用題目，已保留上一個設定。';
    return false;
  }
  const unavailable = findUnavailableZhuyinCards(next);
  if (unavailable.length) {
    const symbols = [...new Set(unavailable.map((item) => item.displayGlyph))].join('、');
    curriculumWarning = `這組設定會讓 ${symbols} 沒有題目，已保留上一個設定。請多選一些主題、聲調或詞語。`;
    return false;
  }
  curriculumWarning = '';
  saveCastingPreferences(next);
  return true;
}

function renderProfiles(): HTMLElement {
  const active = getActiveProfile();
  const profiles = getProfiles();
  const box = section(`小玩家 · ${active.avatar} ${active.name}`);
  box.classList.add('profile-options-section');

  const note = document.createElement('p');
  note.className = 'adult-text';
  note.textContent = context.allowProfileSwitch
    ? '每位孩子有自己的存檔、教學、徽章和練習紀錄。'
    : '為保護目前進度，請回到標題畫面再切換小玩家。';
  box.appendChild(note);

  const list = document.createElement('div');
  list.className = 'profile-choice-list';
  for (const profile of profiles) {
    const row = document.createElement('div');
    row.className = 'profile-choice-row';
    const choose = optionButton(
      `${profile.avatar} ${profile.name}`,
      profile.id === active.id,
      () => switchProfile(profile.id),
      !context.allowProfileSwitch,
    );
    choose.classList.add('profile-choice');
    row.appendChild(choose);
    if (profiles.length > 1 && context.allowProfileSwitch) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-secondary profile-delete';
      remove.textContent = '🗑️';
      remove.setAttribute('aria-label', `刪除${profile.name}`);
      remove.addEventListener('click', () => {
        if (!window.confirm(`刪除 ${profile.name} 的存檔和練習紀錄？`)) return;
        sfx.click();
        deleteProfile(profile.id);
        paint();
      });
      row.appendChild(remove);
    }
    list.appendChild(row);
  }
  box.appendChild(list);

  if (profiles.length < maxLearnerProfiles() && context.allowProfileSwitch) {
    const creator = document.createElement('div');
    creator.className = 'profile-create';
    const name = document.createElement('input');
    name.type = 'text';
    name.maxLength = MAX_NICKNAME_LENGTH;
    name.placeholder = `暱稱（不要填真名）`;
    name.setAttribute('aria-label', '新小玩家暱稱，不要填真名');
    const avatar = document.createElement('select');
    avatar.setAttribute('aria-label', '新小玩家圖示');
    for (const value of learnerAvatars()) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      avatar.appendChild(option);
    }
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn-secondary';
    add.textContent = '＋ 新增';
    add.addEventListener('click', () => {
      sfx.click();
      createProfile(name.value, avatar.value);
      paint();
    });
    creator.append(name, avatar, add);
    box.appendChild(creator);
  }

  const progressBox = document.createElement('div');
  progressBox.className = 'profile-character-progress';
  const progressTitle = document.createElement('h3');
  progressTitle.textContent = '角色卡牌進度';
  progressBox.appendChild(progressTitle);
  for (const characterId of CHARACTER_IDS) {
    const character = getCharacter(characterId);
    const progress = getCharacterCardProgress(active, characterId);
    const item = document.createElement('div');
    item.className = 'profile-character-progress-item';
    if (character.status === 'inDesign') {
      item.innerHTML = `
        <span class="profile-character-icon">${character.emoji}</span>
        <span><strong>${character.name}</strong><small>🚧 設計中 · 牌池尚未發布</small></span>
      `;
    } else {
      const next = progress.nextUnlockScore
        ? `下一批 ${progress.score}/${progress.nextUnlockScore}`
        : '目前可玩卡牌全數解鎖';
      item.innerHTML = `
        <span class="profile-character-icon">${character.emoji}</span>
        <span><strong>${character.name} · 🃏 ${progress.unlockedCards}/${progress.totalCards}</strong><small>角色分數 ${progress.score} · ${next}</small></span>
      `;
    }
    progressBox.appendChild(item);
  }
  box.appendChild(progressBox);
  return box;
}

function renderRange(
  label: string,
  value: number,
  onChange: (value: number) => void,
): HTMLElement {
  const row = document.createElement('label');
  row.className = 'curriculum-range';
  const text = document.createElement('span');
  text.textContent = `${label} ${value}%`;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = '25';
  input.value = String(value);
  input.addEventListener('change', () => {
    onChange(Number(input.value));
    paint();
  });
  row.append(text, input);
  return row;
}

function parseWordList(value: string): string[] {
  return [...new Set(value.split(/[，,\n]/).map((word) => word.trim()).filter(Boolean))];
}

function renderCurriculum(): HTMLElement {
  const preferences = getCastingPreferences();
  const eligible = countEligibleZhuyinPhrases(preferences);
  const box = section(`注音題庫 · 目前約 ${eligible} 題`);
  box.classList.add('curriculum-options');

  const topicsLabel = document.createElement('p');
  topicsLabel.className = 'options-subheading';
  topicsLabel.textContent = '主題';
  box.appendChild(topicsLabel);
  const topics = document.createElement('div');
  topics.className = 'phrase-pack-row options-pack-row';
  const activePacks = new Set(preferences.packs);
  for (const pack of ALL_PHRASE_PACKS) {
    topics.appendChild(
      optionButton(PACK_LABELS[pack], activePacks.has(pack), () => {
        const next = new Set(getCastingPreferences().packs);
        if (next.has(pack)) {
          if (next.size <= 1) return;
          next.delete(pack);
        } else {
          next.add(pack);
        }
        commitCasting({ ...getCastingPreferences(), packs: [...next] });
      }),
    );
  }
  box.appendChild(topics);

  const allTopics = document.createElement('button');
  allTopics.type = 'button';
  allTopics.className = 'btn-secondary options-wide-btn';
  allTopics.textContent = '選擇全部主題';
  allTopics.addEventListener('click', () => {
    sfx.click();
    commitCasting({
      ...getCastingPreferences(),
      packs: [...ALL_PHRASE_PACKS],
      includeWords: [],
    });
    paint();
  });
  box.appendChild(allTopics);

  const vocabulary = document.createElement('div');
  vocabulary.className = 'option-choice-row';
  vocabulary.appendChild(
    optionButton('幼兒核心', preferences.vocabulary === 'coreOnly', () =>
      commitCasting({ ...getCastingPreferences(), vocabulary: 'coreOnly' }),
    ),
  );
  vocabulary.appendChild(
    optionButton('加入進階詞', preferences.vocabulary === 'coreAndBroad', () =>
      commitCasting({ ...getCastingPreferences(), vocabulary: 'coreAndBroad' }),
    ),
  );
  box.appendChild(vocabulary);

  const toneLabel = document.createElement('p');
  toneLabel.className = 'options-subheading';
  toneLabel.textContent = '聲調範圍（答案仍一定要拼完整）';
  box.appendChild(toneLabel);
  const tones = document.createElement('div');
  tones.className = 'option-choice-row option-wrap-row';
  const toneLabels: Array<[ToneClass, string]> = [
    [1, '一聲'], [2, '二聲 ˊ'], [3, '三聲 ˇ'], [4, '四聲 ˋ'], [5, '輕聲 ˙'],
  ];
  for (const [tone, label] of toneLabels) {
    tones.appendChild(
      optionButton(label, preferences.tones.includes(tone), () => {
        const next = new Set(getCastingPreferences().tones);
        if (next.has(tone)) {
          if (next.size <= 1) return;
          next.delete(tone);
        } else {
          next.add(tone);
        }
        commitCasting({ ...getCastingPreferences(), tones: [...next] as ToneClass[] });
      }),
    );
  }
  box.appendChild(tones);

  const lengthLabel = document.createElement('p');
  lengthLabel.className = 'options-subheading';
  lengthLabel.textContent = '最長答案與干擾符號';
  box.appendChild(lengthLabel);
  const length = document.createElement('div');
  length.className = 'option-choice-row option-wrap-row';
  for (const value of [2, 3, 4] as const) {
    length.appendChild(
      optionButton(`最多 ${value} 格`, preferences.maxAnswerParts === value, () =>
        commitCasting({ ...getCastingPreferences(), maxAnswerParts: value }),
      ),
    );
  }
  for (const value of [2, 3, 4] as const) {
    length.appendChild(
      optionButton(`干擾 ${value} 個`, preferences.distractorCount === value, () =>
        commitCasting({ ...getCastingPreferences(), distractorCount: value }),
      ),
    );
  }
  box.appendChild(length);

  const modeLabel = document.createElement('p');
  modeLabel.className = 'options-subheading';
  modeLabel.textContent = '題目出現方式（比例會自動正規化）';
  box.appendChild(modeLabel);
  const ranges = document.createElement('div');
  ranges.className = 'curriculum-ranges';
  const updateWeight = (key: keyof CastingPreferences['modeWeights'], value: number) => {
    const current = getCastingPreferences();
    const next = { ...current.modeWeights, [key]: value };
    if (next.recognize + next.listen + next.listenHard <= 0) return;
    commitCasting({ ...current, modeWeights: next });
  };
  ranges.append(
    renderRange('看圖看字', preferences.modeWeights.recognize, (value) => updateWeight('recognize', value)),
    renderRange('聽音＋圖', preferences.modeWeights.listen, (value) => updateWeight('listen', value)),
    renderRange('只聽音', preferences.modeWeights.listenHard, (value) => updateWeight('listenHard', value)),
  );
  box.appendChild(ranges);

  const adaptive = document.createElement('div');
  adaptive.className = 'option-choice-row';
  adaptive.appendChild(
    optionButton('自動幫忙：開', preferences.adaptive, () =>
      commitCasting({ ...getCastingPreferences(), adaptive: true }),
    ),
  );
  adaptive.appendChild(
    optionButton('自動幫忙：關', !preferences.adaptive, () =>
      commitCasting({ ...getCastingPreferences(), adaptive: false }),
    ),
  );
  box.appendChild(adaptive);
  const adaptiveNote = document.createElement('p');
  adaptiveNote.className = 'adult-text';
  adaptiveNote.textContent = '自動幫忙只會在您允許的題目內暫時偏向較清楚、較短的題目。';
  box.appendChild(adaptiveNote);

  const advanced = document.createElement('details');
  advanced.className = 'curriculum-advanced';
  advanced.innerHTML = '<summary>進階：只出／不要出哪些詞</summary>';
  const include = document.createElement('textarea');
  include.value = preferences.includeWords.join('，');
  include.placeholder = '只出這些詞（留空＝不限）';
  include.setAttribute('aria-label', '只出這些詞');
  const exclude = document.createElement('textarea');
  exclude.value = preferences.excludeWords.join('，');
  exclude.placeholder = '不要出這些詞';
  exclude.setAttribute('aria-label', '不要出這些詞');
  const saveLists = document.createElement('button');
  saveLists.type = 'button';
  saveLists.className = 'btn-secondary options-wide-btn';
  saveLists.textContent = '套用詞語清單';
  saveLists.addEventListener('click', () => {
    sfx.click();
    commitCasting({
      ...getCastingPreferences(),
      includeWords: parseWordList(include.value),
      excludeWords: parseWordList(exclude.value),
    });
    paint();
  });
  advanced.append(include, exclude, saveLists);
  box.appendChild(advanced);

  if (curriculumWarning) {
    const warning = document.createElement('p');
    warning.className = 'warn-banner adult-text';
    warning.setAttribute('role', 'alert');
    warning.textContent = curriculumWarning;
    box.appendChild(warning);
  }
  return box;
}

function renderPrivacy(): HTMLElement {
  const box = section('🔒 隱私與這台裝置的資料');
  box.classList.add('privacy-options-section');
  box.tabIndex = -1;

  const summary = document.createElement('p');
  summary.className = 'adult-text privacy-summary';
  summary.textContent =
    '暱稱、學習紀錄、設定和存檔只留在這個瀏覽器。請不要填孩子的真名。遊戲沒有帳號、廣告、分析追蹤或麥克風錄音。';
  box.appendChild(summary);

  const hosting = document.createElement('p');
  hosting.className = 'adult-text privacy-summary';
  hosting.textContent =
    'GitHub Pages 會為安全目的記錄訪客 IP。未來改用自訂網址時，這個暫用網址的進度不會轉移。';
  box.appendChild(hosting);

  const policy = document.createElement('a');
  policy.className = 'btn-secondary options-wide-btn privacy-policy-link';
  policy.href = 'https://github.com/yaochunghu/zhuyin-spire/blob/main/PRIVACY.md';
  policy.target = '_blank';
  policy.rel = 'noopener noreferrer';
  policy.textContent = '閱讀完整隱私說明';
  box.appendChild(policy);

  const exportData = document.createElement('button');
  exportData.type = 'button';
  exportData.className = 'btn-secondary options-wide-btn';
  exportData.textContent = '匯出本機平衡測試資料（JSON）';
  exportData.addEventListener('click', () => {
    const blob = new Blob([exportPlaytestTelemetry()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zhuyin-spire-playtest.json';
    link.click();
    URL.revokeObjectURL(url);
  });
  box.appendChild(exportData);

  const erase = document.createElement('button');
  erase.type = 'button';
  erase.className = 'btn-secondary options-wide-btn privacy-erase-btn';
  erase.textContent = '清除這台裝置的所有遊戲資料';
  erase.addEventListener('click', () => {
    const confirmed = window.confirm(
      '這會刪除所有小玩家、學習紀錄、設定和爬塔存檔，無法復原。確定要清除嗎？',
    );
    if (!confirmed) return;
    clearAllAppData();
    window.location.reload();
  });
  box.appendChild(erase);
  return box;
}

function closeOptions(): void {
  root?.remove();
  root = null;
  previousFocus?.focus();
  previousFocus = null;
  const onClose = context.onClose;
  context = {};
  onClose?.();
}

function paint(): void {
  if (!root) return;
  const settings = loadGameSettings();
  const complete = isTutorialComplete();
  root.innerHTML = '';

  const backdrop = document.createElement('div');
  backdrop.className = 'options-backdrop';
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeOptions();
  });

  const dialog = document.createElement('div');
  dialog.className = 'options-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', '遊戲選項');

  const head = document.createElement('div');
  head.className = 'options-head';
  head.innerHTML = '<div><div class="kid-prompt">⚙️ 選項</div><p class="adult-text">給家長／陪玩大人調整</p></div>';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'btn-secondary options-close';
  close.textContent = '✕';
  close.setAttribute('aria-label', '關閉選項');
  close.addEventListener('click', closeOptions);
  head.appendChild(close);
  dialog.appendChild(head);

  dialog.appendChild(renderProfiles());

  const volume = section('音量');
  const volumeRow = document.createElement('div');
  volumeRow.className = 'option-choice-row';
  const levels: Array<{ value: VolLevel; label: string }> = [
    { value: 1, label: '🔊 大' },
    { value: 0.45, label: '🔉 小' },
    { value: 0, label: '🔇 靜音' },
  ];
  for (const item of levels) {
    volumeRow.appendChild(
      optionButton(item.label, getVolume() === item.value, () => setVolume(item.value)),
    );
  }
  volume.appendChild(volumeRow);
  dialog.appendChild(volume);

  const speed = section('遊戲動畫速度');
  const speedRow = document.createElement('div');
  speedRow.className = 'option-choice-row';
  speedRow.appendChild(
    optionButton('1× 一般', settings.animationSpeed === 1, () =>
      updateGameSettings({ animationSpeed: 1 }),
    ),
  );
  speedRow.appendChild(
    optionButton('2× 快速', settings.animationSpeed === 2, () =>
      updateGameSettings({ animationSpeed: 2 }),
    ),
  );
  speed.appendChild(speedRow);
  const speedNote = document.createElement('p');
  speedNote.className = 'adult-text';
  speedNote.textContent = '只加快戰鬥與地圖動畫；注音答案和語音仍保持正常速度。';
  speed.appendChild(speedNote);
  dialog.appendChild(speed);

  const tutorial = section('第一次戰鬥教學');
  const tutorialRow = document.createElement('div');
  tutorialRow.className = 'option-choice-row';
  tutorialRow.appendChild(
    optionButton('開啟', settings.tutorialEnabled, () =>
      updateGameSettings({ tutorialEnabled: true }),
    ),
  );
  tutorialRow.appendChild(
    optionButton('關閉', !settings.tutorialEnabled, () =>
      updateGameSettings({ tutorialEnabled: false }),
    ),
  );
  tutorial.appendChild(tutorialRow);
  const status = document.createElement('p');
  status.className = 'adult-text';
  status.textContent = complete
    ? '這位小玩家已完成教學。可安排下一個新遊戲重播。'
    : '這位小玩家尚未完成：下一個新遊戲會一步一步帶著玩。';
  tutorial.appendChild(status);
  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'btn-secondary options-wide-btn';
  replay.textContent = '下一個新遊戲重播教學';
  replay.addEventListener('click', () => {
    sfx.click();
    resetTutorialCompletion();
    updateGameSettings({ tutorialEnabled: true });
    paint();
  });
  tutorial.appendChild(replay);
  dialog.appendChild(tutorial);

  dialog.appendChild(renderCurriculum());
  dialog.appendChild(renderPrivacy());
  backdrop.appendChild(dialog);
  root.appendChild(backdrop);
  if (initialFocusPending) {
    initialFocusPending = false;
    if (context.focusPrivacy) {
      dialog.querySelector<HTMLElement>('.privacy-options-section')?.focus();
    } else if (context.focusProfiles) {
      dialog.querySelector<HTMLButtonElement>('.profile-choice')?.focus();
    } else {
      close.focus();
    }
  }
}

export function openOptions(nextContext: OptionsContext = {}): void {
  if (root) return;
  context = nextContext;
  previousFocus = document.activeElement as HTMLElement | null;
  root = document.createElement('div');
  root.id = 'zhuyin-options-root';
  document.body.appendChild(root);
  initialFocusPending = true;
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeOptions();
    if (event.key !== 'Tab' || !root) return;
    const focusable = [
      ...root.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary',
      ),
    ];
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
  });
  paint();
}
