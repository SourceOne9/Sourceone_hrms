import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

console.log("Testing DIRECT_URL:", process.env.DIRECT_URL ? "Set" : "Not set");

async function main() {
    const pool = new Pool({ connectionString: process.env.DIRECT_URL });
    try {
        const client = await pool.connect();
        console.log("Connected to pg DIRECT_URL successfully!");
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
