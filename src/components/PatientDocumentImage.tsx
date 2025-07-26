import { useSignedUrl } from '@/hooks/useSignedUrl';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PatientDocumentImageProps {
  documentUrl: string | null | undefined;
  alt: string;
  className?: string;
}

export const PatientDocumentImage = ({ documentUrl, alt, className }: PatientDocumentImageProps) => {
  // Determinar el bucket basado en el path
  const getBucketFromPath = (path: string): string => {
    if (path.includes('/id_') || path.includes('identification')) {
      return 'patient-documents';
    }
    if (path.includes('/profile_') || path.includes('profile')) {
      return 'patient-profiles';
    }
    // Fallback para imágenes en otros buckets existentes
    return 'patient-profiles';
  };

  const bucket = documentUrl ? getBucketFromPath(documentUrl) : '';
  
  const { signedUrl, loading, error } = useSignedUrl(bucket, documentUrl);

  if (!documentUrl) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No se ha subido {alt.toLowerCase()}
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-4 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando imagen...</p>
        </div>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar {alt.toLowerCase()}: {error || 'URL no válida'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <img 
        src={signedUrl} 
        alt={alt} 
        className={className || "w-full max-h-64 object-contain rounded"}
        onError={(e) => {
          console.error('Error loading image:', documentUrl);
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement?.classList.add('error');
        }}
      />
    </div>
  );
};