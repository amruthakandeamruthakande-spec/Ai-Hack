import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, User, Mail, Phone, School, Hash, GitBranch, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Event } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Alert, EmptyState } from '@/components/ui/index';

interface RegistrationFormProps {
  eventId: string;
  onBack: () => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function RegistrationForm({ eventId, onBack, onNavigate }: RegistrationFormProps) {
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingReg, setExistingReg] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    college: '',
    student_id: '',
    branch: '',
    year: '',
    team_name: '',
    team_members: '',
    team_size: '',
    technical_skills: '',
    prev_experience: '',
    area_of_interest: '',
  });

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
    setEvent(eventData as Event | null);

    if (profile) {
      const { data: reg } = await supabase
        .from('registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('attendee_id', profile.id)
        .maybeSingle();
      if (reg) setExistingReg(true);

      setForm((prev) => ({
        ...prev,
        full_name: profile.full_name || '',
        email: profile.email || '',
        college: profile.college || '',
        student_id: profile.student_id || '',
        branch: profile.branch || '',
        year: profile.year || '',
        phone: profile.phone || '',
      }));
    }
    setLoading(false);
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profile) {
      setError('You must be logged in to register.');
      return;
    }

    if (!form.full_name || !form.email || !form.phone || !form.college) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: regIdData } = await supabase.rpc('generate_registration_id');
      const regId = regIdData as string;

      const insertData: Record<string, string | number | null> = {
        event_id: eventId,
        attendee_id: profile.id,
        registration_id: regId,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        college: form.college,
        student_id: form.student_id || null,
        branch: form.branch || null,
        year: form.year || null,
      };

      if (event?.category === 'hackathon') {
        insertData.team_name = form.team_name || null;
        insertData.team_members = form.team_members || null;
        insertData.team_size = form.team_size ? parseInt(form.team_size) : null;
        insertData.technical_skills = form.technical_skills || null;
      }
      if (event?.category === 'workshop') {
        insertData.prev_experience = form.prev_experience || null;
        insertData.area_of_interest = form.area_of_interest || null;
      }
      if (event?.category === 'competition') {
        insertData.team_name = form.team_name || null;
        insertData.team_members = form.team_members || null;
        insertData.team_size = form.team_size ? parseInt(form.team_size) : null;
      }

      const { data: regData, error: insertError } = await supabase
        .from('registrations')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You are already registered for this event.');
        } else {
          setError(insertError.message);
        }
        setSubmitting(false);
        return;
      }

      onNavigate('attendee-reg-success', { registrationId: regData.id });
    } catch (err) {
      setError('Registration failed. Please try again.');
      setSubmitting(false);
    }
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

  if (existingReg) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-800">Already Registered</h2>
          <p className="mt-2 text-sm text-slate-600">You have already registered for this event.</p>
          <Button onClick={() => onNavigate('attendee-registrations')} className="mt-6">
            View My Registrations
          </Button>
        </div>
      </div>
    );
  }

  const isHackathon = event.category === 'hackathon';
  const isWorkshop = event.category === 'workshop';
  const isCompetition = event.category === 'competition';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to event details
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-800">Register for {event.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Please fill in the registration form below.</p>

        {error && <div className="mt-4"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold text-slate-400">BASIC DETAILS</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full Name *" value={form.full_name} onChange={(e) => handleChange('full_name', e.target.value)} icon={<User className="h-4 w-4" />} required />
              <Input label="Email *" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} icon={<Mail className="h-4 w-4" />} required />
              <Input label="Phone Number *" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} icon={<Phone className="h-4 w-4" />} required />
              <Input label="College Name *" value={form.college} onChange={(e) => handleChange('college', e.target.value)} icon={<School className="h-4 w-4" />} required />
              <Input label="Student ID / Roll Number" value={form.student_id} onChange={(e) => handleChange('student_id', e.target.value)} icon={<Hash className="h-4 w-4" />} />
              <Input label="Branch / Department" value={form.branch} onChange={(e) => handleChange('branch', e.target.value)} icon={<GitBranch className="h-4 w-4" />} />
              <Select label="Year" value={form.year} onChange={(e) => handleChange('year', e.target.value)}>
                <option value="">Select year</option>
                <option value="1st">1st Year</option>
                <option value="2nd">2nd Year</option>
                <option value="3rd">3rd Year</option>
                <option value="4th">4th Year</option>
                <option value="5th">5th Year</option>
              </Select>
            </div>
          </div>

          {(isHackathon || isCompetition) && (
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="mb-3 text-xs font-semibold text-blue-400">EVENT-SPECIFIC DETAILS</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Team Name" value={form.team_name} onChange={(e) => handleChange('team_name', e.target.value)} />
                <Input label="Team Size" type="number" value={form.team_size} onChange={(e) => handleChange('team_size', e.target.value)} />
                <div className="sm:col-span-2">
                  <Textarea label="Team Members (names)" rows={3} value={form.team_members} onChange={(e) => handleChange('team_members', e.target.value)} placeholder="Enter each team member's name on a separate line" />
                </div>
                {isHackathon && (
                  <div className="sm:col-span-2">
                    <Textarea label="Technical Skills" rows={2} value={form.technical_skills} onChange={(e) => handleChange('technical_skills', e.target.value)} placeholder="e.g., Python, React, UI/UX Design" />
                  </div>
                )}
              </div>
            </div>
          )}

          {isWorkshop && (
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="mb-3 text-xs font-semibold text-blue-400">EVENT-SPECIFIC DETAILS</p>
              <div className="grid gap-4">
                <Textarea label="Previous Experience" rows={2} value={form.prev_experience} onChange={(e) => handleChange('prev_experience', e.target.value)} placeholder="Describe any relevant experience" />
                <Textarea label="Area of Interest" rows={2} value={form.area_of_interest} onChange={(e) => handleChange('area_of_interest', e.target.value)} placeholder="What topics are you interested in?" />
              </div>
            </div>
          )}

          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              <Calendar className="mr-1 inline h-4 w-4" />
              Please verify your details before registration. You cannot register twice for the same event.
            </p>
          </div>

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            Submit Registration
          </Button>
        </form>
      </div>
    </div>
  );
}
