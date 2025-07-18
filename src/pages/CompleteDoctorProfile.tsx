import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Upload, 
  X, 
  Plus, 
  Camera, 
  FileText, 
  MapPin, 
  DollarSign, 
  Star,
  ChevronLeft,
  ChevronRight,
  Save,
  Eye,
  Trash2
} from 'lucide-react';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';

// Esquema de validación con Zod
const doctorProfileSchema = z.object({
  // Información básica
  specialty: z.string().min(1, "La especialidad es requerida"),
  professional_license: z.string().min(1, "La cédula profesional es requerida"),
  years_experience: z.number().min(0).max(50),
  biography: z.string().min(50, "La biografía debe tener al menos 50 caracteres"),
  
  // URLs de documentos (se llenarán automáticamente al subir archivos)
  profile_image_url: z.string().optional(),
  university_degree_document_url: z.string().optional(),
  professional_license_document_url: z.string().optional(),
  additional_certifications_urls: z.array(z.string()).optional(),
  
  // Consultorios
  consultorios: z.array(z.object({
    name: z.string().min(1, "Nombre del consultorio requerido"),
    address: z.string().min(1, "Dirección requerida"),
    phone: z.string().optional(),
    consultation_fee: z.number().min(0, "El precio debe ser mayor a 0"),
    photo_url: z.string().optional(),
  })).min(1, "Debe agregar al menos un consultorio"),
  
  // Cuestionario para pacientes
  questionnaire: z.object({
    title: z.string().min(1, "Título del cuestionario requerido"),
    description: z.string().optional(),
    questions: z.array(z.object({
      id: z.string(),
      question: z.string().min(1, "La pregunta es requerida"),
      type: z.enum(['text', 'radio', 'checkbox']),
      options: z.array(z.string()).optional(),
      required: z.boolean(),
    })).min(1, "Debe agregar al menos una pregunta"),
  }),
});

type DoctorProfileForm = z.infer<typeof doctorProfileSchema>;

