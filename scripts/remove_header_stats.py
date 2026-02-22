#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Leer index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Eliminar la sección de estadísticas del header
# Buscar desde <div class="header-stats"> hasta su cierre </div>
import re

# Patrón para encontrar y eliminar header-stats
pattern = r'<div class="header-stats">.*?</div>\s*</div>\s*</div>\s*</div>'
replacement = '</div>\n        </div>\n    </header>'

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Guardar
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Estadísticas del header eliminadas")
