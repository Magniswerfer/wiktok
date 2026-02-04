import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';

// Tracks image URLs that have completed at least one real <img> load event.
const loadedImageUrls = new Set<string>();

interface CardImageProps {
  src: string | null;
  nextSrc?: string | null;
  alt: string;
  scrollProgress?: number;
}

function CardImage({ src, nextSrc, alt, scrollProgress = 0 }: CardImageProps) {
  const imageARef = useRef<HTMLImageElement>(null);
  const imageBRef = useRef<HTMLImageElement>(null);

  // Track which image slot (A or B) is the "current" one
  const [activeSlot, _setActiveSlot] = useState<'A' | 'B'>('A');
  const [slotASrc, _setSlotASrc] = useState<string | null>(null);
  const [slotBSrc, _setSlotBSrc] = useState<string | null>(null);
  const [slotALoaded, _setSlotALoaded] = useState(false);
  const [slotBLoaded, _setSlotBLoaded] = useState(false);

  // Use refs to track previous values without causing re-renders
  const prevSrcRef = useRef<string | null>(null);
  const prevNextSrcRef = useRef<string | null>(null);
  const pendingSwapSrcRef = useRef<string | null>(null);
  const activeSlotRef = useRef<'A' | 'B'>(activeSlot);
  const slotASrcRef = useRef<string | null>(slotASrc);
  const slotBSrcRef = useRef<string | null>(slotBSrc);
  const slotALoadedRef = useRef(slotALoaded);
  const slotBLoadedRef = useRef(slotBLoaded);

  const setActiveSlot = useCallback((next: 'A' | 'B') => {
    activeSlotRef.current = next;
    _setActiveSlot(next);
  }, []);

  const setSlotASrc = useCallback((next: string | null) => {
    slotASrcRef.current = next;
    _setSlotASrc(next);
  }, []);

  const setSlotBSrc = useCallback((next: string | null) => {
    slotBSrcRef.current = next;
    _setSlotBSrc(next);
  }, []);

  const setSlotALoaded = useCallback((next: boolean) => {
    slotALoadedRef.current = next;
    _setSlotALoaded(next);
  }, []);

  const setSlotBLoaded = useCallback((next: boolean) => {
    slotBLoadedRef.current = next;
    _setSlotBLoaded(next);
  }, []);

  const isKnownLoaded = useCallback((url: string) => loadedImageUrls.has(url), []);

  // Handle src changes (main image source)
  useLayoutEffect(() => {
    if (!src) {
      setSlotASrc(null);
      setSlotBSrc(null);
      setSlotALoaded(false);
      setSlotBLoaded(false);
      pendingSwapSrcRef.current = null;
      prevSrcRef.current = null;
      return;
    }

    // Skip if same as before
    if (src === prevSrcRef.current) {
      return;
    }

    // First load - set slot A
    if (!prevSrcRef.current) {
      setSlotASrc(src);
      setActiveSlot('A');
      prevSrcRef.current = src;
      setSlotALoaded(isKnownLoaded(src));
      return;
    }

    // Check if new src matches what's in the inactive slot (swap case)
    const inactiveSlot = activeSlotRef.current === 'A' ? 'B' : 'A';
    const inactiveSlotSrc = inactiveSlot === 'A' ? slotASrcRef.current : slotBSrcRef.current;
    const inactiveSlotLoaded = inactiveSlot === 'A' ? slotALoadedRef.current : slotBLoadedRef.current;

    if (src === inactiveSlotSrc) {
      // Swap only if preloaded image is actually loaded
      if (inactiveSlotLoaded) {
        setActiveSlot(inactiveSlot);
        pendingSwapSrcRef.current = null;
      } else {
        pendingSwapSrcRef.current = src;
      }
      prevSrcRef.current = src;
      return;
    }

    // New image we haven't preloaded - load it in inactive slot and swap when ready
    const isCached = isKnownLoaded(src);
    if (inactiveSlot === 'A') {
      setSlotASrc(src);
      setSlotALoaded(isCached);
    } else {
      setSlotBSrc(src);
      setSlotBLoaded(isCached);
    }

    // Cached images may not reliably fire a new onLoad event when src is reused.
    // Swap immediately so back-swipes never keep showing the previous card image.
    if (isCached) {
      setActiveSlot(inactiveSlot);
      pendingSwapSrcRef.current = null;
    } else {
      pendingSwapSrcRef.current = src;
    }
    prevSrcRef.current = src;
  }, [src, isKnownLoaded, setActiveSlot, setSlotALoaded, setSlotASrc, setSlotBLoaded, setSlotBSrc]);

  // Handle next src changes (preloading)
  useEffect(() => {
    if (!nextSrc) {
      prevNextSrcRef.current = null;
      return;
    }

    // Skip if same as before
    if (nextSrc === prevNextSrcRef.current) {
      return;
    }

    // Skip if it's the same as current
    if (nextSrc === src) {
      return;
    }

    // Load into inactive slot
    const inactiveSlot = activeSlot === 'A' ? 'B' : 'A';
    if (inactiveSlot === 'A') {
      setSlotASrc(nextSrc);
      setSlotALoaded(isKnownLoaded(nextSrc));
    } else {
      setSlotBSrc(nextSrc);
      setSlotBLoaded(isKnownLoaded(nextSrc));
    }
    prevNextSrcRef.current = nextSrc;
  }, [nextSrc, src, activeSlot, isKnownLoaded, setSlotALoaded, setSlotASrc, setSlotBLoaded, setSlotBSrc]);

  // Image load handlers
  const handleImageALoad = useCallback(() => {
    if (slotASrcRef.current) {
      loadedImageUrls.add(slotASrcRef.current);
    }
    setSlotALoaded(true);
    if (pendingSwapSrcRef.current && pendingSwapSrcRef.current === slotASrcRef.current) {
      setActiveSlot('A');
      pendingSwapSrcRef.current = null;
    }
  }, [setActiveSlot, setSlotALoaded]);

  const handleImageBLoad = useCallback(() => {
    if (slotBSrcRef.current) {
      loadedImageUrls.add(slotBSrcRef.current);
    }
    setSlotBLoaded(true);
    if (pendingSwapSrcRef.current && pendingSwapSrcRef.current === slotBSrcRef.current) {
      setActiveSlot('B');
      pendingSwapSrcRef.current = null;
    }
  }, [setActiveSlot, setSlotBLoaded]);

  // Calculate opacities
  const activeLoaded = activeSlot === 'A' ? slotALoaded : slotBLoaded;
  const nextLoaded = activeSlot === 'A' ? slotBLoaded : slotALoaded;

  const currentOpacity = activeLoaded ? (1 - scrollProgress) : 0;
  const nextOpacity = nextLoaded && scrollProgress > 0.2
    ? Math.min((scrollProgress - 0.2) / 0.5, 1)
    : 0;

  const hasAnyImage = slotASrc || slotBSrc;

  if (!hasAnyImage) {
    return null;
  }

  const slotAOpacity = activeSlot === 'A' ? currentOpacity : nextOpacity;
  const slotBOpacity = activeSlot === 'B' ? currentOpacity : nextOpacity;
  const slotAZIndex = activeSlot === 'A' ? 2 : 1;
  const slotBZIndex = activeSlot === 'B' ? 2 : 1;

  return (
    <>
      {/* Image slot A */}
      <img
        ref={imageARef}
        src={slotASrc || undefined}
        alt={alt}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scale(1.02)',
          opacity: slotAOpacity,
          zIndex: slotAZIndex,
          display: slotASrc ? 'block' : 'none',
        }}
        onLoad={handleImageALoad}
      />

      {/* Image slot B */}
      <img
        ref={imageBRef}
        src={slotBSrc || undefined}
        alt={alt}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scale(1.02)',
          opacity: slotBOpacity,
          zIndex: slotBZIndex,
          display: slotBSrc ? 'block' : 'none',
        }}
        onLoad={handleImageBLoad}
      />
    </>
  );
}

export default CardImage;
