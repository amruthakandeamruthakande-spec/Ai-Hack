import { useEffect, useState } from 'react';
import { MapPin, Navigation, Crosshair, ExternalLink, Building } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Venue, Event, EventSession } from '@/types';
import { Badge, EmptyState } from '@/components/ui/index';

interface CampusMapProps {
  selectedVenueId?: string;
}

export function CampusMap({ selectedVenueId }: CampusMapProps) {
  const { profile } = useAuth();
  const [venues, setVenues] = useState<(Venue & { events: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  useEffect(() => {
    loadVenues();
    requestLocation();
  }, []);

  useEffect(() => {
    if (selectedVenueId && venues.length > 0) {
      const v = venues.find((v) => v.id === selectedVenueId);
      if (v) setSelectedVenue(v);
    }
  }, [selectedVenueId, venues]);

  const loadVenues = async () => {
    // Get venues from published events that the attendee is registered for
    const { data: regs } = await supabase
      .from('registrations')
      .select('event_id')
      .eq('attendee_id', profile?.id)
      .eq('status', 'registered');

    const regEventIds = ((regs as { event_id: string }[]) || []).map((r) => r.event_id);
    let venueQuery = supabase.from('venues').select('*, events(*)');

    // If registered for events, get those venues. Also get all published event venues.
    const { data: allVenueData } = await supabase
      .from('venues')
      .select('*, events(*)')
      .in('event_id', regEventIds.length > 0 ? regEventIds : ['00000000-0000-0000-0000-000000000000']);

    // Also get venues from all published events
    const { data: publishedEvents } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'published');
    const publishedIds = ((publishedEvents as { id: string }[]) || []).map((e) => e.id);
    const { data: publishedVenues } = await supabase
      .from('venues')
      .select('*, events(*)')
      .in('event_id', publishedIds.length > 0 ? publishedIds : ['00000000-0000-0000-0000-000000000000']);

    const allVenues = [...((allVenueData as (Venue & { events: Event })[]) || []), ...((publishedVenues as (Venue & { events: Event })[]) || [])];
    // Deduplicate by id
    const uniqueMap = new Map<string, Venue & { events: Event }>();
    allVenues.forEach((v) => uniqueMap.set(v.id, v));
    setVenues(Array.from(uniqueMap.values()));
    setLoading(false);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setLocationError('Could not access your location. Please enable location permissions.');
      },
      { enableHighAccuracy: true }
    );
  };

  const openInGoogleMaps = (venue: Venue) => {
    if (userLocation && venue.latitude && venue.longitude) {
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${venue.latitude},${venue.longitude}`;
      window.open(url, '_blank');
    } else if (venue.latitude && venue.longitude) {
      const url = `https://www.google.com/maps?q=${venue.latitude},${venue.longitude}`;
      window.open(url, '_blank');
    } else if (venue.map_url) {
      window.open(venue.map_url, '_blank');
    } else {
      const query = encodeURIComponent(`${venue.name} ${venue.building || ''} ${venue.block || ''} ${venue.room || ''}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const openAllInMaps = () => {
    if (userLocation) {
      const dests = venues.filter((v) => v.latitude && v.longitude).map((v) => `${v.latitude},${v.longitude}`);
      if (dests.length === 0) return;
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${dests.join('/')}`;
      window.open(url, '_blank');
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Campus Map</h1>
        {userLocation && venues.length > 0 && (
          <button onClick={openAllInMaps} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            <Navigation className="h-4 w-4" />
            Navigate to all
          </button>
        )}
      </div>

      {/* Current location */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <Crosshair className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Your Location</p>
            {userLocation ? (
              <p className="text-xs text-slate-500">{userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</p>
            ) : locationError ? (
              <p className="text-xs text-amber-600">{locationError}</p>
            ) : (
              <p className="text-xs text-slate-400">Detecting location...</p>
            )}
          </div>
          <button onClick={requestLocation} className="ml-auto rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
            Refresh
          </button>
        </div>
      </div>

      {/* Map embed */}
      {venues.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <iframe
            title="Campus Map"
            width="100%"
            height="400"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${venues.filter((v) => v.latitude && v.longitude).map((v) => `${v.latitude},${v.longitude}`).join('&q=')}&output=embed`}
            style={{ border: 0 }}
          />
        </div>
      )}

      {/* Venue list */}
      {venues.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="No venues available"
          message="Venue locations will appear here once organizers assign them to events."
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800">Event Venues ({venues.length})</h2>
          {venues.map((venue) => {
            const distance = userLocation && venue.latitude && venue.longitude
              ? calculateDistance(userLocation.lat, userLocation.lng, venue.latitude, venue.longitude)
              : null;
            return (
              <div key={venue.id} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100">
                  <Building className="h-6 w-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{venue.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[venue.building, venue.block, venue.room, venue.floor].filter(Boolean).join(', ')}
                  </p>
                  {venue.events && (
                    <Badge className="mt-2 border-slate-200 bg-slate-50 text-slate-600">{venue.events.name}</Badge>
                  )}
                  {distance !== null && (
                    <p className="mt-1 text-xs font-medium text-blue-600">
                      ~{(distance / 1000).toFixed(1)} km away · ~{Math.ceil(distance / 80)} min walk
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openInGoogleMaps(venue)}
                  className="inline-flex items-center gap-1 rounded-xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-600 hover:bg-teal-100"
                >
                  <Navigation className="h-4 w-4" />
                  Navigate
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
