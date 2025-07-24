import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Save, 
  Clock,
  Stethoscope,
  Calendar as CalendarIcon,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface ConsultationNotesFormProps {
  appointmentId: string;
  patientName: string;
  onSave?: () => void;
}

interface ConsultationNotes {
  diagnosis: string;
  prescription: string;
  recommendations: string;
  follow_up_date: string;
}

export const ConsultationNotesForm: React.FC<ConsultationNotesFormProps> = ({
  appointmentId,
  patientName,
  onSave
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [notes, setNotes] = useState<ConsultationNotes>({
    diagnosis: '',
    prescription: '',
    recommendations: '',
    follow_up_date: ''
  });

  // Load existing notes if they exist
  useEffect(() => {
    loadExistingNotes();
  }, [appointmentId]);

  const loadExistingNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('consultation_notes')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setNotes({
          diagnosis: data.diagnosis || '',
          prescription: data.prescription || '',
          recommendations: data.recommendations || '',
          follow_up_date: data.follow_up_date || ''
        });
        setLastSaved(new Date(data.updated_at));
      }
    } catch (error) {
      console.error('Error loading consultation notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!user) return;

    try {
      setSaving(true);
      
      // Check if notes already exist
      const { data: existingNotes, error: checkError } = await supabase
        .from('consultation_notes')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      const noteData: any = {
        appointment_id: appointmentId,
        doctor_user_id: user.id,
        diagnosis: notes.diagnosis.trim() || null,
        prescription: notes.prescription.trim() || null,
        recommendations: notes.recommendations.trim() || null,
        follow_up_date: notes.follow_up_date || null,
      };

      let error;
      if (existingNotes) {
        // Update existing notes
        const { error: updateError } = await supabase
          .from('consultation_notes')
          .update(noteData)
          .eq('id', existingNotes.id);
        error = updateError;
      } else {
        // Create new notes
        const { data: appointmentData } = await supabase
          .from('appointments')
          .select('patient_user_id')
          .eq('id', appointmentId)
          .single();

        if (appointmentData) {
          noteData.patient_user_id = appointmentData.patient_user_id;
        }

        const { error: insertError } = await supabase
          .from('consultation_notes')
          .insert(noteData);
        error = insertError;
      }

      if (error) throw error;

      setLastSaved(new Date());
      toast({
        title: "Notas guardadas",
        description: "Las notas de la consulta se han guardado correctamente",
      });

      onSave?.();
    } catch (error) {
      console.error('Error saving consultation notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las notas de la consulta",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = () => {
    return notes.diagnosis || notes.prescription || notes.recommendations || notes.follow_up_date;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notas de Consulta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notas de Consulta - {patientName}
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Guardado {format(lastSaved, 'HH:mm', { locale: es })}
              </Badge>
            )}
            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
              <Stethoscope className="h-3 w-3 mr-1" />
              En consulta
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Completa la información médica de la consulta
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Diagnosis */}
        <div className="space-y-2">
          <Label htmlFor="diagnosis" className="text-sm font-medium">
            Diagnóstico *
          </Label>
          <Textarea
            id="diagnosis"
            placeholder="Describe el diagnóstico del paciente..."
            value={notes.diagnosis}
            onChange={(e) => setNotes(prev => ({ ...prev, diagnosis: e.target.value }))}
            className="min-h-24"
          />
        </div>

        {/* Prescription */}
        <div className="space-y-2">
          <Label htmlFor="prescription" className="text-sm font-medium">
            Prescripción médica
          </Label>
          <Textarea
            id="prescription"
            placeholder="Medicamentos, dosis e indicaciones..."
            value={notes.prescription}
            onChange={(e) => setNotes(prev => ({ ...prev, prescription: e.target.value }))}
            className="min-h-24"
          />
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <Label htmlFor="recommendations" className="text-sm font-medium">
            Recomendaciones y cuidados
          </Label>
          <Textarea
            id="recommendations"
            placeholder="Cuidados, recomendaciones de estilo de vida, estudios adicionales..."
            value={notes.recommendations}
            onChange={(e) => setNotes(prev => ({ ...prev, recommendations: e.target.value }))}
            className="min-h-24"
          />
        </div>

        {/* Follow-up date */}
        <div className="space-y-2">
          <Label htmlFor="followUp" className="text-sm font-medium">
            Fecha de seguimiento
          </Label>
          <Input
            id="followUp"
            type="date"
            value={notes.follow_up_date}
            onChange={(e) => setNotes(prev => ({ ...prev, follow_up_date: e.target.value }))}
            className="w-full"
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {hasUnsavedChanges() && (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Hay cambios sin guardar
              </>
            )}
          </div>
          
          <Button 
            onClick={saveNotes}
            disabled={saving || !hasUnsavedChanges()}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar notas'}
          </Button>
        </div>

        {/* Auto-save info */}
        <div className="text-xs text-muted-foreground">
          💡 Tip: Guarda periódicamente las notas durante la consulta para no perder información
        </div>
      </CardContent>
    </Card>
  );
};