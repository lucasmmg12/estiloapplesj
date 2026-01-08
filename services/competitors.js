
// ============================================
// SERVICIO DE INTELIGENCIA COMPETITIVA
// ============================================

// --- DATA MOCK ---

const MIS_COORDENADAS = [-31.5375, -68.5364]; // Centro San Juan

const COMPETITORS = [
    {
        id: 1,
        name: "iTech San Juan",
        address: "Av. Libertador 123 Oeste",
        coords: [-31.5350, -68.5410],
        adsActive: true,
        strength: "Precios bajos en pantallas",
        weakness: "Repuestos genéricos",
        score: 8.5
    },
    {
        id: 2,
        name: "Dr. Manzana",
        address: "Mendoza 456 Sur",
        coords: [-31.5420, -68.5320],
        adsActive: false,
        strength: "Taller a la vista",
        weakness: "Demora 48hs",
        score: 7.2
    },
    {
        id: 3,
        name: "FixPhone Cuyo",
        address: "Gral. Acha 789 Norte",
        coords: [-31.5310, -68.5350],
        adsActive: true,
        strength: "Servicio a domicilio",
        weakness: "Poca variedad de accesorios",
        score: 9.1
    },
    {
        id: 4,
        name: "Apple Store Fake",
        address: "Peatonal Rivadavia",
        coords: [-31.5385, -68.5290],
        adsActive: false,
        strength: "Ubicación prime",
        weakness: "Mala atención",
        score: 6.0
    }
];

const EVENTS = [
    {
        id: 'iphone16',
        name: 'Lanzamiento iPhone 16',
        date: 'Septiembre 2026',
        tactics: {
            pre: ['Tomar reservas con seña congelada', 'Sorteo de fundas anticipadas'],
            launch: ['Horario extendido 24hs', 'Live unboxing en Instagram'],
            post: ['Descuento 20% en hydrogel', 'Plan canje agresivo']
        }
    },
    {
        id: 'aguinaldo',
        name: 'Aguinaldo Junio',
        date: 'Junio 2026',
        tactics: {
            pre: ['Promoción "Invertí tu aguinaldo"', 'Combos Upgrade (Equipo + Watch)'],
            launch: ['Cuotas sin interés (absorbiendo costo)', 'Regalo seguro con compra > $500k'],
            post: ['Seguimiento a clientes interesados']
        }
    },
    {
        id: 'padre',
        name: 'Día del Padre',
        date: 'Junio 2026',
        tactics: {
            pre: ['Campaña "Papá Tecnológico"', 'Gift Cards personalizadas'],
            launch: ['Envío gratis express', 'Packaging especial de regalo'],
            post: ['Encuesta de satisfacción']
        }
    }
];

// --- LOGIC ---

let mapInitialized = false;
let mapInstance = null;

export async function initCompetitors() {
    console.log('🕵️ Iniciando Inteligencia Competitiva...');

    // 1. Rendering
    renderCompetitorCards();
    renderRankingList();
    renderEventsRadar();

    // 2. Initialize Charts & Maps (Delay slightly to ensure DOM visibility if needed)
    setTimeout(() => {
        initEventsListeners();
        // Charts and Maps are init when tab is clicked usually, but we call them here for simplicity
        // Need to handle "Tab Switch" to resize map correctly
        initChartJS();
    }, 500);

    // Watch for tab change to "competencia" to resize map
    const tabBtn = document.querySelector('[data-tab="competencia"]');
    if (tabBtn) {
        tabBtn.addEventListener('click', () => {
            setTimeout(() => {
                initMap();
            }, 300); // Wait for transition
        });
    }
}

function initMap() {
    if (mapInitialized) {
        mapInstance.invalidateSize(); // Fix gray tiles issue
        return;
    }

    const mapContainer = document.getElementById('mapCompetencia');
    if (!mapContainer) return;

    // San Juan Center
    mapInstance = L.map('mapCompetencia').setView(MIS_COORDENADAS, 14);

    // Dark Mode Tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(mapInstance);

    // My Marker
    const myIcon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#0ea5e9; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #0ea5e9;'></div>",
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    L.marker(MIS_COORDENADAS, { icon: myIcon }).addTo(mapInstance)
        .bindPopup("<b>Estilo Apple SJ (Nosotros)</b>").openPopup();

    // Influence Circle
    L.circle(MIS_COORDENADAS, {
        color: '#0ea5e9',
        fillColor: '#0ea5e9',
        fillOpacity: 0.1,
        radius: 1200
    }).addTo(mapInstance);

    // Competitors
    COMPETITORS.forEach(comp => {
        const compIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style='background-color:${comp.score > 8 ? '#ff4d4d' : '#fbbf24'}; width:12px; height:12px; border-radius:50%; border:1px solid white;'></div>`,
            iconSize: [15, 15],
            iconAnchor: [7, 7]
        });

        L.marker(comp.coords, { icon: compIcon }).addTo(mapInstance)
            .bindPopup(`<b>${comp.name}</b><br>${comp.address}`);

        L.circle(comp.coords, {
            color: '#ff4d4d',
            fillColor: '#ff4d4d',
            fillOpacity: 0.05,
            radius: 800
        }).addTo(mapInstance);
    });

    mapInitialized = true;
}

