import { MessageCircle } from 'lucide-react';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Badge } from '@/components/ui/badge';

export const ChatNotificationBadge = () => {
  const { unreadCount } = useUnreadMessages();

  if (unreadCount === 0) return null;

  return (
    <div className="relative">
      <MessageCircle className="h-5 w-5 text-muted-foreground" />
      <Badge 
        variant="destructive" 
        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs min-w-5"
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </Badge>
    </div>
  );
};