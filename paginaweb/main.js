/**
 * ESTILO APPLE SJ - Core Application Logic
 * Apple-Inspired Digital Storefront & Trade-In Simulator
 */

import CONFIG from '../config.js';
import { advisorUI } from './advisor-ui.js';

// Global State
let currentDollarRate = 1485.0; // Fallback or Supabase fetched
let activeFilter = 'all';
let searchQuery = '';
let products = [];
let filteredProducts = [];

// Real Catalog Seed from Estilo Apple SJ (Catálogo.xlsx)
const SEED_PRODUCTS = [
  {
    id: 'ip16pm',
    model: 'iPhone 16 Pro Max',
    series: '16',
    condition: 'used',
    conditionLabel: 'Usado Selección (98% Batería)',
    basePriceUsd: 1230,
    capacities: ['256GB', '512GB', '1TB'],
    capacityPrices: { '256GB': 1230, '512GB': 1380, '1TB': 1550 },
    colors: [
      { name: 'Titanio Desierto', hex: '#d4bda8', active: true },
      { name: 'Titanio Natural', hex: '#c2b8a3' },
      { name: 'Titanio Negro', hex: '#2b2b2e' },
      { name: 'Titanio Blanco', hex: '#f2f2f4' }
    ],
    image: '/iphone16pro.jpg',
    battery: '98%',
    description: 'Chip A18 Pro, Botón de Control de Cámara, Pantalla 6.9" ProMotion 120Hz.',
    featured: true
  },
  {
    id: 'ip16p',
    model: 'iPhone 16 Pro',
    series: '16',
    condition: 'sealed',
    conditionLabel: 'Sellado de Fábrica',
    basePriceUsd: 1100,
    capacities: ['128GB', '256GB', '512GB'],
    capacityPrices: { '128GB': 1100, '256GB': 1220, '512GB': 1390 },
    colors: [
      { name: 'Titanio Natural', hex: '#c2b8a3', active: true },
      { name: 'Titanio Desierto', hex: '#d4bda8' },
      { name: 'Titanio Negro', hex: '#2b2b2e' }
    ],
    image: '/iphone16pro.jpg',
    battery: '100% (0 ciclos)',
    description: 'Titanio Grado 5 aeroespacial, Zoom óptico 5x, Cámara Fusion 48MP.',
    featured: true
  },
  {
    id: 'ip16',
    model: 'iPhone 16',
    series: '16',
    condition: 'sealed',
    conditionLabel: 'Sellado de Fábrica',
    basePriceUsd: 910,
    capacities: ['128GB', '256GB'],
    capacityPrices: { '128GB': 910, '256GB': 1030 },
    colors: [
      { name: 'Azul Ultramar', hex: '#406080', active: true },
      { name: 'Verde Azulado', hex: '#779990' },
      { name: 'Rosa Pastel', hex: '#e8c0c8' },
      { name: 'Negro', hex: '#222224' }
    ],
    image: '/iphone16.jpg',
    battery: '100%',
    description: 'Chip A18, Control de Cámara, Dynamic Island, Doble cámara avanzada.',
    featured: false
  },
  {
    id: 'ip15pm',
    model: 'iPhone 15 Pro Max',
    series: '15',
    condition: 'used',
    conditionLabel: 'Usado Selección (+88% Batería)',
    basePriceUsd: 950,
    capacities: ['256GB', '512GB'],
    capacityPrices: { '256GB': 950, '512GB': 1090 },
    colors: [
      { name: 'Titanio Natural', hex: '#c2b8a3', active: true },
      { name: 'Titanio Azul', hex: '#39424e' },
      { name: 'Titanio Negro', hex: '#2c2c2f' }
    ],
    image: '/iphone15pro.webp',
    battery: '88% - 94%',
    description: 'Chip A17 Pro, conector USB-C 10Gbps, Teleobjetivo periscópico 5x.',
    featured: true
  },
  {
    id: 'ip15',
    model: 'iPhone 15',
    series: '15',
    condition: 'used',
    conditionLabel: 'Usado Selección (+87% Batería)',
    basePriceUsd: 575,
    capacities: ['128GB', '256GB'],
    capacityPrices: { '128GB': 575, '256GB': 680 },
    colors: [
      { name: 'Negro', hex: '#222224', active: true },
      { name: 'Celeste', hex: '#b5d0e0' },
      { name: 'Amarillo', hex: '#f0e69e' }
    ],
    image: '/iphone15.jpg',
    battery: '87% - 90%',
    description: 'Dynamic Island, puerto USB-C universal, Cámara principal de 48MP.',
    featured: false
  },
  {
    id: 'ip14pm',
    model: 'iPhone 14 Pro Max',
    series: '14',
    condition: 'used',
    conditionLabel: 'Usado Grado A+ (100% Batería)',
    basePriceUsd: 720,
    capacities: ['128GB', '256GB'],
    capacityPrices: { '128GB': 720, '256GB': 790 },
    colors: [
      { name: 'Negro Espacial', hex: '#222224', active: true },
      { name: 'Morado Oscuro', hex: '#483c50' },
      { name: 'Plata', hex: '#e8e8ea' },
      { name: 'Oro', hex: '#fae7cf' }
    ],
    image: '/iphone14pro.webp',
    battery: '100%',
    description: 'Dynamic Island original, Pantalla Always-On, Chip A16 Bionic.',
    featured: true
  },
  {
    id: 'ip14p',
    model: 'iPhone 14 Pro',
    series: '14',
    condition: 'used',
    conditionLabel: 'Usado Selección (90% Batería)',
    basePriceUsd: 610,
    capacities: ['128GB', '256GB'],
    capacityPrices: { '128GB': 610, '256GB': 680 },
    colors: [
      { name: 'Negro Espacial', hex: '#222224', active: true },
      { name: 'Plata', hex: '#e8e8ea' }
    ],
    image: '/iphone14pro.webp',
    battery: '90%',
    description: 'ProMotion 120Hz fluida, Cámaras triples 48MP, Acero inoxidable pulido.',
    featured: false
  },
  {
    id: 'ip14',
    model: 'iPhone 14',
    series: '14',
    condition: 'used',
    conditionLabel: 'Usado Selección (87% Batería)',
    basePriceUsd: 530,
    capacities: ['128GB', '256GB'],
    capacityPrices: { '128GB': 530, '256GB': 570 },
    colors: [
      { name: 'Azul Noche', hex: '#232f3e', active: true },
      { name: 'Celeste', hex: '#c5d8ea' },
      { name: 'Lila', hex: '#d9d2e9' }
    ],
    image: '/iphone14.jpg',
    battery: '86% - 88%',
    description: 'Modo Acción para video ultra estable, Detección de choques, Batería extendida.',
    featured: false
  },
  {
    id: 'ip13pm',
    model: 'iPhone 13 Pro Max',
    series: '13',
    condition: 'used',
    conditionLabel: 'Usado Selección (100% Batería)',
    basePriceUsd: 595,
    capacities: ['128GB', '256GB'],
    capacityPrices: { '128GB': 595, '256GB': 660 },
    colors: [
      { name: 'Azul Sierra', hex: '#9bb5ce', active: true },
      { name: 'Grafito', hex: '#403f3d' },
      { name: 'Silver', hex: '#ececed' }
    ],
    image: '/iphone13pro.webp',
    battery: '100%',
    description: 'Autonomía récord de batería, Pantalla ProMotion 120Hz, Modo Cine 4K.',
    featured: true
  },
  {
    id: 'ip13p',
    model: 'iPhone 13 Pro',
    series: '13',
    condition: 'used',
    conditionLabel: 'Usado Selección (100% Batería)',
    basePriceUsd: 550,
    capacities: ['128GB', '256GB'],
    capacityPrices: { '128GB': 550, '256GB': 610 },
    colors: [
      { name: 'Celeste Sierra', hex: '#9bb5ce', active: true },
      { name: 'Grafito', hex: '#403f3d' }
    ],
    image: '/iphone13pro.webp',
    battery: '100%',
    description: 'Fotografía Macro microscópica, Chip A15 Bionic ultra veloz.',
    featured: false
  },
  {
    id: 'ip13',
    model: 'iPhone 13',
    series: '13',
    condition: 'used',
    conditionLabel: 'Usado Selección (100% Batería)',
    basePriceUsd: 460,
    capacities: ['128GB'],
    capacityPrices: { '128GB': 460 },
    colors: [
      { name: 'Azul Noche', hex: '#1f2937', active: true },
      { name: 'Rosa', hex: '#f7d7da' },
      { name: 'Rojo', hex: '#b91c1c' }
    ],
    image: '/iphone13.jpg',
    battery: '100%',
    description: 'El iPhone más recomendado por relación precio/calidad. Cámara diagonal.',
    featured: false
  },
  {
    id: 'ip12',
    model: 'iPhone 12',
    series: '12',
    condition: 'used',
    conditionLabel: 'Usado Selección (85% Batería)',
    basePriceUsd: 330,
    capacities: ['64GB', '128GB'],
    capacityPrices: { '64GB': 290, '128GB': 330 },
    colors: [
      { name: 'Azul', hex: '#27435f', active: true },
      { name: 'Negro', hex: '#1e1e20' },
      { name: 'Blanco', hex: '#f2f2f2' }
    ],
    image: '/iphone12.jpg',
    battery: '85%+',
    description: 'Diseño de bordes planos, compatibilidad con 5G, MagSafe magnético.',
    featured: false
  },
  {
    id: 'ip11',
    model: 'iPhone 11',
    series: '11',
    condition: 'used',
    conditionLabel: 'Usado Selección (100% Batería)',
    basePriceUsd: 250,
    capacities: ['64GB', '128GB'],
    capacityPrices: { '64GB': 220, '128GB': 250 },
    colors: [
      { name: 'Negro', hex: '#1e1e20', active: true },
      { name: 'Blanco', hex: '#f2f2f2' },
      { name: 'Lila', hex: '#d1c4e9' },
      { name: 'Rojo', hex: '#d32f2f' }
    ],
    image: '/iphone11.jpg',
    battery: '100%',
    description: 'Doble cámara con Gran Angular, Modo Noche nítido, excelente autonomía.',
    featured: false
  }
];

