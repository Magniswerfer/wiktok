# Core Loop Polish Plan

## Scope
Instant load, zero jank, predictable scroll behavior, and clear offline UX.

## Checklist
- [x] Define measurable success criteria and test matrix
- [x] Improve load path to avoid blank first paint and tighten prefetch timing
- [x] Stabilize scroll behavior during programmatic resets and edge cases
- [x] Make offline/online states clear and actionable
- [x] Manual verification pass and update this plan

## Success Criteria
- First content visible within 1–2s on warm cache, <3s on cold cache (mid-range device)
- No visible flashes or frame drops during rapid swipe/back
- Scroll snapping always lands on a single card; no double-snap or incorrect index
- Offline mode shows clear message and retry works when connectivity returns

## Test Matrix (Manual)
- Cold start online
- Warm start online
- Offline start
- Toggle offline→online and retry
- Rapid swipe 10x down, 10x up
- Edge cases: first card, last card, no cards
