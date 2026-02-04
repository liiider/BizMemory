
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parsing
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Verifying Supabase Setup...');

    // 1. Check Tables (contacts)
    const { error: dbError } = await supabase.from('contacts').select('count', { count: 'exact', head: true });

    if (dbError) {
        if (dbError.code === '42P01') { // undefined_table
            console.error('❌ Table "contacts" NOT FOUND. Please run the SQL schema.');
        } else {
            console.error('❌ Database Error:', dbError.message);
        }
    } else {
        console.log('✅ Database Table "contacts" exists.');
    }

    // 2. Check Storage (biz_images)
    const { data: bucket, error: storageError } = await supabase.storage.getBucket('biz_images');

    if (storageError) {
        console.error('❌ Storage Error:', storageError.message);
        if (storageError.message.includes('not found')) {
            console.error('   -> Please create a PUBLIC bucket named "biz_images".');
        }
    } else if (bucket) {
        console.log('✅ Storage Bucket "biz_images" exists.');
        if (!bucket.public) {
            console.warn('⚠️  Bucket "biz_images" exists but is NOT PUBLIC. Images might not load.');
        } else {
            console.log('✅ Storage Bucket is PUBLIC.');
        }
    } else {
        console.error('❌ Storage Bucket "biz_images" NOT FOUND.');
    }
}

check();
