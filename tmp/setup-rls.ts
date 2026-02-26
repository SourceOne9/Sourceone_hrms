import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
const client = new Client({ connectionString })

async function setup() {
    try {
        await client.connect()
        console.log('Connected to DB.')

        // Check if buckets exist
        const { rows: buckets } = await client.query('SELECT id, name, public FROM storage.buckets')
        console.log('Current buckets in DB:', buckets)

        const requiredBuckets = ['avatars', 'documents', 'assets', 'training']

        for (const b of requiredBuckets) {
            await client.query(`
                INSERT INTO storage.buckets (id, name, public) 
                VALUES ($1, $1, true) 
                ON CONFLICT (id) DO UPDATE SET public = true;
            `, [b])
        }

        console.log('Buckets ensured. Setting up RLS policies...')

        // Enable RLS on storage.objects if not already enabled
        await client.query('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;')

        // Policy for authenticated uploads
        // We allow authenticated users to upload to any bucket for now to fix the blocker
        // In a real prod environment, we'd scope this better.

        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads'
                ) THEN
                    CREATE POLICY "Allow authenticated uploads" ON storage.objects
                    FOR INSERT TO authenticated
                    WITH CHECK (bucket_id IN ('avatars', 'documents', 'assets', 'training'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public viewing'
                ) THEN
                    CREATE POLICY "Allow public viewing" ON storage.objects
                    FOR SELECT TO public
                    USING (bucket_id IN ('avatars', 'documents', 'assets', 'training'));
                END IF;
            END $$;
        `)

        console.log('RLS policies ensured.')

    } catch (err: any) {
        console.error('Error:', err.message)
    } finally {
        await client.end()
    }
}

setup()
