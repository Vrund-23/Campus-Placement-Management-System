import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Check, Clock, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Notification {
  notification_id: number;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationHub() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.get('/notifications');
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(prev => 
        prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark notification as read', variant: 'destructive' });
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({ title: 'Success', description: 'All notifications marked as read' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark all as read', variant: 'destructive' });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading && notifications.length === 0) {
    return (
      <Card className="glass-card shadow-lg animate-pulse">
        <CardHeader className="h-20 bg-muted/20" />
        <CardContent className="h-40" />
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-lg border-primary/10 overflow-hidden group">
      <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-5 w-5 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </div>
            <CardTitle className="text-lg">Notification Hub</CardTitle>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs h-7 gap-1 hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <CardDescription>Stay updated with application progress</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[350px] overflow-y-auto divide-y divide-border/50 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
              <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
                <BellOff className="h-6 w-6 opacity-20" />
              </div>
              <p className="text-sm px-6 font-medium">No updates yet. Check back later!</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.notification_id} 
                className={cn(
                  "p-4 transition-all duration-300 hover:bg-muted/30 flex gap-3 group/item relative",
                  !n.is_read ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary" : "opacity-80"
                )}
              >
                <div className={cn(
                  "mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover/item:scale-110",
                  n.type === 'application_update' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-primary/10 text-primary"
                )}>
                  {n.type === 'application_update' ? <Info className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm leading-relaxed",
                    !n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}>
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3" />
                    {new Date(n.created_at).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                {!n.is_read && (
                  <button 
                    onClick={() => markAsRead(n.notification_id)}
                    className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-primary/20 rounded-full transition-all text-primary"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
