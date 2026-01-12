-- ============================================
-- ACTUALIZACIÓN: Agregar campo de sucursal
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'branch') THEN
        ALTER TABLE transactions ADD COLUMN branch TEXT;
    END IF;
END $$;

-- Comentario: El campo 'branch' almacenará el local (Estilo 1, Estilo 2).
-- Para registros de 2026 en adelante, se puede dejar nulo o un valor por defecto si solo hay una sucursal.
