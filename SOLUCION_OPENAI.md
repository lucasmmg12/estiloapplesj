# 🔧 Solución al Error de Parsing de OpenAI

## ❌ Problema Detectado

El error que recibiste fue:
```
SyntaxError: Unexpected token '-', "..." is not valid JSON at JSON.parse
```

## 🔍 Causa del Problema

OpenAI estaba respondiendo con el JSON dentro de bloques de código markdown o con texto adicional, en lugar de JSON puro. Por ejemplo:

**Respuesta problemática:**
```markdown
```json
{
  "resumen_breve": "Consulta",
  ...
}
```
```

O con texto adicional:
```
Aquí está el análisis:
{
  "resumen_breve": "Consulta",
  ...
}
```

## ✅ Solución Implementada

He aplicado **3 mejoras** para solucionar este problema:

### 1. Forzar Formato JSON con `response_format`

Ahora usamos el parámetro `response_format: { type: 'json_object' }` en la llamada a OpenAI, que **garantiza** que la respuesta sea JSON válido sin bloques markdown.

```typescript
body: JSON.stringify({
  model: 'gpt-4o-mini',
  messages: [...],
  response_format: { type: 'json_object' },  // ← NUEVO
  temperature: 0.3,
})
```

### 2. Prompt Mejorado

El prompt ahora es más explícito sobre el formato esperado:

```typescript
const prompt = `Analiza la siguiente conversación y responde SOLO con un objeto JSON válido 
(sin bloques de código markdown, sin explicaciones adicionales).

Debes responder con este formato exacto:
{
  "resumen_breve": "una o dos palabras como Comprar, Averiguar, Consulta o Reclamo",
  "resumen_detallado": "descripción detallada de la conversación",
  "bullets": ["punto clave 1", "punto clave 2", "punto clave 3"],
  "intencion": "la intención principal: Comprar, Averiguar, Consulta o Reclamo"
}`;
```

### 3. Parsing Robusto con Fallback

Si aún así OpenAI responde con formato incorrecto, el código ahora:

1. **Limpia bloques markdown**: Remueve ` ```json ` y ` ``` `
2. **Extrae el JSON**: Busca el objeto JSON dentro del texto
3. **Intenta parsear**: Con try/catch para manejar errores
4. **Fallback**: Si todo falla, crea un análisis por defecto

```typescript
// Limpiar la respuesta si viene en formato markdown
responseContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

// Intentar encontrar el JSON si está mezclado con texto
const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  responseContent = jsonMatch[0];
}

let analisis;
try {
  analisis = JSON.parse(responseContent);
} catch (parseError) {
  console.error('Error parseando JSON de OpenAI:', parseError);
  
  // Si falla el parsing, crear un análisis por defecto
  analisis = {
    resumen_breve: 'Consulta',
    resumen_detallado: 'No se pudo analizar la conversación automáticamente.',
    bullets: ['Conversación recibida', 'Análisis pendiente'],
    intencion: 'Consulta'
  };
}
```

## 📝 Cambios Realizados

### webhook_whatsapp/index.ts
- ✅ Agregado `response_format: { type: 'json_object' }`
- ✅ Prompt mejorado y más explícito
- ✅ Parsing robusto con limpieza de markdown
- ✅ Fallback en caso de error
- ✅ Logs detallados para debugging

### webhook_instagram/index.ts
- ✅ Mismos cambios que WhatsApp
- ✅ Adaptado para conversaciones de Instagram

## 🚀 Próximos Pasos

### 1. Redesplegar las Edge Functions

```bash
# Redesplegar WhatsApp
supabase functions deploy webhook_whatsapp

# Redesplegar Instagram
supabase functions deploy webhook_instagram
```

### 2. Probar Nuevamente

Envía un mensaje de prueba desde WhatsApp o Instagram.

### 3. Verificar en los Logs

Ve a Supabase Dashboard → Edge Functions → Logs

Ahora deberías ver:
```
Payload recibido: { ... }
Datos extraídos: { historial: '2 mensajes', telefono: '...', nombre: '...' }
Respuesta de OpenAI: { "resumen_breve": "Consulta", ... }
Análisis extraído: { resumen_breve: 'Consulta', ... }
```

## ✅ Resultado Esperado

Después de redesplegar:

1. ✅ OpenAI responderá con JSON puro (sin markdown)
2. ✅ El parsing funcionará correctamente
3. ✅ La conversación se guardará en Supabase con el análisis completo
4. ✅ Verás el resumen, bullets e intención en tu dashboard
5. ✅ Si hay algún error, se usará el análisis por defecto (no fallará)

## 🐛 Debug

Si aún tienes problemas, los logs mostrarán:

1. **Payload recibido** - Datos del webhook
2. **Datos extraídos** - Historial, teléfono, nombre
3. **Respuesta de OpenAI** - Exactamente qué respondió la IA
4. **Análisis extraído** - El objeto JSON final
5. **Errores de parsing** - Si hubo problemas al parsear

## 📊 Ventajas de la Solución

- **Más robusto**: Maneja múltiples formatos de respuesta
- **No falla**: Siempre guarda algo, incluso si OpenAI falla
- **Mejor debugging**: Logs detallados para identificar problemas
- **Formato garantizado**: `response_format` asegura JSON válido
- **Fallback inteligente**: Análisis por defecto si algo sale mal

---

**¡Listo para probar!** Redespliega las funciones y envía un mensaje de prueba. 🚀

## 💡 Tip Adicional

Si quieres ver exactamente qué está respondiendo OpenAI, ve a los logs de Supabase y busca:
```
Respuesta de OpenAI: ...
```

Esto te mostrará el texto exacto que devolvió la IA antes del parsing.
