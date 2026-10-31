import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LibretaConDetalles } from '../types';

interface GenerarPdfParams {
  libreta: LibretaConDetalles;
  estudianteNombre: string;
  estudianteCodigo?: string;
  gradoSeccion?: string;
}

export function generarLibretaPdf({
  libreta,
  estudianteNombre,
  estudianteCodigo = 'EST-2026',
  gradoSeccion = 'Primaria',
}: GenerarPdfParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colores del sistema CORAULA
  const primaryColor = [190, 18, 60]; // #BE123C (accent)
  const textColor = [17, 24, 39]; // #111827 (ink)
  const mutedColor = [107, 114, 128]; // #6B7280 (muted)

  // 1. Membrete institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('I.E.P. CORAULA', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Plataforma Integral de Gestión Educativa • Sistema Académico Oficial', 14, 23);

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 26, 196, 26);

  // 2. Título de la Libreta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`INFORME DE RENDIMIENTO ACADÉMICO — BIMESTRE ${libreta.bimestre}`, 14, 34);

  // 3. Ficha de Datos del Estudiante
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Estudiante:', 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(estudianteNombre, 35, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Código:', 130, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(estudianteCodigo, 145, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Grado / Sección:', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(gradoSeccion, 42, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Año Lectivo:', 130, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`${libreta.anio_lectivo || 2026}`, 152, 48);

  // 4. Preparación de datos para la tabla
  const tableRows = libreta.detalles.map((d) => {
    const isFailing = d.nota < 11;
    return [
      d.area,
      d.curso,
      d.criterio,
      d.nivel_logro || (d.nota >= 18 ? 'AD' : d.nota >= 14 ? 'A' : d.nota >= 11 ? 'B' : 'C'),
      d.nota.toFixed(1),
      isFailing, // metadato para estilos
    ];
  });

  // 5. Generación de tabla con autoTable
  autoTable(doc, {
    startY: 54,
    head: [['Área Curricular', 'Asignatura / Curso', 'Competencia / Criterio Evaluado', 'Nivel', 'Nota']],
    body: tableRows.map((r) => [r[0], r[1], r[2], r[3], r[4]]),
    theme: 'grid',
    headStyles: {
      fillColor: [190, 18, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [17, 24, 39],
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 35 },
      2: { cellWidth: 72 },
      3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Regla de negocio: Resaltado de notas < 11 en rojo
      if (data.section === 'body' && data.column.index === 4) {
        const rawRow = tableRows[data.row.index];
        const isFailing = Boolean(rawRow?.[5]);
        if (isFailing) {
          data.cell.styles.textColor = [185, 28, 28]; // Rojo intenso
          data.cell.styles.fillColor = [254, 242, 242]; // Fondo suave de alerta
        }
      }
    },
  });

  // 6. Promedio General y Pie
  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  doc.setFillColor(243, 244, 246);
  doc.roundedRect(14, finalY + 5, 182, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('PROMEDIO PONDERADO BIMESTRAL:', 20, finalY + 14);

  const prom = libreta.promedio_general ?? (
    libreta.detalles.length > 0
      ? libreta.detalles.reduce((acc, curr) => acc + curr.nota, 0) / libreta.detalles.length
      : 0
  );

  const isPromFailing = prom < 11;
  doc.setFontSize(12);
  if (isPromFailing) {
    doc.setTextColor(185, 28, 28);
  } else {
    doc.setTextColor(21, 128, 61);
  }
  doc.text(`${prom.toFixed(2)} pts`, 160, finalY + 14);

  // 7. Pie de página de validez y trazabilidad
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Documento emitido para fines informativos el ${fechaHoy}. Trazabilidad: RF-26 / RF-31.`, 14, 285);
  doc.text('I.E.P. CORAULA — Portal del Apoderado', 150, 285);

  // 8. Descarga del archivo
  const safeName = estudianteNombre.replace(/\s+/g, '_').slice(0, 30);
  doc.save(`Libreta_Bimestre_${libreta.bimestre}_${safeName}.pdf`);
}
