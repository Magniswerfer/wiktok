# Recommendation DB Outline (Supabase Postgres + pgvector)

## 1) Goals
- Single datastore for MVP: articles, metadata, embeddings, interactions, and model artifacts.
- Support cold-start with content similarity and evolve to implicit-feedback recommenders.
- Keep infra minimal and costs low while preserving a path to scale.

## 2) Core Schema (MVP)

### articles
- id (bigint, PK)
- title (text)
- slug (text, unique)
- language (text)
- summary (text)
- url (text)
- categories (text[])
- quality_score (float)
- updated_at (timestamptz)
- created_at (timestamptz)

Indexes:
- (language)
- (updated_at)
- GIN on categories
- (quality_score desc)

### article_embeddings
- article_id (bigint, PK, FK -> articles.id)
- embedding (vector(N))
- model_version (text)
- updated_at (timestamptz)

Indexes:
- vector index (see rollout below)
- (model_version)

### users
- id (uuid, PK)
- created_at (timestamptz)
- last_seen_at (timestamptz)
- language_pref (text)
- region (text)

Indexes:
- (last_seen_at)

### user_events
- id (bigint, PK)
- user_id (uuid, FK -> users.id)
- article_id (bigint, FK -> articles.id)
- event_type (text) -- view, click, like, share, skip
- dwell_ms (int) -- optional
- scroll_depth (int) -- 0-100
- session_id (uuid)
- created_at (timestamptz)

Indexes:
- (user_id, created_at desc)
- (article_id, created_at desc)
- (event_type, created_at desc)
- (session_id)

### feed_impressions
- id (bigint, PK)
- user_id (uuid)
- article_id (bigint)
- rank (int)
- model_version (text)
- created_at (timestamptz)

Indexes:
- (user_id, created_at desc)
- (article_id, created_at desc)
- (model_version)

## 3) Minimal Recommendation Queries (MVP)

### Content similarity (cold-start)
- Use article_embeddings to find similar items.
- Filter by language, quality_score, and categories.

Example (conceptual):
- Select top-N similar embeddings by cosine distance.
- Filter out recently seen articles from user_events.

### Trending / fresh fallback
- Combine: recent views + recency decay + quality_score.
- Use as fallback when user has no history.

## 4) pgvector Rollout Plan

### Phase 1: Exact search
- Use cosine distance without ANN index.
- Suitable for small subset (<= 100k embeddings).
- Keeps setup simple during MVP.

### Phase 2: IVFFlat
- Enable IVFFlat for faster approximate search.
- Good for medium scale (100k-1M embeddings).
- Requires "ANALYZE" and index tuning.

### Phase 3: HNSW
- Use HNSW for lower latency and better recall.
- Best for larger scale and higher QPS.
- Tune M and ef_search for latency/recall tradeoff.

## 5) Logging and Training Path

### Early MVP
- Capture events: view, click, dwell_ms, skip, like.
- Basic implicit score: weighted sum of events.

### After 2-4 weeks of logs
- Train LightFM with user_events aggregated to implicit feedback.
- Keep content embeddings for cold-start and diversity.

## 6) Data Retention
- Keep raw user_events for 90-180 days.
- Create daily aggregates for model training:
  - user_id, article_id, implicit_score, day

## 7) Performance Tips (MVP)
- Cache top-N trending and category feeds.
- Precompute per-article neighbors (top 200) nightly.
- Use server-side filtering to remove recently seen items.

## 8) Migration to Scale (Later)
- Move embeddings to a dedicated vector DB only if needed.
- Use read replicas for heavy feed traffic.
- Introduce a feature store if you move beyond LightFM.

