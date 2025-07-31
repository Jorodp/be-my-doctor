import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSignedUrl = (bucket: string, path: string | null | undefined) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    // If the path is already a full URL, return it as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      setSignedUrl(path);
      setError(null);
      setLoading(false);
      return;
    }

    const getSignedUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try signed URL first
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (error) {
          console.error('Error creating signed URL:', error);
          // Fallback to public URL
          const publicUrl = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
          
          if (publicUrl.data?.publicUrl) {
            setSignedUrl(publicUrl.data.publicUrl);
            setError(null);
          } else {
            setError('Error al cargar la imagen');
            setSignedUrl(null);
          }
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError('Error al cargar la imagen');
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [bucket, path]);

  return { signedUrl, loading, error };
};