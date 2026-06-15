import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getDocumentById, deleteDocument, toggleVerified, updateDocument,
  getSignedUrl, getDownloadUrl, formatFileSize, getFileCategory,
} from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Candidates.css';
import '../../styles/Documents.css';

// ── Label maps ────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  resume:'Resume', offer_letter:'Offer Letter', appointment_letter:'Appointment Letter',
  id_proof:'ID Proof', certificate:'Certificate', experience_letter:'Experience Letter',
  nda:'NDA', contract:'Contract', other:'Other',
};

const FILE_ICONS = { pdf:'PDF', image:'IMG', word:'DOC', excel:'XLS', text:'TXT', other:'FILE' };
const FILE_EMOJI = { pdf:'📄', image:'🖼️', word:'📝', excel:'📊', text:'📃', other:'📎' };

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-IN', {
    year:'numeric', month:'short', day:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MetaField({ label, value, badge, mono }) {
  return (
    <div className="doc-meta-field">
      <span className="doc-meta-label">{label}</span>
      <span className={`doc-meta-value${mono ? ' doc-meta-value--mono' : ''}`}>
        {badge || value || '—'}
      </span>
    </div>
  );
}

function PreviewPanel({ doc, previewUrl }) {
  const cat = getFileCategory(doc.mime_type);

  return (
    <div className="doc-preview-panel">
      <div className="doc-preview-toolbar">
        <p className="doc-preview-title">
          {FILE_EMOJI[cat] ?? FILE_EMOJI.other} {doc.original_filename}
        </p>
      </div>

      <div className="doc-preview-body">
        {!previewUrl ? (
          <div className="doc-preview-unsupported">
            <span className="doc-preview-unsupported-icon">⚠️</span>
            <p className="doc-preview-unsupported-title">Preview not available</p>
            <p className="doc-preview-unsupported-sub">Could not generate a signed URL for this file.</p>
          </div>
        ) : cat === 'pdf' ? (
          <iframe
            src={previewUrl}
            className="doc-preview-iframe"
            title={doc.document_name}
          />
        ) : cat === 'image' ? (
          <img
            src={previewUrl}
            alt={doc.document_name}
            className="doc-preview-img"
          />
        ) : cat === 'text' ? (
          <iframe
            src={previewUrl}
            className="doc-preview-iframe"
            title={doc.document_name}
          />
        ) : (
          <div className="doc-preview-unsupported">
            <span className="doc-preview-unsupported-icon">
              {FILE_EMOJI[cat] ?? FILE_EMOJI.other}
            </span>
            <p className="doc-preview-unsupported-title">Preview not supported</p>
            <p className="doc-preview-unsupported-sub">
              {doc.original_filename} ({doc.mime_type || 'unknown type'}) cannot be previewed in the browser.
              Use the Download button to open it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DocumentDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { session } = useAuth();

  const [doc,           setDoc]           = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [actionErr,     setActionErr]     = useState('');
  const [previewUrl,    setPreviewUrl]    = useState(null);
  const [showDelete,    setShowDelete]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [verifying,     setVerifying]     = useState(false);
  const [downloading,   setDownloading]   = useState(false);
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [remarksVal,    setRemarksVal]    = useState('');
  const [savingRemarks, setSavingRemarks] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDocumentById(id)
      .then((d) => {
        setDoc(d);
        setRemarksVal(d.remarks ?? '');
        return getSignedUrl(d.storage_path);
      })
      .then(setPreviewUrl)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDownload() {
    setDownloading(true);
    setActionErr('');
    try {
      const url = await getDownloadUrl(doc.storage_path, doc.original_filename);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setActionErr('');
    try {
      const reviewer = session?.user?.email ?? 'HR Admin';
      const updated  = await toggleVerified(id, !doc.is_verified, reviewer);
      setDoc(updated);
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSaveRemarks() {
    setSavingRemarks(true);
    setActionErr('');
    try {
      const updated = await updateDocument(id, { remarks: remarksVal.trim() || null });
      setDoc(updated);
      setEditingRemarks(false);
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setSavingRemarks(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDocument(id, doc.storage_path);
      navigate('/documents');
    } catch (e) {
      setActionErr(e.message);
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading) return <Layout><div className="page-loading">Loading document…</div></Layout>;

  if (error || !doc) {
    return (
      <Layout>
        <div className="alert-error">
          {error || 'Document not found.'}
          <Link to="/documents" style={{ marginLeft:12 }}>← Back</Link>
        </div>
      </Layout>
    );
  }

  const cat = getFileCategory(doc.mime_type);

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <Link to="/documents" className="back-link">← Documents</Link>
          <h2 className="page-title" style={{ marginTop:4 }}>
            <span className={`doc-type-badge doc-type-${doc.document_type}`} style={{ marginRight:10, verticalAlign:'middle' }}>
              {TYPE_LABELS[doc.document_type] ?? doc.document_type}
            </span>
            {doc.document_name}
          </h2>
          <p className="page-subtitle">
            {doc.document_number} · {doc.entity_name} ({doc.entity_ref})
          </p>
        </div>

        <div className="detail-header-actions">
          <button
            className={doc.is_verified ? 'btn-ghost' : 'btn-secondary'}
            disabled={verifying}
            onClick={handleVerify}
          >
            {verifying
              ? 'Updating…'
              : doc.is_verified ? '✓ Verified · Revoke' : '☐ Mark Verified'}
          </button>
          <button className="btn-primary" disabled={downloading} onClick={handleDownload}>
            {downloading ? 'Preparing…' : '↓ Download'}
          </button>
          <Link
            to={`/documents/upload?entityType=${doc.entity_type}&entityRef=${doc.entity_ref}&entityId=${doc.entity_id ?? ''}&entityName=${encodeURIComponent(doc.entity_name)}`}
            className="btn-secondary"
          >
            + Upload Another
          </Link>
          <button className="btn-danger" onClick={() => setShowDelete(true)}>Delete</button>
        </div>
      </div>

      {actionErr && <div className="alert-error" style={{ marginBottom:16 }}>{actionErr}</div>}

      {/* ── 2-column layout ── */}
      <div className="doc-detail-layout">

        {/* ── Sidebar: metadata ── */}
        <aside className="doc-detail-sidebar">

          {/* File info */}
          <div className="doc-meta-card">
            <p className="doc-meta-card-title">File Information</p>

            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div className={`file-icon-box file-icon-${cat}`} style={{ width:52, height:52, fontSize:16 }}>
                {FILE_ICONS[cat]}
              </div>
              <div>
                <p style={{ fontWeight:600, fontSize:14, color:'#0f172a', margin:0, wordBreak:'break-all' }}>
                  {doc.original_filename}
                </p>
                <p style={{ fontSize:12, color:'#64748b', margin:'3px 0 0' }}>
                  {formatFileSize(doc.file_size)} · {doc.mime_type}
                </p>
              </div>
            </div>

            <div className="doc-meta-fields">
              <MetaField label="Document Number" value={doc.document_number} mono />
              <MetaField label="Document Type"
                badge={
                  <span className={`doc-type-badge doc-type-${doc.document_type}`}>
                    {TYPE_LABELS[doc.document_type] ?? doc.document_type}
                  </span>
                }
              />
              <MetaField label="Verification"
                badge={
                  doc.is_verified
                    ? <span className="doc-verified-badge">✓ Verified</span>
                    : <span className="doc-unverified-badge">Pending Verification</span>
                }
              />
              {doc.is_verified && (
                <>
                  <MetaField label="Verified By"   value={doc.verified_by} />
                  <MetaField label="Verified At"   value={fmtDate(doc.verified_at)} />
                </>
              )}
            </div>
          </div>

          {/* Entity info */}
          <div className="doc-meta-card">
            <p className="doc-meta-card-title">Linked To</p>
            <div className="doc-meta-fields">
              <MetaField label="Entity Type"
                badge={
                  <span className={`entity-chip-${doc.entity_type}`}>
                    {doc.entity_type === 'candidate' ? 'Candidate' : 'Employee'}
                  </span>
                }
              />
              <MetaField label="Name"  value={doc.entity_name} />
              <MetaField label="ID"    value={doc.entity_ref}  mono />
            </div>

            <div style={{ marginTop:14, display:'flex', gap:8 }}>
              {doc.entity_type === 'candidate' ? (
                <Link
                  to={`/documents/entity/candidate/${doc.entity_ref}`}
                  className="doc-action-btn"
                  style={{ fontSize:12 }}
                >
                  View All Candidate Docs
                </Link>
              ) : (
                <Link
                  to={`/documents/entity/employee/${doc.entity_ref}`}
                  className="doc-action-btn"
                  style={{ fontSize:12 }}
                >
                  View All Employee Docs
                </Link>
              )}
            </div>
          </div>

          {/* Upload metadata */}
          <div className="doc-meta-card">
            <p className="doc-meta-card-title">Upload Details</p>
            <div className="doc-meta-fields">
              <MetaField label="Uploaded By" value={doc.uploaded_by} />
              <MetaField label="Uploaded On" value={fmtDate(doc.created_at)} />
              <MetaField label="Last Updated" value={fmtDate(doc.updated_at)} />
            </div>
          </div>

          {/* Remarks */}
          <div className="doc-meta-card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <p className="doc-meta-card-title" style={{ marginBottom:0, paddingBottom:0, borderBottom:'none' }}>
                Internal Remarks
              </p>
              {!editingRemarks && (
                <button
                  type="button"
                  className="action-link"
                  onClick={() => setEditingRemarks(true)}
                  style={{ fontSize:12 }}
                >
                  Edit
                </button>
              )}
            </div>

            {editingRemarks ? (
              <div>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={remarksVal}
                  onChange={(e) => setRemarksVal(e.target.value)}
                  style={{ marginBottom:8 }}
                />
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn-primary" style={{ fontSize:12, padding:'5px 14px' }}
                    disabled={savingRemarks} onClick={handleSaveRemarks}>
                    {savingRemarks ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn-ghost" style={{ fontSize:12, padding:'5px 14px' }}
                    onClick={() => { setEditingRemarks(false); setRemarksVal(doc.remarks ?? ''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize:13, color: doc.remarks ? '#374151' : '#94a3b8', lineHeight:1.6, margin:0 }}>
                {doc.remarks || 'No remarks recorded.'}
              </p>
            )}
          </div>
        </aside>

        {/* ── Preview ── */}
        <main>
          <PreviewPanel
            doc={doc}
            previewUrl={previewUrl}
          />
        </main>
      </div>

      {/* ── Delete modal ── */}
      {showDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Document</h3>
            <p className="modal-body">
              Permanently delete <strong>{doc.document_name}</strong> ({doc.original_filename})?
              This will also remove the file from storage and cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" disabled={deleting} onClick={() => setShowDelete(false)}>
                Cancel
              </button>
              <button className="btn-danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
