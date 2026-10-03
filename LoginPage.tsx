import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Calendar, User, GraduationCap, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/index';

interface LoginPageProps {
  onBack: () => void;
}

export function LoginPage({ onBack }: LoginPageProps) {
  const { selectedRole, signIn, signUp, setSelectedRole } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const role = selectedRole || 'attendee';
  const roleLabel = role === 'organizer' ? 'Organizer' : 'Student / Attendee';
  const RoleIcon = role === 'organizer' ? Building2 : GraduationCap;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
        }
      } else {
        if (fullName.trim().length < 2) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const { error: err } = await signUp(email, password, fullName, role);
        if (err) {
          setError(err);
        } else {
          setError('');
          setMode('login');
          setEmail('');
          setPassword('');
          setFullName('');
          setError('Account created! Please sign in with your credentials.');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchRole = () => {
    setSelectedRole(null);
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <button onClick={handleSwitchRole} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back to role selection
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome Back!</h1>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              <RoleIcon className="h-4 w-4" />
              Login as {roleLabel}
            </div>
          </div>

          {error && (
            <div className="mb-4">
              <Alert type={error.includes('Account created') ? 'success' : 'error'}>{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                icon={<User className="h-4 w-4" />}
                required
              />
            )}
            <Input
              label={role === 'organizer' ? 'Email / College Email' : 'Email / College Email'}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              icon={<Mail className="h-4 w-4" />}
              required
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                icon={<Lock className="h-4 w-4" />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {mode === 'login' && (
              <div className="text-right">
                <button type="button" className="text-sm font-medium text-teal-600 hover:text-teal-500">
                  Forgot Password?
                </button>
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              {mode === 'login' ? 'Login' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); }} className="font-semibold text-teal-600 hover:text-teal-500">
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="font-semibold text-teal-600 hover:text-teal-500">
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
