import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Users, FileText, Phone, TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate, categoryLabel, isRegistrationOpen } from '@/lib/utils';
import type { Event, EventSession, Venue, Registration } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState } from '@/components/ui/index';

interface EventDetailsProps {
  eventId: string;
  onBack: () => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function EventDetails({ eventId, onBack, onNavigate }: EventDetailsProps) {
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
    setEvent(eventData as Event | null);

    const { data: sessionData } = await supabase
      .from('event_sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });
    setSessions((sessionData as EventSession[]) || []);

    const { data: venueData } = await supabase.from('venues').select('*').eq('event_id', eventId);
    setVenues((venueData as Venue[]) || []);

    if (profile) {
      const { data: regData } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('attendee_id', profile.id)
        .maybeSingle();
      setRegistration(regData as Registration | null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  if (!event) {
    return <EmptyState icon={<FileText className="h-12 w-12" />} title="Event not found" message="This event may have been removed." />;
  }

  const regOpen = isRegistrationOpen(event.reg_deadline, event.status);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </button>

      {/* Poster section */}
      <div className="relative h-48 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-blue-600 sm:h-64">
        <div className="absolute inset-0 flex items-center justify-center">
          <TrendingUp className="h-20 w-20 text-white/30" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/70 to-transparent p-6">
          <div className="flex items-center gap-2">
            <Badge className="border-white/20 bg-white/10 text-white backdrop-blur-sm">{categoryLabel(event.category)}</Badge>
            <Badge className={regOpen ? 'border-emerald-300/30 bg-emerald-500/20 text-emerald-100' : 'border-red-300/30 bg-red-500/20 text-red-100'}>
              {regOpen ? 'Registration Open' : 'Registration Closed'}
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{event.name}</h1>
          {event.organizer_club && <p className="text-sm text-slate-200">{event.organizer_club}</p>}
        </div>
      </div>

      {/* About */}
      {event.detailed_description && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
            <FileText className="h-5 w-5 text-teal-600" />
            About the Event
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{event.detailed_description}</p>
        </div>
      )}

      {/* Event info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Event Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date" value={formatDate(event.start_date)} />
          <InfoRow icon={<Clock className="h-4 w-4" />} label="Start Time" value={event.start_time} />
          {event.end_time && <InfoRow icon={<Clock className="h-4 w-4" />} label="End Time" value={event.end_time} />}
          {event.college && <InfoRow icon={<MapPin className="h-4 w-4" />} label="College" value={event.college} />}
          {event.reg_deadline && <InfoRow icon={<Calendar className="h-4 w-4" />} label="Registration Deadline" value={formatDate(event.reg_deadline)} />}
          {event.team_size > 1 && <InfoRow icon={<Users className="h-4 w-4" />} label="Team Size" value={`Up to ${event.team_size} members`} />}
        </div>
      </div>

      {/* Eligibility & Rules */}
      {(event.eligibility || event.rules || event.requirements) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Requirements & Rules</h2>
          <div className="space-y-4">
            {event.eligibility && <div><p className="text-xs font-semibold text-slate-400">ELIGIBILITY</p><p className="mt-1 text-sm text-slate-600">{event.eligibility}</p></div>}
            {event.requirements && <div><p className="text-xs font-semibold text-slate-400">REQUIREMENTS</p><p className="mt-1 text-sm text-slate-600">{event.requirements}</p></div>}
            {event.rules && <div><p className="text-xs font-semibold text-slate-400">RULES</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{event.rules}</p></div>}
          </div>
        </div>
      )}

      {/* Venue info */}
      {venues.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Venue Information</h2>
          <div className="space-y-3">
            {venues.map((v) => (
              <div key={v.id} className="flex items-start justify-between rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-700">{v.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[v.building, v.block, v.room, v.floor].filter(Boolean).join(', ')}
                  </p>
                  {v.capacity > 0 && <p className="mt-0.5 text-xs text-slate-400">Capacity: {v.capacity}</p>}
                </div>
                <button
                  onClick={() => onNavigate('attendee-map', { venueId: v.id })}
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-100"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  View on Map
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule preview */}
      {sessions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Event Schedule</h2>
          <div className="space-y-2">
            {sessions.map((s, i) => {
              const venue = venues.find((v) => v.id === s.venue_id);
              return (
                <div key={s.id} className="flex items-start gap-4 rounded-xl bg-slate-50 p-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-700">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">{s.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {s.start_time}{s.end_time ? ` – ${s.end_time}` : ''}
                      {venue && ` · ${venue.name}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contact */}
      {event.contact_info && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
            <Phone className="h-5 w-5 text-teal-600" />
            Contact
          </h2>
          <p className="text-sm text-slate-600">{event.contact_info}</p>
        </div>
      )}

      {/* Registration CTA */}
      <div className="sticky bottom-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
        {registration ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="font-semibold text-slate-800">You're registered!</p>
                <p className="text-xs text-slate-500">Registration ID: {registration.registration_id}</p>
              </div>
            </div>
            <Button onClick={() => onNavigate('attendee-schedule', { eventId })} variant="outline" size="sm">
              View Schedule
            </Button>
          </div>
        ) : regOpen ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Ready to join this event?</p>
            <Button onClick={() => onNavigate('attendee-register', { eventId })} size="md">
              Register Now
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-red-600">Registration is closed for this event.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
      <div className="text-teal-600">{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
