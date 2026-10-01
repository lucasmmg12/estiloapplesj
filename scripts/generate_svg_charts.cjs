const fs = require('fs');
const path = require('path');

const artifactDir = 'C:\\Users\\Sanatorio Argentino\\.gemini\\antigravity-ide\\brain\\db46cb9a-0480-4415-8cb8-74ce6d40dc93';

// Data
const data = [
  { mes: 'Abril', entrantes: 7869, salientes: 9287, bot: 3904, agente: 5383, total: 17156 },
  { mes: 'Mayo', entrantes: 8788, salientes: 10269, bot: 4518, agente: 5751, total: 19057 },
  { mes: 'Junio', entrantes: 7763, salientes: 9467, bot: 4267, agente: 5200, total: 17230 },
  { mes: 'Julio', entrantes: 9214, salientes: 8443, bot: 2455, agente: 5988, total: 17657 },
  { mes: 'Agosto', entrantes: 8154, salientes: 8073, bot: 2673, agente: 5400, total: 16227 },
  { mes: 'Septiembre', entrantes: 6924, salientes: 8543, bot: 2908, agente: 5635, total: 15467 }
];

// 1. Line Chart SVG
function generateLineChart() {
  const width = 850;
  const height = 440;
  const padding = { top: 50, right: 180, bottom: 60, left: 70 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const maxVal = 12000;
  const minVal = 0;

  const getX = (idx) => padding.left + (idx / (data.length - 1)) * graphWidth;
  const getY = (val) => padding.top + graphHeight - ((val - minVal) / (maxVal - minVal)) * graphHeight;

  // Paths
  const createPath = (key) => {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d[key]).toFixed(1)}`).join(' ');
  };

  const pathSalientes = createPath('salientes');
  const pathEntrantes = createPath('entrantes');
  const pathAgente = createPath('agente');
  const pathBot = createPath('bot');

  const yTicks = [0, 2000, 4000, 6000, 8000, 10000, 12000];

  let svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
  <!-- Title -->
  <text x="30" y="32" font-size="16" font-weight="700" fill="#0F172A">Evolución Mensual de Mensajes (Últimos 6 Meses)</text>
  <text x="30" y="48" font-size="12" fill="#64748B">Abril 2026 - Septiembre 2026 | Estilo Apple SJ</text>

  <!-- Y-Grid & Labels -->
  ${yTicks.map(t => `
    <line x1="${padding.left}" y1="${getY(t).toFixed(1)}" x2="${width - padding.right}" y2="${getY(t).toFixed(1)}" stroke="#F1F5F9" stroke-width="1.5" />
    <text x="${padding.left - 12}" y="${(getY(t) + 4).toFixed(1)}" text-anchor="end" font-size="11" font-weight="500" fill="#94A3B8">${t.toLocaleString()}</text>
  `).join('')}

  <!-- X-Axis Labels -->
  ${data.map((d, i) => `
    <line x1="${getX(i).toFixed(1)}" y1="${padding.top}" x2="${getX(i).toFixed(1)}" y2="${height - padding.bottom}" stroke="#F8FAFC" stroke-width="1" />
    <text x="${getX(i).toFixed(1)}" y="${height - padding.bottom + 24}" text-anchor="middle" font-size="12" font-weight="600" fill="#475569">${d.mes}</text>
  `).join('')}

  <!-- Lines -->
  <!-- Salientes -->
  <path d="${pathSalientes}" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Entrantes -->
  <path d="${pathEntrantes}" fill="none" stroke="#0D9488" stroke-width="3" stroke-dasharray="6,4" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Agente -->
  <path d="${pathAgente}" fill="none" stroke="#8B5CF6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Bot -->
  <path d="${pathBot}" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Data Points -->
  ${data.map((d, i) => `
    <!-- Salientes -->
    <circle cx="${getX(i).toFixed(1)}" cy="${getY(d.salientes).toFixed(1)}" r="5" fill="#2563EB" stroke="#ffffff" stroke-width="2" />
    <text x="${getX(i).toFixed(1)}" y="${(getY(d.salientes) - 10).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1E40AF">${d.salientes.toLocaleString()}</text>

    <!-- Entrantes -->
    <circle cx="${getX(i).toFixed(1)}" cy="${getY(d.entrantes).toFixed(1)}" r="4.5" fill="#0D9488" stroke="#ffffff" stroke-width="2" />
    
    <!-- Agente -->
    <circle cx="${getX(i).toFixed(1)}" cy="${getY(d.agente).toFixed(1)}" r="4" fill="#8B5CF6" stroke="#ffffff" stroke-width="2" />

    <!-- Bot -->
    <circle cx="${getX(i).toFixed(1)}" cy="${getY(d.bot).toFixed(1)}" r="4" fill="#F59E0B" stroke="#ffffff" stroke-width="2" />
  `).join('')}

  <!-- Legend Panel -->
  <g transform="translate(${width - padding.right + 25}, ${padding.top + 20})">
    <rect x="-10" y="-12" width="155" height="185" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
    <text x="0" y="8" font-size="11" font-weight="700" fill="#334155">MÉTRICAS</text>

    <!-- Salientes -->
    <line x1="0" y1="30" x2="22" y2="30" stroke="#2563EB" stroke-width="3" />
    <circle cx="11" cy="30" r="3.5" fill="#2563EB" />
    <text x="30" y="34" font-size="11" font-weight="600" fill="#1E293B">Total Salientes</text>
    <text x="30" y="47" font-size="10" fill="#64748B">Prom: 9,014 /m</text>

    <!-- Entrantes -->
    <line x1="0" y1="70" x2="22" y2="70" stroke="#0D9488" stroke-width="2.5" stroke-dasharray="4,2" />
    <circle cx="11" cy="70" r="3.5" fill="#0D9488" />
    <text x="30" y="74" font-size="11" font-weight="600" fill="#1E293B">Total Entrantes</text>
    <text x="30" y="87" font-size="10" fill="#64748B">Prom: 8,119 /m</text>

    <!-- Agente -->
    <line x1="0" y1="110" x2="22" y2="110" stroke="#8B5CF6" stroke-width="2.5" />
    <circle cx="11" cy="110" r="3.5" fill="#8B5CF6" />
    <text x="30" y="114" font-size="11" font-weight="600" fill="#1E293B">Agente Humano</text>
    <text x="30" y="127" font-size="10" fill="#64748B">61.7% Salientes</text>

    <!-- Bot -->
    <line x1="0" y1="150" x2="22" y2="150" stroke="#F59E0B" stroke-width="2.5" />
    <circle cx="11" cy="150" r="3.5" fill="#F59E0B" />
    <text x="30" y="154" font-size="11" font-weight="600" fill="#1E293B">Bot / AI</text>
    <text x="30" y="167" font-size="10" fill="#64748B">38.3% Salientes</text>
  </g>
</svg>
`;
  return svg.trim();
}

