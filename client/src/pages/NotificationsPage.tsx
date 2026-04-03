import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Check, Clock, Info, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Notification {
  notification_id: number;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/dashboard" className="text-sm text-primary flex items-center gap-1 mb-2 hover:underline">
              <ArrowLeft className="h-3 w-3" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notifications
            </h1>
            <p className="text-muted-foreground">Keep track of your placement drive updates and profile alerts.</p>
          </div>
          {notifications.some(n => !n.is_read) && (
            <Button onClick={markAllAsRead} variant="outline" className="gap-2">
              <Check className="h-4 w-4" /> Mark all as read
            </Button>
          )}
        </div>

        <Card className="glass-card shadow-lg border-primary/5 min-h-[400px]">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Clock className="h-8 w-8 animate-spin text-primary" />
                <p>Loading your updates...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-4">
                <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center">
                  <BellOff className="h-10 w-10 opacity-20" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
                  <p className="max-w-xs mx-auto px-6">You don't have any notifications right now. Check back later for drive updates.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((n) => (
                  <div 
                    key={n.notification_id} 
                    className={cn(
                      "p-6 flex gap-4 transition-all hover:bg-muted/30",
                      !n.is_read && "bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                      n.type === 'application_update' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-primary/10 text-primary"
                    )}>
                      {n.type === 'application_update' ? <Info className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className={cn(
                          "text-base leading-relaxed max-w-2xl",
                          !n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}>
                          {n.message}
                        </p>
                        {!n.is_read && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => markAsRead(n.notification_id)}
                            className="h-7 text-[10px] uppercase font-bold tracking-tighter"
                          >
                            Mark Read
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(n.created_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                          {n.type === 'application_update' ? 'Drive Update' : 'System Alert'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
