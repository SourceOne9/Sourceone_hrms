import { prisma } from "./lib/prisma"
import * as dotenv from 'dotenv'

dotenv.config()

async function main() {
    console.log("Seeding database...")

    // 1. Create a Department
    const itDept = await prisma.department.upsert({
        where: { name: "Engineering" },
        update: {},
        create: {
            name: "Engineering",
            color: "#3b82f6",
        },
    })

    // 2. Create another Department
    const hrDept = await prisma.department.upsert({
        where: { name: "HR" },
        update: {},
        create: {
            name: "HR",
            color: "#ec4899",
        },
    })

    // 3. Create Employees
    const emp1 = await prisma.employee.upsert({
        where: { employeeCode: "EMP001" },
        update: {},
        create: {
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            designation: "Senior Software Engineer",
            departmentId: itDept.id,
            dateOfJoining: new Date("2021-01-15"),
            salary: 120000,
            status: "ACTIVE",
        },
    })

    const emp2 = await prisma.employee.upsert({
        where: { employeeCode: "EMP002" },
        update: {},
        create: {
            employeeCode: "EMP002",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@example.com",
            designation: "HR Manager",
            departmentId: hrDept.id,
            dateOfJoining: new Date("2020-05-10"),
            salary: 95000,
            status: "ACTIVE",
        },
    })

    console.log("Created employees:", emp1.firstName, emp2.firstName)
    console.log("Seed finished!")
}

main()
    .catch((e) => {
        console.error("Seed error:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
