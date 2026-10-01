import os
import subprocess
import shutil

artifact_dir = r'C:\Users\Sanatorio Argentino\.gemini\antigravity-ide\brain\db46cb9a-0480-4415-8cb8-74ce6d40dc93'
workspace_dir = r'c:\Users\Sanatorio Argentino\Desktop\Proyectos\estilo'

def read_svg(filename):
    path = os.path.join(artifact_dir, filename)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            if content.startswith('<?xml'):
                content = content[content.find('?>')+2:].strip()
            return content
    return ''

svg_lineas = read_svg('grafico_lineas_mensajes.svg')
svg_pie_in_out = read_svg('grafico_torta_entrantes_salientes.svg')
svg_pie_bot_agent = read_svg('grafico_torta_bot_vs_agente.svg')
svg_barras_costo = read_svg('grafico_barras_costos.svg')

html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Ejecutivo Mensajería WhatsApp - Estilo Apple SJ</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  @page {{
    size: A4 portrait;
    margin: 10mm 12mm 10mm 12mm;
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    line-height: 1.4;
    font-size: 10.5px;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}

  .header-container {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 10px;
    border-bottom: 2px solid #2563eb;
    margin-bottom: 12px;
  }}

  .brand-title {{
    font-size: 19px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
  }}

  .brand-subtitle {{
    font-size: 11px;
    color: #2563eb;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 1px;
  }}

  .report-meta {{
    text-align: right;
    font-size: 9.5px;
    color: #64748b;
    line-height: 1.35;
  }}

  .meta-tag {{
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    padding: 2px 7px;
    border-radius: 9999px;
    font-weight: 600;
    font-size: 9.5px;
    margin-bottom: 3px;
    border: 1px solid #bfdbfe;
  }}

  .section-title {{
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }}

  .section-title::before {{
    content: '';
    display: inline-block;
    width: 4px;
    height: 13px;
    background-color: #2563eb;
    border-radius: 2px;
  }}

  /* KPI Grid */
  .kpi-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 12px;
  }}

  .kpi-card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    position: relative;
    overflow: hidden;
  }}

  .kpi-card::after {{
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
  }}

  .kpi-card.blue::after {{ background-color: #2563eb; }}
  .kpi-card.teal::after {{ background-color: #0d9488; }}
  .kpi-card.purple::after {{ background-color: #8b5cf6; }}
  .kpi-card.amber::after {{ background-color: #f59e0b; }}

  .kpi-label {{
    font-size: 9px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 3px;
  }}

  .kpi-value {{
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
  }}

  .kpi-subtext {{
    font-size: 8.5px;
    color: #94a3b8;
    margin-top: 1px;
  }}

  /* Tables */
  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5px;
    margin-bottom: 12px;
  }}

  th {{
    background: #1e293b;
    color: #ffffff;
    font-weight: 600;
    text-align: right;
    padding: 5px 7px;
    font-size: 9px;
  }}

  th:first-child {{
    text-align: left;
    border-top-left-radius: 6px;
  }}

  th:last-child {{
    border-top-right-radius: 6px;
  }}

  td {{
    padding: 4.5px 7px;
    border-bottom: 1px solid #e2e8f0;
    text-align: right;
  }}

  td:first-child {{
    text-align: left;
    font-weight: 600;
    color: #1e293b;
  }}

  tr:nth-child(even) td {{
    background-color: #f8fafc;
  }}

  tr.total-row td {{
    background-color: #eff6ff !important;
    font-weight: 700;
    color: #1d4ed8;
    border-top: 2px solid #93c5fd;
    border-bottom: 2px solid #93c5fd;
  }}

  .chart-box {{
    margin-bottom: 10px;
  }}

  .chart-box svg {{
    max-height: 340px;
    width: 100%;
    height: auto;
  }}

  .chart-row {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }}

  .chart-row svg {{
    max-height: 270px;
    width: 100%;
    height: auto;
  }}

  .alert-box {{
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-left: 4px solid #16a34a;
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 9.5px;
    color: #166534;
    margin-bottom: 10px;
  }}

  .alert-box.info {{
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #0284c7;
    color: #0f172a;
  }}

  .split-columns {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }}

  .feature-card {{
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
  }}

  .feature-card h4 {{
    font-size: 11px;
    color: #0f172a;
    margin-bottom: 6px;
    font-weight: 700;
  }}

  .feature-card ul {{
    list-style: none;
    padding-left: 0;
  }}

  .feature-card li {{
    position: relative;
    padding-left: 12px;
    margin-bottom: 5px;
    font-size: 9.5px;
    color: #475569;
    line-height: 1.35;
  }}

  .feature-card li::before {{
    content: '•';
    position: absolute;
    left: 2px;
    color: #2563eb;
    font-weight: bold;
  }}

  .page-container {{
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  .page-break {{
    page-break-before: always;
  }}

  .footer-note {{
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 8.5px;
    color: #94a3b8;
  }}
</style>
</head>
<body>

  <!-- ==================== PÁGINA 1 ==================== -->
  <div class="page-container">
    <div>
      <div class="header-container">
        <div>
          <div class="brand-title">Estilo Apple SJ</div>
          <div class="brand-subtitle">Auditoría Operativa de Mensajería & Proyección Financiera</div>
        </div>
        <div class="report-meta">
          <span class="meta-tag">Período: Abr 2026 - Sep 2026</span><br>
          <strong>Generado:</strong> 30 de Septiembre de 2026<br>
          <strong>Dólar Tarjeta:</strong> $2.008,50 ARS | <strong>Tarifa Meta:</strong> $0,026 USD/msg
        </div>
      </div>

      <!-- KPI CARDS -->
      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-label">Volumen Total</div>
          <div class="kpi-value">102.794</div>
          <div class="kpi-subtext">Prom: 17.132 msgs/mes</div>
        </div>
        <div class="kpi-card teal">
          <div class="kpi-label">Entrantes (Clientes)</div>
          <div class="kpi-value">48.712</div>
          <div class="kpi-subtext">47,4% tráfico (8.119 /m)</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-label">Salientes Agentes</div>
          <div class="kpi-value">33.357</div>
          <div class="kpi-subtext">61,7% salientes (5.560 /m)</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-label">Salientes Bot / IA</div>
          <div class="kpi-value">20.725</div>
          <div class="kpi-subtext">38,3% salientes (3.454 /m)</div>
        </div>
      </div>

      <!-- TABLA HISTÓRICA COMPLETA -->
      <div class="section-title">1. Resumen Estadístico Mes a Mes (Últimos 6 Meses)</div>
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Total Msgs</th>
            <th>Entrantes (In)</th>
            <th>Salientes (Out)</th>
            <th>Bot / IA (Out)</th>
            <th>Agente (Out)</th>
            <th>% Bot</th>
            <th>% Agente</th>
            <th>Contactos Activos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Abril 2026</td>
            <td>17.156</td>
            <td>7.869</td>
            <td>9.287</td>
            <td>3.904</td>
            <td>5.383</td>
            <td>42,0%</td>
            <td>58,0%</td>
            <td>2.436</td>
          </tr>
          <tr>
            <td>Mayo 2026 (Hot Sale)</td>
            <td>19.057</td>
            <td>8.788</td>
            <td>10.269</td>
            <td>4.518</td>
            <td>5.751</td>
            <td>44,0%</td>
            <td>56,0%</td>
            <td>3.034</td>
          </tr>
          <tr>
            <td>Junio 2026</td>
            <td>17.230</td>
            <td>7.763</td>
            <td>9.467</td>
            <td>4.267</td>
            <td>5.200</td>
            <td>45,1%</td>
            <td>54,9%</td>
            <td>3.038</td>
          </tr>
          <tr>
            <td>Julio 2026</td>
            <td>17.657</td>
            <td>9.214</td>
            <td>8.443</td>
            <td>2.455</td>
            <td>5.988</td>
            <td>29,1%</td>
            <td>70,9%</td>
            <td>2.387</td>
          </tr>
          <tr>
            <td>Agosto 2026</td>
            <td>16.227</td>
            <td>8.154</td>
            <td>8.073</td>
            <td>2.673</td>
            <td>5.400</td>
            <td>33,1%</td>
            <td>66,9%</td>
            <td>2.370</td>
          </tr>
          <tr>
            <td>Septiembre 2026</td>
            <td>15.467</td>
            <td>6.924</td>
            <td>8.543</td>
            <td>2.908</td>
            <td>5.635</td>
            <td>34,0%</td>
            <td>66,0%</td>
            <td>2.300</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL SEMESTRE</td>
            <td>102.794</td>
            <td>48.712</td>
            <td>54.082</td>
            <td>20.725</td>
            <td>33.357</td>
            <td>38,3%</td>
            <td>61,7%</td>
            <td>15.565</td>
          </tr>
          <tr style="background:#f1f5f9; font-weight:600; color:#334155;">
            <td>PROMEDIO MENSUAL</td>
            <td>17.132</td>
            <td>8.119</td>
            <td>9.014</td>
            <td>3.454</td>
            <td>5.560</td>
            <td>38,3%</td>
            <td>61,7%</td>
            <td>2.594</td>
          </tr>
        </tbody>
      </table>

      <!-- GRAFICO DE LINEAS -->
      <div class="section-title">2. Curva de Tendencia y Comportamiento Temporal</div>
      <div class="chart-box">
        {svg_lineas}
      </div>
    </div>

    <div class="footer-note">
      <span>Estilo Apple SJ • Patio San Ignacio, Local 7 • San Juan, Argentina</span>
      <span>Página 1 de 3 • Documento de Uso Gerencial</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 2 ==================== -->
  <div class="page-break"></div>
  <div class="page-container">
    <div>
      <div class="header-container">
        <div>
          <div class="brand-title">Estilo Apple SJ — Dinámica y Distribución del Canal</div>
          <div class="brand-subtitle">Comparativa de Tráfico y Auditoría de Conversación</div>
        </div>
        <div class="report-meta">
          <strong>Período:</strong> Abril - Septiembre 2026<br>
          Canal Centralizado WhatsApp
        </div>
      </div>

      <!-- GRAFICOS DE TORTA -->
      <div class="section-title">3. Distribución General del Flujo de Conversación</div>
      <div class="chart-row">
        <div>{svg_pie_in_out}</div>
        <div>{svg_pie_bot_agent}</div>
      </div>

      <!-- DESGLOSE CUALITATIVO -->
      <div class="section-title">4. Análisis Cualitativo: Dinámica Bot / IA vs. Agentes Comerciales</div>
      <div class="split-columns">
        <div class="feature-card">
          <h4 style="color:#2563eb;">🤖 Rol del Bot de Inteligencia Artificial (38,3% Salientes)</h4>
          <ul>
            <li><strong>Contención y Calificación Instantánea:</strong> Responde en menos de 3 segundos, solicitando el nombre del cliente y categorizando la intención (Compra, Consulta, Canje, Taller).</li>
            <li><strong>Entrega Automatizada de Catálogo:</strong> Provee el enlace de Google Sheets de stock actualizado ante consultas recurrentes de precio de modelos.</li>
            <li><strong>Filtro Excluyente de Plan Canje:</strong> Aplica la política comercial de tomar únicamente equipos a partir del iPhone 13 en adelante e invita al local para revisión.</li>
            <li><strong>Derivación a Soporte:</strong> Redirige consultas de servicio técnico y reparaciones al local físico (Patio San Ignacio, Local 7).</li>
          </ul>
        </div>
        <div class="feature-card">
          <h4 style="color:#8b5cf6;">👤 Rol de los Asesores Humanos (61,7% Salientes)</h4>
          <ul>
            <li><strong>Toma de Posta Personalizada:</strong> Presentación formal de Nahuel, Cristofer, Agos o Edu tras la pausa del bot ("Hola! Soy..., te estuvo respondiendo el bot").</li>
            <li><strong>Cotización de Diferencias y Equipos:</strong> Envío de cotizaciones precisas en USD billete y conversión a Pesos, estado de batería y detalles cosméticos de usados.</li>
            <li><strong>Cobranzas y Medios de Pago:</strong> Envío de botones de pago de Mercado Pago (mpago.li), CBU/Alias bancarios y esquemas en cuotas con Tarjeta Naranja/bancarias.</li>
            <li><strong>Audios y Multimedia:</strong> Envío de notas de voz explicativas y fotos de equipos listos para retiro en el taller técnico.</li>
          </ul>
        </div>
      </div>

      <div class="alert-box">
        <strong>Conclusión Operativa:</strong> El Bot absorbe eficientemente la fricción de apertura y consulta de precios fría (evitando saturar al equipo con preguntas de catálogo), permitiendo que los agentes humanos concentren el 61,7% de sus respuestas exclusivamente en el cierre comercial, cotización final y cobranza.
      </div>
    </div>

    <div class="footer-note">
      <span>Estilo Apple SJ • Patio San Ignacio, Local 7 • San Juan, Argentina</span>
      <span>Página 2 de 3 • Documento de Uso Gerencial</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 3 ==================== -->
  <div class="page-break"></div>
  <div class="page-container">
    <div>
      <div class="header-container">
        <div>
          <div class="brand-title">Estilo Apple SJ — Proyección Financiera WhatsApp</div>
          <div class="brand-subtitle">Simulación de Costo Nuevo Sistema (Octubre 2026)</div>
        </div>
        <div class="report-meta">
          <strong>Vigencia:</strong> Octubre 2026<br>
          <strong>Dólar Tarjeta:</strong> $2.008,50 ARS | <strong>Tarifa:</strong> $0,026 USD/msg
        </div>
      </div>

      <div class="alert-box info">
        <strong>Modelo de Costeo:</strong> Con el inicio del nuevo esquema tarifario de WhatsApp en Octubre facturando a <strong>$0,026 USD por mensaje saliente</strong>, se modela el presupuesto mensual requerido manteniendo el ritmo de respuesta actual (<strong>9.014 mensajes salientes/mes</strong>) convertido al tipo de cambio <strong>Dólar Tarjeta de $2.008,50 ARS</strong>.
      </div>

      <!-- TABLA DE COSTOS -->
      <div class="section-title">5. Proyección Presupuestaria de Mensajería Saliente</div>
      <table>
        <thead>
          <tr>
            <th>Segmento de Salida</th>
            <th>Promedio Mensual msgs</th>
            <th>Tarifa Unitaria</th>
            <th>Costo Mensual (USD)</th>
            <th>Costo Mensual (ARS)</th>
            <th>Participación Gasto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Intervención de Agentes Humanos</td>
            <td>5.560 msgs</td>
            <td>$0,026 USD</td>
            <td>$144,55 USD</td>
            <td>$290.319 ARS</td>
            <td>61,7%</td>
          </tr>
          <tr>
            <td>Respuestas Automatizadas Bot / IA</td>
            <td>3.454 msgs</td>
            <td>$0,026 USD</td>
            <td>$89,81 USD</td>
            <td>$180.380 ARS</td>
            <td>38,3%</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL MENSUAL ESTIMADO</td>
            <td>9.014 msgs</td>
            <td>$0,026 USD</td>
            <td>$234,36 USD/mes</td>
            <td>$470.699 ARS/mes</td>
            <td>100,0%</td>
          </tr>
          <tr style="background:#fef2f2; font-weight:700; color:#b91c1c;">
            <td>PROYECCIÓN SEMESTRAL (6 MESES)</td>
            <td>54.082 msgs</td>
            <td>$0,026 USD</td>
            <td>$1.406,13 USD</td>
            <td>$2.824.216 ARS</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>

      <!-- GRAFICO BARRAS DE COSTO -->
      <div class="section-title">6. Evolución del Gasto Mensual (Split Bot vs. Agente)</div>
      <div class="chart-box">
        {svg_barras_costo}
      </div>

      <!-- RECOMENDACIONES DE OPTIMIZACIÓN -->
      <div class="section-title">7. Plan de Acción y Optimización para Reducción de Costos</div>
      <div class="split-columns">
        <div class="feature-card">
          <h4 style="color:#059669;">💡 Ahorro Inmediato: Unificación de Burbujas</h4>
          <ul>
            <li><strong>Diagnóstico:</strong> Los vendedores envían ráfagas de 3 a 5 mensajes breves consecutivos (saludo, presentación, foto, precio). Cada burbuja factura $0,026 USD ($52,22 ARS).</li>
            <li><strong>Acción recomendada:</strong> Unificar mensaje en una respuesta estructurada con viñetas. Reduce un <strong>35% a 40% el volumen saliente de agentes</strong>, ahorrando más de <strong>$110.000 ARS/mes</strong> (~$55 USD/mes).</li>
          </ul>
        </div>
        <div class="feature-card">
          <h4 style="color:#0284c7;">⚙️ Filtro de Despedida en Bot</h4>
          <ul>
            <li><strong>Regla de Corte:</strong> Si el cliente solo envía un agradecimiento o emoji de cortesía final ("gracias", "dale", "👍"), pausar respuestas automáticas para evitar un mensaje de despedida extra con costo.</li>
            <li><strong>Cómputo por Sesión 24h:</strong> Si Meta factura por ventana de conversación (2.594 clientes únicos/mes), el costo se reduce a solo <strong>$67,44 USD/mes ($135.461 ARS/mes)</strong>.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="footer-note">
      <span>Estilo Apple SJ • Informe Técnico de Mensajería & Proyección Económica</span>
      <span>Página 3 de 3 • Confidencial - Uso Interno</span>
    </div>
  </div>

</body>
</html>
"""

html_file = os.path.join(workspace_dir, 'informe_mensajeria_temp.html')
pdf_workspace_file = os.path.join(workspace_dir, 'Informe_Mensajeria_WhatsApp_EstiloApple.pdf')
pdf_artifact_file = os.path.join(artifact_dir, 'Informe_Mensajeria_WhatsApp_EstiloApple.pdf')

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

edge_bin = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

cmd = [
    edge_bin,
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw',
    f'--print-to-pdf={pdf_workspace_file}',
    f'file:///{html_file.replace(os.sep, "/")}'
]

res = subprocess.run(cmd, capture_output=True, text=True)

if os.path.exists(pdf_workspace_file):
    shutil.copy2(pdf_workspace_file, pdf_artifact_file)
    print("PDF generado con exito. Tamanio:", os.path.getsize(pdf_workspace_file))

if os.path.exists(html_file):
    os.remove(html_file)
