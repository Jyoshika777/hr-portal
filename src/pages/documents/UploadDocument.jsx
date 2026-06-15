import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  uploadDocument, searchCandidates, searchEmployees,
  validateFile, formatFileSize, getFileCategory, ALLOWED_MIME_TYPES,
} from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Candidates.css';
import '../../styles/Documents.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_OPTIONS = [
  { value: 'resume',             label: 'Resume'                           },
  { value: 'offer_letter',       label: 'Offer Letter'                     },
  { value: 'appointment_letter', label: 'Appointment Letter'               },
  { value: 'id_proof',           label: 'ID Proof (Aadhaar / PAN / Passport)' },
  { value: 'certificate',        label: 'Certificate (Degree / Course)'    },
  { value: 'experience_letter',  label: 'Experience / Relieving Letter'    },
  { value: 'nda',                label: 'Non-Disclosure Agreement (NDA)'   },
  { value: 'contract',           label: 'Employment Contract'              },
  { value: 'other',              label: 'Other Document'                   },
];

const FILE_ICONS = { pdf:'📄', image:'🖼️', word:'📝', excel:'📊', text:'📃', other:'📎' };

const ACCEPT = ALLOWED_MIME_TYPES.join(',');

function buildEmpty() {
  return {
    entityType:    'candidate',
    entityId:      '',
    entityRef:     '',
    entityName:    '',
    documentType:  'resume',
    documentName:  '',
    remarks:       '',
  };
}

