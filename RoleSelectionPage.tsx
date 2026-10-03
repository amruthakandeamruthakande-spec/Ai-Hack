import { GraduationCap, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Role } from '@/types';

interface RoleSelectionPageProps {
  onSelect: (role: Role) => void;
  onBack: () => void;
}

export function RoleSelectionPage({ onSelect, onBack }: RoleSelectionPageProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-800">How would you like to continue?</h1>
          <p className="mt-2 text-slate-500">Select your role to proceed. You can choose either option.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <button
            onClick={() => onSelect('attendee')}
            className="group flex flex-col items-center rounded-3xl border-2 border-slate-200 bg-white p-8 text-center transition-all hover:border-teal-400 hover:shadow-xl"
          >
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 transition-transform group-hover:scale-110">
              <GraduationCap className="h-10 w-10" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-800">Student / Attendee</h2>
            <p className="text-sm text-slate-500">
              Discover events, register, view schedules, navigate to venues, and check live crowd information.
            </p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-teal-600">
              Continue as Attendee
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>

          <button
            onClick={() => onSelect('organizer')}
            className="group flex flex-col items-center rounded-3xl border-2 border-slate-200 bg-white p-8 text-center transition-all hover:border-blue-400 hover:shadow-xl"
          >
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
              <Building2 className="h-10 w-10" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-800">Organizer</h2>
            <p className="text-sm text-slate-500">
              Create events, manage registrations, schedule venues, generate QR codes, and monitor attendance.
            </p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
              Continue as Organizer
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          The same login page is used for both roles. Your selection determines which dashboard you see after login.
        </p>
      </div>
    </div>
  );
}
