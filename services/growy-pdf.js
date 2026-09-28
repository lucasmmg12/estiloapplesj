// ============================================
// SERVICIO: Motor de Generación de Informes PDF de Growy
// Estética: Estilo Apple SJ & Grow Labs (Borgoña & Oro)
// ============================================

export class GrowyPDFGenerator {
    constructor() {
        this.brandBurgundy = [92, 46, 46];       // #5C2E2E
        this.brandBurgundyDark = [61, 31, 31];   // #3D1F1F
        this.brandGold = [212, 175, 55];         // #D4AF37
        this.brandGoldLight = [232, 213, 196];   // #E8D5C4
        this.textDark = [29, 29, 31];            // #1D1D1F
        this.textMuted = [110, 110, 115];        // #6E6E73
        this.bgLight = [245, 245, 247];          // #F5F5F7
        this.accentGreen = [48, 209, 88];        // #30D158
        this.accentRed = [255, 69, 58];          // #FF453A
        this.accentBlue = [0, 113, 227];         // #0071E3
    }

    _getJsPDF() {
        if (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) {
            return window.jspdf.jsPDF;
        }
        throw new Error('La librería jsPDF no está disponible en la ventana global.');
    }

    /**
     * Genera un reporte ejecutivo integral
     * @param {Object} data 
     * @returns {Object} { filename, doc, blobUrl }
     */
    generarReporteEjecutivo(data) {
        const jsPDF = this._getJsPDF();
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 16;
        const usableWidth = pageWidth - (margin * 2);
        let y = margin;

        // 1. BANNER HEADER CORPORATIVO
        doc.setFillColor(this.brandBurgundy[0], this.brandBurgundy[1], this.brandBurgundy[2]);
        doc.roundedRect(margin, y, usableWidth, 32, 3, 3, 'F');

        // Borde dorado sutil inferior del banner
        doc.setFillColor(this.brandGold[0], this.brandGold[1], this.brandGold[2]);
        doc.rect(margin, y + 30.5, usableWidth, 1.5, 'F');

        // Títulos en el Header
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        const titulo = (data.titulo || 'INFORME ESTRATÉGICO EJECUTIVO').toUpperCase();
        doc.text(titulo, margin + 6, y + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(this.brandGoldLight[0], this.brandGoldLight[1], this.brandGoldLight[2]);
        const subtitulo = data.subtitulo || 'Estilo Apple San Juan • Grow Labs Analytics';
        doc.text(subtitulo, margin + 6, y + 18);

        // Metadata a la derecha
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        const hoy = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        doc.text(`Generado: ${hoy}`, pageWidth - margin - 6, y + 12, { align: 'right' });
        doc.text(`Agente: Growy AI Copilot`, pageWidth - margin - 6, y + 18, { align: 'right' });
        if (data.periodo) {
            doc.text(`Período: ${data.periodo}`, pageWidth - margin - 6, y + 24, { align: 'right' });
        }

        y += 38;

        // 2. TARJETAS DE KPIS PRINCIPALES (GRID 3-4 COLUMNAS)
        if (data.kpis && Array.isArray(data.kpis) && data.kpis.length > 0) {
            const numKpis = Math.min(data.kpis.length, 4);
            const gap = 3;
            const cardWidth = (usableWidth - (gap * (numKpis - 1))) / numKpis;
            const cardHeight = 18;

            data.kpis.slice(0, numKpis).forEach((kpi, idx) => {
                const kpiX = margin + (idx * (cardWidth + gap));
                
                // Fondo tarjeta
                doc.setFillColor(this.bgLight[0], this.bgLight[1], this.bgLight[2]);
                doc.roundedRect(kpiX, y, cardWidth, cardHeight, 2, 2, 'F');

                // Borde izquierdo de color según tipo
                let barColor = this.brandBurgundy;
                if (kpi.tipo === 'positivo' || kpi.tipo === 'success') barColor = this.accentGreen;
                if (kpi.tipo === 'negativo' || kpi.tipo === 'danger') barColor = this.accentRed;
                if (kpi.tipo === 'info') barColor = this.accentBlue;

                doc.setFillColor(barColor[0], barColor[1], barColor[2]);
                doc.rect(kpiX, y, 1.5, cardHeight, 'F');

                // Label
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(this.textMuted[0], this.textMuted[1], this.textMuted[2]);
                doc.text(kpi.label || 'Métrica', kpiX + 4, y + 6);

                // Valor
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10.5);
                doc.setTextColor(this.textDark[0], this.textDark[1], this.textDark[2]);
                doc.text(String(kpi.valor || '-'), kpiX + 4, y + 13);
            });

            y += cardHeight + 6;
        }

        // 3. RESUMEN EJECUTIVO / DIAGNÓSTICO
        if (data.resumenEjecutivo) {
            y = this._agregarSeccionBloque(doc, '💡 Resumen Ejecutivo y Diagnóstico', data.resumenEjecutivo, y, margin, usableWidth, pageHeight);
        }

        // 4. TABLA DE DATOS PRINCIPAL (jspdf-autotable)
        if (data.tabla && data.tabla.head && data.tabla.body && doc.autoTable) {
            doc.autoTable({
                startY: y,
                head: [data.tabla.head],
                body: data.tabla.body,
                margin: { left: margin, right: margin },
                theme: 'striped',
                headStyles: {
                    fillColor: this.brandBurgundy,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8.5,
                    halign: 'left'
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 252]
                },
                styles: {
                    fontSize: 8,
                    textColor: this.textDark,
                    cellPadding: 2.2,
                    valign: 'middle'
                },
                footStyles: {
                    fillColor: [240, 240, 243],
                    textColor: this.textDark,
                    fontStyle: 'bold',
                    fontSize: 8.5
                }
            });

            y = doc.lastAutoTable.finalY + 8;
        }