export const CompleteDoctorProfile = () => {
  const navigate = useNavigate();
  const { user, doctorProfile } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);

  const form = useForm<DoctorProfileForm>({
    resolver: zodResolver(doctorProfileSchema),
    defaultValues: {
      specialty: '',
      professional_license: '',
      years_experience: 0,
      biography: '',
      consultorios: [{ name: '', address: '', phone: '', consultation_fee: 0 }],
      questionnaire: {
        title: 'Cuestionario previo a la consulta',
        description: 'Por favor complete la siguiente información antes de su cita',
        questions: [],
      },
    },
  });

  const { fields: consultorioFields, append: appendConsultorio, remove: removeConsultorio } = useFieldArray({
    control: form.control,
    name: 'consultorios',
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: 'questionnaire.questions',
  });

  // Redirect if doctor already has a profile
  useEffect(() => {
    if (doctorProfile) {
      toast({
        title: "Perfil ya existe",
        description: "Tu perfil ya está creado. Solo un administrador puede modificarlo.",
      });
      navigate('/dashboard', { replace: true });
      return;
    }
    loadDoctorProfile();
    loadRatings();
  }, [doctorProfile, user]);

  const loadDoctorProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading doctor profile:', error);
        return;
      }

      if (data) {
        // Llenar el formulario con datos existentes
        form.reset({
          specialty: data.specialty || '',
          professional_license: data.professional_license || '',
          years_experience: data.years_experience || 0,
          biography: data.biography || '',
          profile_image_url: data.profile_image_url || '',
          university_degree_document_url: data.university_degree_document_url || '',
          professional_license_document_url: data.professional_license_document_url || '',
          additional_certifications_urls: data.additional_certifications_urls || [],
          consultorios: data.consultorios && Array.isArray(data.consultorios) && data.consultorios.length > 0 
            ? (data.consultorios as any[]).map((c: any) => ({
                name: c.name || '',
                address: c.address || '',
                phone: c.phone || '',
                consultation_fee: c.consultation_fee || 0,
                photo_url: c.photo_url || ''
              }))
            : [{ name: '', address: '', phone: '', consultation_fee: 0 }],
          questionnaire: {
            title: 'Cuestionario previo a la consulta',
            description: 'Por favor complete la siguiente información antes de su cita',
            questions: [],
          },
        });
      }
    } catch (error) {
      console.error('Error loading doctor profile:', error);
    }
  };

  const loadRatings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          *,
          profiles!ratings_patient_user_id_fkey(full_name)
        `)
        .eq('doctor_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading ratings:', error);
        return;
      }

      setRatings(data || []);
      
      if (data && data.length > 0) {
        const avg = data.reduce((sum, rating) => sum + rating.rating, 0) / data.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  // Función para subir archivos a Supabase Storage
  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      setUploadingFiles(prev => [...prev, filePath]);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setUploadingFiles(prev => prev.filter(path => path !== filePath));
      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadingFiles(prev => prev.filter(path => path.includes(file.name)));
      toast({
        title: "Error al subir archivo",
        description: `No se pudo subir ${file.name}`,
        variant: "destructive",
      });
      return null;
    }
  };

  // Validación de archivos
  const validateFile = (file: File, maxSize: number, allowedTypes: string[]) => {
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: `El archivo debe ser menor a ${maxSize / (1024 * 1024)}MB`,
        variant: "destructive",
      });
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo no válido",
        description: "Solo se permiten archivos JPG y PNG",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Validar dimensiones de imagen para foto de perfil
  const validateImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 400 || img.height < 400) {
          toast({
            title: "Imagen muy pequeña",
            description: "La imagen debe ser de al menos 400×400 píxeles",
            variant: "destructive",
          });
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  };

  // Manejador para foto de perfil
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file, 2 * 1024 * 1024, ['image/jpeg', 'image/png'])) return;
    
    const validDimensions = await validateImageDimensions(file);
    if (!validDimensions) return;

    const url = await uploadFile(file, 'doctor-profiles', 'profile-images');
    if (url) {
      form.setValue('profile_image_url', url);
      toast({
        title: "Foto de perfil actualizada",
        description: "La imagen se subió correctamente",
      });
    }
  };

  // Manejador para documentos universitarios
  const handleUniversityDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file, 5 * 1024 * 1024, ['image/jpeg', 'image/png'])) return;

    const url = await uploadFile(file, 'doctor-documents', 'university-degrees');
    if (url) {
      form.setValue('university_degree_document_url', url);
      toast({
        title: "Título universitario subido",
        description: "El documento se subió correctamente",
      });
    }
  };

  // Manejador para cédula profesional
  const handleProfessionalLicenseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file, 5 * 1024 * 1024, ['image/jpeg', 'image/png'])) return;

    const url = await uploadFile(file, 'doctor-documents', 'professional-licenses');
    if (url) {
      form.setValue('professional_license_document_url', url);
      toast({
        title: "Cédula profesional subida",
        description: "El documento se subió correctamente",
      });
    }
  };

  // Manejador para fotos de consultorio
  const handleConsultorioPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file, 5 * 1024 * 1024, ['image/jpeg', 'image/png'])) return;

    const url = await uploadFile(file, 'doctor-photos', 'consultorios');
    if (url) {
      form.setValue(`consultorios.${index}.photo_url`, url);
      toast({
        title: "Foto del consultorio subida",
        description: "La imagen se subió correctamente",
      });
    }
  };

  // Agregar nueva pregunta al cuestionario
  const addQuestion = (type: 'text' | 'radio' | 'checkbox') => {
    appendQuestion({
      id: `q_${Date.now()}`,
      question: '',
      type,
      options: type !== 'text' ? [''] : undefined,
      required: false,
    });
  };

  // Agregar opción a pregunta de tipo radio/checkbox
  const addOptionToQuestion = (questionIndex: number) => {
    const currentQuestion = form.getValues(`questionnaire.questions.${questionIndex}`);
    const newOptions = [...(currentQuestion.options || []), ''];
    form.setValue(`questionnaire.questions.${questionIndex}.options`, newOptions);
  };

  // Remover opción de pregunta
  const removeOptionFromQuestion = (questionIndex: number, optionIndex: number) => {
    const currentQuestion = form.getValues(`questionnaire.questions.${questionIndex}`);
    const newOptions = (currentQuestion.options || []).filter((_, i) => i !== optionIndex);
    form.setValue(`questionnaire.questions.${questionIndex}.options`, newOptions);
  };

  // Guardar perfil del doctor
  const onSubmit = async (data: DoctorProfileForm) => {
    if (!user) {
      toast({
        title: "Error de autenticación",
        description: "Debe estar autenticado para continuar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Preparar datos para el perfil del doctor
      const profileData = {
        user_id: user.id,
        specialty: data.specialty,
        professional_license: data.professional_license,
        years_experience: data.years_experience,
        biography: data.biography,
        profile_image_url: data.profile_image_url,
        university_degree_document_url: data.university_degree_document_url,
        professional_license_document_url: data.professional_license_document_url,
        additional_certifications_urls: data.additional_certifications_urls,
        consultorios: data.consultorios,
        consultation_fee: data.consultorios[0]?.consultation_fee || 0, // Usar el precio del primer consultorio como default
        verification_status: 'pending' as const,
        updated_at: new Date().toISOString(),
      };

      // Upsert del perfil del doctor
      const { error: profileError } = await supabase
        .from('doctor_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (profileError) {
        throw profileError;
      }

      // Guardar cuestionario si tiene preguntas
      if (data.questionnaire.questions.length > 0) {
        const questionnaireData = {
          doctor_user_id: user.id,
          title: data.questionnaire.title,
          description: data.questionnaire.description,
          questions: data.questionnaire.questions,
          is_active: true,
        };

        const { error: questionnaireError } = await supabase
          .from('doctor_questionnaires')
          .upsert(questionnaireData, { onConflict: 'doctor_user_id' });

        if (questionnaireError) {
          console.error('Error saving questionnaire:', questionnaireError);
        }
      }

      // Actualizar la imagen de perfil en la tabla profiles
      if (data.profile_image_url) {
        const { error: profileImageError } = await supabase
          .from('profiles')
          .update({ profile_image_url: data.profile_image_url })
          .eq('user_id', user.id);

        if (profileImageError) {
          console.error('Error updating profile image:', profileImageError);
        }
      }

      toast({
        title: "Perfil guardado exitosamente",
        description: "Su perfil de doctor ha sido actualizado y está pendiente de verificación",
      });

      // Redirigir al dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Error saving doctor profile:', error);
      toast({
        title: "Error al guardar",
        description: "Hubo un problema al guardar su perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getStepProgress = () => {
    return ((currentStep - 1) / 3) * 100;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso denegado</h1>
          <p className="text-muted-foreground mb-4">Debe estar autenticado para acceder a esta página</p>
          <Button onClick={() => navigate('/auth')}>Iniciar sesión</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      {/* Back to Home Button */}
      <div className="absolute top-4 left-4">
        <BackToHomeButton />
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header con progreso */}
        <div className="mb-8 mt-16">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/lovable-uploads/2176a5eb-dd8e-4ff9-8a38-3cfe98feb63a.png" alt="Be My Doctor" className="h-8 w-auto" />
              <h1 className="text-3xl font-bold">Completar Perfil de Doctor</h1>
            </div>
            <p className="text-muted-foreground">
              Complete su información profesional para comenzar a atender pacientes
            </p>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Paso {currentStep} de 4</span>
              <span>{Math.round(getStepProgress())}% completado</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>

          <div className="flex justify-center space-x-4 mb-6">
            {[
              { step: 1, title: "Información Básica" },
              { step: 2, title: "Documentos" },
              { step: 3, title: "Consultorios" },
              { step: 4, title: "Cuestionario & Reseñas" },
            ].map(({ step, title }) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step}
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:block">{title}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Paso 1: Información Básica */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Información Básica y Foto de Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Foto de perfil */}
                <div className="space-y-4">
                  <Label htmlFor="profile-image">Foto de Perfil Profesional</Label>
                  <div className="flex items-center gap-4">
                    {form.watch('profile_image_url') ? (
                      <img 
                        src={form.watch('profile_image_url')} 
                        alt="Foto de perfil" 
                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <Input
                        id="profile-image"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleProfileImageUpload}
                        className="mb-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Recomendamos foto con bata blanca sobre fondo blanco. Máximo 2MB, JPG/PNG, mínimo 400×400px
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Especialidad */}
                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidad Médica</Label>
                  <Input
                    id="specialty"
                    {...form.register('specialty')}
                    placeholder="Ej: Medicina General, Cardiología, Pediatría..."
                  />
                  {form.formState.errors.specialty && (
                    <p className="text-sm text-destructive">{form.formState.errors.specialty.message}</p>
                  )}
                </div>

                {/* Cédula profesional */}
                <div className="space-y-2">
                  <Label htmlFor="professional_license">Número de Cédula Profesional</Label>
                  <Input
                    id="professional_license"
                    {...form.register('professional_license')}
                    placeholder="Ingrese su número de cédula profesional"
                  />
                  {form.formState.errors.professional_license && (
                    <p className="text-sm text-destructive">{form.formState.errors.professional_license.message}</p>
                  )}
                </div>

                {/* Años de experiencia */}
                <div className="space-y-2">
                  <Label htmlFor="years_experience">Años de Experiencia</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    min="0"
                    max="50"
                    {...form.register('years_experience', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>

                {/* Biografía */}
                <div className="space-y-2">
                  <Label htmlFor="biography">Biografía Profesional</Label>
                  <Textarea
                    id="biography"
                    {...form.register('biography')}
                    placeholder="Escriba una breve descripción de su práctica médica, experiencia y enfoque de atención..."
                    rows={4}
                  />
                  {form.formState.errors.biography && (
                    <p className="text-sm text-destructive">{form.formState.errors.biography.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Mínimo 50 caracteres. Esta información será visible para los pacientes.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paso 2: Documentos */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documentos Profesionales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Título universitario */}
                <div className="space-y-4">
                  <Label htmlFor="university-degree">Título Universitario</Label>
                  <div className="space-y-2">
                    <Input
                      id="university-degree"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleUniversityDocumentUpload}
                    />
                    {form.watch('university_degree_document_url') && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">Documento subido correctamente</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(form.watch('university_degree_document_url'), '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Suba una foto clara de su título universitario. Máximo 5MB, JPG/PNG
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Cédula profesional documento */}
                <div className="space-y-4">
                  <Label htmlFor="professional-license-doc">Documento de Cédula Profesional</Label>
                  <div className="space-y-2">
                    <Input
                      id="professional-license-doc"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleProfessionalLicenseUpload}
                    />
                    {form.watch('professional_license_document_url') && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">Documento subido correctamente</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(form.watch('professional_license_document_url'), '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Suba una foto clara de su cédula profesional. Máximo 5MB, JPG/PNG
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Registro Nacional de Profesiones</h4>
                  <p className="text-sm text-blue-700">
                    Los documentos subidos serán verificados por nuestro equipo administrativo. 
                    Este proceso puede tomar entre 24-48 horas hábiles.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paso 3: Consultorios */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Consultorios y Precios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {consultorioFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Consultorio {index + 1}</h4>
                      {consultorioFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeConsultorio(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`consultorio-name-${index}`}>Nombre del Consultorio</Label>
                        <Input
                          id={`consultorio-name-${index}`}
                          {...form.register(`consultorios.${index}.name`)}
                          placeholder="Ej: Consultorio Médico Santa Fe"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`consultorio-phone-${index}`}>Teléfono (Opcional)</Label>
                        <Input
                          id={`consultorio-phone-${index}`}
                          {...form.register(`consultorios.${index}.phone`)}
                          placeholder="Ej: +52 55 1234 5678"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`consultorio-address-${index}`}>Dirección Completa</Label>
                      <Textarea
                        id={`consultorio-address-${index}`}
                        {...form.register(`consultorios.${index}.address`)}
                        placeholder="Calle, número, colonia, código postal, ciudad..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`consultorio-fee-${index}`}>Costo de Consulta (MXN)</Label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <Input
                          id={`consultorio-fee-${index}`}
                          type="number"
                          min="0"
                          step="50"
                          {...form.register(`consultorios.${index}.consultation_fee`, { valueAsNumber: true })}
                          placeholder="800"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`consultorio-photo-${index}`}>Foto del Consultorio</Label>
                      <Input
                        id={`consultorio-photo-${index}`}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => handleConsultorioPhotoUpload(e, index)}
                      />
                      {form.watch(`consultorios.${index}.photo_url`) && (
                        <img
                          src={form.watch(`consultorios.${index}.photo_url`)}
                          alt={`Consultorio ${index + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Suba una foto del consultorio. Máximo 5MB, JPG/PNG
                      </p>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendConsultorio({ name: '', address: '', phone: '', consultation_fee: 0 })}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Otro Consultorio
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Paso 4: Cuestionario y Reseñas */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Cuestionario */}
              <Card>
                <CardHeader>
                  <CardTitle>Pre-cuestionario para Pacientes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure las preguntas que los pacientes deben responder antes de su cita
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="questionnaire-title">Título del Cuestionario</Label>
                      <Input
                        id="questionnaire-title"
                        {...form.register('questionnaire.title')}
                        placeholder="Cuestionario previo a la consulta"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="questionnaire-description">Descripción (Opcional)</Label>
                      <Input
                        id="questionnaire-description"
                        {...form.register('questionnaire.description')}
                        placeholder="Instrucciones para el paciente..."
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Lista de preguntas */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Preguntas</h4>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('text')}>
                          Texto
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('radio')}>
                          Opción Única
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('checkbox')}>
                          Múltiple
                        </Button>
                      </div>
                    </div>

                    {questionFields.map((field, questionIndex) => (
                      <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-2">
                              <Badge variant="secondary">{field.type}</Badge>
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={form.watch(`questionnaire.questions.${questionIndex}.required`)}
                                  onCheckedChange={(checked) => 
                                    form.setValue(`questionnaire.questions.${questionIndex}.required`, checked as boolean)
                                  }
                                />
                                <Label className="text-sm">Requerida</Label>
                              </div>
                            </div>

                            <Input
                              {...form.register(`questionnaire.questions.${questionIndex}.question`)}
                              placeholder="Escriba su pregunta aquí..."
                            />

                            {/* Opciones para preguntas de radio/checkbox */}
                            {(field.type === 'radio' || field.type === 'checkbox') && (
                              <div className="space-y-2">
                                <Label className="text-sm">Opciones:</Label>
                                {form.watch(`questionnaire.questions.${questionIndex}.options`)?.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const currentOptions = form.watch(`questionnaire.questions.${questionIndex}.options`) || [];
                                        const newOptions = [...currentOptions];
                                        newOptions[optionIndex] = e.target.value;
                                        form.setValue(`questionnaire.questions.${questionIndex}.options`, newOptions);
                                      }}
                                      placeholder={`Opción ${optionIndex + 1}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeOptionFromQuestion(questionIndex, optionIndex)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addOptionToQuestion(questionIndex)}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Agregar Opción
                                </Button>
                              </div>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(questionIndex)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {questionFields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No hay preguntas agregadas</p>
                        <p className="text-sm">Use los botones de arriba para agregar preguntas</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reseñas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Reseñas y Calificaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ratings.length > 0 ? (
                    <div className="space-y-6">
                      {/* Calificación promedio */}
                      <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                        <div className="flex justify-center items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-6 h-6 ${
                                  star <= averageRating 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Basado en {ratings.length} reseña{ratings.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Lista de reseñas */}
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {ratings.slice(0, 5).map((rating) => (
                          <div key={rating.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{rating.profiles?.full_name || 'Paciente'}</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= rating.rating 
                                          ? 'fill-yellow-400 text-yellow-400' 
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(rating.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {rating.comment && (
                              <p className="text-sm text-muted-foreground">{rating.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Aún no tiene reseñas</p>
                      <p className="text-sm">Las reseñas aparecerán aquí después de sus primeras consultas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navegación */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>

            <div className="flex gap-2">
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading || uploadingFiles.length > 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Perfil
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Indicador de archivos subiendo */}
          {uploadingFiles.length > 0 && (
            <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Subiendo {uploadingFiles.length} archivo{uploadingFiles.length !== 1 ? 's' : ''}...</span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};