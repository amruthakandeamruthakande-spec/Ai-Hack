import { useEffect, useState } from 'react';
import { QrCode, Download, Copy, Check, Calendar, MapPin, Building, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Event, EventSession, Venue, QrToken } from '@/types';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge, EmptyState, Alert } from '@/components/ui/index';
import { generateToken } from '@/lib/utils';

interface QrGenerationProps {
  eventId?: string;
  onBack: () => void;
}

export function QrGeneration({ eventId, onBack }: QrGenerationProps) {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [qrTokens, setQrTokens] = useState<(QrToken & { event_sessions: EventSession; venues: Venue; events: Event })[]>([]);
  const [selectedEvent, setSelectedEvent] = useState(eventId || '');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadEventData(selectedEvent);
    } else {
      setSessions([]);
      setVenues([]);
      setQrTokens([]);
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    const { data } = await supabase.from('events').select('*').eq('organizer_id', profile?.id).order('created_at', { ascending: false });
    setEvents((data as Event[]) || []);
    if (eventId) loadEventData(eventId);
    setLoading(false);
  };

  const loadEventData = async (id: string) => {
    const [sessRes, venRes, qrRes] = await Promise.all([
      supabase.from('event_sessions').select('*').eq('event_id', id).order('sort_order', { ascending: true }),
      supabase.from('venues').select('*').eq('event_id', id).order('created_at', { ascending: true }),
      supabase.from('qr_tokens').select('*, event_sessions(*), venues(*), events(*)').eq('event_id', id),
    ]);
    setSessions((sessRes.data as EventSession[]) || []);
    setVenues((venRes.data as Venue[]) || []);
    setQrTokens((qrRes.data as (QrToken & { event_sessions: EventSession; venues: Venue; events: Event })[]) || []);
  };

  const handleGenerate = async () => {
    if (!selectedSession || !selectedVenue) {
      setError('Please select a session and venue.');
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const session = sessions.find((s) => s.id === selectedSession);
      const venue = venues.find((v) => v.id === selectedVenue);
      if (!session || !venue) {
        setError('Invalid session or venue.');
        setGenerating(false);
        return;
      }
      const token = generateToken();
      const { data, error: insertError } = await supabase
        .from('qr_tokens')
        .insert({
          event_id: selectedEvent,
          session_id: selectedSession,
          venue_id: selectedVenue,
          token,
          created_by: profile?.id,
        })
        .select('*, event_sessions(*), venues(*), events(*)')
        .single();
      if (insertError) {
        if (insertError.code === '23505') {
          setError('A QR code already exists for this session and venue combination.');
        } else {
          setError(insertError.message);
        }
        setGenerating(false);
        return;
      }
      setQrTokens((prev) => [...prev, data as (QrToken & { event_sessions: EventSession; venues: Venue; events: Event })]);
      setSuccess('QR code generated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to generate QR code.');
    }
    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    const { error: delError } = await supabase.from('qr_tokens').delete().eq('id', id);
    if (delError) {
      setError(delError.message);
      return;
    }
    setQrTokens((prev) => prev.filter((q) => q.id !== id));
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(''), 2000);
  };

  const downloadQr = (token: string, label: string) => {
    // Generate a simple QR code as an SVG-based data URL using a public QR API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(token)}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${label}.png`;
    link.target = '_blank';
    link.click();
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
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
        <Calendar className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-slate-800">QR Code Generation</h1>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {events.length === 0 ? (
        <EmptyState
          icon={<QrCode className="h-12 w-12" />}
          title="No events available"
          message="Create an event first before generating QR codes."
        />
      ) : (
        <>
          {/* Generator */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Generate New QR Code</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select label="Event" value={selectedEvent} onChange={(e) => { setSelectedEvent(e.target.value); setSelectedSession(''); setSelectedVenue(''); }}>
                <option value="">Select event</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </Select>
              <Select label="Session" value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} disabled={!selectedEvent}>
                <option value="">Select session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} ({s.start_time})</option>
                ))}
              </Select>
              <Select label="Venue" value={selectedVenue} onChange={(e) => setSelectedVenue(e.target.value)} disabled={!selectedSession}>
                <option value="">Select venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </Select>
            </div>
            <Button onClick={handleGenerate} loading={generating} disabled={!selectedSession || !selectedVenue} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Generate QR Code
            </Button>
          </div>

          {/* Existing QR Codes */}
          {qrTokens.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Generated QR Codes ({qrTokens.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {qrTokens.map((qr) => (
                  <div key={qr.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">{qr.events.name}</p>
                        <h3 className="font-semibold text-slate-800">{qr.event_sessions.title}</h3>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Building className="h-3 w-3" />
                          {qr.venues.name}
                        </p>
                      </div>
                      <button onClick={() => handleDelete(qr.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-slate-50 p-4">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr.token)}`}
                        alt="QR Code"
                        className="h-40 w-40"
                      />
                      <Badge className="mt-3 border-teal-200 bg-teal-50 text-teal-700">
                        <QrCode className="h-3 w-3" />
                        Session QR
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => downloadQr(qr.token, qr.event_sessions.title)} variant="outline" size="sm" className="flex-1">
                        <Download className="mr-1 h-3.5 w-3.5" />
                        Download
                      </Button>
                      <Button onClick={() => copyToken(qr.token)} variant="ghost" size="sm" className="flex-1">
                        {copied === qr.token ? <><Check className="mr-1 h-3.5 w-3.5" /> Copied</> : <><Copy className="mr-1 h-3.5 w-3.5" /> Copy Token</>}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEvent && qrTokens.length === 0 && (
            <EmptyState
              icon={<QrCode className="h-12 w-12" />}
              title="No QR codes yet"
              message="Generate QR codes for your sessions to enable attendee check-in."
            />
          )}
        </>
      )}
    </div>
  );
}
