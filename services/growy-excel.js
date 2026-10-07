// ============================================
// SERVICIO: Motor de Generación de Informes Excel (.xlsx) de Growy
// Estilo Apple SJ & Grow Labs
// ============================================

export class GrowyExcelGenerator {
    constructor() {
        this.appName = 'Estilo Apple SJ';
        this.author = 'Growy AI Copilot • Grow Labs';
    }

    _getXLSX() {
        if (typeof window !== 'undefined' && window.XLSX) {
            return window.XLSX;
        }
        throw new Error('La librería XLSX (SheetJS) no está disponible en la ventana global.');
    }

    /**
     * Genera y descarga un reporte en formato Excel (.xlsx)
     * @param {Object} data 
     * @returns {Object} { filename, totalHojas, totalFilas, success }
     */
    generarReporte(data) {
        const XLSX = this._getXLSX();
        const wb = XLSX.utils.book_new();
        wb.Props = {
            Title: data.titulo || 'Reporte Growy AI',
            Subject: data.subtitulo || 'Estilo Apple San Juan',
            Author: this.author,
            CreatedDate: new Date()
        };

        let totalFilasGlobal = 0;

        // 1. Hoja Principal / Resumen
        const nombrePrincipal = data.nombreHoja || 'Resumen Ejecutivo';
        const filasHojaPrincipal = [];

        // Encabezados Corporativos
        filasHojaPrincipal.push(['ESTILO APPLE SAN JUAN • REPORTE GENERADO POR GROWY AI']);
        filasHojaPrincipal.push([(data.titulo || 'INFORME EJECUTIVO').toUpperCase()]);
        filasHojaPrincipal.push([
            'Generado:',
            new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            'Período:',
            data.periodo || 'Histórico Completo'
        ]);
        filasHojaPrincipal.push([]); // Espacio

        // Sección de KPIs
        if (data.kpis && Array.isArray(data.kpis) && data.kpis.length > 0) {
            filasHojaPrincipal.push(['--- INDICADORES CLAVE (KPIS) ---']);
            const labels = [];
            const values = [];
            data.kpis.forEach(k => {
                labels.push(k.label || 'Métrica');
                values.push(k.valor || '');
            });
            filasHojaPrincipal.push(labels);
            filasHojaPrincipal.push(values);
            filasHojaPrincipal.push([]); // Espacio
        }

        // Resumen Ejecutivo / Diagnóstico
        if (data.resumenEjecutivo) {
            filasHojaPrincipal.push(['--- DIAGNÓSTICO / RESUMEN EJECUTIVO ---']);
            filasHojaPrincipal.push([data.resumenEjecutivo]);
            filasHojaPrincipal.push([]); // Espacio
        }

        // Tabla de Datos Principal
        if (data.columnas && data.filas) {
            filasHojaPrincipal.push(['--- DETALLE DE REGISTROS ---']);
            filasHojaPrincipal.push(data.columnas);
            
            data.filas.forEach(f => {
                if (Array.isArray(f)) {
                    filasHojaPrincipal.push(f);
                } else if (typeof f === 'object' && f !== null) {
                    filasHojaPrincipal.push(Object.values(f));
                }
            });
            totalFilasGlobal += data.filas.length;
        }

        // Convertir a worksheet
        const wsPrincipal = XLSX.utils.aoa_to_sheet(filasHojaPrincipal);

        // Auto calcular anchos de columnas
        wsPrincipal['!cols'] = this._calcularAnchoColumnas(filasHojaPrincipal);

        XLSX.utils.book_append_sheet(wb, wsPrincipal, nombrePrincipal.substring(0, 31));

        // 2. Hojas Adicionales si se proporcionan (ej: desglose de Ingresos, Egresos, Stock)
        if (data.hojasAdicionales && Array.isArray(data.hojasAdicionales)) {
            data.hojasAdicionales.forEach(hoja => {
                if (!hoja.nombre || !hoja.columnas || !hoja.filas) return;
                
                const filasHoja = [];
                filasHoja.push([`ESTILO APPLE SJ • ${hoja.nombre.toUpperCase()}`]);
                filasHoja.push([]);
                filasHoja.push(hoja.columnas);
                
                hoja.filas.forEach(f => {
                    if (Array.isArray(f)) {
                        filasHoja.push(f);
                    } else if (typeof f === 'object' && f !== null) {
                        filasHoja.push(Object.values(f));
                    }
                });

                totalFilasGlobal += hoja.filas.length;
                const ws = XLSX.utils.aoa_to_sheet(filasHoja);
                ws['!cols'] = this._calcularAnchoColumnas(filasHoja);
                const safeName = hoja.nombre.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '_');
                XLSX.utils.book_append_sheet(wb, ws, safeName);
            });
        }

        // 3. Generar y Guardar Archivo
        const safeTitle = (data.titulo || 'reporte_growy').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filename = data.filename || `${safeTitle}_${Date.now()}.xlsx`;

        XLSX.writeFile(wb, filename);

        let blobUrl = null;
        try {
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            blobUrl = URL.createObjectURL(blob);
        } catch (e) {
            console.warn('No se pudo generar blobUrl de Excel:', e);
        }

        return {
            success: true,
            filename,
            blobUrl,
            totalHojas: wb.SheetNames.length,
            totalFilas: totalFilasGlobal,
            mensaje: `El archivo Excel "${filename}" se descargó exitosamente con ${wb.SheetNames.length} hoja(s) y ${totalFilasGlobal} filas de datos.`
        };
    }

    _calcularAnchoColumnas(aoa) {
        const colWidths = [];
        aoa.forEach(row => {
            if (!Array.isArray(row)) return;
            row.forEach((cell, colIndex) => {
                const len = cell ? String(cell).length : 0;
                // Ignorar títulos largos en la primera columna para no deformar el ancho
                if (colIndex === 0 && len > 50) return;
                colWidths[colIndex] = Math.max(colWidths[colIndex] || 10, Math.min(len + 3, 50));
            });
        });
        return colWidths.map(w => ({ wch: w }));
    }
}

export const growyExcel = new GrowyExcelGenerator();
