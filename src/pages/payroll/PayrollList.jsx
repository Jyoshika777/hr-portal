import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getPayrolls, deletePayroll } from '../../services/payrollService';
import '../../styles/Candidates.css';
import '../../styles/Payroll.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: '',          label: 'All'       },
  { value: 'pending',   label: 'Pending'   },
  { value: 'paid',      label: 'Paid'      },
  { value: 'on_hold',   label: 'On Hold'   },
  { value: 'cancelled', label: 'Cancelled' },
];

const MONTH_OPTIONS = [
  { value: '',   label: 'All Months'  },
  { value: '1',  label: 'January'     },
  { value: '2',  label: 'February'    },
  { value: '3',  label: 'March'       },
  { value: '4',  label: 'April'       },
  { value: '5',  label: 'May'         },
  { value: '6',  label: 'June'        },
  { value: '7',  label: 'July'        },
  { value: '8',  label: 'August'      },
  { value: '9',  label: 'September'   },
  { value: '10', label: 'October'     },
  { value: '11', label: 'November'    },
  { value: '12', label: 'December'    },
];

const MONTH_LABELS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const STATUS_LABELS = {
  pending:   'Pending',
  paid:      'Paid',
  on_hold:   'On Hold',
  cancelled: 'Cancelled',
};

const MODE_LABELS = {
  bank_transfer: 'Bank Transfer',
  cash:          'Cash',
  cheque:        'Cheque',
  upi:           'UPI',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtINR(amount) {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(parseFloat(amount) || 0);
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)         return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PayrollList() {
  const navigate = useNavigate();

  const [payrolls,     setPayrolls]     = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter,  setMonthFilter]  = useState('');
  const [yearFilter,   setYearFilter]   = useState('');
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, count } = await getPayrolls({
        search,
        status:    statusFilter,
        pay_month: monthFilter,
        pay_year:  yearFilter,
        page,
        pageSize:  PAGE_SIZE,
      });
      setPayrolls(data);
      setTotalCount(count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, monthFilter, yearFilter, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter, monthFilter, yearFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, totalCount);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePayroll(deleteTarget.id);
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

  const hasFilters = search || statusFilter || monthFilter || yearFilter;

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Payroll Records</h2>
          <p className="page-subtitle">
            {loading
              ? 'Loading…'
              : `${totalCount} payroll record${totalCount !== 1 ? 's' : ''}${hasFilters ? ' — filtered' : ''}`}
          </p>
        </div>
        <Link to="/payroll/new" className="btn-primary">+ New Payroll</Link>
      </div>

      {/* ── Controls ── */}
      <div className="list-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search payroll number, employee, department…"
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

          {/* Month filter */}
          <select
            className="filter-select"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            {MONTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Year filter */}
          <input
            type="number"
            className="filter-select"
            style={{ width: 84, paddingRight: 8, borderRadius: 20, textAlign: 'center' }}
            placeholder="Year"
            min={2020}
            max={2100}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Table ── */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Payroll #</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Period</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net Salary</th>
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
                    <span className="skeleton-cell" style={{ width: 130, marginBottom: 4, display: 'block' }} />
                    <span className="skeleton-cell" style={{ width: 80,  height: 10 }} />
                  </td>
                  <td><span className="skeleton-cell" style={{ width: 100 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 72 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 88 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 68 }} /></td>
                  <td><span className="skeleton-cell" style={{ width: 96 }} /></td>
                </tr>
              ))
            ) : payrolls.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="table-empty">
                    {hasFilters
                      ? 'No payroll records match your search or filters.'
                      : 'No payroll records yet. Click "+ New Payroll" to create one.'}
                  </div>
                </td>
              </tr>
            ) : (
              payrolls.map((p) => {
                const isNeg = parseFloat(p.net_salary) < 0;
                return (
                  <tr
                    key={p.id}
                    className="clickable-row"
                    onClick={() => navigate(`/payroll/${p.id}`)}
                  >
                    {/* Payroll number */}
                    <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>
                      {p.payroll_number}
                    </td>

                    {/* Employee: name + ref two-line */}
                    <td>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>
                        {p.employee_name}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                        {p.employee_ref}
                      </div>
                    </td>

                    {/* Department */}
                    <td style={{ color: '#374151' }}>{p.department ?? '—'}</td>

                    {/* Period */}
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {MONTH_LABELS[p.pay_month]} {p.pay_year}
                    </td>

                    {/* Gross earnings */}
                    <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>
                      {fmtINR(p.total_earnings)}
                    </td>

                    {/* Deductions */}
                    <td className="td-mono" style={{ whiteSpace: 'nowrap', color: '#b91c1c' }}>
                      {fmtINR(p.total_deductions)}
                    </td>

                    {/* Net salary */}
                    <td>
                      <span className={`td-net-salary${isNeg ? ' td-net-salary--negative' : ''}`}>
                        {fmtINR(p.net_salary)}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td>
                      <span className={`status-badge status-pay-${p.payment_status}`}>
                        {STATUS_LABELS[p.payment_status] ?? p.payment_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <Link to={`/payroll/${p.id}`}      className="action-link">View</Link>
                        <Link to={`/payroll/${p.id}/edit`} className="action-link">Edit</Link>
                        <button
                          className="action-link action-link--danger"
                          onClick={() => setDeleteTarget(p)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {rangeStart}–{rangeEnd} of {totalCount} records
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
            <h3 className="modal-title">Delete Payroll Record</h3>
            <p className="modal-body">
              Delete payroll <strong>{deleteTarget.payroll_number}</strong> for{' '}
              <strong>{deleteTarget.employee_name}</strong> (
              {MONTH_LABELS[deleteTarget.pay_month]} {deleteTarget.pay_year})?
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
