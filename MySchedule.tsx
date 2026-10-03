import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, ArrowRight, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Registration, Event, EventSession, Venue } from '@/types';
import { Badge, EmptyState } from '@/components/ui/index';

interface MyScheduleProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  selectedEventId?: string;
}

export function MySchedule({ onNavigate, selectedEventId }: MyScheduleProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<{ event: Event; sessions: (EventSession & { venues: Venue | null })[] }[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  const loadData = async () => {
    let query = supabase
      .from('registrations')
      .select('*, events(*)')
      .eq('attendee_id', profile?.id)
      .eq('status', 'registered');

    if (selectedEventId) {
      query = query.eq('event_id', selectedEventId);
    }

    const { data: regs } = await query.order('registered_at', { ascending: false });
    const registrations = (regs as (Registration & { events: Event })[]) || [];

    const results: { event: Event; sessions: (EventSession & { venues: Venue | null })[] }[] = [];
    for (const reg of registrations) {
      const { data: sessionData } = await supabase
        .from('event_sessions')
        .select('*, venues(*)')
        .eq('event_id', reg.event_id)
        .order('sort_order', { ascending: true });
      results.push({ event: reg.events, sessions: (sessionData as (EventSession & { venues: Venue | null })[]) || [] });
    }
    setScheduleData(results);
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
      <h1 className="text-2xl font-bold text-slate-800">My Schedule</h1>

      {scheduleData.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="No schedule yet"
          message="Register for events to see your personalized schedule here."
          action={
            <button onClick={() => onNavigate('attendee-browse')} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
              Browse Events
            </button>
          }
        />
      ) : (
        scheduleData.map(({ event, sessions }) => (
          <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{event.name}</h2>
                <p className="text-sm text-slate-500">{event.start_time} · {event.college || ''}</p>
              </div>
              <button
                onClick={() => onNavigate('attendee-event-details', { eventId: event.id })}
                className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-500"
              >
                Details <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-sm text-slate-400">No sessions scheduled yet for this event.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-4 rounded-xl bg-slate-50 p-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100 text-sm font-bold text-teal-700">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-700">{s.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {s.start_time}{s.end_time ? ` – ${s.end_time}` : ''}
                        </span>
                        {s.venues && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {s.venues.name}
                          </span>
                        )}
                      </div>
                    </div>
                    {s.venues && (
                      <button
                        onClick={() => onNavigate('attendee-map', { venueId: s.venues!.id })}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Map
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
