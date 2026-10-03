import { useEffect, useState } from 'react';
import { Calendar, Users, TrendingUp, PlusCircle, ArrowRight, ClipboardList, QrCode, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate, statusLabel, statusColor } from '@/lib/utils';
import type { Event } from '@/types';
import { Badge, EmptyState } from '@/components/ui/index';

interface OrganizerHomeProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function OrganizerHome({ onNavigate }: OrganizerHomeProps) {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [liveAttendees, setLiveAttendees] = useState(0);
  const [loading, setLoading] = useState(true);

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
    setEvents(eventList);

    // Get registration count
    const eventIds = eventList.map((e) => e.id);
    if (eventIds.length > 0) {
      const { count } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .in('event_id', eventIds);
      setTotalRegistrations(count || 0);

      // Get live check-ins
      const { count: checkInCount } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .in('event_id', eventIds)
        .eq('status', 'valid');
      setLiveAttendees(checkInCount || 0);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Hello, {profile?.full_name} 👋</h1>
        <p className="mt-1 text-slate-300">Manage your events, registrations, and attendance.</p>
        <button
          onClick={() => onNavigate('organizer-create')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-teal-400"
        >
          <PlusCircle className="h-5 w-5" />
          Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
              <Calendar className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{events.length}</p>
              <p className="text-xs text-slate-500">Total Events</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalRegistrations}</p>
              <p className="text-xs text-slate-500">Total Registrations</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{liveAttendees}</p>
              <p className="text-xs text-slate-500">Live Attendees</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: <Calendar className="h-5 w-5" />, label: 'My Events', page: 'organizer-events', color: 'bg-teal-50 text-teal-600' },
          { icon: <ClipboardList className="h-5 w-5" />, label: 'Registrations', page: 'organizer-registrations', color: 'bg-blue-50 text-blue-600' },
          { icon: <QrCode className="h-5 w-5" />, label: 'QR Codes', page: 'organizer-qr', color: 'bg-purple-50 text-purple-600' },
          { icon: <BarChart3 className="h-5 w-5" />, label: 'Live Crowd', page: 'organizer-crowd', color: 'bg-amber-50 text-amber-600' },
        ].map((action) => (
          <button
            key={action.page}
            onClick={() => onNavigate(action.page)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-300 hover:shadow-md"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}>{action.icon}</div>
            <span className="text-xs font-medium text-slate-700 sm:text-sm">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent events */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Recent Events</h2>
          <button onClick={() => onNavigate('organizer-events')} className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-500">
            View All <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : events.length === 0 ? (
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
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <button
                key={event.id}
                onClick={() => onNavigate('organizer-event-manage', { eventId: event.id })}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-teal-300 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-500 text-white">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{event.name}</h3>
                    <p className="text-xs text-slate-500">{formatDate(event.start_date)} · {event.start_time}</p>
                  </div>
                </div>
                <Badge className={statusColor(event.status)}>{statusLabel(event.status)}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
