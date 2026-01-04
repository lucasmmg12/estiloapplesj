-- ARCHIVO SQL PARA EJECUTAR EN EL EDITOR SQL DE SUPABASE
-- ESTO NO ROMPE NADA EXISTENTE, SOLO AGREGA TABLAS NUEVAS

-- 1. Tabla de Mensajes Individuales (Tipo WhatsApp)
CREATE TABLE IF NOT EXISTS mensajes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_telefono TEXT NOT NULL,          -- Identificador clave del chat (número)
    contenido TEXT,                          -- Texto del mensaje
    media_url TEXT,                          -- URL si es foto/video
    es_mio BOOLEAN DEFAULT false,            -- TRUE si lo enviamos nosotros, FALSE si es del cliente
    estado TEXT DEFAULT 'enviado',           -- enviado, entregado, leido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_mensajes_telefono ON mensajes(cliente_telefono);
CREATE INDEX IF NOT EXISTS idx_mensajes_fecha ON mensajes(created_at);

-- 3. Habilitar Realtime para esta tabla (CRUCIAL PARA EL CHAT EN VIVO)
ALTER PUBLICATION supabase_realtime ADD TABLE mensajes;

-- 4. Políticas de seguridad (RLS) - Permitir todo (Ajustar según necesidad de auth)
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso público a mensajes" 
ON mensajes FOR ALL 
USING (true) 
WITH CHECK (true);

-- NOTA:
-- Esto es independiente de la tabla 'conversaciones' que usa la IA. 
-- Aquí guardaremos "copias" de los mensajes individuales para visualización rápida.
