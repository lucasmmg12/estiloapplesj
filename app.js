// ============================================
// APLICACIÓN PRINCIPAL
// Sistema de Gestión Builderbot
// ============================================

import * as supabaseService from './services/supabase-client.js';
import * as builderbotAPI from './services/builderbot-api.js';

// ============================================
// ESTADO GLOBAL
// ============================================

const VENDEDORES = [
    { id: 1, nombre: 'Ana', color: 'rgba(255, 173, 173, 0.2)', border: '#ffadad' },
    { id: 2, nombre: 'Carlos', color: 'rgba(255, 214, 165, 0.2)', border: '#ffd6a5' },
    { id: 3, nombre: 'Sofía', color: 'rgba(253, 255, 182, 0.2)', border: '#fdffb6' },
    { id: 4, nombre: 'Miguel', color: 'rgba(202, 255, 191, 0.2)', border: '#caffbf' }
];

let conversaciones = [];
let clientes = [];
let mensajesAutomaticos = [];
let mensajesProgramados = [];
let productos = [];
let productosFiltrados = [];
let conversacionActual = null;
let clienteActual = null;
let mensajeActualId = null;
let productoActualId = null;

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');

    // Configurar event listeners
    configurarEventListeners();

    // Cargar datos iniciales
    await cargarDatos();

    // Configurar suscripciones en tiempo real
    configurarSuscripciones();

    console.log('✅ Aplicación iniciada correctamente');
});

// ============================================
// CONFIGURACIÓN DE EVENT LISTENERS
// ============================================

function configurarEventListeners() {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => cambiarTab(tab.dataset.tab));
    });

    // Filtros
    document.getElementById('filtroPlataforma').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroIntencion').addEventListener('change', aplicarFiltros);
    document.getElementById('btnRefrescar').addEventListener('click', cargarDatos);

    // Vendedores
    document.getElementById('btnVolverVendedores').addEventListener('click', () => {
        document.getElementById('vendedorDetalle').style.display = 'none';
        document.getElementById('vendedoresMain').style.display = 'block';
    });

    // Modales - Detalles
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalDetalles);
    document.getElementById('modalOverlay').addEventListener('click', cerrarModalDetalles);
    document.getElementById('btnCerrar').addEventListener('click', cerrarModalDetalles);
    document.getElementById('btnEnviarMensaje').addEventListener('click', abrirModalEnviar);

    // Modales - Mensaje Automático
    document.getElementById('btnNuevoMensaje').addEventListener('click', abrirModalMensaje);
    document.getElementById('btnCerrarModalMensaje').addEventListener('click', cerrarModalMensaje);
    document.getElementById('modalMensajeOverlay').addEventListener('click', cerrarModalMensaje);
    document.getElementById('btnCancelarMensaje').addEventListener('click', cerrarModalMensaje);
    document.getElementById('btnGuardarMensaje').addEventListener('click', guardarMensajeAutomatico);

    // Modales - Enviar Mensaje
    document.getElementById('btnCerrarModalEnviar').addEventListener('click', cerrarModalEnviar);
    document.getElementById('modalEnviarOverlay').addEventListener('click', cerrarModalEnviar);
    document.getElementById('btnCancelarEnviar').addEventListener('click', cerrarModalEnviar);
    document.getElementById('btnConfirmarEnviar').addEventListener('click', enviarMensajeManual);

    // Catálogo - Búsqueda y filtros
    document.getElementById('buscarProducto').addEventListener('input', aplicarFiltrosCatalogo);
    document.getElementById('filtroAlmacenamiento').addEventListener('change', aplicarFiltrosCatalogo);
    document.getElementById('ordenarPor').addEventListener('change', aplicarFiltrosCatalogo);

    // Catálogo - CRUD
    document.getElementById('btnNuevoProducto').addEventListener('click', abrirModalProducto);
    document.getElementById('btnVerCatalogoPublico').addEventListener('click', abrirCatalogoPublico);
    document.getElementById('btnCerrarModalProducto').addEventListener('click', cerrarModalProducto);
    document.getElementById('modalProductoOverlay').addEventListener('click', cerrarModalProducto);
    document.getElementById('btnCancelarProducto').addEventListener('click', cerrarModalProducto);
    document.getElementById('btnGuardarProducto').addEventListener('click', guardarProducto);

    // Cotización del Dólar
    document.getElementById('btnActualizarDolar').addEventListener('click', abrirModalDolar);
    document.getElementById('btnCerrarModalDolar').addEventListener('click', cerrarModalDolar);
    document.getElementById('modalDolarOverlay').addEventListener('click', cerrarModalDolar);
    document.getElementById('btnCancelarDolar').addEventListener('click', cerrarModalDolar);
    document.getElementById('btnGuardarDolar').addEventListener('click', guardarCotizacionDolar);
    document.getElementById('btnSincronizarDolar').addEventListener('click', sincronizarDolarAutomatico);
}

// ============================================
// CARGA DE DATOS
// ============================================

async function cargarDatos() {
    mostrarCargando();

    try {
        // Cargar conversaciones
        conversaciones = await supabaseService.obtenerConversaciones();

        // MOCK: Asignar vendedores aleatoriamente si no tienen
        asignarVendedoresMock();

        renderizarConversaciones();

        // Renderizar Tab Vendedores
        renderizarVendedores();

        // Cargar productos
        productos = await supabaseService.obtenerProductos();
        productosFiltrados = [...productos];
        renderizarCatalogo();

        // Cargar mensajes automáticos
        mensajesAutomaticos = await supabaseService.obtenerMensajesAutomaticos();
        renderizarMensajesAutomaticos();

        // Cargar mensajes programados persistentes
        mensajesProgramados = await supabaseService.obtenerMensajesProgramados();
        renderizarProgramados();

        // Procesar datos para el embudo (necesario para estadísticas)
        renderizarEmbudo();

        // Si la pestaña actual es estadísticas, refrescar gráficos
        const activeTab = document.querySelector('.tab.active');
        if (activeTab && activeTab.dataset.tab === 'estadisticas') {
            setTimeout(renderizarEstadisticas, 200);
        }

        // Cargar cotización del dólar
        await cargarCotizacionDolar();

        // Actualizar estadísticas
        actualizarEstadisticas();

        mostrarToast('Datos actualizados correctamente', 'success');
    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarToast('Error al cargar datos: ' + error.message, 'error');
    }
}

