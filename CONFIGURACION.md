# 🚀 Guía de Configuración Rápida

## Paso 1: Configurar Variables de Entorno en Supabase

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard/project/gyonguqndcsmudqmptfb
2. Ve a **Project Settings** → **Edge Functions** → **Environment Variables**
3. Agrega estas variables:

```
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY
BUILDERBOT_WHATSAPP_KEY=YOUR_BUILDERBOT_WHATSAPP_KEY
BUILDERBOT_INSTAGRAM_KEY=YOUR_BUILDERBOT_INSTAGRAM_KEY
```

## Paso 2: Ejecutar Script SQL

1. En Supabase, ve a **SQL Editor**
2. Abre el archivo `supabase/config.sql`
3. Copia todo el contenido y pégalo en el editor
4. Click en **Run** para crear todas las tablas

## Paso 3: Desplegar Edge Functions

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
# Instalar Supabase CLI (si no lo tienes)
scoop install supabase

# Login
supabase login

# Vincular proyecto
supabase link --project-ref gyonguqndcsmudqmptfb

# Desplegar las 3 funciones
supabase functions deploy webhook_whatsapp
supabase functions deploy webhook_instagram
supabase functions deploy enviar_mensajes_automaticos
```

## Paso 4: Obtener URLs de Webhooks

Después del despliegue, las URLs serán:

**WhatsApp:**
```
https://gyonguqndcsmudqmptfb.supabase.co/functions/v1/webhook_whatsapp
```

**Instagram:**
```
https://gyonguqndcsmudqmptfb.supabase.co/functions/v1/webhook_instagram
```

## Paso 5: Configurar Webhooks en Builderbot

### Para WhatsApp:
1. Ve a tu bot de WhatsApp en Builderbot
2. Busca la sección de Webhooks
3. Pega la URL de webhook_whatsapp
4. Configura para que envíe este JSON:
```json
{
  "historial": [...],
  "telefono": "número_del_cliente",
  "nombre": "Nombre del Cliente"
}
```

### Para Instagram:
1. Ve a tu bot de Instagram en Builderbot
2. Busca la sección de Webhooks
3. Pega la URL de webhook_instagram
4. Usa el mismo formato de JSON

## Paso 6: Configurar Mensajes Automáticos (Cron Job)

1. En Supabase, ve a **Database** → **Extensions**
2. Habilita la extensión `pg_cron` si no está habilitada
3. Ve a **SQL Editor** y ejecuta:

```sql
SELECT cron.schedule(
  'enviar-mensajes-automaticos-diario',
  '0 9 * * *', -- Todos los días a las 9 AM
  $$
  SELECT net.http_post(
    url:='https://gyonguqndcsmudqmptfb.supabase.co/functions/v1/enviar_mensajes_automaticos',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

**Nota:** Reemplaza `TU_SERVICE_ROLE_KEY` con tu service role key de Supabase (la encuentras en Project Settings → API)

## Paso 7: Probar el Sistema

### Opción A: Servidor Local Simple
```powershell
# Con Python
python -m http.server 8000

# Con Node.js
npx http-server -p 8000
```

Luego abre: http://localhost:8000

### Opción B: Abrir directamente
Simplemente abre `index.html` en tu navegador (puede tener limitaciones de CORS)

## ✅ Verificación

1. **Dashboard**: Deberías ver la interfaz con el logo de Grow Labs y el fondo oscurecido
2. **Webhooks**: Envía un mensaje de prueba desde WhatsApp o Instagram
3. **Base de Datos**: Verifica en Supabase que se creó el cliente y la conversación
4. **Dashboard**: Actualiza y deberías ver la conversación con el resumen de OpenAI

## 🆘 Solución de Problemas

### "No se cargan las conversaciones"
- Verifica que ejecutaste el script SQL
- Revisa la consola del navegador (F12)
- Verifica las credenciales en `config.js`

### "Webhook no funciona"
- Verifica que las Edge Functions estén desplegadas
- Revisa los logs en Supabase Dashboard → Edge Functions
- Verifica que las variables de entorno estén configuradas

### "OpenAI no analiza"
- Verifica que la API key de OpenAI sea correcta
- Revisa los logs de la Edge Function
- Verifica que tengas créditos en tu cuenta de OpenAI

## 📞 URLs Importantes

- **Supabase Dashboard**: https://supabase.com/dashboard/project/gyonguqndcsmudqmptfb
- **Supabase API Settings**: https://supabase.com/dashboard/project/gyonguqndcsmudqmptfb/settings/api
- **Edge Functions**: https://supabase.com/dashboard/project/gyonguqndcsmudqmptfb/functions
- **Database**: https://supabase.com/dashboard/project/gyonguqndcsmudqmptfb/editor

---

**¡Listo!** Tu sistema de gestión de conversaciones está configurado y funcionando. 🎉
