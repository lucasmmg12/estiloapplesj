-- SCRIPT PARA AGREGAR LA COLUMNA DE IMAGEN A LA TABLA PRODUCTOS
-- Copia y pega esto en el SQL Editor de Supabase y ejecútalo

ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Script para configurar el storage (por si no lo hiciste antes)
-- 1. Crear el bucket 'productos'
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Políticas de Seguridad (RLS) para el bucket 'productos'
DO $$ 
BEGIN
    -- Política de lectura
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso Público de Lectura') THEN
        CREATE POLICY "Acceso Público de Lectura" ON storage.objects FOR SELECT USING ( bucket_id = 'productos' );
    END IF;

    -- Política de inserción
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir Carga de Imágenes') THEN
        CREATE POLICY "Permitir Carga de Imágenes" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'productos' );
    END IF;

    -- Política de actualización
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir Actualización de Imágenes') THEN
        CREATE POLICY "Permitir Actualización de Imágenes" ON storage.objects FOR UPDATE USING ( bucket_id = 'productos' );
    END IF;

    -- Política de eliminación
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir Eliminación de Imágenes') THEN
        CREATE POLICY "Permitir Eliminación de Imágenes" ON storage.objects FOR DELETE USING ( bucket_id = 'productos' );
    END IF;
END $$;
