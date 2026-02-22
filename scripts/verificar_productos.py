import requests
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = 'https://gyonguqndcsmudqmptfb.supabase.co'
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Prefer': 'count=exact'
}

# Verificar productos
r = requests.get(f'{SUPABASE_URL}/rest/v1/productos?select=*&limit=5', headers=headers)
print(f"Status: {r.status_code}")
print(f"Total productos (primeros 5):")
if r.status_code == 200:
    productos = r.json()
    for p in productos:
        print(f"  - {p['modelo']} - ${p['precio_usd']} USD")
    
    # Contar total
    r2 = requests.get(f'{SUPABASE_URL}/rest/v1/productos?select=count', headers=headers)
    if 'content-range' in r2.headers:
        total = r2.headers['content-range'].split('/')[-1]
        print(f"\nTotal de productos en la base de datos: {total}")
else:
    print(f"Error: {r.text}")
