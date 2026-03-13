/**
 * Script to create all required Supabase storage buckets and verify they work.
 *
 * Usage: node scripts/init-and-test-buckets.mjs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

const REQUIRED_BUCKETS = [
    { name: 'avatars', public: true },
    { name: 'documents', public: true },
    { name: 'assets', public: true },
    { name: 'training', public: true },
    { name: 'receipts', public: true },
]

async function main() {
    console.log('\n=== Supabase Storage Bucket Init & Test ===\n')
    console.log(`URL: ${url}`)
    console.log(`Key: ${serviceKey?.substring(0, 20)}...${serviceKey?.substring(serviceKey.length - 10)}`)
    console.log('')

    // Step 1: List existing buckets
    console.log('--- Step 1: Checking existing buckets ---')
    const { data: existing, error: listErr } = await supabase.storage.listBuckets()
    if (listErr) {
        console.error(`Failed to list buckets: ${listErr.message}`)
        process.exit(1)
    }
    const existingNames = new Set(existing.map(b => b.name))
    console.log(`Found ${existing.length} existing bucket(s): ${existing.map(b => b.name).join(', ') || '(none)'}`)
    console.log('')

    // Step 2: Create missing buckets
    console.log('--- Step 2: Creating required buckets ---')
    for (const bucket of REQUIRED_BUCKETS) {
        if (existingNames.has(bucket.name)) {
            console.log(`  [EXISTS] ${bucket.name}`)
            continue
        }
        const { error } = await supabase.storage.createBucket(bucket.name, {
            public: bucket.public,
            fileSizeLimit: 10 * 1024 * 1024,
        })
        if (error) {
            console.error(`  [FAIL]   ${bucket.name} — ${error.message}`)
        } else {
            console.log(`  [CREATED] ${bucket.name}`)
        }
    }
    console.log('')

    // Step 3: Verify all buckets exist
    console.log('--- Step 3: Verifying all buckets ---')
    const { data: updated, error: verifyErr } = await supabase.storage.listBuckets()
    if (verifyErr) {
        console.error(`Failed to verify: ${verifyErr.message}`)
        process.exit(1)
    }
    const updatedNames = new Set(updated.map(b => b.name))
    let allExist = true
    for (const bucket of REQUIRED_BUCKETS) {
        const exists = updatedNames.has(bucket.name)
        console.log(`  ${exists ? '[OK]' : '[MISSING]'} ${bucket.name}`)
        if (!exists) allExist = false
    }
    console.log('')

    if (!allExist) {
        console.error('Some required buckets are missing. Cannot proceed with tests.')
        process.exit(1)
    }

    // Step 4: Test upload/download/delete for each bucket
    console.log('--- Step 4: Testing upload/download/delete ---')
    const results = []
    for (const bucket of REQUIRED_BUCKETS) {
        const testFile = `_test_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`
        const testContent = `Test content for bucket: ${bucket.name} at ${new Date().toISOString()}`
        const result = { bucket: bucket.name, upload: false, publicUrl: null, download: false, delete: false, errors: [] }

        // Upload
        const { error: upErr } = await supabase.storage
            .from(bucket.name)
            .upload(testFile, testContent, { contentType: 'text/plain', upsert: true })
        if (upErr) {
            result.errors.push(`Upload: ${upErr.message}`)
        } else {
            result.upload = true
        }

        // Get public URL
        if (result.upload) {
            const { data: urlData } = supabase.storage.from(bucket.name).getPublicUrl(testFile)
            result.publicUrl = urlData.publicUrl
        }

        // Download
        if (result.upload) {
            const { data: dlData, error: dlErr } = await supabase.storage.from(bucket.name).download(testFile)
            if (dlErr) {
                result.errors.push(`Download: ${dlErr.message}`)
            } else {
                const text = await dlData.text()
                result.download = text === testContent
                if (!result.download) {
                    result.errors.push(`Download: Content mismatch`)
                }
            }
        }

        // Delete (cleanup)
        if (result.upload) {
            const { error: delErr } = await supabase.storage.from(bucket.name).remove([testFile])
            if (delErr) {
                result.errors.push(`Delete: ${delErr.message}`)
            } else {
                result.delete = true
            }
        }

        const status = result.upload && result.download && result.delete ? 'PASS' : 'FAIL'
        console.log(`  [${status}] ${bucket.name}`)
        if (result.publicUrl) console.log(`         URL: ${result.publicUrl}`)
        if (result.errors.length) console.log(`         Errors: ${result.errors.join('; ')}`)
        results.push(result)
    }

    console.log('')

    // Summary
    const passed = results.filter(r => r.upload && r.download && r.delete).length
    const failed = results.length - passed
    console.log('=== Summary ===')
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)

    if (failed > 0) {
        console.log('\nFailed buckets:')
        for (const r of results.filter(r => !(r.upload && r.download && r.delete))) {
            console.log(`  - ${r.bucket}: ${r.errors.join('; ')}`)
        }
    }

    console.log('')

    // Step 5: Test the upload API route patterns
    console.log('--- Step 5: API Route Bucket Validation ---')
    const uploadAllowedBuckets = ['avatars', 'documents', 'assets', 'training', 'receipts']
    console.log(`  /api/upload allows: ${uploadAllowedBuckets.join(', ')}`)
    for (const b of uploadAllowedBuckets) {
        const ok = updatedNames.has(b)
        console.log(`    ${ok ? '[OK]' : '[MISSING]'} ${b}`)
    }
    console.log(`  /api/employee/documents uses: documents`)
    console.log(`    ${updatedNames.has('documents') ? '[OK]' : '[MISSING]'} documents`)
    console.log('')

    if (failed === 0) {
        console.log('All buckets created and verified successfully!')
    } else {
        process.exit(1)
    }
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
