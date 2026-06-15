import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getDocumentsByEntity, deleteDocument, toggleVerified, getDownloadUrl,
  formatFileSize, getFileCategory,
} from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Candidates.css';
import '../../styles/Documents.css';

// ── Label maps ─────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  resume:'Resume', offer_letter:'Offer Letter', appointment_letter:'Appointment Letter',
  id_proof:'ID Proof', certificate:'Certificate', experience_letter:'Experience Letter',
  nda:'NDA', contract:'Contract', other:'Other',
};

const FILE_ICONS = { pdf:'PDF', image:'IMG', word:'DOC', excel:'XLS', text:'TXT', other:'FILE' };
const FILE_EMOJI = { pdf:'📄', image:'🖼️', word:'📝', excel:'📊', text:'📃', other:'📎' };

const TYPE_COLORS = {
  resume:'#2563eb', offer_letter:'#7c3aed', appointment_letter:'#9333ea',
  id_proof:'#b45309', certificate:'#15803d', experience_letter:'#0f766e',
  nda:'#b91c1c', contract:'#c2410c', other:'#475569',
};

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TypeBreakdown({ docs }) {
  const types = Object.keys(TYPE_LABELS);
  const counts = types.map((t) => ({ type:t, count: docs.filter((d) => d.document_type === t).length }));
  const filled = counts.filter((c) => c.count > 0);
  const max    = Math.max(...filled.map((c) => c.count), 1);

  if (filled.length === 0) return null;

  return (
    <div className="doc-type-breakdown">
      {filled.map(({ type, count }) => (
        <div key={type} className="doc-type-row">
          <span className={`doc-type-badge doc-type-${type}`} style={{ minWidth:130 }}>
            {TYPE_LABELS[type]}
          </span>
          <div className="doc-type-bar-track">
            <div
              className="doc-type-bar-fill"
              style={{ width:`${(count / max) * 100}%`, background: TYPE_COLORS[type] ?? '#2563eb' }}
            />
          </div>
          <span className="doc-type-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EntityDocuments() {
  const { entityType, entityRef } = useParams();
  const [searchParams]            = useSearchParams();
  const { session }               = useAuth();

  const preEntityName = searchParams.get('entityName') ?? entityRef;

  const [docs,         setDocs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [actionErr,    setActionErr]    = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [verifyingId,  setVerifyingId]  = useState(null);
  const [downloadingId,setDownloadingId]= useState(null);

  useEffect(() => {
    setLoading(true);
    getDocumentsByEntity(entityType, entityRef)
      .then(setDocs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [entityType, entityRef]);

  const entityName    = docs[0]?.entity_name ?? preEntityName;
  const totalSize     = docs.reduce((s, d) => s + (d.file_size || 0), 0);
  const verifiedCount = docs.filter((d) => d.is_verified).length;

  async function handleDownload(doc) {
    setDownloadingId(doc.id);
    setActionErr('');
    try {
      const url = await getDownloadUrl(doc.storage_path, doc.original_filename);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = doc.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleVerify(doc) {
    setVerifyingId(doc.id);
    setActionErr('');
    try {
      const reviewer = session?.user?.email ?? 'HR Admin';
      const updated  = await toggleVerified(doc.id, !doc.is_verified, reviewer);
      setDocs((prev) => prev.map((d) => d.id === doc.id ? updated : d));
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setVerifyingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.id, deleteTarget.storage_path);
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setDeleting(false);
    }
  }

  const uploadLink = `/documents/upload?entityType=${entityType}&entityRef=${entityRef}&entityName=${encodeURIComponent(entityName)}`;
  const backLink   = entityType === 'candidate'
    ? '/candidates'
    : '/employees';

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <Link to={backLink} className="back-link">
            ← Back to {entityType === 'candidate' ? 'Candidates' : 'Employees'}
          </Link>
          <h2 className="page-title" style={{ marginTop:4 }}>Documents</h2>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${entityType === 'candidate' ? 'Candidate' : 'Employee'} · ${entityRef}`}
          </p>
        </div>
        <Link to={uploadLink} className="btn-primary">+ Upload Document</Link>
      </div>

      {error    && <div className="alert-error" style={{ marginBottom:16 }}>{error}</div>}
      {actionErr && <div className="alert-error" style={{ marginBottom:16 }}>{actionErr}</div>}

      {/* ── Entity header banner ── */}
      {!loading && (
        <div className="doc-entity-header">
          <div className="doc-entity-header-info">
            <span className="doc-entity-header-ref">{entityRef}</span>
            <h3 className="doc-entity-header-name">{entityName}</h3>
            <p className="doc-entity-header-sub">
              {entityType === 'candidate' ? 'Candidate Documents' : 'Employee Documents'}
            </p>
          </div>

          <div className="doc-entity-stats">
            <div className="doc-entity-stat">
              <div className="doc-entity-stat-val">{docs.length}</div>
              <div className="doc-entity-stat-lbl">Total</div>
            </div>
            <div className="doc-entity-stat">
              <div className="doc-entity-stat-val">{verifiedCount}</div>
              <div className="doc-entity-stat-lbl">Verified</div>
            </div>
            <div className="doc-entity-stat">
              <div className="doc-entity-stat-val">{formatFileSize(totalSize)}</div>
              <div className="doc-entity-stat-lbl">Total Size</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Type breakdown + document list ── */}
      {!loading && docs.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20, alignItems:'flex-start' }}>

          {/* Type breakdown sidebar */}
          <div className="doc-meta-card">
            <p className="doc-meta-card-title">By Type</p>
            <TypeBreakdown docs={docs} />
          </div>

          {/* Document cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {docs.map((doc) => {
              const cat = getFileCategory(doc.mime_type);
              return (
                <div key={doc.id} className="doc-card">
                  <div className={`file-icon-box file-icon-${cat}`}>{FILE_ICONS[cat]}</div>

                  <div className="doc-card-info">
                    <p className="doc-card-name">{doc.document_name}</p>
                    <p className="doc-card-meta">
                      <span className={`doc-type-badge doc-type-${doc.document_type}`}>
                        {TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </span>
                      <span>{FILE_EMOJI[cat]} {doc.original_filename}</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{fmtDate(doc.created_at)}</span>
                      {doc.is_verified
                        ? <span className="doc-verified-badge">✓ Verified</span>
                        : <span className="doc-unverified-badge">Pending</span>}
                    </p>
                  </div>

                  <div className="doc-card-actions">
                    <Link to={`/documents/${doc.id}`} className="doc-action-btn">
                      👁 View
                    </Link>
                    <button
                      className="doc-action-btn"
                      disabled={downloadingId === doc.id}
                      onClick={() => handleDownload(doc)}
                    >
                      {downloadingId === doc.id ? '…' : '↓ Download'}
                    </button>
                    <button
                      className={`doc-action-btn${doc.is_verified ? '' : ' doc-action-btn--success'}`}
                      disabled={verifyingId === doc.id}
                      onClick={() => handleVerify(doc)}
                    >
                      {verifyingId === doc.id
                        ? '…'
                        : doc.is_verified ? 'Revoke' : '✓ Verify'}
                    </button>
                    <button
                      className="doc-action-btn doc-action-btn--danger"
                      onClick={() => setDeleteTarget(doc)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && docs.length === 0 && (
        <div style={{ textAlign:'center', padding:'56px 0', color:'#94a3b8' }}>
          <p style={{ fontSize:36, marginBottom:12 }}>📂</p>
          <p style={{ fontSize:16, fontWeight:600, color:'#475569', marginBottom:6 }}>
            No documents for {entityName}
          </p>
          <p style={{ fontSize:13, marginBottom:20 }}>
            Upload resumes, ID proofs, certificates, and other documents here.
          </p>
          <Link to={uploadLink} className="btn-primary">Upload First Document</Link>
        </div>
      )}

      {loading && <div className="page-loading">Loading documents…</div>}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Document</h3>
            <p className="modal-body">
              Permanently delete <strong>{deleteTarget.document_name}</strong>?
              This will remove the file from storage and cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn-danger" disabled={deleting} onClick={confirmDelete}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
