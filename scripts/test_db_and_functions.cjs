const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[key] = val;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
console.log('Testing with VITE_SUPABASE_ANON_KEY...');
const supabase = createClient(supabaseUrl, anonKey);

async function checkDatabase() {
    console.log('\n--- 1. VERIFICANDO TABLAS DE LA BASE DE DATOS ---');
    const tables = [
        'clientes',
        'mensajes',
        'productos',
        'transactions',
        'cotizacion_dolar',
        'reservas',
        'mensajes_automaticos',
        'mensajes_programados',
        'bot_config',
        'inventory_movements',
        'transaction_categories'
    ];

    const results = {};
    for (const table of tables) {
        try {
            const { data, count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                results[table] = { status: 'ERROR', message: error.message, code: error.code };
            } else {
                results[table] = { status: 'OK', count: count };
            }
        } catch (e) {
            results[table] = { status: 'EXCEPTION', message: e.message };
        }
    }

    console.table(results);

    console.log('\n--- 2. VERIFICANDO EDGE FUNCTIONS ---');
    // Test invoking analizar-historial
    try {
        console.log('Invocando edge function "analizar-historial"...');
        const { data, error } = await supabase.functions.invoke('analizar-historial', {
            body: { chatLog: 'Cliente: Hola, quiero comprar un iPhone 15 Pro de 128GB\nVendedor: Hola! Si, tenemos stock.' }
        });
        if (error) {
            console.log('❌ Error al invocar analizar-historial:', error.message || error);
        } else {
            console.log('✅ Edge function "analizar-historial" respondió correctamente:');
            console.log(data);
        }
    } catch (e) {
        console.log('❌ Excepción al invocar analizar-historial:', e.message);
    }

    // Test invoking actualizar-dolar
    try {
        console.log('\nInvocando edge function "actualizar-dolar"...');
        const { data, error } = await supabase.functions.invoke('actualizar-dolar');
        if (error) {
            console.log('ℹ️ actualizar-dolar status/error:', error.message || error);
        } else {
            console.log('✅ actualizar-dolar respondió:', data);
        }
    } catch (e) {
        console.log('❌ Excepción al invocar actualizar-dolar:', e.message);
    }
}

checkDatabase().catch(console.error);
