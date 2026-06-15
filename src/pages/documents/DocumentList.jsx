import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getDocuments, deleteDocument, formatFileSize, getFileCategory,
} from '../../services/documentService';
import '../../styles/Candidates.css';
import '../../styles/Documents.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const ENTITY_FILTERS = [
  { value: '',          label: 'All'        },
  { value: 'candidate', label: 'Candidates' },
  { value: 'employee',  label: 'Employees'  },
];

const TYPE_OPTIONS = [
  { value: '',                    label: 'All Types'            },
  { value: 'resume',              label: 'Resume'               },
  { value: 'offer_letter',        label: 'Offer Letter'         },
  { value: 'appointment_letter',  label: 'Appointment Letter'   },
  { value: 'id_proof',            label: 'ID Proof'             },
  { value: 'certificate',         label: 'Certificate'          },
  { value: 'experience_letter',   label: 'Experience Letter'    },
  { value: 'nda',                 label: 'NDA'                  },
  { value: 'contract',            label: 'Contract'             },
  { value: 'other',               label: 'Other'                },
];

const VERIFY_OPTIONS = [
  { value: '',      label: 'Any Status' },
  { value: 'true',  label: 'Verified'   },
  { value: 'false', label: 'Unverified' },
];

const TYPE_LABELS = {
  resume:'Resume', offer_letter:'Offer Letter', appointment_letter:'Appointment Letter',
  id_proof:'ID Proof', certificate:'Certificate', experience_letter:'Experience Letter',
  nda:'NDA', contract:'Contract', other:'Other',
};

const FILE_ICONS = { pdf:'PDF', image:'IMG', word:'DOC', excel:'XLS', text:'TXT', other:'FILE' };

function getPageRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4)          return [1,2,3,4,5,'…',total];
  if (cur >= total - 3)  return [1,'…',total-4,total-3,total-2,total-1,total];
  return [1,'…',cur-1,cur,cur+1,'…',total];
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DocumentList() {
  const navigate = useNavigate();

  const [docs,         setDocs]         = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [search,       setSearch]       = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [verifyFilter, setVerifyFilter] = useState('');
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, count } = await getDocuments({
        search, entity_type: entityFilter, document_type: typeFilter,
        is_verified: verifyFilter, page, pageSize: PAGE_SIZE,
      });
      setDocs(data);
      setTotalCount(count);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, entityFilter, typeFilter, verifyFilter, page]);

  useEffect(() => { setPage(1); }, [search, entityFilter, typeFilter, verifyFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, totalCount);
  const hasFilters = search || entityFilter || typeFilter || verifyFilter;

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.id, deleteTarget.storage_path);
      setDeleteTarget(null);
      const newTotal = Math.max(1, Math.ceil((totalCount - 1) / PAGE_SIZE));
      if (page > newTotal) setPage(newTotal);
      else await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Document Management</h2>
          <p className="page-subtitle">
            {loading
              ? 'Loading…'
              : `${totalCount} document${totalCount !== 1 ? 's' : ''}${hasFilters ? ' — filtered' : ''}`}
          </p>
        </div>
        <Link to="/documents/upload" className="btn-primary">+ Upload Document</Link>
      </div>

      {/* ── Controls ── */}
      <div className="list-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, entity, ID, filename…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-bar">
          {ENTITY_FILTERS.map((opt) => (
            <button
              key={opt.value}
              className={`filter-btn${entityFilter === opt.value ? ' filter-btn--active' : ''}`}
              onClick={() => setEntityFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}

          <span style={{ width:1, background:'#e2e8f0', margin:'2px 4px', alignSelf:'stretch' }} />

          <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select className="filter-select" value={verifyFilter} onChange={(e) => setVerifyFilter(e.target.value)}>
            {VERIFY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {/* ── Table ── */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Doc #</th>
              <th>File</th>
              <th>Doc Type</th>
              <th>Entity</th>
              <th>Size</th>
              <th>Verified</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {[80,160,100,140,60,70,90,96].map((w, j) => (
                    <td key={j}><span className="skeleton-cell" style={{ width:w }} /></td>
                  ))}
                </tr>
              ))
              : docs.length === 0
                ? (
                  <tr><td colSpan={8}>
                    <div className="table-empty">
                      {hasFilters
                        ? 'No documents match your search or filters.'
                        : 'No documents uploaded yet. Click "+ Upload Document" to get started.'}
                    </div>
                  </td></tr>
                )
                : docs.map((doc) => {
                  const cat = getFileCategory(doc.mime_type);
                  return (
                    <tr
                      key={doc.id}
                      className="clickable-row"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <td className="td-mono" style={{ whiteSpace:'nowrap', fontSize:12 }}>{doc.document_number}</td>

                      <td>
                        <div className="td-file-col">
                          <div className={`file-icon-box file-icon-${cat}`}>{FILE_ICONS[cat]}</div>
                          <div>
                            <p className="td-file-name">{doc.document_name}</p>
                            <p className="td-file-orig">{doc.original_filename}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`doc-type-badge doc-type-${doc.document_type}`}>
                          {TYPE_LABELS[doc.document_type] ?? doc.document_type}
                        </span>
                      </td>

                      <td>
                        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                          <span className={`entity-chip-${doc.entity_type}`}>
                            {doc.entity_type === 'candidate' ? 'Candidate' : 'Employee'}
                          </span>
                          <span style={{ fontSize:13, fontWeight:500, color:'#0f172a' }}>{doc.entity_name}</span>
                          <span style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace' }}>{doc.entity_ref}</span>
                        </div>
                      </td>

                      <td style={{ whiteSpace:'nowrap', fontSize:12, color:'#64748b' }}>
                        {formatFileSize(doc.file_size)}
                      </td>

                      <td>
                        {doc.is_verified
                          ? <span className="doc-verified-badge">✓ Verified</span>
                          : <span className="doc-unverified-badge">Pending</span>}
                      </td>

                      <td style={{ whiteSpace:'nowrap', fontSize:12, color:'#64748b' }}>
                        {fmtDate(doc.created_at)}
                      </td>

                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <Link to={`/documents/${doc.id}`} className="action-link">View</Link>
                          <button
                            className="action-link action-link--danger"
                            onClick={() => setDeleteTarget(doc)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {rangeStart}–{rangeEnd} of {totalCount} documents
          </span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            {getPageRange(page, totalPages).map((p, i) =>
              p === '…'
                ? <span key={`e-${i}`} className="page-ellipsis">…</span>
                : <button key={p} className={`page-btn${page === p ? ' page-btn--active':''}`} onClick={() => setPage(p)}>{p}</button>
            )}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Document</h3>
            <p className="modal-body">
              Permanently delete <strong>{deleteTarget.document_name}</strong> ({deleteTarget.original_filename})?
              This will also remove the file from storage. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</button>
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
