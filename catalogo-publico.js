// Catálogo Público - JavaScript
import CONFIG from './config.js';

// Configuración de Supabase
const SUPABASE_URL = CONFIG.supabase.url;
const SUPABASE_ANON_KEY = CONFIG.supabase.anonKey;

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let productos = [];
let productosFiltrados = [];

// Mapeo de modelos a imágenes
// Mapeo de modelos a imágenes locales generadas por IA
// Mapeo de modelos a imágenes
const imagenesIPhone = {
    // iPhone 17
    'iPhone 17 Pro Max': 'public/iphone17pro.jpg',
    'iPhone 17 Pro': 'public/iphone17pro.jpg',
    'iPhone 17': 'public/iphone17.jpg',

    // iPhone 16
    'iPhone 16 Pro Max': 'public/iphone16pro.jpg',
    'iPhone 16 Pro': 'public/iphone16pro.jpg',
    'iPhone 16': 'public/iphone16.jpg',

    // iPhone 15
    'iPhone 15 Pro Max': 'public/iphone15pro.webp',
    'iPhone 15 Pro': 'public/iphone15pro.webp',
    'iPhone 15 Plus': 'public/iphone15.jpg',
    'iPhone 15': 'public/iphone15.jpg',

    // iPhone 14
    'iPhone 14 Pro Max': 'public/iphone14pro.png',
    'iPhone 14 Pro': 'public/iphone14pro.png',
    'iPhone 14 Plus': 'public/iphone14.jpg',
    'iPhone 14': 'public/iphone14.jpg',

    // iPhone 13
    'iPhone 13 Pro Max': 'public/iphone13pro.jpg',
    'iPhone 13 Pro': 'public/iphone13pro.jpg',
    'iPhone 13 mini': 'public/iphone13.jpg',
    'iPhone 13': 'public/iphone13.jpg',

    // iPhone 12
    'iPhone 12 Pro Max': 'public/IPhone12pro.webp',
    'iPhone 12 Pro': 'public/IPhone12pro.webp',
    'iPhone 12 mini': 'public/iphone12.jpg',
    'iPhone 12': 'public/iphone12.jpg',

    // iPhone 11
    'iPhone 11 Pro Max': 'public/iphone11pro.jpg',
    'iPhone 11 Pro': 'public/iphone11pro.jpg',
    'iPhone 11': 'public/iphone11.jpg',

    // Older models / Default
    'default': 'public/iphone11.jpg'
};

// Generar rating aleatorio pero realista (entre 4.6 y 5.0) para "Social Proof"
function obtenerRating(modelo) {
    let hash = 0;
    for (let i = 0; i < modelo.length; i++) {
        hash = modelo.charCodeAt(i) + ((hash << 5) - hash);
    }
    const minRating = 4.7;
    const rating = minRating + (Math.abs(hash) % 30) / 100;
    let reviews = 80 + (Math.abs(hash) % 420);
    return { rating: rating > 5 ? 5.0 : rating.toFixed(1), reviews };
}

// Función para obtener imagen del iPhone
function obtenerImagenIPhone(modelo) {
    // 1. Busqueda exacta
    if (imagenesIPhone[modelo]) return imagenesIPhone[modelo];

    // 2. Busqueda parcial inteligente
    const modeloNormalizado = modelo.toLowerCase();

    if (modeloNormalizado.includes('17')) {
        if (modeloNormalizado.includes('pro')) return imagenesIPhone['iPhone 17 Pro'];
        return imagenesIPhone['iPhone 17'];
    }
    if (modeloNormalizado.includes('16')) {
        if (modeloNormalizado.includes('pro')) return imagenesIPhone['iPhone 16 Pro'];
        return imagenesIPhone['iPhone 16'];
    }
    if (modeloNormalizado.includes('15')) {
        if (modeloNormalizado.includes('pro')) return imagenesIPhone['iPhone 15 Pro'];
        return imagenesIPhone['iPhone 15'];
    }
    if (modeloNormalizado.includes('14')) {
        if (modeloNormalizado.includes('pro')) return imagenesIPhone['iPhone 14 Pro'];
        return imagenesIPhone['iPhone 14'];
    }
    if (modeloNormalizado.includes('13')) {
        if (modeloNormalizado.includes('pro')) return imagenesIPhone['iPhone 13 Pro'];
        return imagenesIPhone['iPhone 13'];
    }
    if (modeloNormalizado.includes('12')) {
        if (modeloNormalizado.includes('pro')) return imagenesIPhone['iPhone 12 Pro'];
        return imagenesIPhone['iPhone 12'];
    }
    if (modeloNormalizado.includes('11')) {
        if (modeloNormalizado.includes('pro')) return imagenesIPhone['iPhone 11 Pro'];
        return imagenesIPhone['iPhone 11'];
    }

    return imagenesIPhone['default'];
}