function validate(form, file) {
  const e = {};
  if (!form.entityRef.trim()) e.entityRef    = 'Select a candidate or employee';
  if (!form.documentType)     e.documentType = 'Required';
  if (!form.documentName.trim()) e.documentName = 'Required';

  const fileErr = validateFile(file);
  if (fileErr) e.file = fileErr;

  return e;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({ label, error, hint, children, span }) {
  return (
    <div className="form-field" style={span ? { gridColumn:'1/-1' } : undefined}>
      <label className="form-label">{label}</label>
      {children}
      {hint  && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

function SectionDivider({ title, subtitle }) {
  return (
    <div className="doc-section-divider">
      <p className="doc-section-title">{title}</p>
      {subtitle && <p className="doc-section-sub">{subtitle}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UploadDocument() {
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const { session }      = useAuth();

  const preEntityType = searchParams.get('entityType');
  const preEntityRef  = searchParams.get('entityRef');
  const preEntityId   = searchParams.get('entityId');
  const preEntityName = searchParams.get('entityName');

  const initForm = { ...buildEmpty() };
  if (preEntityType) initForm.entityType = preEntityType;
  if (preEntityRef)  initForm.entityRef  = preEntityRef;
  if (preEntityId)   initForm.entityId   = preEntityId;
  if (preEntityName) initForm.entityName = preEntityName;

  const [form,        setForm]        = useState(initForm);
  const [file,        setFile]        = useState(null);
  const [errors,      setErrors]      = useState({});
  const [uploading,   setUploading]   = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [dragover,    setDragover]    = useState(false);

  // Entity search
  const [entityQuery,    setEntityQuery]    = useState(preEntityName || '');
  const [entityResults,  setEntityResults]  = useState([]);
  const [entityLoading,  setEntityLoading]  = useState(false);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced entity search
  useEffect(() => {
    if (!entityQuery.trim() || form.entityRef) {
      setEntityResults([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      setEntityLoading(true);
      try {
        const results = form.entityType === 'candidate'
          ? await searchCandidates(entityQuery)
          : await searchEmployees(entityQuery);
        setEntityResults(results);
        setShowDropdown(results.length > 0);
      } catch {
        setEntityResults([]);
      } finally {
        setEntityLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [entityQuery, form.entityType, form.entityRef]);

  function switchEntityType(type) {
    setForm((f) => ({ ...f, entityType: type, entityId: '', entityRef: '', entityName: '' }));
    setEntityQuery('');
    setEntityResults([]);
    setShowDropdown(false);
  }

  function selectEntity(result) {
    const ref  = form.entityType === 'candidate' ? result.application_id : result.employee_id;
    const name = result.full_name;
    setForm((f) => ({ ...f, entityId: result.id, entityRef: ref, entityName: name }));
    setEntityQuery(name);
    setShowDropdown(false);
    setEntityResults([]);
    setErrors((e) => { const c = { ...e }; delete c.entityRef; return c; });
  }

  function clearEntity() {
    setForm((f) => ({ ...f, entityId: '', entityRef: '', entityName: '' }));
    setEntityQuery('');
  }

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (errors[field]) setErrors((er) => { const c = { ...er }; delete c[field]; return c; });
    };
  }

  function handleFileChange(selected) {
    if (!selected) return;
    setFile(selected);
    if (errors.file) setErrors((e) => { const c = { ...e }; delete c.file; return c; });
    // Auto-fill document name from filename
    if (!form.documentName) {
      const base = selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setForm((f) => ({ ...f, documentName: base }));
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileChange(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form, file);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setUploading(true);
    setApiError('');
    try {
      const uploadedBy = session?.user?.email ?? 'Unknown';
      const created = await uploadDocument({
        file,
        entityType:   form.entityType,
        entityRef:    form.entityRef,
        entityId:     form.entityId   || null,
        entityName:   form.entityName,
        documentType: form.documentType,
        documentName: form.documentName.trim(),
        remarks:      form.remarks.trim() || null,
        uploadedBy,
      });
      navigate(`/documents/${created.id}`);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const cat = file ? getFileCategory(file.type) : null;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to="/documents" className="back-link">← Documents</Link>
          <h2 className="page-title" style={{ marginTop:4 }}>Upload Document</h2>
          <p className="page-subtitle">Upload and link a document to a candidate or employee</p>
        </div>
      </div>

      {apiError && <div className="alert-error" style={{ marginBottom:16 }}>{apiError}</div>}

      <form onSubmit={handleSubmit} noValidate className="doc-form">

        {/* ══ Entity Type ══════════════════════════════════════════════════ */}
        <SectionDivider title="Link to Entity" subtitle="Select whether this document belongs to a candidate or an employee" />

        <Field label="Entity Type *" error={errors.entityRef}>
          <div className="doc-entity-type-tabs">
            {['candidate', 'employee'].map((t) => (
              <button
                key={t}
                type="button"
                className={`doc-entity-type-btn${form.entityType === t ? ' doc-entity-type-btn--active' : ''}`}
                onClick={() => switchEntityType(t)}
              >
                {t === 'candidate' ? '👤 Candidate' : '🏢 Employee'}
              </button>
            ))}
          </div>
        </Field>

        {/* Entity search */}
        <div className="doc-form-grid">
          <Field
            label={`Search ${form.entityType === 'candidate' ? 'Candidate' : 'Employee'} *`}
            error={errors.entityRef}
          >
            <div className="doc-entity-search-wrap" ref={wrapRef}>
              <input
                type="text"
                className={`form-input${errors.entityRef ? ' form-input--error' : ''}`}
                placeholder={`Type name or ${form.entityType === 'candidate' ? 'Application' : 'Employee'} ID…`}
                value={entityQuery}
                onChange={(e) => {
                  setEntityQuery(e.target.value);
                  if (form.entityRef) clearEntity();
                }}
                onFocus={() => entityResults.length > 0 && setShowDropdown(true)}
                autoComplete="off"
              />
              {entityLoading && <span className="doc-entity-spinner">Searching…</span>}
              {showDropdown && entityResults.length > 0 && (
                <div className="doc-entity-dropdown">
                  {entityResults.map((r) => {
                    const ref  = form.entityType === 'candidate' ? r.application_id : r.employee_id;
                    const meta = form.entityType === 'candidate'
                      ? `${r.job_role ?? ''} · ${r.status ?? ''}`
                      : [r.department, r.designation].filter(Boolean).join(' · ');
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className="doc-entity-option"
                        onMouseDown={(e) => { e.preventDefault(); selectEntity(r); }}
                      >
                        <span className="doc-entity-opt-ref">{ref}</span>
                        <span className="doc-entity-opt-name">{r.full_name}</span>
                        {meta && <span className="doc-entity-opt-meta">{meta}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Field>

          {form.entityRef ? (
            <div className="doc-entity-selected">
              <p className="doc-entity-selected-ref">{form.entityRef}</p>
              <p className="doc-entity-selected-name">{form.entityName}</p>
              <p className="doc-entity-selected-meta">
                <span className={`entity-chip-${form.entityType}`}>
                  {form.entityType === 'candidate' ? 'Candidate' : 'Employee'}
                </span>
                <button
                  type="button"
                  onClick={clearEntity}
                  style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:12, marginLeft:8, fontFamily:'inherit' }}
                >
                  × Change
                </button>
              </p>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center' }}>
              <p style={{ color:'#94a3b8', fontSize:13 }}>← Search and select an entity</p>
            </div>
          )}
        </div>

        {/* ══ Document Info ════════════════════════════════════════════════ */}
        <SectionDivider title="Document Details" />
        <div className="doc-form-grid">
          <Field label="Document Type *" error={errors.documentType}>
            <select
              className={`form-select${errors.documentType ? ' form-input--error' : ''}`}
              value={form.documentType}
              onChange={set('documentType')}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Document Title *" error={errors.documentName} hint="A descriptive name for this document">
            <input
              type="text"
              className={`form-input${errors.documentName ? ' form-input--error' : ''}`}
              placeholder="e.g. John's Resume – May 2024"
              value={form.documentName}
              onChange={set('documentName')}
            />
          </Field>
        </div>

        {/* ══ File Upload ══════════════════════════════════════════════════ */}
        <SectionDivider
          title="File"
          subtitle="PDF, JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX, TXT · Max 10 MB"
        />

        {file ? (
          <div className="doc-file-selected">
            <div style={{ fontSize:28 }}>{FILE_ICONS[cat] ?? FILE_ICONS.other}</div>
            <div className="doc-file-selected-info">
              <p className="doc-file-selected-name">{file.name}</p>
              <p className="doc-file-selected-meta">
                {formatFileSize(file.size)} · {file.type || 'Unknown type'}
              </p>
            </div>
            <button type="button" className="doc-file-clear" onClick={() => setFile(null)}>×</button>
          </div>
        ) : (
          <div
            className={`doc-upload-zone${dragover ? ' doc-upload-zone--dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={onDrop}
          >
            <span className="doc-upload-icon">📁</span>
            <p className="doc-upload-text">Drop your file here, or click to browse</p>
            <p className="doc-upload-hint">PDF · Images · Word · Excel · Text · Max 10 MB</p>
            <input
              type="file"
              accept={ACCEPT}
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
          </div>
        )}
        {errors.file && <p className="form-error" style={{ marginTop:6 }}>{errors.file}</p>}

        {/* ══ Remarks ═════════════════════════════════════════════════════ */}
        <SectionDivider title="Internal Remarks (optional)" />
        <div className="form-field">
          <label className="form-label">Remarks</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Any notes about this document (visible only to HR)…"
            value={form.remarks}
            onChange={set('remarks')}
          />
        </div>

        {/* ══ Actions ═════════════════════════════════════════════════════ */}
        <div className="form-actions">
          <Link to="/documents" className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
