const fs = require('fs');

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
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

const token = env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gyonguqndcsmudqmptfb';

async function runSql(query) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    return { status: res.status, data };
}

const migrationSql = `
-- 1. Agregar columnas a tabla contactos si no existen
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'abierto';
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS etiquetas TEXT[] DEFAULT '{}';
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS dispositivo_interes TEXT;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS dispositivo_canje TEXT;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS cotizacion_estimada NUMERIC;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS motivo_cierre TEXT;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS cerrado_at TIMESTAMPTZ;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS cerrado_por TEXT;

CREATE INDEX IF NOT EXISTS idx_contactos_estado ON contactos(estado);
CREATE INDEX IF NOT EXISTS idx_contactos_vendedor ON contactos(vendedor_asignado);

-- 2. Agregar columnas a tabla mensajes
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS es_nota_privada BOOLEAN DEFAULT false;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS remitente_nombre TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS media_type TEXT;

CREATE INDEX IF NOT EXISTS idx_mensajes_tel_fecha ON mensajes(cliente_telefono, created_at ASC);

-- 3. Crear tabla crm_quick_replies
CREATE TABLE IF NOT EXISTS crm_quick_replies (
    id TEXT PRIMARY KEY,
    shortcut TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'ventas',
    seller_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crm_quick_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo crm_quick_replies" ON crm_quick_replies;
CREATE POLICY "Permitir todo crm_quick_replies" ON crm_quick_replies FOR ALL USING (true) WITH CHECK (true);

-- 4. Insertar respuestas rápidas comerciales oficiales de Estilo Apple SJ
INSERT INTO crm_quick_replies (id, shortcut, title, content, category)
VALUES
    ('saludo', 'saludo', 'Saludo inicial vendedor', '¡Hola! 👋 Te saluda {vendedor} de Estilo Apple SJ. ¿En qué podemos ayudarte hoy?', 'saludo'),
    ('ubicacion', 'ubicacion', 'Ubicación y horarios local', '📍 Estamos en Patio San Ignacio (Local 7), San Juan. Nuestro horario de atención es de Lunes a Sábados de 9:30 a 13:30 hs y de 17:30 a 21:30 hs. ¡Te esperamos para ver los equipos en persona!', 'ubicacion'),
    ('canje', 'canje', 'Requisitos Plan Canje', '📲 *Plan Canje Estilo Apple SJ*: Tomamos tu iPhone usado como parte de pago. Para darte la cotización exacta, contanos:\n1) Modelo y capacidad (GB)\n2) % de batería y si tiene reparaciones\n3) Estado estético (marcas o detalles)\n¿Qué modelo querés entregar y por cuál te gustaría cambiar?', 'canje'),
    ('garantia', 'garantia', 'Garantía escrita y respaldo', '🛡️ *Garantía y Seguridad*: Todos los equipos nuevos cuentan con garantía oficial Apple por 1 año. Nuestros usados seleccionados cuentan con **120 días de garantía escrita** de nuestro local con respaldo técnico propio en San Juan.', 'ventas'),
    ('pagos', 'pagos', 'Medios de pago aceptados', '💵 *Formas de Pago*:\n• Dólares en efectivo (billetes de $100 azul impecables)\n• Transferencia en pesos (al blue del momento)\n• USDT por Binance Pay sin recargo\n• Tarjetas de crédito bancarias o Tarjeta Naranja hasta en 12 pagos.', 'pagos'),
    ('catalogo', 'catalogo', 'Enlace al catálogo en vivo', '📱 Podés ver los modelos disponibles, colores y precios actualizados en nuestra tienda: https://estiloapplesj.com/#catalogo', 'ventas'),
    ('bateria', 'bateria', 'Cambio de batería laboratorio', '🔋 *Servicio Técnico*: Realizamos cambio de batería con celdas certificadas y sellos herméticos. El equipo queda al 100% de condición de salud. Tiempo de laboratorio: 24 a 48 hs con garantía escrita.', 'tecnico'),
    ('transferencia_nahuel', 'nahuel', 'Pase con Nahuel', 'Te comunico de inmediato con Nahuel para que coordine la seña o el retiro de tu equipo. ¡Aguardá un instante por favor!', 'saludo'),
    ('transferencia_cristofer', 'cristofer', 'Pase con Cristofer', 'Te derivo con Cristofer para verificar los números de tu Plan Canje en el acto. ¡Aguardá un momento!', 'saludo')
ON CONFLICT (shortcut) DO UPDATE 
SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category;

-- 5. Actualizar RPC get_last_conversations con los nuevos campos de CRM
DROP FUNCTION IF EXISTS get_last_conversations(integer);

CREATE OR REPLACE FUNCTION get_last_conversations(limit_count integer DEFAULT 100)
RETURNS TABLE(
    phone text,
    last_message text,
    last_message_time timestamptz,
    last_message_is_mine boolean,
    unread_count bigint,
    contact_name text,
    contact_avatar text,
    contact_seller text,
    is_favorite boolean,
    bot_paused_at timestamptz,
    platform text,
    contact_status text,
    contact_tags text[],
    contact_email text,
    contact_device text,
    contact_tradein text,
    contact_budget numeric,
    contact_notes text
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH ranked_messages AS (
        SELECT 
            m.cliente_telefono,
            m.contenido,
            m.created_at,
            m.es_mio,
            ROW_NUMBER() OVER (PARTITION BY m.cliente_telefono ORDER BY m.created_at DESC) as rn
        FROM mensajes m
    ),
    unread_counts AS (
        SELECT 
            m.cliente_telefono,
            COUNT(*) as count
        FROM mensajes m
        WHERE (m.estado != 'leido' OR m.estado IS NULL) AND m.es_mio = false
        GROUP BY m.cliente_telefono
    )
    SELECT 
        rm.cliente_telefono::text as phone,
        rm.contenido::text as last_message,
        rm.created_at as last_message_time,
        rm.es_mio as last_message_is_mine,
        COALESCE(uc.count, 0::bigint) as unread_count,
        c.nombre::text as contact_name,
        c.avatar_url::text as contact_avatar,
        c.vendedor_asignado::text as contact_seller,
        COALESCE(c.es_favorito, false) as is_favorite,
        c.bot_paused_at as bot_paused_at,
        COALESCE(c.plataforma, 'whatsapp')::text as platform,
        COALESCE(c.estado, 'abierto')::text as contact_status,
        COALESCE(c.etiquetas, '{}'::text[]) as contact_tags,
        c.email::text as contact_email,
        c.modelo_dispositivo::text as contact_device,
        c.dispositivo_canje::text as contact_tradein,
        c.cotizacion_estimada as contact_budget,
        c.notas::text as contact_notes
    FROM ranked_messages rm
    LEFT JOIN contactos c ON rm.cliente_telefono = c.telefono
    LEFT JOIN unread_counts uc ON rm.cliente_telefono = uc.cliente_telefono
    WHERE rm.rn = 1
    ORDER BY rm.created_at DESC
    LIMIT limit_count;
END;
$$;
`;

async function main() {
    console.log('🚀 Ejecutando migración CRM en Supabase...');
    const result = await runSql(migrationSql);
    console.log('Resultado de la migración:', result);
    if (result.status === 201 || result.status === 200) {
        console.log('✅ Migración SQL ejecutada con ÉXITO.');
    } else {
        console.error('❌ Error en migración:', result);
    }
}

main();
