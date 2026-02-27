import { evaluateAttendance, isWorkingDay } from "./attendance-engine"

const mockPolicy = {
    lateGracePeriod: 15,
    earlyExitGrace: 15,
    otThreshold: 60,
}

const mockShift = {
    startTime: "09:00",
    endTime: "18:00",
    workDays: [1, 2, 3, 4, 5], // Mon-Fri
}

const mockHolidays = [
    { date: new Date("2024-01-01"), name: "New Year", id: "1", isOptional: false, organizationId: "1" }
]

function test() {
    console.log("--- Starting Attendance Engine Tests ---")

    // Case 1: On-time check-in, on-time check-out
    const res1 = evaluateAttendance(
        new Date("2024-03-25T09:00:00"),
        new Date("2024-03-25T18:00:00"),
        mockShift as any, mockPolicy as any, []
    )
    console.log("Scenario 1 (Normal):", res1.status === "PRESENT" && !res1.isLate ? "PASS" : "FAIL")

    // Case 2: Late check-in (outside grace)
    const res2 = evaluateAttendance(
        new Date("2024-03-25T09:20:00"),
        new Date("2024-03-25T18:00:00"),
        mockShift as any, mockPolicy as any, []
    )
    console.log("Scenario 2 (Late):", res2.isLate === true ? "PASS" : "FAIL")

    // Case 3: Early exit (outside grace)
    const res3 = evaluateAttendance(
        new Date("2024-03-25T09:00:00"),
        new Date("2024-03-25T17:40:00"),
        mockShift as any, mockPolicy as any, []
    )
    console.log("Scenario 3 (Early Exit):", res3.isEarlyExit === true ? "PASS" : "FAIL")

    // Case 4: Overtime
    const res4 = evaluateAttendance(
        new Date("2024-03-25T09:00:00"),
        new Date("2024-03-25T20:00:00"),
        mockShift as any, mockPolicy as any, []
    )
    console.log("Scenario 4 (Overtime):", res4.overtimeMinutes === 120 ? "PASS" : "FAIL")

    // Case 5: Holiday
    const res5 = evaluateAttendance(
        new Date("2024-01-01T09:00:00"),
        new Date("2024-01-01T18:00:00"),
        mockShift as any, mockPolicy as any, mockHolidays as any
    )
    console.log("Scenario 5 (Holiday):", res5.status === "HOLIDAY" ? "PASS" : "FAIL")

    // Case 6: Weekend
    const res6 = evaluateAttendance(
        new Date("2024-03-24T09:00:00"), // Sunday
        new Date("2024-03-24T18:00:00"),
        mockShift as any, mockPolicy as any, []
    )
    console.log("Scenario 6 (Weekend):", res6.status === "WEEKEND" ? "PASS" : "FAIL")

    console.log("--- Tests Completed ---")
}

test()
