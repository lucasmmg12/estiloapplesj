# 🚀 Sistema de Gestión Builderbot - Grow Labs

Sistema completo de gestión de conversaciones para Builderbot (WhatsApp e Instagram) con análisis automático mediante OpenAI, dashboard de clientes y embudo de ventas automatizado.

## 📋 Características

- ✅ **Webhooks**: Recepción automática de conversaciones desde WhatsApp e Instagram
- 🤖 **Análisis con OpenAI**: Detección automática de intenciones y generación de resúmenes
- 📊 **Dashboard Interactivo**: Visualización de conversaciones con filtros y búsqueda
- 🎯 **Embudo de Ventas**: Seguimiento automático de clientes
- 📨 **Mensajes Automáticos**: Envío programado según intención y días transcurridos
- ⚡ **Tiempo Real**: Actualización automática con Supabase Realtime
- 🎨 **Diseño Profesional**: Interfaz estilo Apple con glassmorphism

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase Edge Functions (Deno)
- **Base de Datos**: PostgreSQL (Supabase)
- **IA**: OpenAI GPT-4o-mini
- **APIs**: Builderbot Cloud

## 📦 Instalación

### 1. Configurar Supabase

#### a) Crear proyecto en Supabase
1. Ve a [https://supabase.com](https://supabase.com)
2. Crea un nuevo proyecto o usa el existente: `gyonguqndcsmudqmptfb`

#### b) Ejecutar script SQL
1. En Supabase, ve a **SQL Editor**
2. Copia y pega el contenido de `supabase/config.sql`
3. Ejecuta el script para crear todas las tablas

#### c) Configurar variables de entorno
1. Ve a **Project Settings** → **Edge Functions**
2. Agrega las siguientes variables de entorno:

```
OPENAI_API_KEY=tu_api_key_de_openai
BUILDERBOT_WHATSAPP_KEY=bb-01f7a4a3-81de-458a-bf72-df9952f4b068
BUILDERBOT_INSTAGRAM_KEY=bb-8b7d01c7-eeca-4042-b2d7-7f5745cbc633
```

### 2. Desplegar Edge Functions

#### a) Instalar Supabase CLI
```bash
# Windows (PowerShell)
scoop install supabase

# O descarga desde: https://github.com/supabase/cli/releases
```

#### b) Login en Supabase
```bash
supabase login
```

#### c) Vincular proyecto
```bash
supabase link --project-ref gyonguqndcsmudqmptfb
```

#### d) Desplegar funciones
```bash
# Desplegar webhook de WhatsApp
supabase functions deploy webhook_whatsapp

# Desplegar webhook de Instagram
supabase functions deploy webhook_instagram

# Desplegar función de mensajes automáticos
supabase functions deploy enviar_mensajes_automaticos
```

### 3. Obtener URLs de Webhooks

Después del despliegue, obtendrás URLs como:
```
https://gyonguqndcsmudqmptfb.supabase.co/functions/v1/webhook_whatsapp
https://gyonguqndcsmudqmptfb.supabase.co/functions/v1/webhook_instagram
```

### 4. Configurar Webhooks en Builderbot

#### WhatsApp
1. Ve a tu bot de WhatsApp en Builderbot
2. Configura el webhook con la URL de `webhook_whatsapp`
3. Asegúrate de enviar el payload en formato:
```json
{
  "historial": [...],
  "telefono": "1234567890",
  "nombre": "Nombre del Cliente"
}
```

#### Instagram
1. Ve a tu bot de Instagram en Builderbot
2. Configura el webhook con la URL de `webhook_instagram`
3. Usa el mismo formato de payload

### 5. Configurar Cron Job (Mensajes Automáticos)

1. En Supabase, ve a **Database** → **Cron Jobs**
2. Crea un nuevo cron job:
```sql
SELECT cron.schedule(
  'enviar-mensajes-automaticos',
  '0 9 * * *', -- Ejecutar diariamente a las 9 AM
  $$
  SELECT net.http_post(
    url:='https://gyonguqndcsmudqmptfb.supabase.co/functions/v1/enviar_mensajes_automaticos',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

### 6. Ejecutar el Frontend

#### Opción A: Servidor local simple
```bash
# Python 3
python -m http.server 8000

# Node.js (instalar http-server)
npx http-server -p 8000
```

#### Opción B: Live Server (VS Code)
1. Instala la extensión "Live Server"
2. Click derecho en `index.html` → "Open with Live Server"

Abre tu navegador en: `http://localhost:8000`

## 📖 Uso

### Dashboard de Conversaciones

1. **Ver conversaciones**: La tabla principal muestra todas las conversaciones
2. **Filtrar**: Usa los selectores para filtrar por plataforma o intención
3. **Ver detalles**: Click en cualquier fila para ver el análisis completo
4. **Enviar mensaje**: Desde los detalles, puedes enviar un mensaje manual

### Embudo de Ventas

1. Ve a la pestaña "Embudo de Ventas"
2. Verás todos los clientes en seguimiento
3. Cada tarjeta muestra:
   - Información del cliente
   - Etapa actual
   - Si se envió mensaje automático
   - Fecha del próximo mensaje programado

### Mensajes Automáticos

1. Ve a la pestaña "Mensajes Automáticos"
2. Click en "Nuevo Mensaje" para crear uno
3. Configura:
   - **Intención**: A qué tipo de cliente aplica
   - **Días de espera**: Cuántos días después de la última interacción
   - **Mensaje**: El texto que se enviará
   - **Media URL** (opcional): Imagen o video
   - **Activo**: Si está habilitado o no

## 🔧 Estructura del Proyecto

```
Estilo Apple SJ/
├── index.html              # Página principal
├── styles.css              # Estilos (diseño Apple)
├── app.js                  # Lógica principal
├── config.js               # Configuración
├── services/
│   ├── supabase-client.js  # Cliente de Supabase
│   └── builderbot-api.js   # API de Builderbot
├── supabase/
│   ├── config.sql          # Script de base de datos
│   └── functions/
│       ├── webhook_whatsapp/
│       │   └── index.ts
│       ├── webhook_instagram/
│       │   └── index.ts
│       └── enviar_mensajes_automaticos/
│           └── index.ts
└── public/
    ├── logogrow.png        # Logo
    └── fondogrow.png       # Fondo
```

## 🗄️ Esquema de Base de Datos

### Tabla: `clientes`
- `id`: UUID (PK)
- `telefono`: TEXT (único)
- `nombre`: TEXT
- `plataforma`: TEXT (whatsapp/instagram)
- `intencion`: TEXT
- `ultima_interaccion`: TIMESTAMP

### Tabla: `conversaciones`
- `id`: UUID (PK)
- `cliente_id`: UUID (FK)
- `historial_completo`: JSONB
- `resumen_breve`: TEXT
- `resumen_detallado`: TEXT
- `bullets`: JSONB
- `intencion_detectada`: TEXT

### Tabla: `mensajes_automaticos`
- `id`: UUID (PK)
- `intencion`: TEXT
- `dias_espera`: INTEGER
- `mensaje`: TEXT
- `media_url`: TEXT
- `activo`: BOOLEAN

### Tabla: `embudo_ventas`
- `id`: UUID (PK)
- `cliente_id`: UUID (FK)
- `etapa`: TEXT
- `mensaje_enviado`: BOOLEAN
- `fecha_proximo_mensaje`: TIMESTAMP

## 🔐 Seguridad

- Las API keys están en `config.js` (para desarrollo)
- En producción, usa variables de entorno
- Las Edge Functions usan `SUPABASE_SERVICE_ROLE_KEY`
- Row Level Security (RLS) habilitado en todas las tablas

## 🐛 Solución de Problemas

### Error: "No se pueden cargar conversaciones"
- Verifica que el script SQL se ejecutó correctamente
- Revisa la consola del navegador para errores
- Verifica las credenciales de Supabase en `config.js`

### Webhook no recibe datos
- Verifica que la URL del webhook esté correctamente configurada en Builderbot
- Revisa los logs de la Edge Function en Supabase
- Verifica que el payload tenga el formato correcto

### Mensajes automáticos no se envían
- Verifica que el cron job esté configurado
- Revisa que las API keys de Builderbot sean correctas
- Verifica que haya mensajes automáticos activos configurados

## 📞 Soporte

Para problemas o preguntas:
1. Revisa los logs en Supabase Dashboard
2. Verifica la consola del navegador
3. Revisa la documentación de Builderbot

## 📄 Licencia

Proyecto privado - Grow Labs © 2025
