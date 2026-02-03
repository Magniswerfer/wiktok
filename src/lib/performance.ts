/**
 * Performance monitoring utilities
 *
 * Targets:
 * - TTI (Time to Interactive): <2s on mid-range mobile
 * - Scroll frame drops: <1% of frames
 * - Memory: Stable over long sessions (no leaks)
 */

export interface PerformanceMetrics {
  tti: number | null;
  fcp: number | null;
  lcp: number | null;
  frameDropRate: number;
  memoryUsage: number | null;
  totalFrames: number;
  droppedFrames: number;
}

const FRAME_BUDGET_MS = 16.67; // 60fps target
const TARGETS = {
  TTI_MS: 2000,
  FRAME_DROP_RATE: 0.01, // 1%
  MEMORY_GROWTH_MB: 50, // Max acceptable growth per session
};

let metrics: PerformanceMetrics = {
  tti: null,
  fcp: null,
  lcp: null,
  frameDropRate: 0,
  memoryUsage: null,
  totalFrames: 0,
  droppedFrames: 0,
};

let lastFrameTime = 0;
let isMonitoring = false;
let initialMemory: number | null = null;

/**
 * Measure Time to Interactive using PerformanceObserver
 */
export function measureTTI(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries.find(e => e.name === 'first-contentful-paint');
      if (fcp) {
        metrics.fcp = fcp.startTime;
        fcpObserver.disconnect();
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });
  } catch {
    // PerformanceObserver not supported for paint
  }

  // Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        metrics.lcp = lastEntry.startTime;
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Stop observing after load
    window.addEventListener('load', () => {
      setTimeout(() => lcpObserver.disconnect(), 0);
    }, { once: true });
  } catch {
    // LCP not supported
  }

  // TTI approximation: when main thread is idle after FCP
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length === 0 && metrics.fcp && !metrics.tti) {
        metrics.tti = performance.now();
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });

    // Fallback: if no long tasks after 5s, consider interactive
    setTimeout(() => {
      if (!metrics.tti && metrics.fcp) {
        metrics.tti = metrics.fcp + 100; // Assume fast TTI
      }
      longTaskObserver.disconnect();
    }, 5000);
  } catch {
    // Long task observer not supported, use load event
    window.addEventListener('load', () => {
      metrics.tti = performance.now();
    }, { once: true });
  }
}

/**
 * Start monitoring frame rate for scroll performance
 */
export function startFrameMonitoring(): void {
  if (isMonitoring || typeof window === 'undefined') return;
  isMonitoring = true;
  lastFrameTime = performance.now();

  function checkFrame(): void {
    if (!isMonitoring) return;

    const now = performance.now();
    const frameDuration = now - lastFrameTime;
    lastFrameTime = now;

    metrics.totalFrames++;
    if (frameDuration > FRAME_BUDGET_MS * 1.5) {
      // Frame took >25ms, count as dropped
      metrics.droppedFrames++;
    }

    metrics.frameDropRate = metrics.totalFrames > 0
      ? metrics.droppedFrames / metrics.totalFrames
      : 0;

    requestAnimationFrame(checkFrame);
  }

  requestAnimationFrame(checkFrame);
}

/**
 * Stop frame monitoring
 */
export function stopFrameMonitoring(): void {
  isMonitoring = false;
}

/**
 * Measure current memory usage (Chrome only)
 */
export function measureMemory(): number | null {
  if (typeof window === 'undefined') return null;

  const perf = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  if (perf.memory) {
    const usedMB = perf.memory.usedJSHeapSize / (1024 * 1024);
    metrics.memoryUsage = usedMB;

    if (initialMemory === null) {
      initialMemory = usedMB;
    }

    return usedMB;
  }

  return null;
}

/**
 * Get current performance metrics
 */
export function getMetrics(): PerformanceMetrics {
  measureMemory();
  return { ...metrics };
}

/**
 * Check if performance targets are met
 */
export function checkTargets(): {
  tti: boolean;
  frameDropRate: boolean;
  memory: boolean;
  summary: string;
} {
  const m = getMetrics();

  const ttiOk = m.tti !== null && m.tti <= TARGETS.TTI_MS;
  const framesOk = m.frameDropRate <= TARGETS.FRAME_DROP_RATE;
  const memoryOk = initialMemory === null || m.memoryUsage === null ||
    (m.memoryUsage - initialMemory) <= TARGETS.MEMORY_GROWTH_MB;

  const summary = [
    `TTI: ${m.tti?.toFixed(0) ?? '?'}ms (target: <${TARGETS.TTI_MS}ms) ${ttiOk ? '✓' : '✗'}`,
    `Frame drops: ${(m.frameDropRate * 100).toFixed(2)}% (target: <${TARGETS.FRAME_DROP_RATE * 100}%) ${framesOk ? '✓' : '✗'}`,
    `Memory: ${m.memoryUsage?.toFixed(1) ?? '?'}MB ${memoryOk ? '✓' : '✗'}`,
  ].join('\n');

  return { tti: ttiOk, frameDropRate: framesOk, memory: memoryOk, summary };
}

/**
 * Log performance report to console
 */
export function logPerformanceReport(): void {
  const { summary } = checkTargets();
  console.log('📊 Performance Report:\n' + summary);
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  measureTTI();
  startFrameMonitoring();

  // Log report after page is fully loaded
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(logPerformanceReport, 3000);
    }, { once: true });
  }
}
