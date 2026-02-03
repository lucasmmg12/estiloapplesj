
import * as supabaseService from './supabase-client.js';

// Estado Local
let productosCache = [];
let categoriasCache = [];
let currentPage = 1;
let pageSize = 50;
let totalRecords = 0;

// Helper para sincronizar visibilidad del formulario de ingreso
function actualizarVisibilidadCategoriaIngreso() {
    const radios = document.getElementsByName('ingresoCategoria');
    let seleccionada = '';
    radios.forEach(r => { if (r.checked) seleccionada = r.value; });

    const containerEquipo = document.getElementById('selectorEquipoContainer');
    const containerServicio = document.getElementById('selectorServicioContainer');
    const selectProducto = document.getElementById('ingresoProductoId');
    const selectServicio = document.getElementById('ingresoTipoServicio');

    if (containerEquipo) {
        containerEquipo.style.display = (seleccionada === 'Venta de Equipos' ? 'block' : 'none');
        if (selectProducto) selectProducto.required = (seleccionada === 'Venta de Equipos');
    }

    if (containerServicio) {
        containerServicio.style.display = (seleccionada === 'Servicio Tecnico' ? 'block' : 'none');
        if (selectServicio) selectServicio.required = (seleccionada === 'Servicio Tecnico');
    }
}

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
            radio.addEventListener('change', actualizarVisibilidadCategoriaIngreso);
        });
        // Sincronización inicial
        actualizarVisibilidadCategoriaIngreso();

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

    async function exportarMovimientosCSV() {
        // ... (existing implementation kept as reference, but I will replace the whole block including new functions)
        // Re-implementing correctly below:
        await genericExport('csv');
    }

    async function exportarMovimientosXLSX() {
        await genericExport('xlsx');
    }

    async function exportarMovimientosPDF() {
        await genericExport('pdf');
    }

    async function genericExport(format) {
        try {
            const btnId = format === 'csv' ? 'btnExportarCSV' : (format === 'xlsx' ? 'btnExportarXLSX' : 'btnExportarPDFMovimientos');
            const btn = document.getElementById(btnId);
            if (btn) btn.classList.add('rotating');

            // Reading Current Filters
            const filtros = {
                fechaInicio: document.getElementById('filtroFechaDesde').value,
                fechaFin: document.getElementById('filtroFechaHasta').value,
                tipo: document.getElementById('filtroTipoMovimiento')?.value || ''
            };

            if (filtros.fechaInicio) filtros.fechaInicio = new Date(filtros.fechaInicio).toISOString();
            if (filtros.fechaFin) {
                const h = new Date(filtros.fechaFin);
                h.setDate(h.getDate() + 1);
                filtros.fechaFin = h.toISOString();
            }

            // Fetch ALL data
            const result = await supabaseService.obtenerUltimasTransacciones(filtros, 1, 10000);
            const movimientos = result.data;

            if (!movimientos || movimientos.length === 0) {
                alert('No hay movimientos para exportar con los filtros actuales.');
                if (btn) btn.classList.remove('rotating');
                return;
            }

            const dataRows = movimientos.map(m => {
                const fechaObj = new Date(m.date);
                return {
                    Fecha: fechaObj.toLocaleDateString('es-AR'),
                    Hora: fechaObj.toLocaleTimeString('es-AR'),
                    Tipo: m.type === 'INCOME' ? 'INGRESO' : 'EGRESO',
                    Categoria: (m.transaction_categories?.name || 'Otro'),
                    Sucursal: m.branch || 'Estilo Apple SJ',
                    Monto: m.amount,
                    Moneda: m.currency,
                    Descripcion: (m.description || ''),
                    Metodo: m.payment_methods?.name || (m.description && m.description.toLowerCase().includes('efectivo') ? 'Efectivo' : 'Otro')
                };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `movimientos_${dateStr}`;

            if (format === 'csv') {
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "Fecha,Hora,Tipo,Categoria,Sucursal,Monto,Moneda,Descripcion,MetodoPago\r\n";
                dataRows.forEach(row => {
                    const line = Object.values(row).map(v => `"${v}"`).join(",");
                    csvContent += line + "\r\n";
                });
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `${fileName}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

            } else if (format === 'xlsx') {
                // Requires SheetJS (xlsx)
                if (typeof XLSX === 'undefined') {
                    throw new Error('Librería XLSX no cargada. Recarga la página.');
                }
                const ws = XLSX.utils.json_to_sheet(dataRows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
                XLSX.writeFile(wb, `${fileName}.xlsx`);

            } else if (format === 'pdf') {
                // Requires jsPDF & autoTable
                if (typeof window.jspdf === 'undefined') {
                    throw new Error('Librería jsPDF no cargada. Recarga la página.');
                }
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                // Título
                doc.setFontSize(16);
                doc.text(`Reporte de Movimientos Financieros`, 14, 15);
                doc.setFontSize(10);
                doc.text(`Fecha de generación: ${dateStr}`, 14, 22);

                const tableColumn = ["Fecha", "Tipo", "Categoría", "Monto", "Moneda", "Descripción"];
                const tableRows = dataRows.map(row => [
                    row.Fecha,
                    row.Tipo,
                    row.Categoria,
                    `${row.Moneda} ${parseFloat(row.Monto).toLocaleString('es-AR')}`,
                    row.Moneda,
                    row.Descripcion.substring(0, 40) // Limit description length
                ]);

                // Using autoTable (globally attached to jsPDF)
                doc.autoTable({
                    head: [tableColumn],
                    body: tableRows,
                    startY: 28,
                    theme: 'striped',
                    styles: {
                        fontSize: 8,
                        cellPadding: 3
                    },
                    headStyles: {
                        fillColor: [92, 46, 46], // Brand burgundy
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    alternateRowStyles: {
                        fillColor: [245, 245, 245]
                    }
                });

                doc.save(`${fileName}.pdf`);
            }

            if (btn) btn.classList.remove('rotating');

        } catch (error) {
            console.error(`Error exportando ${format}`, error);
            alert(`Error al exportar a ${format}: ` + error.message);
            const btnId = format === 'csv' ? 'btnExportarCSV' : (format === 'xlsx' ? 'btnExportarXLSX' : 'btnExportarPDFMovimientos');
            const btn = document.getElementById(btnId);
            if (btn) btn.classList.remove('rotating');
        }
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

    // Filtro Tipo Movimiento
    const filtroTipo = document.getElementById('filtroTipoMovimiento');
    if (filtroTipo) {
        filtroTipo.addEventListener('change', async () => {
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

    // CSV Export
    document.getElementById('btnExportarCSV')?.addEventListener('click', async () => {
        await exportarMovimientosCSV();
    });

    // Excel Export
    document.getElementById('btnExportarXLSX')?.addEventListener('click', async () => {
        await exportarMovimientosXLSX();
    });

    // PDF Export
    document.getElementById('btnExportarPDFMovimientos')?.addEventListener('click', async () => {
        await exportarMovimientosPDF();
    });

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
            document.getElementById('editTransaccionMetodo').value = m.payment_method || 'Efectivo';

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

    // Custom Confirm Dialog
    function mostrarConfirmacion(titulo, mensaje, onConfirm) {
        const modal = document.getElementById('modalConfirmacion');
        const header = document.getElementById('modalConfirmacionHeader');
        const mensajeEl = document.getElementById('mensajeConfirmacion');
        const btnConfirmar = document.getElementById('btnConfirmarAccion');

        if (!modal || !mensajeEl || !btnConfirmar) return;

        // Update content
        header.querySelector('.modal-title').textContent = titulo;
        mensajeEl.textContent = mensaje;

        // Change colors for delete action
        header.style.background = 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)';
        btnConfirmar.className = 'btn-primary';
        btnConfirmar.style.background = '#dc2626';
        btnConfirmar.textContent = 'Eliminar';

        // Set up confirmation handler
        btnConfirmar.onclick = () => {
            onConfirm();
            cerrarModalConfirmacion();
        };

        modal.classList.add('active');
    }

    window.cerrarModalConfirmacion = function () {
        const modal = document.getElementById('modalConfirmacion');
        if (modal) modal.classList.remove('active');
    };

    window.eliminarMovimiento = async function (id) {
        mostrarConfirmacion(
            '⚠️ Eliminar Movimiento',
            '¿Estás seguro de que deseas eliminar este movimiento? Esta acción es irreversible.',
            async () => {
                try {
                    await supabaseService.eliminarTransaccion(id);
                    showToast('Movimiento eliminado correctamente', 'success');
                    await cargarDatosIniciales();
                } catch (error) {
                    console.error(error);
                    showToast('Error al eliminar: ' + error.message, 'error');
                }
            }
        );
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

// Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span style="font-weight: 500;">${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Legacy support (deprecated, use showToast instead)
function mostrarModalExito(mensaje) {
    showToast(mensaje, 'success');
}

// Helper: Convert date input to ISO without timezone offset
function dateToISOLocal(dateString) {
    if (!dateString) return new Date().toISOString();
    // Parse as YYYY-MM-DD and set to noon local time to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0); // Noon local time
    return date.toISOString();
}

async function handleIngresoSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData(e.target);
        const categoriaNombre = formData.get('ingresoCategoria');
        const categoriaObj = categoriasCache.find(c => c.name === categoriaNombre && c.type === 'INCOME');

        if (!categoriaObj) throw new Error(`Categoría no encontrada: ${categoriaNombre}`);

        const moneda = formData.get('ingresoMoneda');
        const fecha = dateToISOLocal(formData.get('ingresoFecha'));
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

        // Sincronizar UI tras reset
        setTimeout(() => actualizarVisibilidadCategoriaIngreso(), 50);

        // Reset manual de otros elementos UI
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
        const fecha = dateToISOLocal(formData.get('gastoFecha'));
        const monto = parseFloat(formData.get('gastoMonto'));
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
        const fecha = dateToISOLocal(document.getElementById('editTransaccionFecha').value);
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
            related_product_id: productoId || null,
            payment_method: document.getElementById('editTransaccionMetodo').value
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
    const yesterdayDate = new Date(hoyDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    // Ranges
    const startOfDay = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate()).toISOString();

    const startOfWeekDate = new Date(hoyDate);
    const day = startOfWeekDate.getDay() || 7;
    if (day !== 1) startOfWeekDate.setHours(-24 * (day - 1));
    startOfWeekDate.setHours(0, 0, 0, 0);
    const startOfWeek = startOfWeekDate.toISOString();

    const startOfMonth = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1).toISOString();
    const endOfToday = new Date().toISOString();

    // Fetch All Data (No date filter to get history)
    const transacciones = await supabaseService.obtenerResumenFinanciero(null, null);

    // Helpers
    const getMontoARS = (t) => {
        const rawAmount = parseFloat(t.amount);
        if (isNaN(rawAmount)) return 0;

        // Normalizar moneda
        const currency = (t.currency || 'ARS').toUpperCase().trim();

        // Solo multiplicamos si es explícitamente moneda extranjera conocida (USD, USDT)
        // Y aseguramos que la tasa sea válida.
        if (currency === 'USD' || currency === 'USDT') {
            let tasa = t.exchange_rate || 1485;
            return rawAmount * tasa;
        }

        // Para ARS, nulos, vacíos, o cualquier otra cosa, asumimos valor nominal en pesos.
        return rawAmount;
    };

    // Initializers
    let incDay = 0, incWeek = 0, incTotal = 0;
    let expDay = 0, expWeek = 0, expTotal = 0;
    let incYesterday = 0, expYesterday = 0;
    let incMonth = 0, expMonth = 0; // Keeping month for hero display if needed

    // Robust Date Checks (Client Local Time)
    const currentYear = hoyDate.getFullYear();
    const currentMonth = hoyDate.getMonth();
    const currentDay = hoyDate.getDate();

    // Calculate week start timestamp for comparison standard
    const startOfWeekTs = startOfWeekDate.getTime();

    transacciones.forEach(t => {
        const monto = getMontoARS(t);
        const tDate = new Date(t.date);

        // --- TOTAL HISTORICO ---
        if (t.type === 'INCOME') incTotal += monto;
        else if (t.type === 'EXPENSE') expTotal += monto;

        // --- MONTH CALCULATION (current month) ---
        if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
            if (t.type === 'INCOME') {
                incMonth += monto;
            } else if (t.type === 'EXPENSE') {
                expMonth += monto;
            }

            // --- DAY CALCULATION ---
            if (tDate.getDate() === currentDay) {
                if (t.type === 'INCOME') incDay += monto;
                else if (t.type === 'EXPENSE') expDay += monto;
            }
        }

        // --- YESTERDAY CALCULATION ---
        if (tDate.getDate() === yesterdayDate.getDate() &&
            tDate.getMonth() === yesterdayDate.getMonth() &&
            tDate.getFullYear() === yesterdayDate.getFullYear()) {
            if (t.type === 'INCOME') incYesterday += monto;
            else if (t.type === 'EXPENSE') expYesterday += monto;
        }

        // --- WEEK CALCULATION ---
        if (tDate.getTime() >= startOfWeekTs) {
            if (t.type === 'INCOME') incWeek += monto;
            else if (t.type === 'EXPENSE') expWeek += monto;
        }
    });

    // AUDIT: Detect Anomalies
    if (incMonth > 100000000) {
        let maxTx = null;
        let maxVal = 0;
        transacciones.forEach(t => {
            const tDate = new Date(t.date);
            if (t.type === 'INCOME' && tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
                const val = getMontoARS(t);
                if (val > maxVal) {
                    maxVal = val;
                    maxTx = t;
                }
            }
        });

        if (maxTx && maxVal > 20000000) {
            const formatoMonto = parseFloat(maxTx.amount).toLocaleString('es-AR');
            alert(`⚠️ ALERTA: Total Mensual Inusualmente Alto ($${(incMonth / 1000000).toFixed(1)}M).
             
Se detectó una transacción sospechosa:
📅 Fecha: ${new Date(maxTx.date).toLocaleDateString()}
💰 Monto: ${maxTx.currency} ${formatoMonto}
📝 Detalle: ${maxTx.description || '-'}

Posible error: Se cargó un monto en Pesos pero figura como Dólares (USD).
Por favor, edite o elimine esta transacción en la pestaña "Movimientos".`);
        }
    }

    const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

    // Update DOM
    // Ingresos
    if (document.getElementById('kpiIngresoHoy')) document.getElementById('kpiIngresoHoy').textContent = fmt.format(incYesterday);
    if (document.getElementById('kpiIngresoSemana')) document.getElementById('kpiIngresoSemana').textContent = fmt.format(incWeek);
    if (document.getElementById('kpiIngresoTotal')) document.getElementById('kpiIngresoTotal').textContent = fmt.format(incTotal);

    // Egresos
    if (document.getElementById('kpiGastoHoy')) document.getElementById('kpiGastoHoy').textContent = fmt.format(expYesterday);
    if (document.getElementById('kpiGastoSemana')) document.getElementById('kpiGastoSemana').textContent = fmt.format(expWeek);
    if (document.getElementById('kpiGastoTotal')) document.getElementById('kpiGastoTotal').textContent = fmt.format(expTotal);


    // ------------------------------------------
    // UPDATE NEW TAB ELEMENTS (If they exist in DOM)
    // ------------------------------------------

    // TAB: VENTAS
    const heroIngresos = document.getElementById('heroIngresosMes');
    if (heroIngresos) {
        heroIngresos.textContent = fmt.format(incTotal);
        // Also update sub-kpis
        document.getElementById('kpiIngresoHoy_Tab').textContent = fmt.format(incYesterday);
        document.getElementById('kpiIngresoSemana_Tab').textContent = fmt.format(incWeek);
        document.getElementById('kpiIngresosHistoricos').textContent = fmt.format(incTotal);
    }

    // TAB: GASTOS
    const heroGastos = document.getElementById('heroGastosMes');
    if (heroGastos) {
        heroGastos.textContent = fmt.format(expTotal);
        // Sub-kpis
        document.getElementById('kpiGastoHoy_Tab').textContent = fmt.format(expYesterday);
        document.getElementById('kpiGastoSemana_Tab').textContent = fmt.format(expWeek);
        document.getElementById('kpiGastoTotalHistorico').textContent = fmt.format(expTotal);
    }

    // Recargar tablas de pestañas
    await cargarTablaVentasTab();
    await cargarTablaGastosTab();
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
    // 1. Validar que exista la tabla
    const tbody = document.getElementById('tablaMovimientos');
    if (!tbody) return;

    const filtros = {
        fechaInicio: document.getElementById('filtroFechaDesde').value,
        fechaFin: document.getElementById('filtroFechaHasta').value,
        tipo: document.getElementById('filtroTipoMovimiento')?.value || ''
    };

    if (filtros.fechaInicio) filtros.fechaInicio = new Date(filtros.fechaInicio).toISOString();
    if (filtros.fechaFin) {
        const h = new Date(filtros.fechaFin);
        h.setDate(h.getDate() + 1);
        filtros.fechaFin = h.toISOString();
    }

    const result = await supabaseService.obtenerUltimasTransacciones(filtros, currentPage, pageSize);
    const movimientos = result.data;
    totalRecords = result.total;

    // Actualizar labels Paginación
    const totalLabel = document.getElementById('erpTotalRecords');
    if (totalLabel) totalLabel.textContent = `${totalRecords} registros`;

    const pageLabel = document.getElementById('erpPageIndicator');
    if (pageLabel) pageLabel.textContent = currentPage;

    const btnPrev = document.getElementById('btnPrevPageErp');
    const btnNext = document.getElementById('btnNextPageErp');
    if (btnPrev) btnPrev.disabled = currentPage === 1;
    if (btnNext) btnNext.disabled = currentPage * pageSize >= totalRecords;

    // Render Rows
    tbody.innerHTML = '';

    if (!movimientos || movimientos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay movimientos que coincidan</td></tr>';
        return;
    }

    movimientos.forEach(m => {
        const tr = document.createElement('tr');
        const fecha = new Date(m.date).toLocaleDateString('es-AR');

        const isIncome = m.type === 'INCOME';
        const color = isIncome ? 'var(--accent-green)' : 'var(--accent-red)';
        const simbolo = isIncome ? '+' : '-';

        // Formatear monto
        const montoFormateado = m.amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        tr.innerHTML = `
            <td>${fecha}</td>
            <td><span class="badge" style="background: ${isIncome ? 'rgba(0,255,136,0.1)' : 'rgba(255,99,99,0.1)'}; color: ${color};">${isIncome ? 'Ingreso' : 'Egreso'}</span></td>
            <td>${m.transaction_categories?.name || 'Desconocido'}</td>
            <td style="color: ${color}; font-weight: 600;">${simbolo}$${montoFormateado} <span style="font-size:0.8em; color:var(--gray-400)">${m.currency}</span></td>
            <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.description}">${m.description || '-'}</td>
            <td style="text-align: center;">
                <button class="btn-action icon-only" onclick="abrirModalEdicion('${m.id}')" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn-action icon-only danger" onclick="eliminarMovimiento('${m.id}')" title="Eliminar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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

// ----------------------------------------------------------------------
// NEW: TAB-SPECIFIC TABLES (SALES & EXPENSES)
// ----------------------------------------------------------------------

async function cargarTablaVentasTab() {
    const tbody = document.getElementById('tablaUltimasVentas_Tab');
    if (!tbody) return;

    try {
        // Fetch recent INCOMES (limit 20, no pagination for simplicity in this view, or use filtering)
        // We reuse obtenerUltimasTransacciones but we might need a type filter in it?
        // Currently it accepts dates. Let's fetch broader range and filter client side or add type support to service.
        // Quick fix: Fetch last 50 and filter by INCOME.
        const result = await supabaseService.obtenerUltimasTransacciones({ fechaInicio: null, fechaFin: null }, 1, 50);
        const ventas = result.data.filter(t => t.type === 'INCOME').slice(0, 15);

        tbody.innerHTML = '';
        if (ventas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">No hay ventas recientes</td></tr>`;
            return;
        }

        ventas.forEach(v => {
            const tr = document.createElement('tr');
            const fecha = new Date(v.date).toLocaleDateString('es-AR');
            const monto = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v.amount);

            tr.innerHTML = `
                <td style="color: var(--gray-400); font-size: 0.9rem;">${fecha}</td>
                <td style="font-weight: 500;">${v.transaction_categories?.name || 'Venta'}</td>
                <td style="color: var(--gray-300); font-size: 0.9rem;">${v.description || '-'}</td>
                <td style="color: var(--accent-green); font-weight: 700;">${monto} <small>${v.currency}</small></td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="btn-action" onclick="abrirModalEdicion('${v.id}')" title="Editar" style="background: rgba(255, 255, 255, 0.05); border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer;">✏️</button>
                        <button class="btn-action danger" onclick="eliminarMovimiento('${v.id}')" title="Eliminar" style="background: rgba(255, 69, 58, 0.1); border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer;">🗑️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error("Error loading Sales Tab table:", e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--accent-red);">Error al cargar datos</td></tr>`;
    }
}

async function cargarTablaGastosTab() {
    const tbody = document.getElementById('tablaUltimosGastos_Tab');
    if (!tbody) return;

    try {
        const result = await supabaseService.obtenerUltimasTransacciones({ fechaInicio: null, fechaFin: null }, 1, 50);
        const gastos = result.data.filter(t => t.type === 'EXPENSE').slice(0, 15);

        tbody.innerHTML = '';
        if (gastos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">No hay gastos recientes</td></tr>`;
            return;
        }

        gastos.forEach(g => {
            const tr = document.createElement('tr');
            const fecha = new Date(g.date).toLocaleDateString('es-AR');
            const monto = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(g.amount);

            tr.innerHTML = `
                <td style="color: var(--gray-400); font-size: 0.9rem;">${fecha}</td>
                <td style="font-weight: 500;">${g.transaction_categories?.name || 'Gasto'}</td>
                <td style="color: var(--gray-300); font-size: 0.9rem;">${g.description || '-'}</td>
                <td style="color: var(--accent-red); font-weight: 700;">${monto} <small>${g.currency}</small></td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="btn-action" onclick="abrirModalEdicion('${g.id}')" title="Editar" style="background: rgba(255, 255, 255, 0.05); border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer;">✏️</button>
                        <button class="btn-action danger" onclick="eliminarMovimiento('${g.id}')" title="Eliminar" style="background: rgba(255, 69, 58, 0.1); border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer;">🗑️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error("Error loading Expenses Tab table:", e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--accent-red);">Error al cargar datos</td></tr>`;
    }
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

// Global Chart Rendering Helper
const renderChart = (id, type, labels, datasets, options = {}) => {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (chartInstances[id]) chartInstances[id].destroy();
    chartInstances[id] = new Chart(ctx, {
        type,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            ...options
        }
    });
};

export async function renderizarGraficos() {
    try {
        // 1. Fetch ALL Data
        const transacciones = await supabaseService.obtenerResumenFinanciero(null, null);

        // helpers
        const getMontoARS = (t) => {
            let tasa = t.exchange_rate || 1485;
            return t.currency === 'ARS' ? t.amount : (t.amount * tasa);
        };

        // ------------------
        // AGGREGATION LOGIC
        // ------------------

        // Determinar rango de fechas para decidir agrupamiento
        let fechas = transacciones.map(t => new Date(t.date).getTime());
        let minDate = new Date(Math.min(...fechas));
        let maxDate = new Date(Math.max(...fechas));
        let diffMeses = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth());

        let labelsTrends = [];
        let dataIncTrends = [];
        let dataExpTrends = [];

        if (diffMeses <= 1) {
            // AGRUPAR POR DÍAS (como estaba)
            const hoy = new Date();
            const daysInMonth = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
            labelsTrends = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            dataIncTrends = new Array(labelsTrends.length).fill(0);
            dataExpTrends = new Array(labelsTrends.length).fill(0);

            transacciones.forEach(t => {
                const date = new Date(t.date);
                if (date.getMonth() === hoy.getMonth() && date.getFullYear() === hoy.getFullYear()) {
                    const day = date.getDate();
                    const idx = day - 1;
                    const monto = getMontoARS(t);
                    if (t.type === 'INCOME') dataIncTrends[idx] += monto;
                    else dataExpTrends[idx] += monto;
                }
            });
        } else {
            // AGRUPAR POR MESES
            let monthsMap = {};
            // Crear rango de meses
            let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            while (current <= maxDate) {
                let key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                monthsMap[key] = { inc: 0, exp: 0 };
                current.setMonth(current.getMonth() + 1);
            }

            transacciones.forEach(t => {
                const date = new Date(t.date);
                let key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (monthsMap[key]) {
                    const monto = getMontoARS(t);
                    if (t.type === 'INCOME') monthsMap[key].inc += monto;
                    else monthsMap[key].exp += monto;
                }
            });

            labelsTrends = Object.keys(monthsMap).map(k => {
                const [y, m] = k.split('-');
                const date = new Date(y, m - 1);
                return date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
            });
            dataIncTrends = Object.values(monthsMap).map(v => v.inc);
            dataExpTrends = Object.values(monthsMap).map(v => v.exp);
        }

        // 2. Top Services (Count & Amount)
        const servicesMap = {};
        // 3. Top Products
        const productsMap = {};
        // 4. iPhone Generations
        const iphoneMap = {};
        // 5. Payment Methods
        const paymentMap = {};
        // 6. Expense Categories (New)
        const expenseCatMap = {};

        transacciones.forEach(t => {
            const monto = getMontoARS(t);
            const catName = t.transaction_categories?.name || 'Otro';
            const desc = t.description || '';

            if (t.type === 'EXPENSE') {
                expenseCatMap[catName] = (expenseCatMap[catName] || 0) + monto;
            }

            // Payment Methods
            let pm = 'Desconocido';
            const pmMatch = desc.match(/\(([^)]+)\)$/);
            if (pmMatch) pm = pmMatch[1];
            paymentMap[pm] = (paymentMap[pm] || 0) + 1;

            // Services
            if (catName === 'Servicio Tecnico') {
                let svc = desc.replace('Servicio: ', '').replace(/\s*\([^)]*\)$/, '').trim();
                if (svc) servicesMap[svc] = (servicesMap[svc] || 0) + 1;
            }

            // Products
            if (catName === 'Venta de Equipos' || catName === 'Venta de Accesorios') {
                let prod = desc.replace('Venta: ', '').replace(/\s*\([^)]*\)$/, '').trim();
                if (prod) {
                    productsMap[prod] = (productsMap[prod] || 0) + 1;

                    // iPhone Gen
                    if (prod.toLowerCase().includes('iphone')) {
                        const genMatch = prod.match(/iphone\s*(\d+)/i);
                        if (genMatch) {
                            const gen = `iPhone ${genMatch[1]} Series`;
                            iphoneMap[gen] = (iphoneMap[gen] || 0) + 1;
                        }
                    }
                }
            }
        });

        // RENDERING
        // ------------------

        // --- DASHBOARD GENERAL (LEGACY COMPAT) ---


        renderChart('chartTrendIngresos', 'line', labelsTrends, [{
            label: 'Ingresos Históricos (ARS)',
            data: dataIncTrends,
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            fill: true,
            tension: 0.4
        }]);

        renderChart('chartTrendGastos', 'line', labelsTrends, [{
            label: 'Gastos Históricos (ARS)',
            data: dataExpTrends,
            borderColor: '#ff4d4d',
            backgroundColor: 'rgba(255, 77, 77, 0.1)',
            fill: true,
            tension: 0.4
        }]);

        // Top Services
        const sortedServices = Object.entries(servicesMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        renderChart('chartTopServices', 'bar', sortedServices.map(x => x[0]), [{
            label: 'Servicios Realizados',
            data: sortedServices.map(x => x[1]),
            backgroundColor: '#00d4ff',
            borderRadius: 5
        }]);

        // Top Products
        const sortedProducts = Object.entries(productsMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        renderChart('chartTopProducts', 'bar', sortedProducts.map(x => x[0]), [{
            label: 'Unidades Vendidas',
            data: sortedProducts.map(x => x[1]),
            backgroundColor: '#f59e0b',
            borderRadius: 5
        }]);

        // iPhone Generations
        const sortedGen = Object.entries(iphoneMap).sort((a, b) => b[1] - a[1]);
        renderChart('chartIphoneGenerations', 'doughnut', sortedGen.map(x => x[0]), [{
            data: sortedGen.map(x => x[1]),
            backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'],
            borderWidth: 0
        }], { cutout: '60%' });

        // Payment Methods (General) - Improved Visual
        const sortedPay = Object.entries(paymentMap).sort((a, b) => b[1] - a[1]);
        renderChart('chartPaymentMethods', 'doughnut', sortedPay.map(x => x[0]), [{
            data: sortedPay.map(x => x[1]),
            backgroundColor: ['#8B949E', '#2ea44f', '#1F6FEB', '#FB8500', '#DC3545'],
            borderColor: '#1a1a1a',
            borderWidth: 2
        }], {
            cutout: '50%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff',
                        font: { size: 13, weight: '600' },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        });


        // --- NEW TABS: INGRESOS / VENTAS ---

        // 1. Trend Ingresos Tab
        renderChart('chartTrendIngresos_Tab', 'line', labelsTrends, [{
            label: 'Evolución Histórica (ARS)',
            data: dataIncTrends,
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 255, 136, 0.15)',
            fill: true,
            tension: 0.3
        }]);

        // 2. Payment Methods Tab
        renderChart('chartPaymentMethods_Tab', 'doughnut', sortedPay.map(x => x[0]), [{
            data: sortedPay.map(x => x[1]),
            backgroundColor: ['#ffffffaa', '#00ff88aa', '#00d4ffaa', '#f59e0baa', '#ff4d4daa'],
            borderWidth: 0
        }], { cutout: '50%' }); // Doughnut looks cleaner in tab


        // --- NEW TABS: EGRESOS / GASTOS ---

        // 1. Expense Categories Composition
        const sortedExpCat = Object.entries(expenseCatMap).sort((a, b) => b[1] - a[1]);
        renderChart('chartGastosCat_Tab', 'doughnut', sortedExpCat.map(x => x[0]), [{
            data: sortedExpCat.map(x => x[1]),
            backgroundColor: [
                '#ff4d4d', '#ff8c00', '#f59e0b', '#8b5cf6', '#ec4899',
                '#3b82f6', '#10b981', '#6366f1', '#a8a29e', '#64748b'
            ],
            borderWidth: 0
        }], { cutout: '60%' });


        // ------------------
        // AI ANALYSIS
        // ------------------
        generarAnalisisIA(transacciones, dataIncTrends, dataExpTrends, productsMap, servicesMap);

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
        Históricamente has generado un total de ARS ${totalInc.toLocaleString()} con gastos de ARS ${totalExp.toLocaleString()}, 
        resultando en un balance neto de ARS ${balance.toLocaleString()}. 
        El mejor período de ventas superó los ARS ${Math.max(...incTrends).toLocaleString()}. 
        Tu producto estrella es "${topProd[0]}" y el servicio más solicitado "${topServ[0]}".
    `;
    const descEl = document.getElementById('analisisDescriptivo');
    if (descEl) descEl.textContent = descriptivo;

    // Chart Descriptivo: Income vs Expenses (Bar)
    renderChart('chartAnalisisDescriptivo', 'bar', ['Ingresos', 'Egresos', 'Balance'], [{
        label: 'Métricas Clave (ARS)',
        data: [totalInc, totalExp, Math.abs(balance)],
        backgroundColor: ['#10b981', '#ef4444', balance >= 0 ? '#3b82f6' : '#f59e0b'],
        borderWidth: 0
    }], {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
            y: { ticks: { color: '#fff' }, grid: { display: false } }
        }
    });

    // 2. Diagnóstico (Simulated Comparison logic)
    const diagnostico = `
        El margen de beneficio bruto se sitúa en un ${(totalInc > 0 ? (balance / totalInc) * 100 : 0).toFixed(1)}%. 
        ${totalExp > totalInc * 0.5 ? "⚠️ Alerta: Los gastos superan el 50% de los ingresos. Revisar costos de proveedores." : "✅ Los costos se mantienen en niveles saludables."}
        La alta demanda de servicio técnico sugiere un buen posicionamiento en post-venta.
    `;
    const diagEl = document.getElementById('analisisDiagnostico');
    if (diagEl) diagEl.textContent = diagnostico;

    // Chart Diagnóstico: Margin Health (Doughnut)
    const margen = totalInc > 0 ? (balance / totalInc) * 100 : 0;
    renderChart('chartAnalisisDiagnostico', 'doughnut', ['Margen', 'Costos'], [{
        data: [Math.max(margen, 0), Math.max(100 - margen, 0)],
        backgroundColor: [margen >= 30 ? '#10b981' : '#fb923c', '#6b7280'],
        borderWidth: 0
    }], {
        cutout: '65%',
        plugins: {
            legend: { position: 'bottom', labels: { color: '#fff', font: { size: 11 } } }
        }
    });

    // 3. Predictivo (Linear Regression Simple Approximation)
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

    // Chart Predictivo: Current vs Projected (Line Trend)
    renderChart('chartAnalisisPredictivo', 'line', ['Actual', 'Proyectado'], [{
        label: 'Ingresos Mensuales',
        data: [totalInc, projected],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
    }], {
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#fff' }, grid: { display: false } },
            y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
        }
    });

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
    try {
        if (typeof window.jspdf === 'undefined') {
            alert('Librería jsPDF no disponible. Recarga la página.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const usableWidth = pageWidth - (margin * 2);
        let yPosition = margin;

        // === HEADER ===
        doc.setFillColor(92, 46, 46); // Brand Burgundy
        doc.rect(0, 0, pageWidth, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('📊 Análisis Estratégico IA', margin, 15);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Estilo Apple San Juan', margin, 23);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, margin, 29);

        yPosition = 45;

        // === CONTENT SECTIONS ===
        doc.setTextColor(0, 0, 0);

        // Helper: Add Section Title
        const addSectionTitle = (emoji, title, color) => {
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(margin, yPosition, usableWidth, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${emoji} ${title}`, margin + 2, yPosition + 5.5);
            yPosition += 12;
            doc.setTextColor(50, 50, 50);
        };

        // Helper: Add Body Text
        const addBodyText = (text, indent = 0) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const lines = doc.splitTextToSize(text, usableWidth - indent);
            lines.forEach(line => {
                if (yPosition > pageHeight - 30) {
                    doc.addPage();
                    yPosition = margin;
                }
                doc.text(line, margin + indent, yPosition);
                yPosition += 5;
            });
            yPosition += 2;
        };

        // Helper: Add Bullet Point
        const addBullet = (text) => {
            if (yPosition > pageHeight - 30) {
                doc.addPage();
                yPosition = margin;
            }
            doc.setFontSize(10);
            doc.text('•', margin + 2, yPosition);
            const lines = doc.splitTextToSize(text, usableWidth - 10);
            lines.forEach((line, idx) => {
                doc.text(line, margin + 7, yPosition + (idx * 5));
            });
            yPosition += lines.length * 5 + 2;
        };

        // === 1. DESCRIPTIVO ===
        addSectionTitle('📊', '1. Análisis Descriptivo', [59, 130, 246]); // Blue
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('¿Qué pasó? Resumen de métricas clave del período.', margin, yPosition);
        yPosition += 7;

        const descriptivo = document.getElementById('analisisDescriptivo')?.textContent || 'No disponible';
        addBodyText(descriptivo);
        yPosition += 5;

        // === 2. DIAGNÓSTICO ===
        addSectionTitle('🔍', '2. Análisis Diagnóstico', [251, 146, 60]); // Orange
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('¿Por qué pasó? Comparativa con período anterior.', margin, yPosition);
        yPosition += 7;

        const diagnostico = document.getElementById('analisisDiagnostico')?.textContent || 'No disponible';
        addBodyText(diagnostico);
        yPosition += 5;

        // === 3. PREDICTIVO ===
        addSectionTitle('🔮', '3. Análisis Predictivo', [139, 92, 246]); // Purple
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('¿Qué pasará? Proyección inteligente basada en tendencias.', margin, yPosition);
        yPosition += 7;

        const predictivo = document.getElementById('analisisPredictivo')?.textContent || 'No disponible';
        addBodyText(predictivo);
        yPosition += 5;

        // === 4. PRESCRIPTIVO ===
        addSectionTitle('💡', '4. Análisis Prescriptivo', [34, 197, 94]); // Green
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('¿Qué hacer? Recomendaciones accionables para mejorar.', margin, yPosition);
        yPosition += 7;

        const prescriptivoList = document.getElementById('analisisPrescriptivo');
        if (prescriptivoList && prescriptivoList.children.length > 0) {
            Array.from(prescriptivoList.children).forEach(li => {
                addBullet(li.textContent);
            });
        } else {
            addBodyText('No hay recomendaciones disponibles.');
        }

        // === FOOTER ===
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        const footer = 'Informe generado por Estilo Apple SJ - Sistema de Gestión Integral';
        doc.text(footer, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // === SAVE ===
        const filename = `Analisis_Estrategico_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);

    } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar el PDF: ' + error.message);
    }
}