// 2. Pie Chart: Entrantes vs Salientes
function generatePieEntrantesSalientes() {
  const width = 450;
  const height = 320;
  const cx = 150;
  const cy = 160;
  const r = 100;

  const total = 102794;
  const entrantes = 48712;
  const salientes = 54082;

  const pctEntrantes = entrantes / total;
  const pctSalientes = salientes / total;

  const angleEntrantes = pctEntrantes * 2 * Math.PI;

  const x1 = cx + r * Math.sin(0);
  const y1 = cy - r * Math.cos(0);
  const x2 = cx + r * Math.sin(angleEntrantes);
  const y2 = cy - r * Math.cos(angleEntrantes);

  const largeArc = angleEntrantes > Math.PI ? 1 : 0;

  const pathEntrantes = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  const pathSalientes = `M ${cx} ${cy} L ${x2} ${y2} A ${r} ${r} 0 ${1 - largeArc} 1 ${x1} ${y1} Z`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
  <text x="25" y="32" font-size="15" font-weight="700" fill="#0F172A">Entrantes vs. Salientes</text>
  <text x="25" y="48" font-size="11" fill="#64748B">Total acumulado: 102,794 mensajes</text>

  <!-- Pie Slices -->
  <path d="${pathSalientes}" fill="#2563EB" stroke="#ffffff" stroke-width="2.5" />
  <path d="${pathEntrantes}" fill="#0D9488" stroke="#ffffff" stroke-width="2.5" />

  <!-- Center Hole for Donut Look -->
  <circle cx="${cx}" cy="${cy}" r="55" fill="#ffffff" />
  <text x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="14" font-weight="800" fill="#0F172A">102.8k</text>
  <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="10" fill="#64748B">TOTAL</text>

  <!-- Legend -->
  <g transform="translate(275, 105)">
    <!-- Salientes -->
    <rect x="0" y="0" width="14" height="14" rx="4" fill="#2563EB" />
    <text x="22" y="12" font-size="12" font-weight="700" fill="#1E293B">Salientes (52.6%)</text>
    <text x="22" y="27" font-size="11" fill="#64748B">54,082 msgs</text>
    <text x="22" y="41" font-size="10" fill="#94A3B8">Sujetos a costo Meta</text>

    <!-- Entrantes -->
    <rect x="0" y="60" width="14" height="14" rx="4" fill="#0D9488" />
    <text x="22" y="72" font-size="12" font-weight="700" fill="#1E293B">Entrantes (47.4%)</text>
    <text x="22" y="87" font-size="11" fill="#64748B">48,712 msgs</text>
    <text x="22" y="101" font-size="10" fill="#10B981">Sin costo (Gratis)</text>
  </g>
</svg>
`.trim();
}

// 3. Pie Chart: Bot vs Agente en Salientes
function generatePieBotAgente() {
  const width = 450;
  const height = 320;
  const cx = 150;
  const cy = 160;
  const r = 100;

  const totalSalientes = 54082;
  const bot = 20725;
  const agente = 33357;

  const pctAgente = agente / totalSalientes;
  const pctBot = bot / totalSalientes;

  const angleAgente = pctAgente * 2 * Math.PI;

  const x1 = cx + r * Math.sin(0);
  const y1 = cy - r * Math.cos(0);
  const x2 = cx + r * Math.sin(angleAgente);
  const y2 = cy - r * Math.cos(angleAgente);

  const largeArc = angleAgente > Math.PI ? 1 : 0;

  const pathAgente = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  const pathBot = `M ${cx} ${cy} L ${x2} ${y2} A ${r} ${r} 0 ${1 - largeArc} 1 ${x1} ${y1} Z`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
  <text x="25" y="32" font-size="15" font-weight="700" fill="#0F172A">Salientes: Bot vs. Agente Humano</text>
  <text x="25" y="48" font-size="11" fill="#64748B">Distribución de los 54,082 mensajes salientes</text>

  <!-- Pie Slices -->
  <path d="${pathAgente}" fill="#8B5CF6" stroke="#ffffff" stroke-width="2.5" />
  <path d="${pathBot}" fill="#F59E0B" stroke="#ffffff" stroke-width="2.5" />

  <!-- Center Hole for Donut Look -->
  <circle cx="${cx}" cy="${cy}" r="55" fill="#ffffff" />
  <text x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="14" font-weight="800" fill="#0F172A">54.1k</text>
  <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="10" fill="#64748B">SALIENTES</text>

  <!-- Legend -->
  <g transform="translate(275, 105)">
    <!-- Agente -->
    <rect x="0" y="0" width="14" height="14" rx="4" fill="#8B5CF6" />
    <text x="22" y="12" font-size="12" font-weight="700" fill="#1E293B">Agente Humano (61.7%)</text>
    <text x="22" y="27" font-size="11" fill="#64748B">33,357 msgs</text>
    <text x="22" y="41" font-size="10" fill="#64748B">Prom: 5,560 /mes</text>

    <!-- Bot -->
    <rect x="0" y="60" width="14" height="14" rx="4" fill="#F59E0B" />
    <text x="22" y="72" font-size="12" font-weight="700" fill="#1E293B">Bot / AI (38.3%)</text>
    <text x="22" y="87" font-size="11" fill="#64748B">20,725 msgs</text>
    <text x="22" y="101" font-size="10" fill="#64748B">Prom: 3,454 /mes</text>
  </g>
</svg>
`.trim();
}