// Cargar productos
async function cargarProductos() {
    try {
        // 1. Obtener cotización del dólar
        const { data: cotizacionData, error: cotizacionError } = await supabaseClient
            .from('cotizacion_dolar')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // Si hay error o no hay datos, usar valor por defecto
        const cotizacionDolar = (cotizacionData && !cotizacionError) ? cotizacionData.valor : 1485.00;

        // Actualizar UI con la cotización
        console.log('Cotización actual:', cotizacionDolar);

        // 2. Obtener productos
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('activo', true)
            .order('modelo', { ascending: true });

        if (error) throw error;

        // Recalcular precios en base a la cotización actual
        productos = data.map(p => {
            const precio_ars = p.precio_usd * cotizacionDolar;
            return {
                ...p,
                precio_ars: precio_ars,
                cuotas_3: Math.round((precio_ars * 1.22) / 3 / 1000) * 1000,
                cuotas_6: Math.round((precio_ars * 1.33) / 6 / 1000) * 1000,
                cuotas_12: Math.round((precio_ars * 1.6) / 12)
            };
        });

        productosFiltrados = [...productos];
        renderizarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('productosGrid').innerHTML = `
            <div class="loading">
                <p style="color: var(--danger);">Error al cargar productos. Por favor, intenta nuevamente.</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.8;">${error.message}</p>
            </div>
        `;
    }
}

// Renderizar productos con Diseño Premium
function renderizarProductos() {
    const grid = document.getElementById('productosGrid');

    if (!productosFiltrados || productosFiltrados.length === 0) {
        grid.innerHTML = `
            <div class="loading">
                <p>No se encontraron productos.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = productosFiltrados.map(producto => {
        const formatoPrecio = (precio) => {
            return new Intl.NumberFormat('es-AR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(precio);
        };

        const imagen = obtenerImagenIPhone(producto.modelo);
        const { rating, reviews } = obtenerRating(producto.modelo);

        // Generar estrella SVG inline
        const fullStar = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#FFC107" style="margin-right:2px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        const starsHtml = Array(5).fill(fullStar).join('');

        return `
            <div class="producto-card">
                <div class="card-image-container">
                    <img src="${imagen}" alt="${producto.modelo}" class="producto-imagen" loading="lazy">
                    <div class="card-badge">Más Vendido</div>
                </div>
                
                <div class="card-content">
                    <div class="rating-container" style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                        <div class="stars" style="display: flex;">${starsHtml}</div>
                        <span class="rating-text" style="font-size: 0.8rem; color: #888; margin-left: 0.5rem;">${rating} (${reviews})</span>
                    </div>

                    <h3 class="producto-modelo">${producto.modelo}</h3>
                    
                    <div class="producto-specs">
                        ${producto.colores ? `<span class="spec-bubble color">${producto.colores}</span>` : ''}
                        ${producto.almacenamiento ? `<span class="spec-bubble">${producto.almacenamiento}</span>` : ''}
                        ${producto.bateria ? `<span class="spec-bubble bateria">Bat. ${producto.bateria}</span>` : ''}
                    </div>
                    
                    <div class="price-section">
                        <div class="main-price">
                            <span class="currency">USD</span>
                            <span class="amount">${producto.precio_usd}</span>
                        </div>
                        <div class="ars-price">
                            ≈ $${formatoPrecio(producto.precio_ars)} ARS
                        </div>
                    </div>

                    <div class="installments-preview">
                        <span class="installment-badge">3 cuotas de $${formatoPrecio(producto.cuotas_3)}</span>
                    </div>

                    <button class="btn-buy" onclick="window.location.href='https://wa.me/5492645438114?text=Hola,%20me%20interesa%20el%20${producto.modelo}'">
                        Consultar Disponibilidad
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Aplicar filtros
function aplicarFiltros() {
    const busqueda = document.getElementById('buscar').value.toLowerCase();
    const almacenamiento = document.getElementById('filtroAlmacenamiento').value;
    const ordenar = document.getElementById('ordenar').value;

    // Filtrar
    productosFiltrados = productos.filter(producto => {
        const cumpleBusqueda = !busqueda || producto.modelo.toLowerCase().includes(busqueda);
        const cumpleAlmacenamiento = !almacenamiento || producto.almacenamiento === almacenamiento;
        return cumpleBusqueda && cumpleAlmacenamiento;
    });

    // Ordenar
    if (ordenar === 'precio_asc') {
        productosFiltrados.sort((a, b) => a.precio_usd - b.precio_usd);
    } else if (ordenar === 'precio_desc') {
        productosFiltrados.sort((a, b) => b.precio_usd - a.precio_usd);
    } else {
        productosFiltrados.sort((a, b) => a.modelo.localeCompare(b.modelo));
    }

    renderizarProductos();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();

    document.getElementById('buscar').addEventListener('input', aplicarFiltros);
    document.getElementById('filtroAlmacenamiento').addEventListener('change', aplicarFiltros);
    document.getElementById('ordenar').addEventListener('change', aplicarFiltros);
});
