"""
Script de Importación de Finanzas (Ingresos y Gastos)
Importa datos desde ingresos.csv y gastos.csv a Supabase
"""

import csv
import requests
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configuración
SUPABASE_URL = 'https://gyonguqndcsmudqmptfb.supabase.co'
# Intentar obtener la clave de diferentes nombres posibles en .env
SUPABASE_KEY = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def supabase_request(method, endpoint, data=None, params=None):
    """Hacer petición a Supabase usando requests"""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    if method == 'GET':
        response = requests.get(url, headers=headers, params=params)
    elif method == 'POST':
        response = requests.post(url, headers=headers, json=data)
    
    if response.status_code not in [200, 201, 204]:
        print(f"Error en Supabase: {response.status_code} - {response.text}")
        return None
    
    try:
        return response.json()
    except:
        return []

def obtener_mapeo_categorias():
    """Obtiene las categorías de la base de datos para mapear nombres a IDs"""
    data = supabase_request('GET', 'transaction_categories')
    if not data:
        return {}
    return {cat['name'].lower(): cat['id'] for cat in data}

def procesar_csv(archivo, tipo, mapeo_cats):
    """Procesa el CSV y devuelve una lista de transacciones"""
    if not os.path.exists(archivo):
        print(f"[!] Archivo {archivo} no encontrado.")
        return []
    
    transacciones = []
    
    with open(archivo, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                # Limpiar nombres de columnas (quitar espacios y BOM si hubiera)
                row = {k.strip(): v for k, v in row.items() if k}
                
                # Parsear fecha (Marca temporal)
                # Formato esperado: 29/05/2025 14:21:06
                marca_temporal = row.get('Marca temporal')
                if not marca_temporal: continue
                
                try:
                    dt = datetime.strptime(marca_temporal, '%d/%m/%Y %H:%M:%S')
                except:
                    # Intento con otro formato por si acaso
                    dt = datetime.strptime(marca_temporal.split(' ')[0], '%d/%m/%Y')

                # Monto
                monto_str = row.get('Monto', '0').replace(',', '.')
                monto = float(monto_str)
                
                # Moneda
                moneda_raw = row.get('Que moneda?', 'Pesos').lower()
                moneda = 'ARS' if 'peso' in moneda_raw else 'USD'
                
                # Sucursal (Branch)
                local = row.get('De que Local?', row.get('De que local?', 'Sin Local')).strip()
                
                # Unificación de sucursales según pedido del usuario: "a partir del 2026 solo tienen una sucursal"
                if dt.year >= 2026:
                    local = "Estilo Apple SJ" # Nombre unificado
                
                # Categoría
                cat_nombre = row.get('Categorias', '').strip().lower()
                cat_id = mapeo_cats.get(cat_nombre)
                
                if not cat_id:
                    for name, cid in mapeo_cats.items():
                        if cat_nombre in name or name in cat_nombre:
                            cat_id = cid
                            break
                
                # Descripción
                desc_col = 'Fecha' if 'Fecha' in row else 'Comentario'
                descripcion = row.get(desc_col, "").strip()
                
                # Construir objeto transacción
                t = {
                    'date': dt.isoformat(),
                    'description': f"[{local}] {descripcion}".strip(),
                    'amount': monto,
                    'currency': moneda,
                    'type': tipo,
                    'category_id': cat_id,
                    'branch': local,
                    'exchange_rate': 1485.0,
                    'is_personal': False,
                    'created_at': dt.isoformat()
                }
                
                transacciones.append(t)
                
            except Exception as e:
                # print(f"[!] Error procesando fila: {e}")
                continue
                
    return transacciones

def importar():
    print("=" * 80)
    print("IMPORTACIÓN DE FINANZAS (Google Sheets -> Supabase)")
    print("=" * 80)

    # 1. Obtener mapeo de categorías
    print("\n[*] Obteniendo categorías de Supabase...")
    mapeo_cats = obtener_mapeo_categorias()
    if not mapeo_cats:
        print("[ERROR] No se pudieron obtener las categorías. ¿Ejecutaste el SQL de erp_schema.sql?")
        return

    # 2. Procesar Ingresos
    print("\n[*] Procesando ingresos.csv...")
    ingresos = procesar_csv('ingresos.csv', 'INCOME', mapeo_cats)
    print(f"[OK] {len(ingresos)} ingresos listos para importar.")

    # 3. Procesar Gastos
    print("\n[*] Procesando gastos.csv...")
    gastos = procesar_csv('gastos.csv', 'EXPENSE', mapeo_cats)
    print(f"[OK] {len(gastos)} gastos listos para importar.")

    all_trans = ingresos + gastos

    if not all_trans:
        print("\n[!] No hay datos para importar.")
        return

    # 4. Insertar en Supabase
    print(f"\n[*] Insertando {len(all_trans)} movimientos en Supabase...")
    
    # Opcional: Limpiar tabla antes si se quiere reemplazo total
    # supabase_request('DELETE', 'transactions') 

    batch_size = 100
    insertados = 0
    for i in range(0, len(all_trans), batch_size):
        batch = all_trans[i:i+batch_size]
        res = supabase_request('POST', 'transactions', batch)
        if res is not None:
            insertados += len(batch)
            print(f"   Progreso: {insertados}/{len(all_trans)}")

    print("\n" + "=" * 80)
    print("IMPORTACIÓN FINALIZADA")
    print(f"Se importaron {insertados} registros con éxito.")
    print("=" * 80)

if __name__ == "__main__":
    importar()
