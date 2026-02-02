import { useRef, useEffect } from 'react';
import type { BackgroundConfig } from '../lib/types';

interface BackgroundProps {
  config: BackgroundConfig;
  isActive: boolean;
}

function Background({ config, isActive }: BackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle video play/pause based on active state
  useEffect(() => {
    if (config.type !== 'video' || !videoRef.current) return;

    if (isActive) {
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked, that's ok
      });
    } else {
      videoRef.current.pause();
    }
  }, [isActive, config.type]);

  if (config.type === 'video' && config.src) {
    return (
      <video
        ref={videoRef}
        className="background-video"
        src={config.src}
        loop
        muted
        playsInline
        preload="auto"
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
