import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface DoctorImageProps {
  profileImageUrl?: string | null;
  doctorName?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-16 w-16', 
  lg: 'h-32 w-32',
  xl: 'h-64 w-64 md:h-80 md:w-80'
};

export const DoctorImage = ({ 
  profileImageUrl, 
  doctorName, 
  className,
  fallbackClassName,
  size = 'md'
}: DoctorImageProps) => {
  const { signedUrl, loading, error } = useSignedUrl('doctor-profiles', profileImageUrl);
  
  const getImageSrc = () => {
    if (!profileImageUrl) return undefined;
    
    // If it's already a full URL, use it directly
    if (profileImageUrl.startsWith('http')) {
      return profileImageUrl;
    }
    
    // Use signed URL for storage paths
    return signedUrl || undefined;
  };

  const imageSrc = getImageSrc();

  if (size === 'xl') {
    // Special handling for large profile images
    return (
      <div className={`${sizeClasses[size]} rounded-3xl overflow-hidden shadow-2xl ring-4 ring-background/50 ${className || ''}`}>
        {imageSrc && !loading ? (
          <img 
            src={imageSrc}
            alt={`Dr. ${doctorName}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* Fallback */}
        <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center ${imageSrc && !loading ? 'hidden' : ''}`}>
          <div className="text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-4xl font-bold text-primary">
                {doctorName?.charAt(0) || 'D'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ''}`}>
      <AvatarImage 
        src={imageSrc}
        alt={doctorName || 'Doctor'} 
      />
      <AvatarFallback className={`bg-orange-100 text-orange-700 ${fallbackClassName || ''}`}>
        {doctorName?.split(' ').map(n => n[0]).join('') || 'D'}
      </AvatarFallback>
    </Avatar>
  );
};