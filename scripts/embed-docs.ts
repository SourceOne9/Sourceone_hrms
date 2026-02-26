import { embedMany } from 'ai'
import { google } from '@ai-sdk/google'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Simple chunking function mapping string -> chunks of roughly `maxTokens`
function chunkText(text: string, maxTokens: number = 500): string[] {
    // Very rough heuristic: 1 token ~= 4 characters
    const maxChars = maxTokens * 4

    // Split by double newline (paragraphs) first
    const paragraphs = text.split(/\n\s*\n/)

    const chunks: string[] = []
    let currentChunk = ""

    for (const paragraph of paragraphs) {
        if ((currentChunk.length + paragraph.length) < maxChars) {
            currentChunk += (currentChunk ? "\n\n" : "") + paragraph
        } else {
            if (currentChunk) chunks.push(currentChunk)
            currentChunk = paragraph
        }
    }

    if (currentChunk) chunks.push(currentChunk)
    return chunks
}

async function main() {
    console.log("Starting Document Embedder Script...")

    const docsDir = path.join(process.cwd(), 'docs', 'handbooks')
    if (!fs.existsSync(docsDir)) {
        console.error(`Directory ${docsDir} not found. Ensure documents exist.`)
        return
    }

    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'))

    for (const file of files) {
        console.log(`Processing: ${file}`)
        const text = fs.readFileSync(path.join(docsDir, file), 'utf-8')

        const chunks = chunkText(text, 500)
        console.log(`Split into ${chunks.length} chunks. Generating embeddings via Google AI SDK...`)

        // Bulk generate embeddings using AI SDK and Google Embeddings model
        const { embeddings } = await embedMany({
            model: google.textEmbeddingModel('text-embedding-004'),
            values: chunks,
        })

        console.log(`Saving ${embeddings.length} embeddings to Neon/Supabase DB...`)

        for (let i = 0; i < chunks.length; i++) {
            const content = chunks[i]
            const embeddingArray = embeddings[i]

            // We must format the js array as a Postgres vector string: "[0.1,-0.2, ...]"
            const vectorString = `[${embeddingArray.join(',')}]`

            // Prisma requires $executeRawUnsafe for custom vector insertion
            await prisma.$executeRawUnsafe(
                `INSERT INTO "DocumentEmbedding" (id, content, embedding, metadata, "updatedAt") 
                 VALUES (gen_random_uuid(), $1, $2::vector, $3::jsonb, now())`,
                content,
                vectorString,
                JSON.stringify({ source: file, chunkIndex: i })
            )
        }
    }

    console.log("Vectorization Pipeline Complete.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
