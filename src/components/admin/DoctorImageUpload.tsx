import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, User } from "lucide-react";

interface DoctorImageUploadProps {
  doctorId: string;
  currentImageUrl?: string | null;
  onImageUpdated: () => void;
  disabled?: boolean;
}

export const DoctorImageUpload: React.FC<DoctorImageUploadProps> = ({
  doctorId,
  currentImageUrl,
  onImageUpdated,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    // Validar tipo de archivo
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      return "Solo se permiten archivos JPG y PNG";
    }

    // Validar tamaño (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return "La imagen no debe superar los 5MB";
    }

    return null;
  };

  const processImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Determinar el tamaño del recorte cuadrado
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        // Redimensionar a máximo 512x512 para optimizar
        const targetSize = Math.min(size, 512);
        canvas.width = targetSize;
        canvas.height = targetSize;

        if (ctx) {
          // Dibujar imagen recortada y redimensionada
          ctx.drawImage(img, x, y, size, size, 0, 0, targetSize, targetSize);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const processedFile = new File([blob], 'profile.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(processedFile);
            } else {
              reject(new Error('Error procesando la imagen'));
            }
          }, 'image/jpeg', 0.9);
        } else {
          reject(new Error('Error procesando la imagen'));
        }
      };

      img.onerror = () => reject(new Error('Error cargando la imagen'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar archivo
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Error de validación",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      
      // Verificar autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      console.log('Usuario autenticado:', session.user.id);
      console.log('Subiendo imagen para doctor:', doctorId);
      
      // Crear preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Procesar imagen
      const processedFile = await processImage(file);
      
      // Subir al bucket doctor-profiles
      const fileName = `${doctorId}/profile.jpg`;
      console.log('Nombre del archivo:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('doctor-profiles')
        .upload(fileName, processedFile, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Error de Supabase Storage:', uploadError);
        throw uploadError;
      }

      console.log('Imagen subida exitosamente a:', fileName);

      // Generar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('doctor-profiles')
        .getPublicUrl(fileName);

      console.log('URL pública generada:', publicUrl);

      // Actualizar perfil del médico en doctor_profiles con URL pública completa
      const imageUrl = `${publicUrl}?t=${Date.now()}`;
      
      const { error: updateDoctorError } = await supabase
        .from('doctor_profiles')
        .update({ 
          profile_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', doctorId);

      if (updateDoctorError) {
        console.error('Error actualizando doctor_profiles:', updateDoctorError);
        throw updateDoctorError;
      }
      
      // También actualizar la tabla profiles si existe
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ 
          profile_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', doctorId);

      if (updateProfileError) {
        console.warn('Error actualizando profiles (opcional):', updateProfileError);
      }

      console.log('Perfil actualizado correctamente');

      toast({
        title: "Foto actualizada",
        description: "La foto del médico ha sido procesada y guardada correctamente",
      });

      // Forzar re-fetch después de un pequeño delay para asegurar que la DB se actualice
      setTimeout(() => {
        onImageUpdated();
      }, 500);
      
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo subir la imagen",
        variant: "destructive"
      });
      setPreview(null);
    } finally {
      setUploading(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      setUploading(true);

      // Verificar autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      const fileName = `${doctorId}/profile.jpg`;

      if (currentImageUrl) {
        // Eliminar del storage
        console.log('Eliminando imagen:', fileName);
        const { error: deleteError } = await supabase.storage
          .from('doctor-profiles')
          .remove([fileName]);

        if (deleteError) {
          console.warn('Error deleting from storage:', deleteError);
        }
      }

      // Actualizar perfil del médico
      const { error: updateError } = await supabase
        .from('doctor_profiles')
        .update({ profile_image_url: null })
        .eq('user_id', doctorId);

      if (updateError) throw updateError;

      // También actualizar la tabla profiles
      await supabase
        .from('profiles')
        .update({ profile_image_url: null })
        .eq('user_id', doctorId);

      toast({
        title: "Foto eliminada",
        description: "La foto del médico ha sido eliminada",
      });

      setPreview(null);
      onImageUpdated();

    } catch (error: any) {
      console.error('Error removing image:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la imagen",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getCurrentImageUrl = () => {
    if (preview) return preview;
    if (currentImageUrl) {
      const { data } = supabase.storage
        .from('doctor-profiles')
        .getPublicUrl(currentImageUrl);
      return data.publicUrl;
    }
    return null;
  };

  const imageUrl = getCurrentImageUrl();

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center space-y-4">
        {/* Preview de la imagen */}
        <div className="relative w-32 h-32 rounded-full border-2 border-border overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Foto del médico"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Error loading image:', imageUrl);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <User className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          
          {/* Botón para eliminar imagen existente */}
          {(imageUrl && !preview) && (
            <button
              onClick={handleRemoveImage}
              disabled={uploading || disabled}
              className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Información del archivo */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Formatos: JPG, PNG</p>
          <p>Tamaño máximo: 5MB</p>
          <p className="text-xs">Se recortará automáticamente</p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading || disabled}
          />
          
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || disabled}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Procesando..." : currentImageUrl ? "Cambiar foto" : "Subir foto"}
          </Button>

          {preview && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={uploading}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};