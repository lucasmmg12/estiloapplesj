
import * as supabaseService from './supabase-client.js';

// Estado Local
let productosCache = [];
let categoriasCache = [];
let currentPage = 1;
let pageSize = 50;
let totalRecords = 0;

export async function initErp() {
    console.log('Iniciando Módulo ERP...');

    // 1. Configurar Listeners de Formularios
    setupEventListeners();

    // 2. Cargar Datos Iniciales (KPIs, Tablas, Selectors)
    await cargarDatosIniciales();

    // 3. Establecer fechas por defecto (Hoy)
    establecerFechasPorDefecto();

    // 4. Renderizar Gráficos
    renderizarGraficos();
}

function establecerFechasPorDefecto() {
    const hoy = new Date().toISOString().split('T')[0];
    const camposFecha = [
        'ingresoFecha',
        'gastoFecha',
        'filtroFechaDesde',
        'filtroFechaHasta'
    ];

    camposFecha.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) {
            el.value = hoy;
        }
    });
}

function setupEventListeners() {
    // Formulario de Ingresos
    const formIngreso = document.getElementById('formIngreso');
    if (formIngreso) {
        formIngreso.addEventListener('submit', handleIngresoSubmit);

        // Listener para selector de Categoria -> Mostrar/Ocultar Selector de Equipos o Servicios
        const radiosCategoria = document.getElementsByName('ingresoCategoria');
        radiosCategoria.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const containerEquipo = document.getElementById('selectorEquipoContainer');
                const selectProducto = document.getElementById('ingresoProductoId');

                const containerServicio = document.getElementById('selectorServicioContainer');
                const selectServicio = document.getElementById('ingresoTipoServicio');

                // Resetear visibilidad
                containerEquipo.style.display = 'none';
                selectProducto.required = false;
                selectProducto.value = '';

                containerServicio.style.display = 'none';
                selectServicio.required = false;
                selectServicio.value = '';

                if (e.target.value === 'Venta de Equipos') {
                    containerEquipo.style.display = 'block';
                    selectProducto.required = true;
                } else if (e.target.value === 'Servicio Tecnico') {
                    containerServicio.style.display = 'block';
                    selectServicio.required = true;
                }
            });
        });

        // ---------------------------------------------------------
        // LOGICA MULTI-PAGO
        // ---------------------------------------------------------
        const btnAgregarPago = document.getElementById('btnAgregarPago');
        const contenedorPagos = document.getElementById('contenedorPagosIngreso');

        // Agregar Fila
        btnAgregarPago?.addEventListener('click', () => {
            const nuevaFila = document.createElement('div');
            nuevaFila.className = 'pago-row';
            nuevaFila.style.display = "flex";
            nuevaFila.style.gap = "1rem";
            nuevaFila.style.marginBottom = "0.5rem";
            nuevaFila.innerHTML = `
                <select name="metodoPago[]" class="select-std" style="flex: 1;">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="USDT">USDT</option>
                    <option value="MercadoPago">MercadoPago</option>
                     <option value="Tarjeta">Tarjeta</option>
                </select>
                <input type="number" name="montoPago[]" placeholder="Monto" step="0.01" class="input-std monto-parcial" style="flex: 1;" required>
                <button type="button" class="btn-action danger btn-eliminar-pago" style="padding: 0.5rem;">✕</button>
            `;
            contenedorPagos.appendChild(nuevaFila);
        });

        // Eliminar Fila y Actualizar Total
        contenedorPagos?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-eliminar-pago')) {
                // No eliminar la última fila si es la única (opcional, pero buena UX)
                if (contenedorPagos.querySelectorAll('.pago-row').length > 1) {
                    e.target.closest('.pago-row').remove();
                    actualizarTotalDisplay();
                } else {
                    alert("Debe haber al menos un método de pago.");
                }
            }
        });

        // Actualizar Total al escribir
        contenedorPagos?.addEventListener('input', (e) => {
            if (e.target.classList.contains('monto-parcial')) {
                actualizarTotalDisplay();
            }
        });
    }

    // Formulario de Gastos
    const formGasto = document.getElementById('formGasto');
    if (formGasto) {
        formGasto.addEventListener('submit', handleGastoSubmit);
    }

    // Listar botón de Estadísticas para renderizar gráficos
    const btnEstadisticas = document.querySelector('.sub-nav-item[data-tab="estadisticas"]');
    if (btnEstadisticas) {
        btnEstadisticas.addEventListener('click', () => {
            setTimeout(() => {
                renderizarGraficos();
            }, 200);
        });
    }

    // Botón Refresh
    const btnRefresh = document.getElementById('btnRefreshErp');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            btnRefresh.classList.add('rotating');
            await cargarDatosIniciales();
            setTimeout(() => btnRefresh.classList.remove('rotating'), 1000);
        });
    }

    // Filtros de Fecha
    const btnFiltrar = document.getElementById('btnFiltrarFechas');
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', async () => {
            currentPage = 1;
            await cargarTablaMovimientos();
        });
    }

    // Chips de Tiempo Presets
    const chips = document.querySelectorAll('.chip-filter');
    chips.forEach(chip => {
        chip.addEventListener('click', async () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            aplicarPresetTiempo(chip.dataset.preset);
        });
    });

    // Paginación: Densidad
    const segBtns = document.querySelectorAll('#paginationDensity .seg-btn');
    segBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            segBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            pageSize = parseInt(btn.dataset.size);
            currentPage = 1;
            await cargarTablaMovimientos();
        });
    });

    // Paginación: Navegación
    document.getElementById('btnPrevPage')?.addEventListener('click', async () => {
        if (currentPage > 1) {
            currentPage--;
            await cargarTablaMovimientos();
        }
    });

    document.getElementById('btnNextPage')?.addEventListener('click', async () => {
        const totalPages = Math.ceil(totalRecords / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            await cargarTablaMovimientos();
        }
    });

    // Formulario Edición
    const formEdicion = document.getElementById('formEdicionTransaccion');
    if (formEdicion) {
        formEdicion.addEventListener('submit', handleEdicionSubmit);
    }

    // Exponer funciones globales
    window.cerrarModalExito = function () {
        document.getElementById('modalExito').classList.remove('active');
    };

    window.cerrarModalEdicionTransaccion = function () {
        document.getElementById('modalEdicionTransaccion').classList.remove('active');
    };

    window.abrirModalEdicion = async function (id) {
        try {
            const m = await supabaseService.obtenerTransaccionPorId(id);
            if (!m) return;

            document.getElementById('editTransaccionId').value = m.id;
            document.getElementById('editTransaccionFecha').value = m.date.split('T')[0];
            document.getElementById('editTransaccionDescripcion').value = m.description || '';
            document.getElementById('editTransaccionMonto').value = m.amount;
            document.getElementById('editTransaccionMoneda').value = m.currency;
            document.getElementById('editTransaccionTipo').value = m.type;

            document.getElementById('modalEdicionTransaccion').classList.add('active');
        } catch (error) {
            console.error(error);
            alert('Error al cargar datos: ' + error.message);
        }
    };

    window.eliminarMovimiento = async function (id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este movimiento? Esta acción es irreversible.')) return;

        try {
            await supabaseService.eliminarTransaccion(id);
            mostrarModalExito('Movimiento eliminado correctamente');
            await cargarDatosIniciales();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar: ' + error.message);
        }
    };
}