// Valuation Table for Trade-In (Plan Canje)
const TRADE_IN_VALUATIONS = {
  'iPhone 11': { '64GB': 180, '128GB': 220, '256GB': 240 },
  'iPhone 11 Pro': { '64GB': 230, '256GB': 270, '512GB': 290 },
  'iPhone 11 Pro Max': { '64GB': 260, '256GB': 300, '512GB': 320 },
  'iPhone 12 mini': { '64GB': 220, '128GB': 250 },
  'iPhone 12': { '64GB': 250, '128GB': 290, '256GB': 320 },
  'iPhone 12 Pro': { '128GB': 350, '256GB': 390, '512GB': 420 },
  'iPhone 12 Pro Max': { '128GB': 400, '256GB': 440, '512GB': 470 },
  'iPhone 13 mini': { '128GB': 340, '256GB': 380 },
  'iPhone 13': { '128GB': 380, '256GB': 420 },
  'iPhone 13 Pro': { '128GB': 460, '256GB': 500, '512GB': 540 },
  'iPhone 13 Pro Max': { '128GB': 510, '256GB': 550, '512GB': 590 },
  'iPhone 14': { '128GB': 440, '256GB': 480 },
  'iPhone 14 Plus': { '128GB': 470, '256GB': 510 },
  'iPhone 14 Pro': { '128GB': 540, '256GB': 590, '512GB': 640 },
  'iPhone 14 Pro Max': { '128GB': 630, '256GB': 680, '512GB': 730 },
  'iPhone 15': { '128GB': 500, '256GB': 560 },
  'iPhone 15 Plus': { '128GB': 540, '256GB': 600 },
  'iPhone 15 Pro': { '128GB': 670, '256GB': 730, '512GB': 800 },
  'iPhone 15 Pro Max': { '256GB': 800, '512GB': 880, '1TB': 960 }
};

