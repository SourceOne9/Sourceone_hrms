try {
    console.log("Loading @prisma/client...")
    const { PrismaClient } = require("@prisma/client")
    console.log("Successfully loaded @prisma/client")
    const prisma = new PrismaClient()
    console.log("Successfully instantiated PrismaClient")
} catch (err) {
    console.error("Failed to load/instantiate @prisma/client:", err.message)
    console.error(err.stack)
}
