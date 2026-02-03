import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import type { BackgroundConfig } from '../lib/types';

interface BackgroundProps {
  config: BackgroundConfig;
  nextConfig?: BackgroundConfig | null;
  isActive: boolean;
  scrollProgress?: number;
}

function Background({ config, nextConfig, isActive, scrollProgress = 0 }: BackgroundProps) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  // Track which video slot (A or B) is the "current" one
  const [activeSlot, _setActiveSlot] = useState<'A' | 'B'>('A');
  const [slotASrc, _setSlotASrc] = useState<string | null>(null);
  const [slotBSrc, _setSlotBSrc] = useState<string | null>(null);
  const [nextVideoReady, setNextVideoReady] = useState(false);

  // Use refs to track previous values without causing re-renders
  const prevConfigSrcRef = useRef<string | null>(null);
  const prevNextConfigSrcRef = useRef<string | null>(null);
  const pendingSwapSrcRef = useRef<string | null>(null);
  const activeSlotRef = useRef<'A' | 'B'>(activeSlot);
  const slotASrcRef = useRef<string | null>(slotASrc);
  const slotBSrcRef = useRef<string | null>(slotBSrc);

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

  // Get current config src
  const configSrc = config.type === 'video' ? config.src : null;
  const nextConfigSrc = nextConfig?.type === 'video' ? nextConfig.src : null;

  // Handle config changes (main video source) before paint to avoid visual flash
  useLayoutEffect(() => {
    if (!configSrc) {
      setSlotASrc(null);
      setSlotBSrc(null);
      setNextVideoReady(false);
      prevConfigSrcRef.current = null;
      pendingSwapSrcRef.current = null;
      return;
    }

    // Skip if same as before
    if (configSrc === prevConfigSrcRef.current) {
      return;
    }

    // First load - set slot A
    if (!prevConfigSrcRef.current) {
      setSlotASrc(configSrc);
      setActiveSlot('A');
      setNextVideoReady(false);
      prevConfigSrcRef.current = configSrc;
      return;
    }

    // Check if new config matches what's in the inactive slot (swap case)
    const inactiveSlot = activeSlotRef.current === 'A' ? 'B' : 'A';
    const inactiveSlotSrc = inactiveSlot === 'A' ? slotASrcRef.current : slotBSrcRef.current;

    if (configSrc === inactiveSlotSrc) {
      // Swap! The preloaded video becomes current
      setActiveSlot(inactiveSlot);
      setNextVideoReady(false);
      pendingSwapSrcRef.current = null;
      prevConfigSrcRef.current = configSrc;
      return;
    }

    // New video we haven't preloaded - load into inactive slot and swap when ready
    if (inactiveSlot === 'A') {
      setSlotASrc(configSrc);
    } else {
      setSlotBSrc(configSrc);
    }
    pendingSwapSrcRef.current = configSrc;
    setNextVideoReady(false);
    prevConfigSrcRef.current = configSrc;
  }, [configSrc]); // Only depend on configSrc, read other values directly

  // Handle next config changes (preloading)
  useEffect(() => {
    if (!nextConfigSrc) {
      if (prevNextConfigSrcRef.current) {
        setNextVideoReady(false);
        prevNextConfigSrcRef.current = null;
      }
      return;
    }

    // Skip if same as before
    if (nextConfigSrc === prevNextConfigSrcRef.current) {
      return;
    }

    // Skip if it's the same as current
    if (nextConfigSrc === configSrc) {
      return;
    }

    // Load into inactive slot
    const inactiveSlot = activeSlot === 'A' ? 'B' : 'A';
    if (inactiveSlot === 'A') {
      setSlotASrc(nextConfigSrc);
    } else {
      setSlotBSrc(nextConfigSrc);
    }
    setNextVideoReady(false);
    prevNextConfigSrcRef.current = nextConfigSrc;
  }, [nextConfigSrc, configSrc, activeSlot]);

  // Video ready handlers
  const handleVideoACanPlay = useCallback(() => {
    const video = videoARef.current;
    if (video && video.paused) {
      video.play().catch(() => {});
    }
    if (activeSlotRef.current !== 'A') {
      if (pendingSwapSrcRef.current && pendingSwapSrcRef.current === slotASrcRef.current) {
        setActiveSlot('A');
        pendingSwapSrcRef.current = null;
        setNextVideoReady(false);
      } else {
        setNextVideoReady(true);
      }
    }
  }, [setActiveSlot]);

  const handleVideoBCanPlay = useCallback(() => {
    const video = videoBRef.current;
    if (video && video.paused) {
      video.play().catch(() => {});
    }
    if (activeSlotRef.current !== 'B') {
      if (pendingSwapSrcRef.current && pendingSwapSrcRef.current === slotBSrcRef.current) {
        setActiveSlot('B');
        pendingSwapSrcRef.current = null;
        setNextVideoReady(false);
      } else {
        setNextVideoReady(true);
      }
    }
  }, [setActiveSlot]);

  // Sync playback for active video
  useEffect(() => {
    const activeVideo = activeSlot === 'A' ? videoARef.current : videoBRef.current;
    if (!activeVideo) return;

    if (isActive && activeVideo.readyState >= 2 && activeVideo.paused) {
      activeVideo.play().catch(() => {});
    }
  }, [isActive, activeSlot]);

  // Calculate opacities
  const currentOpacity = 1 - scrollProgress;
  const nextOpacity = nextVideoReady && scrollProgress > 0.2
    ? Math.min((scrollProgress - 0.2) / 0.5, 1)
    : 0;

  const hasAnyVideo = slotASrc || slotBSrc;

  if (hasAnyVideo) {
    const slotAOpacity = activeSlot === 'A' ? currentOpacity : nextOpacity;
    const slotBOpacity = activeSlot === 'B' ? currentOpacity : nextOpacity;
    const slotAZIndex = activeSlot === 'A' ? 2 : 1;
    const slotBZIndex = activeSlot === 'B' ? 2 : 1;

    return (
      <>
        {/* Black base layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#000',
            zIndex: 0,
          }}
        />

        {/* Video slot A */}
        <video
          ref={videoARef}
          className="background-video"
          style={{
            opacity: slotAOpacity,
            zIndex: slotAZIndex,
            display: slotASrc ? 'block' : 'none'
          }}
          src={slotASrc || undefined}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={handleVideoACanPlay}
        />

        {/* Video slot B */}
        <video
          ref={videoBRef}
          className="background-video"
          style={{
            opacity: slotBOpacity,
            zIndex: slotBZIndex,
            display: slotBSrc ? 'block' : 'none'
          }}
          src={slotBSrc || undefined}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={handleVideoBCanPlay}
        />
      </>
    );
  }

  // Gradient fallback
  const gradientStyle = {
    '--gradient-color-1': config.colors?.[0] || '#0b0f14',
    '--gradient-color-2': config.colors?.[1] || '#0f1722',
    '--gradient-color-3': config.colors?.[2] || '#141c28'
  } as React.CSSProperties;

  return (
    <div
      className={`background-gradient ${isActive ? 'animate' : ''}`}
      style={{ ...gradientStyle, opacity: 1 - scrollProgress }}
    />
  );
}

export default Background;
