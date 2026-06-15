import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getReviews, deleteReview } from '../../services/performanceService';
import '../../styles/Candidates.css';
import '../../styles/Performance.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: '',             label: 'All Statuses' },
  { value: 'draft',        label: 'Draft'        },
  { value: 'submitted',    label: 'Submitted'    },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'closed',       label: 'Closed'       },
];

const TYPE_OPTIONS = [
  { value: '',             label: 'All Types'     },
  { value: 'annual',       label: 'Annual'        },
  { value: 'quarterly',    label: 'Quarterly'     },
  { value: 'probation',    label: 'Probation'     },
  { value: 'pip',          label: 'PIP'           },
  { value: 'promotion',    label: 'Promotion'     },
  { value: 'warning',      label: 'Warning'       },
  { value: 'commendation', label: 'Commendation'  },
  { value: 'exit',         label: 'Exit'          },
];

const RATING_OPTIONS = [
  { value: '',                      label: 'All Ratings'          },
  { value: 'outstanding',           label: 'Outstanding (5)'      },
  { value: 'exceeds_expectations',  label: 'Exceeds (4+)'         },
  { value: 'meets_expectations',    label: 'Meets (3+)'           },
  { value: 'needs_improvement',     label: 'Needs Improvement'    },
  { value: 'unsatisfactory',        label: 'Unsatisfactory'       },
];

const TYPE_LABELS = {
  annual:       'Annual',
  quarterly:    'Quarterly',
  probation:    'Probation',
  pip:          'PIP',
  promotion:    'Promotion',
  warning:      'Warning',
  commendation: 'Commendation',
  exit:         'Exit',
};

const STATUS_LABELS = {
  draft:        'Draft',
  submitted:    'Submitted',
  acknowledged: 'Acknowledged',
  closed:       'Closed',
};

const RATING_LABELS = {
  outstanding:          'Outstanding',
  exceeds_expectations: 'Exceeds',
  meets_expectations:   'Meets',
  needs_improvement:    'Needs Improvement',
  unsatisfactory:       'Unsatisfactory',
};

const REC_LABELS = {
  promote:          'Promote',
  retain:           'Retain',
  pip:              'PIP',
  warning_letter:   'Warning',
  terminate:        'Terminate',
  no_action:        'No Action',
  salary_increment: 'Salary Increment',
  role_change:      'Role Change',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function StarDisplay({ rating }) {
  if (!rating) return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>;
  const r = parseFloat(rating);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: '#1e40af' }}>{r.toFixed(1)}</span>
      <span style={{ color: '#f59e0b', fontSize: 12 }}>★</span>
    </span>
  );
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)         return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PerformanceList() {
  const navigate = useNavigate();

  const [reviews,       setReviews]       = useState([]);
  const [totalCount,    setTotalCount]    = useState(0);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [ratingFilter,  setRatingFilter]  = useState('');
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, count } = await getReviews({
        search,
        review_type:  typeFilter,
        status:       statusFilter,
        rating_label: ratingFilter,
        page,
        pageSize:     PAGE_SIZE,
      });
      setReviews(data);
      setTotalCount(count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, ratingFilter, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, ratingFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, totalCount);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteReview(deleteTarget.id);
      setDeleteTarget(null);
      const newTotal = Math.max(1, Math.ceil((totalCount - 1) / PAGE_SIZE));
      if (page > newTotal) setPage(newTotal);
      else await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = search || statusFilter || typeFilter || ratingFilter;

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Performance Reviews</h2>
          <p className="page-subtitle">
            {loading
              ? 'Loading…'
              : `${totalCount} review${totalCount !== 1 ? 's' : ''}${hasFilters ? ' — filtered' : ''}`}
          </p>
        </div>
        <Link to="/performance/new" className="btn-primary">+ New Review</Link>
      </div>

      {/* ── Controls ── */}
      <div className="list-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search review number, employee, reviewer, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-bar">
          {STATUS_FILTERS.map((opt) => (
            <button
              key={opt.value}
              className={`filter-btn${statusFilter === opt.value ? ' filter-btn--active' : ''}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}

          <span style={{ width: 1, background: '#e2e8f0', margin: '2px 4px', alignSelf: 'stretch' }} />

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            {RATING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Table ── */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Review #</th>
              <th>Employee</th>
              <th>Type</th>
              <th>Review Date</th>
              <th>Rating</th>
              <th>Rating Label</th>
              <th>Recommendation</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><span className="skeleton-cell" style={{ width: 100 }} /></td>
                  <td>
                    <span className="skeleton-cell" style={{ width: 130, display: 'block', marginBottom: 4 }} />
                    <span className="skeleton-cell" style={{ width: 80, height: 10 }} />
                  </td>
                  <td><span className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 90 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 50 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 110 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 90 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 96 }} /></td>
                </tr>
              ))
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="table-empty">
                    {hasFilters
                      ? 'No reviews match your search or filters.'
                      : 'No performance reviews yet. Click "+ New Review" to create one.'}
                  </div>
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr
                  key={r.id}
                  className="clickable-row"
                  onClick={() => navigate(`/performance/${r.id}`)}
                >
                  <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>{r.review_number}</td>

                  <td>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{r.employee_name}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{r.employee_ref}</div>
                  </td>

                  <td>
                    <span className={`rev-type-badge rev-type-${r.review_type}`}>
                      {TYPE_LABELS[r.review_type] ?? r.review_type}
                    </span>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.review_date)}</td>

                  <td><StarDisplay rating={r.overall_rating} /></td>

                  <td>
                    {r.rating_label ? (
                      <span className={`status-badge rating-${r.rating_label}`}>
                        {RATING_LABELS[r.rating_label] ?? r.rating_label}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                    )}
                  </td>

                  <td>
                    {r.recommendation && r.recommendation !== 'no_action' ? (
                      <span className={`status-badge rec-${r.recommendation}`}>
                        {REC_LABELS[r.recommendation] ?? r.recommendation}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>No Action</span>
                    )}
                  </td>

                  <td>
                    <span className={`status-badge status-rev-${r.status}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <Link to={`/performance/${r.id}`}      className="action-link">View</Link>
                      <Link to={`/performance/${r.id}/edit`} className="action-link">Edit</Link>
                      <button
                        className="action-link action-link--danger"
                        onClick={() => setDeleteTarget(r)}
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
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {rangeStart}–{rangeEnd} of {totalCount} reviews
          </span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            {getPageRange(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="page-ellipsis">…</span>
              ) : (
                <button
                  key={p}
                  className={`page-btn${page === p ? ' page-btn--active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Performance Review</h3>
            <p className="modal-body">
              Delete review <strong>{deleteTarget.review_number}</strong> for{' '}
              <strong>{deleteTarget.employee_name}</strong>?{' '}
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
