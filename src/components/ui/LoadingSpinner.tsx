import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = ({ 
  className, 
  size = "md", 
  text = "Cargando...",
  fullScreen = true
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  const containerClasses = fullScreen 
    ? "flex items-center justify-center min-h-screen"
    : "flex flex-col items-center justify-center p-8";

  return (
    <div className={containerClasses}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
      {text && (
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
};