import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set (length: " + process.env.DATABASE_URL.length + ")" : "Not set");

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const client = await pool.connect();
        console.log("Connected to pg successfully!");
        const res = await client.query('SELECT NOW()');
        console.log("Time from DB:", res.rows[0]);
        client.release();
    } catch (err) {
        console.error("PG Connection Error:", err);
    } finally {
        await pool.end();
    }
}
main();