// Formatters
const formatUsd = (num) => `$${Math.round(num).toLocaleString('en-US')}`;
const formatArs = (num) => `$${Math.round(num).toLocaleString('es-AR')}`;

// Initialize App Immediately (non-blocking)
function initApp() {
  // 1. Setup Catalog and Render immediately with high fidelity seed data
  products = [...SEED_PRODUCTS];
  filteredProducts = [...products];
  renderProducts();

  // 2. Setup Listeners and Interactive Widgets
  setupNavigation();
  setupScrollVideoKeynote();
  setupFilters();
  setupSearch();
  setupTradeInCalculator();
  setupFaq();

  // 3. Inicializar Asesor Online IA
  advisorUI.init();
  window.advisorUI = advisorUI;

  // 4. Try to sync with Supabase in the background without blocking UI
  fetchLiveContext();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

async function fetchLiveContext() {
  try {
    if (window.supabase && CONFIG && CONFIG.supabase) {
      const client = window.supabase.createClient(
        CONFIG.supabase.url,
        CONFIG.supabase.anonKey
      );

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase request timeout')), 2000)
      );

      const fetchPromise = client
        .from('cotizacion_dolar')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: dollarData } = await Promise.race([fetchPromise, timeoutPromise]);

      if (dollarData && dollarData.valor) {
        currentDollarRate = parseFloat(dollarData.valor);
        // Refresh pricing display with updated dollar rate
        renderProducts();
        calculateTradeIn();
      }
    }
  } catch (err) {
    console.info('Defaulting to official store financial parameters ($' + currentDollarRate + ')');
  }

  // Update dollar badge
  const dollarBadge = document.getElementById('navDollarRate');
  if (dollarBadge) {
    dollarBadge.textContent = `$${currentDollarRate.toFixed(0)}`;
  }
}

