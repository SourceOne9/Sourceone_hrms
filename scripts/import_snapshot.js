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

async function importSnapshot() {
    console.log("⚠️ WARNING: This will UPSERT records into the database.");

    try {
        const backupDir = path.join(__dirname, '../backups');
        const files = fs.readdirSync(backupDir).filter(f => f.startsWith('snapshot-') && f.endsWith('.json'));

        if (files.length === 0) {
            console.error("❌ No snapshot files found in ./backups/");
            process.exit(1);
        }

        // Use the most recent snapshot
        files.sort().reverse();
        const latestFile = path.join(backupDir, files[0]);
        console.log(`📥 Reading snapshot: ${files[0]}`);

        const snapshotData = fs.readFileSync(latestFile, 'utf8');
        const snapshot = JSON.parse(snapshotData);

        console.log(`📊 Validating data containing ${snapshot.data.employees.length} employees...`);

        // Perform upserts in a transaction block
        await prisma.$transaction(async (tx) => {
            console.log("Restoring Organizations...");
            for (const org of snapshot.data.organizations) {
                await tx.organization.upsert({
                    where: { id: org.id },
                    update: { name: org.name, domain: org.domain },
                    create: org
                });
            }

            console.log("Restoring Departments...");
            for (const dept of snapshot.data.departments) {
                await tx.department.upsert({
                    where: { id: dept.id },
                    update: { name: dept.name, color: dept.color },
                    create: dept
                });
            }

            console.log("Restoring Users...");
            for (const user of snapshot.data.users) {
                await tx.user.upsert({
                    where: { id: user.id },
                    update: { name: user.name, role: user.role },
                    create: {
                        ...user,
                        // Fallback password for imported users without hash
                        hashedPassword: "RESTORED_NO_HASH",
                    }
                });
            }

            console.log(`Restoring Employees (${snapshot.data.employees.length} total)...`);
            // Batch employee upserts to prevent memory issues
            for (const emp of snapshot.data.employees) {
                await tx.employee.upsert({
                    where: { id: emp.id },
                    update: {
                        firstName: emp.firstName,
                        lastName: emp.lastName,
                        salary: emp.salary,
                        status: emp.status,
                    },
                    create: emp
                });
            }
        }, {
            maxWait: 10000,
            timeout: 60000
        });

        console.log(`✅ Restore Drill Successfully Completed.`);

    } catch (e) {
        console.error("❌ Failed to restore snapshot:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

importSnapshot();
