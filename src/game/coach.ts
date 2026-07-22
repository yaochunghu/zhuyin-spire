/**
 * Adult-facing coach copy. Kids play with icons / 注音 / audio;
 * the accompanying adult reads these tips on early runs.
 */

import type { CastMode } from './castCheck';
import type { MapNode } from '../data/map';
import type { Screen } from './state';
import { getActiveProfile, updateActiveProfile } from './profiles';

export function getCompletedRunCount(): number {
  return getActiveProfile().completedRuns;
}

export function bumpCompletedRunCount(): void {
  updateActiveProfile((profile) => ({
    ...profile,
    completedRuns: profile.completedRuns + 1,
  }));
}

export function isEarlyLearningRuns(): boolean {
  return getCompletedRunCount() < 3;
}

export function coachForScreen(
  screen: Screen,
  opts?: {
    node?: MapNode;
    castMode?: CastMode;
    act?: number;
  },
): { title: string; body: string } {
  switch (screen) {
    case 'title':
      return {
        title: '給家長／陪玩大人',
        body: '▶️ 爬塔（有存檔時＝繼續）。🆕 新遊戲會清掉進度。📚 練習室。關掉分頁後，下次可從地圖／營火等畫面繼續（戰鬥中關掉會回到上一格安全點）。',
      };
    case 'practice':
      return {
        title: '練習室',
        body: '沒有怪、沒有血量。拼對會顯示完整注音再出下一題。💡 可一直看答案。🏠 回標題。',
      };
    case 'relicPick':
      return {
        title: '選角色',
        body: '角色會綁定自己的起始牌組和遺物。回音法師先附上🔔回音，再用攻擊觸發額外傷害；🎵初心音叉讓每場的第一次攻擊 +2。',
      };
    case 'map':
      return {
        title: '地圖（由下往上）',
        body: `第 ${opts?.act ?? 1} 幕共 15 層×7 路。底下亮圈可走。🔥 營火回約四成血（戰鬥後不自動回血）、💎 寶箱給金幣＋選牌、🏪 商店、💀 菁英。到頂 Boss。`,
      };
    case 'actClear':
      return {
        title: '幕間休息',
        body: '這一幕的 Boss 打倒了！生命會補一些，然後進入下一幕新地圖（仍由下往上）。',
      };
    case 'rest':
      return {
        title: '營火二選一',
        body: '❤️ 回復約四成最大生命（戰鬥後不再自動回血），或 🗑️ 刪一張弱牌。長塔要規劃營火。',
      };
    case 'removeCard':
      return {
        title: '刪牌',
        body: '點一張要丟掉的牌（本場營火只能做一次）。↩️ 回營火可改選補血。',
      };
    case 'shop':
      return {
        title: '商店',
        body: '買牌，或花金幣 🗑️ 刪掉一張弱牌（每家店一次）。路徑更長了，商店與營火更重要。',
      };
    case 'shopRemove':
      return {
        title: '商店刪牌',
        body: '選一張要丟掉的牌。會扣金幣。↩️ 可回商店不刪。',
      };
    case 'combat':
      return {
        title: '戰鬥',
        body: '先看意圖（⚠ 危險要擋）。小怪／石怪／蝙蝠／火苗／尖牙行為不同。攻擊拖到怪，盾拖到角色。多怪先清軟的。✋ 結束。',
      };
    case 'castCheck': {
      if (opts?.castMode === 'listen' || opts?.castMode === 'listenHard') {
        return {
          title: '聽一聽 → 拼注音',
          body: '先按 🔊 再聽。依序點完整注音（含聲調）。填滿會自動送出。',
        };
      }
      return {
        title: '認一認 → 拼注音',
        body: '請您念出國字。孩子拼出整個音（例：爸爸→ㄅㄚˋ）。填滿自動送出。💡 本場可亮答案一次。',
      };
    }
    case 'reward':
      return {
        title: '選牌 + 金幣',
        body: '得到 🪙 金幣。選一張牌加入牌組，或跳過。寶箱與戰鬥獎勵都是三選一。之後回地圖。',
      };
    case 'defeat':
      return {
        title: '失敗了',
        body: '生命歸零。鼓勵再試。可換不同遺物。三幕較長，記得休息營火。',
      };
    case 'victory':
      return {
        title: '三幕全通！',
        body: '大大稱讚！可以再爬一次，或去 📚 練習室練注音。',
      };
    default:
      return { title: '提示', body: '' };
  }
}
