
// Mock Database (Simulada para testeo inmediato, luego se conecta a Supabase real)
const REPARACIONES_DB = [
    // PANTALLAS (MÓDULOS)
    { modelo: 'iPhone 11', reparacion: 'Cambio de Módulo', calidad: 'Alternativo Premium', precio_usd: 45, garantia: '3 Meses' },
    { modelo: 'iPhone 11', reparacion: 'Cambio de Módulo', calidad: 'Original Refurbished', precio_usd: 80, garantia: '6 Meses' },

    { modelo: 'iPhone 11 Pro', reparacion: 'Cambio de Módulo', calidad: 'Soft OLED (Simil Original)', precio_usd: 65, garantia: '3 Meses' },
    { modelo: 'iPhone 11 Pro', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 110, garantia: '6 Meses' },

    { modelo: 'iPhone 11 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'Soft OLED (Simil Original)', precio_usd: 75, garantia: '3 Meses' },
    { modelo: 'iPhone 11 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 120, garantia: '6 Meses' },

    { modelo: 'iPhone 12', reparacion: 'Cambio de Módulo', calidad: 'Incell (Básico)', precio_usd: 50, garantia: '3 Meses' },
    { modelo: 'iPhone 12', reparacion: 'Cambio de Módulo', calidad: 'OLED (Premium)', precio_usd: 85, garantia: '6 Meses' },
    { modelo: 'iPhone 12', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 130, garantia: '6 Meses' },

    { modelo: 'iPhone 12 Pro', reparacion: 'Cambio de Módulo', calidad: 'OLED (Premium)', precio_usd: 90, garantia: '3 Meses' },
    { modelo: 'iPhone 12 Pro', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 140, garantia: '6 Meses' },

    { modelo: 'iPhone 12 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'OLED (Premium)', precio_usd: 100, garantia: '3 Meses' },
    { modelo: 'iPhone 12 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 160, garantia: '6 Meses' },

    { modelo: 'iPhone 13', reparacion: 'Cambio de Módulo', calidad: 'Incell', precio_usd: 60, garantia: '3 Meses' },
    { modelo: 'iPhone 13', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 150, garantia: '6 Meses' },

    { modelo: 'iPhone 13 Pro', reparacion: 'Cambio de Módulo', calidad: 'OLED Premium 120Hz', precio_usd: 220, garantia: '3 Meses' },
    { modelo: 'iPhone 13 Pro', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 350, garantia: '6 Meses' },

    { modelo: 'iPhone 13 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'OLED Premium 120Hz', precio_usd: 240, garantia: '3 Meses' },
    { modelo: 'iPhone 13 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 380, garantia: '6 Meses' },

    { modelo: 'iPhone 14', reparacion: 'Cambio de Módulo', calidad: 'Incell', precio_usd: 70, garantia: '3 Meses' },
    { modelo: 'iPhone 14', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 170, garantia: '6 Meses' },

    { modelo: 'iPhone 14 Plus', reparacion: 'Cambio de Módulo', calidad: 'Incell', precio_usd: 80, garantia: '3 Meses' },
    { modelo: 'iPhone 14 Plus', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 190, garantia: '6 Meses' },

    { modelo: 'iPhone 14 Pro', reparacion: 'Cambio de Módulo', calidad: 'OLED Premium 120Hz', precio_usd: 260, garantia: '3 Meses' },
    { modelo: 'iPhone 14 Pro', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 420, garantia: '6 Meses' },

    { modelo: 'iPhone 14 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'OLED Premium 120Hz', precio_usd: 280, garantia: '3 Meses' },
    { modelo: 'iPhone 14 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 450, garantia: '6 Meses' },

    { modelo: 'iPhone 15', reparacion: 'Cambio de Módulo', calidad: 'Incell', precio_usd: 85, garantia: '3 Meses' },
    { modelo: 'iPhone 15', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 200, garantia: '6 Meses' },

    { modelo: 'iPhone 15 Plus', reparacion: 'Cambio de Módulo', calidad: 'Incell', precio_usd: 95, garantia: '3 Meses' },
    { modelo: 'iPhone 15 Plus', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 220, garantia: '6 Meses' },

    { modelo: 'iPhone 15 Pro', reparacion: 'Cambio de Módulo', calidad: 'OLED Premium 120Hz', precio_usd: 300, garantia: '3 Meses' },
    { modelo: 'iPhone 15 Pro', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 480, garantia: '6 Meses' },

    { modelo: 'iPhone 15 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'OLED Premium 120Hz', precio_usd: 320, garantia: '3 Meses' },
    { modelo: 'iPhone 15 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 520, garantia: '6 Meses' },

    { modelo: 'iPhone 16', reparacion: 'Cambio de Módulo', calidad: 'OLED Premium', precio_usd: 110, garantia: '3 Meses' },
    { modelo: 'iPhone 16', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 250, garantia: '6 Meses' },

    { modelo: 'iPhone 16 Pro', reparacion: 'Cambio de Módulo', calidad: 'OLED Premium 120Hz', precio_usd: 350, garantia: '3 Meses' },
    { modelo: 'iPhone 16 Pro', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 550, garantia: '6 Meses' },

    { modelo: 'iPhone 16 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'OLED Premium 120Hz', precio_usd: 380, garantia: '3 Meses' },
    { modelo: 'iPhone 16 Pro Max', reparacion: 'Cambio de Módulo', calidad: 'Original', precio_usd: 600, garantia: '6 Meses' },

    // BATERIAS
    { modelo: 'iPhone 11', reparacion: 'Cambio de Batería', calidad: 'Premium (Sin Error)', precio_usd: 35, garantia: '6 Meses' },
    { modelo: 'iPhone 11 Pro', reparacion: 'Cambio de Batería', calidad: 'Premium (Sin Error)', precio_usd: 35, garantia: '6 Meses' },
    { modelo: 'iPhone 11 Pro Max', reparacion: 'Cambio de Batería', calidad: 'Premium (Sin Error)', precio_usd: 40, garantia: '6 Meses' },
    { modelo: 'iPhone 12', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 40, garantia: '6 Meses' },
    { modelo: 'iPhone 12 Pro', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 40, garantia: '6 Meses' },
    { modelo: 'iPhone 12 Pro Max', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 45, garantia: '6 Meses' },
    { modelo: 'iPhone 13', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 50, garantia: '6 Meses' },
    { modelo: 'iPhone 13 Pro', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 50, garantia: '6 Meses' },
    { modelo: 'iPhone 13 Pro Max', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 55, garantia: '6 Meses' },
    { modelo: 'iPhone 14', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 55, garantia: '6 Meses' },
    { modelo: 'iPhone 14 Plus', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 55, garantia: '6 Meses' },
    { modelo: 'iPhone 14 Pro', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 60, garantia: '6 Meses' },
    { modelo: 'iPhone 14 Pro Max', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 60, garantia: '6 Meses' },
    { modelo: 'iPhone 15', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 60, garantia: '6 Meses' },
    { modelo: 'iPhone 15 Plus', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 60, garantia: '6 Meses' },
    { modelo: 'iPhone 15 Pro', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 65, garantia: '6 Meses' },
    { modelo: 'iPhone 15 Pro Max', reparacion: 'Cambio de Batería', calidad: 'Premium', precio_usd: 65, garantia: '6 Meses' },

    // TAPA TRASERA (LÁSER)
    { modelo: 'iPhone 11', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 40, garantia: 'N/A' },
    { modelo: 'iPhone 12', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 50, garantia: 'N/A' },
    { modelo: 'iPhone 12 Pro', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 50, garantia: 'N/A' },
    { modelo: 'iPhone 12 Pro Max', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 55, garantia: 'N/A' },
    { modelo: 'iPhone 13', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 60, garantia: 'N/A' },
    { modelo: 'iPhone 13 Pro', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 65, garantia: 'N/A' },
    { modelo: 'iPhone 13 Pro Max', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 70, garantia: 'N/A' },
    { modelo: 'iPhone 14', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 65, garantia: 'N/A' },
    { modelo: 'iPhone 14 Pro', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 70, garantia: 'N/A' },
    { modelo: 'iPhone 14 Pro Max', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 75, garantia: 'N/A' },
    { modelo: 'iPhone 15', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 70, garantia: 'N/A' },
    { modelo: 'iPhone 15 Pro', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 80, garantia: 'N/A' },
    { modelo: 'iPhone 15 Pro Max', reparacion: 'Cambio de Tapa Trasera (Láser)', calidad: 'Vidrio Premium', precio_usd: 85, garantia: 'N/A' },
];

const DOLLAR_RATE_DEFAULT = 1485; // Fallback inicial

// State
let selectedImages = [];
let currentDollarRate = DOLLAR_RATE_DEFAULT;
let selectedOptionData = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const dropContent = document.getElementById('dropContent');
const imageGallery = document.getElementById('imageGallery'); // Updated
const scanLine = document.getElementById('scanLine');
const aiResult = document.getElementById('aiResult');

const modelSelect = document.getElementById('modelSelect');
const repairSelect = document.getElementById('repairSelect');
const qualitySection = document.getElementById('qualitySection');
const qualityOptions = document.getElementById('qualityOptions');

const partPriceEl = document.getElementById('partPrice');
const laborPriceEl = document.getElementById('laborPrice'); // Mano de obra (ficticia para el desglose)
const totalPriceEl = document.getElementById('totalPrice');
const btnWhatsapp = document.getElementById('btnWhatsapp');

// ==========================================
// Initialization
// ==========================================

async function init() {
    // 0. Initialize Supabase Client (from Library -> Instance)
    try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            if (window.CONFIG && window.CONFIG.supabase) {
                // Overwrite library global with client instance
                window.supabase = window.supabase.createClient(
                    window.CONFIG.supabase.url,
                    window.CONFIG.supabase.anonKey
                );
                console.log('✅ Supabase Client Initialized for Diagnostics');
            } else {
                console.error('❌ Missing CONFIG.supabase');
            }
        }
    } catch (err) {
        console.error('Error initializing supabase client:', err);
    }
    // 1. Fetch Dollar Rate from Supabase
    try {
        if (window.supabase) {
            const { data: cotizacion, error } = await window.supabase
                .from('cotizacion_dolar')
                .select('valor')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (cotizacion) {
                currentDollarRate = cotizacion.valor;
                console.log('💵 Cotización actualizada:', currentDollarRate);
            }
        }
    } catch (e) {
        console.warn('Usando cotización fallback:', currentDollarRate);
    }

    // 2. Setup Listeners
    setupImageUpload();
    setupFormLogic();
}

// ==========================================
// Image Upload & AI Analysis
// ==========================================

function setupImageUpload() {
    if (!dropZone) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-neon-green');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-neon-green');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-estilo-gold');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    });
}

async function handleFiles(files) {
    if (!files.length) return;

    // Reset UI
    selectedImages = [];
    imageGallery.innerHTML = '';
    imageGallery.classList.remove('hidden');
    dropContent.classList.add('hidden');
    scanLine.classList.remove('hidden'); // Start Scan Animation
    aiResult.classList.add('hidden');

    const readers = [];
    const maxFiles = Math.min(files.length, 3); // Limit to 3 images

    for (let i = 0; i < maxFiles; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        readers.push(new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        }));
    }

    try {
        const results = await Promise.all(readers);
        selectedImages = results;

        // Render Thumbnails
        selectedImages.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.className = "w-full h-full object-cover rounded-lg border border-gray-700/50 animate-fade-in-up";
            imageGallery.appendChild(img);
        });

        // Trigger AI Analysis
        analyzeImages(selectedImages);
    } catch (e) {
        console.error("Error reading files:", e);
        alert("Error al leer las imágenes.");
    }
}

// REPLACED WITH REAL AI CALL (Multi-Image Support)
async function analyzeImages(base64Images) {
    aiResult.classList.add('hidden');

    try {
        // Show scan line for better feedback
        scanLine.classList.remove('hidden');

        const { data, error } = await window.supabase.functions.invoke('analyze-device-image', {
            body: { images: base64Images }
        });

        if (error) throw error;

        // Check if function returned an error object
        if (data.error) throw new Error(data.error);

        showAIResult(data);
    } catch (e) {
        console.error('AI Error:', e);
        alert('Hubo un error al analizar las imágenes. Por favor intenta nuevamente.');
        scanLine.classList.add('hidden');
    } finally {
        // Stop scan line
        scanLine.classList.add('hidden');
    }
}

function showAIResult(data) {
    scanLine.classList.add('hidden'); // Stop animation
    aiResult.classList.remove('hidden');

    document.getElementById('detectedModel').innerText = data.device_model;
    document.getElementById('detectedDamage').innerText = data.damage_description;

    // Check if recommended_repair exists, otherwise default
    const repairSugg = data.recommended_repair || "Consultar Técnico";
    document.getElementById('aiRecommendation').innerText = `Sugerencia: ${repairSugg}`;

    // Auto-fill Form
    // Find closest model match
    const modelOptions = Array.from(modelSelect.options).map(o => o.value);
    const bestMatch = modelOptions.find(m => data.device_model.includes(m)) || "";

    if (bestMatch) {
        modelSelect.value = bestMatch;
        modelSelect.dispatchEvent(new Event('change')); // Trigger repair loading

        // Wait for repairs to load then select recommended if possible
        setTimeout(() => {
            const repairOptions = Array.from(repairSelect.options).map(o => o.value);
            // Simple heuristic to match repair type
            let repairKey = "Módulo";
            if (repairSugg.includes("Batería")) repairKey = "Batería";
            if (repairSugg.includes("Tapa")) repairKey = "Tapa";

            const bestRepair = repairOptions.find(r => r.includes(repairKey)) || "";
            if (bestRepair) {
                repairSelect.value = bestRepair;
                repairSelect.dispatchEvent(new Event('change'));
            }
        }, 100);
    }
}

// ==========================================
// Form Logic (Budget Calculator)
// ==========================================

function setupFormLogic() {
    // 1. Model Change -> Load Repairs
    modelSelect.addEventListener('change', () => {
        const model = modelSelect.value;
        repairSelect.innerHTML = '<option value="">Seleccionar Reparación...</option>';
        repairSelect.disabled = !model;
        qualitySection.classList.add('hidden');
        qualityOptions.innerHTML = '';
        resetPrice();

        if (!model) return;

        // Filter repairs for this model from DB
        const repairs = [...new Set(REPARACIONES_DB
            .filter(item => item.modelo === model)
            .map(item => item.reparacion))];

        if (repairs.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No disponible — Consultar por WhatsApp';
            opt.disabled = true;
            opt.selected = true;
            repairSelect.appendChild(opt);
            repairSelect.disabled = true;
        } else {
            repairs.forEach(rep => {
                const opt = document.createElement('option');
                opt.value = rep;
                opt.textContent = rep;
                repairSelect.appendChild(opt);
            });
        }
    });

    // 2. Repair Change -> Show Qualities
    repairSelect.addEventListener('change', () => {
        const model = modelSelect.value;
        const repair = repairSelect.value;

        qualityOptions.innerHTML = '';
        qualitySection.classList.add('hidden');
        resetPrice();

        if (!repair) return;

        const options = REPARACIONES_DB.filter(item => item.modelo === model && item.reparacion === repair);

        if (options.length > 0) {
            qualitySection.classList.remove('hidden');

            options.forEach(opt => {
                const card = document.createElement('div');
                // Styling based on quality
                const isPremium = opt.calidad.toLowerCase().includes('original') || opt.calidad.toLowerCase().includes('oled');
                const borderColor = isPremium ? 'border-estilo-gold' : 'border-gray-700';
                const glowClass = isPremium ? 'shadow-[0_0_15px_rgba(212,175,55,0.2)]' : '';

                // Base classes
                let classes = `cursor-pointer border ${borderColor} ${glowClass} bg-white rounded-lg p-3 hover:bg-gray-50 transition-all flex flex-col justify-between relative quality-card mb-2 sm:mb-0 backdrop-blur-sm`;

                card.className = classes;
                card.onclick = () => selectQuality(opt, card);

                card.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-sm font-bold text-[#E8D5C4] break-words w-3/4">${opt.calidad}</span>
                         ${isPremium ? '<span class="text-[10px] bg-estilo-gold text-[#0a0606] px-1.5 py-0.5 rounded font-bold whitespace-nowrap tracking-wider">RECOMENDADO</span>' : ''}
                    </div>
                    <div class="text-xs text-gray-400">Garantía: ${opt.garantia}</div>
                    <div class="text-xs text-gray-500 mt-1">Precio Ref: $${opt.precio_usd} USD</div>
                `;
                qualityOptions.appendChild(card);
            });
        }
    });

    if (btnWhatsapp) {
        btnWhatsapp.addEventListener('click', sendWhatsapp);
    }
}

function selectQuality(optionData, cardElement) {
    // Visual Selection
    document.querySelectorAll('.quality-card').forEach(c => {
        c.classList.remove('ring-2', 'ring-estilo-gold', 'bg-white/10');
    });
    cardElement.classList.add('ring-2', 'ring-estilo-gold', 'bg-white/10');

    selectedOptionData = optionData;
    calculateTotal();
}

function calculateTotal() {
    if (!selectedOptionData) return;

    const priceUsd = selectedOptionData.precio_usd;
    const laborUsd = 20; // Mano de obra base estimada
    const totalUsd = priceUsd + laborUsd;

    // Cálculos en ARS
    const priceArs = Math.round(priceUsd * currentDollarRate);
    const laborArs = Math.round(laborUsd * currentDollarRate);
    const totalArs = Math.round(totalUsd * currentDollarRate);

    // Formatear moneda
    const fmt = (num) => `$${num.toLocaleString('es-AR')}`;

    partPriceEl.innerText = fmt(priceArs);
    laborPriceEl.innerText = fmt(laborArs);

    // Animación simple del total
    totalPriceEl.innerText = fmt(totalArs);
}

function resetPrice() {
    if (partPriceEl) partPriceEl.innerText = '$0';
    if (laborPriceEl) laborPriceEl.innerText = '$0';
    if (totalPriceEl) totalPriceEl.innerText = '$0';
    selectedOptionData = null;
}

function sendWhatsapp() {
    if (!selectedOptionData || totalPriceEl.innerText === '$0') {
        alert('Por favor selecciona una calidad de repuesto para cotizar.');
        return;
    }

    const model = modelSelect.value;
    const repair = repairSelect.value;
    const quality = selectedOptionData.calidad;
    const total = totalPriceEl.innerText;

    // Mensaje formateado para WhatsApp
    const message = `Hola Estilo Apple! 🍎\n\nAcabo de usar el *Diagnóstico IA* y quiero reservar este presupuesto:\n\n📱 *Dispositivo:* ${model}\n🛠️ *Reparación:* ${repair}\n💎 *Calidad:* ${quality}\n💰 *Total Estimado:* ${total}\n\n¿Podrían confirmarme disponibilidad para ir hoy?`;

    // Número de teléfono (mismo que usamos en el resto de la app)
    const phone = '5492645607389';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// Start initiation
document.addEventListener('DOMContentLoaded', init);