// 4. Bar Chart: Cost Analysis (USD and ARS)
function generateCostChart() {
  const width = 850;
  const height = 360;
  const padding = { top: 50, right: 40, bottom: 60, left: 70 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const costData = data.map(d => {
    const usd = d.salientes * 0.026;
    const ars = usd * 2008.50;
    return {
      mes: d.mes,
      salientes: d.salientes,
      usd: usd,
      ars: ars,
      usdBot: d.bot * 0.026,
      usdAgente: d.agente * 0.026
    };
  });

  const maxUSD = 300;
  const getY = (val) => padding.top + graphHeight - (val / maxUSD) * graphHeight;
  const barWidth = 45;
  const getX = (idx) => padding.left + 35 + idx * ((graphWidth - 70) / (costData.length - 1));

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
  <text x="30" y="32" font-size="16" font-weight="700" fill="#0F172A">Simulación de Costo Mensual de WhatsApp (Tarifa 0.026 USD/msg)</text>
  <text x="30" y="48" font-size="12" fill="#64748B">Tipo de cambio aplicado: Dólar Tarjeta = $2,008.50 ARS | Split Bot vs Agente</text>

  <!-- Y-Axis Ticks -->
  ${[0, 50, 100, 150, 200, 250, 300].map(t => `
    <line x1="${padding.left}" y1="${getY(t).toFixed(1)}" x2="${width - padding.right}" y2="${getY(t).toFixed(1)}" stroke="#F1F5F9" stroke-width="1.5" />
    <text x="${padding.left - 10}" y="${(getY(t) + 4).toFixed(1)}" text-anchor="end" font-size="11" font-weight="500" fill="#94A3B8">$${t} USD</text>
  `).join('')}

  <!-- Bars (Stacked Bot + Agente) -->
  ${costData.map((d, i) => {
    const x = getX(i) - barWidth / 2;
    const botH = (d.usdBot / maxUSD) * graphHeight;
    const agenteH = (d.usdAgente / maxUSD) * graphHeight;
    const yTotal = getY(d.usd);
    const yBot = getY(d.usdBot);

    return `
      <!-- Agente segment (Top) -->
      <rect x="${x}" y="${yTotal.toFixed(1)}" width="${barWidth}" height="${agenteH.toFixed(1)}" rx="3" fill="#8B5CF6" />
      <!-- Bot segment (Bottom) -->
      <rect x="${x}" y="${(yTotal + agenteH).toFixed(1)}" width="${barWidth}" height="${botH.toFixed(1)}" rx="3" fill="#F59E0B" />

      <!-- Total Labels on top -->
      <text x="${getX(i)}" y="${(yTotal - 16).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#1E293B">$${d.usd.toFixed(1)} USD</text>
      <text x="${getX(i)}" y="${(yTotal - 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#059669">$${Math.round(d.ars / 1000)}k ARS</text>

      <!-- Month Label -->
      <text x="${getX(i)}" y="${height - padding.bottom + 22}" text-anchor="middle" font-size="12" font-weight="600" fill="#475569">${d.mes}</text>
      <text x="${getX(i)}" y="${height - padding.bottom + 36}" text-anchor="middle" font-size="10" fill="#94A3B8">${d.salientes.toLocaleString()} msgs</text>
    `;
  }).join('')}

  <!-- Legend -->
  <g transform="translate(${width - 240}, 24)">
    <rect x="0" y="0" width="12" height="12" rx="3" fill="#8B5CF6" />
    <text x="18" y="10" font-size="11" font-weight="600" fill="#334155">Agentes (USD)</text>
    <rect x="110" y="0" width="12" height="12" rx="3" fill="#F59E0B" />
    <text x="128" y="10" font-size="11" font-weight="600" fill="#334155">Bot AI (USD)</text>
  </g>
</svg>
  `.trim();
}

fs.writeFileSync(path.join(artifactDir, 'grafico_lineas_mensajes.svg'), generateLineChart());
fs.writeFileSync(path.join(artifactDir, 'grafico_torta_entrantes_salientes.svg'), generatePieEntrantesSalientes());
fs.writeFileSync(path.join(artifactDir, 'grafico_torta_bot_vs_agente.svg'), generatePieBotAgente());
fs.writeFileSync(path.join(artifactDir, 'grafico_barras_costos.svg'), generateCostChart());

console.log('✅ SVGs generados correctamente en el directorio de artefactos.');
