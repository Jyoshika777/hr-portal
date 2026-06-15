import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getCandidates, deleteCandidate } from '../../services/candidateService';
import '../../styles/Candidates.css';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: '',           label: 'All'       },
  { value: 'applied',    label: 'Applied'   },
  { value: 'screening',  label: 'Screening' },
  { value: 'interview',  label: 'Interview' },
  { value: 'selected',   label: 'Selected'  },
  { value: 'offer_sent', label: 'Offer Sent'},
  { value: 'joined',     label: 'Joined'    },
  { value: 'rejected',   label: 'Rejected'  },
];

const STATUS_LABELS = {
  applied:   'Applied',
  screening: 'Screening',
  interview: 'Interview',
  selected:  'Selected',
  offer_sent:'Offer Sent',
  joined:    'Joined',
  rejected:  'Rejected',
};

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

export default function CandidateList() {
  const navigate = useNavigate();

  const [candidates,   setCandidates]   = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, count } = await getCandidates({
        search,
        status: statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setCandidates(data);
      setTotalCount(count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  // Reset to page 1 whenever search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // Debounce loads; immediate when not typing
  useEffect(() => {
    const delay = search ? 300 : 0;
    const t = setTimeout(load, delay);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, totalCount);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCandidate(deleteTarget.id);
      setDeleteTarget(null);
      const newTotalPages = Math.max(1, Math.ceil((totalCount - 1) / PAGE_SIZE));
      if (page > newTotalPages) {
        setPage(newTotalPages);
      } else {
        await load();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Candidates</h2>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${totalCount} record${totalCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link to="/candidates/add" className="btn-primary">Add Candidate</Link>
      </div>

      <div className="list-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, email, job role, or application ID"
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
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Application ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Job Role</th>
              <th>Status</th>
              <th>Applied</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><span className="skeleton-cell" style={{ width: 96 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 130 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 170 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 100 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 72 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 88 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 96 }} /></td>
                </tr>
              ))
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="table-empty">
                    {search || statusFilter
                      ? 'No candidates match your filters.'
                      : 'No candidates added yet.'}
                  </div>
                </td>
              </tr>
            ) : (
              candidates.map((c) => (
                <tr
                  key={c.id}
                  className="clickable-row"
                  onClick={() => navigate(`/candidates/${c.id}`)}
                >
                  <td className="td-mono">{c.application_id}</td>
                  <td>{c.full_name}</td>
                  <td className="td-email">{c.email}</td>
                  <td>{c.job_role}</td>
                  <td>
                    <span className={`status-badge status-${c.status}`}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td>{formatDate(c.applied_date)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <Link to={`/candidates/${c.id}`} className="action-link">View</Link>
                      <Link to={`/candidates/${c.id}/edit`} className="action-link">Edit</Link>
                      <button
                        className="action-link action-link--danger"
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
      </div>

      {!loading && totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {rangeStart}–{rangeEnd} of {totalCount} candidates
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
                <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
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

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Candidate</h3>
            <p className="modal-body">
              Remove <strong>{deleteTarget.full_name}</strong> ({deleteTarget.application_id})?
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
