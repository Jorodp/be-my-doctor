import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generatePrescriptionPDF, generateDemoPrescription } from '@/utils/prescriptionPDFGenerator';
import { FileText, Download, Eye, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionForm {
  doctorName: string;
  doctorSpecialty: string;
  doctorLicense: string;
  patientName: string;
  patientAge: number;
  diagnosis: string;
  indications: string;
  additionalNotes: string;
  medications: Medication[];
}

export const PrescriptionGenerator: React.FC = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<PrescriptionForm>({
    doctorName: '',
    doctorSpecialty: '',
    doctorLicense: '',
    patientName: '',
    patientAge: 0,
    diagnosis: '',
    indications: '',
    additionalNotes: '',
    medications: [
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ]
  });

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const generatePrescription = () => {
    try {
      // Validate required fields
      if (!formData.doctorName || !formData.patientName || !formData.doctorLicense) {
        toast({
          variant: "destructive",
          title: "Campos requeridos",
          description: "Por favor complete los campos básicos: médico, paciente y cédula."
        });
        return;
      }

      const filteredMedications = formData.medications.filter(med => med.name.trim() !== '');
      
      if (filteredMedications.length === 0) {
        toast({
          variant: "destructive",
          title: "Sin medicamentos",
          description: "Debe agregar al menos un medicamento a la receta."
        });
        return;
      }

      const prescriptionData = {
        doctor: {
          fullName: formData.doctorName,
          specialty: formData.doctorSpecialty || 'Medicina General',
          license: formData.doctorLicense
        },
        patient: {
          fullName: formData.patientName,
          age: formData.patientAge || 0,
          date: new Date().toLocaleDateString('es-MX'),
          consultationId: `BMD-${Date.now()}`
        },
        medications: filteredMedications,
        diagnosis: formData.diagnosis || undefined,
        indications: formData.indications ? formData.indications.split('\n').filter(line => line.trim()) : undefined,
        additionalNotes: formData.additionalNotes || undefined
      };

      generatePrescriptionPDF(prescriptionData);

      toast({
        title: "Receta generada",
        description: "La receta médica se ha generado exitosamente.",
      });
    } catch (error) {
      console.error('Error generating prescription:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un error al generar la receta médica."
      });
    }
  };

  const generateDemo = () => {
    generateDemoPrescription();
    toast({
      title: "Receta demo generada",
      description: "Se ha generado una receta médica de ejemplo.",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <FileText className="h-6 w-6" />
            Generador de Recetas Médicas
          </CardTitle>
          <CardDescription>
            Cree recetas médicas profesionales con el diseño de BE MY
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Demo Button */}
          <div className="flex justify-end">
            <Button onClick={generateDemo} variant="outline" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Ver Ejemplo
            </Button>
          </div>

          {/* Doctor Information */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Información del Médico</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doctorName">Nombre Completo *</Label>
                <Input
                  id="doctorName"
                  value={formData.doctorName}
                  onChange={(e) => setFormData(prev => ({ ...prev, doctorName: e.target.value }))}
                  placeholder="Dr. María García López"
                />
              </div>
              <div>
                <Label htmlFor="doctorSpecialty">Especialidad</Label>
                <Input
                  id="doctorSpecialty"
                  value={formData.doctorSpecialty}
                  onChange={(e) => setFormData(prev => ({ ...prev, doctorSpecialty: e.target.value }))}
                  placeholder="Medicina Interna"
                />
              </div>
              <div>
                <Label htmlFor="doctorLicense">Cédula Profesional *</Label>
                <Input
                  id="doctorLicense"
                  value={formData.doctorLicense}
                  onChange={(e) => setFormData(prev => ({ ...prev, doctorLicense: e.target.value }))}
                  placeholder="12345678"
                />
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Información del Paciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientName">Nombre Completo *</Label>
                <Input
                  id="patientName"
                  value={formData.patientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                  placeholder="Juan Carlos Pérez"
                />
              </div>
              <div>
                <Label htmlFor="patientAge">Edad</Label>
                <Input
                  id="patientAge"
                  type="number"
                  value={formData.patientAge || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, patientAge: parseInt(e.target.value) || 0 }))}
                  placeholder="45"
                />
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Diagnóstico</h3>
            <Textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="Gastritis aguda leve con síntomas de reflujo gastroesofágico"
              rows={3}
            />
          </div>

          {/* Medications */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-primary">Medicamentos</h3>
              <Button onClick={addMedication} size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar Medicamento
              </Button>
            </div>
            
            <div className="space-y-4">
              {formData.medications.map((medication, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-medium text-sm text-muted-foreground">
                      Medicamento #{index + 1}
                    </span>
                    {formData.medications.length > 1 && (
                      <Button
                        onClick={() => removeMedication(index)}
                        size="sm"
                        variant="ghost"
                        className="text-destructive h-6 w-6 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <Label>Medicamento</Label>
                      <Input
                        value={medication.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        placeholder="Omeprazol 20mg"
                      />
                    </div>
                    <div>
                      <Label>Dosis</Label>
                      <Input
                        value={medication.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        placeholder="1 cápsula"
                      />
                    </div>
                    <div>
                      <Label>Frecuencia</Label>
                      <Input
                        value={medication.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        placeholder="Cada 12 horas"
                      />
                    </div>
                    <div>
                      <Label>Duración</Label>
                      <Input
                        value={medication.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        placeholder="14 días"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <Label>Instrucciones</Label>
                    <Input
                      value={medication.instructions}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      placeholder="Tomar antes de los alimentos"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Indications */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Indicaciones</h3>
            <Textarea
              value={formData.indications}
              onChange={(e) => setFormData(prev => ({ ...prev, indications: e.target.value }))}
              placeholder="• Evitar alimentos irritantes&#10;• Comer porciones pequeñas&#10;• No acostarse después de comer"
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Escriba cada indicación en una línea separada. Se agregarán viñetas automáticamente.
            </p>
          </div>

          {/* Additional Notes */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Notas Adicionales</h3>
            <Textarea
              value={formData.additionalNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
              placeholder="Regresar a consulta en 15 días para evaluación..."
              rows={3}
            />
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-6">
            <Button 
              onClick={generatePrescription} 
              size="lg" 
              className="flex items-center gap-2 px-8"
            >
              <Download className="h-5 w-5" />
              Generar Receta Médica
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};