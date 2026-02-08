-- 1. Agregar columna de estado a productos
-- Por defecto 'disponible'.
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS estado text DEFAULT 'disponible';

-- Asegurar restricción de valores para integridad
ALTER TABLE productos 
ADD CONSTRAINT check_estado_producto 
CHECK (estado IN ('disponible', 'reservado', 'vendido'));

-- 2. Crear tabla de Reservas/Señas
CREATE TABLE IF NOT EXISTS reservas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    
    producto_id uuid REFERENCES productos(id) ON DELETE CASCADE,
    cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
    vendedor_id integer, -- ID numérico de vendedores locales (1: Nahuel, 2: Cristofer)
    
    monto_sena numeric NOT NULL, -- Cuánto dejó hoy
    saldo_restante numeric NOT NULL, -- Cuánto debe
    moneda text DEFAULT 'ARS', -- ARS o USD
    
    estado text DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'cancelada')),
    
    fecha_limite timestamptz, -- Opcional: hasta cuándo se reserva
    observaciones text
);

-- Políticas RLS (Row Level Security) - Permitir todo por ahora para simplicidad en desarrollo
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo en reservas" ON reservas
    FOR ALL USING (true) WITH CHECK (true);
