import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface BackToHomeButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
}

export const BackToHomeButton = ({ className = "", variant = "ghost" }: BackToHomeButtonProps) => {
  return (
    <Link to="/">
      <Button 
        variant={variant}
        size="sm"
        className={`flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors ${className}`}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a inicio
      </Button>
    </Link>
  );
};