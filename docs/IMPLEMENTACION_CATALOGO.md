# 📦 SISTEMA DE IMPORTACIÓN DE CATÁLOGO - IMPLEMENTADO

## ✅ LO QUE SE HA CREADO

### 1. **Base de Datos (Supabase)**

#### Tabla: `productos`
```sql
- id (UUID)
- modelo (VARCHAR) - Nombre del iPhone
- colores (TEXT) - Colores disponibles
- almacenamiento (VARCHAR) - Ej: "64 GB"
- bateria (VARCHAR) - Ej: "100%"
- precio_usd (DECIMAL) - Precio en dólares
- precio_ars (DECIMAL) - Precio en pesos
- cuotas_3 (DECIMAL) - Precio en 3 cuotas
- cuotas_6 (DECIMAL) - Precio en 6 cuotas
- cuotas_12 (DECIMAL) - Precio en 12 cuotas
- stock (INTEGER) - Cantidad disponible
- activo (BOOLEAN) - Si está activo o no
- notas (TEXT) - Notas adicionales
- created_at, updated_at
```

#### Tabla: `importaciones_catalogo`
```sql
- id (UUID)
- archivo_nombre (VARCHAR)
- productos_importados (INTEGER)
- productos_actualizados (INTEGER)
- productos_nuevos (INTEGER)
- cotizacion_dolar (DECIMAL)
- estado (VARCHAR)
- errores (JSONB)
- created_at
```

### 2. **Script de Importación** (`importar_catalogo.py`)

**Funcionalidades:**
- ✅ Lee `Catálogo.xlsx` automáticamente
- ✅ Detecta la cotización del dólar (celda B5)
- ✅ Parsea "GB - % bat." → extrae almacenamiento y batería
- ✅ Calcula precios en pesos basado en cotización
- ✅ Calcula cuotas con recargos (22%, 33%, 60%)
- ✅ Marca productos viejos como inactivos
- ✅ Inserta productos nuevos en lotes de 100
- ✅ Registra historial de importaciones
- ✅ Manejo robusto de errores

**Configuración:**
```python
HEADER_ROW = 7           # Fila con encabezados
DATA_START_ROW = 8       # Primera fila de datos
DOLAR_CELL = 'B5'        # Celda con cotización
```

### 3. **Archivos de Configuración**

- ✅ `requirements.txt` - Dependencias de Python
- ✅ `.env` - Variables de entorno (Supabase)
- ✅ `GUIA_IMPORTACION.md` - Instrucciones paso a paso
- ✅ `ANALISIS_CATALOGO.md` - Análisis completo del Excel

---

## 🎯 CÓMO USAR

### Primera Vez (Setup)

1. **Crear las tablas en Supabase:**
   - Ve a Supabase Dashboard → SQL Editor
   - Ejecuta el SQL de `supabase/config.sql` (sección de productos)

2. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecutar importación:**
   ```bash
   python importar_catalogo.py
   ```

### Actualizaciones Futuras

Cuando actualices el `Catálogo.xlsx`:

1. Guarda el archivo Excel actualizado
2. Ejecuta: `python importar_catalogo.py`
3. ¡Listo! Los productos se actualizan automáticamente

---

## 📊 LÓGICA DE NEGOCIO IMPLEMENTADA

### Cálculo de Precios

```javascript
// Precio en pesos
precio_ars = precio_usd × cotizacion_dolar

// Cuotas con recargos
cuotas_3  = (precio_ars × 1.22) / 3   // +22%
cuotas_6  = (precio_ars × 1.33) / 6   // +33%
cuotas_12 = (precio_ars × 1.60) / 12  // +60%
```

### Parseo de Especificaciones

```python
"64 GB / 100%" → almacenamiento: "64 GB", bateria: "100%"
"128GB / 83%"  → almacenamiento: "128 GB", bateria: "83%"
"256 GB"       → almacenamiento: "256 GB", bateria: None
```

### Gestión de Stock

- Productos existentes → marcados como `activo = false`
- Productos nuevos → insertados con `activo = true`
- Esto permite mantener historial sin duplicados

---

## 🔄 FLUJO DE IMPORTACIÓN

```
1. Leer Catálogo.xlsx
   ↓
2. Extraer cotización del dólar (B5)
   ↓
3. Leer productos (fila 8+)
   ↓
4. Para cada producto:
   - Parsear modelo, colores, especificaciones
   - Calcular precio_ars
   - Calcular cuotas
   ↓
5. Marcar productos existentes como inactivos
   ↓
6. Insertar nuevos productos en Supabase
   ↓
7. Registrar importación en historial
   ↓
8. ✅ Completado
```

---

## 📁 ARCHIVOS CREADOS

```
Estilo Apple SJ/
├── supabase/
│   └── config.sql                    ← Tablas de productos agregadas
├── importar_catalogo.py              ← Script de importación ⭐
├── analizar_catalogo.py              ← Script de análisis
├── requirements.txt                  ← Dependencias Python
├── .env                              ← Credenciales Supabase
├── GUIA_IMPORTACION.md              ← Guía paso a paso
├── ANALISIS_CATALOGO.md             ← Análisis del Excel
└── Catálogo.xlsx                     ← Archivo fuente
```

---

## 🚀 PRÓXIMOS PASOS SUGERIDOS

### 1. Dashboard de Productos
- Crear pestaña "Catálogo" en el dashboard
- Mostrar tabla de productos
- Búsqueda y filtros
- Edición manual de productos

### 2. Integración con Conversaciones
- Recomendar productos basados en intención
- Enviar catálogo personalizado por WhatsApp
- Tracking de productos consultados

### 3. Gestión de Stock
- Actualizar stock cuando se vende
- Alertas de stock bajo
- Historial de ventas por producto

### 4. Automatización
- Importación programada (ej: diaria)
- Notificaciones de cambios de precio
- Sincronización automática

---

## ✅ ESTADO ACTUAL

- [x] Análisis del archivo Excel
- [x] Diseño de base de datos
- [x] Creación de tablas en Supabase
- [x] Script de importación Python
- [x] Parseo de especificaciones
- [x] Cálculo de precios y cuotas
- [x] Manejo de errores
- [x] Historial de importaciones
- [x] Documentación completa

**LISTO PARA USAR** 🎉

---

## 💡 NOTAS IMPORTANTES

1. **Cotización del Dólar:**
   - Se lee de la celda B5
   - Si es una fórmula, usa valor por defecto (1485.0)
   - Puedes actualizar manualmente en el Excel

2. **Productos Duplicados:**
   - El sistema NO elimina productos viejos
   - Los marca como `activo = false`
   - Esto mantiene el historial completo

3. **Flexibilidad:**
   - Puedes agregar/quitar productos en el Excel
   - Puedes cambiar precios
   - Puedes agregar nuevas columnas (actualizar script)

4. **Seguridad:**
   - Las políticas RLS están configuradas
   - El frontend puede leer productos activos
   - Solo service_role puede hacer todo

---

¿Necesitas ayuda con algún paso específico? 🚀
