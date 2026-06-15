import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getEmployees, deleteEmployee } from '../../services/employeeService';
import '../../styles/Candidates.css';
import '../../styles/Employees.css';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: '',           label: 'All'        },
  { value: 'active',     label: 'Active'     },
  { value: 'on_leave',   label: 'On Leave'   },
  { value: 'probation',  label: 'Probation'  },
  { value: 'terminated', label: 'Terminated' },
];

const STATUS_LABELS = {
  active:     'Active',
  on_leave:   'On Leave',
  probation:  'Probation',
  terminated: 'Terminated',
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
  if (current >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
  return [1, '…', current-1, current, current+1, '…', total];
}

export default function EmployeeList() {
  const navigate = useNavigate();

  const [employees,    setEmployees]    = useState([]);
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
      const { data, count } = await getEmployees({
        search, status: statusFilter, page, pageSize: PAGE_SIZE,
      });
      setEmployees(data);
      setTotalCount(count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

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
      await deleteEmployee(deleteTarget.id);
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

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Employees</h2>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${totalCount} record${totalCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link to="/employees/add" className="btn-primary">Add Employee</Link>
      </div>

      <div className="list-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, email, department, designation, or employee ID"
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
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><span className="skeleton-cell" style={{ width: 70 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 130 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 170 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 110 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 120 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 72 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 88 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 96 }} /></td>
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="table-empty">
                    {search || statusFilter
                      ? 'No employees match your filters.'
                      : 'No employees added yet.'}
                  </div>
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="clickable-row"
                  onClick={() => navigate(`/employees/${emp.id}`)}
                >
                  <td className="td-mono">{emp.employee_id}</td>
                  <td>{emp.full_name}</td>
                  <td className="td-email">{emp.email}</td>
                  <td>{emp.department}</td>
                  <td>{emp.designation}</td>
                  <td>
                    <span className={`status-badge status-${emp.status}`}>
                      {STATUS_LABELS[emp.status] ?? emp.status}
                    </span>
                  </td>
                  <td>{formatDate(emp.date_of_joining)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <Link to={`/employees/${emp.id}`} className="action-link">View</Link>
                      <Link to={`/employees/${emp.id}/edit`} className="action-link">Edit</Link>
                      <button
                        className="action-link action-link--danger"
                        onClick={() => setDeleteTarget(emp)}
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
            Showing {rangeStart}–{rangeEnd} of {totalCount} employees
          </span>
          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >← Prev</button>

            {getPageRange(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
              ) : (
                <button
                  key={p}
                  className={`page-btn${page === p ? ' page-btn--active' : ''}`}
                  onClick={() => setPage(p)}
                >{p}</button>
              )
            )}

            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >Next →</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Employee</h3>
            <p className="modal-body">
              Remove <strong>{deleteTarget.full_name}</strong> ({deleteTarget.employee_id})?
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
