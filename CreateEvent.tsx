import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, MapPin, Calendar, Clock, FileText, Plus, Trash2, MapPinPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { EventCategory } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Alert, Badge } from '@/components/ui/index';
import { categoryLabel } from '@/lib/utils';

interface CreateEventProps {
  onBack: () => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface VenueDraft {
  id: string;
  name: string;
  building: string;
  block: string;
  room: string;
  floor: string;
  capacity: string;
  latitude: string;
  longitude: string;
  mapUrl: string;
}

const steps = ['Event Details', 'Add Venues', 'Create Schedule', 'Review & Publish'];

export function CreateEvent({ onBack, onNavigate }: CreateEventProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState({
    name: '',
    category: 'hackathon' as EventCategory,
    short_description: '',
    detailed_description: '',
    organizer_club: '',
    college: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reg_open_date: '',
    reg_deadline: '',
    team_size: '1',
    eligibility: '',
    rules: '',
    requirements: '',
    contact_info: '',
  });

  const [venues, setVenues] = useState<VenueDraft[]>([]);
  const [sessions, setSessions] = useState<{ id: string; title: string; start_time: string; end_time: string; venueIndex: number }[]>([]);

  const updateEvent = (field: string, value: string) => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const addVenue = () => {
    setVenues((prev) => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      building: '',
      block: '',
      room: '',
      floor: '',
      capacity: '',
      latitude: '',
      longitude: '',
      mapUrl: '',
    }]);
  };

  const updateVenue = (id: string, field: string, value: string) => {
    setVenues((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const removeVenue = (id: string) => {
    setVenues((prev) => prev.filter((v) => v.id !== id));
  };

  const addSession = () => {
    setSessions((prev) => [...prev, { id: crypto.randomUUID(), title: '', start_time: '', end_time: '', venueIndex: -1 }]);
  };

  const updateSession = (id: string, field: string, value: string | number) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const validateStep = (): boolean => {
    setError('');
    if (step === 0) {
      if (!eventForm.name || !eventForm.start_date || !eventForm.start_time) {
        setError('Please fill in event name, start date, and start time.');
        return false;
      }
    }
    if (step === 1) {
      const emptyVenue = venues.find((v) => !v.name);
      if (venues.length === 0) {
        setError('Please add at least one venue.');
        return false;
      }
      if (emptyVenue) {
        setError('Each venue must have a name.');
        return false;
      }
    }
    if (step === 2) {
      const emptySession = sessions.find((s) => !s.title || !s.start_time);
      if (sessions.length === 0) {
        setError('Please add at least one session.');
        return false;
      }
      if (emptySession) {
        setError('Each session must have a title and start time.');
        return false;
      }
    }
    return true;
  };

  const saveEventAndVenues = async (): Promise<string | null> => {
    if (!profile) return null;
    setSaving(true);
    setError('');

    try {
      // Create event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          organizer_id: profile.id,
          name: eventForm.name,
          category: eventForm.category,
          short_description: eventForm.short_description || null,
          detailed_description: eventForm.detailed_description || null,
          organizer_club: eventForm.organizer_club || null,
          college: eventForm.college || null,
          start_date: eventForm.start_date,
          end_date: eventForm.end_date || null,
          start_time: eventForm.start_time,
          end_time: eventForm.end_time || null,
          reg_open_date: eventForm.reg_open_date || null,
          reg_deadline: eventForm.reg_deadline || null,
          team_size: parseInt(eventForm.team_size) || 1,
          eligibility: eventForm.eligibility || null,
          rules: eventForm.rules || null,
          requirements: eventForm.requirements || null,
          contact_info: eventForm.contact_info || null,
          status: 'draft',
        })
        .select()
        .single();

      if (eventError) {
        setError(eventError.message);
        setSaving(false);
        return null;
      }

      const newEventId = eventData.id;
      setEventId(newEventId);

      // Create venues
      const venueIds: string[] = [];
      for (const v of venues) {
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .insert({
            organizer_id: profile.id,
            event_id: newEventId,
            name: v.name,
            building: v.building || null,
            block: v.block || null,
            room: v.room || null,
            floor: v.floor || null,
            capacity: parseInt(v.capacity) || 0,
            latitude: v.latitude ? parseFloat(v.latitude) : null,
            longitude: v.longitude ? parseFloat(v.longitude) : null,
            map_url: v.mapUrl || null,
          })
          .select()
          .single();

        if (venueError) {
          setError(`Failed to create venue: ${venueError.message}`);
          setSaving(false);
          return null;
        }
        venueIds.push(venueData.id);
      }

      // Create sessions
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        const venueId = s.venueIndex >= 0 && s.venueIndex < venueIds.length ? venueIds[s.venueIndex] : null;
        const { error: sessionError } = await supabase
          .from('event_sessions')
          .insert({
            event_id: newEventId,
            venue_id: venueId,
            title: s.title,
            start_time: s.start_time,
            end_time: s.end_time || null,
            sort_order: i,
          });

        if (sessionError) {
          setError(`Failed to create session: ${sessionError.message}`);
          setSaving(false);
          return null;
        }
      }

      setSaving(false);
      return newEventId;
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
      return null;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    if (step === 2) {
      // Save everything
      const id = await saveEventAndVenues();
      if (id) {
        setStep(3);
      }
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handlePublish = async () => {
    if (!eventId) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from('events')
      .update({ status: 'published' })
      .eq('id', eventId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onNavigate('organizer-event-manage', { eventId });
  };

  const handleSaveDraft = async () => {
    if (!eventId) return;
    onNavigate('organizer-events');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-slate-800">Create Event</h1>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all ${
              i <= step ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'
            }`}>
              {i < step ? <Check className="h-5 w-5" /> : i + 1}
            </div>
            <span className={`ml-2 hidden text-xs font-medium sm:block ${i <= step ? 'text-slate-700' : 'text-slate-400'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${i < step ? 'bg-teal-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Step 0: Event Details */}
      {step === 0 && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <FileText className="h-5 w-5 text-teal-600" /> Event Information
          </h2>
          <Input label="Event Name *" value={eventForm.name} onChange={(e) => updateEvent('name', e.target.value)} placeholder="e.g., CodeSprint Hackathon" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" value={eventForm.category} onChange={(e) => updateEvent('category', e.target.value)}>
              {['hackathon', 'workshop', 'technical', 'fest', 'competition', 'seminar', 'other'].map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </Select>
            <Input label="Organizer / Club" value={eventForm.organizer_club} onChange={(e) => updateEvent('organizer_club', e.target.value)} placeholder="e.g., CS Club" />
          </div>
          <Input label="College / Institution" value={eventForm.college} onChange={(e) => updateEvent('college', e.target.value)} placeholder="e.g., VVI University" />
          <Textarea label="Short Description" rows={2} value={eventForm.short_description} onChange={(e) => updateEvent('short_description', e.target.value)} placeholder="A brief summary of the event" />
          <Textarea label="Detailed Description" rows={4} value={eventForm.detailed_description} onChange={(e) => updateEvent('detailed_description', e.target.value)} placeholder="Full event description, what it's about, who can participate..." />

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Calendar className="h-4 w-4 text-teal-600" /> Date & Time
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Start Date *" type="date" value={eventForm.start_date} onChange={(e) => updateEvent('start_date', e.target.value)} />
              <Input label="End Date" type="date" value={eventForm.end_date} onChange={(e) => updateEvent('end_date', e.target.value)} />
              <Input label="Start Time *" type="time" value={eventForm.start_time} onChange={(e) => updateEvent('start_time', e.target.value)} />
              <Input label="End Time" type="time" value={eventForm.end_time} onChange={(e) => updateEvent('end_time', e.target.value)} />
              <Input label="Registration Opening Date" type="date" value={eventForm.reg_open_date} onChange={(e) => updateEvent('reg_open_date', e.target.value)} />
              <Input label="Registration Deadline" type="date" value={eventForm.reg_deadline} onChange={(e) => updateEvent('reg_deadline', e.target.value)} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">Additional Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Team Size" type="number" value={eventForm.team_size} onChange={(e) => updateEvent('team_size', e.target.value)} />
              <Input label="Contact Information" value={eventForm.contact_info} onChange={(e) => updateEvent('contact_info', e.target.value)} placeholder="Email or phone" />
            </div>
            <div className="mt-4 space-y-4">
              <Textarea label="Eligibility" rows={2} value={eventForm.eligibility} onChange={(e) => updateEvent('eligibility', e.target.value)} placeholder="Who can participate" />
              <Textarea label="Requirements" rows={2} value={eventForm.requirements} onChange={(e) => updateEvent('requirements', e.target.value)} placeholder="What participants need to bring" />
              <Textarea label="Rules" rows={3} value={eventForm.rules} onChange={(e) => updateEvent('rules', e.target.value)} placeholder="Event rules and guidelines" />
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Add Venues */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-800">
              <MapPinPlus className="h-5 w-5 text-teal-600" /> Add Venues
            </h2>
            <p className="mb-4 text-sm text-slate-500">Add the physical locations where your event sessions will take place. You can set GPS coordinates or a Google Maps link for navigation.</p>

            {venues.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <MapPin className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">No venues added yet</p>
              </div>
            )}

            {venues.map((v, i) => (
              <div key={v.id} className="mb-4 rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700">Venue {i + 1}</h4>
                  <button onClick={() => removeVenue(v.id)} className="rounded-lg p-1 text-red-400 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Venue Name *" value={v.name} onChange={(e) => updateVenue(v.id, 'name', e.target.value)} placeholder="e.g., Main Auditorium" />
                  <Input label="Building" value={v.building} onChange={(e) => updateVenue(v.id, 'building', e.target.value)} placeholder="e.g., Main Block" />
                  <Input label="Block" value={v.block} onChange={(e) => updateVenue(v.id, 'block', e.target.value)} placeholder="e.g., Block A" />
                  <Input label="Room / Lab" value={v.room} onChange={(e) => updateVenue(v.id, 'room', e.target.value)} placeholder="e.g., Lab 1" />
                  <Input label="Floor" value={v.floor} onChange={(e) => updateVenue(v.id, 'floor', e.target.value)} placeholder="e.g., 2nd Floor" />
                  <Input label="Capacity" type="number" value={v.capacity} onChange={(e) => updateVenue(v.id, 'capacity', e.target.value)} placeholder="e.g., 100" />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input label="Latitude (for map)" value={v.latitude} onChange={(e) => updateVenue(v.id, 'latitude', e.target.value)} placeholder="e.g., 17.3850" />
                  <Input label="Longitude (for map)" value={v.longitude} onChange={(e) => updateVenue(v.id, 'longitude', e.target.value)} placeholder="e.g., 78.4867" />
                </div>
                <div className="mt-3">
                  <Input label="Google Maps URL (optional)" value={v.mapUrl} onChange={(e) => updateVenue(v.id, 'mapUrl', e.target.value)} placeholder="https://maps.google.com/..." />
                </div>
              </div>
            ))}

            <Button onClick={addVenue} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Venue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Create Schedule */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-800">
              <Clock className="h-5 w-5 text-teal-600" /> Create Schedule
            </h2>
            <p className="mb-4 text-sm text-slate-500">Add sessions for your event and assign them to venues.</p>

            {sessions.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <Calendar className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">No sessions added yet</p>
              </div>
            )}

            {sessions.map((s, i) => (
              <div key={s.id} className="mb-4 rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700">Session {i + 1}</h4>
                  <button onClick={() => removeSession(s.id)} className="rounded-lg p-1 text-red-400 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Session Title *" value={s.title} onChange={(e) => updateSession(s.id, 'title', e.target.value)} placeholder="e.g., Opening Ceremony" />
                  <Select label="Venue" value={s.venueIndex} onChange={(e) => updateSession(s.id, 'venueIndex', parseInt(e.target.value))}>
                    <option value={-1}>Select venue (optional)</option>
                    {venues.map((v, vi) => (
                      <option key={v.id} value={vi}>{v.name}</option>
                    ))}
                  </Select>
                  <Input label="Start Time *" type="time" value={s.start_time} onChange={(e) => updateSession(s.id, 'start_time', e.target.value)} />
                  <Input label="End Time" type="time" value={s.end_time} onChange={(e) => updateSession(s.id, 'end_time', e.target.value)} />
                </div>
              </div>
            ))}

            <Button onClick={addSession} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Session
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Publish */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <Check className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 className="mt-4 text-xl font-bold text-slate-800">Event Created!</h2>
            <p className="mt-2 text-sm text-slate-600">Your event has been saved as a draft. Review the details below and publish when ready.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-800">Review Details</h3>
            <div className="space-y-3">
              <div><p className="text-xs text-slate-400">Event Name</p><p className="font-medium text-slate-700">{eventForm.name}</p></div>
              <div><p className="text-xs text-slate-400">Category</p><Badge className="border-slate-200 bg-slate-50 text-slate-600">{categoryLabel(eventForm.category)}</Badge></div>
              <div><p className="text-xs text-slate-400">Date</p><p className="font-medium text-slate-700">{eventForm.start_date} at {eventForm.start_time}</p></div>
              <div><p className="text-xs text-slate-400">Venues</p><p className="font-medium text-slate-700">{venues.length} venue(s)</p></div>
              <div><p className="text-xs text-slate-400">Sessions</p><p className="font-medium text-slate-700">{sessions.length} session(s)</p></div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handlePublish} loading={saving} size="lg" className="flex-1">
              Publish Event
            </Button>
            <Button onClick={handleSaveDraft} variant="outline" size="lg">
              Save as Draft
            </Button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {step < 3 && (
        <div className="flex justify-between">
          <Button onClick={() => (step === 0 ? onBack() : setStep((prev) => prev - 1))} variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 0 ? 'Cancel' : 'Previous'}
          </Button>
          <Button onClick={handleNext} loading={saving}>
            {step === 2 ? 'Create Event' : 'Next'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
