import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  X, 
  Check, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  ExternalLink,
  Clock,
  Eye,
  Settings,
  Trash2,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';

interface SystemNotification {
  id: string;
  type: 'system' | 'update' | 'alert' | 'info' | 'warning' | 'error';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  title: string;
  message: string;
  action_label?: string;
  action_url?: string;
  action_data?: any;
  context?: any;
  metadata?: any;
  expires_at?: string;
  auto_dismiss: boolean;
  persistent: boolean;
  created_at: string;
  is_unread: boolean;
  read_at?: string;
  dismissed_at?: string;
  action_clicked_at?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    case 'alert':
      return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    case 'update':
      return <RefreshCw className="w-4 h-4 text-blue-600" />;
    case 'system':
      return <Settings className="w-4 h-4 text-purple-600" />;
    default:
      return <Info className="w-4 h-4 text-gray-600" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 border-red-300 text-red-800';
    case 'high':
      return 'bg-orange-100 border-orange-300 text-orange-800';
    case 'normal':
      return 'bg-blue-100 border-blue-300 text-blue-800';
    case 'low':
      return 'bg-gray-100 border-gray-300 text-gray-800';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800';
  }
};

export default function SystemNotifications() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para notificações não lidas
  const { data: unreadNotifications = [], refetch: refetchUnread } = useQuery({
    queryKey: ['system-notifications', 'unread'],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return [];

      const { data, error } = await supabase
        .from('vw_unread_notifications')
        .select('*')
        .is('user_id', null)
        .or(`user_id.eq.${user.data.user.id},persistent.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SystemNotification[];
    },
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });

  // Query para histórico completo
  const { data: allNotifications = [] } = useQuery({
    queryKey: ['system-notifications', 'history'],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return [];

      const { data, error } = await supabase
        .from('vw_notification_history')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as SystemNotification[];
    },
    enabled: isHistoryOpen,
  });

  // Mutation para marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
        p_user_id: user.data.user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-notifications'] });
    },
  });

  // Mutation para dispensar notificação
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.rpc('dismiss_notification', {
        p_notification_id: notificationId,
        p_user_id: user.data.user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-notifications'] });
      toast({
        title: 'Notificação dispensada',
        description: 'A notificação foi removida e não será reexibida.',
      });
    },
  });

  // Mutation para registrar clique na ação
  const actionClickedMutation = useMutation({
    mutationFn: async ({ notificationId, url }: { notificationId: string; url: string }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.rpc('mark_notification_action_clicked', {
        p_notification_id: notificationId,
        p_user_id: user.data.user.id,
        p_interaction_data: { clicked_url: url },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-notifications'] });
    },
  });

  const handleDismiss = (notificationId: string) => {
    dismissMutation.mutate(notificationId);
  };

  const handleAction = (notification: SystemNotification) => {
    if (notification.action_url) {
      actionClickedMutation.mutate({
        notificationId: notification.id,
        url: notification.action_url,
      });

      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        window.location.href = notification.action_url;
      }
    } else {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const unreadCount = unreadNotifications.filter(n => n.is_unread).length;

  const NotificationItem = ({ notification, showActions = true }: { notification: SystemNotification; showActions?: boolean }) => (
    <Card className={`mb-3 transition-all duration-200 ${notification.is_unread ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm text-gray-900">{notification.title}</h4>
                  <Badge variant="outline" className={`text-xs ${getPriorityColor(notification.priority)}`}>
                    {notification.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {notification.category}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(notification.created_at)}
                  {notification.read_at && (
                    <>
                      <span>•</span>
                      <Eye className="w-3 h-3" />
                      Lida em {formatDate(notification.read_at)}
                    </>
                  )}
                </div>
              </div>
              
              {showActions && (
                <div className="flex items-center gap-1">
                  {notification.is_unread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(notification.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {notification.action_label && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction(notification)}
                className="mt-2 h-7 text-xs"
              >
                {notification.action_label}
                {notification.action_url?.startsWith('http') && (
                  <ExternalLink className="w-3 h-3 ml-1" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (unreadNotifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Notification Bell */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notificações</span>
            <Button variant="ghost" size="sm" onClick={() => setIsHistoryOpen(true)} className="h-6 text-xs">
              Ver histórico
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <ScrollArea className="max-h-96">
            <div className="p-2">
              {unreadNotifications.slice(0, 5).map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
              
              {unreadNotifications.length > 5 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsHistoryOpen(true)}
                  className="w-full"
                >
                  Ver todas ({unreadNotifications.length})
                </Button>
              )}
              
              {unreadNotifications.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma notificação nova</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Histórico de Notificações</DialogTitle>
          </DialogHeader>
          
          <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread">Não lidas ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Lidas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {allNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} showActions={false} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="unread" className="mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {unreadNotifications.filter(n => n.is_unread).map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="read" className="mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {allNotifications.filter(n => n.read_at && !n.is_unread).map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} showActions={false} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
