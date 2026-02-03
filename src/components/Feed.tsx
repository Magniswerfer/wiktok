import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import type { WikiCard, AppSettings } from '../lib/types';
import { feedManager } from '../lib/feed';
import { tts } from '../lib/tts';
import { getBackgroundForCard, getRandomGradient } from '../lib/backgrounds';
import Card from './Card';
import Background from './Background';

interface FeedProps {
  cards: WikiCard[];
  isLoading: boolean;
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onShowAbout: () => void;
}

type SlotPosition = 'prev' | 'current' | 'next';

interface SlotContent {
  card: WikiCard | null;
  position: SlotPosition;
}

function Feed({ cards, isLoading, settings, onSettingsChange, onShowAbout }: FeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const currentBackground = useMemo(() => {
    const currentCard = cards[currentIndex];
    if (!currentCard) {
      return getRandomGradient();
    }
    return getBackgroundForCard(currentCard.id);
  }, [cards, currentIndex]);

  // Get the upcoming background based on scroll direction
  const nextBackground = useMemo(() => {
    if (!scrollDirection) return null;

    const targetIndex = scrollDirection === 'down'
      ? currentIndex + 1  // Scrolling down = going to next card
      : currentIndex - 1; // Scrolling up = going to previous card

    const targetCard = cards[targetIndex];
    if (!targetCard) return null;

    return getBackgroundForCard(targetCard.id);
  }, [cards, currentIndex, scrollDirection]);

  // Get the upcoming thumbnail based on scroll direction
  const nextThumbnailUrl = useMemo(() => {
    if (!scrollDirection) return null;

    const targetIndex = scrollDirection === 'down'
      ? currentIndex + 1
      : currentIndex - 1;

    const targetCard = cards[targetIndex];
    return targetCard?.thumbnailUrl || null;
  }, [cards, currentIndex, scrollDirection]);

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
  }, []);

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
  }, []);

  // Update slot content when cards array or currentIndex changes
  // Use useLayoutEffect to update DOM synchronously before paint
  useLayoutEffect(() => {
    const prevCard = currentIndex > 0 ? cards[currentIndex - 1] : null;
    const currentCard = cards[currentIndex] ?? null;
    const nextCard = cards[currentIndex + 1] ?? null;

    // Only update slots if the actual cards changed (compare by id)
    setSlots(prev => {
      const prevSame = prev[0].card?.id === prevCard?.id;
      const currSame = prev[1].card?.id === currentCard?.id;
      const nextSame = prev[2].card?.id === nextCard?.id;

      if (prevSame && currSame && nextSame) {
        return prev; // No change needed
      }

      return [
        { card: prevCard, position: 'prev' },
        { card: currentCard, position: 'current' },
        { card: nextCard, position: 'next' }
      ];
    });

  }, [cards, currentIndex, scrollToMiddle]);

  // Initialize scroll position on mount
  useEffect(() => {
    scrollToMiddle(true);
  }, [scrollToMiddle]);

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
      feedManager.maybePreFetch(currentIndex - 1);
    } else if (atNext && currentIndex < cards.length - 1) {
      // Swiped down to next
      tts.stop();
      resetToMiddleAndSetIndex(currentIndex + 1);
      feedManager.maybePreFetch(currentIndex + 1);
    } else if (!atCurrent) {
      // If we aren't near any snap point, don't force a reset.
      // For out-of-bounds at edges, snap back to middle.
      if ((atPrev && currentIndex === 0) || (atNext && currentIndex === cards.length - 1)) {
        scrollToMiddle(false);
      }
      return;
    } else if ((atPrev && currentIndex === 0) || (atNext && currentIndex === cards.length - 1)) {
      // Tried to scroll past bounds, snap back to middle
      scrollToMiddle(false);
    }
  }, [currentIndex, cards.length, resetToMiddleAndSetIndex, scrollToMiddle]);

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
  }, [handleScrollEnd]);

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
  if (cards.length === 0 && isLoading) {
    return (
      <div className="feed-loading">
        <div className="spinner" />
        <p>Loading articles...</p>
      </div>
    );
  }

  // No cards available
  if (cards.length === 0) {
    return (
      <div className="feed-loading">
        <p>No articles available</p>
      </div>
    );
  }

  return (
    <div className="feed-container feed-recycler" ref={containerRef}>
      <div className="feed-background">
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
        const isLast = currentIndex === cards.length - 1 && index === 2;
        // Keep slots stable to avoid scroll anchoring when cards swap
        const slotKey = slot.position;
        const slotBackground = slot.card ? getBackgroundForCard(slot.card.id) : getRandomGradient();

        return (
          <div
            key={slotKey}
            className={`feed-item ${isFirst ? 'feed-item-boundary' : ''} ${isLast ? 'feed-item-boundary' : ''}`}
          >
            {slot.card ? (
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
