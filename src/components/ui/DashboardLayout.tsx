import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Home, LogOut, LayoutDashboard, ChevronRight, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatNotificationBadge } from '@/components/ChatNotificationBadge';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export const DashboardLayout = ({ children, title, subtitle, breadcrumbs = [] }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, signOut } = useAuth();

  const getDashboardRoute = () => {
    switch (userRole) {
      case 'admin':
        return '/admin';
      case 'doctor':
        return '/dashboard/doctor';
      case 'patient':
        return '/dashboard/patient';
      case 'assistant':
        return '/dashboard/assistant';
      default:
        return '/dashboard';
    }
  };

  const getDashboardLabel = () => {
    switch (userRole) {
      case 'admin':
        return 'Dashboard Admin';
      case 'doctor':
        return 'Dashboard Doctor';
      case 'patient':
        return 'Dashboard Paciente';
      case 'assistant':
        return 'Dashboard Asistente';
      default:
        return 'Dashboard';
    }
  };

  const handleGoToLanding = () => {
    navigate('/');
  };

  const handleGoToDashboard = () => {
    navigate(getDashboardRoute());
  };

  const NavigationButtons = () => (
    <div className="flex items-center gap-3">
      <ChatNotificationBadge />
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleGoToDashboard}
        className="flex items-center gap-2"
      >
        <LayoutDashboard className="h-4 w-4" />
        <span className="hidden md:inline">Dashboard</span>
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleGoToLanding}
        className="flex items-center gap-2"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Inicio</span>
      </Button>
      
      <Button variant="outline" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Cerrar Sesión</span>
      </Button>
    </div>
  );

  const allBreadcrumbs = [
    {
      label: getDashboardLabel(),
      href: getDashboardRoute()
    },
    ...breadcrumbs
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="bg-background shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{title}</h1>
                  {subtitle && (
                    <p className="text-sm md:text-base text-muted-foreground mt-1">{subtitle}</p>
                  )}
                </div>
                
                {/* Desktop Navigation */}
                <div className="hidden md:flex">
                  <NavigationButtons />
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <div className="flex flex-col gap-4 pt-6">
                        <Button 
                          variant="outline" 
                          onClick={handleGoToDashboard}
                          className="flex items-center gap-2 justify-start"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={handleGoToLanding}
                          className="flex items-center gap-2 justify-start"
                        >
                          <Home className="h-4 w-4" />
                          Ir a página principal
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={signOut}
                          className="flex items-center gap-2 justify-start"
                        >
                          <LogOut className="h-4 w-4" />
                          Cerrar Sesión
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              {/* Breadcrumbs */}
              {allBreadcrumbs.length > 1 && (
                <div className="mt-4">
                  <Breadcrumb>
                    <BreadcrumbList>
                      {allBreadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                          <BreadcrumbItem>
                            {crumb.href && index < allBreadcrumbs.length - 1 ? (
                              <BreadcrumbLink 
                                onClick={() => navigate(crumb.href!)}
                                className="cursor-pointer hover:text-primary"
                              >
                                {crumb.label}
                              </BreadcrumbLink>
                            ) : (
                              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            )}
                          </BreadcrumbItem>
                          {index < allBreadcrumbs.length - 1 && <BreadcrumbSeparator />}
                        </React.Fragment>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};