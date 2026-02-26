import { redis } from "./redis"

// Represents a background job in our queue
export interface JobPayload {
    id: string
    type: "ATTENDANCE_IMPORT" | "PF_IMPORT" | "EMPLOYEE_IMPORT"
    data: any
    createdAt: number
}

const QUEUE_KEY = "EMS:JOB_QUEUE"

export const queue = {
    /**
     * Enqueues a single job payload onto the Redis list securely.
     */
    async enqueue(type: JobPayload["type"], data: any): Promise<string> {
        const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        const payload: JobPayload = {
            id,
            type,
            data,
            createdAt: Date.now()
        }

        // Pushing to the end of the list (FIFO queue)
        // If redisClient is available (Upstash), this uses LPUSH.
        // Wait, our `lib/redis` wrapper only supports set/get/incr/expire.
        return await this._fallbackLpush(payload)
    },

    /**
     * Fallback List manipulation using raw Redis methods or in-memory arrays since `lib/redis` is minimal.
     * We will map a dynamic index to act as a list.
     */
    async _fallbackLpush(payload: JobPayload) {
        // Since `lib/redis` didn't implement lpush/rpop, let's implement a safe Redis-based queue
        // We increment a "head_index", then SET that key.
        const head = await redis.incr(`${QUEUE_KEY}:HEAD`)
        await redis.set(`${QUEUE_KEY}:ITEM:${head}`, JSON.stringify(payload))
        return payload.id
    },

    /**
     * Dequeues (pops) the oldest job payload from the queue.
     */
    async dequeue(): Promise<JobPayload | null> {
        // We increment a "tail_index" to find the oldest unread job.
        const tailIncrStr = await redis.get(`${QUEUE_KEY}:TAIL_INCR`)
        const tail = parseInt(tailIncrStr || "0", 10) + 1

        const headIncrStr = await redis.get(`${QUEUE_KEY}:HEAD`)
        const head = parseInt(headIncrStr || "0", 10)

        if (tail > head) {
            return null // Queue is empty
        }

        const itemStr = await redis.get(`${QUEUE_KEY}:ITEM:${tail}`)
        if (!itemStr) {
            // Might have been deleted or expired, gracefully increment past it
            await redis.incr(`${QUEUE_KEY}:TAIL_INCR`)
            return null
        }

        // Successfully dequeued
        await redis.incr(`${QUEUE_KEY}:TAIL_INCR`)
        // Cleanup the item key
        await redis.set(`${QUEUE_KEY}:ITEM:${tail}`, "", { ex: 1 }) // Delete essentially

        try {
            return JSON.parse(itemStr) as JobPayload
        } catch {
            return null
        }
    }
}
