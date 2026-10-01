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

function isBotMessage(text) {
    if (!text) return false;
    const t = text.trim();

    if (/te (estuvo respondiendo|respondía|estuvo hablando) el bot/i.test(t)) return false;
    if (/(soy nahuel|soy cristofer|soy edu|mi nombre es agos|te escribe agos|soy agos|mi nombre es nahuel|mi nombre es cristofer|mi nombre es edu|soy lourdes|soy lorena)/i.test(t)) return false;
    if (/_event_voice_note__|_event_media__/i.test(t)) return false;
    if (/^https:\/\/mpago\.li\//i.test(t)) return false;

    // Bot phrases & signatures
    if (/Soy de \*Estilo Apple\*|Soy \*Estilo Apple\*|equipo de \*Estilo Apple\*|en \*Estilo Apple\*|Soy de Estilo Apple/i.test(t)) return true;
    if (/Patio San Ignacio, Local 7/i.test(t)) return true;
    if (/https:\/\/docs\.google\.com\/spreadsheets\/d\/1KNaD8SWCj_YBpbcs2ZgbhuBa1rxx6OqT1Kju3DkevzY/i.test(t)) return true;
    if (/escribi(me|r)? (\*?fin\*?)/i.test(t)) return true;
    if (/por el momento (solo|únicamente) estamos tomando equipos a partir del iphone 13/i.test(t)) return true;
    if (/solo tomamos equipos a partir del iphone 13/i.test(t)) return true;
    if (/necesitamos evaluar su bater[ií]a y est[eé]tica en persona/i.test(t)) return true;
    if (/¡Perfecto! Ya derivo tu consulta\. En un ratito un asesor/i.test(t)) return true;
    if (/¡Gracias por el audio! 👍 Ya lo escuch/i.test(t)) return true;
    if (/Haz enviado la siguiente imagen:/i.test(t)) return true;
    if (/Para ver el stock real y los (valores|precios) actualizados al instante/i.test(t)) return true;
    if (/¡Hola! 👋 Qué lindo que nos escribas/i.test(t)) return true;
    if (/¡Hola! 👋 Bienvenido/i.test(t)) return true;
    if (/¡Buen día! 👋 Soy de/i.test(t)) return true;
    if (/¿En qué puedo darte una mano hoy\?/i.test(t)) return true;
    if (/Antes de seguir, ¿cómo es tu nombre\?/i.test(t)) return true;
    if (/Antes que nada, ¿cómo es tu nombre\?/i.test(t)) return true;
    if (/contame tu nombre así/i.test(t)) return true;
    if (/experto(s)? en apple acá en san juan/i.test(t)) return true;
    if (t.includes('👉') && (t.includes('Apple') || t.includes('iPhone') || t.includes('local'))) return true;

    // Also look for AI tone:
    // e.g. "¡Hola! 👋 ..." with emoji at start and "🍎" or "😊"
    if (/^¡Hola! 👋/i.test(t)) return true;
    if (/^¡Genial! (🙌|😊)/i.test(t)) return true;
    if (/^¡Buen día! (👋|😊)/i.test(t)) return true;

    return false;
}

async function checkSample() {
    const { data: msgs } = await supabase
        .from('mensajes')
        .select('contenido')
        .eq('es_mio', true)
        .gte('created_at', '2026-06-01T00:00:00Z')
        .limit(100);

    msgs.slice(20, 60).forEach((m, idx) => {
        const bot = isBotMessage(m.contenido);
        console.log(`[${bot ? 'BOT ' : 'AGNT'}] ${m.contenido ? m.contenido.substring(0, 90).replace(/\n/g, ' ') : 'EMPTY'}`);
    });
}

checkSample();
