import { useRef, useEffect } from 'react';
import type { BackgroundConfig } from '../lib/types';

interface BackgroundProps {
  config: BackgroundConfig;
  isActive: boolean;
  isPrefetch?: boolean;
}

function Background({ config, isActive, isPrefetch = false }: BackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle video preloading and playback
  useEffect(() => {
    if (config.type !== 'video' || !videoRef.current) return;

    const video = videoRef.current;

    if (isPrefetch) {
      // Prefetch: load video and start buffering (muted autoplay may work)
      video.preload = 'auto';
      video.load();
      // Try to play muted to buffer - many browsers allow this
      video.play().catch(() => {
        // Autoplay blocked, that's fine - it will still buffer
      });
    } else if (isActive) {
      // Active: ensure playing
      video.play().catch(() => {
        // Autoplay may be blocked
      });
    } else {
      // Not active or prefetch: pause to save resources
      video.pause();
    }
  }, [isActive, isPrefetch, config.type]);

  // Update video source when config changes
  useEffect(() => {
    if (config.type !== 'video' || !videoRef.current || !config.src) return;

    const video = videoRef.current;
    if (video.src !== config.src) {
      video.src = config.src;
      video.load();
    }
  }, [config]);

  if (config.type === 'video' && config.src) {
    return (
      <video
        ref={videoRef}
        className="background-video"
        loop
        muted
        playsInline
        preload={isPrefetch || isActive ? 'auto' : 'metadata'}
      />
    );
  }

  // Gradient background
  const gradientStyle = {
    '--gradient-color-1': config.colors?.[0] || '#1a1a2e',
    '--gradient-color-2': config.colors?.[1] || '#16213e',
    '--gradient-color-3': config.colors?.[2] || '#0f3460'
  } as React.CSSProperties;

  return (
    <div
      className={`background-gradient ${isActive ? 'animate' : ''}`}
      style={gradientStyle}
    />
  );
}

export default Background;
