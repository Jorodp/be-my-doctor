import React from 'react';
import { PrescriptionGenerator } from '@/components/PrescriptionGenerator';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';

const PrescriptionTest = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50">
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <BackToHomeButton />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Plantilla de Receta Médica
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Generador de recetas médicas con diseño profesional alineado a la identidad de BE MY. 
            Incluye todos los elementos necesarios para una prescripción médica completa.
          </p>
        </div>

        <PrescriptionGenerator />
        
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="bg-card rounded-lg p-6 border">
            <h2 className="text-2xl font-semibold text-primary mb-4">Características de la Plantilla</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Diseño Visual</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Logo BE MY en cabecera</li>
                  <li>• Color principal #00a0df</li>
                  <li>• Tipografía sans-serif moderna</li>
                  <li>• Márgenes de 2cm para impresión</li>
                  <li>• Diseño responsive A4/Carta</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Elementos Incluidos</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Datos del médico y paciente</li>
                  <li>• Tabla de prescripción estructurada</li>
                  <li>• Área de indicaciones con viñetas</li>
                  <li>• Espacio para firma y sello</li>
                  <li>• Pie de página con contacto</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionTest;