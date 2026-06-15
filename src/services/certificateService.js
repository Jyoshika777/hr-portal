import { supabase } from './supabaseClient';

export const CERT_TYPES = {
  internship_completion: 'Internship Completion',
  training_completion:   'Training Completion',
  employee_recognition:  'Employee Recognition',
  appreciation:          'Appreciation',
  achievement:           'Achievement',
  course_completion:     'Course Completion',
};

export const CERT_TYPE_OPTIONS = Object.entries(CERT_TYPES).map(([value, label]) => ({ value, label }));

export const STATUS_LABELS = { draft: 'Draft', issued: 'Issued', revoked: 'Revoked' };

// ── Number & code generation ──────────────────────────────────────────────────

async function generateCertNumber() {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true });
  const seq = String((count || 0) + 1).padStart(5, '0');
  return `CERT-${year}-${seq}`;
}

function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts = [4, 4, 4].map(() =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return parts.join('-');
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createCertificate(fields) {
  const certificate_number = await generateCertNumber();
  const verification_code  = generateVerificationCode();

  const { data, error } = await supabase
    .from('certificates')
    .insert({ ...fields, certificate_number, verification_code })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCertificates({
  search       = '',
  typeFilter   = '',
  statusFilter = '',
  page         = 1,
  pageSize     = 10,
} = {}) {
  let q = supabase.from('certificates').select('*', { count: 'exact' });

  if (search) {
    q = q.or(
      `recipient_name.ilike.%${search}%,` +
      `certificate_number.ilike.%${search}%,` +
      `program_name.ilike.%${search}%,` +
      `employee_id.ilike.%${search}%`
    );
  }
  if (typeFilter)   q = q.eq('certificate_type', typeFilter);
  if (statusFilter) q = q.eq('status', statusFilter);

  q = q.order('created_at', { ascending: false })
       .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

export async function getCertificate(id) {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCertificate(id, fields) {
  const { data, error } = await supabase
    .from('certificates')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCertificate(id) {
  const { error } = await supabase.from('certificates').delete().eq('id', id);
  if (error) throw error;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getCertificateStats() {
  const { data, error } = await supabase
    .from('certificates')
    .select('status, certificate_type');
  if (error) throw error;

  const total   = data.length;
  const issued  = data.filter((c) => c.status === 'issued').length;
  const draft   = data.filter((c) => c.status === 'draft').length;
  const revoked = data.filter((c) => c.status === 'revoked').length;

  const byType = {};
  data.forEach((c) => { byType[c.certificate_type] = (byType[c.certificate_type] || 0) + 1; });

  return { total, issued, draft, revoked, byType };
}
