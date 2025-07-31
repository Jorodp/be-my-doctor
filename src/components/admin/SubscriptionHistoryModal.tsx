import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAdminProfileAPI } from '@/hooks/useAdminProfileAPI';
import { formatDateTimeInMexicoTZ, formatDateInMexicoTZ } from '@/utils/dateUtils';

interface SubscriptionHistory {
  doctor_profile_id: string;
  status: string;
  expires_at: string;
  admin_id: string;
  changed_at: string;
}

interface SubscriptionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorProfileId: string;
  doctorName: string;
}

export const SubscriptionHistoryModal = ({ 
  isOpen, 
  onClose, 
  doctorProfileId,
  doctorName 
}: SubscriptionHistoryModalProps) => {
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const { loading, getSubscriptionHistory } = useAdminProfileAPI();

  useEffect(() => {
    if (isOpen && doctorProfileId) {
      loadSubscriptionHistory();
    }
  }, [isOpen, doctorProfileId]);

  const loadSubscriptionHistory = async () => {
    try {
      const historyData = await getSubscriptionHistory(doctorProfileId);
      setHistory(historyData);
    } catch (error) {
      console.error('Error loading subscription history:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Activa</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactiva</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Historial de Suscripción - Dr. {doctorName}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha de Cambio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Expiración</TableHead>
                  <TableHead>Admin ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {formatDateTimeInMexicoTZ(item.changed_at)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      {item.expires_at ? formatDateInMexicoTZ(item.expires_at) : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.admin_id ? item.admin_id.slice(0, 8) + '...' : 'Sistema'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {history.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontró historial de suscripción para este doctor
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};