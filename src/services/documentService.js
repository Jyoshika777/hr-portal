import { supabase } from './supabaseClient';

export const BUCKET = 'hr-documents';
const DOC_PREFIX = 'TVSSNFIL';
const DOC_PAD = 3;

// ── Error helper ──────────────────────────────────────────────────────────────
function fmt(error) {
  if (!error) return 'Unknown error';
  const parts = [error.message];
  if (error.details) parts.push(`Details: ${error.details}`);
  if (error.hint)    parts.push(`Hint: ${error.hint}`);
  if (error.code)    parts.push(`Code: ${error.code}`);
  return parts.join(' — ');
}

function missingTableMsg() {
  return 'The documents table does not exist. Run migration 008 in your Supabase SQL Editor first.';
}

function buildStoragePath(entityType, entityRef, filename) {
  const ts = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${entityType}/${entityRef}/${ts}_${safe}`;
}

// ── Document number ───────────────────────────────────────────────────────────
export async function generateDocumentNumber() {
  const { data, error } = await supabase
    .from('documents')
    .select('document_number')
    .order('document_number', { ascending: false })
    .limit(1);

  if (error) {
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(fmt(error));
  }

  if (!data || data.length === 0)
    return `${DOC_PREFIX}${'1'.padStart(DOC_PAD, '0')}`;

  const last   = data[0].document_number ?? '';
  const suffix = last.slice(DOC_PREFIX.length);
  const num    = parseInt(suffix, 10);
  const next   = isNaN(num) ? 1 : num + 1;
  return `${DOC_PREFIX}${String(next).padStart(DOC_PAD, '0')}`;
}

// ── Upload file → Storage + DB record ────────────────────────────────────────
export async function uploadDocument({
  file, entityType, entityRef, entityId, entityName,
  documentType, documentName, remarks, uploadedBy,
}) {
  const document_number = await generateDocumentNumber();
  const storage_path    = buildStoragePath(entityType, entityRef, file.name);

  // 1. Upload to Supabase Storage
  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(storage_path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (storageErr)
    throw new Error(`Storage upload failed: ${storageErr.message}`);

  // 2. Insert metadata row — roll back storage if DB fails
  const { data, error: dbErr } = await supabase
    .from('documents')
    .insert([{
      document_number,
      entity_type:      entityType,
      entity_id:        entityId   || null,
      entity_ref:       entityRef,
      entity_name:      entityName,
      document_type:    documentType,
      document_name:    documentName,
      original_filename: file.name,
      file_size:        file.size,
      mime_type:        file.type || 'application/octet-stream',
      storage_path,
      storage_bucket:   BUCKET,
      remarks:          remarks    || null,
      uploaded_by:      uploadedBy || null,
    }])
    .select()
    .single();

  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([storage_path]);
    if (dbErr.code === '42P01') throw new Error(missingTableMsg());
    if (dbErr.code === '42501') throw new Error('Insert blocked by Row Level Security. Check documents table RLS policy.');
    if (dbErr.code === '23514') throw new Error(`Database constraint violated: ${dbErr.message}`);
    throw new Error(fmt(dbErr));
  }

  if (!data) throw new Error('Insert returned no data — check Supabase RLS policies.');
  return data;
}

// ── List with search + filters + pagination ───────────────────────────────────
export async function getDocuments({
  search        = '',
  entity_type   = '',
  entity_ref    = '',
  document_type = '',
  is_verified   = '',
  page          = 1,
  pageSize      = 10,
} = {}) {
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search.trim()) {
    const t = search.trim();
    query = query.or(
      `document_number.ilike.%${t}%,` +
      `document_name.ilike.%${t}%,` +
      `entity_name.ilike.%${t}%,` +
      `entity_ref.ilike.%${t}%,` +
      `original_filename.ilike.%${t}%`
    );
  }

  if (entity_type)  query = query.eq('entity_type',   entity_type);
  if (entity_ref)   query = query.eq('entity_ref',    entity_ref);
  if (document_type) query = query.eq('document_type', document_type);
  if (is_verified !== '') query = query.eq('is_verified', is_verified === 'true');

  const { data, error, count } = await query;
  if (error) {
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(fmt(error));
  }
  return { data: data ?? [], count: count ?? 0 };
}

// ── Single document ───────────────────────────────────────────────────────────
export async function getDocumentById(id) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === '42P01')    throw new Error(missingTableMsg());
    if (error.code === 'PGRST116') throw new Error('Document not found.');
    throw new Error(fmt(error));
  }
  return data;
}

// ── All documents for one entity ──────────────────────────────────────────────
export async function getDocumentsByEntity(entityType, entityRef) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_ref',  entityRef)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(fmt(error));
  }
  return data ?? [];
}

// ── Get signed URL for preview (1-hour default) ───────────────────────────────
export async function getSignedUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw new Error(`Could not generate file URL: ${error.message}`);
  return data.signedUrl;
}

// ── Get download URL (triggers browser download) ──────────────────────────────
export async function getDownloadUrl(storagePath, filename) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 300, { download: filename });

  if (error) throw new Error(`Could not generate download URL: ${error.message}`);
  return data.signedUrl;
}

// ── Update metadata ───────────────────────────────────────────────────────────
export async function updateDocument(id, payload) {
  const { data, error } = await supabase
    .from('documents')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(fmt(error));
  return data;
}

// ── Toggle verified ───────────────────────────────────────────────────────────
export async function toggleVerified(id, isVerified, verifiedBy = 'HR Admin') {
  return updateDocument(id, {
    is_verified: isVerified,
    verified_by:  isVerified ? verifiedBy : null,
    verified_at:  isVerified ? new Date().toISOString() : null,
  });
}

// ── Delete (storage + DB) ─────────────────────────────────────────────────────
export async function deleteDocument(id, storagePath) {
  const { error: storErr } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (storErr) throw new Error(`Storage delete failed: ${storErr.message}`);

  const { error: dbErr } = await supabase.from('documents').delete().eq('id', id);
  if (dbErr) throw new Error(fmt(dbErr));
}

// ── Search candidates for entity picker ───────────────────────────────────────
export async function searchCandidates(query) {
  const { data } = await supabase
    .from('candidates')
    .select('id, application_id, full_name, job_role, status')
    .or(`full_name.ilike.%${query}%,application_id.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(8);
  return data ?? [];
}

