import { useRef, useEffect, useState, useCallback } from 'react';
import type { BackgroundConfig } from '../lib/types';

interface BackgroundProps {
  config: BackgroundConfig;
  isActive: boolean;
}

function Background({ config, isActive }: BackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeSrc, setActiveSrc] = useState<string | null>(
    config.type === 'video' ? config.src ?? null : null
  );

  // Handle "canplay" - video has enough data to start playback
  const handleCanPlay = useCallback(() => {
    setIsReady(true);
  }, []);

  // Preload next video and only swap when it can play to reduce flashes
  useEffect(() => {
    if (config.type !== 'video' || !config.src) {
      setActiveSrc(null);
      setIsReady(false);
      return;
    }

    if (!activeSrc) {
      setActiveSrc(config.src);
      setIsReady(false);
      return;
    }

    if (activeSrc === config.src) {
      return;
    }

    let cancelled = false;
    const preloader = document.createElement('video');
    preloader.preload = 'auto';
    preloader.muted = true;
    preloader.playsInline = true;
    preloader.src = config.src;

    const cleanup = () => {
      preloader.removeEventListener('canplay', onCanPlay);
      preloader.removeEventListener('error', onError);
      preloader.src = '';
    };

    const onCanPlay = () => {
      if (cancelled) return;
      setActiveSrc(config.src);
      setIsReady(true);
      cleanup();
    };

    const onError = () => {
      if (cancelled) return;
      setActiveSrc(config.src);
      setIsReady(false);
      cleanup();
    };

    preloader.addEventListener('canplay', onCanPlay);
    preloader.addEventListener('error', onError);
    preloader.load();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [config.type, config.src, activeSrc]);

  // Handle video play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || config.type !== 'video' || !activeSrc) return;

    if (isActive && isReady) {
      // Only call play() if video is actually paused
      if (video.paused) {
        video.play().catch(() => {
          // Autoplay blocked - that's ok
        });
      }
    } else if (!isActive) {
      // Pause when not active (but don't reset position)
      if (!video.paused) {
        video.pause();
      }
    }
  }, [isActive, isReady, config.type, activeSrc]);

  if (config.type === 'video' && activeSrc) {
    return (
      <>
        {/* Loading placeholder while video loads */}
        {!isReady && (
          <div className="background-gradient" style={{
            '--gradient-color-1': '#0b0f14',
            '--gradient-color-2': '#0f1722',
            '--gradient-color-3': '#141c28'
          } as React.CSSProperties} />
        )}
        <video
          ref={videoRef}
          className={`background-video ${isReady ? 'loaded' : ''}`}
          src={activeSrc}
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={handleCanPlay}
          crossOrigin="anonymous"
        />
      </>
    );
  }

  // Gradient background
  const gradientStyle = {
    '--gradient-color-1': config.colors?.[0] || '#0b0f14',
    '--gradient-color-2': config.colors?.[1] || '#0f1722',
    '--gradient-color-3': config.colors?.[2] || '#141c28'
  } as React.CSSProperties;

  return (
    <div
      className={`background-gradient ${isActive ? 'animate' : ''}`}
      style={gradientStyle}
    />
  );
}

export default Background;
