export type Role = 'attendee' | 'organizer';

export type EventCategory =
  | 'hackathon'
  | 'workshop'
  | 'technical'
  | 'fest'
  | 'competition'
  | 'seminar'
  | 'other';

export type EventStatus = 'draft' | 'published' | 'closed' | 'completed';

export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled';

export type CheckInStatus = 'valid' | 'duplicate';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  college: string | null;
  phone: string | null;
  student_id: string | null;
  branch: string | null;
  year: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  name: string;
  category: EventCategory;
  poster_url: string | null;
  short_description: string | null;
  detailed_description: string | null;
  organizer_club: string | null;
  college: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string | null;
  reg_open_date: string | null;
  reg_deadline: string | null;
  team_size: number;
  eligibility: string | null;
  rules: string | null;
  requirements: string | null;
  contact_info: string | null;
  status: EventStatus;
  venue_label: string | null;
  created_at: string;
}

export interface Venue {
  id: string;
  organizer_id: string;
  event_id: string | null;
  name: string;
  building: string | null;
  block: string | null;
  room: string | null;
  floor: string | null;
  capacity: number;
  latitude: number | null;
  longitude: number | null;
  map_url: string | null;
  created_at: string;
}

export interface EventSession {
  id: string;
  event_id: string;
  venue_id: string | null;
  title: string;
  start_time: string;
  end_time: string | null;
  sort_order: number;
  created_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  attendee_id: string;
  registration_id: string | null;
  status: RegistrationStatus;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  college: string | null;
  student_id: string | null;
  branch: string | null;
  year: string | null;
  team_name: string | null;
  team_members: string | null;
  team_size: number | null;
  technical_skills: string | null;
  prev_experience: string | null;
  area_of_interest: string | null;
  registered_at: string;
}

export interface CheckIn {
  id: string;
  attendee_id: string;
  event_id: string;
  session_id: string;
  venue_id: string;
  qr_token_id: string | null;
  status: CheckInStatus;
  checked_in_at: string;
}

export interface QrToken {
  id: string;
  event_id: string;
  session_id: string;
  venue_id: string;
  token: string;
  created_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  event_id: string | null;
  session_id: string | null;
  read: boolean;
  created_at: string;
}

export interface EventWithDetails extends Event {
  registrations?: { count: number }[];
  sessions?: EventSession[];
}

export interface RegistrationWithEvent extends Registration {
  events: Event;
}

export interface SessionWithVenue extends EventSession {
  venues: Venue | null;
}

export interface CheckInWithDetails extends CheckIn {
  events: Event;
  event_sessions: EventSession;
  venues: Venue;
}
