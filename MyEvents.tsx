import { useEffect, useState } from 'react';
import { Calendar, Users, TrendingUp, PlusCircle, ArrowRight, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate, statusLabel, statusColor, categoryLabel } from '@/lib/utils';
import type { Event } from '@/types';
import { Badge, EmptyState, ConfirmDialog } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';

interface MyEventsProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function MyEvents({ onNavigate }: MyEventsProps) {
  const { profile } = useAuth();
  const [events, setEvents] = useState<(Event & { reg_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteEvent, setDeleteEvent] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', profile?.id)
      .order('created_at', { ascending: false });
    const eventList = (eventsData as Event[]) || [];

    // Get registration counts for each event
    const eventsWithCounts = await Promise.all(
      eventList.map(async (e) => {
        const { count } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', e.id);
        return { ...e, reg_count: count || 0 };
      })
    );
    setEvents(eventsWithCounts);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteEvent) return;
    setDeleting(true);
    const { error } = await supabase.from('events').delete().eq('id', deleteEvent.id);
    if (!error) {
      setEvents((prev) => prev.filter((e) => e.id !== deleteEvent.id));
      setDeleteEvent(null);
    }
    setDeleting(false);
  };

  const togglePublish = async (event: Event) => {
    const newStatus = event.status === 'draft' ? 'published' : event.status === 'published' ? 'closed' : 'published';
    await supabase.from('events').update({ status: newStatus }).eq('id', event.id);
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, status: newStatus } : e)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">My Events</h1>
        <Button onClick={() => onNavigate('organizer-create')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="No events yet"
          message="Create your first event to get started."
          action={
            <button onClick={() => onNavigate('organizer-create')} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
              Create Event
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <div key={event.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{event.name}</h3>
                  <Badge className="mt-1.5 border-slate-200 bg-slate-50 text-slate-600">{categoryLabel(event.category)}</Badge>
                </div>
                <Badge className={statusColor(event.status)}>{statusLabel(event.status)}</Badge>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(event.start_date)} · {event.start_time}
                </p>
                <p className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {event.reg_count} registration{event.reg_count !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => onNavigate('organizer-event-manage', { eventId: event.id })} size="sm" variant="outline">
                  <Settings className="mr-1 h-3.5 w-3.5" />
                  Manage
                </Button>
                <Button onClick={() => togglePublish(event)} size="sm" variant="ghost">
                  {event.status === 'draft' ? 'Publish' : event.status === 'published' ? 'Close' : 'Reopen'}
                </Button>
                <Button onClick={() => setDeleteEvent(event)} size="sm" variant="ghost" className="text-red-500 hover:bg-red-50">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteEvent}
        onClose={() => setDeleteEvent(null)}
        onConfirm={handleDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteEvent?.name}"? This will also delete all sessions, venues, registrations, and QR codes for this event. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
