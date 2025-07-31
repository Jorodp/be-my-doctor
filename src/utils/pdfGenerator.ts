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
  const pageHeight = doc.internal.pageSize.height;
  const leftMargin = 20;
  const rightMargin = 20;
  let currentY = 20;

  // BE MY brand colors
  const primaryBlue = [47, 130, 255];
  const primaryGreen = [34, 197, 94];
  const accentPurple = [139, 92, 246];
  const darkNavy = [30, 41, 59];
  const lightGray = [248, 250, 252];
  const mediumGray = [148, 163, 184];
  const white = [255, 255, 255];

  // Helper function to check if new page is needed
  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
      return true;
    }
    return false;
  };

  // Header with gradient effect
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, pageWidth, 70, 'F');
  
  // BE MY logo area
  doc.setFillColor(white[0], white[1], white[2]);
  doc.roundedRect(leftMargin, 15, 45, 40, 8, 8, 'F');
  
  // BE MY text logo
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BE MY', leftMargin + 7, 30);
  doc.setFontSize(12);
  doc.text('DOCTOR', leftMargin + 7, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Plataforma Médica', leftMargin + 7, 50);

  // Main header text
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE CONSULTA MÉDICA', leftMargin + 70, 30);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Plataforma Médica Digital BE MY DOCTOR', leftMargin + 70, 45);
  
  // Document info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Documento Generado:', pageWidth - rightMargin, 30, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  }), pageWidth - rightMargin, 42, { align: 'right' });
  doc.text(new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  }), pageWidth - rightMargin, 54, { align: 'right' });

  currentY = 90;

  // Patient Information Card
  checkPageBreak(65);
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 25, 6, 6, 'F');
  
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL PACIENTE', leftMargin + 15, currentY + 17);
  
  currentY += 30;
  
  // Patient details container
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 35, 6, 6, 'F');
  doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setLineWidth(2);
  doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 35, 6, 6, 'S');
  
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Paciente:', leftMargin + 15, currentY + 15);
  doc.setFontSize(14);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text(data.patientName, leftMargin + 15, currentY + 27);
  
  currentY += 50;

  // Doctor Information Card
  checkPageBreak(65);
  doc.setFillColor(accentPurple[0], accentPurple[1], accentPurple[2]);
  doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 25, 6, 6, 'F');
  
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MÉDICO TRATANTE', leftMargin + 15, currentY + 17);
  
  currentY += 30;
  
  // Doctor details container
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 50, 6, 6, 'F');
  doc.setDrawColor(accentPurple[0], accentPurple[1], accentPurple[2]);
  doc.setLineWidth(2);
  doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 50, 6, 6, 'S');
  
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Doctor:', leftMargin + 15, currentY + 15);
  
  const doctorName = data.doctorName.startsWith('Dr.') ? data.doctorName : `Dr. ${data.doctorName}`;
  doc.setFontSize(14);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text(doctorName, leftMargin + 15, currentY + 27);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('Especialidad:', leftMargin + 15, currentY + 39);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text(data.specialty, leftMargin + 70, currentY + 39);
  
  currentY += 65;

  // Consultation Details Card
  checkPageBreak(65);
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 25, 6, 6, 'F');
  
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DE LA CONSULTA', leftMargin + 15, currentY + 17);
  
  currentY += 30;
  
  // Consultation details container
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 35, 6, 6, 'F');
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(2);
  doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 35, 6, 6, 'S');
  
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', leftMargin + 15, currentY + 15);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, leftMargin + 50, currentY + 15);
  
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Hora:', leftMargin + 15, currentY + 27);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(data.time, leftMargin + 50, currentY + 27);
  
  currentY += 50;

  // Medical sections helper function
  const addMedicalSection = (title: string, content: string, color: number[], icon: string) => {
    if (!content) return;
    
    checkPageBreak(80);
    
    // Header
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 25, 6, 6, 'F');
    
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${icon} ${title}`, leftMargin + 15, currentY + 17);
    
    currentY += 30;
    
    // Content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(content, pageWidth - leftMargin - rightMargin - 30);
    const contentHeight = Math.max(40, lines.length * 6 + 20);
    
    checkPageBreak(contentHeight);
    
    doc.setFillColor(white[0], white[1], white[2]);
    doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, contentHeight, 6, 6, 'F');
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(1);
    doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, contentHeight, 6, 6, 'S');
    
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(lines, leftMargin + 15, currentY + 15);
    
    currentY += contentHeight + 15;
  };

  // Add medical sections
  if (data.diagnosis) {
    addMedicalSection('DIAGNÓSTICO', data.diagnosis, [239, 68, 68], '🔍');
  }

  if (data.prescription) {
    addMedicalSection('PRESCRIPCIÓN MÉDICA', data.prescription, [34, 197, 94], '💊');
  }

  if (data.recommendations) {
    addMedicalSection('RECOMENDACIONES Y CUIDADOS', data.recommendations, [139, 92, 246], '📋');
  }

  // Follow-up date section
  if (data.followUpDate) {
    checkPageBreak(50);
    
    doc.setFillColor(252, 211, 77);
    doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 40, 6, 6, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(2);
    doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 40, 6, 6, 'S');
    
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📅 PRÓXIMA CITA DE SEGUIMIENTO', leftMargin + 15, currentY + 15);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.followUpDate, leftMargin + 15, currentY + 28);
    
    currentY += 55;
  }

  // Rating section
  if (data.rating) {
    checkPageBreak(70);
    
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 
                   data.ratingComment ? 60 : 40, 6, 6, 'F');
    doc.setDrawColor(252, 211, 77);
    doc.setLineWidth(2);
    doc.roundedRect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 
                   data.ratingComment ? 60 : 40, 6, 6, 'S');
    
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('⭐ CALIFICACIÓN DE LA CONSULTA', leftMargin + 15, currentY + 15);
    
    // Stars display
    const filledStars = '★'.repeat(data.rating);
    const emptyStars = '☆'.repeat(5 - data.rating);
    doc.setFontSize(16);
    doc.setTextColor(252, 211, 77);
    doc.text(filledStars + emptyStars, leftMargin + 15, currentY + 30);
    
    doc.setFontSize(12);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.rating}/5 estrellas`, leftMargin + 90, currentY + 30);
    
    if (data.ratingComment) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      const commentLines = doc.splitTextToSize(`"${data.ratingComment}"`, pageWidth - leftMargin - rightMargin - 30);
      doc.text(commentLines, leftMargin + 15, currentY + 45);
    }
    
    currentY += data.ratingComment ? 75 : 55;
  }

  // Footer
  const footerY = pageHeight - 35;
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(0, footerY, pageWidth, 35, 'F');
  
  // Footer logo
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.roundedRect(leftMargin, footerY + 8, 35, 20, 4, 4, 'F');
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BE MY', leftMargin + 6, footerY + 16);
  doc.text('DOCTOR', leftMargin + 6, footerY + 24);
  
  // Footer text
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BE MY DOCTOR - Plataforma Médica Digital', leftMargin + 45, footerY + 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('www.bemydoctor.mx | contacto@bemydoctor.mx | Tel: +52 (55) 1234-5678', leftMargin + 45, footerY + 24);
  
  // Document info
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Documento Médico Oficial', pageWidth - rightMargin, footerY + 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth - rightMargin, footerY + 24, { align: 'right' });

  // Save PDF
  const cleanPatientName = data.patientName.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g, '').replace(/\s+/g, '_');
  const cleanDate = data.date.replace(/[^0-9]/g, '');
  const fileName = `BE_MY_DOCTOR_Resumen_Consulta_${cleanPatientName}_${cleanDate}.pdf`;
  doc.save(fileName);
};