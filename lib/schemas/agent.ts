import { z } from "zod"

// ── Device Registration ──────────────────────────────────
export const agentRegisterSchema = z.object({
    deviceName: z.string().min(1).max(200),
    platform: z.enum(["windows", "macos", "linux"]),
    fingerprint: z.string().min(16).max(128),
    agentVersion: z.string().min(1).max(20),
})

// ── Agent Heartbeat ──────────────────────────────────────
export const agentHeartbeatSchema = z.object({
    agentVersion: z.string().max(20).optional(),
    uptime: z.number().nonnegative().optional(),
})

// ── Activity Snapshot (single) ───────────────────────────
const agentSnapshotSchema = z.object({
    sessionId: z.string().min(1),
    timestamp: z.coerce.date(),
    keystrokeCount: z.number().nonnegative().default(0),
    mouseClickCount: z.number().nonnegative().default(0),
    mouseDistance: z.number().nonnegative().default(0),
    scrollCount: z.number().nonnegative().default(0),
    activeSeconds: z.number().nonnegative().default(0),
    idleSeconds: z.number().nonnegative().default(0),
    primaryApp: z.string().max(500).nullable().optional(),
    primaryUrl: z.string().max(2000).nullable().optional(),
    category: z.enum([
        "PRODUCTIVITY", "COMMUNICATION", "DESIGN", "RESEARCH",
        "ENTERTAINMENT", "SOCIAL_MEDIA", "OTHER",
    ]).default("OTHER"),
})

// ── Batch Activity Upload ────────────────────────────────
export const agentActivityBatchSchema = z.object({
    snapshots: z.array(agentSnapshotSchema).min(1).max(100),
})

// ── Idle Event ───────────────────────────────────────────
export const agentIdleEventSchema = z.object({
    sessionId: z.string().min(1),
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date().nullable().optional(),
    durationSec: z.number().nonnegative().default(0),
    response: z.enum(["YES", "NO", "TIMEOUT"]).default("TIMEOUT"),
    notes: z.string().max(500).nullable().optional(),
})

// ── Command Confirmation ─────────────────────────────────
export const agentCommandConfirmSchema = z.object({
    status: z.enum(["EXECUTED", "FAILED_CMD"]),
    result: z.string().max(1000).nullable().optional(),
})

// ── Admin: Issue Command ─────────────────────────────────
export const adminAgentCommandSchema = z.object({
    deviceId: z.string().min(1),
    type: z.enum([
        "UNINSTALL", "WIPE_DATA", "SUSPEND", "RESUME",
        "UPDATE_CONFIG", "FORCE_UPDATE", "FORCE_SYNC", "KILL_SWITCH",
    ]),
    payload: z.record(z.string(), z.unknown()).optional(),
    expiresInMinutes: z.number().positive().optional(),
})

// ── Admin: Device List Filters ───────────────────────────
export const adminDeviceListSchema = z.object({
    status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "UNINSTALLED"]).optional(),
    search: z.string().max(200).optional(),
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(20),
})

// ── Admin: Device Status Update ──────────────────────────
export const adminDeviceUpdateSchema = z.object({
    deviceId: z.string().min(1),
    status: z.enum(["ACTIVE", "SUSPENDED"]),
})
