import { useEffect, useState } from 'react';
import { Calendar, MapPin, Clock, Search, Filter, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, categoryLabel, isRegistrationOpen } from '@/lib/utils';
import type { Event, EventCategory } from '@/types';
import { Badge, EmptyState } from '@/components/ui/index';

interface BrowseEventsProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const categories: (EventCategory | 'all')[] = ['all', 'hackathon', 'workshop', 'technical', 'fest', 'competition', 'seminar', 'other'];

export function BrowseEvents({ onNavigate }: BrowseEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventCategory | 'all'>('all');
  const [regStatusFilter, setRegStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('start_date', { ascending: true });
    setEvents((data as Event[]) || []);
    setLoading(false);
  };

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch = e.name.toLowerCase().includes(q) || (e.college || '').toLowerCase().includes(q) || (e.venue_label || '').toLowerCase().includes(q);
    const matchesCategory = filter === 'all' || e.category === filter;
    const open = isRegistrationOpen(e.reg_deadline, e.status);
    const matchesReg = regStatusFilter === 'all' || (regStatusFilter === 'open' && open) || (regStatusFilter === 'closed' && !open);
    return matchesSearch && matchesCategory && matchesReg;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Browse Events</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search events by name, college, or venue..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4" />
          Filter by category
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                filter === cat
                  ? 'border-teal-400 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat === 'all' ? 'All Categories' : categoryLabel(cat)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setRegStatusFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                regStatusFilter === s
                  ? 'border-teal-400 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {s === 'all' ? 'All Status' : s === 'open' ? 'Registration Open' : 'Registration Closed'}
            </button>
          ))}
        </div>
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="No events found"
          message="Try adjusting your search or filters."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => {
            const open = isRegistrationOpen(event.reg_deadline, event.status);
            return (
              <button
                key={event.id}
                onClick={() => onNavigate('attendee-event-details', { eventId: event.id })}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-all hover:border-teal-300 hover:shadow-lg"
              >
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-teal-500 to-blue-500">
                  <TrendingUp className="h-12 w-12 text-white/80" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-bold text-slate-800 group-hover:text-teal-600">{event.name}</h3>
                  <Badge className="mt-1.5 w-fit border-slate-200 bg-slate-50 text-slate-600">{categoryLabel(event.category)}</Badge>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(event.start_date)} · {event.start_time}
                    </p>
                    {event.venue_label && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.venue_label}
                      </p>
                    )}
                    {event.reg_deadline && (
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Registration closes: {formatDate(event.reg_deadline)}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto pt-3">
                    <Badge className={open ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}>
                      {open ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