async function cargarDatosIniciales() {
    try {
        // Cargar Categorias (para mapear IDs)
        categoriasCache = await supabaseService.obtenerCategoriasTransaccion();

        // Cargar Productos (para el selector)
        const productos = await supabaseService.obtenerProductos();
        productosCache = productos;
        llenarSelectorProductos(productos);

        // Cargar Estadísticas (KPIs)
        await actualizarKPIs();

        // Cargar Tabla Últimos Movimientos
        await cargarTablaMovimientos();

        // Renderizar Gráficos
        await renderizarGraficos();

    } catch (error) {
        console.error('Error cargando datos ERP:', error);
    }
}

function llenarSelectorProductos(productos) {
    const select = document.getElementById('ingresoProductoId');
    if (!select) return;

    select.innerHTML = '<option value="">Buscar modelo...</option>';

    productos.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.modelo} (${p.almacenamiento}) - Stock: ${p.stock || '?'}`;
        select.appendChild(option);
    });
}

function actualizarTotalDisplay() {
    const inputs = document.querySelectorAll('.monto-parcial');
    let total = 0;
    inputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('displayTotalIngreso').textContent = `$${total.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function mostrarModalExito(mensaje) {
    const modal = document.getElementById('modalExito');
    const mensajeElement = document.getElementById('modalExitoMensaje');
    if (modal && mensajeElement) {
        mensajeElement.textContent = mensaje;
        modal.classList.add('active');
    }
}

async function handleIngresoSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData(e.target);
        const categoriaNombre = formData.get('ingresoCategoria');
        const categoriaObj = categoriasCache.find(c => c.name === categoriaNombre && c.type === 'INCOME');

        if (!categoriaObj) throw new Error(`Categoría no encontrada: ${categoriaNombre}`);

        const moneda = formData.get('ingresoMoneda');
        const fecha = new Date(formData.get('ingresoFecha')).toISOString();
        const productoId = formData.get('ingresoProductoId');
        const tipoServicio = formData.get('ingresoTipoServicio');

        // Recolectar Pagos
        const filasPago = document.querySelectorAll('.pago-row');
        const pagos = [];
        let totalMonto = 0;

        filasPago.forEach(row => {
            const select = row.querySelector('select');
            const input = row.querySelector('input');
            const metodo = select.value;
            const monto = parseFloat(input.value);

            if (monto > 0) {
                pagos.push({ metodo, monto });
                totalMonto += monto;
            }
        });

        if (pagos.length === 0) throw new Error("Debe ingresar al menos un monto válido.");

        // Construir Descripción General
        let descripcionBase = categoriaNombre;
        if (categoriaNombre === 'Venta de Equipos' && productoId) {
            descripcionBase = `Venta: ${obtenerNombreProducto(productoId)}`;
        } else if (categoriaNombre === 'Servicio Tecnico' && tipoServicio) {
            descripcionBase = `Servicio: ${tipoServicio}`;
        }

        // Crear una transacción por cada pago parcial
        const promesas = pagos.map(pago => {
            const transaccion = {
                date: fecha,
                type: 'INCOME',
                amount: pago.monto,
                currency: pago.metodo === 'USDT' ? 'USDT' : moneda,
                category_id: categoriaObj.id,
                description: `${descripcionBase} (${pago.metodo})`,
                created_at: new Date().toISOString()
            };

            // Lógica de sucursal según año
            if (new Date(fecha).getFullYear() >= 2026) {
                transaccion.branch = "Estilo Apple SJ";
            }

            return supabaseService.crearTransaccion(transaccion);
        });

        await Promise.all(promesas);

        // Actualizar Stock (SOLO UNA VEZ, no por cada pago)
        if (categoriaNombre === 'Venta de Equipos' && productoId) {
            const producto = await supabaseService.obtenerProductoPorId(productoId);
            if (producto) {
                const nuevoStock = (producto.stock || 0) - 1;
                await supabaseService.actualizarProducto(productoId, { stock: nuevoStock });

                // Registrar Movimiento Inventario
                await supabaseService.registrarMovimientoInventario({
                    product_id: productoId,
                    type: 'OUT',
                    quantity: 1,
                    reason: 'Venta Directa'
                });
            }
        }

        mostrarModalExito('Venta registrada correctamente ✅');
        e.target.reset();

        // Reset manual UI
        document.getElementById('selectorEquipoContainer').style.display = 'none';
        document.getElementById('selectorServicioContainer').style.display = 'none';
        // Reset rows to 1
        const contenedor = document.getElementById('contenedorPagosIngreso');
        if (contenedor) {
            while (contenedor.children.length > 1) {
                contenedor.removeChild(contenedor.lastChild);
            }
        }
        actualizarTotalDisplay();

        await cargarDatosIniciales();

    } catch (error) {
        console.error(error);
        alert('Error al registrar ingreso: ' + error.message);
    }
}

