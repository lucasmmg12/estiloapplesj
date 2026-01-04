-- SOLUCIÓN DE PERMISOS DE LECTURA (RLS)
-- Ejecuta esto en el Editor SQL de Supabase para asegurarnos de que el chat puede LEER los mensajes.

-- 1. Desactivar RLS temporalmente para verificar si es un problema de permisos.
-- (Esto permite que cualquiera con la API Key pública lea/escriba en esta tabla, ideal para pruebas)
ALTER TABLE mensajes DISABLE ROW LEVEL SECURITY;

-- 2. Opcional: Si prefieres mantener seguridad, descomenta estas líneas y ejecuta:
/*
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total a mensajes" ON mensajes;

CREATE POLICY "Acceso total a mensajes"
ON mensajes
FOR ALL 
USING (true) 
WITH CHECK (true);
*/

-- 3. Verificar si hay mensajes guardados
SELECT count(*) as total_mensajes FROM mensajes;
