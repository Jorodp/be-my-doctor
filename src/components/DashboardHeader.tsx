import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onSignOut: () => void;
  children?: React.ReactNode;
}

export const DashboardHeader = ({ title, subtitle, onSignOut, children }: DashboardHeaderProps) => {
  const navigate = useNavigate();

  const handleGoToLanding = () => {
    navigate('/');
  };

  return (
    <header className="bg-background shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGoToLanding}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Ir a página principal</span>
            </Button>
            
            <Button variant="outline" onClick={onSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};