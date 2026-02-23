import { prisma } from "./lib/prisma"
import fs from "fs"

async function testCRUD() {
    const results: string[] = [];
    const log = (msg: string) => { console.log(msg); results.push(msg); };

    log("Starting DB functionality test for Org Chart CRUD...")

    let testManagerId: string | null = null;
    let testReportId: string | null = null;

    try {
        const dept = await prisma.department.findFirst()
        if (!dept) throw new Error("No departments found to test with.")

        log("1. Testing Create Manager...")
        const manager = await fetch("http://localhost:3000/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employeeCode: `TEST-MGR-${Date.now()}`,
                firstName: "Test",
                lastName: "Manager",
                email: `mgr-${Date.now()}@example.com`,
                designation: "Test Lead",
                departmentId: dept.id,
                dateOfJoining: new Date().toISOString().split('T')[0],
                salary: 100000,
                status: "ACTIVE",
                managerId: null
            })
        }).then(res => res.json())

        if (manager.error) throw new Error("Create Manager failed: " + JSON.stringify(manager))
        testManagerId = manager.id
        log("✅ Create Manager Passed: " + testManagerId)

        log("2. Testing Create Direct Report...")
        const report = await fetch("http://localhost:3000/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employeeCode: `TEST-RPT-${Date.now()}`,
                firstName: "Test",
                lastName: "Report",
                email: `rpt-${Date.now()}@example.com`,
                designation: "Test Engineer",
                departmentId: dept.id,
                dateOfJoining: new Date().toISOString().split('T')[0],
                salary: 80000,
                status: "ACTIVE",
                managerId: testManagerId
            })
        }).then(res => res.json())

        if (report.error) throw new Error("Create Report failed: " + JSON.stringify(report))
        testReportId = report.id
        log("✅ Create Direct Report Passed: " + testReportId)

        log("3. Testing Org API Fetch...")
        const orgRes = await fetch("http://localhost:3000/api/organization")
        const orgData = await orgRes.json()
        if (!Array.isArray(orgData)) {
            throw new Error("Org API error: " + JSON.stringify(orgData))
        }
        const foundReport = orgData.find((e: any) => e.id === testReportId)
        if (!foundReport) {
            throw new Error("Org API didn't return the created report!")
        }
        if (foundReport.managerId !== testManagerId) {
            throw new Error(`Hierarchy Error: Expected ${testManagerId} but got ${foundReport.managerId}`)
        }
        log("✅ Org Fetch Passed")

        log("4. Testing Edit Employee...")
        const updated = await fetch(`http://localhost:3000/api/employees/${testReportId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                designation: "Senior Test Engineer",
                salary: 90000
            })
        }).then(res => res.json())

        if (updated.error || updated.designation !== "Senior Test Engineer") {
            throw new Error("Update Report failed: " + JSON.stringify(updated))
        }
        log("✅ Edit Employee Passed")

        log("5. Testing Delete Manager (Checking constraints)...")
        const deleteManagerRes = await fetch(`http://localhost:3000/api/employees/${testManagerId}`, {
            method: "DELETE"
        })

        if (!deleteManagerRes.ok) {
            log("⚠️ Deleting Manager Failed (Expected if onDelete isn't SetNull). Response: " + deleteManagerRes.status)
        } else {
            log("✅ Delete Manager Passed (Cascade or Nullified).")
        }

    } catch (err: any) {
        log("❌ Test Failed: " + err.message)
    } finally {
        log("Cleaning up...")
        if (testReportId) await prisma.employee.delete({ where: { id: testReportId } }).catch(() => { })
        if (testManagerId) await prisma.employee.delete({ where: { id: testManagerId } }).catch(() => { })

        fs.writeFileSync("test-report.json", JSON.stringify(results, null, 2))
        await prisma.$disconnect()
    }
}

testCRUD()
