import { type ReactNode, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Bell, MapPin, User, LogOut, Menu, X, Calendar, Home, ClipboardList, QrCode, Users, LayoutDashboard, PlusCircle, FileText } from 'lucide-react';

interface NavItem {
  label: string;
  icon: ReactNode;
  page: string;
}

const attendeeNav: NavItem[] = [
  { label: 'Dashboard', icon: <Home className="h-5 w-5" />, page: 'attendee-home' },
  { label: 'Browse Events', icon: <Calendar className="h-5 w-5" />, page: 'attendee-browse' },
  { label: 'My Registrations', icon: <ClipboardList className="h-5 w-5" />, page: 'attendee-registrations' },
  { label: 'My Schedule', icon: <Calendar className="h-5 w-5" />, page: 'attendee-schedule' },
  { label: 'Map', icon: <MapPin className="h-5 w-5" />, page: 'attendee-map' },
  { label: 'Scan QR', icon: <QrCode className="h-5 w-5" />, page: 'attendee-scan' },
  { label: 'Live Crowd', icon: <Users className="h-5 w-5" />, page: 'attendee-crowd' },
];

const organizerNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, page: 'organizer-home' },
  { label: 'My Events', icon: <Calendar className="h-5 w-5" />, page: 'organizer-events' },
  { label: 'Create Event', icon: <PlusCircle className="h-5 w-5" />, page: 'organizer-create' },
  { label: 'Registrations', icon: <ClipboardList className="h-5 w-5" />, page: 'organizer-registrations' },
  { label: 'QR Codes', icon: <QrCode className="h-5 w-5" />, page: 'organizer-qr' },
  { label: 'Live Crowd', icon: <Users className="h-5 w-5" />, page: 'organizer-crowd' },
];

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onBack?: () => void;
  title?: string;
  notificationCount?: number;
}

export function DashboardLayout({ children, currentPage, onNavigate, onBack, title, notificationCount = 0 }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isOrganizer = profile?.role === 'organizer';
  const navItems = isOrganizer ? organizerNav : attendeeNav;

  const handleNav = (page: string) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const handleProfileClick = () => {
    onNavigate(isOrganizer ? 'organizer-profile' : 'attendee-profile');
    setSidebarOpen(false);
  };

  const handleNotifications = () => {
    onNavigate(isOrganizer ? 'organizer-notifications' : 'attendee-notifications');
    setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
          <Menu className="h-6 w-6" />
        </button>
        <span className="text-sm font-bold text-teal-600">EventFlow</span>
        <div className="flex items-center gap-1">
          <button onClick={handleNotifications} className="relative rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{notificationCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-800">EventFlow</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 py-4">
          <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-400">{isOrganizer ? 'ORGANIZER' : 'ATTENDEE'}</p>
            <p className="truncate text-sm font-semibold text-slate-700">{profile?.full_name}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => handleNav(item.page)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  currentPage === item.page
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-100 p-3">
          <button onClick={handleNotifications} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Bell className="h-5 w-5" />
            Notifications
            {notificationCount > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{notificationCount}</span>}
          </button>
          <button onClick={handleProfileClick} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <User className="h-5 w-5" />
            Profile
          </button>
          <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50">
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="hidden items-center justify-between border-b border-slate-200 bg-white px-8 py-4 lg:flex">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            {title && <h1 className="text-xl font-bold text-slate-800">{title}</h1>}
          </div>
          <button onClick={handleNotifications} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{notificationCount}</span>
            )}
          </button>
        </div>

        {/* Mobile back + title */}
        {(onBack || title) && (
          <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
            {onBack && (
              <button onClick={onBack} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            {title && <h1 className="text-lg font-bold text-slate-800">{title}</h1>}
          </div>
        )}

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export { FileText };
