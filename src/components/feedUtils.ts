type SlotPosition = 'prev' | 'current' | 'next';

interface EmptySlot {
  card: null;
  position: SlotPosition;
  isIntro: false;
  key: null;
}

export function createEmptySlot(position: SlotPosition): EmptySlot {
  return { card: null, position, isIntro: false, key: null };
}

export function canNavigateNext(currentIndex: number, totalItems: number): boolean {
  return currentIndex < totalItems - 1;
}

export function shouldRebaseOnIntroDismiss(
  prevShowIntro: boolean,
  showIntro: boolean,
  currentIndex: number
): boolean {
  return prevShowIntro && !showIntro && currentIndex > 0;
}

export function rebaseIndexAfterIntroDismiss(currentIndex: number): number {
  return Math.max(currentIndex - 1, 0);
}
