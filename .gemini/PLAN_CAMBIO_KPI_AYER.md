# Plan de Implementación: Cambio de KPI "Hoy" a "Ayer"

## Objetivo
Cambiar las métricas de "Hoy" en el dashboard (Ventas y Gastos) para que muestren los datos de "Ayer". Esto permite comparar el rendimiento del día anterior completo.

## Cambios Realizados

### 1. Frontend (HTML)
- Se actualizaron los archivos HTML para cambiar las etiquetas visuales de "Hoy" a "Ayer" en las tarjetas de KPI.
- Archivo afectado: `index.html`

### 2. Lógica de Negocio (JavaScript)
- Se modificó el servicio de finanzas (`services/admin-finance.js`) en la función `actualizarKPIs`.
- Se implementó el cálculo de la fecha de ayer.
- Se ajustó el rango de fechas de consulta a la base de datos para asegurar que siempre incluya el día de ayer (incluso si ayer fue el mes pasado).
- Se añadieron acumuladores `incYesterday` y `expYesterday` para sumar los ingresos y egresos correspondientes al día de ayer.
- Se actualizó la lógica de renderizado del DOM para inyectar los valores de ayer en los elementos que antes mostraban los de hoy.

## Archivos Modificados
- `index.html`: Etiquetas de texto actualizadas.
- `services/admin-finance.js`: Lógica de cálculo y renderizado actualizada.

## Verificación
- El usuario debería ver "Ayer" en lugar de "Hoy" en las tarjetas de métricas diarias.
- Los valores mostrados bajo "Ayer" corresponden estrictamente a las transacciones con fecha del día anterior a la fecha actual del sistema.
