import { Calendar, MapPin, QrCode, Users, ArrowRight } from 'lucide-react';

interface WelcomePageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function WelcomePage({ onGetStarted, onLogin }: WelcomePageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      {/* Decorative blobs */}
      <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 shadow-lg shadow-teal-500/30">
            <Calendar className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-bold text-white">EventFlow</span>
        </div>

        <div className="mb-3 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Discover Events.
          </h1>
          <h1 className="mt-1 text-4xl font-bold text-teal-400 sm:text-5xl">
            Participate. Stay Connected.
          </h1>
        </div>

        <p className="mb-10 max-w-lg text-center text-base text-slate-300 sm:text-lg">
          A smart platform to discover, register, navigate, and stay updated with college events — all in one place.
        </p>

        <div className="mb-10 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:bg-teal-400 hover:shadow-teal-500/40"
          >
            Get Started
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={onLogin}
            className="inline-flex items-center justify-center rounded-xl border-2 border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
          >
            Login
          </button>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: <Calendar className="h-6 w-6" />, label: 'Discover Events' },
            { icon: <MapPin className="h-6 w-6" />, label: 'Navigate Venues' },
            { icon: <QrCode className="h-6 w-6" />, label: 'QR Check-in' },
            { icon: <Users className="h-6 w-6" />, label: 'Live Crowd' },
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm">
              <div className="text-teal-400">{f.icon}</div>
              <span className="text-xs font-medium text-slate-300 sm:text-sm">{f.label}</span>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-slate-400">
          Already have an account?{' '}
          <button onClick={onLogin} className="font-semibold text-teal-400 hover:text-teal-300">
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
}
