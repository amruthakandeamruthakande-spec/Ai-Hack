import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Plus, Trash2, Edit2, Save, X, QrCode, Users, Building, MapPinPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Event, EventSession, Venue, Registration } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge, EmptyState, Alert, ConfirmDialog } from '@/components/ui/index';
import { formatDate, statusLabel, statusColor, categoryLabel, generateToken } from '@/lib/utils';

interface EventManageProps {
  eventId: string;
  onBack: () => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function EventManage({ eventId, onBack, onNavigate }: EventManageProps) {
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'schedule' | 'venues' | 'registrations'>('venues');
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [deleteSession, setDeleteSession] = useState<EventSession | null>(null);
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New session form
  const [newSession, setNewSession] = useState({ title: '', start_time: '', end_time: '', venue_id: '' });
  // New venue form
  const [newVenue, setNewVenue] = useState({ name: '', building: '', block: '', room: '', floor: '', capacity: '', latitude: '', longitude: '', mapUrl: '' });
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
    setEvent(eventData as Event | null);

    const { data: venueData } = await supabase.from('venues').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
    setVenues((venueData as Venue[]) || []);

    const { data: sessionData } = await supabase.from('event_sessions').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
    setSessions((sessionData as EventSession[]) || []);

    const { data: regData } = await supabase.from('registrations').select('*').eq('event_id', eventId).order('registered_at', { ascending: false });
    setRegistrations((regData as Registration[]) || []);

    setLoading(false);
  };

  const notifyAttendeesOfChange = async (type: 'venue_changed' | 'schedule_updated', title: string, message: string, sessionId?: string) => {
    // Get all registered attendees
    const { data: regs } = await supabase
      .from('registrations')
      .select('attendee_id')
      .eq('event_id', eventId)
      .eq('status', 'registered');
    const attendeeIds = ((regs as { attendee_id: string }[]) || []).map((r) => r.attendee_id);

    for (const attendeeId of attendeeIds) {
      await supabase.from('notifications').insert({
        user_id: attendeeId,
        type,
        title,
        message,
        event_id: eventId,
        session_id: sessionId || null,
      });
    }
  };