function asignarVendedoresMock() {
    let asignaciones = JSON.parse(localStorage.getItem('asignacionesVendedores') || '{}');
    let huboCambios = false;

    conversaciones.forEach(conv => {
        // Si ya viene de la BD (asumiendo que en el futuro vendrá), lo respetamos.
        // Si no, usamos nuestro mock local.
        if (conv.vendedor_asignado) return;

        if (!asignaciones[conv.id]) {
            // Asignar aleatorio
            const vendedorRandom = VENDEDORES[Math.floor(Math.random() * VENDEDORES.length)];
            asignaciones[conv.id] = vendedorRandom.id;
            huboCambios = true;
        }

        // Inyectar objeto vendedor en la conversación en memoria
        const vendedorId = asignaciones[conv.id];
        conv.vendedor = VENDEDORES.find(v => v.id === vendedorId);
    });

    if (huboCambios) {
        localStorage.setItem('asignacionesVendedores', JSON.stringify(asignaciones));
    }
}


function mostrarCargando() {
    document.getElementById('tablaConversaciones').innerHTML = `
        <tr class="loading-row">
            <td colspan="7">
                <div class="loading-spinner"></div>
                <p>Cargando conversaciones...</p>
            </td>
        </tr>
    `;
}

// ============================================
// RENDERIZADO DE CONVERSACIONES
// ============================================

