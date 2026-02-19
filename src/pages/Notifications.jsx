import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Check, Trash2, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from "@/components/ui/skeleton";
import NotificationItem from '@/components/notifications/NotificationItem';

export default function Notifications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id }, '-created_date', 200),
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true, read_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => 
          base44.entities.Notification.update(n.id, { read: true, read_at: new Date().toISOString() })
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const readNotifications = notifications.filter(n => n.read);
      await Promise.all(readNotifications.map(n => base44.entities.Notification.delete(n.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const filterNotifications = (list) => {
    let filtered = list;
    
    if (filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }
    
    return filtered;
  };

  const filteredUnread = filterNotifications(unreadNotifications);
  const filteredRead = filterNotifications(readNotifications);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 mb-4" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
          <p className="text-slate-500 mt-1">
            {unreadNotifications.length} não lidas • {notifications.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {unreadNotifications.length > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
          {readNotifications.length > 0 && (
            <Button
              variant="outline"
              onClick={() => deleteAllReadMutation.mutate()}
              disabled={deleteAllReadMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar lidas
            </Button>
          )}
          <Link to={createPageUrl('NotificationPreferences')}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Preferências
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="gdm_pending">GDM Pendente</SelectItem>
                <SelectItem value="gdm_approved">GDM Aprovada</SelectItem>
                <SelectItem value="gdm_rejected">GDM Rejeitada</SelectItem>
                <SelectItem value="supplier_sent">Enviado ao Fornecedor</SelectItem>
                <SelectItem value="quote_received">Cotação Recebida</SelectItem>
                <SelectItem value="quote_analysis">Análise de Cotação</SelectItem>
                <SelectItem value="password_expiring">Senha Expirando</SelectItem>
                <SelectItem value="system_alert">Alerta do Sistema</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Tabs */}
      <Tabs defaultValue="unread">
        <TabsList>
          <TabsTrigger value="unread" className="relative">
            Não lidas
            {unreadNotifications.length > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadNotifications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="read">Lidas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value="unread">
          <Card className="border-0 shadow-sm">
            {filteredUnread.length > 0 ? (
              <div>
                {filteredUnread.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => markAsReadMutation.mutate(notification.id)}
                    onDelete={() => deleteNotificationMutation.mutate(notification.id)}
                    onClose={() => {}}
                  />
                ))}
              </div>
            ) : (
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhuma notificação não lida</p>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="read">
          <Card className="border-0 shadow-sm">
            {filteredRead.length > 0 ? (
              <div>
                {filteredRead.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => {}}
                    onDelete={() => deleteNotificationMutation.mutate(notification.id)}
                    onClose={() => {}}
                  />
                ))}
              </div>
            ) : (
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhuma notificação lida</p>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card className="border-0 shadow-sm">
            {filterNotifications(notifications).length > 0 ? (
              <div>
                {filterNotifications(notifications).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => markAsReadMutation.mutate(notification.id)}
                    onDelete={() => deleteNotificationMutation.mutate(notification.id)}
                    onClose={() => {}}
                  />
                ))}
              </div>
            ) : (
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhuma notificação</p>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}