// Render Products Grid
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const countBadge = document.getElementById('stockCountBadge');

  if (countBadge) {
    countBadge.textContent = `${filteredProducts.length} modelos en stock`;
  }

  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
        <p style="font-size: 1.2rem; margin-bottom: 8px;">No encontramos modelos con ese criterio.</p>
        <p style="font-size: 0.9rem;">Probá buscando por serie (ej: "15 Pro") o condición.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(p => {
    const activeColor = p.colors.find(c => c.active) || p.colors[0];
    const activeCapacity = p.capacities[0];
    const priceUsd = p.capacityPrices[activeCapacity] || p.basePriceUsd;
    const priceArs = priceUsd * currentDollarRate;
    const cuotas3 = Math.round((priceArs * 1.22) / 3);

    return `
      <div class="product-card" data-id="${p.id}" data-capacity="${activeCapacity}">
        <span class="product-badge-condition ${p.condition === 'sealed' ? 'badge-sealed' : 'badge-used'}">
          ${p.conditionLabel}
        </span>

        <div class="product-image-container">
          <img src="${p.image}" alt="${p.model}" class="product-image" loading="lazy" />
        </div>

        <!-- Color Swatches -->
        <div class="swatch-group">
          ${p.colors.map((c, idx) => `
            <span class="color-dot ${idx === 0 ? 'active' : ''}" 
                  style="background-color: ${c.hex};" 
                  title="${c.name}"
                  onclick="selectColor('${p.id}', '${c.name}', this)">
            </span>
          `).join('')}
        </div>
        <div class="color-label-preview" id="color-label-${p.id}">
          ${activeColor.name}
        </div>

        <h3 class="product-model-name">${p.model}</h3>

        <!-- Capacity Selector -->
        <div class="capacity-row">
          ${p.capacities.map((cap, idx) => `
            <button class="capacity-pill ${idx === 0 ? 'active' : ''}" 
                    onclick="selectCapacity('${p.id}', '${cap}', this)">
              ${cap}
            </button>
          `).join('')}
        </div>

        <!-- Price Display -->
        <div class="product-pricing">
          <div class="price-usd" id="price-usd-${p.id}">${formatUsd(priceUsd)}</div>
          <div class="price-ars" id="price-ars-${p.id}">≈ ${formatArs(priceArs)} ARS</div>
          <div class="installments-info">3 cuotas de ${formatArs(cuotas3)}</div>

          <button class="btn-card-whatsapp" onclick="orderViaWhatsApp('${p.id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/>
            </svg>
            Consultar Disponibilidad
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Window actions for color and capacity
window.selectColor = function(productId, colorName, element) {
  const card = element.closest('.product-card');
  if (!card) return;

  const dots = card.querySelectorAll('.color-dot');
  dots.forEach(d => d.classList.remove('active'));
  element.classList.add('active');

  const label = document.getElementById(`color-label-${productId}`);
  if (label) {
    label.textContent = colorName;
  }
};

window.selectCapacity = function(productId, capacity, element) {
  const card = element.closest('.product-card');
  if (!card) return;

  const pills = card.querySelectorAll('.capacity-pill');
  pills.forEach(p => p.classList.remove('active'));
  element.classList.add('active');

  card.setAttribute('data-capacity', capacity);

  const product = products.find(p => p.id === productId);
  if (!product) return;

  const priceUsd = product.capacityPrices[capacity] || product.basePriceUsd;
  const priceArs = priceUsd * currentDollarRate;
  const cuotas3 = Math.round((priceArs * 1.22) / 3);

  const usdEl = document.getElementById(`price-usd-${productId}`);
  const arsEl = document.getElementById(`price-ars-${productId}`);
  const installmentsEl = card.querySelector('.installments-info');

  if (usdEl) usdEl.textContent = formatUsd(priceUsd);
  if (arsEl) arsEl.textContent = `≈ ${formatArs(priceArs)} ARS`;
  if (installmentsEl) installmentsEl.textContent = `3 cuotas de ${formatArs(cuotas3)}`;
};

window.orderViaWhatsApp = function(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const card = document.querySelector(`.product-card[data-id="${productId}"]`);
  const capacity = card ? card.getAttribute('data-capacity') : product.capacities[0];
  const colorLabel = document.getElementById(`color-label-${productId}`);
  const color = colorLabel ? colorLabel.textContent.trim() : product.colors[0].name;
  const priceUsd = product.capacityPrices[capacity] || product.basePriceUsd;

  const text = encodeURIComponent(
    `¡Hola Estilo Apple SJ! 👋 Vi en la web el *${product.model}* (${capacity}) en color *${color}* a *${formatUsd(priceUsd)}*.\n¿Sigue disponible para retirar o enviar? ¡Gracias!`
  );

  window.open(`https://api.whatsapp.com/send/?phone=5492643229503&text=${text}&type=phone_number&app_absent=0`, '_blank');
};

// Filter pills logic
function setupFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      activeFilter = btn.getAttribute('data-filter');
      applyFilters();
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById('catalogSearchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    applyFilters();
  });
}

