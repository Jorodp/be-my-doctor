import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileText, 
  Camera, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Eye,
  Plus,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DoctorDocumentManagerProps {
  doctorProfile: any;
  onProfileUpdate: () => void;
  isAdminView?: boolean;
}

interface DocumentField {
  key: string;
  label: string;
  description: string;
  required: boolean;
  accepts: string;
  multiple?: boolean;
}

interface QuestionnaireQuestion {
  [key: string]: any;
  id: string;
  question: string;
  type: 'text' | 'select' | 'textarea' | 'number';
  options?: string[];
  required: boolean;
}

const requiredDocuments: DocumentField[] = [
  {
    key: 'university_degree_document_url',
    label: 'Título Universitario',
    description: 'Foto del diploma de medicina debidamente sellado',
    required: true,
    accepts: 'image/*,.pdf'
  },
  {
    key: 'professional_license_document_url',
    label: 'Cédula Profesional Principal',
    description: 'Cédula profesional principal de medicina',
    required: true,
    accepts: 'image/*,.pdf'
  },
  {
    key: 'additional_certifications_urls',
    label: 'Cédulas Adicionales/Especialidades',
    description: 'Cédulas de especialidades, subespecialidades, etc.',
    required: false,
    accepts: 'image/*,.pdf',
    multiple: true
  },
  {
    key: 'identification_document_url',
    label: 'Registro Nacional de Profesiones',
    description: 'Captura o imagen del registro con verificación oficial',
    required: true,
    accepts: 'image/*,.pdf'
  }
];

const defaultQuestionnaire: QuestionnaireQuestion[] = [
  {
    id: '1',
    question: '¿Cuál es el motivo principal de su consulta?',
    type: 'textarea',
    required: true
  },
  {
    id: '2',
    question: '¿Tiene algún padecimiento crónico?',
    type: 'select',
    options: ['No', 'Diabetes', 'Hipertensión', 'Otro'],
    required: true
  },
  {
    id: '3',
    question: '¿Está tomando algún medicamento actualmente?',
    type: 'textarea',
    required: false
  },
  {
    id: '4',
    question: '¿Tiene alergias conocidas?',
    type: 'textarea',
    required: false
  }
];

