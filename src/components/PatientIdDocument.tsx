import React from 'react';
import { FileText } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface PatientIdDocumentProps {
  idDocumentUrl?: string;
  patientUserId: string;
  compact?: boolean;
  showTitle?: boolean;
}

export function PatientIdDocument({ 
  idDocumentUrl, 
  patientUserId, 
  compact = false, 
  showTitle = true 
}: PatientIdDocumentProps) {
  // Extract the path from the full URL if it's a full URL, otherwise use as is
  const extractPath = (url: string | undefined) => {
    if (!url) return null;
    
    // If it's already a path (starts with patientUserId), use it as is
    if (url.startsWith(patientUserId)) {
      return url;
    }
    
    // If it's a full URL, extract the path
    if (url.includes('/storage/v1/object/public/')) {
      const urlParts = url.split('/storage/v1/object/public/patient-documents/');
      return urlParts[1] || null;
    }
    
    // If it's another type of URL, try to extract the filename and create the path
    const filename = url.split('/').pop();
    return filename ? `${patientUserId}/${filename}` : null;
  };

  const documentPath = extractPath(idDocumentUrl);
  const { signedUrl, loading, error } = useSignedUrl('patient-documents', documentPath);

  const containerClass = compact 
    ? "w-full h-full flex items-center justify-center border rounded" 
    : "border rounded p-2 h-32 flex items-center justify-center";

  return (
    <div className={compact ? "" : "space-y-2"}>
      {showTitle && (
        <h4 className="font-medium text-sm">Identificación</h4>
      )}
      <div className={containerClass}>
        {loading ? (
          <div className="animate-pulse">
            <div className={compact ? "h-12 w-16 bg-muted rounded" : "h-16 w-20 bg-muted rounded"}></div>
          </div>
        ) : error ? (
          <div className="text-center">
            <FileText className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} text-red-500 mx-auto mb-1`} />
            <p className="text-xs text-red-500">{error}</p>
          </div>
        ) : signedUrl ? (
          <img 
            src={signedUrl}
            alt="Documento de identidad"
            className="max-h-full max-w-full object-cover rounded"
          />
        ) : (
          <div className="text-center">
            <FileText className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} text-muted-foreground mx-auto mb-1`} />
            {!compact && <p className="text-xs text-muted-foreground">Sin documento</p>}
          </div>
        )}
      </div>
    </div>
  );
}