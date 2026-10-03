import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';

// Auth pages
import { WelcomePage } from '@/pages/WelcomePage';
import { RoleSelectionPage } from '@/pages/RoleSelectionPage';
import { LoginPage } from '@/pages/LoginPage';

// Shared pages
import { NotificationsPage } from '@/pages/shared/NotificationsPage';
import { ProfilePage } from '@/pages/shared/ProfilePage';

// Attendee pages
import { AttendeeHome } from '@/pages/attendee/AttendeeHome';
import { BrowseEvents } from '@/pages/attendee/BrowseEvents';
import { EventDetails } from '@/pages/attendee/EventDetails';
import { RegistrationForm } from '@/pages/attendee/RegistrationForm';
import { RegistrationSuccess } from '@/pages/attendee/RegistrationSuccess';
import { MyRegistrations } from '@/pages/attendee/MyRegistrations';
import { MySchedule } from '@/pages/attendee/MySchedule';
import { CampusMap } from '@/pages/attendee/CampusMap';
import { QrScanner } from '@/pages/attendee/QrScanner';
import { LiveCrowd } from '@/pages/attendee/LiveCrowd';

// Organizer pages
import { OrganizerHome } from '@/pages/organizer/OrganizerHome';
import { MyEvents } from '@/pages/organizer/MyEvents';
import { CreateEvent } from '@/pages/organizer/CreateEvent';
import { EventManage } from '@/pages/organizer/EventManage';
import { QrGeneration } from '@/pages/organizer/QrGeneration';
import { OrganizerRegistrations } from '@/pages/organizer/OrganizerRegistrations';
import { OrganizerLiveCrowd } from '@/pages/organizer/OrganizerLiveCrowd';

// Layout
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingScreen } from '@/components/ui/index';

type PageState = {
  page: string;
  params: Record<string, string>;
  history: { page: string; params: Record<string, string> }[];
};

