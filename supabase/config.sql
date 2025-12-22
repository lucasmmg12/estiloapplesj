-- ============================================
-- SISTEMA DE GESTIÓN BUILDERBOT
-- Script de configuración de base de datos
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telefono TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    plataforma TEXT NOT NULL CHECK (plataforma IN ('whatsapp', 'instagram')),
    intencion TEXT,
    ultima_interaccion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_plataforma ON clientes(plataforma);
CREATE INDEX idx_clientes_intencion ON clientes(intencion);
CREATE INDEX idx_clientes_ultima_interaccion ON clientes(ultima_interaccion);

-- ============================================
-- TABLA: conversaciones
-- ============================================
CREATE TABLE IF NOT EXISTS conversaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    historial_completo JSONB NOT NULL,
    resumen_breve TEXT NOT NULL,
    resumen_detallado TEXT NOT NULL,
    bullets JSONB NOT NULL,
    intencion_detectada TEXT NOT NULL,
    crm_stage TEXT DEFAULT 'consulta', -- 'consulta', 'asesoramiento', 'cierre', 'venta', 'canje'
    vendedor_asignado INTEGER, -- ID del vendedor (1-4)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_conversaciones_cliente_id ON conversaciones(cliente_id);
CREATE INDEX idx_conversaciones_intencion ON conversaciones(intencion_detectada);
CREATE INDEX idx_conversaciones_created_at ON conversaciones(created_at DESC);

-- ============================================
-- TABLA: mensajes_automaticos
-- ============================================
CREATE TABLE IF NOT EXISTS mensajes_automaticos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intencion TEXT NOT NULL,
    dias_espera INTEGER NOT NULL DEFAULT 10,
    mensaje TEXT NOT NULL,
    media_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_mensajes_automaticos_intencion ON mensajes_automaticos(intencion);
CREATE INDEX idx_mensajes_automaticos_activo ON mensajes_automaticos(activo);

-- ============================================
-- TABLA: embudo_ventas
-- ============================================
CREATE TABLE IF NOT EXISTS embudo_ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    etapa TEXT NOT NULL,
    mensaje_enviado BOOLEAN DEFAULT false,
    fecha_proximo_mensaje TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_embudo_cliente_id ON embudo_ventas(cliente_id);
CREATE INDEX idx_embudo_mensaje_enviado ON embudo_ventas(mensaje_enviado);
CREATE INDEX idx_embudo_fecha_proximo ON embudo_ventas(fecha_proximo_mensaje);

-- ============================================
-- TRIGGER: Actualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_embudo_ventas_updated_at
    BEFORE UPDATE ON embudo_ventas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES: Mensajes automáticos
