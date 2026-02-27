require('dotenv').config()
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "FOUND" : "NOT FOUND")
console.log("CWD:", process.cwd())
