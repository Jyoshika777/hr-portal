import { supabase } from './supabaseClient';

const PAY_PREFIX = 'TVSSNPAY';
const PAY_PAD    = 3;

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
  return 'The payroll table does not exist. Run migration 006 in your Supabase SQL Editor first.';
}

// total_earnings, total_deductions, net_salary are GENERATED columns —
// the DB computes them automatically; they must never appear in insert/update.
const GENERATED = new Set(['total_earnings', 'total_deductions', 'net_salary']);

function stripGenerated(payload) {
  const out = { ...payload };
  GENERATED.forEach((k) => delete out[k]);
  return out;
}

// ── Payroll number generation ─────────────────────────────────────────────────
// Format: TVSSNPAY001, TVSSNPAY002 …
export async function generatePayrollNumber() {
  const { data, error } = await supabase
    .from('payroll')
    .select('payroll_number')
    .order('payroll_number', { ascending: false })
    .limit(1);

  if (error) {
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }

  if (!data || data.length === 0)
    return `${PAY_PREFIX}${'1'.padStart(PAY_PAD, '0')}`;

  const last   = data[0].payroll_number ?? '';
  const suffix = last.slice(PAY_PREFIX.length);
  const num    = parseInt(suffix, 10);
  const next   = isNaN(num) ? 1 : num + 1;
  return `${PAY_PREFIX}${String(next).padStart(PAY_PAD, '0')}`;
}

// ── List: search + status + period + pagination ───────────────────────────────
export async function getPayrolls({
  search    = '',
  status    = '',
  pay_month = '',
  pay_year  = '',
  page      = 1,
  pageSize  = 10,
} = {}) {
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('payroll')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search.trim()) {
    const t = search.trim();
    query = query.or(
      `payroll_number.ilike.%${t}%,` +
      `employee_ref.ilike.%${t}%,` +
      `employee_name.ilike.%${t}%,` +
      `department.ilike.%${t}%,` +
      `designation.ilike.%${t}%`
    );
  }

  if (status)    query = query.eq('payment_status', status);
  if (pay_month) query = query.eq('pay_month', parseInt(pay_month, 10));
  if (pay_year)  query = query.eq('pay_year',  parseInt(pay_year,  10));

  const { data, error, count } = await query;
  if (error) {
    console.error('[getPayrolls]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }
  return { data: data ?? [], count: count ?? 0 };
}

// ── Single record ─────────────────────────────────────────────────────────────
export async function getPayrollById(id) {
  const { data, error } = await supabase
    .from('payroll')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getPayrollById]', error);
    if (error.code === '42P01')    throw new Error(missingTableMsg());
    if (error.code === 'PGRST116') throw new Error('Payroll record not found.');
    throw new Error(formatPostgrestError(error));
  }
  return data;
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function addPayroll(payload) {
  const clean = stripGenerated(payload);
  console.log('[addPayroll] inserting:', clean);

  const { data, error } = await supabase
    .from('payroll')
    .insert([clean])
    .select()
    .single();

  if (error) {
    console.error('[addPayroll]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    if (error.code === '42501') throw new Error('Insert blocked by Row Level Security. Check the payroll RLS policy in Supabase.');
    if (error.code === '23505') {
      if (error.message.includes('uq_payroll_employee_period'))
        throw new Error('A payroll record already exists for this employee for the selected month and year.');
      throw new Error('Duplicate payroll number — refresh the page and try again.');
    }
    if (error.code === '23514') throw new Error(`A value failed a database constraint: ${error.message}`);
    throw new Error(formatPostgrestError(error));
  }

  if (!data) throw new Error('Insert returned no data. Check your Supabase RLS policies.');
  return data;
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updatePayroll(id, payload) {
  const clean = stripGenerated(payload);
  console.log('[updatePayroll] id:', id, 'payload:', clean);

  const { data, error } = await supabase
    .from('payroll')
    .update(clean)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updatePayroll]', error);
    if (error.code === '23505')
      throw new Error('A payroll record already exists for this employee for that month/year.');
    if (error.code === '23514')
      throw new Error(`A value failed a database constraint: ${error.message}`);
    throw new Error(formatPostgrestError(error));
  }
  return data;
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deletePayroll(id) {
  const { error } = await supabase.from('payroll').delete().eq('id', id);
  if (error) {
    console.error('[deletePayroll]', error);
    throw new Error(formatPostgrestError(error));
  }
}

// ── Employee salary history ───────────────────────────────────────────────────
export async function getPayrollsByEmployee(employeeRef) {
  const { data, error } = await supabase
    .from('payroll')
    .select(
      'id,payroll_number,pay_month,pay_year,basic_salary,' +
      'total_earnings,total_deductions,net_salary,' +
      'payment_status,payment_date,created_at'
    )
    .eq('employee_ref', employeeRef)
    .order('pay_year',  { ascending: false })
    .order('pay_month', { ascending: false });

  if (error) {
    console.error('[getPayrollsByEmployee]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }
  return data ?? [];
}

// ── Stats for Dashboard ───────────────────────────────────────────────────────
export async function getPayrollStats() {
  const { data, error } = await supabase
    .from('payroll')
    .select('payment_status,net_salary');

  if (error) {
    console.error('[getPayrollStats]', error);
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(formatPostgrestError(error));
  }

  const rows = data ?? [];

  const byStatus = {
    total:     rows.length,
    pending:   rows.filter((r) => r.payment_status === 'pending').length,
    paid:      rows.filter((r) => r.payment_status === 'paid').length,
    on_hold:   rows.filter((r) => r.payment_status === 'on_hold').length,
    cancelled: rows.filter((r) => r.payment_status === 'cancelled').length,
  };

  const totalNetPaid = rows
    .filter((r) => r.payment_status === 'paid')
    .reduce((acc, r) => acc + (parseFloat(r.net_salary) || 0), 0);

  return { byStatus, totalNetPaid };
}

// ── Recent payrolls (dashboard activity feed) ─────────────────────────────────
export async function getRecentPayrolls(limit = 5) {
  const { data, error } = await supabase
    .from('payroll')
    .select(
      'id,payroll_number,employee_ref,employee_name,' +
      'pay_month,pay_year,net_salary,payment_status,created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getRecentPayrolls]', error);
    throw new Error(formatPostgrestError(error));
  }
  return data ?? [];
}
