import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import type { WikiCard, AppSettings } from '../lib/types';
import { feedManager } from '../lib/feed';
import { tts } from '../lib/tts';
import { markFirstCardRender } from '../lib/performance';
import { getBackgroundForCard, getRandomGradient } from '../lib/backgrounds';
import Card from './Card';
import IntroCard from './IntroCard';
import Background from './Background';

interface FeedProps {
  cards: WikiCard[];
  isLoading: boolean;
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onShowAbout: () => void;
  showIntro: boolean;
  onIntroComplete: () => void;
  onEnableAudio: () => void;
  isFrameMode: boolean;
}

type SlotPosition = 'prev' | 'current' | 'next';

interface SlotContent {
  card: WikiCard | null;
  position: SlotPosition;
  isIntro?: boolean;
  key: string | null;
}

function Feed({
  cards,
  isLoading,
  settings,
  onSettingsChange,
  onShowAbout,
  showIntro,
  onIntroComplete,
  onEnableAudio,
  isFrameMode
}: FeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const isResettingScroll = useRef(false);
  const scrollTimeout = useRef<number | null>(null);
  const isUserInteracting = useRef(false);

  // Logical index in the cards array
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  // The three slots and their current content
  const [slots, setSlots] = useState<[SlotContent, SlotContent, SlotContent]>([
    { card: null, position: 'prev' },
    { card: null, position: 'current' },
    { card: null, position: 'next' }
  ]);
  const hasMarkedFirstCard = useRef(false);

  const totalItems = showIntro ? cards.length + 1 : cards.length;

  const getCardAtIndex = useCallback((index: number) => {
    if (showIntro) {
      return index > 0 ? cards[index - 1] : null;
    }
    return cards[index] ?? null;
  }, [cards, showIntro]);

  const currentBackground = useMemo(() => {
    const currentCard = getCardAtIndex(currentIndex);
    if (!currentCard) {
      return getRandomGradient();
    }
    return getBackgroundForCard(currentCard.id);
  }, [getCardAtIndex, currentIndex]);

  // Get the upcoming background based on scroll direction
  const nextBackground = useMemo(() => {
    if (!scrollDirection) return null;

    const targetIndex = scrollDirection === 'down'
      ? currentIndex + 1  // Scrolling down = going to next card
      : currentIndex - 1; // Scrolling up = going to previous card

    const targetCard = getCardAtIndex(targetIndex);
    if (!targetCard) return null;

    return getBackgroundForCard(targetCard.id);
  }, [getCardAtIndex, currentIndex, scrollDirection]);

  // Get the upcoming thumbnail based on scroll direction
  const nextThumbnailUrl = useMemo(() => {
    if (!scrollDirection) return null;

    const targetIndex = scrollDirection === 'down'
      ? currentIndex + 1
      : currentIndex - 1;

    const targetCard = getCardAtIndex(targetIndex);
    return targetCard?.thumbnailUrl || null;
  }, [getCardAtIndex, currentIndex, scrollDirection]);

  // Scroll to middle slot
  const scrollToMiddle = useCallback((instant = true) => {
    const container = containerRef.current;
    if (!container) return;

    const cardHeight = container.clientHeight;
    isResettingScroll.current = true;

    // Ensure truly instant jumps (avoid CSS smooth scroll during resets)
    if (instant) {
      container.style.scrollBehavior = 'auto';
    }

    container.scrollTo({
      top: cardHeight, // Middle slot
      behavior: instant ? 'auto' : 'smooth'
    });

    const background = backgroundRef.current;
    if (background && isFrameMode) {
      background.style.transform = `translateY(${cardHeight}px)`;
    }

    // Reset the flag after scroll completes
    if (instant) {
      // For instant scroll, reset after two frames, then restore smooth behavior
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isResettingScroll.current = false;
          container.style.scrollBehavior = 'smooth';
        });
      });
    } else {
      // For smooth scroll, wait longer
      setTimeout(() => {
        isResettingScroll.current = false;
      }, 300);
    }
  }, [isFrameMode]);

  const resetToMiddleAndSetIndex = useCallback((nextIndex: number) => {
    const container = containerRef.current;
    if (!container) return;

    isResettingScroll.current = true;

    const cardHeight = container.clientHeight;
    const prevSnapType = container.style.scrollSnapType;
    const prevBehavior = container.style.scrollBehavior;

    // Disable snapping during the jump to avoid browser re-snapping to the wrong slot
    container.style.scrollSnapType = 'none';
    container.style.scrollBehavior = 'auto';

    container.scrollTo({ top: cardHeight, behavior: 'auto' });
    const background = backgroundRef.current;
    if (background && isFrameMode) {
      background.style.transform = `translateY(${cardHeight}px)`;
    }

    flushSync(() => {
      setCurrentIndex(nextIndex);
      setScrollProgress(0); // Reset progress - new video appears immediately
      setScrollDirection(null);
    });

    requestAnimationFrame(() => {
      container.style.scrollSnapType = prevSnapType;
      container.style.scrollBehavior = prevBehavior || 'smooth';
      isResettingScroll.current = false;
    });
  }, [isFrameMode]);

  // Update slot content when cards array or currentIndex changes
  // Use useLayoutEffect to update DOM synchronously before paint
  useLayoutEffect(() => {
    const getItem = (index: number) => {
      if (index < 0 || index >= totalItems) return { key: null, card: null, isIntro: false };
      if (showIntro && index === 0) return { key: 'intro', card: null, isIntro: true };
      const card = getCardAtIndex(index);
      return { key: card?.id ?? null, card, isIntro: false };
    };

    const prevItem = getItem(currentIndex - 1);
    const currentItem = getItem(currentIndex);
    const nextItem = getItem(currentIndex + 1);

    // Only update slots if the actual cards changed (compare by id)
    setSlots(prev => {
      const prevSame = prev[0].key === prevItem.key;
      const currSame = prev[1].key === currentItem.key;
      const nextSame = prev[2].key === nextItem.key;

      if (prevSame && currSame && nextSame) {
        return prev; // No change needed
      }

      return [
        { card: prevItem.card, position: 'prev', isIntro: prevItem.isIntro, key: prevItem.key },
        { card: currentItem.card, position: 'current', isIntro: currentItem.isIntro, key: currentItem.key },
        { card: nextItem.card, position: 'next', isIntro: nextItem.isIntro, key: nextItem.key }
      ];
    });

  }, [cards, currentIndex, getCardAtIndex, showIntro, totalItems]);

  // Mark first content card render after paint
  useEffect(() => {
    if (hasMarkedFirstCard.current) return;
    const currentSlot = slots[1];
    if (!currentSlot?.card || currentSlot.isIntro) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!hasMarkedFirstCard.current) {
          markFirstCardRender();
          hasMarkedFirstCard.current = true;
        }
      });
    });
  }, [slots]);

  // Initialize scroll position on mount
  useEffect(() => {
    scrollToMiddle(true);
  }, [scrollToMiddle]);

  // Rebase index when intro is dismissed
  useEffect(() => {
    if (!showIntro && currentIndex > 0) {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
  }, [showIntro]);

  // Proactively prefetch when near the end (including initial load)
  useEffect(() => {
    const cardIndex = showIntro ? Math.max(currentIndex - 1, 0) : currentIndex;
    feedManager.maybePreFetch(cardIndex);
  }, [currentIndex, cards.length, showIntro]);

  // Handle scroll end - detect which slot we landed on
  const handleScrollEnd = useCallback(() => {
    if (isResettingScroll.current || isUserInteracting.current) return;

    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const cardHeight = container.clientHeight;
    const snapEpsilon = Math.max(12, cardHeight * 0.12);
    const atPrev = Math.abs(scrollTop - 0) <= snapEpsilon;
    const atCurrent = Math.abs(scrollTop - cardHeight) <= snapEpsilon;
    const atNext = Math.abs(scrollTop - cardHeight * 2) <= snapEpsilon;

    // Only react when we're actually snapped close to a slot.
    if (atPrev && currentIndex > 0) {
      // Swiped up to previous
      tts.stop();
      resetToMiddleAndSetIndex(currentIndex - 1);
      const prevCardIndex = showIntro ? Math.max(currentIndex - 2, 0) : currentIndex - 1;
      feedManager.maybePreFetch(prevCardIndex);
    } else if (atNext && currentIndex < totalItems - 1) {
      // Swiped down to next
      tts.stop();
      resetToMiddleAndSetIndex(currentIndex + 1);
      const nextCardIndex = showIntro ? currentIndex : currentIndex + 1;
      feedManager.maybePreFetch(nextCardIndex);
      if (showIntro && currentIndex === 0) {
        onIntroComplete();
      }
    } else if (!atCurrent) {
      // If we aren't near any snap point, don't force a reset.
      // For out-of-bounds at edges, snap back to middle.
      if ((atPrev && currentIndex === 0) || (atNext && currentIndex === totalItems - 1)) {
        scrollToMiddle(false);
      }
      return;
    } else if ((atPrev && currentIndex === 0) || (atNext && currentIndex === totalItems - 1)) {
      // Tried to scroll past bounds, snap back to middle
      scrollToMiddle(false);
    }
  }, [currentIndex, onIntroComplete, resetToMiddleAndSetIndex, scrollToMiddle, showIntro, totalItems]);

  // Listen for scroll end using scrollend event or fallback to debounce
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const setInteracting = (value: boolean) => {
      isUserInteracting.current = value;
    };

    const onPointerDown = () => setInteracting(true);
    const onPointerUp = () => setInteracting(false);
    const onTouchStart = () => setInteracting(true);
    const onTouchEnd = () => setInteracting(false);

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('pointerleave', onPointerUp);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    // Prefer scrollend when available, but keep debounce fallback active too
    const supportsScrollEnd = 'onscrollend' in window;
    const onScrollEnd = () => handleScrollEnd();
    if (supportsScrollEnd) {
      container.addEventListener('scrollend', onScrollEnd);
    }

    const onScroll = () => {
      if (isResettingScroll.current) {
        return;
      }
      // Calculate scroll progress for video fade effect
      const cardHeight = container.clientHeight;
      const scrollTop = container.scrollTop;
      const background = backgroundRef.current;
      if (background) {
        background.style.transform = isFrameMode ? `translateY(${scrollTop}px)` : '';
      }
      const distanceFromMiddle = scrollTop - cardHeight;
      const progress = Math.min(Math.abs(distanceFromMiddle) / cardHeight, 1);
      setScrollProgress(progress);

      // Determine scroll direction
      if (distanceFromMiddle > 10) {
        setScrollDirection('down'); // Scrolling toward next card
      } else if (distanceFromMiddle < -10) {
        setScrollDirection('up'); // Scrolling toward previous card
      } else {
        setScrollDirection(null);
      }

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = window.setTimeout(() => {
        if (isUserInteracting.current) return;
        handleScrollEnd();
      }, 160);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (supportsScrollEnd) {
        container.removeEventListener('scrollend', onScrollEnd);
      }
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('pointerleave', onPointerUp);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('scroll', onScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [handleScrollEnd, isFrameMode]);

  // Proxy scroll gestures outside the phone frame on tablet/desktop
  useEffect(() => {
    if (!isFrameMode) return;
    const container = containerRef.current;
    if (!container) return;

    const shouldProxy = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return true;
      return !container.contains(target);
    };

    let touchStartY: number | null = null;

    const onWheel = (event: WheelEvent) => {
      if (!shouldProxy(event.target)) return;
      event.preventDefault();
      container.scrollBy({ top: event.deltaY, behavior: 'auto' });
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!shouldProxy(event.target)) return;
      if (event.touches.length !== 1) return;
      touchStartY = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (touchStartY === null) return;
      if (!shouldProxy(event.target)) return;
      if (event.touches.length !== 1) return;
      const currentY = event.touches[0].clientY;
      const delta = touchStartY - currentY;
      touchStartY = currentY;
      event.preventDefault();
      container.scrollBy({ top: delta, behavior: 'auto' });
    };

    const onTouchEnd = () => {
      touchStartY = null;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isFrameMode]);

  // Handle "More like this" - Topic mode
  const handleTopicMode = useCallback((card: WikiCard) => {
    if (feedManager.isTopicModeActive()) {
      feedManager.disableTopicMode();
      onSettingsChange({ topicMode: false });
    } else {
      feedManager.enableTopicMode(card.title);
      onSettingsChange({ topicMode: true });
    }
  }, [onSettingsChange]);

  // Manual navigation
  const handleNext = useCallback(() => {
    if (currentIndex >= cards.length - 1) return;
    const container = containerRef.current;
    if (!container) return;

    const cardHeight = container.clientHeight;
    container.scrollTo({
      top: cardHeight * 2, // Next slot
      behavior: 'smooth'
    });
  }, [currentIndex, cards.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex <= 0) return;
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: 0, // Prev slot
      behavior: 'smooth'
    });
  }, [currentIndex]);

  // Loading state - no cards yet
  if (cards.length === 0 && isLoading && !showIntro) {
    return (
      <div className="feed-loading">
        <div className="spinner" />
        <p>Loading articles...</p>
      </div>
    );
  }

  // No cards available
  if (cards.length === 0 && !showIntro) {
    return (
      <div className="feed-loading">
        <p>No articles available</p>
      </div>
    );
  }

  return (
    <div className="feed-container feed-recycler" ref={containerRef}>
      <div className="feed-background" ref={backgroundRef}>
        <Background
          config={currentBackground}
          nextConfig={nextBackground}
          isActive={true}
          scrollProgress={scrollProgress}
        />
      </div>
      {slots.map((slot, index) => {
        const isActive = index === 1; // Middle slot is always "current"
        const isFirst = currentIndex === 0 && index === 0;
        const isLast = currentIndex === totalItems - 1 && index === 2;
        // Keep slots stable to avoid scroll anchoring when cards swap
        const slotKey = slot.position;
        const slotBackground = slot.card ? getBackgroundForCard(slot.card.id) : getRandomGradient();

        return (
          <div
            key={slotKey}
            className={`feed-item ${isFirst ? 'feed-item-boundary' : ''} ${isLast ? 'feed-item-boundary' : ''}`}
          >
            {slot.isIntro ? (
              <IntroCard
                audioUnlocked={settings.audioUnlocked}
                onEnableAudio={onEnableAudio}
                onStart={handleNext}
              />
            ) : slot.card ? (
              <Card
                card={slot.card}
                isActive={isActive}
                background={slotBackground}
                settings={settings}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onTopicMode={() => slot.card && handleTopicMode(slot.card)}
                onShowAbout={onShowAbout}
                isTopicModeActive={feedManager.isTopicModeActive()}
                nextThumbnailUrl={isActive ? nextThumbnailUrl : null}
                scrollProgress={isActive ? scrollProgress : 0}
              />
            ) : (
              <div className="card-placeholder">
                {isLast && isLoading && (
                  <div className="loading-indicator">
                    <div className="spinner" />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Feed;
