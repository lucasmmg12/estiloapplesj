-- Tabla para guardar la configuración del bot
CREATE TABLE IF NOT EXISTS bot_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL, -- 'whatsapp' o 'instagram'
    status TEXT NOT NULL DEFAULT 'active', -- 'active' o 'paused'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT, -- Usuario que hizo el cambio (opcional)
    UNIQUE(platform)
);

-- Insertar configuración inicial para ambas plataformas
INSERT INTO bot_config (platform, status) 
VALUES 
    ('whatsapp', 'active'),
    ('instagram', 'active')
ON CONFLICT (platform) DO NOTHING;

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_bot_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
DROP TRIGGER IF EXISTS update_bot_config_timestamp_trigger ON bot_config;
CREATE TRIGGER update_bot_config_timestamp_trigger
    BEFORE UPDATE ON bot_config
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_config_timestamp();

-- Habilitar RLS (Row Level Security)
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a todos
CREATE POLICY "Allow read access to bot_config" ON bot_config
    FOR SELECT
    USING (true);

-- Política para permitir actualización a todos (puedes restringir esto después)
CREATE POLICY "Allow update access to bot_config" ON bot_config
    FOR UPDATE
    USING (true);
