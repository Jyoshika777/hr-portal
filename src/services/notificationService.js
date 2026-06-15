import { supabase } from './supabaseClient';

const STORAGE_KEY = 'hr_read_notif_ids';

function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}

export function markAsRead(id) {
  const ids = getReadIds();
  ids.add(id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch {}
}

export function markAllRead(notifications) {
  const ids = getReadIds();
  notifications.forEach((n) => ids.add(n.id));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch {}
}

function notifId(type, record) { return `${type}:${record.id}`; }

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function fetchNotifications() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const readIds = getReadIds();

  // Column names match actual Supabase schemas (see migrations 001–008)
  const [cands, emps, docs, offers, reviews] = await Promise.all([

    supabase.from('candidates')
      .select('id,full_name,job_role,created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => (data || []).map((r) => ({
        id:     notifId('candidate', r),
        type:   'candidate',
        icon:   '👤',
        color:  '#4F46E5',
        title:  'New candidate applied',
        body:   `${r.full_name || 'A candidate'} applied for ${r.job_role || 'a position'}`,
        time:   timeAgo(r.created_at),
        href:   `/candidates/${r.id}`,
        raw_ts: r.created_at,
      })))
      .catch(() => []),

    supabase.from('employees')
      .select('id,full_name,department,created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => (data || []).map((r) => ({
        id:     notifId('employee', r),
        type:   'employee',
        icon:   '🏢',
        color:  '#059669',
        title:  'New employee onboarded',
        body:   `${r.full_name || 'An employee'} joined ${r.department || 'the team'}`,
        time:   timeAgo(r.created_at),
        href:   `/employees/${r.id}`,
        raw_ts: r.created_at,
      })))
      .catch(() => []),

    supabase.from('documents')
      .select('id,document_name,entity_name,created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => (data || []).map((r) => ({
        id:     notifId('document', r),
        type:   'document',
        icon:   '📄',
        color:  '#7C3AED',
        title:  'Document uploaded',
        body:   `${r.document_name || 'A document'} for ${r.entity_name || 'an entity'}`,
        time:   timeAgo(r.created_at),
        href:   `/documents/${r.id}`,
        raw_ts: r.created_at,
      })))
      .catch(() => []),

    supabase.from('offer_letters')
      .select('id,candidate_name,job_role,status,created_at')
      .in('status', ['sent', 'accepted', 'rejected'])
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => (data || []).map((r) => {
        const icons = { sent: '📬', accepted: '✅', rejected: '❌' };
        const msgs  = { sent: 'Offer sent to', accepted: 'Offer accepted by', rejected: 'Offer declined by' };
        return {
          id:     notifId('offer', r),
          type:   'offer',
          icon:   icons[r.status] || '📬',
          color:  '#D97706',
          title:  `Offer letter ${r.status}`,
          body:   `${msgs[r.status] || 'Offer updated for'} ${r.candidate_name || 'a candidate'} — ${r.job_role || ''}`,
          time:   timeAgo(r.created_at),
          href:   `/offers/${r.id}`,
          raw_ts: r.created_at,
        };
      }))
      .catch(() => []),

    supabase.from('performance_reviews')
      .select('id,employee_name,review_type,status,created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => (data || []).map((r) => ({
        id:     notifId('review', r),
        type:   'review',
        icon:   '⭐',
        color:  '#DB2777',
        title:  `Performance review ${r.status || 'scheduled'}`,
        body:   `${r.employee_name || 'An employee'}'s ${r.review_type || 'review'} is ${r.status || 'pending'}`,
        time:   timeAgo(r.created_at),
        href:   `/performance/${r.id}`,
        raw_ts: r.created_at,
      })))
      .catch(() => []),
  ]);

  return [...cands, ...emps, ...docs, ...offers, ...reviews]
    .sort((a, b) => new Date(b.raw_ts) - new Date(a.raw_ts))
    .slice(0, 15)
    .map((n) => ({ ...n, read: readIds.has(n.id) }));
}