function renderizarConversaciones() {
    const tbody = document.getElementById('tablaConversaciones');
    const badge = document.getElementById('badgeTotal');

    if (!conversaciones || conversaciones.length === 0) {
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="8">
                    <p>No hay conversaciones registradas</p>
                </td>
            </tr>
        `;
        badge.textContent = '0 conversaciones';
        return;
    }

    tbody.innerHTML = conversaciones.map(conv => {
        const cliente = conv.clientes;
        const fecha = new Date(conv.created_at).toLocaleString('es-AR');
        const vendedor = conv.vendedor || { nombre: 'Sin asignar', color: 'transparent', border: 'transparent' };

        return `
            <tr onclick="window.verDetallesConversacion('${conv.id}')">
                <td>
                    <span class="badge" style="background: ${vendedor.color}; border-color: ${vendedor.border}; color: var(--gray-200);">
                        ${vendedor.nombre}
                    </span>
                </td>
                <td><strong>${cliente.nombre}</strong></td>
                <td>
                    <a href="https://wa.me/${cliente.telefono}?text=${encodeURIComponent(`Hola ${cliente.nombre}, nos comunicamos de Estilo Apple SJ`)}" 
                       target="_blank" 
                       class="whatsapp-link"
                       onclick="event.stopPropagation()">
                        ${cliente.telefono}
                    </a>
                </td>
                <td>
                    <span class="platform-badge ${cliente.plataforma}">
                        ${cliente.plataforma === 'whatsapp' ? '📱 WhatsApp' : '📷 Instagram'}
                    </span>
                </td>
                <td>${conv.resumen_breve}</td>
                <td>
                    <span class="intencion-badge ${conv.intencion_detectada.toLowerCase()}">
                        ${conv.intencion_detectada}
                    </span>
                </td>
                <td>${fecha}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <select class="btn-action" 
                                style="padding: 0.25rem; width: 85px; font-size: 0.8rem; background-color: #f5f5f5; color: #000000; border: 1px solid var(--border-color); cursor: pointer;"
                                onclick="event.stopPropagation()"
                                onchange="if(this.value) { window.programarAutoRespuesta('${conv.id}', this.value); this.value=''; }">
                            <option value="">⚡ Auto...</option>
                            <option value="Comprar">Comprar</option>
                            <option value="Consulta">Consulta</option>
                            <option value="Averiguar">Averiguar</option>
                            <option value="Reclamo">Reclamo</option>
                        </select>
                        <button class="btn-action" onclick="event.stopPropagation(); window.verDetallesConversacion('${conv.id}')">
                            Ver
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    badge.textContent = `${conversaciones.length} conversaciones`;

    // Actualizar también la tabla de clientes agrupados
    renderizarClientes();
}

// ============================================
// RENDERIZADO DE CLIENTES (AGRUPADOS)
// ============================================

function renderizarClientes() {
    const tbody = document.getElementById('tablaClientes');
    const badge = document.getElementById('badgeClientes');

    if (!conversaciones || conversaciones.length === 0) {
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="6">
                    <p>No hay clientes registrados</p>
                </td>
            </tr>
        `;
        badge.textContent = '0 clientes';
        return;
    }

    // Agrupar por teléfono
    const clientesMap = new Map();

    conversaciones.forEach(conv => {
        const tel = conv.clientes.telefono;
        if (!clientesMap.has(tel)) {
            clientesMap.set(tel, {
                nombre: conv.clientes.nombre,
                telefono: tel,
                plataforma: conv.clientes.plataforma,
                conversaciones: [],
                ultimaInteraccion: conv.created_at
            });
        }

        const cliente = clientesMap.get(tel);
        cliente.conversaciones.push(conv);

        // Actualizar fecha si esta conv es más reciente
        if (new Date(conv.created_at) > new Date(cliente.ultimaInteraccion)) {
            cliente.ultimaInteraccion = conv.created_at;
            // Actualizar nombre por si cambió
            cliente.nombre = conv.clientes.nombre;
        }
    });

    const clientesArray = Array.from(clientesMap.values());

    // Ordenar por última interacción descendente
    clientesArray.sort((a, b) => new Date(b.ultimaInteraccion) - new Date(a.ultimaInteraccion));

    tbody.innerHTML = clientesArray.map(cliente => {
        const fecha = new Date(cliente.ultimaInteraccion).toLocaleString('es-AR');

        return `
            <tr onclick="window.verHistorialCliente('${cliente.telefono}')">
                <td><strong>${cliente.nombre}</strong></td>
                <td>
                    <a href="https://wa.me/${cliente.telefono}" 
                       target="_blank" 
                       class="whatsapp-link"
                       onclick="event.stopPropagation()">
                        ${cliente.telefono}
                    </a>
                </td>
                <td>
                    <span class="platform-badge ${cliente.plataforma}">
                        ${cliente.plataforma === 'whatsapp' ? '📱 WhatsApp' : '📷 Instagram'}
                    </span>
                </td>
                <td>
                    <span class="badge" style="background: rgba(128,0,32,0.1); border-color: var(--accent-light);">
                        ${cliente.conversaciones.length} interacciones
                    </span>
                </td>
                <td>${fecha}</td>
                <td>
                    <button class="btn-action" onclick="event.stopPropagation(); window.verHistorialCliente('${cliente.telefono}')">
                        Ver Historial
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    badge.textContent = `${clientesArray.length} clientes`;

    // Guardar mapa en memoria para acceso rápido
    window.clientesMap = clientesMap;
}

window.verHistorialCliente = (telefono) => {
    const cliente = window.clientesMap.get(telefono);
    if (!cliente) return;

    // Crear un objeto de conversación "virtual" que combine todo el historial
    // O simplemente mostrar la conversación más reciente pero con el historial completo concatenado

    // Ordenar conversaciones por fecha
    cliente.conversaciones.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Combinar historial
    const historialCompletoCombinado = cliente.conversaciones.flatMap(c => {
        // Añadir separador de fecha/conversación
        const fecha = new Date(c.created_at).toLocaleString('es-AR');
        return [
            { role: 'system', content: `--- Conversación del ${fecha} (Intención: ${c.intencion_detectada}) ---` },
            ...(c.historial_completo || [])
        ];
    });

    const conversacionVirtual = {
        id: 'virtual_' + telefono,
        clientes: {
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            plataforma: cliente.plataforma
        },
        resumen_detallado: `Historial consolidado de ${cliente.conversaciones.length} conversaciones. Última intención: ${cliente.conversaciones[cliente.conversaciones.length - 1].intencion_detectada}.`,
        bullets: cliente.conversaciones.flatMap(c => c.bullets || []).slice(-5), // Últimos 5 bullets
        historial_completo: historialCompletoCombinado,
        intencion_detectada: 'Historial Completo' // Etiqueta genérica
    };

    clienteActual = conversacionVirtual.clientes;
    mostrarModalDetalles(conversacionVirtual);
};

// ============================================
// RENDERIZADO DE VENDEDORES
// ============================================

function renderizarVendedores() {
    const grid = document.getElementById('vendedoresGrid');

    // Contar conversaciones por vendedor
    const conteo = {};
    VENDEDORES.forEach(v => conteo[v.id] = 0);

    conversaciones.forEach(c => {
        if (c.vendedor) {
            conteo[c.vendedor.id] = (conteo[c.vendedor.id] || 0) + 1;
        }
    });

    grid.innerHTML = VENDEDORES.map(v => {
        const total = conteo[v.id];
        return `
            <div class="embudo-card" onclick="window.verHistorialVendedor(${v.id})" style="cursor: pointer; border-left: 4px solid ${v.border}">
                <div class="card-info">
                    <h4 style="display: flex; justify-content: space-between; align-items: center;">
                        ${v.nombre}
                        <span class="badge" style="background: ${v.color}; border-color: ${v.border}; color: var(--gray-200);">
                            ${total} conv.
                        </span>
                    </h4>
                    <p style="margin-top: 1rem;">Click para ver historial completo</p>
                </div>
            </div>
        `;
    }).join('');
}

window.verHistorialVendedor = (vendedorId) => {
    const vendedor = VENDEDORES.find(v => v.id === vendedorId);
    if (!vendedor) return;

    // Filtrar conversaciones
    const convsVendedor = conversaciones.filter(c => c.vendedor && c.vendedor.id === vendedorId);

    // UI Updates
    document.getElementById('vendedoresMain').style.display = 'none';
    document.getElementById('vendedorDetalle').style.display = 'block';

    document.getElementById('nombreVendedorDetalle').textContent = vendedor.nombre;
    document.getElementById('nombreVendedorDetalle').style.color = vendedor.border;
    document.getElementById('badgeVendedorDetalle').textContent = `${convsVendedor.length} conversaciones`;

    // Render Table
    const tbody = document.getElementById('tablaVendedorDetalle');

    if (convsVendedor.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay conversaciones asignadas</td></tr>`;
        return;
    }

    tbody.innerHTML = convsVendedor.map(conv => {
        const fecha = new Date(conv.created_at).toLocaleString('es-AR');
        return `
            <tr onclick="window.verDetallesConversacion('${conv.id}')">
                <td><strong>${conv.clientes.nombre}</strong></td>
                <td>${conv.clientes.telefono}</td>
                <td>${conv.resumen_breve}</td>
                <td>${fecha}</td>
                <td>
                    <button class="btn-action" onclick="event.stopPropagation(); window.verDetallesConversacion('${conv.id}')">
                        Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

// Hacer función global para onclick
window.verDetallesConversacion = async (conversacionId) => {
    try {
        const conv = await supabaseService.obtenerConversacionPorId(conversacionId);
        conversacionActual = conv;
        clienteActual = conv.clientes;
        mostrarModalDetalles(conv);
    } catch (error) {
        console.error('Error al cargar detalles:', error);
        mostrarToast('Error al cargar detalles', 'error');
    }
};

function mostrarModalDetalles(conv) {
    const modal = document.getElementById('modalDetalles');
    const modalBody = document.getElementById('modalBody');

    const bullets = Array.isArray(conv.bullets) ? conv.bullets : [];
    const historial = Array.isArray(conv.historial_completo) ? conv.historial_completo : [];

    modalBody.innerHTML = `
        <div class="detalle-section">
            <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                Información del Cliente
            </h4>
            <p><strong>Nombre:</strong> ${conv.clientes.nombre}</p>
            <p><strong>Teléfono:</strong> ${conv.clientes.telefono}</p>
            <p><strong>Plataforma:</strong> ${conv.clientes.plataforma === 'whatsapp' ? '📱 WhatsApp' : '📷 Instagram'}</p>
        </div>
        
        <div class="detalle-section">
            <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Resumen Detallado
            </h4>
            <p>${conv.resumen_detallado}</p>
        </div>
        
        <div class="detalle-section">
            <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                Puntos Clave
            </h4>
            <ul class="bullets-list">
                ${bullets.map(bullet => `<li>${bullet}</li>`).join('')}
            </ul>
        </div>
        
        <div class="detalle-section">
            <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Historial Completo
            </h4>
            <div class="historial-completo">
                ${historial.map(msg => {
        const rol = msg.role || msg.from || 'usuario';
        const contenido = msg.content || msg.body || msg.message || '';
        return `<div class="mensaje-item"><strong>${rol}:</strong> ${contenido}</div>`;
    }).join('')}
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function cerrarModalDetalles() {
    document.getElementById('modalDetalles').classList.remove('active');
    conversacionActual = null;
}

// ============================================
// RENDERIZADO DE EMBUDO
// ============================================

// ============================================
// RENDERIZADO DE EMBUDO (KANBAN)
// ============================================

const ETAPAS_EMBUDO = [
    { id: 'consulta', titulo: '🔍 Consulta / Interés', items: [] },
    { id: 'asesoramiento', titulo: '💬 Asesoramiento', items: [] },
    { id: 'cierre', titulo: '🤝 Cierre / Datos', items: [] },
    { id: 'venta', titulo: '✨ Venta / Post-Venta', items: [] },
    { id: 'canje', titulo: '♻️ Interés Canje', items: [] }
];

function renderizarEmbudo() {
    const container = document.getElementById('embudoGrid');

    // Cargar overrides locales (Legacy/Offline support)
    const overrides = JSON.parse(localStorage.getItem('etapasOverrides') || '{}');

    // Reset items
    ETAPAS_EMBUDO.forEach(e => e.items = []);

    conversaciones.forEach(conv => {
        let etapaId = 'consulta'; // Default

        // 1. Prioridad: Base de Datos (crm_stage)
        if (conv.crm_stage) {
            etapaId = conv.crm_stage;
        }
        // 2. Fallback: LocalStorage (para compatibilidad temporal)
        else if (overrides[conv.id]) {
            etapaId = overrides[conv.id];
        }
        // 3. Fallback: Inferencia automática por intención
        else {
            const intencion = conv.intencion_detectada ? conv.intencion_detectada.toLowerCase() : '';
            if (intencion.includes('comprar') || intencion.includes('interes')) etapaId = 'consulta';
            if (intencion.includes('asesoramiento') || intencion.includes('precio')) etapaId = 'asesoramiento';
            if (intencion.includes('cierre') || intencion.includes('pago')) etapaId = 'cierre';
            if (intencion.includes('venta') || intencion.includes('post')) etapaId = 'venta';
            if (intencion.includes('canje') || intencion.includes('usado')) etapaId = 'canje';
        }

        // Buscar etapa correcta
        const etapa = ETAPAS_EMBUDO.find(e => e.id === etapaId) || ETAPAS_EMBUDO[0];
        etapa.items.push(conv);
    });

    // Generar HTML del Kanban
    let html = '<div class="kanban-board">';

    ETAPAS_EMBUDO.forEach(etapa => {
        html += `
            <div class="kanban-column">
                <div class="kanban-header">
                    <h3>${etapa.titulo}</h3>
                    <span class="kanban-count">${etapa.items.length}</span>
                </div>
                <div class="kanban-items" 
                     ondrop="drop(event)" 
                     ondragover="allowDrop(event)" 
                     data-stage="${etapa.id}">
        `;

        if (etapa.items.length === 0) {
            html += `<div style="text-align: center; color: var(--gray-500); padding: 1rem; font-size: 0.9rem; pointer-events: none;">Arrastra clientes aquí</div>`;
        } else {
            html += etapa.items.map(conv => {
                const cliente = conv.clientes;
                const vendedor = conv.vendedor || { nombre: '?', color: '#ccc' };
                const fecha = new Date(conv.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

                return `
                    <div class="kanban-card" 
                         draggable="true" 
                         ondragstart="drag(event)" 
                         id="card_${conv.id}"
                         data-conv-id="${conv.id}"
                         onclick="window.verDetallesConversacion('${conv.id}')">
                         
                        <div class="kanban-card-title" style="display: flex; justify-content: space-between; align-items: center;">
                            ${cliente.nombre}
                            <button class="btn-delete-card" onclick="event.stopPropagation(); window.eliminarConversacionKanban('${conv.id}')" style="background: none; border: none; color: #ff4d4d; cursor: pointer; padding: 2px;" title="Eliminar lead">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="kanban-card-info">${conv.resumen_breve || 'Intención detectada...'}</div>
                        
                        <div class="kanban-card-footer">
                            <div class="vendedor-avatar-mini" style="background: ${vendedor.color};" title="Vendedor: ${vendedor.nombre}">
                                ${vendedor.nombre.charAt(0)}
                            </div>
                            <span class="kanban-time">📅 ${fecha}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';

    container.className = '';
    container.innerHTML = html;
}

// ============================================
// LOGICA DRAG & DROP
// ============================================

window.allowDrop = (ev) => {
    ev.preventDefault();
}

window.drag = (ev) => {
    if (ev.target.classList && ev.target.classList.contains('kanban-card')) {
        ev.dataTransfer.setData("text/plain", ev.target.dataset.convId);
        ev.target.style.opacity = '0.4';
    }
}

document.addEventListener("dragend", (event) => {
    if (event.target.classList && event.target.classList.contains('kanban-card')) {
        event.target.style.opacity = "1";
    }
});

window.drop = async (ev) => {
    ev.preventDefault();
    const convId = ev.dataTransfer.getData("text/plain");
    const targetColumn = ev.target.closest('.kanban-items');

    if (targetColumn && convId) {
        const newStageId = targetColumn.dataset.stage;

        try {
            // 1. Guardar en Supabase (Backend)
            var response = await supabaseService.actualizarConversacion(convId, { crm_stage: newStageId });

            // 2. Actualizar memoria localmente para reflejo instantáneo
            const conv = conversaciones.find(c => c.id === convId);
            if (conv) conv.crm_stage = newStageId;

            renderizarEmbudo();
            mostrarToast('Etapa guardada en nube', 'success');
        } catch (error) {
            console.error('Error al mover etapa (Cloud):', error);
            mostrarToast('Guardado localmente (Sin conexión)', 'warning');

            // 3. Fallback a LocalStorage si falla la nube
            const overrides = JSON.parse(localStorage.getItem('etapasOverrides') || '{}');
            overrides[convId] = newStageId;
            localStorage.setItem('etapasOverrides', JSON.stringify(overrides));
            renderizarEmbudo();
        }
    }
}

window.eliminarConversacionKanban = async (convId) => {
    if (!confirm('¿Estás seguro de eliminar este lead del embudo? Esta acción no se puede deshacer.')) return;

    try {
        await supabaseService.eliminarConversacion(convId);

        // Actualizar localmente
        conversaciones = conversaciones.filter(c => c.id !== convId);

        renderizarEmbudo();
        mostrarToast('Lead eliminado correctamente', 'success');
    } catch (error) {
        console.error('Error al eliminar lead:', error);
        mostrarToast('Error al eliminar lead: ' + error.message, 'error');
    }
};

window.enviarAutoRespuesta = async (convId, intencionTipo) => {
    // 1. Buscar plantilla (case insensitive)
    const plantilla = mensajesAutomaticos.find(m => m.intencion.toLowerCase() === intencionTipo.toLowerCase() && m.activo);

    if (!plantilla) {
        mostrarToast(`No hay configuración de mensaje activo para "${intencionTipo}". Ve a la pestaña Mensajes Automáticos para crearlo.`, 'warning');
        return;
    }

    // 2. Obtener datos cliente
    const conv = conversaciones.find(c => c.id === convId);
    if (!conv || !conv.clientes) {
        mostrarToast('No se encontró la conversación', 'error');
        return;
    }

    if (!confirm(`¿Enviar respuesta automática de tipo "${intencionTipo}" a ${conv.clientes.nombre}?`)) return;

    try {
        mostrarToast('Enviando mensaje...', 'info');

        // 3. Enviar mensaje
        await builderbotAPI.enviarMensaje(conv.clientes.telefono, plantilla.mensaje, plantilla.media_url);

        mostrarToast('Mensaje enviado correctamente', 'success');
    } catch (error) {
        console.error('Error enviando auto-respuesta:', error);
        mostrarToast('Error al enviar mensaje: ' + error.message, 'error');
    }
};

window.verDetallesCliente = async (clienteId) => {
    try {
        const conversacionesCliente = await supabaseService.obtenerConversaciones(clienteId);
        if (conversacionesCliente && conversacionesCliente.length > 0) {
            await window.verDetallesConversacion(conversacionesCliente[0].id);
        }
    } catch (error) {
        console.error('Error al cargar cliente:', error);
        mostrarToast('Error al cargar cliente', 'error');
    }
};

// ============================================
// RENDERIZADO DE MENSAJES AUTOMÁTICOS
// ============================================

function renderizarMensajesAutomaticos() {
    const grid = document.getElementById('mensajesGrid');

    if (!mensajesAutomaticos || mensajesAutomaticos.length === 0) {
        grid.innerHTML = `
            <div class="loading-row">
                <p>No hay mensajes automáticos configurados</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = mensajesAutomaticos.map(mensaje => `
        <div class="mensaje-card">
            <div class="card-info">
                <h4>
                    <span class="intencion-badge ${mensaje.intencion.toLowerCase()}">${mensaje.intencion}</span>
                </h4>
                <p><strong>Días de espera:</strong> ${mensaje.dias_espera} días</p>
                <p><strong>Mensaje:</strong> ${mensaje.mensaje}</p>
                ${mensaje.media_url ? `<p><strong>Media:</strong> <a href="${mensaje.media_url}" target="_blank">Ver imagen</a></p>` : ''}
                <p><strong>Estado:</strong> ${mensaje.activo ? '✅ Activo' : '❌ Inactivo'}</p>
            </div>
            <div class="card-actions">
                <button class="btn-action" onclick="window.editarMensaje('${mensaje.id}')">
                    Editar
                </button>
                <button class="btn-action danger" onclick="window.eliminarMensaje('${mensaje.id}')">
                    Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// GESTIÓN DE MENSAJES AUTOMÁTICOS
// ============================================

function abrirModalMensaje(mensajeId = null) {
    const modal = document.getElementById('modalMensaje');
    const titulo = document.getElementById('tituloModalMensaje');

    if (mensajeId) {
        const mensaje = mensajesAutomaticos.find(m => m.id === mensajeId);
        if (mensaje) {
            titulo.textContent = 'Editar Mensaje Automático';
            document.getElementById('intencionMensaje').value = mensaje.intencion;
            document.getElementById('diasEspera').value = mensaje.dias_espera;
            document.getElementById('mensajeTexto').value = mensaje.mensaje;
            document.getElementById('mediaUrl').value = mensaje.media_url || '';
            document.getElementById('mensajeActivo').checked = mensaje.activo;
            mensajeActualId = mensajeId;
        }
    } else {
        titulo.textContent = 'Nuevo Mensaje Automático';
        document.getElementById('formMensaje').reset();
        mensajeActualId = null;
    }

    modal.classList.add('active');
}

function cerrarModalMensaje() {
    document.getElementById('modalMensaje').classList.remove('active');
    document.getElementById('formMensaje').reset();
    mensajeActualId = null;
}

async function guardarMensajeAutomatico() {
    const intencion = document.getElementById('intencionMensaje').value;
    const diasEspera = parseInt(document.getElementById('diasEspera').value);
    const mensaje = document.getElementById('mensajeTexto').value;
    const mediaUrl = document.getElementById('mediaUrl').value;
    const activo = document.getElementById('mensajeActivo').checked;

    if (!intencion || !diasEspera || !mensaje) {
        mostrarToast('Por favor completa todos los campos requeridos', 'warning');
        return;
    }

    try {
        const datos = {
            intencion,
            dias_espera: diasEspera,
            mensaje,
            media_url: mediaUrl || null,
            activo
        };

        if (mensajeActualId) {
            await supabaseService.actualizarMensajeAutomatico(mensajeActualId, datos);
            mostrarToast('Mensaje actualizado correctamente', 'success');
        } else {
            await supabaseService.crearMensajeAutomatico(datos);
            mostrarToast('Mensaje creado correctamente', 'success');
        }

        cerrarModalMensaje();
        await cargarDatos();
    } catch (error) {
        console.error('Error al guardar mensaje:', error);
        mostrarToast('Error al guardar mensaje: ' + error.message, 'error');
    }
}

window.editarMensaje = (mensajeId) => {
    abrirModalMensaje(mensajeId);
};

window.eliminarMensaje = async (mensajeId) => {
    if (!confirm('¿Estás seguro de eliminar este mensaje automático?')) {
        return;
    }

    try {
        await supabaseService.eliminarMensajeAutomatico(mensajeId);
        mostrarToast('Mensaje eliminado correctamente', 'success');
        await cargarDatos();
    } catch (error) {
        console.error('Error al eliminar mensaje:', error);
        mostrarToast('Error al eliminar mensaje: ' + error.message, 'error');
    }
};

// ============================================
// ENVIAR MENSAJE MANUAL
// ============================================

function abrirModalEnviar() {
    if (!clienteActual) {
        mostrarToast('No hay cliente seleccionado', 'warning');
        return;
    }

    document.getElementById('clienteNombre').value = `${clienteActual.nombre} (${clienteActual.telefono})`;
    document.getElementById('modalEnviar').classList.add('active');
    cerrarModalDetalles();
}

function cerrarModalEnviar() {
    document.getElementById('modalEnviar').classList.remove('active');
    document.getElementById('formEnviar').reset();
}

async function enviarMensajeManual() {
    const mensaje = document.getElementById('mensajeEnviar').value;
    const mediaUrl = document.getElementById('mediaUrlEnviar').value;

    if (!mensaje) {
        mostrarToast('Por favor escribe un mensaje', 'warning');
        return;
    }

    if (!clienteActual) {
        mostrarToast('No hay cliente seleccionado', 'error');
        return;
    }

    try {
        await builderbotAPI.enviarMensaje(
            clienteActual.plataforma,
            clienteActual.telefono,
            mensaje,
            mediaUrl || null
        );

        mostrarToast('Mensaje enviado correctamente', 'success');
        cerrarModalEnviar();
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        mostrarToast('Error al enviar mensaje: ' + error.message, 'error');
    }
}

// ============================================
// FILTROS Y TABS
// ============================================

function cambiarTab(tabName) {
    // Actualizar tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    if (tabName === 'conversaciones') {
        document.getElementById('tabConversaciones').classList.add('active');
    } else if (tabName === 'clientes') {
        document.getElementById('tabClientes').classList.add('active');
    } else if (tabName === 'vendedores') {
        document.getElementById('tabVendedores').classList.add('active');
    } else if (tabName === 'embudo') {
        document.getElementById('tabEmbudo').classList.add('active');
        renderizarEmbudo();
    } else if (tabName === 'estadisticas') {
        document.getElementById('tabEstadisticas').classList.add('active');
        setTimeout(renderizarEstadisticas, 100);
    } else if (tabName === 'mensajes') {
        document.getElementById('tabMensajes').classList.add('active');
    } else if (tabName === 'catalogo') {
        document.getElementById('tabCatalogo').classList.add('active');
    } else if (tabName === 'programados') {
        document.getElementById('tabProgramados').classList.add('active');
        renderizarProgramados();
    }
}

async function aplicarFiltros() {
    const plataforma = document.getElementById('filtroPlataforma').value;
    const intencion = document.getElementById('filtroIntencion').value;

    try {
        conversaciones = await supabaseService.obtenerConversaciones();

        // Filtrar por plataforma
        if (plataforma) {
            conversaciones = conversaciones.filter(conv =>
                conv.clientes.plataforma === plataforma
            );
        }

        // Filtrar por intención
        if (intencion) {
            conversaciones = conversaciones.filter(conv =>
                conv.intencion_detectada === intencion
            );
        }

        renderizarConversaciones();
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        mostrarToast('Error al aplicar filtros', 'error');
    }
}

// ============================================
// ESTADÍSTICAS
// ============================================

function actualizarEstadisticas() {
    // Total de clientes únicos
    const clientesUnicos = new Set(conversaciones.map(c => c.cliente_id));
    document.getElementById('totalClientes').textContent = clientesUnicos.size;

    // Conversaciones de hoy
    const hoy = new Date().toDateString();
    const conversacionesHoy = conversaciones.filter(c =>
        new Date(c.created_at).toDateString() === hoy
    );
    document.getElementById('conversacionesHoy').textContent = conversacionesHoy.length;
}

// ============================================
// SUSCRIPCIONES EN TIEMPO REAL
// ============================================

function configurarSuscripciones() {
    // Suscribirse a cambios en conversaciones
    supabaseService.suscribirseAConversaciones(() => {
        console.log('📨 Nueva conversación recibida');
        cargarDatos();
    });

    // Suscribirse a cambios en clientes
    supabaseService.suscribirseAClientes(() => {
        console.log('👤 Cliente actualizado');
        cargarDatos();
    });
}

// ============================================
// CATÁLOGO DE PRODUCTOS
// ============================================

function renderizarCatalogo() {
    const tbody = document.getElementById('tablaCatalogo');
    const badge = document.getElementById('badgeCatalogo');

    if (!productosFiltrados || productosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="10">
                    <p>No hay productos en el catálogo</p>
                </td>
            </tr>
        `;
        badge.textContent = '0 productos';
        return;
    }

    tbody.innerHTML = productosFiltrados.map(producto => {
        const formatoPrecio = (precio) => {
            return new Intl.NumberFormat('es-AR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(precio);
        };

        const getBateriaClass = (bateria) => {
            if (!bateria) return '';
            const porcentaje = parseInt(bateria);
            if (porcentaje >= 90) return 'alta';
            if (porcentaje >= 80) return 'media';
            return 'baja';
        };

        return `
            <tr>
                <td><strong>${producto.modelo}</strong></td>
                <td>${producto.colores || '-'}</td>
                <td>${producto.almacenamiento || '-'}</td>
                <td>
                    ${producto.bateria ? `<span class="bateria-badge ${getBateriaClass(producto.bateria)}">${producto.bateria}</span>` : '-'}
                </td>
                <td class="precio-usd">$${formatoPrecio(producto.precio_usd)}</td>
                <td class="precio-ars">$${formatoPrecio(producto.precio_ars)}</td>
                <td class="cuota-cell">$${formatoPrecio(producto.cuotas_3)}</td>
                <td class="cuota-cell">$${formatoPrecio(producto.cuotas_6)}</td>
                <td class="cuota-cell">$${formatoPrecio(producto.cuotas_12)}</td>
                <td>
                    <button class="btn-icon" onclick="editarProducto('${producto.id}')" title="Editar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-danger" onclick="eliminarProductoConfirm('${producto.id}', '${producto.modelo}')" title="Eliminar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    badge.textContent = `${productosFiltrados.length} productos`;
}

function aplicarFiltrosCatalogo() {
    const busqueda = document.getElementById('buscarProducto').value.toLowerCase();
    const almacenamiento = document.getElementById('filtroAlmacenamiento').value;
    const ordenar = document.getElementById('ordenarPor').value;

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

    renderizarCatalogo();
}

// Abrir catálogo público
function abrirCatalogoPublico() {
    window.open('catalogo-publico.html', '_blank');
}

// Abrir modal de producto
function abrirModalProducto(productoId = null) {
    productoActualId = productoId;
    const modal = document.getElementById('modalProducto');
    const titulo = document.getElementById('tituloModalProducto');

    if (productoId) {
        titulo.textContent = 'Editar Producto';
        const producto = productos.find(p => p.id === productoId);
        if (producto) {
            document.getElementById('productoModelo').value = producto.modelo || '';
            document.getElementById('productoColores').value = producto.colores || '';
            document.getElementById('productoAlmacenamiento').value = producto.almacenamiento || '';
            document.getElementById('productoBateria').value = producto.bateria ? parseInt(producto.bateria) : '';
            document.getElementById('productoPrecioUSD').value = producto.precio_usd || '';
            document.getElementById('productoNotas').value = producto.notas || '';
        }
    } else {
        titulo.textContent = 'Nuevo Producto';
        document.getElementById('formProducto').reset();
    }

    modal.classList.add('active');
}

// Cerrar modal de producto
function cerrarModalProducto() {
    document.getElementById('modalProducto').classList.remove('active');
    productoActualId = null;
}

// Guardar producto
async function guardarProducto() {
    const modelo = document.getElementById('productoModelo').value.trim();
    const colores = document.getElementById('productoColores').value.trim();
    const almacenamiento = document.getElementById('productoAlmacenamiento').value;
    const bateria = document.getElementById('productoBateria').value;
    const precio_usd = parseFloat(document.getElementById('productoPrecioUSD').value);
    const notas = document.getElementById('productoNotas').value.trim();

    if (!modelo || !precio_usd) {
        mostrarToast('Por favor completa los campos requeridos', 'error');
        return;
    }

    const productoData = {
        modelo,
        colores: colores || null,
        almacenamiento: almacenamiento || null,
        bateria: bateria ? `${bateria}%` : null,
        precio_usd,
        notas: notas || null
    };

    try {
        if (productoActualId) {
            await supabaseService.actualizarProducto(productoActualId, productoData);
            mostrarToast('Producto actualizado correctamente', 'success');
        } else {
            await supabaseService.crearProducto(productoData);
            mostrarToast('Producto creado correctamente', 'success');
        }

        cerrarModalProducto();
        await cargarDatos();
    } catch (error) {
        console.error('Error guardando producto:', error);
        mostrarToast('Error al guardar producto: ' + error.message, 'error');
    }
}

// Editar producto (función global para onclick)
window.editarProducto = function (productoId) {
    abrirModalProducto(productoId);
};

// Eliminar producto con confirmación
window.eliminarProductoConfirm = function (productoId, modelo) {
    if (confirm(`¿Estás seguro de eliminar el producto "${modelo}"?`)) {
        eliminarProductoFn(productoId);
    }
};

async function eliminarProductoFn(productoId) {
    try {
        await supabaseService.eliminarProducto(productoId);
        mostrarToast('Producto eliminado correctamente', 'success');
        await cargarDatos();
    } catch (error) {
        console.error('Error eliminando producto:', error);
        mostrarToast('Error al eliminar producto: ' + error.message, 'error');
    }
}

// ============================================
// COTIZACIÓN DEL DÓLAR
// ============================================

async function cargarCotizacionDolar() {
    try {
        const cotizacion = await supabaseService.obtenerCotizacionDolar();

        // --- Sincronización Automática Inteligente ---
        // Si la cotización tiene más de 6 horas, intentamos actualizarla automáticamente
        if (cotizacion && cotizacion.created_at) {
            const fechaCotizacion = new Date(cotizacion.created_at);
            const ahora = new Date();
            const horasDiferencia = (ahora - fechaCotizacion) / (1000 * 60 * 60);

            if (horasDiferencia > 6) {
                console.log('🕒 Cotización antigua (>6h). Iniciando actualización automática...');
                try {
                    await supabaseService.actualizarDolarAutomatico();
                    // Volver a obtener la cotización actualizada
                    return cargarCotizacionDolar();
                } catch (autoError) {
                    console.warn('No se pudo actualizar el dólar automáticamente:', autoError);
                }
            }
        }

        const valorFormateado = new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(cotizacion.valor);

        const el = document.getElementById('valorDolar');
        if (el) el.textContent = valorFormateado;
    } catch (error) {
        console.error('Error cargando cotización del dólar:', error);
        const el = document.getElementById('valorDolar');
        if (el) el.textContent = 'Error';
    }
}

function abrirModalDolar() {
    const modal = document.getElementById('modalDolar');
    document.getElementById('formDolar').reset();
    modal.classList.add('active');
}

function cerrarModalDolar() {
    document.getElementById('modalDolar').classList.remove('active');
}

async function guardarCotizacionDolar() {
    const nuevaCotizacion = parseFloat(document.getElementById('nuevaCotizacion').value);
    const notas = document.getElementById('notasCotizacion').value.trim();

    if (!nuevaCotizacion || nuevaCotizacion <= 0) {
        mostrarToast('Por favor ingresa una cotización válida', 'error');
        return;
    }

    try {
        await supabaseService.actualizarCotizacionDolar(nuevaCotizacion, 'manual', notas || null);
        mostrarToast('Cotización actualizada correctamente', 'success');
        cerrarModalDolar();

        // Recargar cotización y productos
        await cargarCotizacionDolar();

        // Mostrar mensaje informativo
        mostrarToast('Recuerda que los precios se recalcularán al editar cada producto', 'info');
    } catch (error) {
        console.error('Error actualizando cotización:', error);
        mostrarToast('Error al actualizar cotización: ' + error.message, 'error');
    }
}

async function sincronizarDolarAutomatico() {
    const btn = document.getElementById('btnSincronizarDolar');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin" style="margin-right: 0.5rem;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Sincronizando...`;
    btn.disabled = true;

    try {
        // Llamar al servicio que invoca la Edge Function
        await supabaseService.actualizarDolarAutomatico();

        mostrarToast('Cotización sincronizada correctamente', 'success');

        // Recargar datos
        await cargarCotizacionDolar();

        // Importante: Refrescar catálogo de productos también para ver los nuevos precios en ARS
        await cargarDatos();

        cerrarModalDolar();
    } catch (error) {
        console.error('Error sincronizando dólar:', error);
        mostrarToast('Error al sincronizar: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ============================================
// RENDERIZADO DE ESTADÍSTICAS (CHARTS)
// ============================================

let charts = {};

function renderizarEstadisticas() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js no está cargado aún');
        return;
    }

    console.log('📊 Renderizando estadísticas...', { totalConversaciones: conversaciones.length });

    // 1. Chart Equipo
    const ctxEquipo = document.getElementById('chartEquipo').getContext('2d');
    const labelsEquipo = VENDEDORES.map(v => v.nombre);

    // Calcular datos reales
    const conteoEquipo = VENDEDORES.map(v => {
        return conversaciones.filter(c => c.vendedor && c.vendedor.id === v.id).length;
    });

    if (charts.equipo) {
        charts.equipo.data.datasets[0].data = conteoEquipo;
        charts.equipo.update();
    } else {
        charts.equipo = new Chart(ctxEquipo, {
            type: 'bar',
            data: {
                labels: labelsEquipo,
                datasets: [{
                    label: 'Conversaciones Asignadas',
                    data: conteoEquipo,
                    backgroundColor: VENDEDORES.map(v => v.color.replace('0.2', '0.6')),
                    borderColor: VENDEDORES.map(v => v.border),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#ccc' }
                    },
                    x: {
                        ticks: { color: '#ccc' }
                    }
                }
            }
        });
    }

    // 2. Chart Embudo
    const ctxEmbudo = document.getElementById('chartEmbudo').getContext('2d');
    const labelsEmbudo = ETAPAS_EMBUDO.map(e => e.titulo);
    const dataEmbudo = ETAPAS_EMBUDO.map(e => e.items.length);

    if (charts.embudo) {
        charts.embudo.data.datasets[0].data = dataEmbudo;
        charts.embudo.update();
    } else {
        charts.embudo = new Chart(ctxEmbudo, {
            type: 'bar',
            data: {
                labels: labelsEmbudo,
                datasets: [{
                    label: 'Clientes',
                    data: dataEmbudo,
                    backgroundColor: 'rgba(128, 0, 32, 0.6)',
                    borderColor: '#ffc1cc',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#ccc' }
                    },
                    y: {
                        ticks: { color: '#ccc' }
                    }
                }
            }
        });
    }

    // 3. Chart Plataforma
    const ctxPlataforma = document.getElementById('chartPlataforma').getContext('2d');
    const wapCount = conversaciones.filter(c => c.clientes.plataforma === 'whatsapp').length;
    const igCount = conversaciones.filter(c => c.clientes.plataforma === 'instagram').length;

    if (charts.plataforma) {
        charts.plataforma.data.datasets[0].data = [wapCount, igCount];
        charts.plataforma.update();
    } else {
        charts.plataforma = new Chart(ctxPlataforma, {
            type: 'doughnut',
            data: {
                labels: ['WhatsApp', 'Instagram'],
                datasets: [{
                    data: [wapCount, igCount],
                    backgroundColor: ['#25D366', '#C13584'],
                    borderColor: ['#128C7E', '#833AB4'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#ccc' } }
                }
            }
        });
    }
}


// ============================================
// TOAST NOTIFICATIONS
// ============================================

function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <div>${mensaje}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// FUNCIONES DE PROGRAMACIÓN DE MENSAJES
// ============================================

// ============================================
// FUNCIONES DE PROGRAMACIÓN DE MENSAJES
// ============================================

// --- Lógica del Modal Personalizado ---
let confirmationCallback = null;

window.mostrarConfirmacion = function (mensaje, onConfirm) {
    const modal = document.getElementById('modalConfirmacion');
    const msgElement = document.getElementById('mensajeConfirmacion');
    const btnConfirm = document.getElementById('btnConfirmarAccion');

    msgElement.innerText = mensaje;
    confirmationCallback = onConfirm;

    // Reset position logic would go here if we wanted to re-center every time
    // But keeping last dragged position is often nice. 
    // For now let's just show it.
    modal.classList.add('active');

    // Setup one-time click listener
    btnConfirm.onclick = () => {
        if (confirmationCallback) confirmationCallback();
        window.cerrarModalConfirmacion();
    };
};

window.cerrarModalConfirmacion = function () {
    document.getElementById('modalConfirmacion').classList.remove('active');
    confirmationCallback = null;
};

// --- Draggable Logic ---
function setupDraggableModal() {
    const modalContent = document.getElementById('modalConfirmacionContent');
    const header = document.getElementById('modalConfirmacionHeader');

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === header || header.contains(e.target)) {
            isDragging = true;
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, modalContent);
        }
    }

    function setTranslate(xPos, yPos, el) {
        // We need to maintain the -50% for centering if we are adding to it,
        // or we remove the css transform and rely fully on JS.
        // Easiest is to remove the CSS transform: translate(-50%, -50%) once dragging starts
        // and handle absolute positioning, but keeping center + offset is smoother math.
        // Let's use calc.
        el.style.transform = `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px))`;
    }
}

// Initialize draggable on load
document.addEventListener('DOMContentLoaded', () => {
    setupDraggableModal();
});


window.programarAutoRespuesta = async (convId, intencionTipo) => {
    // 1. Buscar plantilla (case insensitive)
    const plantilla = mensajesAutomaticos.find(m => m.intencion.toLowerCase() === intencionTipo.toLowerCase() && m.activo);

    if (!plantilla) {
        mostrarToast(`No hay configuración activa para "${intencionTipo}". Ve a Mensajes Auto.`, 'warning');
        return;
    }

    // 2. Obtener datos cliente
    const conv = conversaciones.find(c => c.id === convId);
    if (!conv || !conv.clientes) {
        mostrarToast('No se encontró la conversación', 'error');
        return;
    }

    const dias = plantilla.dias_espera;
    const fechaProgramada = new Date();
    fechaProgramada.setDate(fechaProgramada.getDate() + dias);

    // Formato legible
    const fechaStr = fechaProgramada.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    window.mostrarConfirmacion(
        `¿Programar mensaje de seguimiento "${intencionTipo}" para ${conv.clientes.nombre}?\n\nFecha de envío: ${fechaStr} (en ${dias} días)`,
        async () => {
            try {
                const nuevoProgramado = await supabaseService.programarNuevoMensaje(
                    conv.clientes.id,
                    plantilla.id,
                    intencionTipo,
                    fechaProgramada.toISOString()
                );

                // Asegurar que el objeto tiene los datos del cliente para el renderizado inmediato
                const itemParaLista = nuevoProgramado.clientes ? nuevoProgramado : {
                    ...nuevoProgramado,
                    clientes: conv.clientes
                };

                // Actualizar estado local
                mensajesProgramados.push(itemParaLista);

                renderizarProgramados();
                mostrarToast(`Mensaje programado exitosamente para el ${fechaProgramada.toLocaleDateString()}`, 'success');
            } catch (error) {
                console.error('Error programando mensaje:', error);
                mostrarToast('Error al programar: ' + error.message, 'error');
            }
        }
    );
};

function renderizarProgramados() {
    const tbody = document.getElementById('tablaProgramados');
    const badge = document.getElementById('badgeProgramados');
    if (!tbody) return;

    if (!mensajesProgramados || mensajesProgramados.length === 0) {
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="5">
                    <p>No hay envíos programados pendientes.</p>
                </td>
            </tr>
        `;
        if (badge) badge.textContent = '0 pendientes';
        return;
    }

    // Ordenar por fecha próxima
    mensajesProgramados.sort((a, b) => new Date(a.fecha_envio) - new Date(b.fecha_envio));

    if (badge) badge.textContent = `${mensajesProgramados.length} pendientes`;

    tbody.innerHTML = mensajesProgramados.map(item => {
        const clienteNombre = item.clientes ? item.clientes.nombre : 'Cliente desconocido';
        const fechaObj = new Date(item.fecha_envio);
        const hoy = new Date();
        const diasRestantes = Math.ceil((fechaObj - hoy) / (1000 * 60 * 60 * 24));

        let estadoBadge = 'info';
        let estadoText = `En ${diasRestantes} días`;

        if (diasRestantes < 0) {
            estadoBadge = 'error';
            estadoText = 'Atrasado';
        } else if (diasRestantes === 0) {
            estadoBadge = 'warning';
            estadoText = 'Hoy';
        }

        return `
            <tr>
                <td><strong>${clienteNombre}</strong></td>
                <td>
                    <span class="intencion-badge ${item.tipo_plantilla.toLowerCase()}">${item.tipo_plantilla}</span>
                </td>
                <td>
                    <div>${fechaObj.toLocaleDateString('es-AR')}</div>
                    <small style="color: var(--gray-400)">${fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</small>
                </td>
                <td>
                    <span class="badge" style="background: var(--${estadoBadge}-color, #2196F3); color: white;">
                        ${estadoText}
                    </span>
                </td>
                <td>
                    <button class="btn-action danger" 
                            title="Cancelar"
                            onclick="window.eliminarProgramacion('${item.id}')">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.eliminarProgramacion = async (id) => {
    if (!confirm('¿Cancelar este envío programado?')) return;
    try {
        await supabaseService.eliminarSeguimiento(id);
        embudoVentas = embudoVentas.filter(e => e.id !== id);
        renderizarProgramados();
        mostrarToast('Programación cancelada', 'success');
    } catch (e) {
        console.error(e);
        mostrarToast('Error al cancelar', 'error');
    }
};
