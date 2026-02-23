import { prisma } from "./lib/prisma"

async function main() {
    const emps = await prisma.employee.findMany();
    if (emps.length >= 2) {
        await prisma.employee.update({
            where: { id: emps[1].id },
            data: { managerId: emps[0].id }
        });
        console.log(`Set ${emps[0].firstName} as manager of ${emps[1].firstName}`);
    } else {
        console.log("Not enough employees to link.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
