const cache: Record<string, { timestamp: number; data: any }> = {};
const TTL = 1000 * 60 * 15; // 15 minutes

export function getFromCache(key: string) {
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL) {
        delete cache[key];
        return null;
    }
    return entry.data;
}

export function setCache(key: string, data: any) {
    cache[key] = {
        timestamp: Date.now(),
        data,
    };
}