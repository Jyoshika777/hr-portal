import { supabase } from './supabaseClient';

// Column names match the actual Supabase table definitions:
//   candidates    → full_name, email, job_role, status
//   employees     → full_name, email, department, designation, status
//   offer_letters → candidate_name, job_role, status, offer_number
//   documents     → document_name, entity_name, document_type, entity_type
//   payroll       → employee_name, payroll_number, status
//   performance_reviews → employee_name, review_type, status

const MODULES = [
  {
    key: 'candidates', table: 'candidates', badge: 'Candidate', color: '#4F46E5',
    fields: 'id,full_name,email,job_role,status',
    filter: (q) => `full_name.ilike.%${q}%,email.ilike.%${q}%,job_role.ilike.%${q}%`,
    title:  (r) => r.full_name || '—',
    sub:    (r) => [r.job_role, r.status].filter(Boolean).join(' · '),
    href:   (r) => `/candidates/${r.id}`,
  },
  {
    key: 'employees', table: 'employees', badge: 'Employee', color: '#059669',
    fields: 'id,full_name,email,department,designation,status',
    filter: (q) => `full_name.ilike.%${q}%,email.ilike.%${q}%,department.ilike.%${q}%,designation.ilike.%${q}%`,
    title:  (r) => r.full_name || '—',
    sub:    (r) => [r.designation, r.department].filter(Boolean).join(' · '),
    href:   (r) => `/employees/${r.id}`,
  },
  {
    key: 'offers', table: 'offer_letters', badge: 'Offer', color: '#D97706',
    fields: 'id,candidate_name,job_role,status,offer_number',
    filter: (q) => `candidate_name.ilike.%${q}%,job_role.ilike.%${q}%,offer_number.ilike.%${q}%`,
    title:  (r) => r.candidate_name || '—',
    sub:    (r) => [r.offer_number, r.job_role, r.status].filter(Boolean).join(' · '),
    href:   (r) => `/offers/${r.id}`,
  },
  {
    key: 'documents', table: 'documents', badge: 'Document', color: '#7C3AED',
    fields: 'id,document_name,entity_name,document_type,entity_type',
    filter: (q) => `document_name.ilike.%${q}%,entity_name.ilike.%${q}%`,
    title:  (r) => r.document_name || '—',
    sub:    (r) => [r.document_type, r.entity_name].filter(Boolean).join(' · '),
    href:   (r) => `/documents/${r.id}`,
  },
  {
    key: 'payroll', table: 'payroll', badge: 'Payroll', color: '#0284C7',
    fields: 'id,employee_name,payroll_number,status',
    filter: (q) => `employee_name.ilike.%${q}%,payroll_number.ilike.%${q}%`,
    title:  (r) => r.employee_name || '—',
    sub:    (r) => [r.payroll_number, r.status].filter(Boolean).join(' · '),
    href:   (r) => `/payroll/${r.id}`,
  },
  {
    key: 'performance', table: 'performance_reviews', badge: 'Review', color: '#DB2777',
    fields: 'id,employee_name,review_type,status',
    filter: (q) => `employee_name.ilike.%${q}%,review_type.ilike.%${q}%`,
    title:  (r) => r.employee_name || '—',
    sub:    (r) => [r.review_type, r.status].filter(Boolean).join(' · '),
    href:   (r) => `/performance/${r.id}`,
  },
];

export async function globalSearch(query) {
  const q = query?.trim();
  if (!q || q.length < 2) return [];

  const results = await Promise.all(
    MODULES.map(async (m) => {
      try {
        const { data, error } = await supabase
          .from(m.table)
          .select(m.fields)
          .or(m.filter(q))
          .limit(5);

        if (error) return [];

        return (data || []).map((r) => ({
          uid:   `${m.key}:${r.id}`,
          type:  m.key,
          badge: m.badge,
          color: m.color,
          title: m.title(r),
          sub:   m.sub(r),
          href:  m.href(r),
        }));
      } catch {
        return [];
      }
    })
  );

  return results.flat().slice(0, 20);
}

export function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem('hr_recent_searches') || '[]'); } catch { return []; }
}

export function addRecentSearch(term) {
  if (!term?.trim() || term.trim().length < 2) return;
  try {
    const prev  = getRecentSearches();
    const clean = term.trim();
    const next  = [clean, ...prev.filter((t) => t !== clean)].slice(0, 6);
    localStorage.setItem('hr_recent_searches', JSON.stringify(next));
  } catch {}
}

export function clearRecentSearches() {
  try { localStorage.removeItem('hr_recent_searches'); } catch {}
}
