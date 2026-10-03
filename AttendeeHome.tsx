import { useEffect, useState } from 'react';
import { Calendar, MapPin, Clock, Search, Users, QrCode, ArrowRight, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate, categoryLabel, isRegistrationOpen } from '@/lib/utils';
import type { Event } from '@/types';
import { Badge, EmptyState } from '@/components/ui/index';

interface AttendeeHomeProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function AttendeeHome({ onNavigate }: AttendeeHomeProps) {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regCount, setRegCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('start_date', { ascending: true });
    setEvents((eventsData as Event[]) || []);

    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('attendee_id', profile?.id);
    setRegCount(count || 0);
    setLoading(false);
  };

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.college || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q) ||
      (e.venue_label || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-600 to-blue-600 p-6 text-white sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Hello, {profile?.full_name} 👋</h1>
        <p className="mt-1 text-teal-50">Discover and participate in exciting college events.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm">
            <p className="text-2xl font-bold">{events.length}</p>
            <p className="text-xs text-teal-100">Upcoming Events</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm">
            <p className="text-2xl font-bold">{regCount}</p>
            <p className="text-xs text-teal-100">My Registrations</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: <Calendar className="h-5 w-5" />, label: 'Browse Events', page: 'attendee-browse', color: 'bg-teal-50 text-teal-600' },
          { icon: <QrCode className="h-5 w-5" />, label: 'Scan QR', page: 'attendee-scan', color: 'bg-blue-50 text-blue-600' },
          { icon: <MapPin className="h-5 w-5" />, label: 'Campus Map', page: 'attendee-map', color: 'bg-amber-50 text-amber-600' },
          { icon: <Users className="h-5 w-5" />, label: 'Live Crowd', page: 'attendee-crowd', color: 'bg-purple-50 text-purple-600' },
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by event name, college, category, or venue..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none"
        />
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Upcoming Events</h2>
          <button onClick={() => onNavigate('attendee-browse')} className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-500">
            View All <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-12 w-12" />}
            title="No events found"
            message={search ? "Try a different search term." : "Events will appear here once organizers publish them."}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((event) => {
              const open = isRegistrationOpen(event.reg_deadline, event.status);
              return (
                <button
                  key={event.id}
                  onClick={() => onNavigate('attendee-event-details', { eventId: event.id })}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-all hover:border-teal-300 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4 p-5">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-500 text-white">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate font-bold text-slate-800 group-hover:text-teal-600">{event.name}</h3>
                      <div className="mt-1.5 space-y-1">
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(event.start_date)}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {event.start_time}
                        </p>
                        {event.venue_label && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.venue_label}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="border-slate-200 bg-slate-50 text-slate-600">{categoryLabel(event.category)}</Badge>
                        <Badge className={open ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}>
                          {open ? 'Registration Open' : 'Registration Closed'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