function applyFilters() {
  filteredProducts = products.filter(p => {
    // Category Filter
    let matchesCategory = true;
    if (activeFilter === '16') matchesCategory = p.series === '16';
    else if (activeFilter === '15') matchesCategory = p.series === '15';
    else if (activeFilter === '14') matchesCategory = p.series === '14';
    else if (activeFilter === '13') matchesCategory = p.series === '13';
    else if (activeFilter === 'sealed') matchesCategory = p.condition === 'sealed';
    else if (activeFilter === 'used') matchesCategory = p.condition === 'used';

    // Search Query
    let matchesSearch = true;
    if (searchQuery) {
      matchesSearch = p.model.toLowerCase().includes(searchQuery) ||
                      p.description.toLowerCase().includes(searchQuery) ||
                      p.colors.some(c => c.name.toLowerCase().includes(searchQuery));
    }

    return matchesCategory && matchesSearch;
  });

  renderProducts();
}

// Plan Canje Trade-In Calculator
function setupTradeInCalculator() {
  const userModelSelect = document.getElementById('calcUserModel');
  const userCapSelect = document.getElementById('calcUserCapacity');
  const userBatterySelect = document.getElementById('calcUserBattery');
  const targetModelSelect = document.getElementById('calcTargetModel');

  if (!userModelSelect || !userCapSelect || !targetModelSelect) return;

  // Populate Current Models
  userModelSelect.innerHTML = Object.keys(TRADE_IN_VALUATIONS).map(m => `
    <option value="${m}">${m}</option>
  `).join('');

  // Populate Target Models
  targetModelSelect.innerHTML = products.map(p => `
    <option value="${p.id}">${p.model} (${p.capacities[0]}) - ${formatUsd(p.basePriceUsd)}</option>
  `).join('');

  // Update capacities when current model changes
  userModelSelect.addEventListener('change', () => {
    updateTradeInCapacities();
    calculateTradeIn();
  });

  userCapSelect.addEventListener('change', calculateTradeIn);
  if (userBatterySelect) userBatterySelect.addEventListener('change', calculateTradeIn);
  targetModelSelect.addEventListener('change', calculateTradeIn);

  // Initial calculation
  updateTradeInCapacities();
  calculateTradeIn();
}

