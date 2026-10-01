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

const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

function classifyOutgoing(text) {
    if (!text) return 'agent';
    const t = text.trim();

    // 1. Definite AGENT indicators
    if (/_event_voice_note__|_event_media__/i.test(t)) return 'agent';
    if (/te (estuvo respondiendo|respondía|estuvo hablando|respondio|hablo) el bot/i.test(t)) return 'agent';
    if (/(soy nahuel|soy cristofer|soy edu|mi nombre es agos|te escribe agos|soy agos|mi nombre es nahuel|mi nombre es cristofer|mi nombre es edu|soy lourdes|soy lorena|soy nico|asesor comercial de estilo apple|tu asesor designado)/i.test(t)) return 'agent';
    if (/^https:\/\/mpago\.li\//i.test(t)) return 'agent';
    if (/transferencia|cbu|alias|pesos|dolar blue|cotizaci[oó]n|seña/i.test(t) && /cuotas|bancaria|naranja|alias:/i.test(t)) {
        // Human agents sending payment info or exact calculations
        if (!/docs\.google\.com/i.test(t)) return 'agent';
    }

    // 2. Definite BOT indicators (AI Prompts & Templates)
    if (/Soy de \*Estilo Apple\*|Soy \*Estilo Apple\*|equipo de \*Estilo Apple\*|en \*Estilo Apple\*|Soy de Estilo Apple/i.test(t)) return 'bot';
    if (/Patio San Ignacio, Local 7/i.test(t)) return 'bot';
    if (/docs\.google\.com\/spreadsheets\/d\/1KNaD8SWCj_YBpbcs2ZgbhuBa1rxx6OqT1Kju3DkevzY/i.test(t)) return 'bot';
    if (/escribi(me|r)? (\*?fin\*?)/i.test(t)) return 'bot';
    if (/por el momento (solo|únicamente) estamos tomando equipos a partir del iphone 13/i.test(t)) return 'bot';
    if (/solo tomamos equipos a partir del iphone 13/i.test(t)) return 'bot';
    if (/necesitamos evaluar su bater[ií]a y est[eé]tica en persona/i.test(t)) return 'bot';
    if (/¡Perfecto! Ya derivo tu consulta\. En un ratito un asesor/i.test(t)) return 'bot';
    if (/¡Gracias por el audio! 👍 Ya lo escuch/i.test(t)) return 'bot';
    if (/Haz enviado la siguiente imagen:/i.test(t)) return 'bot';
    if (/Para ver el stock real y los (valores|precios) actualizados al instante/i.test(t)) return 'bot';
    if (/¡Hola! 👋 Qué lindo que nos escribas/i.test(t)) return 'bot';
    if (/¡Hola! 👋 Bienvenido/i.test(t)) return 'bot';
    if (/¡Buen día! 👋 Soy de/i.test(t)) return 'bot';
    if (/¿En qué puedo darte una mano hoy\?/i.test(t)) return 'bot';
    if (/Antes de seguir, ¿cómo es tu nombre\?/i.test(t)) return 'bot';
    if (/Antes que nada, ¿cómo es tu nombre\?/i.test(t)) return 'bot';
    if (/contame tu nombre así/i.test(t)) return 'bot';
    if (/experto(s)? en apple acá en san juan/i.test(t)) return 'bot';
    if (/¡Por favor no lo prendas ni lo cargues! Traelo urgente para que le hagamos un baño químico/i.test(t)) return 'bot';
    if (/Ya mismo dejamos registrado tu aviso\. Por favor, aguardá la confirmación/i.test(t)) return 'bot';
    if (/Para ayudarte mejor, ¿me decís tu nombre\?/i.test(t)) return 'bot';
    if (/Si querés cerrar la charla, escribime/i.test(t)) return 'bot';

    // 3. AI Advisor style markers
    // Markdown headers or bullet pointers with emoji typical of the AI assistant
    if (/^### (📱|🛠️|💡|💵|📍|⏰)/m.test(t)) return 'bot';
    if (t.includes('👉') && (t.includes('Apple') || t.includes('iPhone') || t.includes('local') || t.includes('catálogo') || t.includes('garantía'))) return 'bot';
    if (/^¡(Hola|Genial|Buen día|Buenas tardes)! [👋🙌😊]/.test(t) && (t.includes('¿Cómo te llamás?') || t.includes('¿cómo es tu nombre?') || t.includes('un gusto') || t.includes('Estilo Apple'))) return 'bot';

    // 4. Default: conversational agent messages
    return 'agent';
}

async function runFullAnalysis() {
    console.log('--- INICIANDO ANÁLISIS COMPLETO ÚLTIMOS 6 MESES ---');
    const months = [
        { key: '2026-04', label: 'Abril 2026', start: '2026-04-01T00:00:00Z', end: '2026-05-01T00:00:00Z' },
        { key: '2026-05', label: 'Mayo 2026', start: '2026-05-01T00:00:00Z', end: '2026-06-01T00:00:00Z' },
        { key: '2026-06', label: 'Junio 2026', start: '2026-06-01T00:00:00Z', end: '2026-07-01T00:00:00Z' },
        { key: '2026-07', label: 'Julio 2026', start: '2026-07-01T00:00:00Z', end: '2026-08-01T00:00:00Z' },
        { key: '2026-08', label: 'Agosto 2026', start: '2026-08-01T00:00:00Z', end: '2026-09-01T00:00:00Z' },
        { key: '2026-09', label: 'Septiembre 2026', start: '2026-09-01T00:00:00Z', end: '2026-10-01T00:00:00Z' }
    ];

    const results = [];

    for (const m of months) {
        console.log(`Procesando ${m.label}...`);
        // 1. Count incoming
        const { count: incoming } = await supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', m.start)
            .lt('created_at', m.end)
            .eq('es_mio', false);

        // 2. Fetch outgoing messages in pages of 2000
        let outgoing = 0;
        let botCount = 0;
        let agentCount = 0;
        const uniqueClients = new Set();

        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('mensajes')
                .select('contenido, cliente_telefono')
                .gte('created_at', m.start)
                .lt('created_at', m.end)
                .eq('es_mio', true)
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) {
                console.error(`Error fetching page ${page} for ${m.label}:`, error);
                break;
            }

            if (!data || data.length === 0) {
                hasMore = false;
                break;
            }

            outgoing += data.length;
            for (const row of data) {
                if (row.cliente_telefono) uniqueClients.add(row.cliente_telefono);
                const type = classifyOutgoing(row.contenido);
                if (type === 'bot') botCount++;
                else agentCount++;
            }

            if (data.length < pageSize) {
                hasMore = false;
            } else {
                page++;
            }
        }

        results.push({
            mes: m.label,
            key: m.key,
            entrantes: incoming,
            salientes: outgoing,
            total: incoming + outgoing,
            salientes_bot: botCount,
            salientes_agente: agentCount,
            porc_bot: ((botCount / outgoing) * 100).toFixed(1) + '%',
            porc_agente: ((agentCount / outgoing) * 100).toFixed(1) + '%',
            clientes_unicos: uniqueClients.size
        });
        console.log(`  -> ${m.label}: Entrantes=${incoming}, Salientes=${outgoing} (Bot: ${botCount}, Agente: ${agentCount})`);
    }

    console.log('\n--- RESULTADOS FINALES ---');
    console.table(results);

    // Save JSON output for reporting
    fs.writeFileSync(path.resolve(__dirname, '../scratch/analysis_results.json'), JSON.stringify(results, null, 2));
    console.log('Resultados guardados en scratch/analysis_results.json');
}

// Ensure scratch dir exists
const scratchDir = path.resolve(__dirname, '../scratch');
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

runFullAnalysis();
