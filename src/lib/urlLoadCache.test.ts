import { describe, it, expect, beforeEach } from 'vitest';
import {
  __getTrackedUrlCountForTests,
  __resetUrlLoadCacheForTests,
  isUrlLoaded,
  markUrlAsLoaded,
} from './urlLoadCache';

describe('urlLoadCache', () => {
  beforeEach(() => {
    __resetUrlLoadCacheForTests();
  });

  it('tracks loaded urls', () => {
    markUrlAsLoaded('https://example.com/a.jpg');
    expect(isUrlLoaded('https://example.com/a.jpg')).toBe(true);
  });

  it('evicts oldest entries when exceeding max size', () => {
    for (let i = 0; i < 350; i++) {
      markUrlAsLoaded(`https://example.com/${i}.jpg`);
    }

    expect(__getTrackedUrlCountForTests()).toBeLessThanOrEqual(300);
    expect(isUrlLoaded('https://example.com/0.jpg')).toBe(false);
    expect(isUrlLoaded('https://example.com/349.jpg')).toBe(true);
  });
});
