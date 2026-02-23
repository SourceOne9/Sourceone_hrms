import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const employees = await prisma.employee.findMany({
            take: 1
        })
        console.log("Success:", employees.length)
    } catch (e) {
        console.error("Prisma Error:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