export const DoctorDocumentManager: React.FC<DoctorDocumentManagerProps> = ({ 
  doctorProfile, 
  onProfileUpdate,
  isAdminView = true
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireQuestion[]>(defaultQuestionnaire);
  const [questionnaireTitle, setQuestionnaireTitle] = useState('Cuestionario Pre-Consulta');

  useEffect(() => {
    // Load existing questionnaire from database if exists
    loadQuestionnaire();
  }, [doctorProfile]);

  const loadQuestionnaire = async () => {
    if (!doctorProfile?.user_id) return;

    try {
      const { data, error } = await supabase
        .from('doctor_questionnaires')
        .select('*')
        .eq('doctor_user_id', doctorProfile.user_id)
        .eq('is_active', true)
        .single();

      if (data && !error) {
        setQuestionnaireTitle(data.title);
        setQuestionnaire((data.questions as QuestionnaireQuestion[]) || defaultQuestionnaire);
      }
    } catch (error) {
      console.log('No existing questionnaire found, using default');
    }
  };

  const uploadDocument = async (file: File, documentKey: string, isMultiple = false): Promise<string> => {
    if (!isAdminView) {
      throw new Error('Solo los administradores pueden subir documentos');
    }

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `doctors/${doctorProfile.user_id}/documentos/${documentKey}_${timestamp}.${fileExt}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('doctor-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    if (isMultiple) {
      // Handle multiple files (like additional certifications)
      const currentUrls = doctorProfile[documentKey] || [];
      const updatedUrls = [...currentUrls, fileName];
      
      const { error: updateError } = await supabase
        .from('doctor_profiles')
        .update({ [documentKey]: updatedUrls })
        .eq('user_id', doctorProfile.user_id);

      if (updateError) throw updateError;
    } else {
      // Handle single file
      const { error: updateError } = await supabase
        .from('doctor_profiles')
        .update({ [documentKey]: fileName })
        .eq('user_id', doctorProfile.user_id);

      if (updateError) throw updateError;
    }

    return fileName;
  };

  const handleUpload = async (file: File, documentKey: string, isMultiple = false) => {
    setUploading(documentKey);
    try {
      await uploadDocument(file, documentKey, isMultiple);
      toast({
        title: "Documento subido",
        description: "El documento se ha subido correctamente",
      });
      onProfileUpdate();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo subir el documento",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const handleFileInputChange = (documentKey: string, isMultiple = false) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file, documentKey, isMultiple);
    }
  };

  const getDocumentUrl = (fileName: string) => {
    return `https://rvsoeuwlgnovcmemlmqz.supabase.co/storage/v1/object/public/doctor-documents/${fileName}`;
  };

  const hasDocument = (documentKey: string): boolean => {
    const value = doctorProfile?.[documentKey];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  };

  const getCompletionPercentage = (): number => {
    const totalRequired = requiredDocuments.filter(field => field.required).length;
    const completedRequired = requiredDocuments
      .filter(field => field.required)
      .filter(field => hasDocument(field.key)).length;
    return Math.round((completedRequired / totalRequired) * 100);
  };

  const isProfileComplete = (): boolean => {
    return requiredDocuments
      .filter(field => field.required)
      .every(field => hasDocument(field.key));
  };

  const saveQuestionnaire = async () => {
    if (!isAdminView) {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden modificar cuestionarios",
        variant: "destructive"
      });
      return;
    }

    try {
      // First, deactivate existing questionnaires
      await supabase
        .from('doctor_questionnaires')
        .update({ is_active: false })
        .eq('doctor_user_id', doctorProfile.user_id);

      // Create new questionnaire
      const { error } = await supabase
        .from('doctor_questionnaires')
        .insert({
          doctor_user_id: doctorProfile.user_id,
          title: questionnaireTitle,
          questions: questionnaire as any,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Cuestionario guardado",
        description: "El cuestionario ha sido guardado correctamente",
      });
    } catch (error: any) {
      console.error('Error saving questionnaire:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cuestionario",
        variant: "destructive"
      });
    }
  };

  const addQuestion = () => {
    const newQuestion: QuestionnaireQuestion = {
      id: Date.now().toString(),
      question: '',
      type: 'text',
      required: false
    };
    setQuestionnaire([...questionnaire, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<QuestionnaireQuestion>) => {
    setQuestionnaire(questionnaire.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestionnaire(questionnaire.filter(q => q.id !== id));
  };

  const downloadQuestionnaire = () => {
    const content = `# ${questionnaireTitle}\n\n${questionnaire.map((q, i) => 
      `${i + 1}. ${q.question} ${q.required ? '(Obligatorio)' : ''}\n   Tipo: ${q.type}\n${q.options ? `   Opciones: ${q.options.join(', ')}\n` : ''}\n`
    ).join('')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuestionario-${doctorProfile.user_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completionPercentage = getCompletionPercentage();
  const profileComplete = isProfileComplete();

  if (!isAdminView) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Solo los administradores pueden gestionar los documentos legales y médicos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Documentos Legales y Médicos
            <div className="flex items-center gap-2">
              <Badge variant={profileComplete ? "default" : "secondary"}>
                {completionPercentage}% Completado
              </Badge>
              {profileComplete && <CheckCircle className="h-5 w-5 text-green-600" />}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="mb-4" />
          {!profileComplete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El perfil no puede ser marcado como "verificado" hasta que todos los documentos requeridos estén subidos.
                Estado actual: <strong>{doctorProfile?.verification_status || 'Pendiente'}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Required Documents */}
      <div className="grid gap-4 md:grid-cols-2">
        {requiredDocuments.map((field) => (
          <Card key={field.key} className={hasDocument(field.key) ? 'border-green-200 bg-green-50/30' : 'border-orange-200'}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                {field.label}
                <div className="flex items-center gap-2">
                  {field.required && <Badge variant="destructive">Requerido</Badge>}
                  {hasDocument(field.key) && <CheckCircle className="h-5 w-5 text-green-600" />}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{field.description}</p>
              
              {/* Display existing documents */}
              {hasDocument(field.key) && (
                <div className="space-y-2">
                  {Array.isArray(doctorProfile[field.key]) ? (
                    doctorProfile[field.key].map((fileName: string, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm truncate">{fileName.split('/').pop()}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(getDocumentUrl(fileName), '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm truncate">{doctorProfile[field.key]?.split('/').pop()}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(getDocumentUrl(doctorProfile[field.key]), '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Upload controls */}
              <div className="flex gap-2">
                <Label htmlFor={`upload-${field.key}`} className="cursor-pointer flex-1">
                  <Button
                    variant={hasDocument(field.key) ? "outline" : "default"}
                    className="w-full"
                    disabled={uploading === field.key}
                    asChild
                  >
                    <span>
                      {uploading === field.key ? (
                        <>Subiendo...</>
                      ) : field.multiple ? (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar {field.label}
                        </>
                      ) : hasDocument(field.key) ? (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Reemplazar
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Subir {field.label}
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
                <Input
                  id={`upload-${field.key}`}
                  type="file"
                  accept={field.accepts}
                  className="hidden"
                  onChange={handleFileInputChange(field.key, field.multiple)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Medical Questionnaire Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Cuestionario Médico Pre-Consulta
            <div className="flex gap-2">
              <Button onClick={downloadQuestionnaire} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="questionnaire-title">Título del Cuestionario</Label>
            <Input
              id="questionnaire-title"
              value={questionnaireTitle}
              onChange={(e) => setQuestionnaireTitle(e.target.value)}
              placeholder="Título del cuestionario"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium">Preguntas</h4>
              <Button onClick={addQuestion} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Pregunta
              </Button>
            </div>

            {questionnaire.map((question, index) => (
              <Card key={question.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Pregunta {index + 1}
                    </span>
                    <Button
                      onClick={() => removeQuestion(question.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Pregunta</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                        placeholder="Escriba la pregunta..."
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo de respuesta</Label>
                        <select
                          value={question.type}
                          onChange={(e) => updateQuestion(question.id, { type: e.target.value as any })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="text">Texto corto</option>
                          <option value="textarea">Texto largo</option>
                          <option value="select">Selección múltiple</option>
                          <option value="number">Número</option>
                        </select>
                      </div>

                      {question.type === 'select' && (
                        <div className="space-y-2">
                          <Label>Opciones (separadas por coma)</Label>
                          <Input
                            value={question.options?.join(', ') || ''}
                            onChange={(e) => updateQuestion(question.id, { 
                              options: e.target.value.split(',').map(o => o.trim()).filter(o => o) 
                            })}
                            placeholder="Opción 1, Opción 2, Opción 3"
                          />
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`required-${question.id}`}
                          checked={question.required}
                          onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                        />
                        <Label htmlFor={`required-${question.id}`}>Pregunta obligatoria</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Button onClick={saveQuestionnaire} className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Guardar Cuestionario
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};