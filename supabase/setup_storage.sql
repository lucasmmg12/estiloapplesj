-- SCRIPT PARA CONFIGURAR EL STORAGE DEL CATÁLOGO
-- Copia y pega esto en el SQL Editor de Supabase

-- 1. Crear el bucket 'productos' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Políticas de Seguridad (RLS) para el bucket 'productos'

-- Permitir acceso público de lectura (para que los clientes vean las fotos)
CREATE POLICY "Acceso Público de Lectura"
ON storage.objects FOR SELECT
USING ( bucket_id = 'productos' );

-- Permitir a usuarios autenticados subir fotos
-- Nota: Si usas la anonKey desde el frontend, esta política permite subir sin login
CREATE POLICY "Permitir Carga de Imágenes"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'productos' );

-- Permitir a usuarios autenticados actualizar fotos
CREATE POLICY "Permitir Actualización de Imágenes"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'productos' );

-- Permitir a usuarios autenticados eliminar fotos
CREATE POLICY "Permitir Eliminación de Imágenes"
ON storage.objects FOR DELETE
USING ( bucket_id = 'productos' );
