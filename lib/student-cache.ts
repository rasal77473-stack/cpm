// In-memory cache for student data to avoid repeated slow DB queries
// Data is cached server-side and served instantly on subsequent requests

interface CacheEntry<T> {
    data: T
    timestamp: number
}

const CACHE_TTL = 60 * 1000 // 60 seconds TTL
const cache = new Map<string, CacheEntry<any>>()

export function getCached<T>(key: string): T | null {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key)
        return null
    }
    return entry.data as T
}

export function setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(key?: string): void {
    if (key) {
        cache.delete(key)
    } else {
        cache.clear()
    }
}

export const STUDENTS_CACHE_KEY = "all_students"
export const FINES_CACHE_KEY = "all_fines"
