import { supabase } from './supabaseClient';

// ── App Settings (single row, partial-field-safe UPDATE) ──────

export async function getAppSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Merges only the supplied fields — never nulls out unrelated columns.
export async function saveAppSettings(fields) {
  const { data: existing } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  const payload = { ...fields, updated_at: new Date().toISOString() };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('app_settings')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

const ALLOWED_LOGO_TYPES = {
  'image/png':     'png',
  'image/jpeg':    'jpg',
  'image/jpg':     'jpg',
  'image/svg+xml': 'svg',
  'image/webp':    'webp',
  'image/gif':     'gif',
};

export async function uploadCompanyLogo(file) {
  // Client-side validation
  if (!file) throw new Error('No file selected.');
  if (file.size > 2 * 1024 * 1024) throw new Error('Logo must be under 2 MB.');
  const ext = ALLOWED_LOGO_TYPES[file.type];
  if (!ext) throw new Error('Unsupported format. Please use PNG, JPG, SVG, or WebP.');

  const path = `logos/company-logo.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('company-assets')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    if (uploadError.message?.toLowerCase().includes('bucket')) {
      throw new Error(
        'Storage bucket "company-assets" not found. ' +
        'Run migration 010_company_assets_bucket.sql in your Supabase SQL Editor first.'
      );
    }
    throw new Error(uploadError.message || 'Logo upload failed.');
  }

  const { data } = supabase.storage.from('company-assets').getPublicUrl(path);
  // Bust cache so sidebar/topbar pick up the new logo immediately
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function removeCompanyLogo() {
  // Delete every possible extension — we don't know which one was uploaded.
  const exts = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'];
  try {
    await supabase.storage
      .from('company-assets')
      .remove(exts.map((e) => `logos/company-logo.${e}`));
  } catch {}
  return saveAppSettings({ company_logo_url: '' });
}

// ── User Profile ──────────────────────────────────────────────

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Ensures a profile row exists; creates it if the trigger missed it.
export async function ensureUserProfile(userId, email) {
  const existing = await getUserProfile(userId);
  if (existing) return existing;
  // INSERT only — trigger should have done this, but we guard against it.
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email: email || '',
      display_name: (email || '').split('@')[0],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveUserProfile(userId, fields) {
  const payload = { ...fields, id: userId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveNotificationPrefs(userId, prefs) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      { id: userId, notification_prefs: prefs, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Password change ───────────────────────────────────────────
// Re-authenticates first to verify the current password, then updates.

export async function changePassword(email, currentPassword, newPassword) {
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verifyErr) throw new Error('Current password is incorrect.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ── User Management ───────────────────────────────────────────

export async function getAllUserProfiles() {
  // auth.users is in the auth schema — not accessible via PostgREST.
  // Email is stored directly on user_profiles (populated by trigger + backfill).
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateUserRole(userId, role) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserActiveStatus(userId, isActive) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Deletes the profile row. The auth.users row remains (requires service_role to remove).
// The user will no longer appear in the portal's user list.
export async function deleteUserProfile(userId) {
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);
  if (error) throw error;
}
