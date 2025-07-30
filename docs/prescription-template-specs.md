# Plantilla de Receta Médica BE MY

## Especificaciones de Diseño

### Identidad Visual
- **Color Principal:** #00a0df (BE MY Blue)
- **Tipografía:** Helvetica/Sans-serif moderna
- **Formato:** A4/Carta (210x297mm / 8.5x11")
- **Márgenes:** 2cm en todos los lados

### Estructura del Documento

#### 1. Cabecera (Header)
- **Logo BE MY:** Izquierda superior, 15x15px placeholder
- **Nombre de marca:** "Be My" en 24pt, color #00a0df
- **Tagline:** "Conectando salud y confianza" en 10pt, gris claro
- **Título documento:** "RECETA MÉDICA" alineado a la derecha en 16pt
- **Fecha:** Fecha actual alineada a la derecha en 10pt

#### 2. Información Médico/Paciente
- **Bloques separados:** Médico (izquierda) y Paciente (derecha)
- **Fondo:** Color azul claro (#e6f6fd)
- **Borde:** Azul principal con esquinas redondeadas
- **Contenido Médico:** Nombre completo, especialidad, cédula
- **Contenido Paciente:** Nombre completo, edad, fecha

#### 3. Sección Diagnóstico (Opcional)
- **Título:** "DIAGNÓSTICO" en 14pt, color #00a0df
- **Separador:** Línea azul horizontal
- **Contenido:** Texto libre en 11pt

#### 4. Tabla de Prescripción
- **Título:** "PRESCRIPCIÓN" en 14pt, color #00a0df
- **Columnas:** Medicamento (35%), Dosis (20%), Frecuencia (25%), Duración (20%)
- **Encabezado:** Fondo azul #00a0df, texto blanco en 12pt
- **Filas:** Alternar colores, bordes sutiles
- **Texto:** 11pt, color gris oscuro

#### 5. Indicaciones
- **Título:** "INDICACIONES" en 14pt, color #00a0df
- **Formato:** Lista con viñetas (•)
- **Espaciado:** Márgenes amplios, 6pt entre elementos

#### 6. Notas Adicionales
- **Título:** "NOTAS ADICIONALES" en 14pt, color #00a0df
- **Contenido:** Texto libre multilinea en 11pt

#### 7. Firma y Sello
- **Ubicación:** Inferior derecha
- **Recuadro:** 80x30px con borde gris
- **Etiqueta:** "Firma y Sello" en 10pt gris

#### 8. Pie de Página
- **Separador:** Línea azul horizontal
- **Contacto:** Teléfono, email, web en 9pt gris
- **QR Code:** Placeholder 15x15px para verificación
- **ID Documento:** Identificador único alineado a la derecha

### Especificaciones Técnicas

#### Colores (RGB)
- **Azul Principal:** rgb(0, 160, 223) - #00a0df
- **Azul Claro:** rgb(230, 246, 253) - #e6f6fd
- **Gris Oscuro:** rgb(51, 51, 51) - #333333
- **Gris Claro:** rgb(128, 128, 128) - #808080
- **Gris Borde:** rgb(200, 200, 200) - #c8c8c8

#### Tamaños de Fuente
- **Título Principal:** 24pt (Be My)
- **Título Sección:** 16pt (RECETA MÉDICA)
- **Subtítulos:** 14pt (secciones)
- **Encabezados Tabla:** 12pt
- **Cuerpo Tabla:** 11pt
- **Texto Normal:** 11pt
- **Tagline/Footer:** 10pt
- **Notas/ID:** 9pt

#### Espaciado
- **Entre secciones:** 20px
- **Dentro de bloques:** 8-10px
- **Margen interno:** 5px
- **Altura de fila tabla:** 15px

### Funcionalidades Implementadas

#### Generador PDF
- **Archivo:** `src/utils/prescriptionPDFGenerator.ts`
- **Librería:** jsPDF
- **Funciones principales:**
  - `generatePrescriptionPDF(data)` - Generador principal
  - `generateDemoPrescription()` - Ejemplo de prueba

#### Interfaz de Usuario
- **Componente:** `src/components/PrescriptionGenerator.tsx`
- **Página:** `src/pages/PrescriptionTest.tsx`
- **Ruta:** `/prescription-test`

#### Datos Requeridos
```typescript
interface PrescriptionData {
  doctor: {
    fullName: string;
    specialty: string;
    license: string;
  };
  patient: {
    fullName: string;
    age: number;
    date: string;
    consultationId?: string;
  };
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  diagnosis?: string;
  indications?: string[];
  additionalNotes?: string;
}
```

### Casos de Uso

#### 1. Consulta Médica Completa
- Médico llena formulario tras consulta
- Genera PDF con prescripción estructurada
- Paciente recibe receta profesional

#### 2. Receta Rápida
- Campos mínimos: médico, paciente, medicamentos
- Generación automática de fecha y ID
- Descarga inmediata

#### 3. Seguimiento de Tratamiento
- Incluye ID de consulta para verificación
- QR code para autenticidad
- Notas de seguimiento

### Beneficios del Diseño

#### Profesionalismo
- Diseño limpio y médico estándar
- Identidad visual BE MY consistente
- Cumple expectativas de recetas formales

#### Usabilidad
- Estructura clara y fácil lectura
- Información organizada lógicamente
- Espaciado adecuado para impresión

#### Escalabilidad
- Componente reutilizable
- Fácil integración con sistemas existentes
- Extensible para nuevos campos

### Próximos Pasos

#### Integraciones Futuras
- [ ] Conexión con perfiles de doctor
- [ ] Integración con consultas/citas
- [ ] Firma digital automática
- [ ] Almacenamiento en base de datos
- [ ] Envío por email al paciente

#### Mejoras de Diseño
- [ ] Logo real BE MY en alta resolución
- [ ] QR codes funcionales con verificación
- [ ] Plantillas personalizables por especialidad
- [ ] Múltiples idiomas

### Acceso a la Funcionalidad

**URL de Prueba:** [/prescription-test](/prescription-test)
**Enlace en Header:** Navegación principal → "Recetas"

La plantilla está completamente funcional y lista para integración en el sistema principal de BE MY.