import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface DoctorImageProps {
  profileImageUrl?: string | null;
  doctorName: string;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'card';
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12", 
  lg: "w-16 h-16",
  xl: "w-40 h-40 border-6 border-white shadow-2xl ring-4 ring-primary/20",
  card: "w-32 h-32"
};

export const DoctorImage = ({ 
  profileImageUrl, 
  doctorName, 
  className = "",
  fallbackClassName = "",
  size = 'md' 
}: DoctorImageProps) => {
  
  const getImageSrc = (): string => {
    if (!profileImageUrl) return '';
    
    // Si ya es una URL completa, usarla directamente
    if (profileImageUrl.startsWith('http')) {
      return `${profileImageUrl}?t=${Date.now()}`;
    }
    
    // Si es una ruta de Supabase storage, construir la URL
    if (profileImageUrl.includes('/')) {
      const supabaseUrl = "https://rvsoeuwlgnovcmemlmqz.supabase.co";
      return `${supabaseUrl}/storage/v1/object/public/doctor-images/${profileImageUrl}?t=${Date.now()}`;
    }
    
    return '';
  };

  const imageSrc = getImageSrc();

  // Para tamaños especiales, usar div personalizado
  if (size === 'xl' || size === 'card') {
    return (
      <div className={`relative ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-primary/10 flex items-center justify-center`}>
          {imageSrc && !profileImageUrl?.includes('example.com') ? (
            <img 
              src={imageSrc}
              alt={doctorName}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('❌ Error loading doctor image:', imageSrc);
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                // Mostrar fallback
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`w-full h-full bg-primary text-primary-foreground ${size === 'xl' ? 'text-4xl' : 'text-2xl'} flex items-center justify-center ${imageSrc && !profileImageUrl?.includes('example.com') ? 'hidden' : ''}`}
            style={{ display: imageSrc && !profileImageUrl?.includes('example.com') ? 'none' : 'flex' }}
          >
            <User className={size === 'xl' ? "w-20 h-20" : "w-12 h-12"} />
          </div>
        </div>
        {size === 'xl' && (
          <div className="absolute -bottom-3 -right-3 bg-green-500 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
        )}
      </div>
    );
  }

  // Para tamaños estándar, usar Avatar de shadcn
  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {imageSrc && !profileImageUrl?.includes('example.com') ? (
        <AvatarImage 
          src={imageSrc}
          alt={doctorName}
          className="object-cover w-full h-full"
          onError={() => {
            console.log('❌ Error loading avatar image:', imageSrc);
          }}
        />
      ) : null}
      <AvatarFallback className={`bg-primary text-primary-foreground ${fallbackClassName}`}>
        {doctorName?.slice(0, 2)?.toUpperCase() || (
          <User className={size === 'sm' ? "w-4 h-4" : size === 'md' ? "w-6 h-6" : "w-8 h-8"} />
        )}
      </AvatarFallback>
    </Avatar>
  );
};