import { useEffect, useState } from 'react';
import { CheckCircle2, Calendar, Clock, MapPin, Hash, ArrowRight, Map } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Registration, Event } from '@/types';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/index';

interface RegistrationSuccessProps {
  registrationId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function RegistrationSuccess({ registrationId, onNavigate }: RegistrationSuccessProps) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [registrationId]);

  const loadData = async () => {
    const { data: regData } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .maybeSingle();
    setRegistration(regData as Registration | null);

    if (regData) {
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', regData.event_id)
        .maybeSingle();
      setEvent(eventData as Event | null);
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

  if (!registration || !event) {
    return <EmptyState title="Registration not found" />;
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Registration Successful!</h1>
        <p className="mt-2 text-sm text-slate-500">You have successfully registered for the event.</p>

        <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-left">
          <h2 className="mb-4 font-bold text-slate-800">{event.name}</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Hash className="h-4 w-4 text-teal-600" />
              <div>
                <p className="text-xs text-slate-400">Registration ID</p>
                <p className="text-sm font-semibold text-slate-700">{registration.registration_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-teal-600" />
              <div>
                <p className="text-xs text-slate-400">Date</p>
                <p className="text-sm font-semibold text-slate-700">{formatDate(event.start_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-teal-600" />
              <div>
                <p className="text-xs text-slate-400">Time</p>
                <p className="text-sm font-semibold text-slate-700">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}</p>
              </div>
            </div>
            {event.venue_label && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-teal-600" />
                <div>
                  <p className="text-xs text-slate-400">Venue</p>
                  <p className="text-sm font-semibold text-slate-700">{event.venue_label}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <p className="text-sm font-semibold text-emerald-600">Registered</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => onNavigate('attendee-schedule', { eventId: event.id })} className="flex-1">
            View My Schedule <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button onClick={() => onNavigate('attendee-event-details', { eventId: event.id })} variant="outline" className="flex-1">
            View Event Details
          </Button>
        </div>
        <Button onClick={() => onNavigate('attendee-map')} variant="ghost" className="mt-2 w-full">
          <Map className="mr-1 h-4 w-4" /> View Venue on Map
        </Button>
      </div>
    </div>
  );
}
