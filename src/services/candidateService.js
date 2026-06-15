import { supabase } from './supabaseClient';

const ID_PREFIX = 'TVSSNWIN';
const ID_PAD = 3;

function formatPostgrestError(error) {
  if (!error) return 'Unknown error';
  const parts = [error.message];
  if (error.details) parts.push(`Details: ${error.details}`);
  if (error.hint)    parts.push(`Hint: ${error.hint}`);
  if (error.code)    parts.push(`Code: ${error.code}`);
  return parts.join(' — ');
}

export async function generateApplicationId() {
  const { data, error } = await supabase
    .from('candidates')
    .select('application_id')
    .order('application_id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[generateApplicationId] Supabase error:', error);
    if (error.code === '42P01') {
      throw new Error(
        'The candidates table does not exist. Run the SQL migration in your Supabase dashboard first.'
      );
    }
    throw new Error(formatPostgrestError(error));
  }

  console.log('[generateApplicationId] existing rows returned:', data?.length ?? 0);

  if (!data || data.length === 0) {
    return `${ID_PREFIX}${'1'.padStart(ID_PAD, '0')}`;
  }

  const last = data[0].application_id;
  const num = parseInt(last.slice(ID_PREFIX.length), 10);
  const next = `${ID_PREFIX}${String(num + 1).padStart(ID_PAD, '0')}`;
  console.log('[generateApplicationId] next ID:', next);
  return next;
}

export async function getAllCandidates() {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAllCandidates] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }

  return data;
}

export async function getCandidates({ search = '', status = '', page = 1, pageSize = 10 } = {}) {
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('candidates')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search.trim()) {
    const t = search.trim();
    query = query.or(
      `full_name.ilike.%${t}%,email.ilike.%${t}%,job_role.ilike.%${t}%,application_id.ilike.%${t}%`
    );
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[getCandidates] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }

  return { data, count: count ?? 0 };
}

export async function getCandidateById(id) {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getCandidateById] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }

  return data;
}

export async function addCandidate(payload) {
  console.log('[addCandidate] inserting payload:', JSON.stringify(payload, null, 2));

  const { data, error } = await supabase
    .from('candidates')
    .insert([payload])
    .select()
    .single();

  console.log('[addCandidate] response → data:', data, '| error:', error);

  if (error) {
    console.error('[addCandidate] Supabase error:', error);

    if (error.code === '42P01') {
      throw new Error(
        'The candidates table does not exist. Run the SQL migration in your Supabase dashboard first.'
      );
    }
    if (error.code === '42501') {
      throw new Error(
        'Insert blocked by Row Level Security. Ensure the RLS policy allows authenticated users to insert, or disable RLS for testing.'
      );
    }
    if (error.code === '23505') {
      throw new Error(
        `Duplicate application ID: ${payload.application_id}. Refresh the page to generate a new ID.`
      );
    }

    throw new Error(formatPostgrestError(error));
  }

  if (!data) {
    throw new Error(
      'Insert returned no data. The row may have been blocked silently by RLS. Check your Supabase RLS policies.'
    );
  }

  console.log('[addCandidate] success — inserted row:', data);
  return data;
}

export async function updateCandidate(id, payload) {
  console.log('[updateCandidate] id:', id, 'payload:', payload);

  const { data, error } = await supabase
    .from('candidates')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateCandidate] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }

  return data;
}

export async function deleteCandidate(id) {
  const { error } = await supabase.from('candidates').delete().eq('id', id);

  if (error) {
    console.error('[deleteCandidate] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }
}

export async function convertCandidateToEmployee(candidateId, employeePayload) {
  console.log('[convertCandidateToEmployee] candidateId:', candidateId);
  console.log('[convertCandidateToEmployee] payload:', JSON.stringify(employeePayload, null, 2));

  // Step 1 — create the employee record
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .insert([employeePayload])
    .select()
    .single();

  if (empError) {
    console.error('[convertCandidateToEmployee] employee insert error:', empError);
    if (empError.code === '23505') {
      if (empError.message.includes('email'))
        throw new Error(`An employee with email "${employeePayload.email}" already exists.`);
      throw new Error(`Duplicate employee ID ${employeePayload.employee_id}. Refresh to regenerate.`);
    }
    if (empError.code === '42501')
      throw new Error('Insert blocked by Row Level Security. Check the employees table RLS policy.');
    throw new Error(formatPostgrestError(empError));
  }
  if (!employee)
    throw new Error('Employee insert returned no data. Check RLS policies.');

  console.log('[convertCandidateToEmployee] employee created:', employee.id);

  // Step 2 — stamp the candidate with the new employee's UUID
  const { error: candError } = await supabase
    .from('candidates')
    .update({ converted_employee_id: employee.id })
    .eq('id', candidateId);

  if (candError) {
    console.error('[convertCandidateToEmployee] candidate update error:', candError);
    throw new Error(formatPostgrestError(candError));
  }

  console.log('[convertCandidateToEmployee] candidate stamped successfully');
  return employee;
}

export async function getCandidateStats() {
  const { data, error } = await supabase.from('candidates').select('status');

  if (error) {
    console.error('[getCandidateStats] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }

  const rows = data ?? [];
  return {
    total:     rows.length,
    applied:   rows.filter((c) => c.status === 'applied').length,
    screening: rows.filter((c) => c.status === 'screening').length,
    interview: rows.filter((c) => c.status === 'interview').length,
    selected:  rows.filter((c) => c.status === 'selected').length,
    offerSent: rows.filter((c) => c.status === 'offer_sent').length,
    joined:    rows.filter((c) => c.status === 'joined').length,
    rejected:  rows.filter((c) => c.status === 'rejected').length,
    // active = everyone who hasn't reached a terminal state
    active:    rows.filter((c) => !['joined', 'rejected'].includes(c.status)).length,
  };
}

export async function getRecentCandidates(limit = 5) {
  const { data, error } = await supabase
    .from('candidates')
    .select('id, application_id, full_name, job_role, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getRecentCandidates] Supabase error:', error);
    throw new Error(formatPostgrestError(error));
  }
  return data ?? [];
}
