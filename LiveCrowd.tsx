import { useEffect, useState } from 'react';
import { Users, TrendingUp, Building } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Event, Venue, CheckIn } from '@/types';
import { EmptyState } from '@/components/ui/index';

export function LiveCrowd() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [venueData, setVenueData] = useState<{ event: Event; venue: Venue; current: number; capacity: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Get events the attendee is registered for
    const { data: regs } = await supabase
      .from('registrations')
      .select('event_id, events(*)')
      .eq('attendee_id', profile?.id)
      .eq('status', 'registered');

    const regEventIds = ((regs as unknown as { event_id: string }[]) || []).map((r) => r.event_id);
    if (regEventIds.length === 0) {
      setLoading(false);
      return;
    }

    // Get all published events for browsing crowd info
    const { data: publishedEvents } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published');
    const allEvents = ((publishedEvents as Event[]) || []);
    const allEventIds = allEvents.map((e) => e.id);
    const eventMap = new Map<string, Event>(allEvents.map((e) => [e.id, e]));

    // Get venues for these events
    const idsToQuery = [...new Set([...regEventIds, ...allEventIds])];
    const { data: venues } = await supabase
      .from('venues')
      .select('*')
      .in('event_id', idsToQuery.length > 0 ? idsToQuery : ['00000000-0000-0000-0000-000000000000']);

    const venueList = (venues as Venue[]) || [];

    // Get valid check-ins for these venues
    const venueIds = venueList.map((v) => v.id);
    const { data: checkIns } = await supabase
      .from('check_ins')
      .select('*')
      .in('venue_id', venueIds.length > 0 ? venueIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'valid');

    const checkInList = (checkIns as CheckIn[]) || [];

    const data = venueList.map((venue) => {
      const event = eventMap.get(venue.event_id || '');
      const current = checkInList.filter((c) => c.venue_id === venue.id).length;
      return { event: event as Event, venue, current, capacity: venue.capacity };
    }).filter((d) => d.event);

    setVenueData(data);
    setLoading(false);
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
      <h1 className="text-2xl font-bold text-slate-800">Live Crowd Information</h1>

      {venueData.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No crowd data available"
          message="Live crowd information will appear here once venues are assigned and check-ins begin."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {venueData.map(({ event, venue, current, capacity }) => {
            const pct = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0;
            const available = Math.max(0, capacity - current);
            const status = pct >= 90 ? 'Full' : pct >= 70 ? 'Nearly Full' : 'Available';
            const statusColor = pct >= 90 ? 'text-red-600 bg-red-50' : pct >= 70 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';

            return (
              <div key={venue.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400">{event.name}</p>
                    <h3 className="mt-1 flex items-center gap-1.5 font-bold text-slate-800">
                      <Building className="h-4 w-4 text-teal-600" />
                      {venue.name}
                    </h3>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                    {status}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-slate-400" />
                    <span className="text-2xl font-bold text-slate-800">{current}</span>
                    <span className="text-sm text-slate-400">/ {capacity || '∞'}</span>
                  </div>
                  {capacity > 0 && (
                    <span className="text-sm font-medium text-slate-500">{Math.round(pct)}% full</span>
                  )}
                </div>

                {capacity > 0 && (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs text-slate-400">Current</p>
                    <p className="text-sm font-bold text-slate-700">{current}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs text-slate-400">Capacity</p>
                    <p className="text-sm font-bold text-slate-700">{capacity || '∞'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs text-slate-400">Available</p>
                    <p className="text-sm font-bold text-slate-700">{capacity > 0 ? available : '∞'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
