import { supabase } from './supabaseClient';

const REV_PREFIX = 'TVSSNREV';
const REV_PAD    = 3;

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
  return 'The performance_reviews table does not exist. Run migration 007 in your Supabase SQL Editor first.';
}

// ── Rating label computation ──────────────────────────────────────────────────
export function computeRatingLabel(rating) {
  if (!rating) return null;
  const r = parseFloat(rating);
  if (r >= 4.5) return 'outstanding';
  if (r >= 3.5) return 'exceeds_expectations';
  if (r >= 2.5) return 'meets_expectations';
  if (r >= 1.5) return 'needs_improvement';
  return 'unsatisfactory';
}

// Compute overall_rating as the average of all provided category ratings
export function computeOverallRating(categories) {
  const values = Object.values(categories).filter((v) => v !== null && v !== '' && !isNaN(parseInt(v)));
  if (values.length === 0) return null;
  const avg = values.reduce((sum, v) => sum + parseInt(v), 0) / values.length;
  return Math.round(avg * 10) / 10; // 1 decimal place
}

// ── Review number generation ──────────────────────────────────────────────────
export async function generateReviewNumber() {
  const { data, error } = await supabase
    .from('performance_reviews')
    .select('review_number')
    .order('review_number', { ascending: false })
    .limit(1);

  if (error) {
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }

  if (!data || data.length === 0)
    return `${REV_PREFIX}${'1'.padStart(REV_PAD, '0')}`;

  const last   = data[0].review_number ?? '';
  const suffix = last.slice(REV_PREFIX.length);
  const num    = parseInt(suffix, 10);
  const next   = isNaN(num) ? 1 : num + 1;
  return `${REV_PREFIX}${String(next).padStart(REV_PAD, '0')}`;
}

// ── List with search + filters + pagination ───────────────────────────────────
export async function getReviews({
  search      = '',
  review_type = '',
  status      = '',
  employee_ref = '',
  rating_label = '',
  page        = 1,
  pageSize    = 10,
} = {}) {
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('performance_reviews')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search.trim()) {
    const t = search.trim();
    query = query.or(
      `review_number.ilike.%${t}%,` +
      `employee_ref.ilike.%${t}%,` +
      `employee_name.ilike.%${t}%,` +
      `department.ilike.%${t}%,` +
      `reviewer_name.ilike.%${t}%`
    );
  }

  if (review_type)  query = query.eq('review_type',  review_type);
  if (status)       query = query.eq('status',       status);
  if (employee_ref) query = query.eq('employee_ref', employee_ref);
  if (rating_label) query = query.eq('rating_label', rating_label);

  const { data, error, count } = await query;
  if (error) {
    console.error('[getReviews]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }
  return { data: data ?? [], count: count ?? 0 };
}

// ── Single record ─────────────────────────────────────────────────────────────
export async function getReviewById(id) {
  const { data, error } = await supabase
    .from('performance_reviews')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getReviewById]', error);
    if (error.code === '42P01')    throw new Error(missingTableMsg());
    if (error.code === 'PGRST116') throw new Error('Performance review not found.');
    throw new Error(formatPostgrestError(error));
  }
  return data;
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function addReview(payload) {
  console.log('[addReview] inserting:', payload);

  const { data, error } = await supabase
    .from('performance_reviews')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[addReview]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    if (error.code === '42501') throw new Error('Insert blocked by Row Level Security. Check the performance_reviews RLS policy.');
    if (error.code === '23505') throw new Error('Duplicate review number — refresh and try again.');
    if (error.code === '23514') throw new Error(`A value failed a database constraint: ${error.message}`);
    throw new Error(formatPostgrestError(error));
  }

  if (!data) throw new Error('Insert returned no data. Check your Supabase RLS policies.');
  return data;
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateReview(id, payload) {
  console.log('[updateReview] id:', id, 'payload:', payload);

  const { data, error } = await supabase
    .from('performance_reviews')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateReview]', error);
    if (error.code === '23514') throw new Error(`A value failed a database constraint: ${error.message}`);
    throw new Error(formatPostgrestError(error));
  }
  return data;
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteReview(id) {
  const { error } = await supabase.from('performance_reviews').delete().eq('id', id);
  if (error) {
    console.error('[deleteReview]', error);
    throw new Error(formatPostgrestError(error));
  }
}

// ── All reviews for one employee ──────────────────────────────────────────────
export async function getReviewsByEmployee(employeeRef) {
  const { data, error } = await supabase
    .from('performance_reviews')
    .select(
      'id,review_number,review_type,review_date,overall_rating,rating_label,' +
      'recommendation,status,reviewer_name,created_at'
    )
    .eq('employee_ref', employeeRef)
    .order('review_date', { ascending: false });

  if (error) {
    console.error('[getReviewsByEmployee]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }
  return data ?? [];
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export async function getPerformanceStats() {
  const { data, error } = await supabase
    .from('performance_reviews')
    .select('status,review_type,overall_rating,rating_label');

  if (error) {
    console.error('[getPerformanceStats]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }

  const rows = data ?? [];

  const byStatus = {
    total:        rows.length,
    draft:        rows.filter((r) => r.status === 'draft').length,
    submitted:    rows.filter((r) => r.status === 'submitted').length,
    acknowledged: rows.filter((r) => r.status === 'acknowledged').length,
    closed:       rows.filter((r) => r.status === 'closed').length,
  };

  const byType = {
    annual:       rows.filter((r) => r.review_type === 'annual').length,
    quarterly:    rows.filter((r) => r.review_type === 'quarterly').length,
    probation:    rows.filter((r) => r.review_type === 'probation').length,
    promotion:    rows.filter((r) => r.review_type === 'promotion').length,
    warning:      rows.filter((r) => r.review_type === 'warning').length,
    commendation: rows.filter((r) => r.review_type === 'commendation').length,
    pip:          rows.filter((r) => r.review_type === 'pip').length,
    exit:         rows.filter((r) => r.review_type === 'exit').length,
  };

  const rated = rows.filter((r) => r.overall_rating != null);
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, r) => sum + parseFloat(r.overall_rating), 0) / rated.length).toFixed(1)
    : null;

  return { byStatus, byType, avgRating };
}

// ── Recent reviews (dashboard feed) ──────────────────────────────────────────
export async function getRecentReviews(limit = 5) {
  const { data, error } = await supabase
    .from('performance_reviews')
    .select(
      'id,review_number,employee_ref,employee_name,review_type,' +
      'overall_rating,rating_label,status,review_date,created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getRecentReviews]', error);
    throw new Error(formatPostgrestError(error));
  }
  return data ?? [];
}
