import { SystemTester } from '@/components/SystemTester';
import { DashboardLayout } from '@/components/ui/DashboardLayout';

export const SystemTests = () => {
  return (
    <DashboardLayout
      title="Pruebas del Sistema"
      subtitle="Herramientas de diagnóstico y testing"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Pruebas del Sistema' }
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SystemTester />
      </div>
    </DashboardLayout>
  );
};

export default SystemTests;