import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, Plus, Trash2, Edit3, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Question {
  id: string;
  text: string;
  type: 'short_text' | 'long_text' | 'multiple_choice' | 'date' | 'yes_no';
  options?: string[];
  required: boolean;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  is_active: boolean;
  created_at: string;
}

interface QuestionnaireManagerProps {
  doctorUserId: string;
}

export const DoctorQuestionnaireManager: React.FC<QuestionnaireManagerProps> = ({
  doctorUserId
}) => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<Questionnaire | null>(null);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: '',
    type: 'short_text',
    required: false,
    options: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchQuestionnaires();
  }, [doctorUserId]);

  const fetchQuestionnaires = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_questionnaires')
        .select('*')
        .eq('doctor_user_id', doctorUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestionnaires((data || []).map(item => ({
        ...item,
        questions: Array.isArray(item.questions) ? item.questions as unknown as Question[] : []
      })));
    } catch (error) {
      console.error('Error fetching questionnaires:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los cuestionarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewQuestionnaire = () => {
    setEditingQuestionnaire({
      id: 'new',
      title: '',
      description: '',
      questions: [],
      is_active: true,
      created_at: new Date().toISOString()
    });
  };

  const saveQuestionnaire = async () => {
    if (!editingQuestionnaire || !user) return;

    try {
      const questionnaireData = {
        doctor_user_id: doctorUserId,
        title: editingQuestionnaire.title,
        description: editingQuestionnaire.description,
        questions: editingQuestionnaire.questions as any,
        is_active: editingQuestionnaire.is_active
      };

      if (editingQuestionnaire.id === 'new') {
        const { error } = await supabase
          .from('doctor_questionnaires')
          .insert(questionnaireData);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('doctor_questionnaires')
          .update(questionnaireData)
          .eq('id', editingQuestionnaire.id);

        if (error) throw error;
      }

      toast({
        title: "Cuestionario guardado",
        description: "El cuestionario se ha guardado correctamente",
      });

      setEditingQuestionnaire(null);
      fetchQuestionnaires();
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cuestionario",
        variant: "destructive"
      });
    }
  };

  const deleteQuestionnaire = async (id: string) => {
    try {
      const { error } = await supabase
        .from('doctor_questionnaires')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Cuestionario eliminado",
        description: "El cuestionario se ha eliminado correctamente",
      });

      fetchQuestionnaires();
    } catch (error) {
      console.error('Error deleting questionnaire:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cuestionario",
        variant: "destructive"
      });
    }
  };

  const addQuestion = () => {
    if (!editingQuestionnaire || !newQuestion.text) return;

    const question: Question = {
      id: Date.now().toString(),
      text: newQuestion.text,
      type: newQuestion.type || 'short_text',
      required: newQuestion.required || false,
      options: newQuestion.type === 'multiple_choice' ? newQuestion.options : undefined
    };

    setEditingQuestionnaire({
      ...editingQuestionnaire,
      questions: [...editingQuestionnaire.questions, question]
    });

    setNewQuestion({
      text: '',
      type: 'short_text',
      required: false,
      options: []
    });
  };

  const removeQuestion = (questionId: string) => {
    if (!editingQuestionnaire) return;

    setEditingQuestionnaire({
      ...editingQuestionnaire,
      questions: editingQuestionnaire.questions.filter(q => q.id !== questionId)
    });
  };

  const getQuestionTypeLabel = (type: string) => {
    const types = {
      'short_text': 'Texto corto',
      'long_text': 'Texto largo',
      'multiple_choice': 'Opción múltiple',
      'date': 'Fecha',
      'yes_no': 'Sí/No'
    };
    return types[type as keyof typeof types] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Cargando cuestionarios...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Cuestionarios Previos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configura preguntas que tus pacientes contestarán antes de la consulta
            </p>
          </div>
          <Button onClick={createNewQuestionnaire} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Cuestionario
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Editing Form */}
        {editingQuestionnaire && (
          <Card className="border-primary">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {editingQuestionnaire.id === 'new' ? 'Nuevo Cuestionario' : 'Editando Cuestionario'}
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingQuestionnaire(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={saveQuestionnaire}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Título del cuestionario</label>
                  <Input
                    value={editingQuestionnaire.title}
                    onChange={(e) => setEditingQuestionnaire({
                      ...editingQuestionnaire,
                      title: e.target.value
                    })}
                    placeholder="Ej: Cuestionario previo a consulta general"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea
                    value={editingQuestionnaire.description}
                    onChange={(e) => setEditingQuestionnaire({
                      ...editingQuestionnaire,
                      description: e.target.value
                    })}
                    placeholder="Explica brevemente el propósito de este cuestionario"
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingQuestionnaire.is_active}
                    onCheckedChange={(checked) => setEditingQuestionnaire({
                      ...editingQuestionnaire,
                      is_active: checked
                    })}
                  />
                  <label className="text-sm">Cuestionario activo</label>
                </div>
              </div>

              <Separator />

              {/* Questions List */}
              <div className="space-y-3">
                <h4 className="font-medium">Preguntas ({editingQuestionnaire.questions.length})</h4>
                
                {editingQuestionnaire.questions.map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{index + 1}. {question.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{getQuestionTypeLabel(question.type)}</Badge>
                          {question.required && <Badge variant="secondary">Requerida</Badge>}
                        </div>
                        {question.options && question.options.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Opciones:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {question.options.map((option, optIndex) => (
                                <Badge key={optIndex} variant="outline" className="text-xs">
                                  {option}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Add Question Form */}
                <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
                  <h5 className="font-medium">Agregar nueva pregunta</h5>
                  
                  <div className="grid gap-3">
                    <Input
                      value={newQuestion.text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                      placeholder="Escribe tu pregunta aquí..."
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={newQuestion.type}
                        onValueChange={(value) => setNewQuestion({ ...newQuestion, type: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short_text">Texto corto</SelectItem>
                          <SelectItem value="long_text">Texto largo</SelectItem>
                          <SelectItem value="multiple_choice">Opción múltiple</SelectItem>
                          <SelectItem value="date">Fecha</SelectItem>
                          <SelectItem value="yes_no">Sí/No</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newQuestion.required}
                          onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, required: checked })}
                        />
                        <label className="text-sm">Requerida</label>
                      </div>
                    </div>

                    {newQuestion.type === 'multiple_choice' && (
                      <div>
                        <label className="text-sm font-medium">Opciones (separadas por comas)</label>
                        <Input
                          placeholder="Opción 1, Opción 2, Opción 3"
                          onChange={(e) => setNewQuestion({
                            ...newQuestion,
                            options: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt)
                          })}
                        />
                      </div>
                    )}
                    
                    <Button
                      onClick={addQuestion}
                      disabled={!newQuestion.text}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Pregunta
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Questionnaires */}
        {questionnaires.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No tienes cuestionarios</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primer cuestionario para recopilar información de tus pacientes antes de las consultas
            </p>
            <Button onClick={createNewQuestionnaire} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Primer Cuestionario
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {questionnaires.map((questionnaire) => (
              <Card key={questionnaire.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{questionnaire.title}</h4>
                        <Badge variant={questionnaire.is_active ? "default" : "secondary"}>
                          {questionnaire.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {questionnaire.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{questionnaire.questions.length} preguntas</span>
                        <span>Creado: {new Date(questionnaire.created_at).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingQuestionnaire(questionnaire)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteQuestionnaire(questionnaire.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
