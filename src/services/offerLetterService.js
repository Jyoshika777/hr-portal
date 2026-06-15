import { supabase } from './supabaseClient';

const OFFER_PREFIX = 'TVSSNOFF';
const OFFER_PAD    = 3;

// ── Error helper ──────────────────────────────────────────────────────────────
function formatPostgrestError(error) {
  if (!error) return 'Unknown error';
  const parts = [error.message];
  if (error.details) parts.push(`Details: ${error.details}`);
  if (error.hint)    parts.push(`Hint: ${error.hint}`);
  if (error.code)    parts.push(`Code: ${error.code}`);
  return parts.join(' — ');
}

function missingTableMsg() {
  return 'The offer_letters table does not exist. Run migration 005 in your Supabase SQL Editor first.';
}

// ── Offer number generation ───────────────────────────────────────────────────
// Queries the highest existing offer_number and increments it.
// Collision-safe for sequential inserts; race conditions are guarded by
// the UNIQUE constraint on offer_number (23505 → friendly error in addOfferLetter).
export async function generateOfferNumber() {
  const { data, error } = await supabase
    .from('offer_letters')
    .select('offer_number')
    .order('offer_number', { ascending: false })
    .limit(1);

  if (error) {
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }

  if (!data || data.length === 0)
    return `${OFFER_PREFIX}${'1'.padStart(OFFER_PAD, '0')}`;

  const last = data[0].offer_number ?? '';
  const suffix = last.slice(OFFER_PREFIX.length);
  const num = parseInt(suffix, 10);
  const next = isNaN(num) ? 1 : num + 1;
  return `${OFFER_PREFIX}${String(next).padStart(OFFER_PAD, '0')}`;
}

// ── List with search, status, employment type, pagination ─────────────────────
export async function getOfferLetters({
  search         = '',
  status         = '',
  employment_type = '',
  page           = 1,
  pageSize       = 10,
} = {}) {
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('offer_letters')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search.trim()) {
    const t = search.trim();
    query = query.or(
      `offer_number.ilike.%${t}%,` +
      `candidate_name.ilike.%${t}%,` +
      `candidate_email.ilike.%${t}%,` +
      `job_role.ilike.%${t}%,` +
      `department.ilike.%${t}%`
    );
  }

  if (status)          query = query.eq('status', status);
  if (employment_type) query = query.eq('employment_type', employment_type);

  const { data, error, count } = await query;
  if (error) {
    console.error('[getOfferLetters]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }
  return { data: data ?? [], count: count ?? 0 };
}

// ── Single record ─────────────────────────────────────────────────────────────
export async function getOfferLetterById(id) {
  const { data, error } = await supabase
    .from('offer_letters')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getOfferLetterById]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    if (error.code === 'PGRST116') throw new Error('Offer letter not found.');
    throw new Error(formatPostgrestError(error));
  }
  return data;
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function addOfferLetter(payload) {
  const { data, error } = await supabase
    .from('offer_letters')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[addOfferLetter]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    if (error.code === '42501') throw new Error('Insert blocked by Row Level Security. Ensure authenticated users have INSERT permission.');
    if (error.code === '23505') throw new Error(`Offer number ${payload.offer_number} already exists. Refresh the page to generate a new one.`);
    if (error.code === '23514') throw new Error('A field value failed a database constraint check. Verify all amounts are positive and dates are valid.');
    throw new Error(formatPostgrestError(error));
  }
  if (!data) throw new Error('Insert returned no data. Check RLS policies (require SELECT permission as well as INSERT).');
  return data;
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateOfferLetter(id, payload) {
  const { data, error } = await supabase
    .from('offer_letters')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateOfferLetter]', error);
    if (error.code === '23514') throw new Error('A field value failed a database constraint check. Verify all amounts are positive and dates are valid.');
    throw new Error(formatPostgrestError(error));
  }
  return data;
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteOfferLetter(id) {
  const { error } = await supabase
    .from('offer_letters')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteOfferLetter]', error);
    throw new Error(formatPostgrestError(error));
  }
}

// ── Offers by candidate (used in candidate detail page) ───────────────────────
export async function getOffersByCandidateId(candidateId) {
  const { data, error } = await supabase
    .from('offer_letters')
    .select('id, offer_number, job_role, employment_type, status, offer_date, salary')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getOffersByCandidateId]', error);
    throw new Error(formatPostgrestError(error));
  }
  return data ?? [];
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
// Returns aggregate counts used by the Offers Dashboard widget.
export async function getOfferStats() {
  const { data, error } = await supabase
    .from('offer_letters')
    .select('status, employment_type');

  if (error) {
    console.error('[getOfferStats]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }

  const rows = data ?? [];

  // Status breakdown
  const byStatus = {
    total:    rows.length,
    draft:    rows.filter((r) => r.status === 'draft').length,
    sent:     rows.filter((r) => r.status === 'sent').length,
    accepted: rows.filter((r) => r.status === 'accepted').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    expired:  rows.filter((r) => r.status === 'expired').length,
  };

  // Employment type breakdown
  const typeKeys = ['full_time', 'part_time', 'contract', 'intern', 'temporary', 'trainee', 'remote', 'hybrid'];
  const byType = {};
  typeKeys.forEach((t) => {
    byType[t] = rows.filter((r) => r.employment_type === t).length;
  });

  return { byStatus, byType };
}

// ── Recent offers (last N, for dashboard feed) ────────────────────────────────
export async function getRecentOffers(limit = 5) {
  const { data, error } = await supabase
    .from('offer_letters')
    .select('id, offer_number, candidate_name, job_role, employment_type, status, offer_date')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getRecentOffers]', error);
    throw new Error(formatPostgrestError(error));
  }
  return data ?? [];
}