// ── Search employees for entity picker ────────────────────────────────────────
export async function searchEmployees(query) {
  const { data } = await supabase
    .from('employees')
    .select('id, employee_id, full_name, department, designation, status')
    .or(`full_name.ilike.%${query}%,employee_id.ilike.%${query}%`)
    .neq('status', 'terminated')
    .order('created_at', { ascending: false })
    .limit(8);
  return data ?? [];
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export async function getDocumentStats() {
  const { data, error } = await supabase
    .from('documents')
    .select('entity_type,document_type,is_verified,file_size');

  if (error) {
    if (error.code === '42P01') throw new Error(missingTableMsg());
    throw new Error(fmt(error));
  }

  const rows = data ?? [];
  const CLASSIFIED = ['resume','offer_letter','appointment_letter','id_proof','certificate','experience_letter'];

  return {
    total:          rows.length,
    byEntityType: {
      candidate: rows.filter((r) => r.entity_type === 'candidate').length,
      employee:  rows.filter((r) => r.entity_type === 'employee').length,
    },
    byDocumentType: {
      resume:              rows.filter((r) => r.document_type === 'resume').length,
      offer_letter:        rows.filter((r) => r.document_type === 'offer_letter').length,
      appointment_letter:  rows.filter((r) => r.document_type === 'appointment_letter').length,
      id_proof:            rows.filter((r) => r.document_type === 'id_proof').length,
      certificate:         rows.filter((r) => r.document_type === 'certificate').length,
      experience_letter:   rows.filter((r) => r.document_type === 'experience_letter').length,
      other:               rows.filter((r) => !CLASSIFIED.includes(r.document_type)).length,
    },
    verified:        rows.filter((r) => r.is_verified).length,
    totalSizeBytes:  rows.reduce((s, r) => s + (r.file_size || 0), 0),
  };
}

// ── Recent documents (dashboard feed) ────────────────────────────────────────
export async function getRecentDocuments(limit = 5) {
  const { data, error } = await supabase
    .from('documents')
    .select('id,document_number,entity_type,entity_ref,entity_name,document_type,document_name,file_size,mime_type,is_verified,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(fmt(error));
  return data ?? [];
}

// ── Utility: format file size ─────────────────────────────────────────────────
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1_048_576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

// ── Utility: categorise file by mime type ────────────────────────────────────
export function getFileCategory(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType === 'application/pdf')     return 'pdf';
  if (mimeType.startsWith('image/'))      return 'image';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
  if (mimeType === 'text/plain')          return 'text';
  return 'other';
}

// ── Utility: allowed MIME types for file input ────────────────────────────────
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateFile(file) {
  if (!file) return 'Please select a file.';
  if (file.size > MAX_FILE_SIZE) return `File is too large (${formatFileSize(file.size)}). Maximum size is 10 MB.`;
  if (!ALLOWED_MIME_TYPES.includes(file.type))
    return 'Unsupported file type. Allowed: PDF, images (JPG/PNG/GIF/WEBP), Word, Excel, Text.';
  return null;
}
