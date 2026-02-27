import { z } from "zod"

export const shiftSchema = z.object({
    name: z.string().min(1, "Shift name is required"),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
    workDays: z.array(z.number().min(0).max(6)).min(1, "At least one work day is required"),
})

export const shiftAssignmentSchema = z.object({
    employeeId: z.string().min(1, "Employee ID is required"),
    shiftId: z.string().min(1, "Shift ID is required"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
})

export const attendancePolicySchema = z.object({
    name: z.string().default("DEFAULT"),
    lateGracePeriod: z.number().nonnegative().default(15),
    earlyExitGrace: z.number().nonnegative().default(15),
    otThreshold: z.number().nonnegative().default(60),
})

export const regularizationSchema = z.object({
    attendanceId: z.string().min(1, "Attendance ID is required"),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
    requestedTime: z.coerce.date().optional().nullable(),
    type: z.enum(["MISSING_PUNCH", "LATE_CORRECTION", "EARLY_EXIT_CORRECTION"]),
})

export const holidaySchema = z.object({
    name: z.string().min(1, "Holiday name is required"),
    date: z.coerce.date(),
    isOptional: z.boolean().default(false),
})
