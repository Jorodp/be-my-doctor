import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { lazyWithRetry } from '@/utils/performanceUtils';

// Lazy loading básico para componentes pesados
export const LazyDoctorDashboard = lazy(() => import('@/components/dashboard/DoctorDashboard').then(module => ({ default: module.DoctorDashboard })));
export const LazyPatientDashboard = lazy(() => import('@/components/dashboard/PatientDashboard').then(module => ({ default: module.PatientDashboard })));
export const LazyAdminDashboard = lazy(() => import('@/components/dashboard/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
export const LazyAssistantDashboard = lazy(() => import('@/components/dashboard/AssistantDashboard').then(module => ({ default: module.AssistantDashboard })));
export const LazySystemTester = lazy(() => import('@/components/SystemTester').then(module => ({ default: module.SystemTester })));
export const LazyDoctorSearch = lazy(() => import('@/pages/DoctorSearch'));
export const LazyBookAppointment = lazy(() => import('@/pages/BookAppointment'));

// Wrapper con Suspense para facilitar uso
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyWrapper = ({ children, fallback }: LazyWrapperProps) => (
  <Suspense 
    fallback={
      fallback || (
        <LoadingSpinner 
          size="lg" 
          text="Cargando componente..." 
          fullScreen={true}
        />
      )
    }
  >
    {children}
  </Suspense>
);