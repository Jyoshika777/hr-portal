import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getOfferLetters, deleteOfferLetter } from '../../services/offerLetterService';
import '../../styles/Candidates.css';
import '../../styles/Offers.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: '',         label: 'All'      },
  { value: 'draft',    label: 'Draft'    },
  { value: 'sent',     label: 'Sent'     },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired',  label: 'Expired'  },
];

const STATUS_LABELS = {
  draft:    'Draft',
  sent:     'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired:  'Expired',
};

const TYPE_FILTERS = [
  { value: '',           label: 'All Types'  },
  { value: 'full_time',  label: 'Full-Time'  },
  { value: 'part_time',  label: 'Part-Time'  },
  { value: 'contract',   label: 'Contract'   },
  { value: 'intern',     label: 'Internship' },
  { value: 'temporary',  label: 'Temporary'  },
  { value: 'trainee',    label: 'Trainee'    },
  { value: 'remote',     label: 'Remote'     },
  { value: 'hybrid',     label: 'Hybrid'     },
];

const TYPE_LABELS = {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contract:  'Contract',
  intern:    'Internship',
  temporary: 'Temporary',
  trainee:   'Trainee',
  remote:    'Remote',
  hybrid:    'Hybrid',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function OfferLetterList() {
  const navigate = useNavigate();

  const [offers,       setOffers]       = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, count } = await getOfferLetters({
        search,
        status:          statusFilter,
        employment_type: typeFilter,
        page,
        pageSize:        PAGE_SIZE,
      });
      setOffers(data);
      setTotalCount(count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, page]);

  // Reset to page 1 when any filter/search changes
  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter]);

  // Debounce search; fire immediately for filter/page changes
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
      await deleteOfferLetter(deleteTarget.id);
      setDeleteTarget(null);
      const newTotalPages = Math.max(1, Math.ceil((totalCount - 1) / PAGE_SIZE));
      if (page > newTotalPages) setPage(newTotalPages);
      else await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = search || statusFilter || typeFilter;

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Offer Letters</h2>
          <p className="page-subtitle">
            {loading
              ? 'Loading…'
              : `${totalCount} offer letter${totalCount !== 1 ? 's' : ''}${hasFilters ? ' — filtered' : ''}`}
          </p>
        </div>
        <Link to="/offers/new" className="btn-primary">+ New Offer</Link>
      </div>

      {/* ── Controls ── */}
      <div className="list-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search offer number, candidate, role, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Status filter chips */}
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

          {/* Divider */}
          <span style={{ width: 1, background: '#e2e8f0', margin: '2px 4px', alignSelf: 'stretch' }} />

          {/* Employment type filter — dropdown to keep the bar compact */}
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {TYPE_FILTERS.map((o) => (
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
              <th>Offer #</th>
              <th>Candidate</th>
              <th>Role / Department</th>
              <th>Type</th>
              <th>Joining Date</th>
              <th>Salary / Mo</th>
              <th>Status</th>
              <th>Offer Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><span className="skeleton-cell" style={{ width: 100 }} /></td>
                  <td>
                    <span className="skeleton-cell" style={{ width: 130, marginBottom: 4, display: 'block' }} />
                    <span className="skeleton-cell" style={{ width: 160, height: 10 }} />
                  </td>
                  <td>
                    <span className="skeleton-cell" style={{ width: 110, marginBottom: 4, display: 'block' }} />
                    <span className="skeleton-cell" style={{ width: 80, height: 10 }} />
                  </td>
                  <td><span className="skeleton-cell" style={{ width: 72 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 88 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 68 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 88 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 96 }} /></td>
                </tr>
              ))
            ) : offers.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="table-empty">
                    {hasFilters
                      ? 'No offer letters match your search or filters.'
                      : 'No offer letters generated yet. Click "+ New Offer" to create one.'}
                  </div>
                </td>
              </tr>
            ) : (
              offers.map((offer) => (
                <tr
                  key={offer.id}
                  className="clickable-row"
                  onClick={() => navigate(`/offers/${offer.id}`)}
                >
                  {/* Offer number */}
                  <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>
                    {offer.offer_number}
                  </td>

                  {/* Candidate — name + email two-line */}
                  <td>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>
                      {offer.candidate_name}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                      {offer.candidate_email}
                    </div>
                  </td>

                  {/* Role + Department two-line */}
                  <td>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>
                      {offer.job_role}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                      {offer.department}
                    </div>
                  </td>

                  {/* Employment type badge */}
                  <td>
                    <span className={`offer-type-badge offer-type-${offer.employment_type}`}>
                      {TYPE_LABELS[offer.employment_type] ?? offer.employment_type}
                    </span>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(offer.date_of_joining)}</td>

                  <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>
                    {formatCurrency(offer.salary)}
                  </td>

                  {/* Status badge */}
                  <td>
                    <span className={`status-badge status-offer-${offer.status}`}>
                      {STATUS_LABELS[offer.status] ?? offer.status}
                    </span>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(offer.offer_date)}</td>

                  {/* Actions — stop row click propagation */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <Link to={`/offers/${offer.id}`} className="action-link">View</Link>
                      <Link to={`/offers/${offer.id}/edit`} className="action-link">Edit</Link>
                      <button
                        className="action-link action-link--danger"
                        onClick={() => setDeleteTarget(offer)}
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
            Showing {rangeStart}–{rangeEnd} of {totalCount} offer letters
          </span>
          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
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

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Offer Letter</h3>
            <p className="modal-body">
              Delete offer <strong>{deleteTarget.offer_number}</strong> issued to{' '}
              <strong>{deleteTarget.candidate_name}</strong>?{' '}
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
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
