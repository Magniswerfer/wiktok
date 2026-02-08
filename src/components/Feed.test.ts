import { describe, it, expect } from 'vitest';
import {
  createEmptySlot,
  canNavigateNext,
  shouldRebaseOnIntroDismiss,
  rebaseIndexAfterIntroDismiss
} from './feedUtils';

describe('Feed helpers', () => {
  it('createEmptySlot includes required slot defaults', () => {
    expect(createEmptySlot('prev')).toEqual({
      card: null,
      position: 'prev',
      isIntro: false,
      key: null,
    });
  });

  it('canNavigateNext uses totalItems boundaries', () => {
    expect(canNavigateNext(0, 2)).toBe(true);
    expect(canNavigateNext(1, 2)).toBe(false);
  });

  it('rebases exactly once when intro is dismissed', () => {
    expect(shouldRebaseOnIntroDismiss(true, false, 2)).toBe(true);
    expect(rebaseIndexAfterIntroDismiss(2)).toBe(1);
  });

  it('does not rebase repeatedly after intro is already dismissed', () => {
    expect(shouldRebaseOnIntroDismiss(false, false, 2)).toBe(false);
    expect(shouldRebaseOnIntroDismiss(false, false, 1)).toBe(false);
  });
});