-- ============================================
INSERT INTO mensajes_automaticos (intencion, dias_espera, mensaje, activo) VALUES
('Averiguar', 10, '¡Hola! 👋 Vimos que estuviste consultando sobre nuestros productos. Tenemos una promoción especial solo por hoy. ¿Te gustaría conocer más detalles?', true),
('Comprar', 7, '¡Hola! 🎉 Notamos que estuviste interesado en comprar. Tenemos ofertas exclusivas que podrían interesarte. ¿Hablamos?', true),
('Consulta', 5, 'Hola, ¿pudimos resolver todas tus dudas? Estamos aquí para ayudarte con cualquier otra consulta que tengas. 😊', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================
-- Nota: Ajusta estas políticas según tus necesidades de seguridad

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_automaticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE embudo_ventas ENABLE ROW LEVEL SECURITY;

-- Política para permitir todo desde service_role (Edge Functions)
CREATE POLICY "Service role can do everything on clientes" ON clientes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on conversaciones" ON conversaciones
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on mensajes_automaticos" ON mensajes_automaticos
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on embudo_ventas" ON embudo_ventas
    FOR ALL USING (auth.role() = 'service_role');

-- Política para permitir lectura desde anon (frontend)
CREATE POLICY "Anon can read clientes" ON clientes
    FOR SELECT USING (true);

CREATE POLICY "Anon can read conversaciones" ON conversaciones
    FOR SELECT USING (true);

CREATE POLICY "Anon can read mensajes_automaticos" ON mensajes_automaticos
    FOR SELECT USING (true);

CREATE POLICY "Anon can read embudo_ventas" ON embudo_ventas
    FOR SELECT USING (true);

CREATE POLICY "Anon can insert embudo_ventas" ON embudo_ventas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update embudo_ventas" ON embudo_ventas
    FOR UPDATE USING (true);

CREATE POLICY "Anon can delete embudo_ventas" ON embudo_ventas
    FOR DELETE USING (true);

-- Política para permitir escritura en mensajes_automaticos desde anon
CREATE POLICY "Anon can insert mensajes_automaticos" ON mensajes_automaticos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update mensajes_automaticos" ON mensajes_automaticos
    FOR UPDATE USING (true);

CREATE POLICY "Anon can delete mensajes_automaticos" ON mensajes_automaticos
    FOR DELETE USING (true);

-- ============================================
-- TABLA: productos (Catálogo de iPhones)
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modelo VARCHAR(100) NOT NULL,
    colores TEXT,
    almacenamiento VARCHAR(50),
    bateria VARCHAR(20),
    precio_usd DECIMAL(10,2) NOT NULL,
    precio_ars DECIMAL(12,2),
    cuotas_3 DECIMAL(12,2),
    cuotas_6 DECIMAL(12,2),
    cuotas_12 DECIMAL(12,2),
    stock INTEGER DEFAULT 1,
    activo BOOLEAN DEFAULT true,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_productos_modelo ON productos(modelo);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_precio_usd ON productos(precio_usd);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: importaciones_catalogo (Historial)
-- ============================================
CREATE TABLE IF NOT EXISTS importaciones_catalogo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archivo_nombre VARCHAR(255) NOT NULL,
    productos_importados INTEGER DEFAULT 0,
    productos_actualizados INTEGER DEFAULT 0,
    productos_nuevos INTEGER DEFAULT 0,
    cotizacion_dolar DECIMAL(10,2),
    estado VARCHAR(50) DEFAULT 'completado',
    errores JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_importaciones_created_at ON importaciones_catalogo(created_at DESC);

-- ============================================
-- POLÍTICAS RLS para productos
-- ============================================
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE importaciones_catalogo ENABLE ROW LEVEL SECURITY;

-- Service role puede hacer todo
CREATE POLICY "Service role can do everything on productos" ON productos
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on importaciones_catalogo" ON importaciones_catalogo
    FOR ALL USING (auth.role() = 'service_role');

-- Anon puede leer productos activos
CREATE POLICY "Anon can read active productos" ON productos
    FOR SELECT USING (activo = true);

-- Anon puede leer historial de importaciones
CREATE POLICY "Anon can read importaciones_catalogo" ON importaciones_catalogo
    FOR SELECT USING (true);

-- RLS para productos
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- Service role tiene acceso total
CREATE POLICY "Service role can do everything on productos" ON productos
    FOR ALL USING (auth.role() = 'service_role');

-- Anon puede leer productos (NECESARIO PARA CATÁLOGO PÚBLICO)
CREATE POLICY "Anon can read productos" ON productos
    FOR SELECT USING (true);

-- Anon puede insertar/actualizar/eliminar productos (para el dashboard)
CREATE POLICY "Anon can insert productos" ON productos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update productos" ON productos
    FOR UPDATE USING (true);

CREATE POLICY "Anon can delete productos" ON productos
    FOR DELETE USING (true);

-- ============================================
-- TABLA: COTIZACIÓN DEL DÓLAR
-- ============================================

CREATE TABLE IF NOT EXISTS cotizacion_dolar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    valor DECIMAL(10, 2) NOT NULL,
    fuente TEXT DEFAULT 'manual',
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para obtener la cotización más reciente rápidamente
CREATE INDEX idx_cotizacion_dolar_created_at ON cotizacion_dolar(created_at DESC);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_cotizacion_dolar_updated_at
    BEFORE UPDATE ON cotizacion_dolar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS para cotizacion_dolar
ALTER TABLE cotizacion_dolar ENABLE ROW LEVEL SECURITY;

-- Service role tiene acceso total
CREATE POLICY "Service role can do everything on cotizacion_dolar" ON cotizacion_dolar
    FOR ALL USING (auth.role() = 'service_role');

-- Anon puede leer la cotización (NECESARIO PARA CATÁLOGO PÚBLICO)
CREATE POLICY "Anon can read cotizacion_dolar" ON cotizacion_dolar
    FOR SELECT USING (true);

-- Anon puede insertar/actualizar cotización (para el dashboard)
CREATE POLICY "Anon can insert cotizacion_dolar" ON cotizacion_dolar
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update cotizacion_dolar" ON cotizacion_dolar
    FOR UPDATE USING (true);

-- Insertar valor inicial del dólar
INSERT INTO cotizacion_dolar (valor, fuente, notas) 
VALUES (1485.00, 'manual', 'Valor inicial del sistema')
ON CONFLICT DO NOTHING;

