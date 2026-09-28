-- =========================================================================
-- Migración 2026-09-28: CRM Omnicanal estilo Contact Center ADM-QUI
-- Soporte para bandejas (Sin Asignar, Mis Chats, Todos, Cerrados)
-- Ficha comercial de cliente, etiquetas, notas privadas y respuestas rápidas
-- =========================================================================

-- 1. Campos enriquecidos para la ficha CRM de contactos
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

-- 2. Trazabilidad de mensajes y notas internas privadas
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS es_nota_privada BOOLEAN DEFAULT false;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS remitente_nombre TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS media_type TEXT;

CREATE INDEX IF NOT EXISTS idx_mensajes_tel_fecha ON mensajes(cliente_telefono, created_at ASC);

-- 3. Catálogo de Respuestas Rápidas (/atajo)
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

-- 4. RPC get_last_conversations con soporte integral de CRM
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
