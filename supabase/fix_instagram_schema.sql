-- ACTUALIZACIÓN DE SEGURIDAD Y CONSISTENCIA PARA INSTAGRAM
-- 1. Asegurar columnas en tabla 'clientes' (Usada por Webhook IA/ERP)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'bot_paused_at') THEN
        ALTER TABLE clientes ADD COLUMN bot_paused_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'vendedor_asignado') THEN
        ALTER TABLE clientes ADD COLUMN vendedor_asignado TEXT;
    END IF;
END $$;

-- 2. Asegurar columnas en tabla 'contactos' (Usada por Live Chat)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contactos' AND column_name = 'bot_paused_at') THEN
        ALTER TABLE contactos ADD COLUMN bot_paused_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contactos' AND column_name = 'plataforma') THEN
        ALTER TABLE contactos ADD COLUMN plataforma TEXT DEFAULT 'whatsapp';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contactos' AND column_name = 'vendedor_asignado') THEN
        ALTER TABLE contactos ADD COLUMN vendedor_asignado TEXT;
    END IF;
END $$;

-- 3. Asegurar columna plataforma en 'mensajes'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mensajes' AND column_name = 'plataforma') THEN
        ALTER TABLE mensajes ADD COLUMN plataforma TEXT DEFAULT 'whatsapp';
    END IF;
END $$;
