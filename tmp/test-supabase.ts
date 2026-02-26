import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing SUPABASE env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    console.log("Testing Supabase Storage...")
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
        console.error("Error listing buckets:", error)
        return
    }

    console.log("Found buckets:", buckets.map(b => b.name))

    const requiredBuckets = ["avatars", "documents", "assets", "training"]
    for (const b of requiredBuckets) {
        if (!buckets.find(bucket => bucket.name === b)) {
            console.error(`Bucket '${b}' is MISSING!`)
        } else {
            console.log(`Bucket '${b}' exists.`)
        }
    }
}

test()
