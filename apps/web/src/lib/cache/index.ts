// src/lib/cache/index.ts
export { CACHE_POLICIES, buildKnowledgeTags } from "./cache-policies";
export { cacheInvalidationMiddleware } from "./cache-invalidation-middleware";
export { invalidateFor } from "./invalidate-for";
export { tagsFor } from "./tags-for";
export type { CacheRefs } from "./tags-for";
export type { CachePolicy, InvalidationContext, CacheEntity } from "./types";