async function handleGastoSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData(e.target);
        const categoriaNombre = document.getElementById('gastoCategoria').value;
        const categoriaObj = categoriasCache.find(c => c.name === categoriaNombre && c.type === 'EXPENSE');

        if (!categoriaObj) throw new Error(`Categoría no encontrada (asegurate de haber cargado el SQL): ${categoriaNombre}`);

        const moneda = formData.get('gastoMoneda');
        const monto = parseFloat(formData.get('gastoMonto'));
        const fecha = new Date(formData.get('gastoFecha')).toISOString();
        const comentario = document.getElementById('gastoComentario').value;

        const transaccion = {
            date: fecha,
            type: 'EXPENSE',
            amount: monto,
            currency: moneda,
            category_id: categoriaObj.id,
            description: comentario || categoriaNombre,
            created_at: new Date().toISOString()
        };

        // Lógica de sucursal según año
        if (new Date(fecha).getFullYear() >= 2026) {
            transaccion.branch = "Estilo Apple SJ";
        }

        await supabaseService.crearTransaccion(transaccion);

        mostrarModalExito('Gasto registrado correctamente 📉');
        e.target.reset();
        await cargarDatosIniciales();

    } catch (error) {
        console.error(error);
        alert('Error al registrar gasto: ' + error.message);
    }
}

