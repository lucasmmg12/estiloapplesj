# 🔧 Solución al Error de Webhook

## ❌ Problema Detectado

El error que recibiste fue:
```
Error: Faltan datos requeridos: historial, telefono, nombre
```

## 🔍 Causa del Problema

Builderbot envía los datos con **variables sin expandir** en el payload. En tu configuración de Builderbot tenías:

```json
{
  "historial": "{history}",
  "telefono": "{from}",
  "name": "{name}"
}
```

Pero Builderbot estaba enviando literalmente las cadenas `"{history}"`, `"{from}"`, `"{name}"` en lugar de los valores reales.

## ✅ Solución Implementada

He actualizado ambas Edge Functions (`webhook_whatsapp` y `webhook_instagram`) para que **acepten múltiples formatos** de datos:

### Formatos Soportados Ahora:

1. **Formato Original** (el que diseñamos):
```json
{
  "historial": [...],
  "telefono": "5491123456789",
  "nombre": "Juan Pérez"
}
```

2. **Formato con nombres en inglés**:
```json
{
  "history": [...],
  "from": "5491123456789",
  "name": "Juan Pérez"
}
```

3. **Formato completo de Builderbot**:
```json
{
  "messages": [...],
  "user": {
    "phone": "5491123456789",
    "name": "Juan Pérez",
    "id": "user123"
  }
}
```

4. **Cualquier combinación** de los campos anteriores

### Lógica de Extracción:

El código ahora intenta extraer los datos de múltiples fuentes:

```typescript
// Historial - intenta en este orden:
historial = payload.historial || payload.history || payload.messages || []

// Teléfono - intenta en este orden:
telefono = payload.telefono || payload.from || payload.phone || payload.user?.phone || payload.user?.id

// Nombre - intenta en este orden:
nombre = payload.nombre || payload.name || payload.user?.name || telefono || 'Cliente'
```

## 📋 Cómo Configurar el Webhook en Builderbot

### Opción 1: Usar Variables de Builderbot (Recomendado)

Si Builderbot soporta expandir variables, configura así:

**Body (JSON):**
```json
{
  "history": {{history}},
  "from": "{{from}}",
  "name": "{{name}}"
}
```

**Nota:** Sin comillas en `history` porque es un array, CON comillas en `from` y `name` porque son strings.

### Opción 2: Dejar que Builderbot Envíe su Formato Nativo

Si Builderbot tiene su propio formato de webhook, simplemente activa el webhook sin configurar el body. La Edge Function ahora detectará automáticamente los datos.

### Opción 3: Configuración Manual Mínima

Si nada de lo anterior funciona, configura manualmente:

**Body (JSON):**
```json
{
  "messages": [],
  "from": "número_del_cliente",
  "name": "nombre_del_cliente"
}
```

Y llena los valores manualmente para cada mensaje.

## 🚀 Próximos Pasos

### 1. Redesplegar las Edge Functions

Las funciones ya están actualizadas en tu código local. Ahora debes redesplegarlas:

```bash
# Asegúrate de estar en la carpeta del proyecto
cd "c:\Users\lucas\Desktop\Proyectos\Estilo Apple SJ"

# Redesplegar WhatsApp
supabase functions deploy webhook_whatsapp

# Redesplegar Instagram
supabase functions deploy webhook_instagram
```

### 2. Probar el Webhook

Después del despliegue, prueba nuevamente desde Builderbot o con cURL:

**Prueba con formato simple:**
```bash
curl -X POST https://gyonguqndcsmudqmptfb.supabase.co/functions/v1/webhook_whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "history": [
      {"role": "user", "content": "Hola, quiero comprar"},
      {"role": "assistant", "content": "¡Perfecto! Te ayudo"}
    ],
    "from": "5491123456789",
    "name": "Cliente Prueba"
  }'
```

### 3. Verificar en los Logs

Ve a Supabase Dashboard → Edge Functions → Logs

Ahora deberías ver:
```
Payload recibido: { ... }
Datos extraídos: { historial: '2 mensajes', telefono: '5491123456789', nombre: 'Cliente Prueba' }
```

## 🐛 Debug

Si aún tienes problemas, los logs ahora mostrarán:

1. **Payload completo recibido** - Para ver exactamente qué está enviando Builderbot
2. **Datos extraídos** - Para verificar qué campos se pudieron extraer
3. **Errores específicos** - Mensajes más claros sobre qué falta

## 📝 Cambios Realizados en el Código

### webhook_whatsapp/index.ts
- ✅ Validación flexible de campos
- ✅ Soporte para múltiples formatos
- ✅ Logs de debugging
- ✅ Mensajes de error más descriptivos

### webhook_instagram/index.ts
- ✅ Mismos cambios que WhatsApp
- ✅ Soporte adicional para `username` en Instagram

## ✅ Resultado Esperado

Después de redesplegar, el webhook debería:

1. ✅ Aceptar el payload de Builderbot sin errores
2. ✅ Extraer correctamente historial, teléfono y nombre
3. ✅ Analizar la conversación con OpenAI
4. ✅ Guardar en Supabase
5. ✅ Aparecer en tu dashboard

---

**¿Listo para probar?** Redespliega las funciones y prueba nuevamente! 🚀
