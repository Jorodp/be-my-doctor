import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { User } from 'lucide-react';

interface ProfileAvatarProps {
  profileImageUrl?: string | null;
  fallbackName?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  role?: 'patient' | 'doctor' | 'assistant';
}

export const ProfileAvatar = ({ 
  profileImageUrl, 
  fallbackName, 
  className = "",
  size = "md",
  role = "patient"
}: ProfileAvatarProps) => {
  // Determine bucket based on role or URL pattern
  let bucket = 'patient-profiles';
  if (role === 'doctor' || profileImageUrl?.includes('doctor-profiles')) {
    bucket = 'doctor-profiles';
  }

  const { signedUrl } = useSignedUrl(bucket, profileImageUrl);

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-10 w-10"
  };

  const getFallbackContent = () => {
    if (fallbackName && fallbackName.trim()) {
      return fallbackName.charAt(0).toUpperCase();
    }
    return <User className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage src={signedUrl || undefined} />
      <AvatarFallback className="text-xs">
        {getFallbackContent()}
      </AvatarFallback>
    </Avatar>
  );
};