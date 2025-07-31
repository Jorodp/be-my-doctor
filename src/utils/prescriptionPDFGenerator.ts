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
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  let currentY = margin;

  // BE MY Brand Colors - matching the web design
  const primaryBlue = [0, 160, 223]; // #00a0df
  const primaryLight = [230, 246, 253]; // Light blue background
  const textDark = [45, 55, 72]; // Dark text
  const textLight = [107, 114, 128]; // Light text
  const borderColor = [226, 232, 240]; // Border gray
  const white = [255, 255, 255];

  // ===== MODERN HEADER SECTION =====
  // Header background with gradient effect
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, pageWidth, 25, 'F');

  // BE MY Logo (left side)
  doc.setFillColor(white[0], white[1], white[2]);
  doc.roundedRect(margin, currentY + 3, 18, 18, 3, 3, 'F');
  
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BE', margin + 4, currentY + 11);
  doc.text('MY', margin + 4, currentY + 16);

  // Brand name and tagline
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Be My Doctor', margin + 25, currentY + 12);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Conectando salud y confianza', margin + 25, currentY + 18);

  // Prescription title (right side)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(white[0], white[1], white[2]);
  doc.text('RECETA MÉDICA', pageWidth - margin, currentY + 10, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${data.patient.date}`, pageWidth - margin, currentY + 17, { align: 'right' });

  currentY += 35;

  // ===== DOCTOR AND PATIENT INFO CARDS =====
  const cardHeight = 35;
  const cardWidth = (pageWidth - 3 * margin) / 2;
  
  // Doctor Information Card
  doc.setFillColor(primaryLight[0], primaryLight[1], primaryLight[2]);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 4, 4, 'F');
  
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 4, 4, 'S');

  // Doctor icon and title
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.circle(margin + 8, currentY + 8, 3, 'F');
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Dr', margin + 6.5, currentY + 9);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('MÉDICO TRATANTE', margin + 15, currentY + 8);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(data.doctor.fullName, margin + 5, currentY + 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(data.doctor.specialty || 'Medicina General', margin + 5, currentY + 24);
  doc.text(`Cédula Prof: ${data.doctor.license}`, margin + 5, currentY + 30);

  // Patient Information Card
  const patientX = margin + cardWidth + 10;
  
  doc.setFillColor(primaryLight[0], primaryLight[1], primaryLight[2]);
  doc.roundedRect(patientX, currentY, cardWidth, cardHeight, 4, 4, 'F');
  
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(patientX, currentY, cardWidth, cardHeight, 4, 4, 'S');

  // Patient icon and title
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.circle(patientX + 8, currentY + 8, 3, 'F');
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('P', patientX + 6.8, currentY + 9);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('PACIENTE', patientX + 15, currentY + 8);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(data.patient.fullName, patientX + 5, currentY + 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`Edad: ${data.patient.age} años`, patientX + 5, currentY + 24);
  doc.text(`Consulta: ${data.patient.date}`, patientX + 5, currentY + 30);

  currentY += 50;

  // ===== DIAGNOSIS SECTION =====
  if (data.diagnosis) {
    doc.setFillColor(primaryLight[0], primaryLight[1], primaryLight[2]);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 25, 3, 3, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text('📋 DIAGNÓSTICO', margin + 5, currentY + 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const diagnosisLines = doc.splitTextToSize(data.diagnosis, pageWidth - 4 * margin);
    doc.text(diagnosisLines, margin + 5, currentY + 16);
    
    currentY += 35;
  }

  // ===== MODERN PRESCRIPTION TABLE =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('💊 PRESCRIPCIÓN MÉDICA', margin, currentY);

  currentY += 12;

  // Table setup
  const tableWidth = pageWidth - 2 * margin;
  const colWidths = [
    tableWidth * 0.4,  // Medicamento
    tableWidth * 0.2,  // Dosis
    tableWidth * 0.25, // Frecuencia
    tableWidth * 0.15  // Duración
  ];
  const headers = ['Medicamento', 'Dosis', 'Frecuencia', 'Duración'];

  // Modern table header
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.roundedRect(margin, currentY, tableWidth, 14, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(white[0], white[1], white[2]);
  
  let currentX = margin + 8;
  headers.forEach((header, index) => {
    doc.text(header, currentX, currentY + 9);
    currentX += colWidths[index];
  });

  currentY += 14;

  // Table rows with alternating colors
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  data.medications.forEach((medication, index) => {
    const rowHeight = 18;
    
    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, currentY, tableWidth, rowHeight, 'F');
    }

    // Row border
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin, currentY, tableWidth, rowHeight, 'S');

    // Cell content
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    currentX = margin + 8;
    const values = [medication.name, medication.dosage, medication.frequency, medication.duration];
    
    values.forEach((value, colIndex) => {
      const maxWidth = colWidths[colIndex] - 16;
      const cellText = doc.splitTextToSize(value, maxWidth);
      doc.text(cellText, currentX, currentY + 12);
      
      // Vertical separators
      if (colIndex < values.length - 1) {
        currentX += colWidths[colIndex];
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.line(currentX - 8, currentY + 2, currentX - 8, currentY + rowHeight - 2);
      }
    });

    // Instructions row if available
    if (medication.instructions) {
      currentY += rowHeight;
      doc.setFillColor(primaryLight[0], primaryLight[1], primaryLight[2]);
      doc.rect(margin, currentY, tableWidth, 12, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.text(`💡 ${medication.instructions}`, margin + 8, currentY + 8);
      currentY += 12;
    }

    currentY += rowHeight;
  });

  currentY += 15;

  // ===== INDICATIONS SECTION =====
  if (data.indications && data.indications.length > 0) {
    doc.setFillColor(primaryLight[0], primaryLight[1], primaryLight[2]);
    const indicationsHeight = data.indications.length * 6 + 20;
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, indicationsHeight, 3, 3, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text('📝 INDICACIONES MÉDICAS', margin + 5, currentY + 10);

    currentY += 18;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    data.indications.forEach((indication) => {
      doc.text(`• ${indication}`, margin + 10, currentY);
      currentY += 6;
    });

    currentY += 10;
  }

  // ===== ADDITIONAL NOTES =====
  if (data.additionalNotes) {
    currentY += 5;
    doc.setFillColor(255, 248, 220); // Light yellow background
    const notesHeight = 25;
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, notesHeight, 3, 3, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 130, 0); // Orange text
    doc.text('⚠️ NOTAS IMPORTANTES', margin + 5, currentY + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const notesLines = doc.splitTextToSize(data.additionalNotes, pageWidth - 4 * margin);
    doc.text(notesLines, margin + 5, currentY + 16);
    
    currentY += notesHeight + 10;
  }

  // ===== SIGNATURE AND FOOTER =====
  // Check if we need a new page
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = margin;
  }

  const signatureY = Math.max(currentY, pageHeight - 70);
  
  // Signature box with modern design
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(1);
  doc.roundedRect(pageWidth - margin - 70, signatureY, 70, 35, 3, 3, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text('Firma Digital', pageWidth - margin - 67, signatureY + 5);
  doc.text('y Sello Médico', pageWidth - margin - 67, signatureY + 30);

  // ===== MODERN FOOTER =====
  const footerY = pageHeight - 20;
  
  // Footer background
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, footerY - 5, pageWidth, 25, 'F');

  // Contact information with icons
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(white[0], white[1], white[2]);
  doc.text('📞 +52 55 1234 5678', margin, footerY + 2);
  doc.text('✉️ contacto@bemydoctor.mx', margin + 50, footerY + 2);
  doc.text('🌐 www.bemydoctor.mx', margin + 100, footerY + 2);

  // QR Code placeholder
  if (data.qrCode || data.patient.consultationId) {
    doc.setFillColor(white[0], white[1], white[2]);
    doc.roundedRect(pageWidth - margin - 25, footerY - 20, 20, 20, 2, 2, 'F');
    
    doc.setFontSize(6);
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text('QR CODE', pageWidth - margin - 23, footerY - 12);
    doc.text('Verificación', pageWidth - margin - 24, footerY - 8);
    doc.text('Digital', pageWidth - margin - 21, footerY - 4);
  }

  // Document ID and verification
  doc.setFontSize(7);
  doc.setTextColor(white[0], white[1], white[2]);
  const docId = data.patient.consultationId || `BMD-${Date.now()}`;
  doc.text(`ID: ${docId} | Generado: ${new Date().toLocaleString('es-MX')}`, 
           pageWidth - margin, footerY + 8, { align: 'right' });

  // Generate filename and save
  const cleanPatientName = data.patient.fullName.replace(/[^a-zA-ZñÑ0-9\s]/g, '').replace(/\s+/g, '_');
  const cleanDate = data.patient.date.replace(/[^0-9]/g, '');
  const fileName = `Receta_Médica_${cleanPatientName}_${cleanDate}.pdf`;
  
  doc.save(fileName);
};

// Demo function to test the prescription template
export const generateDemoPrescription = () => {
  const demoData: PrescriptionData = {
    doctor: {
      fullName: "Dra. María García López",
      specialty: "Medicina Interna",
      license: "12345678",
      phone: "+52 55 1234 5678",
      email: "dra.garcia@bemydoctor.mx"
    },
    patient: {
      fullName: "Juan Carlos Pérez Hernández",
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
        instructions: "Tomar 30 minutos antes de los alimentos principales"
      },
      {
        name: "Paracetamol 500mg",
        dosage: "1 tableta",
        frequency: "Cada 8 horas",
        duration: "3 días",
        instructions: "Solo en caso de dolor o fiebre mayor a 38°C"
      },
      {
        name: "Complejo B (Vitaminas del grupo B)",
        dosage: "1 tableta",
        frequency: "Una vez al día",
        duration: "30 días",
        instructions: "Tomar con el desayuno para mejor absorción"
      }
    ],
    diagnosis: "Gastritis aguda leve con síntomas de reflujo gastroesofágico. Cuadro compatible con dispepsia funcional secundaria a estrés y malos hábitos alimentarios.",
    indications: [
      "Evitar alimentos irritantes (picantes, ácidos, café, alcohol)",
      "Realizar comidas pequeñas y frecuentes (5-6 veces al día)",
      "No acostarse inmediatamente después de comer (esperar 2-3 horas)",
      "Mantener la cabeza elevada al dormir (usar 2 almohadas)",
      "Evitar el tabaco y reducir el estrés",
      "Beber abundante agua durante el día (2-3 litros)",
      "Masticar lentamente y comer en ambiente tranquilo"
    ],
    additionalNotes: "Regresar a consulta de control en 15 días para evaluación de evolución. En caso de empeoramiento de síntomas, dolor abdominal intenso, vómito persistente o signos de alarma, acudir inmediatamente al servicio de urgencias. Mantener dieta blanda y evitar irritantes durante los primeros 7 días del tratamiento."
  };

  generatePrescriptionPDF(demoData);
};