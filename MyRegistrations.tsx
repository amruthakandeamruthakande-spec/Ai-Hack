import { useEffect, useState } from 'react';
import { Calendar, MapPin, Clock, Hash, ClipboardList, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate, categoryLabel } from '@/lib/utils';
import type { Registration, Event } from '@/types';
import { Badge, EmptyState } from '@/components/ui/index';

interface MyRegistrationsProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function MyRegistrations({ onNavigate }: MyRegistrationsProps) {
  const { profile } = useAuth();
  const [registrations, setRegistrations] = useState<(Registration & { events: Event })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from('registrations')
      .select('*, events(*)')
      .eq('attendee_id', profile?.id)
      .order('registered_at', { ascending: false });
    setRegistrations((data as (Registration & { events: Event })[]) || []);
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
      <h1 className="text-2xl font-bold text-slate-800">My Registrations</h1>

      {registrations.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No registrations yet"
          message="Browse events and register to see them here."
          action={
            <button onClick={() => onNavigate('attendee-browse')} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
              Browse Events
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {registrations.map((reg) => (
            <button
              key={reg.id}
              onClick={() => onNavigate('attendee-event-details', { eventId: reg.event_id })}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-teal-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-slate-800 group-hover:text-teal-600">{reg.events.name}</h3>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Registered</Badge>
              </div>
              <Badge className="mt-2 w-fit border-slate-200 bg-slate-50 text-slate-600">{categoryLabel(reg.events.category)}</Badge>
              <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  {reg.registration_id}
                </p>
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(reg.events.start_date)}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {reg.events.start_time}
                </p>
                {reg.events.venue_label && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {reg.events.venue_label}
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onNavigate('attendee-schedule', { eventId: reg.event_id }); }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-500"
                >
                  View Schedule <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
