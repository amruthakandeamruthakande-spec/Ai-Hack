/*
# EventFlow — Complete Database Schema

## Overview
Creates the full schema for EventFlow, a college event management platform with two roles: Attendees and Organizers.

## New Tables
1. `profiles` — extends auth.users with role (attendee/organizer) and display name
2. `events` — events created by organizers
3. `venues` — physical locations created by organizers (with lat/lng for maps)
4. `event_sessions` — sessions within an event (each linked to a venue)
5. `qr_tokens` — secure tokens for QR codes per session+venue
6. `registrations` — attendee registrations for events
7. `check_ins` — QR-based check-ins, unique per attendee+session+venue
8. `notifications` — user notifications for schedule/venue changes etc.

## Security
- RLS enabled on all tables
- Owner-scoped policies: organizers manage their own events/sessions/venues/QR; attendees see their own registrations/check-ins/notifications
- Events visible to all authenticated users (browse) when published
- Venues visible to all authenticated users for published events (map)
- Registrations: attendees see own; organizers see registrations for their events
- Unique constraint on check_ins prevents duplicate check-in counting
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'attendee' CHECK (role IN ('attendee', 'organizer')),
  college text,
  phone text,
  student_id text,
  branch text,
  year text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  poster_url text,
  short_description text,
  detailed_description text,
  organizer_club text,
  college text,
  start_date date NOT NULL,
  end_date date,
  start_time text NOT NULL,
  end_time text,
  reg_open_date date,
  reg_deadline date,
  team_size int DEFAULT 1,
  eligibility text,
  rules text,
  requirements text,
  contact_info text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'completed')),
  venue_label text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT
  TO authenticated USING (
    auth.uid() = organizer_id
    OR status = 'published'
  );

DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events FOR UPDATE
  TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE
  TO authenticated USING (auth.uid() = organizer_id);

-- ============================================================
-- VENUES
-- ============================================================
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  building text,
  block text,
  room text,
  floor text,
  capacity int DEFAULT 0,
  latitude double precision,
  longitude double precision,
  map_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venues_select" ON venues;
CREATE POLICY "venues_select" ON venues FOR SELECT
  TO authenticated USING (
    auth.uid() = organizer_id
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = venues.event_id AND e.status = 'published'
    )
  );

DROP POLICY IF EXISTS "venues_insert" ON venues;
CREATE POLICY "venues_insert" ON venues FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "venues_update" ON venues;
CREATE POLICY "venues_update" ON venues FOR UPDATE
  TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "venues_delete" ON venues;
CREATE POLICY "venues_delete" ON venues FOR DELETE
  TO authenticated USING (auth.uid() = organizer_id);

-- ============================================================
-- EVENT SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS event_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  title text NOT NULL,
  start_time text NOT NULL,
  end_time text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select" ON event_sessions;
CREATE POLICY "sessions_select" ON event_sessions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_sessions.event_id AND (e.organizer_id = auth.uid() OR e.status = 'published'))
  );

DROP POLICY IF EXISTS "sessions_insert" ON event_sessions;
CREATE POLICY "sessions_insert" ON event_sessions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_sessions.event_id AND e.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "sessions_update" ON event_sessions;
CREATE POLICY "sessions_update" ON event_sessions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_sessions.event_id AND e.organizer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_sessions.event_id AND e.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "sessions_delete" ON event_sessions;
CREATE POLICY "sessions_delete" ON event_sessions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_sessions.event_id AND e.organizer_id = auth.uid())
  );

-- ============================================================
-- QR TOKENS (generated per session+venue)
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, venue_id)
);

ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qrtokens_select" ON qr_tokens;
CREATE POLICY "qrtokens_select" ON qr_tokens FOR SELECT
  TO authenticated USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM events e WHERE e.id = qr_tokens.event_id AND e.status = 'published')
  );

DROP POLICY IF EXISTS "qrtokens_insert" ON qr_tokens;
CREATE POLICY "qrtokens_insert" ON qr_tokens FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "qrtokens_delete" ON qr_tokens;
CREATE POLICY "qrtokens_delete" ON qr_tokens FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id text UNIQUE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlisted', 'cancelled')),
  full_name text,
  email text,
  phone text,
  college text,
  student_id text,
  branch text,
  year text,
  team_name text,
  team_members text,
  team_size int,
  technical_skills text,
  prev_experience text,
  area_of_interest text,
  registered_at timestamptz DEFAULT now()
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registrations_select" ON registrations;
CREATE POLICY "registrations_select" ON registrations FOR SELECT
  TO authenticated USING (
    auth.uid() = attendee_id
    OR EXISTS (SELECT 1 FROM events e WHERE e.id = registrations.event_id AND e.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "registrations_insert" ON registrations;
CREATE POLICY "registrations_insert" ON registrations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = attendee_id);

DROP POLICY IF EXISTS "registrations_update" ON registrations;
CREATE POLICY "registrations_update" ON registrations FOR UPDATE
  TO authenticated USING (auth.uid() = attendee_id) WITH CHECK (auth.uid() = attendee_id);

DROP POLICY IF EXISTS "registrations_delete" ON registrations;
CREATE POLICY "registrations_delete" ON registrations FOR DELETE
  TO authenticated USING (auth.uid() = attendee_id);

-- ============================================================
-- CHECK-INS (QR scan results)
-- ============================================================
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  qr_token_id uuid REFERENCES qr_tokens(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'duplicate')),
  checked_in_at timestamptz DEFAULT now(),
  UNIQUE(attendee_id, session_id, venue_id)
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkins_select" ON check_ins;
CREATE POLICY "checkins_select" ON check_ins FOR SELECT
  TO authenticated USING (
    auth.uid() = attendee_id
    OR EXISTS (SELECT 1 FROM events e WHERE e.id = check_ins.event_id AND e.organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "checkins_insert" ON check_ins;
CREATE POLICY "checkins_insert" ON check_ins FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = attendee_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  message text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  session_id uuid REFERENCES event_sessions(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_venues_event ON venues(event_id);
CREATE INDEX IF NOT EXISTS idx_sessions_event ON event_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_sessions_venue ON event_sessions(venue_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_attendee ON registrations(attendee_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event ON check_ins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_attendee ON check_ins(attendee_id);
CREATE INDEX IF NOT EXISTS idx_qrtokens_token ON qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'attendee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION: generate registration ID
-- ============================================================
CREATE OR REPLACE FUNCTION generate_registration_id()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'EVF-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD((EXTRACT(EPOCH FROM now())::bigint % 1000000)::text, 4, '0')
$$;

-- ============================================================
-- FUNCTION: process check-in (handles duplicate prevention)
-- Returns: 'valid' for first check-in, 'duplicate' for repeat
-- ============================================================
CREATE OR REPLACE FUNCTION process_check_in(
  p_attendee_id uuid,
  p_event_id uuid,
  p_session_id uuid,
  p_venue_id uuid,
  p_qr_token text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing record;
  v_token record;
BEGIN
  SELECT * INTO v_token FROM qr_tokens WHERE token = p_qr_token LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid QR token';
  END IF;

  IF v_token.session_id != p_session_id OR v_token.venue_id != p_venue_id OR v_token.event_id != p_event_id THEN
    RAISE EXCEPTION 'QR token does not match session/venue';
  END IF;

  SELECT * INTO v_existing FROM check_ins
  WHERE attendee_id = p_attendee_id AND session_id = p_session_id AND venue_id = p_venue_id AND status = 'valid'
  LIMIT 1;

  IF FOUND THEN
    RETURN 'duplicate';
  END IF;

  INSERT INTO check_ins (attendee_id, event_id, session_id, venue_id, qr_token_id, status)
  VALUES (p_attendee_id, p_event_id, p_session_id, p_venue_id, v_token.id, 'valid');

  RETURN 'valid';
END;
$$;