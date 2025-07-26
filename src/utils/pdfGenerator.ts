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
  const margin = 20;
  let currentY = 20;

  // Define colors (RGB values)
  const primaryColor = [34, 197, 94]; // Green primary
  const secondaryColor = [107, 114, 128]; // Gray
  const lightGray = [248, 250, 252];
  const darkGray = [15, 23, 42];

  // Header background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Header content
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Be My Doctor', margin, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Plataforma Médica Integral', margin, 35);
  
  // Header right side - Document type
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE CONSULTA', pageWidth - margin, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin, 35, { align: 'right' });

  currentY = 70;

  // Reset text color for body
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  // Patient Information Section
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, 30, 3, 3, 'F');
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(2);
  doc.line(margin + 5, currentY + 5, margin + 60, currentY + 5);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PACIENTE', margin + 5, currentY + 5);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`${data.patientName}`, margin + 5, currentY + 18);
  
  currentY += 40;

  // Doctor Information Section
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, 40, 3, 3, 'F');
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(2);
  doc.line(margin + 5, currentY + 5, margin + 60, currentY + 5);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('MÉDICO TRATANTE', margin + 5, currentY + 5);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`Dr. ${data.doctorName}`, margin + 5, currentY + 18);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`${data.specialty}`, margin + 5, currentY + 28);
  
  currentY += 50;

  // Consultation Details Section
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, 30, 3, 3, 'F');
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(2);
  doc.line(margin + 5, currentY + 5, margin + 80, currentY + 5);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DETALLES DE CONSULTA', margin + 5, currentY + 5);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`📅 Fecha: ${data.date}`, margin + 5, currentY + 18);
  doc.text(`🕒 Hora: ${data.time}`, margin + 100, currentY + 18);
  
  currentY += 40;

  // Medical Information Sections
  const addMedicalSection = (title: string, content: string, icon: string) => {
    if (!content) return;
    
    // Section header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 12, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${icon} ${title}`, margin + 5, currentY + 8);
    
    currentY += 20;
    
    // Section content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const contentLines = doc.splitTextToSize(content, pageWidth - 2 * margin - 10);
    doc.text(contentLines, margin + 5, currentY);
    currentY += contentLines.length * 5 + 15;
  };

  if (data.diagnosis) {
    addMedicalSection('DIAGNÓSTICO', data.diagnosis, '🔍');
  }

  if (data.prescription) {
    addMedicalSection('PRESCRIPCIÓN MÉDICA', data.prescription, '💊');
  }

  if (data.recommendations) {
    addMedicalSection('RECOMENDACIONES', data.recommendations, '📋');
  }

  if (data.followUpDate) {
    currentY += 5;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 12, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`📅 PRÓXIMA CITA: ${data.followUpDate}`, margin + 5, currentY + 8);
    currentY += 20;
  }

  // Rating Section
  if (data.rating) {
    currentY += 10;
    doc.setFillColor(254, 240, 138); // Yellow background
    doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, 
                   data.ratingComment ? 35 : 25, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14); // Amber text
    doc.text('⭐ CALIFICACIÓN DE LA CONSULTA', margin + 5, currentY + 5);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    
    // Generate stars
    const stars = '⭐'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
    doc.text(`${stars} (${data.rating}/5)`, margin + 5, currentY + 15);
    
    if (data.ratingComment) {
      currentY += 10;
      const commentLines = doc.splitTextToSize(data.ratingComment, pageWidth - 2 * margin - 10);
      doc.text(commentLines, margin + 5, currentY + 15);
      currentY += commentLines.length * 5;
    }
    currentY += 15;
  }

  // Footer
  const footerY = pageHeight - 25;
  doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.rect(0, footerY - 5, pageWidth, 30, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Be My Doctor - Plataforma Médica Integral', margin, footerY + 5);
  doc.text('www.bemy.com.mx', margin, footerY + 15);
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Documento médico oficial', pageWidth - margin, footerY + 5, { align: 'right' });
  doc.setTextColor(255, 255, 255);
  doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, pageWidth - margin, footerY + 15, { align: 'right' });

  // Save the PDF
  const fileName = `Be_My_Doctor_Consulta_${data.patientName.replace(/\s+/g, '_')}_${data.date.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};