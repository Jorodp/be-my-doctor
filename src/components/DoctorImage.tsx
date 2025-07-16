import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

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
  const getImageSrc = () => {
    if (!profileImageUrl) {
      console.log('DoctorImage: No profile image URL provided, using placeholder');
      return '/placeholder-doctor.png';
    }
    
    // If it's already a full URL, use it directly
    if (profileImageUrl.startsWith('http')) {
      console.log('DoctorImage: Using full URL:', profileImageUrl);
      return profileImageUrl;
    }
    
    // For storage paths, use public URL from doctor-profiles bucket
    const { data: { publicUrl } } = supabase
      .storage
      .from('doctor-profiles')
      .getPublicUrl(profileImageUrl);
    
    console.log('DoctorImage profile_image_url:', profileImageUrl);
    console.log('DoctorImage publicUrl:', publicUrl);
    
    return publicUrl;
  };

  const imageSrc = getImageSrc();

  if (size === 'xl') {
    // Special handling for large profile images
    return (
      <div className={`${sizeClasses[size]} rounded-3xl overflow-hidden shadow-2xl ring-4 ring-background/50 ${className || ''}`}>
        <img 
          src={imageSrc}
          alt={`Dr. ${doctorName}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.log('DoctorImage: Error loading image, using placeholder:', imageSrc);
            e.currentTarget.src = '/placeholder-doctor.png';
          }}
        />
      </div>
    );
  }

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ''}`}>
      <AvatarImage 
        src={imageSrc}
        alt={doctorName || 'Doctor'}
        onError={() => {
          console.log('DoctorImage Avatar: Error loading image, fallback will show:', imageSrc);
        }}
      />
      <AvatarFallback className={`bg-orange-100 text-orange-700 ${fallbackClassName || ''}`}>
        <img 
          src="/placeholder-doctor.png" 
          alt="Doctor placeholder"
          className="w-full h-full object-cover rounded-full"
          onError={() => {
            // Final fallback to initials if placeholder also fails
            const initials = doctorName?.split(' ').map(n => n[0]).join('') || 'D';
            const target = document.querySelector(`[alt="${doctorName || 'Doctor'}"]`)?.parentElement?.querySelector('.fallback-initials');
            if (target) target.textContent = initials;
          }}
        />
        <span className="fallback-initials absolute inset-0 flex items-center justify-center text-sm font-semibold opacity-0">
          {doctorName?.split(' ').map(n => n[0]).join('') || 'D'}
        </span>
      </AvatarFallback>
    </Avatar>
  );
};