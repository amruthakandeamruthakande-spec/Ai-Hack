import { useEffect, useState } from 'react';
import { ClipboardList, Users, Calendar, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Registration, Event } from '@/types';
import { formatDate, categoryLabel } from '@/lib/utils';
import { Badge, EmptyState } from '@/components/ui/index';
import { Select } from '@/components/ui/Input';

interface OrganizerRegistrationsProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function OrganizerRegistrations({ onNavigate }: OrganizerRegistrationsProps) {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<(Registration & { events: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: eventsData } = await supabase.from('events').select('*').eq('organizer_id', profile?.id).order('created_at', { ascending: false });
    const eventList = (eventsData as Event[]) || [];
    setEvents(eventList);

    const eventIds = eventList.map((e) => e.id);
    if (eventIds.length > 0) {
      const { data: regs } = await supabase
        .from('registrations')
        .select('*, events(*)')
        .in('event_id', eventIds)
        .order('registered_at', { ascending: false });
      setRegistrations((regs as (Registration & { events: Event })[]) || []);
    }
    setLoading(false);
  };

  const filtered = registrations.filter((r) => {
    const matchesEvent = filterEvent === 'all' || r.event_id === filterEvent;
    const q = search.toLowerCase();
    const matchesSearch = !search || (r.full_name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q) || (r.college || '').toLowerCase().includes(q) || (r.registration_id || '').toLowerCase().includes(q);
    return matchesEvent && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Registrations</h1>

      {events.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No events yet"
          message="Create an event to start receiving registrations."
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{registrations.length}</p>
                  <p className="text-xs text-slate-500">Total Registrations</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{events.length}</p>
                  <p className="text-xs text-slate-500">Events</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, college..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none"
              />
            </div>
            <Select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)} className="sm:w-64">
              <option value="all">All Events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No registrations found"
              message={search || filterEvent !== 'all' ? "Try adjusting your filters." : "Registrations will appear here once attendees register."}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Event</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">College</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Reg ID</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg) => (
                    <tr key={reg.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">{reg.full_name}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onNavigate('organizer-event-manage', { eventId: reg.event_id })}
                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-500"
                        >
                          {reg.events.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{reg.email}</td>
                      <td className="px-4 py-3 text-slate-500">{reg.college}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{reg.registration_id}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(reg.registered_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
