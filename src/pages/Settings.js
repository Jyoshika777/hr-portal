import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import {
  getAppSettings, saveAppSettings, uploadCompanyLogo, removeCompanyLogo,
  getUserProfile, ensureUserProfile, saveUserProfile, saveNotificationPrefs,
  changePassword, getAllUserProfiles, updateUserRole,
  updateUserActiveStatus, deleteUserProfile,
} from '../services/settingsService';
import { applyTheme, applyDarkMode, applyDensity, ACCENT_PALETTES } from '../services/themeService';
import '../styles/Settings.css';

// ── Toast notification ────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className={`s-toast s-toast--${type}`} role="alert">
      <span className="s-toast-icon">{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
      <button className="s-toast-close" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}

// ── Persistent save footer — always visible, disabled when nothing changed ─
function SaveBar({ dirty, saving, onSave, onReset, error }) {
  return (
    <div className={`s-savebar${dirty ? ' s-savebar--dirty' : ''}`}>
      <div className="s-savebar-status">
        {error   && <span className="s-savebar-error"><span className="s-savebar-error-icon">⚠</span>{error}</span>}
        {!error  && dirty  && <span className="s-savebar-unsaved">You have unsaved changes</span>}
        {!error  && !dirty && !saving && <span className="s-savebar-clean">✓ All changes saved</span>}
      </div>
      <div className="s-savebar-actions">
        {dirty && (
          <button className="btn-ghost" onClick={onReset} disabled={saving}>Discard</button>
        )}
        <button
          className="btn-primary s-savebar-btn"
          onClick={onSave}
          disabled={saving || !dirty}
          aria-busy={saving}
        >
          {saving
            ? <><span className="s-savebar-spinner" aria-hidden="true" />Saving…</>
            : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 1 — My Profile
// ══════════════════════════════════════════════════════════════
const DEPT_OPTIONS = [
  '', 'Engineering', 'Human Resources', 'Finance', 'Marketing',
  'Operations', 'Sales', 'Design', 'Legal', 'Product', 'Customer Support', 'Other',
];

function ProfileTab({ session, onToast }) {
  const userId    = session?.user?.id ?? '';
  const userEmail = session?.user?.email ?? '';
  const initials  = (userEmail.split('@')[0] || 'HR').slice(0, 2).toUpperCase();

  const EMPTY = { display_name: '', phone: '', job_title: '', department: '', bio: '' };
  const [form,    setForm]    = useState(EMPTY);
  const [orig,    setOrig]    = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (!userId) return;
    ensureUserProfile(userId, userEmail)
      .then((p) => {
        const vals = {
          display_name: p?.display_name || '',
          phone:        p?.phone        || '',
          job_title:    p?.job_title    || '',
          department:   p?.department   || '',
          bio:          p?.bio          || '',
        };
        setForm(vals);
        setOrig(vals);
      })
      .catch((err) => setSaveErr(err.message))
      .finally(() => setLoading(false));
  }, [userId, userEmail]);

  const dirty = JSON.stringify(form) !== JSON.stringify(orig);

  const validate = () => {
    const e = {};
    if (!form.display_name.trim()) e.display_name = 'Display name is required';
    if (form.phone && !/^[\d\s+\-().]{7,20}$/.test(form.phone.trim()))
      e.phone = 'Enter a valid phone number (7–20 digits)';
    return e;
  };

  const handleChange = ({ target: { name, value } }) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSaveErr('');
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true); setSaveErr('');
    try {
      await saveUserProfile(userId, { ...form, email: userEmail });
      setOrig(form);
      onToast('Profile saved successfully.', 'success');
      window.dispatchEvent(new CustomEvent('profile-updated', {
        detail: { display_name: form.display_name },
      }));
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="s-loading">Loading profile…</div>;

  return (
    <div className="s-section">
      <div className="s-section-hd">
        <h3 className="s-section-title">My Profile</h3>
        <p className="s-section-sub">Update your name, contact details, job title, and bio.</p>
      </div>

      <div className="s-avatar-row">
        <div className="s-avatar">{initials}</div>
        <div>
          <div className="s-avatar-name">{form.display_name || userEmail.split('@')[0]}</div>
          <div className="s-avatar-email">{userEmail}</div>
          <div className="s-hint" style={{ marginTop: 4 }}>Avatar is generated from your initials.</div>
        </div>
      </div>

      <div className="s-form-grid">
        <div className="s-field">
          <label className="s-label">Display Name *</label>
          <input
            name="display_name"
            className={`s-input${errors.display_name ? ' s-input--err' : ''}`}
            value={form.display_name}
            onChange={handleChange}
            placeholder="e.g. Jane Smith"
          />
          {errors.display_name && <span className="s-err">{errors.display_name}</span>}
        </div>

        <div className="s-field">
          <label className="s-label">Email Address</label>
          <input className="s-input" value={userEmail} disabled />
          <span className="s-hint">Managed by your authentication provider.</span>
        </div>

        <div className="s-field">
          <label className="s-label">Phone</label>
          <input
            name="phone"
            type="tel"
            className={`s-input${errors.phone ? ' s-input--err' : ''}`}
            value={form.phone}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
          />
          {errors.phone && <span className="s-err">{errors.phone}</span>}
        </div>

        <div className="s-field">
          <label className="s-label">Job Title</label>
          <input
            name="job_title"
            className="s-input"
            value={form.job_title}
            onChange={handleChange}
            placeholder="e.g. HR Manager"
          />
        </div>

        <div className="s-field">
          <label className="s-label">Department</label>
          <select name="department" className="s-select" value={form.department} onChange={handleChange}>
            {DEPT_OPTIONS.map((d) => (
              <option key={d} value={d}>{d || '— Select department —'}</option>
            ))}
          </select>
        </div>

        <div className="s-field s-field--full">
          <label className="s-label">Bio</label>
          <textarea
            name="bio"
            className="s-textarea"
            rows={3}
            value={form.bio}
            onChange={handleChange}
            placeholder="A brief description about yourself…"
          />
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave}
        onReset={() => { setForm(orig); setErrors({}); setSaveErr(''); }} error={saveErr} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — Company Settings
// ══════════════════════════════════════════════════════════════
const INDUSTRY_OPTIONS = [
  'Technology', 'Finance & Banking', 'Healthcare', 'Manufacturing',
  'Retail & E-commerce', 'Education', 'Consulting', 'Media & Entertainment',
  'Real Estate', 'Transportation & Logistics', 'Energy', 'Non-profit', 'Other',
];
const SIZE_OPTIONS = [
  '1–10 employees', '11–50 employees', '51–200 employees',
  '201–500 employees', '501–1,000 employees', '1,000+ employees',
];

function CompanyTab({ onToast }) {
  const EMPTY = {
    company_name: '', company_industry: 'Technology', company_size: '51–200 employees',
    company_address: '', company_website: '', company_phone: '', company_email: '',
    company_logo_url: '',
  };
  const [form,          setForm]          = useState(EMPTY);
  const [orig,          setOrig]          = useState(EMPTY);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [errors,        setErrors]        = useState({});
  const [saveErr,       setSaveErr]       = useState('');
  const [logoPreview,   setLogoPreview]   = useState('');
  const [logoFile,      setLogoFile]      = useState(null);
  const [logoRemoved,   setLogoRemoved]   = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    getAppSettings()
      .then((s) => {
        const vals = {
          company_name:     s?.company_name     || '',
          company_industry: s?.company_industry || 'Technology',
          company_size:     s?.company_size     || '51–200 employees',
          company_address:  s?.company_address  || '',
          company_website:  s?.company_website  || '',
          company_phone:    s?.company_phone    || '',
          company_email:    s?.company_email    || '',
          company_logo_url: s?.company_logo_url || '',
        };
        setForm(vals);
        setOrig(vals);
        setLogoPreview(s?.company_logo_url || '');
        setLogoRemoved(false);
      })
      .catch((err) => setSaveErr(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(form) !== JSON.stringify(orig) || !!logoFile || logoRemoved;

  const validate = () => {
    const e = {};
    if (!form.company_name.trim()) e.company_name = 'Company name is required';
    if (form.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.company_email.trim()))
      e.company_email = 'Enter a valid email address';
    if (form.company_website && !/^https?:\/\/.+/.test(form.company_website.trim()))
      e.company_website = 'Must start with http:// or https://';
    return e;
  };

  const handleChange = ({ target: { name, value } }) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSaveErr('');
  };

  const LOGO_ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!LOGO_ALLOWED.includes(file.type)) {
      setSaveErr('Unsupported format. Please use PNG, JPG, JPEG, SVG, or WebP.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveErr('Logo must be under 2 MB.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setLogoFile(file);
    setLogoRemoved(false);
    setLogoPreview(URL.createObjectURL(file));
    setSaveErr('');
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setLogoRemoved(true);
    setForm((f) => ({ ...f, company_logo_url: '' }));
    if (fileRef.current) fileRef.current.value = '';
    setSaveErr('');
  };

  const handleUndoRemove = () => {
    setLogoRemoved(false);
    setLogoPreview(orig.company_logo_url);
    setForm((f) => ({ ...f, company_logo_url: orig.company_logo_url }));
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true); setSaveErr('');

    let logoUrl = form.company_logo_url;
    let uploadErr = null;

    if (logoFile) {
      setLogoUploading(true);
      try {
        logoUrl = await uploadCompanyLogo(logoFile);
        setLogoFile(null);
        if (fileRef.current) fileRef.current.value = '';
      } catch (err) {
        uploadErr = err.message;
      } finally {
        setLogoUploading(false);
      }
    } else if (logoRemoved) {
      // Delete from storage (best-effort) and clear the DB field
      try { await removeCompanyLogo(); } catch {}
      logoUrl = '';
      setLogoRemoved(false);
    }

    try {
      const saved = await saveAppSettings({ ...form, company_logo_url: logoUrl });
      const next = {
        company_name:     saved.company_name,     company_industry: saved.company_industry,
        company_size:     saved.company_size,     company_address:  saved.company_address,
        company_website:  saved.company_website,  company_phone:    saved.company_phone,
        company_email:    saved.company_email,    company_logo_url: saved.company_logo_url,
      };
      setForm(next);
      setOrig(next);
      setLogoPreview(saved.company_logo_url || '');

      // Notify Layout (and any other listener) of the updated branding
      window.dispatchEvent(new CustomEvent('company-settings-updated', {
        detail: {
          company_name:    saved.company_name    || '',
          company_logo_url: saved.company_logo_url || '',
        },
      }));

      if (uploadErr) {
        onToast(`Saved — but logo upload failed: ${uploadErr}`, 'error');
      } else {
        onToast('Company settings saved.', 'success');
      }
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(orig);
    setLogoFile(null);
    setLogoRemoved(false);
    setErrors({});
    setLogoPreview(orig.company_logo_url);
    setSaveErr('');
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) return <div className="s-loading">Loading company settings…</div>;

  const hasExistingLogo = !!orig.company_logo_url;

  return (
    <div className="s-section">
      <div className="s-section-hd">
        <h3 className="s-section-title">Company Settings</h3>
        <p className="s-section-sub">Update your organisation's profile, logo, and contact details.</p>
      </div>

      <div className="s-logo-row">
        <div className="s-logo-preview">
          {logoPreview
            ? <img src={logoPreview} alt="Company logo" className="s-logo-img" />
            : <span className="s-logo-placeholder">🏢</span>}
        </div>
        <div className="s-logo-info">
          <div className="s-logo-label">Company Logo</div>
          <div className="s-hint">PNG, JPG, SVG, WebP · Max 2 MB · Recommended 256×256 px</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={logoUploading || saving}>
              {logoUploading ? 'Uploading…' : (hasExistingLogo || logoFile) ? 'Replace Logo' : 'Upload Logo'}
            </button>
            {logoPreview && !logoRemoved && (
              <button className="btn-ghost" onClick={handleRemoveLogo} disabled={saving}>Remove Logo</button>
            )}
            {logoRemoved && (
              <button className="btn-ghost" onClick={handleUndoRemove} disabled={saving}>Undo Remove</button>
            )}
          </div>
          {logoFile && (
            <div className="s-hint" style={{ marginTop: 5, color: '#059669' }}>
              "{logoFile.name}" selected — click Save Changes to upload.
            </div>
          )}
          {logoRemoved && (
            <div className="s-hint" style={{ marginTop: 5, color: '#DC2626' }}>
              Logo will be removed when you save.
            </div>
          )}
        </div>
        <input ref={fileRef} type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/gif"
          style={{ display: 'none' }} onChange={handleLogoChange} />
      </div>

      <div className="s-form-grid">
        <div className="s-field">
          <label className="s-label">Company Name *</label>
          <input name="company_name"
            className={`s-input${errors.company_name ? ' s-input--err' : ''}`}
            value={form.company_name} onChange={handleChange} placeholder="Acme Corp" />
          {errors.company_name && <span className="s-err">{errors.company_name}</span>}
        </div>

        <div className="s-field">
          <label className="s-label">Industry</label>
          <select name="company_industry" className="s-select" value={form.company_industry} onChange={handleChange}>
            {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <div className="s-field">
          <label className="s-label">Company Size</label>
          <select name="company_size" className="s-select" value={form.company_size} onChange={handleChange}>
            {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="s-field">
          <label className="s-label">Company Email</label>
          <input name="company_email" type="email"
            className={`s-input${errors.company_email ? ' s-input--err' : ''}`}
            value={form.company_email} onChange={handleChange} placeholder="hr@yourcompany.com" />
          {errors.company_email && <span className="s-err">{errors.company_email}</span>}
        </div>

        <div className="s-field">
          <label className="s-label">Company Phone</label>
          <input name="company_phone" type="tel" className="s-input"
            value={form.company_phone} onChange={handleChange} placeholder="+1 (555) 000-0000" />
        </div>

        <div className="s-field">
          <label className="s-label">Website</label>
          <input name="company_website" type="url"
            className={`s-input${errors.company_website ? ' s-input--err' : ''}`}
            value={form.company_website} onChange={handleChange} placeholder="https://yourcompany.com" />
          {errors.company_website && <span className="s-err">{errors.company_website}</span>}
        </div>

        <div className="s-field s-field--full">
          <label className="s-label">Office Address</label>
          <textarea name="company_address" className="s-textarea" rows={2}
            value={form.company_address} onChange={handleChange}
            placeholder="123 Main Street, Suite 100, New York, NY 10001" />
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving || logoUploading}
        onSave={handleSave} onReset={handleReset} error={saveErr} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 3 — User Management
// ══════════════════════════════════════════════════════════════
const ROLE_META = {
  admin:      { label: 'Admin',      color: '#4F46E5', bg: '#EEF2FF' },
  hr_manager: { label: 'HR Manager', color: '#059669', bg: '#ECFDF5' },
  hr_user:    { label: 'HR User',    color: '#D97706', bg: '#FFFBEB' },
  viewer:     { label: 'Viewer',     color: '#64748B', bg: '#F1F5F9' },
};

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.viewer;
  return <span className="s-role-badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}

function UsersTab({ session, onToast }) {
  const currentUserId = session?.user?.id;
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(null);   // userId being saved
  const [deleting,  setDeleting]  = useState(null);  // userId being deleted
  const [confirmDel, setConfirmDel] = useState(null); // userId awaiting confirm

  const load = useCallback(() => {
    setLoading(true); setError('');
    getAllUserProfiles()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (userId, role) => {
    setSaving(userId);
    // Optimistic update
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    try {
      await updateUserRole(userId, role);
      onToast('Role updated.', 'success');
    } catch (err) {
      load(); // revert
      onToast(err.message, 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    setSaving(userId);
    const next = !currentActive;
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: next } : u));
    try {
      await updateUserActiveStatus(userId, next);
      onToast(next ? 'User activated.' : 'User deactivated.', 'success');
    } catch (err) {
      load(); // revert
      onToast(err.message, 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (userId) => {
    setConfirmDel(null);
    setDeleting(userId);
    try {
      await deleteUserProfile(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      onToast('User profile removed from portal.', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="s-section">
      <div className="s-section-hd">
        <h3 className="s-section-title">User Management</h3>
        <p className="s-section-sub">Manage portal users, roles, and access status.</p>
      </div>

      <div className="s-info-card">
        <span>ℹ️</span>
        <div>
          <strong>How to add users:</strong> New users sign up via the Login page. Once they sign in for the first time their profile appears here and you can assign a role.
          <br />
          <strong>Note:</strong> Removing a user here removes their portal profile but not their authentication account.
        </div>
      </div>

      {error && <div className="s-alert-error">{error}</div>}

      {loading ? (
        <div className="s-loading">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="s-empty">No user profiles found. Run migration 009_settings.sql to backfill existing users.</div>
      ) : (
        <div className="s-table-wrap">
          <table className="s-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Job Title</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === currentUserId;
                const busy = saving === u.id || deleting === u.id;
                return (
                  <tr key={u.id} className={`${isMe ? 's-table-tr--me' : ''}${!u.is_active ? ' s-table-tr--inactive' : ''}`}>
                    <td>
                      <div className="s-user-cell">
                        <div className="s-user-mini-avatar" style={{ opacity: u.is_active ? 1 : 0.45 }}>
                          {(u.display_name || u.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="s-user-cell-name">
                            {u.display_name || '—'}
                            {isMe && <span className="s-you-chip">You</span>}
                          </div>
                          <div className="s-user-cell-email">{u.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="s-td-muted">{u.job_title || '—'}</td>
                    <td>
                      {isMe ? (
                        <RoleBadge role={u.role} />
                      ) : (
                        <select className="s-role-select" value={u.role}
                          disabled={busy}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                          <option value="admin">Admin</option>
                          <option value="hr_manager">HR Manager</option>
                          <option value="hr_user">HR User</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {isMe ? (
                        <span className="s-status-chip s-status-chip--on">Active</span>
                      ) : (
                        <button
                          className={`s-status-chip ${u.is_active ? 's-status-chip--on' : 's-status-chip--off'}`}
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          disabled={busy}
                          title={u.is_active ? 'Click to deactivate' : 'Click to activate'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      )}
                    </td>
                    <td className="s-td-muted">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td>
                      {!isMe && (
                        confirmDel === u.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className="s-td-muted" style={{ fontSize: 12 }}>Confirm?</span>
                            <button className="btn-danger s-btn-xs" onClick={() => handleDelete(u.id)} disabled={busy}>
                              {deleting === u.id ? '…' : 'Remove'}
                            </button>
                            <button className="btn-ghost s-btn-xs" onClick={() => setConfirmDel(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="s-delete-btn" onClick={() => setConfirmDel(u.id)}
                            disabled={busy} title="Remove user profile">✕</button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="s-autosave-bar">
        <span className="s-autosave-icon">⚡</span>
        Role and status changes save automatically — no Save button required.
      </div>

      <div className="s-role-legend">
        <div className="s-legend-title">Role Reference</div>
        <div className="s-legend-grid">
          {Object.entries(ROLE_META).map(([key, m]) => (
            <div key={key} className="s-legend-item">
              <RoleBadge role={key} />
              <span className="s-legend-desc">
                {key === 'admin'      && 'Full access to all settings and data'}
                {key === 'hr_manager' && 'Manage employees, candidates, and payroll'}
                {key === 'hr_user'    && 'View and edit HR records'}
                {key === 'viewer'     && 'Read-only access to all modules'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 4 — Notification Preferences
// ══════════════════════════════════════════════════════════════
const NOTIF_GROUPS = [
  {
    group: 'Recruitment',
    items: [
      { key: 'new_candidate',  label: 'New candidate applied',  sub: 'When a new candidate is added to the system' },
      { key: 'offer_accepted', label: 'Offer letter accepted',  sub: 'When a candidate accepts an offer' },
      { key: 'offer_rejected', label: 'Offer letter declined',  sub: 'When a candidate declines an offer' },
    ],
  },
  {
    group: 'Employees',
    items: [
      { key: 'employee_joined',   label: 'New employee onboarded',  sub: 'When a new employee joins the organisation' },
      { key: 'review_due',        label: 'Performance review due',  sub: 'Reminder when a review cycle approaches' },
      { key: 'payroll_processed', label: 'Payroll run completed',   sub: 'When a payroll cycle is processed' },
    ],
  },
  {
    group: 'Documents & Digests',
    items: [
      { key: 'doc_uploaded', label: 'Document uploaded',   sub: 'When a document is added to the system' },
      { key: 'email_digest', label: 'Weekly email digest', sub: 'Activity summary every Monday morning' },
    ],
  },
];

const DEFAULT_PREFS = {
  new_candidate: true, offer_accepted: true, offer_rejected: false,
  employee_joined: true, review_due: true, payroll_processed: false,
  doc_uploaded: false, email_digest: true,
};

function NotificationsTab({ session, onToast }) {
  const userId = session?.user?.id ?? '';
  const [prefs,   setPrefs]   = useState(DEFAULT_PREFS);
  const [orig,    setOrig]    = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (!userId) return;
    getUserProfile(userId)
      .then((p) => {
        if (p?.notification_prefs) {
          const merged = { ...DEFAULT_PREFS, ...p.notification_prefs };
          setPrefs(merged); setOrig(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const dirty = JSON.stringify(prefs) !== JSON.stringify(orig);

  const toggle = (key) => { setPrefs((p) => ({ ...p, [key]: !p[key] })); setSaveErr(''); };

  const handleSave = async () => {
    setSaving(true); setSaveErr('');
    try {
      await saveNotificationPrefs(userId, prefs);
      setOrig(prefs);
      onToast('Notification preferences saved.', 'success');
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="s-loading">Loading preferences…</div>;

  return (
    <div className="s-section">
      <div className="s-section-hd">
        <h3 className="s-section-title">Notification Preferences</h3>
        <p className="s-section-sub">Choose which events trigger a notification for you.</p>
      </div>

      {NOTIF_GROUPS.map(({ group, items }) => (
        <div key={group} className="s-notif-group">
          <div className="s-notif-group-label">{group}</div>
          {items.map(({ key, label, sub }) => (
            <div key={key} className="s-toggle-row">
              <div className="s-toggle-info">
                <span className="s-toggle-label">{label}</span>
                <span className="s-toggle-sub">{sub}</span>
              </div>
              <button
                className={`s-toggle${prefs[key] ? ' s-toggle--on' : ''}`}
                onClick={() => toggle(key)}
                aria-pressed={prefs[key]}
                aria-label={label}
              >
                <span className="s-toggle-knob" />
              </button>
            </div>
          ))}
        </div>
      ))}

      <SaveBar dirty={dirty} saving={saving}
        onSave={handleSave} onReset={() => setPrefs(orig)} error={saveErr} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 5 — HR Configuration
// ══════════════════════════════════════════════════════════════
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar' },   { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },{ value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },{ value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },{ value: 'AED', label: 'AED — UAE Dirham' },
];
const TIMEZONE_OPTIONS = [
  'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'Europe/London','Europe/Paris','Europe/Berlin',
  'Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Asia/Shanghai',
  'Australia/Sydney','Pacific/Auckland',
];
const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY  (06/13/2026)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY  (13/06/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD  (2026-06-13)' },
  { value: 'MMM D, YYYY',label: 'MMM D, YYYY (Jun 13, 2026)' },
];
const MONTH_OPTIONS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function HRConfigTab({ onToast }) {
  const EMPTY = {
    fiscal_year_start:  'January',
    default_currency:   'USD',
    timezone:           'UTC',
    date_format:        'MM/DD/YYYY',
    probation_days:     90,
    working_days:       ['Monday','Tuesday','Wednesday','Thursday','Friday'],
    employee_id_prefix: 'EMP',
    candidate_id_prefix:'CAN',
    offer_id_prefix:    'OFF',
  };
  const [form,    setForm]    = useState(EMPTY);
  const [orig,    setOrig]    = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const vals = {
          fiscal_year_start:  s?.fiscal_year_start  || 'January',
          default_currency:   s?.default_currency   || 'USD',
          timezone:           s?.timezone            || 'UTC',
          date_format:        s?.date_format         || 'MM/DD/YYYY',
          probation_days:     s?.probation_days      ?? 90,
          working_days:       s?.working_days        || ['Monday','Tuesday','Wednesday','Thursday','Friday'],
          employee_id_prefix: s?.employee_id_prefix  || 'EMP',
          candidate_id_prefix:s?.candidate_id_prefix || 'CAN',
          offer_id_prefix:    s?.offer_id_prefix     || 'OFF',
        };
        setForm(vals); setOrig(vals);
      })
      .catch((err) => setSaveErr(err.message))
      .finally(() => setLoading(false));
  }, []);

  const dirty = JSON.stringify(form) !== JSON.stringify(orig);

  const handleChange = ({ target: { name, value } }) => {
    setForm((f) => ({ ...f, [name]: name === 'probation_days' ? parseInt(value, 10) || 0 : value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSaveErr('');
  };

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      working_days: f.working_days.includes(day)
        ? f.working_days.filter((d) => d !== day)
        : [...f.working_days, day],
    }));
    setSaveErr('');
  };

  const validate = () => {
    const e = {};
    const pd = Number(form.probation_days);
    if (!pd || pd < 1 || pd > 730) e.probation_days = 'Must be 1–730 days';
    if (!form.working_days.length)  e.working_days   = 'Select at least one working day';
    if (!/^[A-Z0-9]{1,8}$/.test(form.employee_id_prefix))  e.employee_id_prefix  = '1–8 uppercase letters/digits';
    if (!/^[A-Z0-9]{1,8}$/.test(form.candidate_id_prefix)) e.candidate_id_prefix = '1–8 uppercase letters/digits';
    if (!/^[A-Z0-9]{1,8}$/.test(form.offer_id_prefix))     e.offer_id_prefix     = '1–8 uppercase letters/digits';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true); setSaveErr('');
    try {
      await saveAppSettings(form);
      setOrig(form);
      onToast('HR configuration saved.', 'success');
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="s-loading">Loading HR configuration…</div>;

  return (
    <div className="s-section">
      <div className="s-section-hd">
        <h3 className="s-section-title">HR Portal Configuration</h3>
        <p className="s-section-sub">Configure fiscal year, currency, ID formats, and HR policy defaults.</p>
      </div>

      {/* ID Prefixes */}
      <div className="s-subsection-title">ID Prefixes</div>
      <div className="s-info-card" style={{ marginBottom: 16 }}>
        <span>ℹ️</span>
        <span>Prefix changes apply to new records only. Existing IDs are not renamed.</span>
      </div>
      <div className="s-form-grid" style={{ marginBottom: 24 }}>
        {[
          { name: 'employee_id_prefix',  label: 'Employee ID Prefix',  example: 'e.g. EMP → EMP001' },
          { name: 'candidate_id_prefix', label: 'Candidate ID Prefix', example: 'e.g. CAN → CAN001' },
          { name: 'offer_id_prefix',     label: 'Offer Letter Prefix', example: 'e.g. OFF → OFF001' },
        ].map(({ name, label, example }) => (
          <div key={name} className="s-field">
            <label className="s-label">{label}</label>
            <input name={name}
              className={`s-input s-input--mono${errors[name] ? ' s-input--err' : ''}`}
              value={form[name]} onChange={handleChange}
              placeholder={example.split('→')[0].replace('e.g. ', '').trim()}
              maxLength={8}
              style={{ textTransform: 'uppercase' }}
              onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
            />
            {errors[name] ? <span className="s-err">{errors[name]}</span>
              : <span className="s-hint">{example}</span>}
          </div>
        ))}
      </div>

      {/* Calendar & locale */}
      <div className="s-subsection-title">Calendar & Locale</div>
      <div className="s-form-grid" style={{ marginBottom: 24 }}>
        <div className="s-field">
          <label className="s-label">Fiscal Year Start</label>
          <select name="fiscal_year_start" className="s-select" value={form.fiscal_year_start} onChange={handleChange}>
            {MONTH_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="s-hint">First month of your financial year.</span>
        </div>

        <div className="s-field">
          <label className="s-label">Default Currency</label>
          <select name="default_currency" className="s-select" value={form.default_currency} onChange={handleChange}>
            {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="s-field">
          <label className="s-label">Timezone</label>
          <select name="timezone" className="s-select" value={form.timezone} onChange={handleChange}>
            {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        <div className="s-field">
          <label className="s-label">Date Display Format</label>
          <select name="date_format" className="s-select" value={form.date_format} onChange={handleChange}>
            {DATE_FORMAT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {/* Employment defaults */}
      <div className="s-subsection-title">Employment Defaults</div>
      <div className="s-form-grid">
        <div className="s-field">
          <label className="s-label">Probation Period (days)</label>
          <input name="probation_days" type="number" min={1} max={730}
            className={`s-input${errors.probation_days ? ' s-input--err' : ''}`}
            value={form.probation_days} onChange={handleChange} />
          {errors.probation_days
            ? <span className="s-err">{errors.probation_days}</span>
            : <span className="s-hint">Default duration for new hire probation.</span>}
        </div>

        <div className="s-field s-field--full">
          <label className="s-label">Working Days</label>
          <div className="s-day-grid">
            {WEEKDAYS.map((day) => (
              <button key={day} type="button"
                className={`s-day-btn${form.working_days.includes(day) ? ' s-day-btn--on' : ''}`}
                onClick={() => toggleDay(day)}>
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          {errors.working_days
            ? <span className="s-err">{errors.working_days}</span>
            : <span className="s-hint">Used for leave calculations and scheduling.</span>}
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving}
        onSave={handleSave} onReset={() => { setForm(orig); setErrors({}); setSaveErr(''); }} error={saveErr} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 6 — Security
// ══════════════════════════════════════════════════════════════
function SecurityTab({ session, onToast }) {
  const userEmail  = session?.user?.email ?? '';
  const lastSignIn = session?.user?.last_sign_in_at;

  // Password change form
  const [pwd,     setPwd]     = useState({ current: '', password: '', confirm: '' });
  const [pwdErr,  setPwdErr]  = useState({});
  const [pwdSave, setPwdSave] = useState(false);
  const [pwdMsg,  setPwdMsg]  = useState('');
  const [showPwd, setShowPwd] = useState({ current: false, password: false, confirm: false });

  // Security policy (stored in app_settings)
  const POL_EMPTY = {
    min_password_length:   8,
    require_uppercase:     true,
    require_numbers:       true,
    require_special_chars: false,
    session_timeout_minutes: 480,
  };
  const [policy,     setPolicy]     = useState(POL_EMPTY);
  const [policyOrig, setPolicyOrig] = useState(POL_EMPTY);
  const [polLoad,    setPolLoad]    = useState(true);
  const [polSave,    setPolSave]    = useState(false);
  const [polErr,     setPolErr]     = useState('');

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const p = {
          min_password_length:     s?.min_password_length     ?? 8,
          require_uppercase:       s?.require_uppercase       ?? true,
          require_numbers:         s?.require_numbers         ?? true,
          require_special_chars:   s?.require_special_chars   ?? false,
          session_timeout_minutes: s?.session_timeout_minutes ?? 480,
        };
        setPolicy(p); setPolicyOrig(p);
      })
      .catch(() => {})
      .finally(() => setPolLoad(false));
  }, []);

  const polDirty = JSON.stringify(policy) !== JSON.stringify(policyOrig);

  const handlePolChange = ({ target: { name, value, type, checked } }) => {
    setPolicy((p) => ({ ...p, [name]: type === 'checkbox' ? checked : (parseInt(value, 10) || 0) }));
    setPolErr('');
  };

  const handlePolSave = async () => {
    setPolSave(true); setPolErr('');
    try {
      await saveAppSettings(policy);
      setPolicyOrig(policy);
      onToast('Security policy saved.', 'success');
    } catch (err) {
      setPolErr(err.message);
    } finally {
      setPolSave(false);
    }
  };

  // Password strength
  const strength = (() => {
    const p = pwd.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)           s++;
    if (p.length >= 12)          s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p))  s++;
    return s;
  })();
  const strengthLabel = ['','Weak','Fair','Good','Strong','Very Strong'][strength] || '';
  const strengthColor = ['','#EF4444','#F59E0B','#EAB308','#22C55E','#059669'][strength] || '';

  const validatePwd = () => {
    const e = {};
    if (!pwd.current)                    e.current  = 'Current password is required';
    if (!pwd.password)                   e.password = 'New password is required';
    else if (pwd.password.length < policy.min_password_length)
      e.password = `Must be at least ${policy.min_password_length} characters`;
    else if (policy.require_uppercase && !/[A-Z]/.test(pwd.password))
      e.password = 'Must include at least one uppercase letter';
    else if (policy.require_numbers && !/[0-9]/.test(pwd.password))
      e.password = 'Must include at least one number';
    else if (policy.require_special_chars && !/[^A-Za-z0-9]/.test(pwd.password))
      e.password = 'Must include at least one special character';
    if (pwd.password !== pwd.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handlePwdChange = ({ target: { name, value } }) => {
    setPwd((f) => ({ ...f, [name]: value }));
    setPwdErr((prev) => ({ ...prev, [name]: '' }));
    setPwdMsg('');
  };

  const handlePwdSubmit = async (e) => {
    e.preventDefault();
    const errs = validatePwd();
    if (Object.keys(errs).length) { setPwdErr(errs); return; }
    setPwdSave(true); setPwdMsg('');
    try {
      await changePassword(userEmail, pwd.current, pwd.password);
      setPwd({ current: '', password: '', confirm: '' });
      onToast('Password changed successfully.', 'success');
    } catch (err) {
      setPwdMsg(err.message);
    } finally {
      setPwdSave(false);
    }
  };

  const PwdToggle = ({ field }) => (
    <button type="button" className="s-pwd-toggle" tabIndex={-1}
      onClick={() => setShowPwd((p) => ({ ...p, [field]: !p[field] }))}>
      {showPwd[field] ? '🙈' : '👁️'}
    </button>
  );

  return (
    <div className="s-section">
      <div className="s-section-hd">
        <h3 className="s-section-title">Security Settings</h3>
        <p className="s-section-sub">Manage your password, security policy, and session settings.</p>
      </div>

      {/* Session info */}
      <div className="s-security-info">
        <div className="s-security-info-row">
          <span className="s-security-info-label">Signed in as</span>
          <span className="s-security-info-val">{userEmail}</span>
        </div>
        {lastSignIn && (
          <div className="s-security-info-row">
            <span className="s-security-info-label">Last sign-in</span>
            <span className="s-security-info-val">
              {new Date(lastSignIn).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
        )}
      </div>

      {/* Security Policy */}
      <div className="s-subsection-title">Password & Session Policy</div>
      {polLoad ? <div className="s-loading" style={{ padding: '20px 0' }}>Loading policy…</div> : (
        <div className="s-policy-grid">
          <div className="s-policy-card">
            <div className="s-policy-card-title">Minimum Password Length</div>
            <div className="s-policy-card-body">
              <input name="min_password_length" type="number" min={6} max={32}
                className="s-input" style={{ width: 80 }}
                value={policy.min_password_length} onChange={handlePolChange} />
              <span className="s-hint">characters (6–32)</span>
            </div>
          </div>

          <div className="s-policy-card">
            <div className="s-policy-card-title">Session Timeout</div>
            <div className="s-policy-card-body">
              <input name="session_timeout_minutes" type="number" min={15} max={10080}
                className="s-input" style={{ width: 90 }}
                value={policy.session_timeout_minutes} onChange={handlePolChange} />
              <span className="s-hint">minutes (15 min – 7 days)</span>
            </div>
          </div>

          {[
            { name: 'require_uppercase',     label: 'Require Uppercase Letters',  sub: 'At least one A–Z in passwords' },
            { name: 'require_numbers',       label: 'Require Numbers',            sub: 'At least one 0–9 in passwords' },
            { name: 'require_special_chars', label: 'Require Special Characters', sub: 'At least one !@#$%^ etc.' },
          ].map(({ name, label, sub }) => (
            <div key={name} className="s-policy-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="s-policy-card-title">{label}</div>
                  <div className="s-hint">{sub}</div>
                </div>
                <button
                  className={`s-toggle${policy[name] ? ' s-toggle--on' : ''}`}
                  onClick={() => setPolicy((p) => ({ ...p, [name]: !p[name] }))}
                  aria-pressed={policy[name]}
                  aria-label={label}
                  style={{ flexShrink: 0, marginLeft: 12 }}>
                  <span className="s-toggle-knob" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <SaveBar dirty={polDirty} saving={polSave}
        onSave={handlePolSave} onReset={() => setPolicy(policyOrig)} error={polErr} />

      <div style={{ marginTop: 32 }}>
        <div className="s-subsection-title">Change Password</div>
        {pwdMsg && <div className="s-alert-error" style={{ marginBottom: 16 }}>{pwdMsg}</div>}

        <form onSubmit={handlePwdSubmit} noValidate>
          <div className="s-form-grid">
            <div className="s-field s-field--full">
              <label className="s-label">Current Password *</label>
              <div className="s-pwd-wrap">
                <input name="current" type={showPwd.current ? 'text' : 'password'}
                  className={`s-input s-input--pwd${pwdErr.current ? ' s-input--err' : ''}`}
                  value={pwd.current} onChange={handlePwdChange}
                  placeholder="Enter your current password" autoComplete="current-password" />
                <PwdToggle field="current" />
              </div>
              {pwdErr.current && <span className="s-err">{pwdErr.current}</span>}
            </div>

            <div className="s-field">
              <label className="s-label">New Password *</label>
              <div className="s-pwd-wrap">
                <input name="password" type={showPwd.password ? 'text' : 'password'}
                  className={`s-input s-input--pwd${pwdErr.password ? ' s-input--err' : ''}`}
                  value={pwd.password} onChange={handlePwdChange}
                  placeholder={`Min ${policy.min_password_length} chars`} autoComplete="new-password" />
                <PwdToggle field="password" />
              </div>
              {pwd.password && (
                <div className="s-strength-bar">
                  <div className="s-strength-track">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className="s-strength-seg"
                        style={{ background: i <= strength ? strengthColor : '#E2E8F0' }} />
                    ))}
                  </div>
                  <span className="s-strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
              {pwdErr.password && <span className="s-err">{pwdErr.password}</span>}
            </div>

            <div className="s-field">
              <label className="s-label">Confirm New Password *</label>
              <div className="s-pwd-wrap">
                <input name="confirm" type={showPwd.confirm ? 'text' : 'password'}
                  className={`s-input s-input--pwd${pwdErr.confirm ? ' s-input--err' : ''}`}
                  value={pwd.confirm} onChange={handlePwdChange}
                  placeholder="Repeat new password" autoComplete="new-password" />
                <PwdToggle field="confirm" />
              </div>
              {pwdErr.confirm && <span className="s-err">{pwdErr.confirm}</span>}
            </div>
          </div>

          <div className="s-password-rules">
            {[
              { ok: pwd.password.length >= policy.min_password_length, text: `${policy.min_password_length}+ characters` },
              { ok: /[A-Z]/.test(pwd.password), text: 'Uppercase letter', skip: !policy.require_uppercase },
              { ok: /[0-9]/.test(pwd.password), text: 'Number', skip: !policy.require_numbers },
              { ok: /[^A-Za-z0-9]/.test(pwd.password), text: 'Special character', skip: !policy.require_special_chars },
            ].filter((r) => !r.skip).map(({ ok, text }) => (
              <div key={text} className="s-pwd-rule">
                <span className={ok ? 's-rule-ok' : 's-rule-no'}>{ok ? '✓' : '○'}</span>
                {text}
              </div>
            ))}
          </div>

          <div className="s-form-actions">
            <button type="submit" className="btn-primary" disabled={pwdSave}>
              {pwdSave ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      <div className="s-danger-zone">
        <div className="s-danger-title">Danger Zone</div>
        <div className="s-danger-card s-danger-card--red">
          <div>
            <div className="s-danger-card-title" style={{ color: '#B91C1C' }}>Delete Account</div>
            <div className="s-danger-card-sub">Permanently remove this account. This action cannot be undone.</div>
          </div>
          <button className="btn-danger" disabled>Delete Account</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 7 — Appearance
// ══════════════════════════════════════════════════════════════
const DENSITIES = [
  { key: 'compact',     label: 'Compact',     sub: 'More content, less padding' },
  { key: 'comfortable', label: 'Comfortable', sub: 'Default — balanced spacing' },
  { key: 'spacious',    label: 'Spacious',    sub: 'More breathing room' },
];

// Derive the swatch list directly from ACCENT_PALETTES so it's always in sync
const ACCENT_OPTIONS = Object.entries(ACCENT_PALETTES).map(([key, p]) => ({
  key, label: p.label, color: p.c500,
}));

function AppearanceTab({ onToast }) {
  const read = (k, def) => { try { return localStorage.getItem(k) || def; } catch { return def; } };

  const [theme,      setTheme]      = useState(() => read('hr_theme', 'light'));
  const [accent,     setAccent]     = useState(() => read('hr_accent', 'indigo'));
  const [density,    setDensity]    = useState(() => read('hr_density', 'comfortable'));
  const [sidebarDef, setSidebarDef] = useState(() => read('hr_sidebar_default', 'expanded') === 'collapsed');
  const [saving,     setSaving]     = useState(false);

  const [orig, setOrig] = useState(() => ({
    theme:      read('hr_theme',           'light'),
    accent:     read('hr_accent',          'indigo'),
    density:    read('hr_density',         'comfortable'),
    sidebarDef: read('hr_sidebar_default', 'expanded') === 'collapsed',
  }));

  const dirty = theme !== orig.theme || accent !== orig.accent ||
                density !== orig.density || sidebarDef !== orig.sidebarDef;

  // Live preview when user clicks an option
  const handleAccentClick = (key) => { setAccent(key); applyTheme(key); };
  const handleThemeClick  = (key) => { setTheme(key);  applyDarkMode(key); };
  const handleDensityClick= (key) => { setDensity(key); applyDensity(key); };

  const handleSave = async () => {
    setSaving(true);
    try { localStorage.setItem('hr_theme',           theme);                                  } catch {}
    try { localStorage.setItem('hr_accent',          accent);                                 } catch {}
    try { localStorage.setItem('hr_density',         density);                                } catch {}
    try { localStorage.setItem('hr_sidebar_default', sidebarDef ? 'collapsed' : 'expanded'); } catch {}

    applyTheme(accent);
    applyDarkMode(theme);
    applyDensity(density);

    setOrig({ theme, accent, density, sidebarDef });

    try {
      await saveAppSettings({ accent_color: accent, sidebar_collapsed_default: sidebarDef });
    } catch {}

    setSaving(false);
    onToast('Appearance saved and applied.', 'success');
  };

  const handleReset = () => {
    setTheme(orig.theme);
    setAccent(orig.accent);
    setDensity(orig.density);
    setSidebarDef(orig.sidebarDef);
    applyTheme(orig.accent);
    applyDarkMode(orig.theme);
    applyDensity(orig.density);
  };

  return (
    <div className="s-section">
      <div className="s-section-hd">
        <h3 className="s-section-title">Appearance</h3>
        <p className="s-section-sub">
          Customise how the HR Portal looks for you. Changes apply immediately and persist after page refresh.
        </p>
      </div>

      <div className="s-subsection-title">Theme</div>
      <div className="s-theme-grid" style={{ marginBottom: 6 }}>
        {[
          { key: 'light',  label: 'Light',  bg: '#F8FAFC' },
          { key: 'dark',   label: 'Dark',   bg: '#0F172A' },
          { key: 'system', label: 'System', bg: 'linear-gradient(135deg,#F8FAFC 50%,#0F172A 50%)' },
        ].map(({ key, label, bg }) => (
          <button key={key}
            className={`s-theme-card${theme === key ? ' s-theme-card--active' : ''}`}
            onClick={() => handleThemeClick(key)}>
            <div className="s-theme-preview" style={{ background: bg }}>
              <div className="s-theme-preview-sidebar" />
              <div className="s-theme-preview-body">
                <div className="s-theme-preview-bar" />
                <div className="s-theme-preview-card" />
              </div>
            </div>
            <div className="s-theme-label">
              {label}{theme === key && <span className="s-theme-check">✓</span>}
            </div>
          </button>
        ))}
      </div>
      <p className="s-hint" style={{ marginBottom: 24 }}>Select a theme — it applies instantly across the portal.</p>

      <div className="s-subsection-title">Accent Color</div>
      <div className="s-accent-grid" style={{ marginBottom: 10 }}>
        {ACCENT_OPTIONS.map(({ key, label, color }) => (
          <button key={key}
            className={`s-accent-btn${accent === key ? ' s-accent-btn--active' : ''}`}
            title={label}
            style={{ background: color }}
            onClick={() => handleAccentClick(key)}
          />
        ))}
      </div>
      <p className="s-hint" style={{ marginBottom: 24 }}>
        Current: <strong>{ACCENT_PALETTES[accent]?.label ?? accent}</strong> — click a swatch to preview instantly.
      </p>

      <div className="s-subsection-title">Display Density</div>
      <div className="s-density-grid" style={{ marginBottom: 24 }}>
        {DENSITIES.map(({ key, label, sub }) => (
          <label key={key}
            className={`s-density-card${density === key ? ' s-density-card--active' : ''}`}>
            <input type="radio" name="density" value={key} checked={density === key}
              onChange={() => handleDensityClick(key)} style={{ display: 'none' }} />
            <div className="s-density-icon">
              {key === 'compact' ? '▣' : key === 'comfortable' ? '▢' : '□'}
            </div>
            <div className="s-density-label">{label}</div>
            <div className="s-density-sub">{sub}</div>
          </label>
        ))}
      </div>

      <div className="s-subsection-title">Sidebar</div>
      <div className="s-toggle-row" style={{ marginBottom: 24, padding: '14px 0', borderBottom: '1px solid #F1F5F9' }}>
        <div className="s-toggle-info">
          <span className="s-toggle-label">Start sidebar collapsed by default</span>
          <span className="s-toggle-sub">When disabled the sidebar always opens expanded.</span>
        </div>
        <button className={`s-toggle${sidebarDef ? ' s-toggle--on' : ''}`}
          onClick={() => setSidebarDef((v) => !v)} aria-pressed={sidebarDef}
          aria-label="Sidebar collapsed default">
          <span className="s-toggle-knob" />
        </button>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onReset={handleReset} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Settings Page
// ══════════════════════════════════════════════════════════════
const TABS = [
  { key: 'profile',       label: 'My Profile',       icon: '👤' },
  { key: 'company',       label: 'Company',           icon: '🏢' },
  { key: 'users',         label: 'Users',             icon: '👥' },
  { key: 'notifications', label: 'Notifications',     icon: '🔔' },
  { key: 'hrconfig',      label: 'HR Configuration',  icon: '⚙️' },
  { key: 'security',      label: 'Security',          icon: '🔐' },
  { key: 'appearance',    label: 'Appearance',        icon: '🎨' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [toast,     setToast]     = useState({ message: '', type: 'success' });
  const { session } = useAuth();

  const onToast   = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const clearToast = useCallback(() => setToast({ message: '', type: 'success' }), []);

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':       return <ProfileTab       session={session} onToast={onToast} />;
      case 'company':       return <CompanyTab       onToast={onToast} />;
      case 'users':         return <UsersTab         session={session} onToast={onToast} />;
      case 'notifications': return <NotificationsTab session={session} onToast={onToast} />;
      case 'hrconfig':      return <HRConfigTab      onToast={onToast} />;
      case 'security':      return <SecurityTab      session={session} onToast={onToast} />;
      case 'appearance':    return <AppearanceTab    onToast={onToast} />;
      default:              return null;
    }
  };

  return (
    <Layout>
      <Toast message={toast.message} type={toast.type} onClose={clearToast} />

      <div className="s-page">
        <div className="s-page-header">
          <h2 className="page-title">Settings</h2>
          <p className="page-subtitle">Manage your profile, company, and portal configuration.</p>
        </div>

        <div className="s-layout">
          <nav className="s-nav" aria-label="Settings navigation">
            {TABS.map(({ key, label, icon }) => (
              <button key={key}
                className={`s-nav-btn${activeTab === key ? ' s-nav-btn--active' : ''}`}
                onClick={() => setActiveTab(key)}>
                <span className="s-nav-icon">{icon}</span>
                <span className="s-nav-label">{label}</span>
              </button>
            ))}
          </nav>

          <div className="s-content">
            {renderTab()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
