const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL must be set in .env");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function exportSnapshot() {
    console.log("🛡️ Starting Manual Database Snapshot...");
    try {
        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.join(backupDir, `snapshot-${timestamp}.json`);

        console.log("Fetching core entities...");

        // Concurrently fetch vital application state
        const [orgs, depts, users, employees] = await Promise.all([
            prisma.organization.findMany(),
            prisma.department.findMany(),
            prisma.user.findMany({
                select: { id: true, email: true, role: true, organizationId: true, name: true } // Omit passwords
            }),
            prisma.employee.findMany()
        ]);

        const snapshot = {
            metadata: {
                exportedAt: new Date().toISOString(),
                recordCounts: {
                    organizations: orgs.length,
                    departments: depts.length,
                    users: users.length,
                    employees: employees.length
                }
            },
            data: {
                organizations: orgs,
                departments: depts,
                users,
                employees
            }
        };

        fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2), 'utf-8');
        console.log(`✅ Snapshot successfully saved to: ${filename}`);
        console.log(`📊 Snapshot Stats: ${JSON.stringify(snapshot.metadata.recordCounts)}`);

    } catch (e) {
        console.error("❌ Failed to export snapshot:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

exportSnapshot();
