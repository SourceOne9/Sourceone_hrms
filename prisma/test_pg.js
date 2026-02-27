const { Client } = require('pg')
require('dotenv').config()

async function test() {
    const client = new Client({
        connectionString: process.env.DIRECT_URL,
    })
    try {
        console.log("Connecting with pg directly...")
        await client.connect()
        const res = await client.query('SELECT $1::text as message', ['Hello world!'])
        console.log(res.rows[0].message) // Hello world!
    } catch (err) {
        console.error("Connection error:", err.message)
    } finally {
        await client.end()
    }
}

test()
