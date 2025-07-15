import jsPDF from 'jspdf';

interface ConsultationData {
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  diagnosis: string | null;
  prescription: string | null;
  recommendations: string | null;
  followUpDate: string | null;
  rating?: number;
  ratingComment?: string;
}

export const generateConsultationPDF = (data: ConsultationData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let currentY = 30;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE CONSULTA MÉDICA', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 30;

  // Patient and Doctor Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  // Patient info box
  doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 25);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL PACIENTE', margin + 5, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Paciente: ${data.patientName}`, margin + 5, currentY + 15);
  
  currentY += 35;

  // Doctor info box
  doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 35);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL MÉDICO', margin + 5, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Doctor: ${data.doctorName}`, margin + 5, currentY + 15);
  doc.text(`Especialidad: ${data.specialty}`, margin + 5, currentY + 25);
  
  currentY += 45;

  // Consultation details
  doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 25);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DE LA CONSULTA', margin + 5, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${data.date}`, margin + 5, currentY + 15);
  doc.text(`Hora: ${data.time}`, margin + 100, currentY + 15);
  
  currentY += 35;

  // Medical information
  if (data.diagnosis) {
    doc.setFont('helvetica', 'bold');
    doc.text('DIAGNÓSTICO:', margin, currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    const diagnosisLines = doc.splitTextToSize(data.diagnosis, pageWidth - 2 * margin);
    doc.text(diagnosisLines, margin, currentY);
    currentY += diagnosisLines.length * 5 + 10;
  }

  if (data.prescription) {
    doc.setFont('helvetica', 'bold');
    doc.text('PRESCRIPCIÓN MÉDICA:', margin, currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    const prescriptionLines = doc.splitTextToSize(data.prescription, pageWidth - 2 * margin);
    doc.text(prescriptionLines, margin, currentY);
    currentY += prescriptionLines.length * 5 + 10;
  }

  if (data.recommendations) {
    doc.setFont('helvetica', 'bold');
    doc.text('RECOMENDACIONES:', margin, currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    const recommendationsLines = doc.splitTextToSize(data.recommendations, pageWidth - 2 * margin);
    doc.text(recommendationsLines, margin, currentY);
    currentY += recommendationsLines.length * 5 + 10;
  }

  if (data.followUpDate) {
    doc.setFont('helvetica', 'bold');
    doc.text(`PRÓXIMA CITA DE SEGUIMIENTO: ${data.followUpDate}`, margin, currentY);
    currentY += 15;
  }

  // Rating if available
  if (data.rating) {
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('CALIFICACIÓN DE LA CONSULTA:', margin, currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Calificación: ${data.rating}/5 estrellas`, margin, currentY);
    
    if (data.ratingComment) {
      currentY += 8;
      doc.text('Comentario:', margin, currentY);
      currentY += 5;
      const commentLines = doc.splitTextToSize(data.ratingComment, pageWidth - 2 * margin);
      doc.text(commentLines, margin, currentY);
    }
  }

  // Footer
  currentY = doc.internal.pageSize.height - 30;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Documento generado por Be My Doctor', pageWidth / 2, currentY, { align: 'center' });
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, currentY + 5, { align: 'center' });

  // Save the PDF
  const fileName = `consulta_${data.patientName.replace(/\s+/g, '_')}_${data.date.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};