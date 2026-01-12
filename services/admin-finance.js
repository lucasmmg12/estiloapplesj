
import * as supabaseService from './supabase-client.js';

// Estado Local
let productosCache = [];
let categoriasCache = [];

export async function initErp() {
    console.log('Iniciando Módulo ERP...');

    // 1. Configurar Listeners de Formularios
    setupEventListeners();

    // 2. Cargar Datos Iniciales (KPIs, Tablas, Selectors)
    await cargarDatosIniciales();

    // 3. Renderizar Gráficos
    renderizarGraficos();
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
    }

    // Formulario de Gastos
    const formGasto = document.getElementById('formGasto');
    if (formGasto) {
        formGasto.addEventListener('submit', handleGastoSubmit);
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

async function handleIngresoSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData(e.target);
        const categoriaNombre = formData.get('ingresoCategoria'); // "Venta de Equipos", etc.
        const categoriaObj = categoriasCache.find(c => c.name === categoriaNombre && c.type === 'INCOME');

        if (!categoriaObj) throw new Error(`Categoría no encontrada: ${categoriaNombre}`);

        const moneda = formData.get('ingresoMoneda');
        const monto = parseFloat(formData.get('ingresoMonto'));
        const fecha = new Date(formData.get('ingresoFecha')).toISOString();
        const metodoPagoNombre = document.getElementById('ingresoMetodo').value;
        const productoId = formData.get('ingresoProductoId'); // Opcional
        const tipoServicio = formData.get('ingresoTipoServicio'); // Opcional

        let descripcion = categoriaNombre;

        if (categoriaNombre === 'Venta de Equipos' && productoId) {
            descripcion = `Venta: ${obtenerNombreProducto(productoId)}`;
        } else if (categoriaNombre === 'Servicio Tecnico' && tipoServicio) {
            descripcion = `Servicio: ${tipoServicio}`;
        }

        // 1. Crear Transacción
        const transaccion = {
            date: fecha,
            type: 'INCOME',
            amount: monto,
            currency: moneda,
            category_id: categoriaObj.id,
            description: descripcion,
            created_at: new Date().toISOString()
        };

        // TODO: Buscar ID de Payment Method (o asumirlo)
        // Por simplicidad, asumimos que existen en DB.

        await supabaseService.crearTransaccion(transaccion);

        // 2. Si es Venta de Equipo -> Descontar Stock
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

        alert('Ingreso registrado correctamente ✅');
        e.target.reset();
        await cargarDatosIniciales(); // Recargar tablas

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

        await supabaseService.crearTransaccion(transaccion);

        alert('Gasto registrado correctamente 📉');
        e.target.reset();
        await cargarDatosIniciales();

    } catch (error) {
        console.error(error);
        alert('Error al registrar gasto: ' + error.message);
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
        // Normalizar a ARS
        // Si currency es ARS -> Valor directo
        // Si currency es USD -> Valor * exchange_rate
        let tasa = t.exchange_rate || 1200; // Fallback por seguridad
        let montoARS = t.currency === 'ARS' ? t.amount : (t.amount * tasa);

        if (t.type === 'INCOME') ingresosARS += montoARS;
        if (t.type === 'EXPENSE') gastosARS += montoARS;
    });

    const cajaTotal = ingresosARS - gastosARS;

    // Actualizar DOM con formato ARS
    document.getElementById('kpiCajaTotal').textContent = formatoARS.format(cajaTotal);
    document.getElementById('kpiVentasHoy').textContent = formatoARS.format(ingresosARS);
    document.getElementById('kpiGastosHoy').textContent = formatoARS.format(gastosARS);

    // Rentabilidad (Estimar simple por ahora, pendiente lógica real de CMV)
    // document.getElementById('kpiRentabilidad').textContent = ... 
}

async function cargarTablaMovimientos() {
    const movimientos = await supabaseService.obtenerUltimasTransacciones(10);
    const tbody = document.getElementById('tablaMovimientos');
    tbody.innerHTML = '';

    if (movimientos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay movimientos recientes</td></tr>';
        return;
    }

    movimientos.forEach(m => {
        const tr = document.createElement('tr');
        const fecha = new Date(m.date).toLocaleDateString();
        const color = m.type === 'INCOME' ? '#00ff88' : '#ff4d4d';
        const simbolo = m.type === 'INCOME' ? '+' : '-';

        tr.innerHTML = `
            <td>${fecha}</td>
            <td><span style="color: ${color}; font-weight: bold;">${m.type === 'INCOME' ? 'Ingreso' : 'Gasto'}</span></td>
            <td>${m.transaction_categories?.name || 'Otro'}</td>
            <td style="color: ${color}">${simbolo} $${m.amount} ${m.currency}</td>
            <td>${m.description || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function obtenerNombreProducto(id) {
    const p = productosCache.find(p => p.id == id);
    return p ? p.modelo : 'Desconocido';
}

function renderizarGraficos() {
    // Implementar Chart.js aquí
}
