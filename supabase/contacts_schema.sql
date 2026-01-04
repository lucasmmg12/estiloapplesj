-- TABLA DE CONTACTOS (Para guardar nombres y favoritos)
CREATE TABLE IF NOT EXISTS contactos (
    telefono TEXT PRIMARY KEY,
    nombre TEXT,
    es_favorito BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (Opcional, pero recomendado)
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;

-- Política de acceso total (para simplificar en este demo)
CREATE POLICY "Acceso total a contactos"
ON contactos
FOR ALL 
USING (true) 
WITH CHECK (true);
