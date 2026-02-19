import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Send, 
  DollarSign,
  Shield,
  Bell,
  X
} from 'lucide-react';
import { cn } from "@/lib/utils";

const notificationIcons = {
  gdm_pending: FileText,
  gdm_approved: CheckCircle,
  gdm_rejected: XCircle,
  supplier_sent: Send,
  quote_received: DollarSign,
  quote_analysis: DollarSign,
  password_expiring: Shield,
  account_suspended: AlertCircle,
  maintenance_decision: CheckCircle,
  system_alert: Bell,
};

const priorityColors = {
  low: "text-slate-500",
  medium: "text-blue-500",
  high: "text-amber-500",
  critical: "text-red-500",
};

export default function NotificationItem({ notification, onMarkAsRead, onDelete, onClose }) {
  const Icon = notificationIcons[notification.type] || Bell;
  const timeAgo = notification.created_date
    ? formatDistanceToNow(new Date(notification.created_date), { addSuffix: true, locale: ptBR })
    : '';

  const content = (
    <div
      className={cn(
        "flex gap-3 p-4 hover:bg-slate-50 transition-colors border-b",
        !notification.read && "bg-blue-50/50"
      )}
    >
      <div className={cn("mt-1", priorityColors[notification.priority])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={cn(
              "text-sm",
              !notification.read && "font-semibold"
            )}>
              {notification.title}
            </p>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">{timeAgo}</span>
              {notification.priority === 'critical' && (
                <Badge className="bg-red-100 text-red-800 text-xs">Crítico</Badge>
              )}
              {notification.priority === 'high' && (
                <Badge className="bg-amber-100 text-amber-800 text-xs">Alta</Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        {notification.link && (
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-sky-600 mt-2"
            asChild
          >
            <Link to={notification.link} onClick={onClose}>
              {notification.link_text || 'Ver detalhes'}
            </Link>
          </Button>
        )}
      </div>
      {!notification.read && (
        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link
        to={notification.link}
        onClick={() => {
          if (!notification.read) onMarkAsRead();
          onClose();
        }}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}