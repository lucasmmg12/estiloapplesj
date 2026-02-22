from PIL import Image
import os
from pathlib import Path

# Directorio de imágenes
public_dir = Path("public")

# Extensiones a convertir
extensions = ['.jpg', '.jpeg', '.png']

# Lista de archivos convertidos
converted = []

for file_path in public_dir.iterdir():
    if file_path.suffix.lower() in extensions:
        # Verificar tamaño del archivo (convertir solo si es mayor a 100KB)
        file_size = file_path.stat().st_size
        
        if file_size > 100 * 1024:  # Si es mayor a 100KB
            try:
                # Abrir imagen
                img = Image.open(file_path)
                
                # Convertir a RGB si es PNG con transparencia
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                
                # Guardar como WebP
                webp_path = file_path.with_suffix('.webp')
                img.save(webp_path, 'WEBP', quality=85, method=6)
                
                # Información
                new_size = webp_path.stat().st_size
                reduction = ((file_size - new_size) / file_size) * 100
                
                converted.append({
                    'original': file_path.name,
                    'webp': webp_path.name,
                    'original_size': f"{file_size / 1024:.1f}KB",
                    'new_size': f"{new_size / 1024:.1f}KB",
                    'reduction': f"{reduction:.1f}%"
                })
                
                print(f"✅ {file_path.name} → {webp_path.name} ({file_size/1024:.1f}KB → {new_size/1024:.1f}KB, -{reduction:.1f}%)")
            
            except Exception as e:
                print(f"❌ Error converting {file_path.name}: {e}")

print(f"\n🎉 Convertidas {len(converted)} imágenes a WebP")
