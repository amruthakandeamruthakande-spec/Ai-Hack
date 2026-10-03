import { useState, useEffect } from 'react';
import { User, Mail, Phone, School, Hash, GitBranch, Calendar, Save, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/index';

export function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    college: profile?.college || '',
    student_id: profile?.student_id || '',
    branch: profile?.branch || '',
    year: profile?.year || '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        college: profile.college || '',
        student_id: profile.student_id || '',
        branch: profile.branch || '',
        year: profile.year || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        phone: form.phone,
        college: form.college,
        student_id: form.student_id,
        branch: form.branch,
        year: form.year,
      })
      .eq('id', profile?.id);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
      await refreshProfile();
    }
    setSaving(false);
  };

  const isOrganizer = profile?.role === 'organizer';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Profile</h1>

      {/* Profile header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-500 text-2xl font-bold text-white">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{profile?.full_name}</h2>
            <p className="text-sm text-slate-500">{profile?.email}</p>
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isOrganizer ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'}`}>
              {isOrganizer ? 'Organizer' : 'Attendee'}
            </span>
          </div>
        </div>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Profile details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Personal Information</h3>
          {!editing && (
            <Button onClick={() => setEditing(true)} variant="outline" size="sm">
              Edit
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            icon={<User className="h-4 w-4" />}
            disabled={!editing}
          />
          <Input
            label="Email"
            value={profile?.email || ''}
            icon={<Mail className="h-4 w-4" />}
            disabled
          />
          <Input
            label="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            icon={<Phone className="h-4 w-4" />}
            disabled={!editing}
            placeholder="Enter your phone number"
          />
          <Input
            label="College Name"
            value={form.college}
            onChange={(e) => setForm({ ...form, college: e.target.value })}
            icon={<School className="h-4 w-4" />}
            disabled={!editing}
            placeholder="Enter your college name"
          />
          {!isOrganizer && (
            <>
              <Input
                label="Student ID / Roll Number"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                icon={<Hash className="h-4 w-4" />}
                disabled={!editing}
                placeholder="Enter your student ID"
              />
              <Input
                label="Branch / Department"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                icon={<GitBranch className="h-4 w-4" />}
                disabled={!editing}
                placeholder="Enter your branch"
              />
              <Select
                label="Year"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                disabled={!editing}
              >
                <option value="">Select year</option>
                <option value="1st">1st Year</option>
                <option value="2nd">2nd Year</option>
                <option value="3rd">3rd Year</option>
                <option value="4th">4th Year</option>
                <option value="5th">5th Year</option>
              </Select>
            </>
          )}
        </div>

        {editing && (
          <div className="mt-6 flex gap-3">
            <Button onClick={handleSave} loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
            <Button onClick={() => setEditing(false)} variant="ghost">
              Cancel
            </Button>
          </div>
        )}
      </div>

      <button
        onClick={() => signOut()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
