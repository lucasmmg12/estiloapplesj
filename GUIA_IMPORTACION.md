# 🚀 GUÍA DE IMPLEMENTACIÓN DEL CATÁLOGO

## ✅ Paso 1: Crear las Tablas en Supabase

Antes de importar el catálogo, necesitas ejecutar el SQL para crear las tablas.

### Opción A: Desde Supabase Dashboard (Recomendado)

1. Ve a https://supabase.com/dashboard/project/gyonguqndcsmudqmptfb
2. Click en "SQL Editor" en el menú lateral
3. Click en "New Query"
4. Copia y pega SOLO la sección de productos del archivo `supabase/config.sql`:

```sql
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

-- Anon puede insertar/actualizar/eliminar productos (para el dashboard)
CREATE POLICY "Anon can insert productos" ON productos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update productos" ON productos
    FOR UPDATE USING (true);

CREATE POLICY "Anon can delete productos" ON productos
    FOR DELETE USING (true);
```

5. Click en "Run" (o presiona Ctrl+Enter)
6. Verifica que aparezca "Success. No rows returned"

### Opción B: Desde CLI de Supabase

```bash
supabase db push
```

---

## ✅ Paso 2: Ejecutar la Importación

Una vez creadas las tablas, ejecuta el script de importación:

```bash
python importar_catalogo.py
```

### Qué hace el script:

1. ✅ Lee el archivo `Catálogo.xlsx`
2. ✅ Extrae la cotización del dólar (celda B5)
3. ✅ Lee todos los productos desde la fila 8
4. ✅ Parsea el almacenamiento y batería (ej: "64 GB / 100%")
5. ✅ Calcula precios en pesos y cuotas
6. ✅ Marca productos existentes como inactivos
7. ✅ Inserta los nuevos productos en Supabase
8. ✅ Registra el historial de importación

### Salida Esperada:

```
================================================================================
IMPORTACIÓN DE CATÁLOGO
================================================================================

📡 Conectando a Supabase...
✅ Conectado a Supabase

📂 Cargando archivo: Catálogo.xlsx
✅ Archivo cargado: 1022 filas, 23 columnas

💵 Cotización del dólar: $1485.0

📦 Procesando productos desde fila 8...
   Procesados: 100 productos...
   Procesados: 200 productos...
   ...

✅ Productos procesados: 850
⚠️  Productos saltados: 172

💾 Insertando 850 productos en Supabase...
   Insertados: 100/850
   Insertados: 200/850
   ...
   Insertados: 850/850

✅ Importación completada exitosamente!
   - 850 productos importados
   - Cotización del dólar: $1485.0

================================================================================
IMPORTACIÓN FINALIZADA
================================================================================
```

---

## ✅ Paso 3: Verificar en Supabase

1. Ve al Dashboard de Supabase
2. Click en "Table Editor"
3. Selecciona la tabla "productos"
4. Deberías ver todos los productos importados

---

## 🔄 Actualizar el Catálogo

Para actualizar el catálogo cuando cambien los precios o productos:

1. Actualiza el archivo `Catálogo.xlsx`
2. Ejecuta nuevamente: `python importar_catalogo.py`
3. El script automáticamente:
   - Marca los productos viejos como inactivos
   - Importa los nuevos productos
   - Registra el historial

---

## 📊 Próximos Pasos

Ahora que tienes los productos en Supabase, el siguiente paso es:

1. ✅ Crear una sección en el dashboard para ver productos
2. ✅ Agregar búsqueda y filtros
3. ✅ Permitir edición manual de productos
4. ✅ Integrar con el sistema de conversaciones (para recomendar productos)

---

## 🐛 Solución de Problemas

### Error: "No module named 'openpyxl'"
```bash
pip install -r requirements.txt
```

### Error: "Archivo no encontrado"
Asegúrate de que `Catálogo.xlsx` esté en la misma carpeta que el script.

### Error de conexión a Supabase
Verifica que las credenciales en `.env` sean correctas.

### Productos no aparecen
Verifica que las políticas RLS estén configuradas correctamente en Supabase.
