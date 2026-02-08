import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Controls from './Controls';
import type { BackgroundConfig } from '../lib/types';

const background: BackgroundConfig = {
  id: 'gradient-ocean',
  type: 'gradient',
  colors: ['#000', '#111', '#222'],
  attribution: 'Animated gradient',
};

function renderControls() {
  return render(
    <Controls
      ttsState="idle"
      isSaved={false}
      isTopicModeActive={false}
      audioUnlocked={true}
      cardUrl="https://en.wikipedia.org/wiki/Test"
      cardTitle="Test"
      attributionText='"Test" from Wikipedia, the free encyclopedia'
      license="CC BY-SA 4.0"
      background={background}
      onListen={() => {}}
      onPause={() => {}}
      onSave={() => {}}
      onTopicMode={() => {}}
      onShowAbout={() => {}}
    />
  );
}

describe('Controls share fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not throw when share and clipboard are unavailable', () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

    const { getByLabelText } = renderControls();
    expect(() => fireEvent.click(getByLabelText('Share article'))).not.toThrow();
  });

  it('does not throw when share fails and clipboard write rejects', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new Error('share unavailable')),
      configurable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('clipboard denied')) },
      configurable: true,
    });

    const { getByLabelText } = renderControls();
    expect(() => fireEvent.click(getByLabelText('Share article'))).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();
  });
});
