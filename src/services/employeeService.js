import { supabase } from './supabaseClient';

const ID_PREFIX = 'TVSSNEMP';
const ID_PAD = 3;

function formatPostgrestError(error) {
  if (!error) return 'Unknown error';
  const parts = [error.message];
  if (error.details) parts.push(`Details: ${error.details}`);
  if (error.hint)    parts.push(`Hint: ${error.hint}`);
  if (error.code)    parts.push(`Code: ${error.code}`);
  return parts.join(' — ');
}

export async function generateEmployeeId() {
  const { data, error } = await supabase
    .from('employees')
    .select('employee_id')
    .order('employee_id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[generateEmployeeId] Supabase error:', error);
    if (error.code === '42P01') throw new Error('The employees table does not exist. Run the SQL migration in your Supabase dashboard first.');
    throw new Error(formatPostgrestError(error));
  }

  if (!data || data.length === 0) return `${ID_PREFIX}${'1'.padStart(ID_PAD, '0')}`;

  const last = data[0].employee_id;
  const num  = parseInt(last.slice(ID_PREFIX.length), 10);
  const next = `${ID_PREFIX}${String(num + 1).padStart(ID_PAD, '0')}`;
  console.log('[generateEmployeeId] next ID:', next);
  return next;
}

export async function getEmployees({ search = '', status = '', page = 1, pageSize = 10 } = {}) {
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search.trim()) {
    const t = search.trim();
    query = query.or(
      `full_name.ilike.%${t}%,email.ilike.%${t}%,department.ilike.%${t}%,employee_id.ilike.%${t}%,designation.ilike.%${t}%`
    );
  }

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) {
    console.error('[getEmployees] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }
  return { data, count: count ?? 0 };
}

export async function getEmployeeById(id) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getEmployeeById] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }
  return data;
}

export async function addEmployee(payload) {
  console.log('[addEmployee] inserting payload:', JSON.stringify(payload, null, 2));

  const { data, error } = await supabase
    .from('employees')
    .insert([payload])
    .select()
    .single();

  console.log('[addEmployee] response → data:', data, '| error:', error);

  if (error) {
    console.error('[addEmployee] Supabase error:', error);
    if (error.code === '42P01') throw new Error('The employees table does not exist. Run the SQL migration in your Supabase dashboard first.');
    if (error.code === '42501') throw new Error('Insert blocked by Row Level Security. Ensure the RLS policy allows authenticated users to insert.');
    if (error.code === '23505') {
      if (error.message.includes('email')) throw new Error(`An employee with email "${payload.email}" already exists.`);
      throw new Error(`Duplicate employee ID: ${payload.employee_id}. Refresh the page to generate a new ID.`);
    }
    throw new Error(formatPostgrestError(error));
  }

  if (!data) throw new Error('Insert returned no data. Check your Supabase RLS policies.');
  console.log('[addEmployee] success — inserted row:', data);
  return data;
}

export async function updateEmployee(id, payload) {
  console.log('[updateEmployee] id:', id, 'payload:', payload);

  const { data, error } = await supabase
    .from('employees')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateEmployee] Supabase error:', error);
    if (error.code === '23505' && error.message.includes('email')) {
      throw new Error('This email address is already in use by another employee.');
    }
    throw new Error(formatPostgrestError(error));
  }
  return data;
}

export async function deleteEmployee(id) {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) {
    console.error('[deleteEmployee] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }
}

export async function getEmployeeStats() {
  const { data, error } = await supabase.from('employees').select('status');
  if (error) {
    console.error('[getEmployeeStats] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }
  const rows = data ?? [];
  return {
    total:      rows.length,
    active:     rows.filter((e) => e.status === 'active').length,
    probation:  rows.filter((e) => e.status === 'probation').length,
    onLeave:    rows.filter((e) => e.status === 'on_leave').length,
    terminated: rows.filter((e) => e.status === 'terminated').length,
  };
}

export async function getEmployeeDeptStats() {
  const { data, error } = await supabase
    .from('employees')
    .select('department')
    .neq('status', 'terminated');

  if (error) {
    console.error('[getEmployeeDeptStats] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }

  const counts = {};
  (data ?? []).forEach((e) => {
    if (e.department) counts[e.department] = (counts[e.department] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