  const handleAddVenue = async () => {
    if (!newVenue.name) {
      setError('Venue name is required');
      return;
    }
    setError('');
    const { data, error: insertError } = await supabase
      .from('venues')
      .insert({
        organizer_id: profile?.id,
        event_id: eventId,
        name: newVenue.name,
        building: newVenue.building || null,
        block: newVenue.block || null,
        room: newVenue.room || null,
        floor: newVenue.floor || null,
        capacity: parseInt(newVenue.capacity) || 0,
        latitude: newVenue.latitude ? parseFloat(newVenue.latitude) : null,
        longitude: newVenue.longitude ? parseFloat(newVenue.longitude) : null,
        map_url: newVenue.mapUrl || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setVenues((prev) => [...prev, data as Venue]);
    setNewVenue({ name: '', building: '', block: '', room: '', floor: '', capacity: '', latitude: '', longitude: '', mapUrl: '' });
    setShowAddVenue(false);
    setSuccess('Venue added successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteVenue = async () => {
    if (!deleteVenue) return;
    const { error: delError } = await supabase.from('venues').delete().eq('id', deleteVenue.id);
    if (delError) {
      setError(delError.message);
      setDeleteVenue(null);
      return;
    }
    setVenues((prev) => prev.filter((v) => v.id !== deleteVenue.id));
    setSessions((prev) => prev.map((s) => (s.venue_id === deleteVenue.id ? { ...s, venue_id: null } : s)));
    setDeleteVenue(null);
  };

  const handleAddSession = async () => {
    if (!newSession.title || !newSession.start_time) {
      setError('Session title and start time are required');
      return;
    }
    setError('');
    const { data, error: insertError } = await supabase
      .from('event_sessions')
      .insert({
        event_id: eventId,
        venue_id: newSession.venue_id || null,
        title: newSession.title,
        start_time: newSession.start_time,
        end_time: newSession.end_time || null,
        sort_order: sessions.length,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSessions((prev) => [...prev, data as EventSession]);
    setNewSession({ title: '', start_time: '', end_time: '', venue_id: '' });
    setShowAddSession(false);
    setSuccess('Session added successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleUpdateSession = async (session: EventSession, updates: Partial<EventSession>) => {
    const oldVenue = venues.find((v) => v.id === session.venue_id);
    const newVenue = updates.venue_id ? venues.find((v) => v.id === updates.venue_id) : null;

    const { error: updateError } = await supabase
      .from('event_sessions')
      .update(updates)
      .eq('id', session.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, ...updates } : s)));
    setEditingSession(null);

    // Notify attendees if venue or time changed
    if (updates.venue_id !== undefined && oldVenue?.id !== updates.venue_id) {
      await notifyAttendeesOfChange(
        'venue_changed',
        'Venue Changed',
        `${session.title} has been moved from ${oldVenue?.name || 'unassigned'} to ${newVenue?.name || 'unassigned'}.`,
        session.id
      );
    }
    if ((updates.start_time || updates.end_time) && (updates.start_time !== session.start_time || updates.end_time !== session.end_time)) {
      await notifyAttendeesOfChange(
        'schedule_updated',
        'Schedule Updated',
        `${session.title} timing has been updated.`,
        session.id
      );
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteSession) return;
    const { error: delError } = await supabase.from('event_sessions').delete().eq('id', deleteSession.id);
    if (delError) {
      setError(delError.message);
      setDeleteSession(null);
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== deleteSession.id));
    setDeleteSession(null);
  };

  const togglePublish = async () => {
    if (!event) return;
    const newStatus = event.status === 'draft' ? 'published' : event.status === 'published' ? 'closed' : 'published';
    const { error: updateError } = await supabase.from('events').update({ status: newStatus }).eq('id', eventId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEvent({ ...event, status: newStatus });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  if (!event) {
    return <EmptyState title="Event not found" />;
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
        <Calendar className="h-4 w-4" /> Back to My Events
      </button>

      {/* Event header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{event.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">{categoryLabel(event.category)}</Badge>
              <Badge className={statusColor(event.status)}>{statusLabel(event.status)}</Badge>
              <span className="text-xs text-slate-500">{formatDate(event.start_date)} · {event.start_time}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={togglePublish} size="sm" variant="outline">
              {event.status === 'draft' ? 'Publish' : event.status === 'published' ? 'Close' : 'Reopen'}
            </Button>
            <Button onClick={() => onNavigate('organizer-qr', { eventId })} size="sm">
              <QrCode className="mr-1 h-4 w-4" />
              QR Codes
            </Button>
          </div>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: 'venues', label: 'Venues', icon: <Building className="h-4 w-4" /> },
          { key: 'schedule', label: 'Schedule', icon: <Calendar className="h-4 w-4" /> },
          { key: 'registrations', label: `Registrations (${registrations.length})`, icon: <Users className="h-4 w-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'venues' | 'schedule' | 'registrations')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.key ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Venues tab */}
      {tab === 'venues' && (
        <div className="space-y-4">
          {venues.length === 0 && !showAddVenue && (
            <EmptyState
              icon={<MapPin className="h-12 w-12" />}
              title="No venues added"
              message="Add venues to assign them to sessions."
            />
          )}
          {venues.map((v) => (
            <div key={v.id} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
                  <Building className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{v.name}</p>
                  <p className="text-xs text-slate-500">{[v.building, v.block, v.room, v.floor].filter(Boolean).join(', ')}</p>
                  {v.capacity > 0 && <p className="text-xs text-slate-400">Capacity: {v.capacity}</p>}
                  {v.latitude && v.longitude && <p className="text-xs text-blue-500">GPS: {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}</p>}
                </div>
              </div>
              <button onClick={() => setDeleteVenue(v)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {showAddVenue ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
              <h4 className="mb-3 text-sm font-bold text-slate-700">Add New Venue</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Venue Name *" value={newVenue.name} onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })} placeholder="e.g., Seminar Hall" />
                <Input label="Building" value={newVenue.building} onChange={(e) => setNewVenue({ ...newVenue, building: e.target.value })} />
                <Input label="Block" value={newVenue.block} onChange={(e) => setNewVenue({ ...newVenue, block: e.target.value })} />
                <Input label="Room / Lab" value={newVenue.room} onChange={(e) => setNewVenue({ ...newVenue, room: e.target.value })} />
                <Input label="Floor" value={newVenue.floor} onChange={(e) => setNewVenue({ ...newVenue, floor: e.target.value })} />
                <Input label="Capacity" type="number" value={newVenue.capacity} onChange={(e) => setNewVenue({ ...newVenue, capacity: e.target.value })} />
                <Input label="Latitude" value={newVenue.latitude} onChange={(e) => setNewVenue({ ...newVenue, latitude: e.target.value })} placeholder="17.3850" />
                <Input label="Longitude" value={newVenue.longitude} onChange={(e) => setNewVenue({ ...newVenue, longitude: e.target.value })} placeholder="78.4867" />
                <div className="sm:col-span-2">
                  <Input label="Google Maps URL" value={newVenue.mapUrl} onChange={(e) => setNewVenue({ ...newVenue, mapUrl: e.target.value })} placeholder="https://maps.google.com/..." />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleAddVenue} size="sm">
                  <Save className="mr-1 h-4 w-4" /> Save Venue
                </Button>
                <Button onClick={() => setShowAddVenue(false)} variant="ghost" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowAddVenue(true)} variant="outline">
              <MapPinPlus className="mr-2 h-4 w-4" /> Add Venue
            </Button>
          )}
        </div>
      )}

      {/* Schedule tab */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {sessions.length === 0 && !showAddSession && (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title="No sessions added"
              message="Add sessions to build your event schedule."
            />
          )}
          {sessions.map((s, i) => {
            const venue = venues.find((v) => v.id === s.venue_id);
            const isEditing = editingSession === s.id;
            return (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input label="Title" value={s.title} onChange={(e) => setSessions(prev => prev.map(p => p.id === s.id ? { ...p, title: e.target.value } : p))} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input label="Start Time" type="time" value={s.start_time} onChange={(e) => setSessions(prev => prev.map(p => p.id === s.id ? { ...p, start_time: e.target.value } : p))} />
                      <Input label="End Time" type="time" value={s.end_time || ''} onChange={(e) => setSessions(prev => prev.map(p => p.id === s.id ? { ...p, end_time: e.target.value } : p))} />
                      <Select label="Venue" value={s.venue_id || ''} onChange={(e) => setSessions(prev => prev.map(p => p.id === s.id ? { ...p, venue_id: e.target.value || null } : p))}>
                        <option value="">No venue</option>
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdateSession(s, { title: s.title, start_time: s.start_time, end_time: s.end_time, venue_id: s.venue_id })} size="sm">
                        <Save className="mr-1 h-4 w-4" /> Save
                      </Button>
                      <Button onClick={() => setEditingSession(null)} variant="ghost" size="sm">
                        <X className="mr-1 h-4 w-4" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100 text-sm font-bold text-teal-700">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{s.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.start_time}{s.end_time ? ` – ${s.end_time}` : ''}</span>
                        {venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{venue.name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingSession(s.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteSession(s)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {showAddSession ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
              <h4 className="mb-3 text-sm font-bold text-slate-700">Add New Session</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Session Title *" value={newSession.title} onChange={(e) => setNewSession({ ...newSession, title: e.target.value })} placeholder="e.g., Coding Round" />
                <Select label="Venue" value={newSession.venue_id} onChange={(e) => setNewSession({ ...newSession, venue_id: e.target.value })}>
                  <option value="">Select venue (optional)</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </Select>
                <Input label="Start Time *" type="time" value={newSession.start_time} onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })} />
                <Input label="End Time" type="time" value={newSession.end_time} onChange={(e) => setNewSession({ ...newSession, end_time: e.target.value })} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleAddSession} size="sm">
                  <Save className="mr-1 h-4 w-4" /> Add Session
                </Button>
                <Button onClick={() => setShowAddSession(false)} variant="ghost" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowAddSession(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Session
            </Button>
          )}
        </div>
      )}

      {/* Registrations tab */}
      {tab === 'registrations' && (
        <div className="space-y-4">
          {registrations.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No registrations yet"
              message="Registrations will appear here once attendees register for your event."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">College</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Reg ID</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-700">{reg.full_name}</td>
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
        </div>
      )}

      <ConfirmDialog
        open={!!deleteSession}
        onClose={() => setDeleteSession(null)}
        onConfirm={handleDeleteSession}
        title="Delete Session"
        message={`Are you sure you want to delete "${deleteSession?.title}"?`}
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={!!deleteVenue}
        onClose={() => setDeleteVenue(null)}
        onConfirm={handleDeleteVenue}
        title="Delete Venue"
        message={`Are you sure you want to delete "${deleteVenue?.name}"? Sessions using this venue will be unassigned.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
