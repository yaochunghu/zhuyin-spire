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
        body: '共鳴武者第一波有 12 種牌。先用易傷找空隙，完整防守累積勁，再練習攻守換拍；初心音叉每回合幫第一次攻擊 +1。',
      };
    case 'map':
      return {
        title: '地圖（由下往上）',
        body: `第 ${opts?.act ?? 1} 幕有 15 層×7 路，再到第 16 層 Boss；第 15 層一定是營火。底下亮圈可走。🔥 營火回約四成血、💎 寶箱給金幣＋選牌、🏪 商店、💀 菁英。打倒 Boss 會回滿生命。`,
      };
    case 'actClear':
      return {
        title: '幕間休息',
        body: '這一幕的 Boss 打倒了！生命已經回滿，接著進入下一幕新地圖（仍由下往上）。',
      };
    case 'rest':
      return {
        title: '營火二選一',
        body: '❤️ 回復約四成最大生命（戰鬥後不自動回血），或 🗑️ 刪一張弱牌。牌的升級層已準備好，但要等共鳴武者的升級設計通過後才開放。',
      };
    case 'smith':
      return {
        title: '鍛鍊牌技',
        body: '先點一張牌看升級前後，再按確認。取消不會消耗營火；已升級的牌會保留但不能再選。',
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
        body: '先看意圖。完整擋住一次敵方攻擊會得到 1 勁；易傷讓攻擊變成 1.5 倍；技能與攻擊交替成功會轉拍。攻擊拖到怪，技能拖到角色，✋ 結束回合。',
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
