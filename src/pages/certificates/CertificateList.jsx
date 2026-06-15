import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getCertificates, getCertificateStats, deleteCertificate,
  CERT_TYPES, STATUS_LABELS,
} from '../../services/certificateService';
import '../../styles/Candidates.css';
import '../../styles/Certificates.css';

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  ...Object.entries(CERT_TYPES).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'issued',  label: 'Issued'  },
  { value: 'draft',   label: 'Draft'   },
  { value: 'revoked', label: 'Revoked' },
];

const TYPE_ICONS = {
  internship_completion: '🎓',
  training_completion:   '📚',
  employee_recognition:  '🏆',
  appreciation:          '🌟',
  achievement:           '🥇',
  course_completion:     '📜',
};

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function getPageRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4)          return [1, 2, 3, 4, 5, '…', total];
  if (cur >= total - 3)  return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', cur - 1, cur, cur + 1, '…', total];
}

export default function CertificateList() {
  const navigate = useNavigate();

  const [certs,      setCerts]      = useState([]);
  const [stats,      setStats]      = useState(null);
  const [total,      setTotal]      = useState(0);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statFilter, setStatFilter] = useState('');
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const loadGen = useRef(0); // tracks which load call is current

  const loadStats = useCallback(async () => {
    try { setStats(await getCertificateStats()); } catch {}
  }, []);

  const load = useCallback(async () => {
    const gen = ++loadGen.current;
    setLoading(true);
    setError('');
    try {
      const { data, count } = await getCertificates({
        search, typeFilter, statusFilter: statFilter, page, pageSize: PAGE_SIZE,
      });
      if (gen !== loadGen.current) return; // a newer call has already taken over
      setCerts(data);
      setTotal(count);
    } catch (e) {
      if (gen !== loadGen.current) return;
      setError((e && e.message) ? e.message : 'Failed to load certificates. Please check your connection.');
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }
  }, [search, typeFilter, statFilter, page]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statFilter]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCertificate(deleteTarget.id);
      setDeleteTarget(null);
      // Trigger reload by bumping page back to 1 or re-running load
      await Promise.all([load(), loadStats()]);
    } catch (e) {
      setError((e && e.message) ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Layout>
      <div className="cand-page">
        {/* Page header */}
        <div className="cert-page-header">
          <div className="cert-page-title-group">
            <h1 className="cert-page-title">Certificates</h1>
            <p className="cert-page-subtitle">Issue and manage employee certificates</p>
          </div>
          <button className="cert-btn cert-btn--primary" onClick={() => navigate('/certificates/new')}>
            + Generate Certificate
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="cert-stats-row">
            <div className="cert-stat-card">
              <div className="cert-stat-icon" style={{ background: '#eff0ff' }}>📜</div>
              <div className="cert-stat-info">
                <div className="cert-stat-value">{stats.total}</div>
                <div className="cert-stat-label">Total Certificates</div>
              </div>
            </div>
            <div className="cert-stat-card">
              <div className="cert-stat-icon" style={{ background: '#d1fae5' }}>✅</div>
              <div className="cert-stat-info">
                <div className="cert-stat-value">{stats.issued}</div>
                <div className="cert-stat-label">Issued</div>
              </div>
            </div>
            <div className="cert-stat-card">
              <div className="cert-stat-icon" style={{ background: '#f1f5f9' }}>📝</div>
              <div className="cert-stat-info">
                <div className="cert-stat-value">{stats.draft}</div>
                <div className="cert-stat-label">Draft</div>
              </div>
            </div>
            <div className="cert-stat-card">
              <div className="cert-stat-icon" style={{ background: '#fef2f2' }}>🚫</div>
              <div className="cert-stat-info">
                <div className="cert-stat-value">{stats.revoked}</div>
                <div className="cert-stat-label">Revoked</div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="cert-alert cert-alert--error">⚠ {error}</div>
        )}

        {/* Toolbar */}
        <div className="cert-toolbar">
          <div className="cert-search-wrap">
            <span className="cert-search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              className="cert-search"
              placeholder="Search by name, ID, program…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="cert-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select className="cert-filter-select" value={statFilter} onChange={(e) => setStatFilter(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div className="cert-toolbar-spacer" />
          <span className="cert-page-subtitle">{total} result{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="cert-table-wrap">
          <table className="cert-table">
            <thead>
              <tr>
                <th>Certificate #</th>
                <th>Recipient</th>
                <th>Type</th>
                <th>Program / Course</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}><div className="cert-skeleton" style={{ width: j === 0 ? 120 : j === 2 ? 130 : 90 }} /></td>
                    ))}
                  </tr>
                ))
              ) : certs.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="cert-empty">
                      <span className="cert-empty-icon">📜</span>
                      <p className="cert-empty-title">No certificates found</p>
                      <p className="cert-empty-sub">
                        {search || typeFilter || statFilter
                          ? 'Try adjusting your search or filters'
                          : 'Generate your first certificate to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                certs.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="cert-table-num">{c.certificate_number}</span>
                    </td>
                    <td>
                      <div className="cert-table-name">{c.recipient_name}</div>
                      {c.employee_id && <div className="cert-table-sub">ID: {c.employee_id}</div>}
                    </td>
                    <td>
                      <span className={`cert-badge cert-badge--${c.certificate_type}`}>
                        {TYPE_ICONS[c.certificate_type]} {CERT_TYPES[c.certificate_type]}
                      </span>
                    </td>
                    <td>{c.program_name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td>{fmtDate(c.issue_date)}</td>
                    <td>
                      <span className={`cert-badge cert-status--${c.status}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td>
                      <div className="cert-table-actions">
                        <button
                          className="cert-btn cert-btn--ghost cert-btn--sm"
                          onClick={() => navigate(`/certificates/${c.id}`)}
                        >
                          View
                        </button>
                        <button
                          className="cert-btn cert-btn--danger cert-btn--sm"
                          onClick={() => setDeleteTarget(c)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="cert-pagination">
              <span className="cert-page-info">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="cert-page-btns">
                <button className="cert-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                {getPageRange(page, totalPages).map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} className="cert-page-btn" style={{ border: 'none', background: 'none' }}>…</span>
                    : <button key={p} className={`cert-page-btn${page === p ? ' cert-page-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                )}
                <button className="cert-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <div className="cert-modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="cert-modal" onClick={(e) => e.stopPropagation()}>
            <p className="cert-modal-title">Delete Certificate?</p>
            <p className="cert-modal-body">
              This will permanently delete <strong>{deleteTarget.certificate_number}</strong> issued to{' '}
              <strong>{deleteTarget.recipient_name}</strong>. This action cannot be undone.
            </p>
            <div className="cert-modal-actions">
              <button className="cert-btn cert-btn--ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="cert-btn cert-btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
