const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[trimmed.substring(0, idx).trim()] = val;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Get sample message structure
    const { data: sample, error: sErr } = await supabase
        .from('mensajes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (sErr) {
        console.error('Error fetching sample:', sErr);
        return;
    }
    console.log('Sample record keys:', Object.keys(sample[0] || {}));
    console.log('Sample records:\n', JSON.stringify(sample, null, 2));

    // Check count of messages total
    const { count: total } = await supabase.from('mensajes').select('*', { count: 'exact', head: true });
    console.log('Total messages in table:', total);

    // Check oldest and newest created_at
    const { data: oldest } = await supabase.from('mensajes').select('created_at').order('created_at', { ascending: true }).limit(1);
    const { data: newest } = await supabase.from('mensajes').select('created_at').order('created_at', { ascending: false }).limit(1);
    console.log('Oldest message:', oldest);
    console.log('Newest message:', newest);
}

run();
