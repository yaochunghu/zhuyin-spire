import { describe, expect, it } from 'vitest';
import { castBusyNote, castPauseTitle } from '../../src/game/coach';

// phoneMenu and potionBelt call these with the open prompt's gate, then the
// character gate. The screen name must not decide the words.
describe('cast copy follows the gate', () => {
  it('names a math cast as arithmetic', () => {
    expect(castPauseTitle('math')).toBe('算題暫停');
    expect(castBusyNote('math')).toBe('先算完');
  });

  it('names a zhuyin cast, including when the gate is still unknown', () => {
    expect(castPauseTitle('zhuyin')).toBe('注音暫停');
    expect(castBusyNote('zhuyin')).toBe('先念完注音');
    expect(castPauseTitle(undefined)).toBe('注音暫停');
    expect(castBusyNote(null)).toBe('先念完注音');
  });
});
