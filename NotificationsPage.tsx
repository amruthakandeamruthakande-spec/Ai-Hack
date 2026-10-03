import { useEffect, useState } from 'react';
import { Bell, BellOff, Check, Calendar, Clock, MapPin, AlertTriangle, PartyPopper, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Notification } from '@/types';
import { EmptyState } from '@/components/ui/index';

export function NotificationsPage({ onNavigate }: { onNavigate: (page: string, params?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false });
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'venue_changed': return <MapPin className="h-5 w-5 text-amber-500" />;
      case 'schedule_updated': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'registration': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'reminder': return <Clock className="h-5 w-5 text-purple-500" />;
      case 'crowd_warning': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'event_published': return <PartyPopper className="h-5 w-5 text-teal-500" />;
      default: return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Check className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-12 w-12" />}
          title="No notifications"
          message="You'll see event updates, schedule changes, and reminders here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 rounded-2xl border p-4 transition-all ${
                n.read ? 'border-slate-200 bg-white' : 'border-teal-200 bg-teal-50/50'
              }`}
            >
              <div className="flex-shrink-0">
                {getIcon(n.type)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{n.title}</p>
                <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                <p className="mt-1.5 text-xs text-slate-400">
                  {new Date(n.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              {!n.read && (
                <button onClick={() => markAsRead(n.id)} className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
