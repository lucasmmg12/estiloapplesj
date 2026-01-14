# Plan de Implementación - Estética Marca "ESTILO"

## Análisis del Manual de Marca

### Colores Identificados:
- **Primario (Borgoña/Vino)**: `#5C2E2E` - Color principal de la marca
- **Secundario (Dorado/Beige)**: `#E8D5C4` - Color de acento elegante
- **Terciario (Dorado Oscuro)**: `#C9A882` - Para detalles
- **Negro Premium**: `#1A1A1A` - Fondos oscuros
- **Blanco Crema**: `#F5F1ED` - Textos claros

### Tipografía:
- **Principal**: "Questrial" (sans-serif moderna y elegante)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

### Estilo Visual:
- Minimalista y premium
- Espacios amplios y limpios
- Fotografía de producto con tonos cálidos
- Elegancia y sofisticación
- Contraste sutil pero efectivo

## Archivos a Actualizar

### 1. `styles.css` (Aplicación Principal)
- [ ] Actualizar variables CSS con paleta de marca
- [ ] Cambiar gradientes a tonos borgoña/dorado
- [ ] Actualizar fuente a Questrial
- [ ] Ajustar efectos glass con tonos cálidos
- [ ] Actualizar colores de botones y badges

### 2. `chat.css` (Live Chat)
- [ ] Aplicar misma paleta de colores
- [ ] Actualizar burbujas de mensajes
- [ ] Ajustar header del chat
- [ ] Actualizar estados (online/offline) con colores de marca

### 3. `catalogo-publico.css` (Catálogo Público)
- [ ] Aplicar paleta de marca
- [ ] Actualizar cards de productos
- [ ] Ajustar botones de acción
- [ ] Mejorar contraste con colores de marca

## Implementación

### Fase 1: Variables Globales
Actualizar `:root` en todos los archivos CSS con:
```css
:root {
    /* Colores Marca ESTILO */
    --primary: #5C2E2E;           /* Borgoña principal */
    --primary-light: #7A4545;     /* Borgoña claro */
    --primary-dark: #3D1F1F;      /* Borgoña oscuro */
    --secondary: #E8D5C4;         /* Beige/Dorado claro */
    --secondary-dark: #C9A882;    /* Dorado oscuro */
    --accent-gold: #D4AF37;       /* Dorado acento */
    
    /* Fondos Premium */
    --bg-dark: #1A1A1A;
    --bg-surface: #2A2A2A;
    --bg-card: rgba(92, 46, 46, 0.05);
    
    /* Textos */
    --text-primary: #F5F1ED;
    --text-secondary: #E8D5C4;
    --text-muted: #A89B8F;
    
    /* Efectos Glass */
    --glass-bg: rgba(92, 46, 46, 0.08);
    --glass-border: rgba(232, 213, 196, 0.15);
    --glass-hover: rgba(92, 46, 46, 0.12);
}
```

### Fase 2: Tipografía
Importar Google Font Questrial y actualizar font-family

### Fase 3: Componentes
Actualizar gradientes, sombras y efectos hover con la nueva paleta

### Fase 4: Testing
Verificar contraste y legibilidad en todos los componentes
