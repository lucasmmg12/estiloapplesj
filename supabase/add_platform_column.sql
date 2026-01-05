-- 1. Agregar columna plataforma a la tabla de contactos
ALTER TABLE contactos 
ADD COLUMN IF NOT EXISTS plataforma TEXT DEFAULT 'whatsapp';

-- 2. Agregar columna plataforma a la tabla de mensajes
ALTER TABLE mensajes 
ADD COLUMN IF NOT EXISTS plataforma TEXT DEFAULT 'whatsapp';

-- Actualizar registros existentes por si acaso
UPDATE contactos SET plataforma = 'whatsapp' WHERE plataforma IS NULL;
UPDATE mensajes SET plataforma = 'whatsapp' WHERE plataforma IS NULL;
