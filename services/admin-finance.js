
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


// Helper for Argentina Timezone
function getArgentinaDate(dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();
    // Argentina is UTC-3. We want to display correctly relative to local time.
    // Ideally use libraries like dayjs, but for vanilla:
    const offset = date.getTimezoneOffset() * 60000;
    const argOffset = -3 * 3600000;
    // This is a naive approach ensuring we send/display consistent strings.
    // For input 'date' (YYYY-MM-DD), we just use it. 
    return date;
}

function establecerFechasPorDefecto() {
    // Argentina UTC-3 adjustment for default input value
    const now = new Date();
    const argTime = new Date(now.getTime() - (3 * 3600000));
    const hoy = argTime.toISOString().split('T')[0];

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

            // Basic Fields
            document.getElementById('editTransaccionId').value = m.id;
            document.getElementById('editTransaccionFecha').value = m.date.split('T')[0];
            document.getElementById('editTransaccionDescripcion').value = m.description || '';
            document.getElementById('editTransaccionMonto').value = m.amount;
            document.getElementById('editTransaccionMoneda').value = m.currency;
            document.getElementById('editTransaccionTipo').value = m.type;

            // Category Selector Population
            const slCat = document.getElementById('editTransaccionCategoria');
            slCat.innerHTML = '<option value="">Seleccionar...</option>';
            categoriasCache
                .filter(c => c.type === m.type)
                .forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    if (c.id === m.category_id) opt.selected = true;
                    slCat.appendChild(opt);
                });

            // Listen for Category Changes to toggle Sub-fields
            slCat.onchange = () => toggleEditSubfields(slCat.value, m.type);

            // Product Selector Population
            const slProd = document.getElementById('editTransaccionProductoId');
            slProd.innerHTML = '<option value="">Seleccionar producto...</option>';
            productosCache.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.modelo} - Stock: ${p.stock}`;
                if (m.related_product_id === p.id) opt.selected = true;
                slProd.appendChild(opt);
            });

            // Initial Toggle
            toggleEditSubfields(m.category_id, m.type);
            // Service Type (Since it's not a DB relation but text, we just set it if exists)
            // Need to parse from description? Or store separate? 
            // Currently type is stored in description string: "Servicio: Cambio de Pantalla". 
            // In the form we have a dropdown. 
            // Reverse engineering description for Service Type selection:
            const desc = m.description || '';
            if (desc.startsWith('Servicio: ')) {
                const svType = desc.replace('Servicio: ', '').split(' (')[0].trim();
                const slServ = document.getElementById('editTransaccionTipoServicio');
                // Try to find matching option
                for (let opt of slServ.options) {
                    if (opt.value === svType) {
                        slServ.value = svType;
                        break;
                    }
                }
            }


            document.getElementById('modalEdicionTransaccion').classList.add('active');
        } catch (error) {
            console.error(error);
            alert('Error al cargar datos: ' + error.message);
        }
    };

    function toggleEditSubfields(categoryId, type) {
        const catObj = categoriasCache.find(c => c.id === categoryId);
        const name = catObj ? catObj.name : '';

        const divProd = document.getElementById('editSelectorEquipoContainer');
        const divServ = document.getElementById('editSelectorServicioContainer');

        divProd.style.display = 'none';
        divServ.style.display = 'none';

        if (type === 'INCOME') {
            if (name === 'Venta de Equipos') divProd.style.display = 'block';
            if (name === 'Servicio Tecnico') divServ.style.display = 'block';
        }
    }

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
    // PDF Export
    document.getElementById('btnExportarPDF')?.addEventListener('click', exportarReportePDF);
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

        // Renderizar Gráficos y Análisis
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

        // New Fields
        const categoriaId = document.getElementById('editTransaccionCategoria').value;
        const productoId = document.getElementById('editTransaccionProductoId').value;
        const tipoServicio = document.getElementById('editTransaccionTipoServicio').value;

        // Validar categoría selection
        const categoriaObj = categoriasCache.find(c => c.id === categoriaId);

        // Construct description if needed based on new selections (optional logic, keeping simple for now)
        // Or keep user manual description. We will keep manual description unless empty.

        const datosActualizados = {
            date: fecha,
            description: descripcion,
            amount: monto,
            currency: moneda,
            category_id: categoriaId,
            related_product_id: productoId || null
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

// ----------------------------------------------------------------------
// DASHBOARD LOGIC (KPIS, CHARTS, ANALYSIS)
// ----------------------------------------------------------------------

async function actualizarKPIs() {
    const hoyDate = new Date();
    // Ranges
    const startOfDay = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate()).toISOString();

    const startOfWeekDate = new Date(hoyDate);
    const day = startOfWeekDate.getDay() || 7;
    if (day !== 1) startOfWeekDate.setHours(-24 * (day - 1));
    startOfWeekDate.setHours(0, 0, 0, 0);
    const startOfWeek = startOfWeekDate.toISOString();

    const startOfMonth = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1).toISOString();
    const endOfToday = new Date().toISOString();

    // Fetch All Data needed (Current Month is base, but we might need more for week if month just started? 
    // Simplification: We fetch current month for Charts, but for KPIs specifically we might need to query precise ranges or just filter client side if we have enough data.
    // PROD: Fetching huge datasets is bad. We should have backend endpoints for aggregations. 
    // Here we will use `obtenerResumenFinanciero` which filters by date range. 
    // For 'Today' and 'Week', if they fall within Month, we are good.

    // Let's fetch from start of Month for charts AND start of Week (which might be in prev month).
    const earliestDate = startOfWeek < startOfMonth ? startOfWeek : startOfMonth;

    const transacciones = await supabaseService.obtenerResumenFinanciero(earliestDate, endOfToday);
    // Fetch Exchange Rate if needed dynamic? Using 1220 as base if fail but we should fetch from DB if possible or use last stored.
    // For now simplistic.

    // Helpers
    const getMontoARS = (t) => {
        let tasa = t.exchange_rate || 1485;
        return t.currency === 'ARS' ? t.amount : (t.amount * tasa);
    };

    const periodFilter = (t, startIso) => new Date(t.date) >= new Date(startIso);

    // Initializers
    let incDay = 0, incWeek = 0, incMonth = 0;
    let expDay = 0, expWeek = 0, expMonth = 0;

    transacciones.forEach(t => {
        const monto = getMontoARS(t);
        const isIncome = t.type === 'INCOME';

        // Month
        if (periodFilter(t, startOfMonth)) {
            if (isIncome) incMonth += monto; else expMonth += monto;
        }
        // Week
        if (periodFilter(t, startOfWeek)) {
            if (isIncome) incWeek += monto; else expWeek += monto;
        }
        // Day
        if (periodFilter(t, startOfDay)) {
            if (isIncome) incDay += monto; else expDay += monto;
        }
    });

    const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

    // Update DOM
    // Ingresos
    document.getElementById('kpiIngresoHoy').textContent = fmt.format(incDay);
    document.getElementById('kpiIngresoSemana').textContent = fmt.format(incWeek);
    document.getElementById('kpiIngresoMes').textContent = fmt.format(incMonth);

    // Egresos
    const kpiGastoHoy = document.getElementById('kpiGastoHoy');
    if (kpiGastoHoy) kpiGastoHoy.textContent = fmt.format(expDay);

    document.getElementById('kpiGastoSemana').textContent = fmt.format(expWeek);
    document.getElementById('kpiGastoMes').textContent = fmt.format(expMonth);


    // ------------------------------------------
    // UPDATE NEW TAB ELEMENTS (If they exist in DOM)
    // ------------------------------------------

    // TAB: VENTAS
    const heroIngresos = document.getElementById('heroIngresosMes');
    if (heroIngresos) {
        heroIngresos.textContent = fmt.format(incMonth);
        // Also update sub-kpis
        document.getElementById('kpiIngresoHoy_Tab').textContent = fmt.format(incDay);
        document.getElementById('kpiIngresoSemana_Tab').textContent = fmt.format(incWeek);

        // Calculate Ticket Promedio (Month)
        const incomeTxCount = transacciones.filter(t => t.type === 'INCOME' && periodFilter(t, startOfMonth)).length;
        const avgTicket = incomeTxCount > 0 ? (incMonth / incomeTxCount) : 0;
        document.getElementById('kpiTicketPromedio').textContent = fmt.format(avgTicket);
    }

    // TAB: GASTOS
    const heroGastos = document.getElementById('heroGastosMes');
    if (heroGastos) {
        heroGastos.textContent = fmt.format(expMonth);
        // Sub-kpis
        document.getElementById('kpiGastoHoy_Tab').textContent = fmt.format(expDay);
        document.getElementById('kpiGastoSemana_Tab').textContent = fmt.format(expWeek);

        // Calculate Top Expense Category (Month)
        const expenseTxs = transacciones.filter(t => t.type === 'EXPENSE' && periodFilter(t, startOfMonth));
        const catMap = {};
        expenseTxs.forEach(t => {
            const catName = t.transaction_categories?.name || 'Otro';
            catMap[catName] = (catMap[catName] || 0) + getMontoARS(t);
        });

        let topCat = '-';
        let topVal = 0;
        Object.entries(catMap).forEach(([name, val]) => {
            if (val > topVal) {
                topVal = val;
                topCat = name;
            }
        });
        document.getElementById('kpiMayorGastoCat').textContent = `${topCat} (${fmt.format(topVal)})`;
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


// ----------------------------------------------------------------------
// CHARTS & ANALYTICS IMPLEMENTATION
// ----------------------------------------------------------------------

// Instance Cache
let chartInstances = {};

export async function renderizarGraficos() {
    try {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString();

        // 1. Fetch Month Data
        const transacciones = await supabaseService.obtenerResumenFinanciero(inicioMes, finMes);

        // helpers
        const getMontoARS = (t) => {
            let tasa = t.exchange_rate || 1485;
            return t.currency === 'ARS' ? t.amount : (t.amount * tasa);
        };

        // ------------------
        // AGGREGATION LOGIC
        // ------------------

        // 1. Daily Trends (Income vs Expense)
        // Group by Day (1-30/31)
        const daysInMonth = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
        const labelsDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const dataIncDay = new Array(daysInMonth).fill(0);
        const dataExpDay = new Array(daysInMonth).fill(0);

        // 2. Top Services (Count & Amount)
        // Filter by category 'Servicio Tecnico'
        const servicesMap = {};

        // 3. Top Products
        // Filter by category 'Venta de Equipos' or 'Accesorios'
        const productsMap = {};

        // 4. iPhone Generations
        // Regex on Description
        const iphoneMap = {};

        // 5. Payment Methods
        const paymentMap = {};

        transacciones.forEach(t => {
            const date = new Date(t.date);
            const day = date.getDate();
            const idx = day - 1;
            const monto = getMontoARS(t);
            const catName = t.transaction_categories?.name || 'Otro';

            // Trends
            if (t.type === 'INCOME') dataIncDay[idx] += monto;
            else dataExpDay[idx] += monto;

            // Payment Methods
            // Parse from description " (Metodo)" or if we save it in metadata later?
            // Currently description: "Servicio: X (Efectivo)" or "Venta: Y (USDT)"
            let pm = 'Desconocido';
            const pmMatch = t.description.match(/\(([^)]+)\)$/);
            if (pmMatch) pm = pmMatch[1];
            paymentMap[pm] = (paymentMap[pm] || 0) + 1; // Count volume

            // Services
            if (catName === 'Servicio Tecnico') {
                // Desc: "Servicio: Cambio de Pantalla (Efectivo)"
                let svc = t.description.replace('Servicio: ', '').replace(/\s*\([^)]*\)$/, '').trim();
                servicesMap[svc] = (servicesMap[svc] || 0) + 1;
            }

            // Products
            if (catName === 'Venta de Equipos' || catName === 'Venta de Accesorios') {
                let prod = t.description.replace('Venta: ', '').replace(/\s*\([^)]*\)$/, '').trim();
                productsMap[prod] = (productsMap[prod] || 0) + 1;

                // iPhone Gen
                if (prod.toLowerCase().includes('iphone')) {
                    // Extract Gen number
                    const genMatch = prod.match(/iphone\s*(\d+)/i);
                    if (genMatch) {
                        const gen = `iPhone ${genMatch[1]} Series`;
                        iphoneMap[gen] = (iphoneMap[gen] || 0) + 1;
                    }
                }
            }
        });

        // ------------------
        // RENDERING
        // ------------------

        // Helper Render
        const renderChart = (id, type, labels, datasets, options = {}) => {
            const ctx = document.getElementById(id);
            if (!ctx) return;
            if (chartInstances[id]) chartInstances[id].destroy();
            chartInstances[id] = new Chart(ctx, { type, data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, ...options } });
        };

        // Chart 1: Income Trend (Line)
        renderChart('chartTrendIngresos', 'line', labelsDays, [{
            label: 'Ingresos Diarios (ARS)',
            data: dataIncDay,
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            fill: true,
            tension: 0.4
        }]);

        // Chart 2: Expense Trend (Line)
        renderChart('chartTrendGastos', 'line', labelsDays, [{
            label: 'Gastos Diarios (ARS)',
            data: dataExpDay,
            borderColor: '#ff4d4d',
            backgroundColor: 'rgba(255, 77, 77, 0.1)',
            fill: true,
            tension: 0.4
        }]);

        // Chart 3: Top Services (Bar)
        const sortedServices = Object.entries(servicesMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        renderChart('chartTopServices', 'bar', sortedServices.map(x => x[0]), [{
            label: 'Servicios Realizados',
            data: sortedServices.map(x => x[1]),
            backgroundColor: '#00d4ff',
            borderRadius: 5
        }]);

        // Chart 4: Top Products (Bar)
        const sortedProducts = Object.entries(productsMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        renderChart('chartTopProducts', 'bar', sortedProducts.map(x => x[0]), [{
            label: 'Unidades Vendidas',
            data: sortedProducts.map(x => x[1]),
            backgroundColor: '#f59e0b',
            borderRadius: 5
        }]);

        // Chart 5: iPhone Generations (Doughnut)
        const sortedGen = Object.entries(iphoneMap).sort((a, b) => b[1] - a[1]);
        renderChart('chartIphoneGenerations', 'doughnut', sortedGen.map(x => x[0]), [{
            data: sortedGen.map(x => x[1]),
            backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'],
            borderWidth: 0
        }], { cutout: '60%' });

        // Chart 6: Payment Methods (Pie)
        const sortedPay = Object.entries(paymentMap).sort((a, b) => b[1] - a[1]);
        renderChart('chartPaymentMethods', 'polarArea', sortedPay.map(x => x[0]), [{
            data: sortedPay.map(x => x[1]),
            backgroundColor: ['#ffffffaa', '#00ff88aa', '#00d4ffaa', '#f59e0baa', '#ff4d4daa'],
            borderWidth: 0
        }]);

        // ------------------
        // AI ANALYSIS
        // ------------------
        generarAnalisisIA(transacciones, dataIncDay, dataExpDay, productsMap, servicesMap);

    } catch (e) {
        console.error("Error renderizando gráficos ERP:", e);
    }
}

// ----------------------------------------------------------------------
// AI ANALYSIS MODULE
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// AI ANALYSIS MODULE
// ----------------------------------------------------------------------

function generarAnalisisIA(transacciones, incTrends, expTrends, products, services) {
    if (!incTrends || !expTrends) return; // Guard clause if trends undefined

    // 1. Descriptivo
    const totalInc = incTrends.reduce((a, b) => a + b, 0);
    const totalExp = expTrends.reduce((a, b) => a + b, 0);
    const balance = totalInc - totalExp;
    const bestDay = incTrends.indexOf(Math.max(...incTrends)) + 1;

    // Sort logic safe access
    const topProd = Object.entries(products).sort((a, b) => b[1] - a[1])[0] || ['Ninguno', 0];
    const topServ = Object.entries(services).sort((a, b) => b[1] - a[1])[0] || ['Ninguno', 0];

    const descriptivo = `
        Este mes has generado un total de ARS ${totalInc.toLocaleString()} con gastos de ARS ${totalExp.toLocaleString()}, 
        resultando en un balance neto de ARS ${balance.toLocaleString()}. 
        El mejor día de ventas fue el día ${bestDay}. 
        El producto estrella es "${topProd[0]}" y el servicio más solicitado "${topServ[0]}".
    `;
    const descEl = document.getElementById('analisisDescriptivo');
    if (descEl) descEl.textContent = descriptivo;

    // 2. Diagnóstico (Simulated Comparison logic)
    // In a real scenario we would fetch prev month data here.
    const diagnostico = `
        El margen de beneficio bruto se sitúa en un ${(totalInc > 0 ? (balance / totalInc) * 100 : 0).toFixed(1)}%. 
        ${totalExp > totalInc * 0.5 ? "⚠️ Alerta: Los gastos superan el 50% de los ingresos. Revisar costos de proveedores." : "✅ Los costos se mantienen en niveles saludables."}
        La alta demanda de servicio técnico sugiere un buen posicionamiento en post-venta.
    `;
    const diagEl = document.getElementById('analisisDiagnostico');
    if (diagEl) diagEl.textContent = diagnostico;

    // 3. Predictivo (Linear Regression Simple Approximation)
    // Avg growth per day?
    const avgDaily = totalInc / (new Date().getDate());
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projected = avgDaily * daysInMonth;

    const predictivo = `
        Basado en el rendimiento diario actual (ARS ${Math.round(avgDaily).toLocaleString()}/día), 
        se proyecta cerrar el mes con ingresos aproximados de ARS ${Math.round(projected).toLocaleString()}.
        Se espera un aumento de tráfico los fines de semana.
    `;
    const predEl = document.getElementById('analisisPredictivo');
    if (predEl) predEl.textContent = predictivo;

    // 4. Prescriptivo
    const recomendaciones = document.getElementById('analisisPrescriptivo');
    if (recomendaciones) {
        recomendaciones.innerHTML = '';
        const recs = [];
        if (balance < 0) recs.push("Prioridad Crítica: Reducir gastos hormiga inmediatos.");
        if (topProd[1] > 5) recs.push(`🔥 Tendencia: Asegurar stock de "${topProd[0]}" para evitar quiebre.`);
        if (topServ[1] > 5) recs.push(`🔧 Oportunidad: Crear pack promocional para "${topServ[0]}".`);
        recs.push("Sugerencia: Revisar precios de iPhone ante fluctuación del dólar.");

        recs.forEach(r => {
            const li = document.createElement('li');
            li.textContent = r;
            recomendaciones.appendChild(li);
        });
    }
}


// ----------------------------------------------------------------------
// EXPORT PDF
// ----------------------------------------------------------------------

function exportarReportePDF() {
    const element = document.getElementById('analisisEstrategicoContainer');
    if (!element) return;

    // Cloning to avoid messing up UI with styles
    const clone = element.cloneNode(true);
    clone.style.width = '1000px';
    clone.style.background = '#111827';
    clone.style.padding = '20px';
    clone.style.color = 'white';

    // Temporarily append to body to render
    // document.body.appendChild(clone);

    const opt = {
        margin: 0.5,
        filename: `Reporte_Financiero_EstiloApple_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#111827', useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();

    // document.body.removeChild(clone);
}