function updateTradeInCapacities() {
  const userModelSelect = document.getElementById('calcUserModel');
  const userCapSelect = document.getElementById('calcUserCapacity');
  if (!userModelSelect || !userCapSelect) return;

  const model = userModelSelect.value;
  const caps = TRADE_IN_VALUATIONS[model] ? Object.keys(TRADE_IN_VALUATIONS[model]) : ['128GB'];

  userCapSelect.innerHTML = caps.map(c => `
    <option value="${c}">${c}</option>
  `).join('');
}

function calculateTradeIn() {
  const userModel = document.getElementById('calcUserModel').value;
  const userCap = document.getElementById('calcUserCapacity').value;
  const userBattery = document.getElementById('calcUserBattery') ? document.getElementById('calcUserBattery').value : 'high';
  const targetId = document.getElementById('calcTargetModel').value;

  // Calculate Trade-in Value
  let baseValuation = (TRADE_IN_VALUATIONS[userModel] && TRADE_IN_VALUATIONS[userModel][userCap]) || 200;
  
  // Health Multiplier
  let multiplier = 1.0;
  if (userBattery === 'mid') multiplier = 0.92;
  if (userBattery === 'low') multiplier = 0.85;

  const estimatedTradeVal = Math.round(baseValuation * multiplier);

  // Target Price
  const targetProduct = products.find(p => p.id === targetId) || products[0];
  const targetPrice = targetProduct.basePriceUsd;

  // Net difference
  const differenceUsd = Math.max(0, targetPrice - estimatedTradeVal);
  const differenceArs = differenceUsd * currentDollarRate;

  // Update UI Elements
  document.getElementById('calcYourTradeVal').textContent = formatUsd(estimatedTradeVal);
  document.getElementById('calcTargetPriceVal').textContent = formatUsd(targetPrice);
  document.getElementById('calcDiffAmount').textContent = formatUsd(differenceUsd);
  document.getElementById('calcDiffArs').textContent = `≈ ${formatArs(differenceArs)} ARS`;

  // Update CTA WhatsApp text
  const submitBtn = document.getElementById('btnSubmitTradeIn');
  if (submitBtn) {
    submitBtn.onclick = () => {
      const msg = encodeURIComponent(
        `¡Hola Estilo Apple SJ! 🚀 Quiero cotizar mi Plan Canje:\n- Entrego: *${userModel} ${userCap}* (Batería ${userBattery === 'high' ? '+90%' : userBattery === 'mid' ? '85-89%' : '80-84%'})\n- Busco llevarme: *${targetProduct.model}*\n- Diferencia estimada: *${formatUsd(differenceUsd)}*.\n¿Cómo coordinamos la revisión del equipo en San Juan?`
      );
      window.open(`https://api.whatsapp.com/send/?phone=5492643229503&text=${msg}&type=phone_number&app_absent=0`, '_blank');
    };
  }
}