        // 5. CONCLUSIONES Y RECOMENDACIONES ESTRATÉGICAS
        if (data.recomendaciones && Array.isArray(data.recomendaciones) && data.recomendaciones.length > 0) {
            // Verificar si necesitamos nueva página
            if (y > pageHeight - 50) {
                doc.addPage();
                y = margin;
            }

            doc.setFillColor(this.brandBurgundyDark[0], this.brandBurgundyDark[1], this.brandBurgundyDark[2]);
            doc.rect(margin, y, usableWidth, 6, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('🎯 RECOMENDACIONES ESTRATÉGICAS DE GROWY', margin + 3, y + 4.2);

            y += 9;

            data.recomendaciones.forEach((rec, idx) => {
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = margin;
                }

                doc.setFillColor(this.brandGold[0], this.brandGold[1], this.brandGold[2]);
                doc.circle(margin + 3, y + 1.5, 1, 'F');

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(this.textDark[0], this.textDark[1], this.textDark[2]);
                
                const lines = doc.splitTextToSize(rec, usableWidth - 10);
                lines.forEach((line, lIdx) => {
                    doc.text(line, margin + 7, y + (lIdx * 4));
                });
                y += (lines.length * 4) + 2.5;
            });
        }

        // 6. PIE DE PÁGINA (Paginación + Timestamp)
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(this.textMuted[0], this.textMuted[1], this.textMuted[2]);

            // Línea divisora
            doc.setDrawColor(229, 229, 234);
            doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

            doc.text(`Estilo Apple SJ • Sistema de Gestión Pro • Confidencial`, margin, pageHeight - 6);
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
        }

        const safeTitle = (data.titulo || 'reporte').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filename = `${safeTitle}_${Date.now()}.pdf`;

        // Descarga directa
        doc.save(filename);

        return {
            filename,
            doc,
            totalPages
        };
    }

    _agregarSeccionBloque(doc, titulo, contenido, y, margin, usableWidth, pageHeight) {
        if (y > pageHeight - 40) {
            doc.addPage();
            y = margin;
        }

        doc.setFillColor(242, 242, 247);
        doc.roundedRect(margin, y, usableWidth, 6.5, 1, 1, 'F');
        doc.setTextColor(this.brandBurgundy[0], this.brandBurgundy[1], this.brandBurgundy[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(titulo, margin + 3, y + 4.5);

        y += 9.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(this.textDark[0], this.textDark[1], this.textDark[2]);

        const lines = doc.splitTextToSize(contenido, usableWidth - 4);
        lines.forEach(line => {
            if (y > pageHeight - 15) {
                doc.addPage();
                y = margin;
            }
            doc.text(line, margin + 2, y);
            y += 4.2;
        });

        return y + 4;
    }
}

export const growyPDF = new GrowyPDFGenerator();
