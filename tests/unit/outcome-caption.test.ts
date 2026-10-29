import { describe, expect, it } from 'vitest';
import { killOutcomeCaption } from '../../src/ui/outcome';

describe('boss win headline', () => {
  it('reserves the tower top for Act III and clears the earlier bosses', () => {
    expect(killOutcomeCaption({ isBoss: true, act: 1 })).toBe('🏆 過關！');
    expect(killOutcomeCaption({ isBoss: true, act: 2 })).toBe('🏆 過關！');
    expect(killOutcomeCaption({ isBoss: true, act: 3 })).toBe('🏆 爬到塔頂了！');
  });

  it('keeps elite and ordinary wins off the tower-top line', () => {
    expect(killOutcomeCaption({ isElite: true, act: 3 })).toBe('💪 菁英暈頭轉向！');
    expect(killOutcomeCaption({ act: 1 })).toBe('✨ 變成星星飛走了！');
  });
});
