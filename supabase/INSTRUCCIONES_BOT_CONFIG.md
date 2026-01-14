# Instrucciones: Crear Tabla bot_config en Supabase

## 📋 Pasos para Implementar

### 1. Acceder a Supabase SQL Editor
1. Ve a tu proyecto en [https://supabase.com](https://supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query**

### 2. Ejecutar el Script
1. Abre el archivo `supabase/bot_config_table.sql`
2. Copia todo el contenido
3. Pégalo en el editor SQL de Supabase
4. Haz clic en **Run** (o presiona `Ctrl+Enter`)

### 3. Verificar la Creación
Ejecuta esta query para verificar que la tabla se creó correctamente:

```sql
SELECT * FROM bot_config;
```

Deberías ver 2 filas:
- `whatsapp` con status `active`
- `instagram` con status `active`

## 🎯 ¿Qué hace este script?

1. **Crea la tabla `bot_config`** con:
   - `id`: Identificador único
   - `platform`: 'whatsapp' o 'instagram'
   - `status`: 'active' o 'paused'
   - `updated_at`: Timestamp de última actualización
   - `updated_by`: Usuario que hizo el cambio (opcional)

2. **Inserta configuración inicial** para ambas plataformas en estado activo

3. **Crea trigger automático** para actualizar `updated_at` cuando cambia el estado

4. **Configura RLS (Row Level Security)** para permitir lectura y actualización

## ✅ Resultado

Después de ejecutar el script:
- El estado del bot se persistirá en la base de datos
- Al recargar la página, el botón mostrará el estado correcto
- El estado se sincroniza entre todos los usuarios
- El sistema recordará si el bot está pausado o activo

## 🔧 Troubleshooting

Si ves un error al ejecutar el script:
- Verifica que estás conectado al proyecto correcto
- Asegúrate de tener permisos de administrador
- Si la tabla ya existe, puedes eliminarla primero con:
  ```sql
  DROP TABLE IF EXISTS bot_config CASCADE;
  ```
