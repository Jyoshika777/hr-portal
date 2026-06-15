import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getEmployeeById, deleteEmployee } from '../../services/employeeService';
import '../../styles/Candidates.css';
import '../../styles/Employees.css';

const STATUS_LABELS = {
  active:     'Active',
  on_leave:   'On Leave',
  probation:  'Probation',
  terminated: 'Terminated',
};

const EMPLOYMENT_TYPE_LABELS = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract:  'Contract',
  intern:    'Intern',
};

const AVATAR_COLORS = [
  '#1e40af', '#6d28d9', '#b45309',
  '#15803d', '#0f766e', '#be185d',
];

function avatarColor(name) {
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee,        setEmployee]        = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [deleteError,     setDeleteError]     = useState('');

  useEffect(() => {
    getEmployeeById(id)
      .then(setEmployee)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteEmployee(id);
      navigate('/employees');
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="table-loading"><div className="spinner" /></div>
      </Layout>
    );
  }

  if (error || !employee) {
    return (
      <Layout>
        <Link to="/employees" className="back-link">← Back to Employees</Link>
        <div className="alert-error">{error || 'Employee not found.'}</div>
      </Layout>
    );
  }

  const color = avatarColor(employee.full_name);

  return (
    <Layout>
      <Link to="/employees" className="back-link">← Back to Employees</Link>

      {/* ── Profile header card ── */}
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar" style={{ background: color }}>
            {initials(employee.full_name)}
          </div>

          <div className="profile-info">
            <h2 className="profile-name">{employee.full_name}</h2>
            <p className="profile-role">{employee.designation} · {employee.department}</p>
            <div className="profile-meta">
              <span className="profile-app-id-chip">{employee.employee_id}</span>
              <span className={`status-badge status-${employee.status}`}>
                {STATUS_LABELS[employee.status] ?? employee.status}
              </span>
              <span className="emp-type-chip">
                {EMPLOYMENT_TYPE_LABELS[employee.employment_type] ?? employee.employment_type}
              </span>
            </div>
          </div>

          <div className="profile-header-actions">
            <Link
              to={`/documents/entity/employee/${employee.employee_id}?entityName=${encodeURIComponent(employee.full_name)}`}
              className="btn-secondary"
            >
              Documents
            </Link>
            <Link to={`/performance/employee/${employee.employee_id}`} className="btn-secondary">
              View Performance
            </Link>
            <Link to={`/employees/${id}/edit`} className="btn-primary">Edit</Link>
            <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>Delete</button>
          </div>
        </div>
      </div>

      {/* ── Info sections ── */}
      <div className="profile-sections">
        <div className="profile-section">
          <h3 className="profile-section-title">Contact Information</h3>
          <div className="profile-field">
            <p className="profile-field-label">Email Address</p>
            <p className="profile-field-value">{employee.email}</p>
          </div>
          <div className="profile-field">
            <p className="profile-field-label">Phone Number</p>
            <p className="profile-field-value">{employee.phone}</p>
          </div>
        </div>

        <div className="profile-section">
          <h3 className="profile-section-title">Employment Details</h3>
          <div className="profile-fields-grid">
            <div className="profile-field">
              <p className="profile-field-label">Employee ID</p>
              <p className="profile-field-value profile-field-mono">{employee.employee_id}</p>
            </div>
            <div className="profile-field">
              <p className="profile-field-label">Status</p>
              <p className="profile-field-value">
                <span className={`status-badge status-${employee.status}`}>
                  {STATUS_LABELS[employee.status] ?? employee.status}
                </span>
              </p>
            </div>
            <div className="profile-field">
              <p className="profile-field-label">Employment Type</p>
              <p className="profile-field-value">
                {EMPLOYMENT_TYPE_LABELS[employee.employment_type] ?? employee.employment_type}
              </p>
            </div>
            <div className="profile-field">
              <p className="profile-field-label">Date of Joining</p>
              <p className="profile-field-value">{formatDate(employee.date_of_joining)}</p>
            </div>
            <div className="profile-field">
              <p className="profile-field-label">Department</p>
              <p className="profile-field-value">{employee.department}</p>
            </div>
            <div className="profile-field">
              <p className="profile-field-label">Record Created</p>
              <p className="profile-field-value">{formatDateTime(employee.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Remarks ── */}
      <div className="profile-remarks-card">
        <h3 className="profile-section-title">Remarks</h3>
        {employee.remarks ? (
          <p className="profile-remarks-text">{employee.remarks}</p>
        ) : (
          <p className="profile-remarks-empty">No remarks added.</p>
        )}
      </div>

      {/* ── Delete modal ── */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Employee</h3>
            <p className="modal-body">
              Remove <strong>{employee.full_name}</strong> ({employee.employee_id})?
              This action cannot be undone.
            </p>
            {deleteError && (
              <div className="alert-error" style={{ marginBottom: 16 }}>{deleteError}</div>
            )}
            <div className="modal-actions">
              <button
                className="btn-ghost"
                onClick={() => { setShowDeleteModal(false); setDeleteError(''); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
