# 📊 ANÁLISIS COMPLETO DEL ARCHIVO CATÁLOGO.XLSX

## ✅ CONFIRMACIÓN DE COMPRENSIÓN

Sí, **entiendo perfectamente** la estructura del archivo y su propósito:

### 🎯 Propósito del Archivo
- **Catálogo de productos** (iPhones usados premium y sellados)
- **Control de stock** interno de Estilo Apple SJ
- **Gestión de precios** en dólares y pesos
- **Cálculo automático** de cuotas bancarias
- Se **envía a clientes** como catálogo completo
- **Actualizable** - pueden agregar/quitar productos

---

## 📋 ESTRUCTURA DETECTADA

### Información General
- **Archivo:** Catálogo.xlsx
- **Hojas:** 1 hoja ("Hoja 1")
- **Total de filas:** 1,022
- **Total de columnas:** 23
- **Formato:** Excel con fórmulas dinámicas

### 🗂️ Secciones del Archivo

#### **Filas 1-6: ENCABEZADO Y CONFIGURACIÓN**
- **Fila 1:** Vacía (sin encabezados visibles)
- **Fila 2:** Vacía
- **Fila 3:** Descripción de beneficios
  - "CABLE ORIGINAL + 120 DÍAS DE GARANTÍA + FUNDA A ELECCIÓN + VIDRIO TEMPLADO 😎"
- **Fila 4:** Información de pagos
  - "Hasta 12 cuotas FIJAS / 3 cuotas SIN interés BBVA - Descuento abonando de contado"
- **Fila 5:** Cotización del dólar (IMPORTXML desde Infobae)
  - Columna A: "Dólar hoy"
  - Columna B: Fórmula que importa el valor del dólar (1485.0 pesos)
- **Fila 6:** Títulos de secciones
  - Col A: "STOCK USADOS PREMIUM - SELLADOS"
  - Col D: "Promoción contado 🔥"
  - Col F: "PROMOCIONES BANCARIAS"

#### **Fila 7: ENCABEZADOS DE PRODUCTOS**
Esta es la **fila clave** con los nombres de las columnas:

| Columna | Nombre | Descripción |
|---------|--------|-------------|
| A (Col1) | Modelo | Nombre del iPhone (ej: "iPhone 11") |
| B (Col2) | Color/es | Colores disponibles (ej: "Negro", "Rojo") |
| C (Col3) | GB - % bat. | Almacenamiento y batería (ej: "64 GB / 100%") |
| D (Col4) | Precio en Dolar | Precio base en USD (ej: 220.0) |
| E (Col5) | Precio en pesos | Fórmula: `=D*B5` (dólares × cotización) |
| F (Col6) | 3 CUOTAS 💣 | Fórmula: `=ROUND((E*1.22)/3,-3)` |
| G (Col7) | 6 CUOTAS 💣 | Fórmula: `=ROUND((E*1.33)/6,-3)` |
| H (Col8) | 12 CUOTAS 💣 | Fórmula: `=(E*1.6)/12` |

**Columnas I-W (9-23):** Probablemente vacías o con datos adicionales

#### **Filas 8+: PRODUCTOS**
Cada fila representa un producto individual:

**Ejemplo - Fila 8:**
```
Modelo: iPhone 8
Color: Negro
GB - % bat.: 64 GB / 100%
Precio en Dolar: 90.0
Precio en pesos: =D8*B5 (calculado: 90 × 1485 = 133,650)
3 CUOTAS: =ROUND((E8*1.22)/3,-3)
6 CUOTAS: =ROUND((E8*1.33)/6,-3)
12 CUOTAS: =(E8*1.6)/12
```

---

## 🔍 LÓGICA DE NEGOCIO DETECTADA

### 1. **Cotización del Dólar**
- Se importa automáticamente desde Infobae
- Ubicación: Celda B5
- Valor actual: 1485.0 pesos
- **Fórmula:** `IMPORTXML("https://www.infobae.com/economia/divisas/dolar-hoy/")`

### 2. **Cálculo de Precios**
```
Precio en Pesos = Precio en Dólares × Cotización del Dólar
```

### 3. **Cálculo de Cuotas**
```
3 Cuotas  = ROUND((Precio_Pesos × 1.22) / 3, -3)  → Recargo 22%
6 Cuotas  = ROUND((Precio_Pesos × 1.33) / 6, -3)  → Recargo 33%
12 Cuotas = (Precio_Pesos × 1.6) / 12             → Recargo 60%
```

### 4. **Estructura de Datos de Producto**
```javascript
{
  modelo: "iPhone 11",
  colores: "Negro",
  almacenamiento: "64 GB",
  bateria: "100%",
  precio_usd: 220.0,
  precio_ars: 326700,  // calculado
  cuotas_3: 136000,    // calculado
  cuotas_6: 72000,     // calculado
  cuotas_12: 43560     // calculado
}
```

---

## 🎯 PLAN DE IMPORTACIÓN

Para crear la funcionalidad de importación necesitamos:

### 1. **Mapeo de Columnas**
```javascript
const COLUMN_MAP = {
  A: 'modelo',           // Modelo del iPhone
  B: 'colores',          // Colores disponibles
  C: 'especificaciones', // GB y % batería
  D: 'precio_usd',       // Precio en dólares
  E: 'precio_ars',       // Precio en pesos (fórmula)
  F: 'cuotas_3',         // 3 cuotas (fórmula)
  G: 'cuotas_6',         // 6 cuotas (fórmula)
  H: 'cuotas_12'         // 12 cuotas (fórmula)
};
```

### 2. **Configuración de Lectura**
```javascript
const CONFIG = {
  HEADER_ROW: 7,           // Fila con encabezados de productos
  DATA_START_ROW: 8,       // Primera fila de datos
  DOLAR_CELL: 'B5',        // Celda con cotización del dólar
  SKIP_EMPTY_ROWS: true,   // Saltar filas vacías
  COLUMNS_TO_READ: 8       // Leer columnas A-H
};
```

### 3. **Procesamiento de Datos**
- Leer cotización del dólar (B5)
- Leer desde fila 8 en adelante
- Parsear "GB - % bat." para extraer almacenamiento y batería
- Calcular precios si vienen como fórmulas
- Validar que el modelo no esté vacío
- Saltar filas completamente vacías

### 4. **Tabla en Supabase**
Necesitaremos crear una tabla `productos`:
```sql
CREATE TABLE productos (
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
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ CONFIRMACIÓN

**Entiendo que:**

1. ✅ El archivo tiene **1,022 filas** con productos
2. ✅ Los **encabezados están en la fila 7**
3. ✅ Los **datos comienzan en la fila 8**
4. ✅ Hay **8 columnas principales** (A-H)
5. ✅ Los **precios se calculan** con fórmulas basadas en el dólar
6. ✅ Necesitamos **parsear** la columna "GB - % bat."
7. ✅ El sistema debe ser **flexible** para agregar/quitar productos
8. ✅ La **cotización del dólar** está en B5

**¿Procedo a crear la funcionalidad de importación?**

Esto incluirá:
- 📄 Script de importación en Python/JavaScript
- 🗄️ Tabla en Supabase para productos
- 🔄 Función para sincronizar el catálogo
- 📊 Interfaz en el dashboard para importar
- ✅ Validación de datos
- 🔍 Detección de cambios (productos nuevos/eliminados)