async function handleEdicionSubmit(e) {
    e.preventDefault();

    try {
        const id = document.getElementById('editTransaccionId').value;
        const fecha = new Date(document.getElementById('editTransaccionFecha').value).toISOString();
        const descripcion = document.getElementById('editTransaccionDescripcion').value;
        const monto = parseFloat(document.getElementById('editTransaccionMonto').value);
        const moneda = document.getElementById('editTransaccionMoneda').value;
        const tipo = document.getElementById('editTransaccionTipo').value; // No se edita, pero se mantiene

        const datosActualizados = {
            date: fecha,
            description: descripcion,
            amount: monto,
            currency: moneda,
            // type y category_id no se editan en este modal simplificado
        };

        await supabaseService.actualizarTransaccion(id, datosActualizados);
        mostrarModalExito('Movimiento actualizado correctamente ✅');
        window.cerrarModalEdicionTransaccion();
        await cargarDatosIniciales();
    } catch (error) {
        console.error(error);
        alert('Error al actualizar movimiento: ' + error.message);
    }
}

async function actualizarKPIs() {
    // Calculo en PESOS ARGENTINOS (ARS)
    const hoy = new Date().toISOString().split('T')[0];
    const transacciones = await supabaseService.obtenerResumenFinanciero(hoy, new Date().toISOString());

    let ingresosARS = 0;
    let gastosARS = 0;

    // Formateador para ARS
    const formatoARS = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    transacciones.forEach(t => {
        let tasa = t.exchange_rate || 1485;
        let montoARS = t.currency === 'ARS' ? t.amount : (t.amount * tasa);

        if (t.type === 'INCOME') ingresosARS += montoARS;
        if (t.type === 'EXPENSE') gastosARS += montoARS;
    });

    const cajaTotal = ingresosARS - gastosARS;

    // Actualizar DOM con formato ARS y estilos dinámicos
    const elCaja = document.getElementById('kpiCajaTotal');
    const elVentas = document.getElementById('kpiVentasHoy');
    const elGastos = document.getElementById('kpiGastosHoy');

    if (elCaja) {
        elCaja.textContent = formatoARS.format(cajaTotal);
        elCaja.style.fontWeight = 'bold';
        elCaja.style.color = cajaTotal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    if (elVentas) {
        elVentas.textContent = formatoARS.format(ingresosARS);
        elVentas.style.fontWeight = 'bold';
        elVentas.style.color = 'var(--accent-green)';
    }
    if (elGastos) {
        elGastos.textContent = formatoARS.format(gastosARS);
        elGastos.style.fontWeight = 'bold';
        elGastos.style.color = 'var(--accent-red)';
    }
}

function aplicarPresetTiempo(preset) {
    const hoy = new Date();
    const hoyISO = hoy.toISOString().split('T')[0];
    let desde = hoyISO;
    let hasta = hoyISO;

    if (preset === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        desde = d.toISOString().split('T')[0];
    } else if (preset === 'month') {
        const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        desde = d.toISOString().split('T')[0];
    } else if (preset === 'year') {
        desde = '2026-01-01';
        hasta = '2026-12-31';
    } else if (preset === 'all') {
        desde = '';
        hasta = '';
    }

    document.getElementById('filtroFechaDesde').value = desde;
    document.getElementById('filtroFechaHasta').value = hasta;

    currentPage = 1;
    cargarTablaMovimientos();
}

async function cargarTablaMovimientos() {
    const filtros = {
        fechaInicio: document.getElementById('filtroFechaDesde').value,
        fechaFin: document.getElementById('filtroFechaHasta').value
    };

    if (filtros.fechaInicio) filtros.fechaInicio = new Date(filtros.fechaInicio).toISOString();
    if (filtros.fechaFin) {
        const h = new Date(filtros.fechaFin);
        h.setHours(23, 59, 59, 999);
        filtros.fechaFin = h.toISOString();
    }

    const result = await supabaseService.obtenerUltimasTransacciones(filtros, currentPage, pageSize);
    const movimientos = result.data;
    totalRecords = result.total;

    const tbody = document.getElementById('tablaMovimientos');
    tbody.innerHTML = '';

    if (!movimientos || movimientos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay movimientos que coincidan</td></tr>';
        actualizarPaginacionUI();
        return;
    }

    movimientos.forEach(m => {
        const tr = document.createElement('tr');
        const fecha = new Date(m.date).toLocaleDateString('es-AR');
        const isIncome = m.type === 'INCOME';
        const color = isIncome ? 'var(--accent-green)' : 'var(--accent-red)';
        const simbolo = isIncome ? '+' : '-';

        // Formatear monto con separadores de miles
        const montoFormateado = m.amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        tr.innerHTML = `
            <td style="color: var(--gray-400); font-size: 0.85rem;">${fecha}</td>
            <td><span style="color: ${color}; font-weight: 800; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">${isIncome ? 'Ingreso' : 'Gasto'}</span></td>
            <td style="font-weight: 500;">
                <div style="font-size: 0.9rem;">${m.transaction_categories?.name || 'Otro'}</div>
                <div style="font-size: 0.7rem; color: var(--gray-400);">${m.branch || ''}</div>
            </td>
            <td style="color: ${color}; font-weight: 800; font-family: 'Inter', monospace;">
                ${simbolo} $${montoFormateado} <span style="font-size: 0.7rem; opacity: 0.7;">${m.currency}</span>
            </td>
            <td style="color: var(--gray-100); font-size: 0.9rem;">${m.description || '-'}</td>
             <td style="text-align: center;">
                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button class="btn-action" onclick="abrirModalEdicion('${m.id}')" title="Editar" style="background: rgba(255, 255, 255, 0.05); border: none; padding: 6px; border-radius: 8px; color: var(--gray-100);">
                        ✏️
                    </button>
                    <button class="btn-action danger" onclick="eliminarMovimiento('${m.id}')" title="Eliminar" style="background: rgba(255, 69, 58, 0.1); border: none; padding: 6px; border-radius: 8px;">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    actualizarPaginacionUI();
}

function actualizarPaginacionUI() {
    const from = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalRecords);

    document.getElementById('paginationInfo').textContent = `Mostrando ${from}-${to} de ${totalRecords}`;
    document.getElementById('currentPageLabel').textContent = currentPage;

    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');

    if (btnPrev) btnPrev.disabled = currentPage === 1;
    if (btnNext) btnNext.disabled = to >= totalRecords;
}

function obtenerNombreProducto(id) {
    const p = productosCache.find(p => p.id == id);
    return p ? p.modelo : 'Desconocido';
}

let chartFinanzasInstance = null;
let chartCategoriasInstance = null;

export async function renderizarGraficos() {
    try {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString();

        // Obtener datos del mes
        const transacciones = await supabaseService.obtenerResumenFinanciero(inicioMes, finMes);

        // --- Procesar Datos Chart 1: Balance ---
        let totalIngresos = 0;
        let totalGastos = 0;

        transacciones.forEach(t => {
            // Conversión simplificada a ARS o USD unificado (Supongamos USD base para gráficos o visualización mixta)
            // Para ser precisos, deberíamos normalizar. Usaremos valor nominal si es moneda principal, o conversión.
            // Asumimos visualización en Moneda Base (ej. USD o ARS según configuración). 
            // Por ahora sumamos todo nominal si es coincidente o aplicamos tasa.
            // *Mejor enfoque:* Usar la lógica de KPIs para normalizar a una moneda (ej ARS).

            let tasa = t.exchange_rate || 1200;
            let montoNormalizado = t.currency === 'ARS' ? (t.amount / tasa) : t.amount; // A VER: Lógica inversa.
            // Si quiero ver todo en USD: ARS / Tasa. USD = USD.
            // Si quiero ver todo en ARS: USD * Tasa. ARS = ARS.
            // Vamos a mostrar en USD Estimado.

            if (t.type === 'INCOME') totalIngresos += montoNormalizado;
            if (t.type === 'EXPENSE') totalGastos += montoNormalizado;
        });

        // --- Procesar Datos Chart 2: Categorías Ingresos ---
        const categoriasMap = {};
        transacciones.filter(t => t.type === 'INCOME').forEach(t => {
            const catName = t.transaction_categories?.type || 'Varios'; // Ajustar si no viene el join deep
            // El servicio trae: transaction_categories (name, type).
            // Entonces acceso es t.transaction_categories.name
            const nombre = t.transaction_categories?.name || 'Otros';

            let tasa = t.exchange_rate || 1200;
            let monto = t.currency === 'ARS' ? (t.amount / tasa) : t.amount; // Normalizado a USD

            categoriasMap[nombre] = (categoriasMap[nombre] || 0) + monto;
        });

        // --- Render Chart 1: Balance ---
        const ctxBalance = document.getElementById('chartFinanzas');
        if (ctxBalance) {
            if (chartFinanzasInstance) chartFinanzasInstance.destroy();

            chartFinanzasInstance = new Chart(ctxBalance, {
                type: 'bar',
                data: {
                    labels: ['Ingresos', 'Gastos'],
                    datasets: [{
                        label: 'Usuario (USD Est.)',
                        data: [totalIngresos, totalGastos],
                        backgroundColor: ['#00ff88', '#ff4d4d'],
                        borderRadius: 8,
                        barThickness: 50
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return '$ ' + context.raw.toFixed(2) + ' USD';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#888' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#fff', font: { weight: 'bold' } }
                        }
                    }
                }
            });
        }

        // --- Render Chart 2: Categorías ---
        const ctxCat = document.getElementById('chartCategorias');
        if (ctxCat) {
            if (chartCategoriasInstance) chartCategoriasInstance.destroy();

            const labels = Object.keys(categoriasMap);
            const data = Object.values(categoriasMap);
            const colors = ['#00d4ff', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

            chartCategoriasInstance = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
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
                            labels: { color: '#ccc', usePointStyle: true }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.label + ': $' + context.raw.toFixed(2) + ' USD';
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }

    } catch (e) {
        console.error("Error renderizando gráficos ERP:", e);
    }
}