// FAQ Accordion
function setupFaq() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-answer').style.maxHeight = null;
      });

      if (!isActive) {
        item.classList.add('active');
        const answer = item.querySelector('.faq-answer');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

// Navigation & Smooth Scroll
function setupNavigation() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isVisible = window.getComputedStyle(navLinks).display !== 'none';
      navLinks.style.display = isVisible ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '64px';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = 'var(--bg-glass-nav)';
      navLinks.style.padding = '24px';
      navLinks.style.borderBottom = '1px solid var(--border-subtle)';
    });
  }
}

// ==========================================================================
// SCROLL-TRIGGERED KEYNOTE VIDEO SCRUBBER (Mobile-First Full Background Video)
// ==========================================================================

function setupScrollVideoKeynote() {
  const heroSection = document.getElementById('jobyHeroSection');
  const video1 = document.getElementById('jobyVideo1');
  const video2 = document.getElementById('jobyVideo2');
  const video3 = document.getElementById('jobyVideo3');
  const titleBox = document.getElementById('jobyHeroTitleBox');
  const slides = document.querySelectorAll('.joby-slide-item');
  const progressFill = document.getElementById('jobyProgressFill');
  const phaseLabel = document.getElementById('jobyPhaseLabel');

  if (!heroSection || !video1 || !video2 || !video3) return;

  // 1. Initial video setup - Prime all 3 videos for instant playback
  [video1, video2, video3].forEach((v, idx) => {
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.currentTime = 0.05;
    if (idx === 0) {
      v.play().catch(() => {});
    }
  });

  // Mobile audio/interaction unlock
  let hasPrimed = false;
  const primeMobile = () => {
    if (hasPrimed) return;
    hasPrimed = true;
    [video1, video2, video3].forEach(v => {
      try {
        const p = v.play();
        if (p !== undefined) {
          p.then(() => v.pause()).catch(() => {});
        }
      } catch (e) {}
    });
    window.removeEventListener('touchstart', primeMobile);
    window.removeEventListener('scroll', primeMobile);
  };
  window.addEventListener('touchstart', primeMobile, { passive: true });
  window.addEventListener('scroll', primeMobile, { passive: true });

  let targetProgress = 0;
  let currentProgress = 0;
  const LERP_FACTOR = 0.14; // Smooth fluid Joby easing

  function calculateProgress() {
    const rect = heroSection.getBoundingClientRect();
    const totalScrollable = heroSection.offsetHeight - window.innerHeight;
    const currentScroll = -rect.top;
    const rawProgress = currentScroll / Math.max(1, totalScrollable);
    targetProgress = Math.max(0, Math.min(1, rawProgress));
  }

  window.addEventListener('scroll', calculateProgress, { passive: true });
  window.addEventListener('resize', calculateProgress, { passive: true });
  calculateProgress();

  // Scrollytelling Phase Labels
  const PHASES = [
    { threshold: 0.30, label: '01 / CÁMARA FUSION 48MP & ZOOM 5X' },
    { threshold: 0.49, label: '02 / TITANIO GRADO 5 & USB-C 10 GB/S' },
    { threshold: 0.68, label: '03 / PANTALLA SUPER RETINA XDR & PROMOTION' },
    { threshold: 0.85, label: '04 / LABORATORIO TÉCNICO & MICROELECTRÓNICA' },
    { threshold: 1.01, label: '05 / GARANTÍA ESCRITA & SERVICIO EN SAN JUAN' }
  ];

  // 2. Animation loop
  function scrubLoop() {
    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) > 0.0002) {
      currentProgress += diff * LERP_FACTOR;
    } else {
      currentProgress = targetProgress;
    }

    // A. Crossfade & Scrub Videos (3 Videos sequence: 0-31% -> 31-68% -> 68-100%)
    const T1 = 0.31;
    const T2 = 0.68;

    if (currentProgress < T1) {
      if (!video1.classList.contains('active')) {
        video1.classList.add('active');
        video2.classList.remove('active');
        video3.classList.remove('active');
      }

      const p1 = currentProgress / T1;
      const duration1 = video1.duration || 9.0;
      const targetTime1 = Math.min(duration1 - 0.05, Math.max(0.01, p1 * duration1));

      if (Math.abs(video1.currentTime - targetTime1) > 0.03) {
        video1.currentTime = targetTime1;
      }
    } else if (currentProgress < T2) {
      if (!video2.classList.contains('active')) {
        video2.classList.add('active');
        video1.classList.remove('active');
        video3.classList.remove('active');
      }

      const p2 = (currentProgress - T1) / (T2 - T1);
      const duration2 = video2.duration || 9.0;
      const targetTime2 = Math.min(duration2 - 0.05, Math.max(0.01, p2 * duration2));

      if (Math.abs(video2.currentTime - targetTime2) > 0.03) {
        video2.currentTime = targetTime2;
      }
    } else {
      if (!video3.classList.contains('active')) {
        video3.classList.add('active');
        video1.classList.remove('active');
        video2.classList.remove('active');
      }

      const p3 = (currentProgress - T2) / (1 - T2);
      const duration3 = video3.duration || 10.0;
      const targetTime3 = Math.min(duration3 - 0.05, Math.max(0.01, p3 * duration3));

      if (Math.abs(video3.currentTime - targetTime3) > 0.03) {
        video3.currentTime = targetTime3;
      }
    }

    // B. Hero Title Box Fade-out (Joby "Skip traffic" pattern)
    if (titleBox) {
      if (currentProgress < 0.10) {
        const titleOpacity = 1 - (currentProgress / 0.10);
        const titleY = -(currentProgress / 0.10) * 35;
        titleBox.style.opacity = titleOpacity.toFixed(3);
        titleBox.style.transform = `translateY(${titleY.toFixed(1)}px)`;
        titleBox.style.pointerEvents = 'auto';
      } else {
        titleBox.style.opacity = '0';
        titleBox.style.pointerEvents = 'none';
      }
    }

    // C. Scrollytelling Slides Crossfade
    slides.forEach(slide => {
      const start = parseFloat(slide.getAttribute('data-start') || '0');
      const end = parseFloat(slide.getAttribute('data-end') || '1');

      if (currentProgress >= start && currentProgress <= end) {
        const range = end - start;
        const norm = (currentProgress - start) / range;
        
        // Easing curve: 20% fade-in, 60% stay, 20% fade-out
        let opacity = 1;
        if (norm < 0.20) {
          opacity = norm / 0.20;
        } else if (norm > 0.80) {
          opacity = (1 - norm) / 0.20;
        }

        slide.style.opacity = Math.max(0, Math.min(1, opacity)).toFixed(3);
        slide.style.transform = `translateY(${(1 - opacity) * 18}px)`;
        slide.classList.add('active');
      } else {
        slide.style.opacity = '0';
        slide.style.transform = 'translateY(24px)';
        slide.classList.remove('active');
      }
    });

    // D. Progress Tracker & Phase HUD
    if (progressFill) {
      progressFill.style.width = (currentProgress * 100).toFixed(1) + '%';
    }

    if (phaseLabel) {
      const currentPhase = PHASES.find(ph => currentProgress <= ph.threshold) || PHASES[PHASES.length - 1];
      if (phaseLabel.textContent !== currentPhase.label) {
        phaseLabel.textContent = currentPhase.label;
      }
    }

    requestAnimationFrame(scrubLoop);
  }

  requestAnimationFrame(scrubLoop);
}
