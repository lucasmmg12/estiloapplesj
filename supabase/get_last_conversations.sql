-- Función RPC para obtener las últimas conversaciones de forma eficiente
-- Esto evita cargar todos los mensajes en el frontend
CREATE OR REPLACE FUNCTION get_last_conversations(limit_count INT DEFAULT 10000)
RETURNS TABLE (
    phone TEXT,
    last_message TEXT,
    last_message_time TIMESTAMPTZ,
    last_message_is_mine BOOLEAN,
    unread_count BIGINT,
    contact_name TEXT,
    contact_avatar TEXT,
    contact_seller TEXT,
    is_favorite BOOLEAN,
    bot_paused_at TIMESTAMPTZ,
    platform TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
            cliente_telefono,
            COUNT(*) as count
        FROM mensajes
        WHERE (estado != 'leido' OR estado IS NULL) AND es_mio = false
        GROUP BY cliente_telefono
    )
    SELECT 
        rm.cliente_telefono as phone,
        rm.contenido as last_message,
        rm.created_at as last_message_time,
        rm.es_mio as last_message_is_mine,
        COALESCE(uc.count, 0) as unread_count,
        c.nombre as contact_name,
        c.avatar_url as contact_avatar,
        c.vendedor_asignado as contact_seller,
        COALESCE(c.es_favorito, false) as is_favorite,
        c.bot_paused_at,
        c.plataforma
    FROM ranked_messages rm
    LEFT JOIN contactos c ON rm.cliente_telefono = c.telefono
    LEFT JOIN unread_counts uc ON rm.cliente_telefono = uc.cliente_telefono
    WHERE rm.rn = 1
    ORDER BY rm.created_at DESC
    LIMIT limit_count;
END;
$$;