function App() {
  const { session, profile, loading, selectedRole, setSelectedRole } = useAuth();
  const [pageState, setPageState] = useState<PageState>({ page: 'welcome', params: {}, history: [] });
  const [notificationCount, setNotificationCount] = useState(0);

  const navigate = useCallback((page: string, params: Record<string, string> = {}) => {
    setPageState((prev) => ({
      page,
      params,
      history: [...prev.history, { page: prev.page, params: prev.params }].slice(-20),
    }));
  }, []);

  const goBack = useCallback(() => {
    setPageState((prev) => {
      if (prev.history.length === 0) return prev;
      const history = [...prev.history];
      const last = history.pop()!;
      return { page: last.page, params: last.params, history };
    });
  }, []);

  // Determine which page to show based on auth state
  useEffect(() => {
    if (loading) return;
    if (!session) {
      // Not logged in: show welcome, role selection, or login
      if (pageState.page === 'welcome' || pageState.page === 'role-selection' || pageState.page === 'login') {
        return;
      }
      // If trying to access a dashboard page without session, go to welcome
      setPageState({ page: 'welcome', params: {}, history: [] });
    } else if (profile) {
      // Logged in with profile
      const isAttendeePage = pageState.page.startsWith('attendee-');
      const isOrganizerPage = pageState.page.startsWith('organizer-');
      const roleMatches =
        (profile.role === 'attendee' && isAttendeePage) ||
        (profile.role === 'organizer' && isOrganizerPage);

      if (!roleMatches && (isAttendeePage || isOrganizerPage)) {
        // Redirect to correct dashboard
        setPageState({
          page: profile.role === 'organizer' ? 'organizer-home' : 'attendee-home',
          params: {},
          history: [],
        });
      }

      // If on auth pages while logged in, go to dashboard
      if (pageState.page === 'welcome' || pageState.page === 'role-selection' || pageState.page === 'login') {
        setPageState({
          page: profile.role === 'organizer' ? 'organizer-home' : 'attendee-home',
          params: {},
          history: [],
        });
      }
    }
  }, [session, profile, loading]);

  // Load notification count
  useEffect(() => {
    if (!profile) {
      setNotificationCount(0);
      return;
    }
    const loadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('read', false);
      setNotificationCount(count || 0);
    };
    loadCount();
    // Poll every 10 seconds
    const interval = setInterval(loadCount, 10000);
    return () => clearInterval(interval);
  }, [profile, pageState.page]);

  if (loading) {
    return <LoadingScreen message="Loading EventFlow..." />;
  }

  // ---- UNAUTHENTICATED PAGES ----
  if (!session) {
    switch (pageState.page) {
      case 'role-selection':
        return (
          <RoleSelectionPage
            onSelect={(role) => {
              setSelectedRole(role);
              navigate('login');
            }}
            onBack={() => navigate('welcome')}
          />
        );
      case 'login':
        return <LoginPage onBack={() => navigate('role-selection')} />;
      case 'welcome':
      default:
        return (
          <WelcomePage
            onGetStarted={() => navigate('role-selection')}
            onLogin={() => {
              if (!selectedRole) {
                navigate('role-selection');
              } else {
                navigate('login');
              }
            }}
          />
        );
    }
  }

  // ---- AUTHENTICATED PAGES ----
  if (!profile) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  const isOrganizer = profile.role === 'organizer';
  const { page, params } = pageState;

  // Attendee pages
  if (!isOrganizer) {
    switch (page) {
      case 'attendee-home':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} title="Attendee Dashboard" notificationCount={notificationCount}>
            <AttendeeHome onNavigate={navigate} />
          </DashboardLayout>
        );
      case 'attendee-browse':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Browse Events" notificationCount={notificationCount}>
            <BrowseEvents onNavigate={navigate} />
          </DashboardLayout>
        );
      case 'attendee-event-details':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Event Details" notificationCount={notificationCount}>
            <EventDetails eventId={params.eventId} onBack={goBack} onNavigate={navigate} />
          </DashboardLayout>
        );
      case 'attendee-register':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Registration" notificationCount={notificationCount}>
            <RegistrationForm eventId={params.eventId} onBack={goBack} onNavigate={navigate} />
          </DashboardLayout>
        );
      case 'attendee-reg-success':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Registration Successful" notificationCount={notificationCount}>
            <RegistrationSuccess registrationId={params.registrationId} onNavigate={navigate} />
          </DashboardLayout>
        );
      case 'attendee-registrations':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="My Registrations" notificationCount={notificationCount}>
            <MyRegistrations onNavigate={navigate} />
          </DashboardLayout>
        );
      case 'attendee-schedule':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="My Schedule" notificationCount={notificationCount}>
            <MySchedule onNavigate={navigate} selectedEventId={params.eventId} />
          </DashboardLayout>
        );
      case 'attendee-map':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Campus Map" notificationCount={notificationCount}>
            <CampusMap selectedVenueId={params.venueId} />
          </DashboardLayout>
        );
      case 'attendee-scan':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Scan QR" notificationCount={notificationCount}>
            <QrScanner />
          </DashboardLayout>
        );
      case 'attendee-crowd':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Live Crowd" notificationCount={notificationCount}>
            <LiveCrowd />
          </DashboardLayout>
        );
      case 'attendee-notifications':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Notifications" notificationCount={notificationCount}>
            <NotificationsPage onNavigate={navigate} />
          </DashboardLayout>
        );
      case 'attendee-profile':
        return (
          <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Profile" notificationCount={notificationCount}>
            <ProfilePage />
          </DashboardLayout>
        );
      default:
        navigate('attendee-home');
        return null;
    }
  }

  // Organizer pages
  switch (page) {
    case 'organizer-home':
      return (
        <DashboardLayout currentPage={page} onNavigate={navigate} title="Organizer Dashboard" notificationCount={notificationCount}>
          <OrganizerHome onNavigate={navigate} />
        </DashboardLayout>
      );
    case 'organizer-events':
      return (
        <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="My Events" notificationCount={notificationCount}>
          <MyEvents onNavigate={navigate} />
        </DashboardLayout>
      );
    case 'organizer-create':
      return (
        <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Create Event" notificationCount={notificationCount}>
          <CreateEvent onBack={goBack} onNavigate={navigate} />
        </DashboardLayout>
      );
    case 'organizer-event-manage':
      return (
        <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Manage Event" notificationCount={notificationCount}>
          <EventManage eventId={params.eventId} onBack={goBack} onNavigate={navigate} />
        </DashboardLayout>
      );
    case 'organizer-qr':
      return (
        <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="QR Codes" notificationCount={notificationCount}>
          <QrGeneration eventId={params.eventId} onBack={goBack} />
        </DashboardLayout>
      );
    case 'organizer-registrations':
      return (
        <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Registrations" notificationCount={notificationCount}>
          <OrganizerRegistrations onNavigate={navigate} />
        </DashboardLayout>
      );
    case 'organizer-crowd':
      return (
        <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Live Crowd" notificationCount={notificationCount}>
          <OrganizerLiveCrowd />
        </DashboardLayout>
      );
    case 'organizer-notifications':
      return (
        <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Notifications" notificationCount={notificationCount}>
          <NotificationsPage onNavigate={navigate} />
        </DashboardLayout>
      );
    case 'organizer-profile':
      return (
        <DashboardLayout currentPage={page} onNavigate={navigate} onBack={goBack} title="Profile" notificationCount={notificationCount}>
          <ProfilePage />
        </DashboardLayout>
      );
    default:
      navigate('organizer-home');
      return null;
  }
}

export default App;
