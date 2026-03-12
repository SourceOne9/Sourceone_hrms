import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Safely extracts an array from an API response.
 * Handles both the standard envelope { data: [...] } and direct array responses.
 * returns [] if input is null, undefined, or not an array/envelope.
 */
export function extractArray<T>(json: unknown): T[] {
    if (!json) return []
    if (Array.isArray(json)) return json
    if (typeof json === 'object' && json !== null && 'data' in json && Array.isArray((json as Record<string, unknown>).data)) return (json as Record<string, unknown>).data as T[]
    return []
}
