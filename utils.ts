export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return 'TBD';
  return timeStr;
}

export function isRegistrationOpen(deadline: string | null | undefined, status: string): boolean {
  if (status !== 'published') return false;
  if (!deadline) return true;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return true;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(23, 59, 59, 999);
  return d >= now;
}

export function generateToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
}

export function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    hackathon: 'Hackathon',
    workshop: 'Workshop',
    technical: 'Technical Event',
    fest: 'Fest',
    competition: 'Competition',
    seminar: 'Seminar',
    other: 'Other',
  };
  return labels[cat] || cat;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'published': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'draft': return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'closed': return 'bg-red-100 text-red-700 border-red-200';
    case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    published: 'Published',
    closed: 'Closed',
    completed: 'Completed',
  };
  return labels[status] || status;
}
