import { useEffect, useState } from 'react';
import { Users, Building, TrendingUp, BarChart3, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Event, Venue, CheckIn, QrToken } from '@/types';
import { Badge, EmptyState } from '@/components/ui/index';
import { Select } from '@/components/ui/Input';

export function OrganizerLiveCrowd() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [qrTokens, setQrTokens] = useState<QrToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: eventsData } = await supabase.from('events').select('*').eq('organizer_id', profile?.id).order('created_at', { ascending: false });
    const eventList = (eventsData as Event[]) || [];
    setEvents(eventList);

    const eventIds = eventList.map((e) => e.id);
    if (eventIds.length > 0) {
      const [venRes, checkRes, qrRes] = await Promise.all([
        supabase.from('venues').select('*').in('event_id', eventIds),
        supabase.from('check_ins').select('*').in('event_id', eventIds).order('checked_in_at', { ascending: false }),
        supabase.from('qr_tokens').select('*').in('event_id', eventIds),
      ]);
      setVenues((venRes.data as Venue[]) || []);
      setCheckIns((checkRes.data as CheckIn[]) || []);
      setQrTokens((qrRes.data as QrToken[]) || []);
    }
    setLoading(false);
  };

  const filteredEventIds = selectedEvent === 'all' ? events.map((e) => e.id) : [selectedEvent];
  const filteredVenues = venues.filter((v) => filteredEventIds.includes(v.event_id || ''));
  const filteredCheckIns = checkIns.filter((c) => filteredEventIds.includes(c.event_id));
  const validCheckIns = filteredCheckIns.filter((c) => c.status === 'valid');
  const duplicateCheckIns = filteredCheckIns.filter((c) => c.status === 'duplicate');

  const eventMap = new Map(events.map((e) => [e.id, e]));

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
        <h1 className="text-2xl font-bold text-slate-800">Live Crowd Dashboard</h1>
        {events.length > 0 && (
          <Select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="w-48">
            <option value="all">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </Select>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No events available"
          message="Create events and generate QR codes to track live crowd data."
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800">{validCheckIns.length}</p>
                  <p className="text-xs text-slate-500">Valid Check-ins</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800">{duplicateCheckIns.length}</p>
                  <p className="text-xs text-slate-500">Duplicate Attempts</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800">{filteredCheckIns.length}</p>
                  <p className="text-xs text-slate-500">Total Scans</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Building className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800">{filteredVenues.length}</p>
                  <p className="text-xs text-slate-500">Venues</p>
                </div>
              </div>
            </div>
          </div>

          {/* Venue crowd data */}
          {filteredVenues.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-slate-800">Venue Crowd Levels</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredVenues.map((venue) => {
                  const venueValidCheckIns = validCheckIns.filter((c) => c.venue_id === venue.id);
                  const current = venueValidCheckIns.length;
                  const capacity = venue.capacity;
                  const pct = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0;
                  const status = pct >= 90 ? 'Full' : pct >= 70 ? 'Nearly Full' : 'Available';
                  const statusColor = pct >= 90 ? 'text-red-600 bg-red-50' : pct >= 70 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
                  const event = eventMap.get(venue.event_id || '');

                  return (
                    <div key={venue.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          {event && <p className="text-xs text-slate-400">{event.name}</p>}
                          <h3 className="mt-1 flex items-center gap-1.5 font-bold text-slate-800">
                            <Building className="h-4 w-4 text-teal-600" />
                            {venue.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {[venue.building, venue.block, venue.room].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>{status}</span>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-slate-400" />
                          <span className="text-2xl font-bold text-slate-800">{current}</span>
                          <span className="text-sm text-slate-400">/ {capacity || '∞'}</span>
                        </div>
                        {capacity > 0 && <span className="text-sm font-medium text-slate-500">{Math.round(pct)}% full</span>}
                      </div>

                      {capacity > 0 && (
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent scans */}
          {filteredCheckIns.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-slate-800">Recent Scans</h2>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Time</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCheckIns.slice(0, 20).map((c) => (
                      <tr key={c.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(c.checked_in_at).toLocaleString('en-US', { timeStyle: 'short', dateStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          {c.status === 'valid' ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Valid</Badge>
                          ) : (
                            <Badge className="border-amber-200 bg-amber-50 text-amber-700">Duplicate</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredVenues.length === 0 && filteredCheckIns.length === 0 && (
            <EmptyState
              icon={<BarChart3 className="h-12 w-12" />}
              title="No crowd data yet"
              message="Generate QR codes and have attendees scan them to see live crowd data."
            />
          )}
        </>
      )}
    </div>
  );
}
