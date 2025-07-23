import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminEditDoctor } from '@/components/AdminEditDoctor';

export default function AdminDoctorDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Error</h1>
          <p className="text-muted-foreground">ID de doctor no encontrado</p>
          <Link to="/admin/doctores">
            <Button className="mt-4">Volver al listado</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/doctores">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Editar Doctor</h1>
          <p className="text-muted-foreground">
            Modifica la información del perfil del doctor
          </p>
        </div>
      </div>

      <AdminEditDoctor doctorId={id} />
    </div>
  );
}