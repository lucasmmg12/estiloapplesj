-- Agregar columnas adicionales a la tabla contactos
ALTER TABLE contactos 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS modelo_dispositivo TEXT,
ADD COLUMN IF NOT EXISTS interes TEXT,
ADD COLUMN IF NOT EXISTS notas TEXT,
ADD COLUMN IF NOT EXISTS vendedor_asignado TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
