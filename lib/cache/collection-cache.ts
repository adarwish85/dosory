/**
 * Module-level cache for Firestore collection data.
 * Provides stale-while-revalidate semantics: when a component re-mounts,
 * it gets the last-known data instantly (loading=false) while the real-time
 * listener re-establishes in the background.
 *
 * This eliminates skeleton flash when navigating between dashboard modules.
 */

// Global cache — survives component unmounts, cleared on page refresh
const collectionCache = new Map<string, unknown[]>();

/**
 * Get cached data for a collection query.
 * @param cacheKey - Unique key for this query (e.g. "customers:orgId:status")
 * @returns Cached data array, or undefined if no cache exists
 */
export function getCachedData<T>(cacheKey: string): T[] | undefined {
    return collectionCache.get(cacheKey) as T[] | undefined;
}

/**
 * Set cached data for a collection query.
 * @param cacheKey - Unique key for this query
 * @param data - The data array to cache
 */
export function setCachedData<T>(cacheKey: string, data: T[]): void {
    collectionCache.set(cacheKey, data as unknown[]);
}

/**
 * Build a cache key from collection name and query parameters.
 * @param parts - Array of strings to join (collection, orgId, filters, etc.)
 * @returns A unique cache key
 */
export function buildCacheKey(...parts: (string | number | boolean | undefined | null)[]): string {
    return parts.filter((p) => p !== undefined && p !== null).join(":");
}

/**
 * Clear all cached data (e.g. on logout or org switch).
 */
export function clearCollectionCache(): void {
    collectionCache.clear();
}