function initChartJS() {
    const ctx = document.getElementById('chartMarketShare');
    if (!ctx) return;

    // Destroy existing if any (basic check)
    if (window.marketShareChart instanceof Chart) {
        window.marketShareChart.destroy();
    }

    window.marketShareChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Estilo Apple SJ', 'iTech Juan', 'FixPhone', 'Otros'],
            datasets: [{
                data: [35, 25, 20, 20],
                backgroundColor: [
                    '#0ea5e9', // Nosotros
                    '#ef4444',
                    '#fbbf24',
                    '#64748b'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#fff', font: { family: 'Inter' } }
                }
            },
            cutout: '70%'
        }
    });
}

function renderCompetitorCards() {
    const container = document.getElementById('gridCompetidores');
    if (!container) return;
    container.innerHTML = '';

    COMPETITORS.forEach(comp => {
        const card = document.createElement('div');
        card.className = 'competitor-card';
        card.innerHTML = `
            <div class="card-top">
                <span class="comp-name">${comp.name}</span>
                <span class="ads-badge ${comp.adsActive ? 'ads-active' : 'ads-inactive'}">
                    ${comp.adsActive ? 'ADS ACTIVO' : 'ADS INACTIVO'}
                </span>
            </div>
            <div class="comp-address">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                ${comp.address}
            </div>
            <div class="swot-grid">
                <div class="swot-item">
                    <span class="swot-label swot-pro">Fortaleza</span>
                    ${comp.strength}
                </div>
                <div class="swot-item">
                    <span class="swot-label swot-con">Debilidad</span>
                    ${comp.weakness}
                </div>
            </div>
            <a href="https://www.facebook.com/ads/library/?q=${encodeURIComponent(comp.name)}" target="_blank" class="btn-ads-library">
                Ver Anuncios en Meta
            </a>
        `;
        container.appendChild(card);
    });
}

function renderRankingList() {
    const container = document.getElementById('rankingCompetencia');
    if (!container) return;

    // Sort by score
    const sorted = [...COMPETITORS, { name: "Estilo Apple SJ", score: 9.5 }].sort((a, b) => b.score - a.score);

    container.innerHTML = '';
    sorted.forEach((comp, index) => {
        const item = document.createElement('div');
        item.className = `ranking-item rank-${index + 1}`;
        item.innerHTML = `
            <div class="rank-number">${index + 1}</div>
            <div class="rank-info">
                <div class="rank-name">${comp.name}</div>
                <div style="font-size:0.8rem; color:gray;">Puntaje General</div>
            </div>
            <div class="rank-score">${comp.score}</div>
        `;
        container.appendChild(item);
    });
}

function renderEventsRadar() {
    const timeline = document.getElementById('eventsTimeline');
    if (!timeline) return;

    timeline.innerHTML = '';
    EVENTS.forEach(event => {
        const btn = document.createElement('div');
        btn.className = 'event-btn';
        btn.dataset.id = event.id;
        btn.innerHTML = `<strong>${event.name}</strong><br><span style="font-size:0.8rem; opacity:0.7">${event.date}</span>`;
        btn.onclick = () => showEventDetails(event);
        timeline.appendChild(btn);
    });
}

function showEventDetails(event) {
    const panel = document.getElementById('eventDetailsPanel');
    const btns = document.querySelectorAll('.event-btn');

    // Active class logic
    btns.forEach(b => b.classList.remove('active'));
    document.querySelector(`.event-btn[data-id="${event.id}"]`).classList.add('active');

    panel.style.display = 'block';
    panel.innerHTML = `
        <h3 style="margin-bottom:1rem; color:#fff;">Estrategia: ${event.name}</h3>
        <div class="tactic-list">
            <div class="tactic-group">
                <h4>🚀 Pre-Lanzamiento</h4>
                ${event.tactics.pre.map(t => `<div class="tactic-card">${t}</div>`).join('')}
            </div>
             <div class="tactic-group">
                <h4>🔥 Lanzamiento / Evento</h4>
                ${event.tactics.launch.map(t => `<div class="tactic-card">${t}</div>`).join('')}
            </div>
             <div class="tactic-group">
                <h4>💎 Post-Venta</h4>
                ${event.tactics.post.map(t => `<div class="tactic-card">${t}</div>`).join('')}
            </div>
        </div>
    `;
}

function initEventsListeners() {
    // Select first event by default
    if (EVENTS.length > 0) {
        showEventDetails(EVENTS[0]);
    }
}
