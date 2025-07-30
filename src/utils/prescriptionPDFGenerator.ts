import jsPDF from 'jspdf';

interface DoctorData {
  fullName: string;
  specialty: string;
  license: string;
  phone?: string;
  email?: string;
}

interface PatientData {
  fullName: string;
  age: number;
  date: string;
  consultationId?: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionData {
  doctor: DoctorData;
  patient: PatientData;
  medications: Medication[];
  diagnosis?: string;
  indications?: string[];
  additionalNotes?: string;
  qrCode?: string;
}

export const generatePrescriptionPDF = (data: PrescriptionData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20; // 2cm equivalent
  let currentY = margin;

  // BE MY Brand Color
  const primaryBlue = [0, 160, 223]; // #00a0df
  const lightBlue = [230, 246, 253];
  const darkGray = [51, 51, 51];
  const lightGray = [128, 128, 128];
  const borderGray = [200, 200, 200];

  // ===== HEADER SECTION =====
  // Logo placeholder (left side)
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.roundedRect(margin, currentY, 15, 15, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BE', margin + 2, currentY + 6);
  doc.text('MY', margin + 2, currentY + 11);

  // Brand name and tagline
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Be My', margin + 20, currentY + 8);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('Conectando salud y confianza', margin + 20, currentY + 14);

  // Prescription title (right side)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('RECETA MÉDICA', pageWidth - margin, currentY + 8, { align: 'right' });

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text(`Fecha: ${data.patient.date}`, pageWidth - margin, currentY + 16, { align: 'right' });

  currentY += 30;

  // Header separator line
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 20;

  // ===== DOCTOR INFORMATION BLOCK =====
  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
  doc.roundedRect(margin, currentY - 5, (pageWidth - 3 * margin) / 2, 35, 3, 3, 'F');
  
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY - 5, (pageWidth - 3 * margin) / 2, 35, 3, 3, 'S');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('MÉDICO', margin + 5, currentY + 5);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(data.doctor.fullName, margin + 5, currentY + 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.doctor.specialty, margin + 5, currentY + 22);
  doc.text(`Cédula: ${data.doctor.license}`, margin + 5, currentY + 28);

  // ===== PATIENT INFORMATION BLOCK =====
  const patientX = margin + (pageWidth - 3 * margin) / 2 + 10;
  
  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
  doc.roundedRect(patientX, currentY - 5, (pageWidth - 3 * margin) / 2, 35, 3, 3, 'F');
  
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(patientX, currentY - 5, (pageWidth - 3 * margin) / 2, 35, 3, 3, 'S');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('PACIENTE', patientX + 5, currentY + 5);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(data.patient.fullName, patientX + 5, currentY + 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Edad: ${data.patient.age} años`, patientX + 5, currentY + 22);
  doc.text(`Fecha: ${data.patient.date}`, patientX + 5, currentY + 28);

  currentY += 50;

  // ===== DIAGNOSIS SECTION (if provided) =====
  if (data.diagnosis) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text('DIAGNÓSTICO', margin, currentY);

    currentY += 8;
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const diagnosisLines = doc.splitTextToSize(data.diagnosis, pageWidth - 2 * margin);
    doc.text(diagnosisLines, margin, currentY);
    currentY += diagnosisLines.length * 5 + 10;
  }

  // ===== PRESCRIPTION TABLE =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('PRESCRIPCIÓN', margin, currentY);

  currentY += 8;
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 10;

  // Table headers
  const tableWidth = pageWidth - 2 * margin;
  const colWidths = [tableWidth * 0.35, tableWidth * 0.2, tableWidth * 0.25, tableWidth * 0.2];
  const headers = ['Medicamento', 'Dosis', 'Frecuencia', 'Duración'];

  // Header background
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(margin, currentY, tableWidth, 12, 'F');

  // Header text
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  
  let currentX = margin + 3;
  headers.forEach((header, index) => {
    doc.text(header, currentX, currentY + 8);
    currentX += colWidths[index];
  });

  currentY += 12;

  // Table rows
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  data.medications.forEach((medication, index) => {
    const rowHeight = 15;
    
    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, currentY, tableWidth, rowHeight, 'F');
    }

    // Row borders
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.1);
    doc.rect(margin, currentY, tableWidth, rowHeight, 'S');

    // Cell content
    currentX = margin + 3;
    const values = [medication.name, medication.dosage, medication.frequency, medication.duration];
    
    values.forEach((value, colIndex) => {
      const cellText = doc.splitTextToSize(value, colWidths[colIndex] - 6);
      doc.text(cellText, currentX, currentY + 10);
      
      // Vertical cell borders
      if (colIndex < values.length - 1) {
        currentX += colWidths[colIndex];
        doc.line(currentX - 1, currentY, currentX - 1, currentY + rowHeight);
      }
    });

    currentY += rowHeight;
  });

  currentY += 20;

  // ===== INDICATIONS SECTION =====
  if (data.indications && data.indications.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text('INDICACIONES', margin, currentY);

    currentY += 8;
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

    data.indications.forEach((indication) => {
      doc.text(`• ${indication}`, margin + 5, currentY);
      currentY += 6;
    });

    currentY += 10;
  }

  // ===== ADDITIONAL NOTES =====
  if (data.additionalNotes) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text('NOTAS ADICIONALES', margin, currentY);

    currentY += 8;
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const notesLines = doc.splitTextToSize(data.additionalNotes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, currentY);
    currentY += notesLines.length * 5 + 20;
  }

  // ===== SIGNATURE SECTION =====
  // Check if we need a new page
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = margin;
  }

  const signatureY = Math.max(currentY, pageHeight - 80);
  
  // Signature box
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.rect(pageWidth - margin - 80, signatureY, 80, 30, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('Firma y Sello', pageWidth - margin - 75, signatureY + 35);

  // ===== FOOTER =====
  const footerY = pageHeight - 25;
  
  // Footer separator
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  // Contact information
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('📞 +52 55 1234 5678 | ✉ contacto@bemy.mx | 🌐 www.bemy.mx', margin, footerY);

  // QR Code placeholder (if provided)
  if (data.qrCode || data.patient.consultationId) {
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.rect(pageWidth - margin - 20, footerY - 20, 15, 15, 'S');
    
    doc.setFontSize(6);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text('QR', pageWidth - margin - 15, footerY - 12);
    doc.text('Verificación', pageWidth - margin - 18, footerY - 2);
  }

  // Document ID
  doc.setFontSize(8);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text(`ID: ${data.patient.consultationId || 'BMD-' + Date.now()}`, pageWidth - margin, footerY + 8, { align: 'right' });

  // Generate filename and save
  const cleanPatientName = data.patient.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanDate = data.patient.date.replace(/[^0-9]/g, '');
  const fileName = `Receta_Medica_${cleanPatientName}_${cleanDate}.pdf`;
  
  doc.save(fileName);
};

// Demo function to test the prescription template
export const generateDemoPrescription = () => {
  const demoData: PrescriptionData = {
    doctor: {
      fullName: "Dr. María García López",
      specialty: "Medicina Interna",
      license: "12345678",
      phone: "+52 55 1234 5678",
      email: "dra.garcia@bemy.mx"
    },
    patient: {
      fullName: "Juan Carlos Pérez",
      age: 45,
      date: new Date().toLocaleDateString('es-MX'),
      consultationId: "BMD-20241201-001"
    },
    medications: [
      {
        name: "Omeprazol 20mg",
        dosage: "1 cápsula",
        frequency: "Cada 12 horas",
        duration: "14 días",
        instructions: "Tomar antes de los alimentos"
      },
      {
        name: "Paracetamol 500mg",
        dosage: "1 tableta",
        frequency: "Cada 8 horas",
        duration: "3 días",
        instructions: "Solo en caso de dolor"
      },
      {
        name: "Complejo B",
        dosage: "1 tableta",
        frequency: "Una vez al día",
        duration: "30 días",
        instructions: "Tomar con el desayuno"
      }
    ],
    diagnosis: "Gastritis aguda leve con síntomas de reflujo gastroesofágico",
    indications: [
      "Evitar alimentos irritantes (picantes, ácidos, café)",
      "Comer porciones pequeñas y frecuentes",
      "No acostarse inmediatamente después de comer",
      "Mantener la cabeza elevada al dormir",
      "Evitar el tabaco y el alcohol"
    ],
    additionalNotes: "Regresar a consulta en 15 días para evaluación. En caso de empeoramiento de síntomas, acudir inmediatamente. Mantener dieta blanda durante los primeros 5 días."
  };

  generatePrescriptionPDF(demoData);
};