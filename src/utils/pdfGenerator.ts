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

  // BE MY colors (brand colors)
  const primaryColor = [0, 123, 255]; // BE MY Blue
  const accentColor = [255, 193, 7]; // BE MY Yellow/Gold
  const successColor = [40, 167, 69]; // BE MY Green
  const darkColor = [33, 37, 41]; // Dark gray
  const lightGray = [248, 249, 250];

  // Header with BE MY branding
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  // Logo placeholder (you can add actual logo here)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 15, 30, 30, 5, 5, 'F');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BE', margin + 8, 28);
  doc.text('MY', margin + 8, 38);
  
  // Header title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('BE MY DOCTOR', margin + 40, 28);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Plataforma Médica Digital', margin + 40, 38);
  
  // Document type
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE CONSULTA', pageWidth - margin, 28, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - margin, 40, { align: 'right' });

  currentY = 80;

  // Patient Information
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, 35, 5, 5, 'F');
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(3);
  doc.line(margin + 5, currentY + 8, margin + 70, currentY + 8);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('👤 PACIENTE', margin + 5, currentY + 5);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${data.patientName}`, margin + 5, currentY + 20);
  
  currentY += 45;

  // Doctor Information
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, 45, 5, 5, 'F');
  doc.setDrawColor(successColor[0], successColor[1], successColor[2]);
  doc.setLineWidth(3);
  doc.line(margin + 5, currentY + 8, margin + 90, currentY + 8);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('👨‍⚕️ MÉDICO TRATANTE', margin + 5, currentY + 5);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const doctorName = data.doctorName.startsWith('Dr.') ? data.doctorName : `Dr. ${data.doctorName}`;
  doc.text(doctorName, margin + 5, currentY + 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(`${data.specialty}`, margin + 5, currentY + 32);
  
  currentY += 55;

  // Consultation Details
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, 35, 5, 5, 'F');
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(3);
  doc.line(margin + 5, currentY + 8, margin + 100, currentY + 8);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('📅 DETALLES DE CONSULTA', margin + 5, currentY + 5);
  
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Fecha: ${data.date}`, margin + 5, currentY + 20);
  doc.text(`Hora: ${data.time}`, margin + 100, currentY + 20);
  
  currentY += 50;

  // Medical Information Sections with improved styling
  const addMedicalSection = (title: string, content: string, icon: string, bgColor: number[]) => {
    if (!content) return;
    
    // Calculate content height first
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const contentLines = doc.splitTextToSize(content, pageWidth - 2 * margin - 16);
    const sectionHeight = Math.max(35, contentLines.length * 5 + 25);
    
    // Section header with gradient effect
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 15, 3, 3, 'F');
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${icon} ${title}`, margin + 8, currentY + 10);
    
    currentY += 20;
    
    // Content with border
    doc.setDrawColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.setLineWidth(1);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, sectionHeight - 20, 3, 3, 'S');
    
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + 1, currentY + 1, pageWidth - 2 * margin - 2, sectionHeight - 22, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(contentLines, margin + 8, currentY + 12);
    
    currentY += sectionHeight;
  };

  if (data.diagnosis) {
    addMedicalSection('DIAGNÓSTICO', data.diagnosis, '🔍', [220, 53, 69]); // Red
  }

  if (data.prescription) {
    addMedicalSection('PRESCRIPCIÓN MÉDICA', data.prescription, '💊', [40, 167, 69]); // Green
  }

  if (data.recommendations) {
    addMedicalSection('RECOMENDACIONES', data.recommendations, '📋', [111, 66, 193]); // Purple
  }

  if (data.followUpDate) {
    currentY += 5;
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 18, 5, 5, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`📅 PRÓXIMA CITA: ${data.followUpDate}`, margin + 8, currentY + 12);
    currentY += 25;
  }

  // Rating Section with stars
  if (data.rating) {
    currentY += 10;
    doc.setFillColor(255, 248, 220); // Light yellow
    doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, 
                   data.ratingComment ? 40 : 30, 5, 5, 'F');
    
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(2);
    doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, 
                   data.ratingComment ? 40 : 30, 5, 5, 'S');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('⭐ CALIFICACIÓN DE LA CONSULTA', margin + 8, currentY + 8);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Generate stars with better styling
    const stars = '⭐'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
    doc.text(`${stars} (${data.rating}/5 estrellas)`, margin + 8, currentY + 20);
    
    if (data.ratingComment) {
      currentY += 12;
      const commentLines = doc.splitTextToSize(`"${data.ratingComment}"`, pageWidth - 2 * margin - 16);
      doc.setFont('helvetica', 'italic');
      doc.text(commentLines, margin + 8, currentY + 20);
    }
    currentY += 30;
  }

  // Modern footer with BE MY branding
  const footerY = pageHeight - 30;
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, footerY - 5, pageWidth, 35, 'F');
  
  // Footer logo
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(margin, footerY, 25, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BE MY', margin + 3, footerY + 12);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BE MY DOCTOR - Plataforma Médica Digital', margin + 30, footerY + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('🌐 www.bemydoctor.mx | 📧 contacto@bemydoctor.mx', margin + 30, footerY + 16);
  
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Documento Médico Oficial', pageWidth - margin, footerY + 8, { align: 'right' });
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth - margin, footerY + 16, { align: 'right' });

  // Save with better filename
  const cleanPatientName = data.patientName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanDate = data.date.replace(/[^0-9]/g, '');
  const fileName = `BE_MY_DOCTOR_Consulta_${cleanPatientName}_${cleanDate}.pdf`;
  doc.save(fileName);
};