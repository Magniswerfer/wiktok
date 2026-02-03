import { useRef, useEffect, useState, useCallback } from 'react';

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
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [slotASrc, setSlotASrc] = useState<string | null>(null);
  const [slotBSrc, setSlotBSrc] = useState<string | null>(null);
  const [slotALoaded, setSlotALoaded] = useState(false);
  const [slotBLoaded, setSlotBLoaded] = useState(false);

  // Use refs to track previous values without causing re-renders
  const prevSrcRef = useRef<string | null>(null);
  const prevNextSrcRef = useRef<string | null>(null);

  // Handle src changes (main image source)
  useEffect(() => {
    if (!src) {
      setSlotASrc(null);
      setSlotBSrc(null);
      setSlotALoaded(false);
      setSlotBLoaded(false);
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
      // Check if already cached
      const img = new Image();
      img.src = src;
      if (img.complete && img.naturalWidth > 0) {
        setSlotALoaded(true);
      } else {
        setSlotALoaded(false);
      }
      return;
    }

    // Check if new src matches what's in the inactive slot (swap case)
    const inactiveSlotSrc = activeSlot === 'A' ? slotBSrc : slotASrc;

    if (src === inactiveSlotSrc) {
      // Swap! The preloaded image becomes current
      setActiveSlot(activeSlot === 'A' ? 'B' : 'A');
      prevSrcRef.current = src;
      return;
    }

    // New image we haven't preloaded - load it in active slot
    if (activeSlot === 'A') {
      setSlotASrc(src);
      // Check if already cached
      const img = new Image();
      img.src = src;
      if (img.complete && img.naturalWidth > 0) {
        setSlotALoaded(true);
      } else {
        setSlotALoaded(false);
      }
    } else {
      setSlotBSrc(src);
      // Check if already cached
      const img = new Image();
      img.src = src;
      if (img.complete && img.naturalWidth > 0) {
        setSlotBLoaded(true);
      } else {
        setSlotBLoaded(false);
      }
    }
    prevSrcRef.current = src;
  }, [src]); // Only depend on src

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
      setSlotALoaded(false);
    } else {
      setSlotBSrc(nextSrc);
      setSlotBLoaded(false);
    }
    prevNextSrcRef.current = nextSrc;
  }, [nextSrc, src, activeSlot]);

  // Image load handlers
  const handleImageALoad = useCallback(() => {
    setSlotALoaded(true);
  }, []);

  const handleImageBLoad = useCallback(() => {
    setSlotBLoaded(true);
  }, []);

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
