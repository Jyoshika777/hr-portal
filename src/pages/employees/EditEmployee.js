import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getEmployeeById, updateEmployee } from '../../services/employeeService';
import '../../styles/Candidates.css';
import '../../styles/Employees.css';

const DEPARTMENT_OPTIONS = [
  'Engineering', 'Human Resources', 'Finance', 'Marketing',
  'Operations', 'Sales', 'Design', 'Legal', 'Product', 'Customer Support', 'Other',
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract',  label: 'Contract'  },
  { value: 'intern',    label: 'Intern'    },
];

const STATUS_OPTIONS = [
  { value: 'active',     label: 'Active'     },
  { value: 'probation',  label: 'Probation'  },
  { value: 'on_leave',   label: 'On Leave'   },
  { value: 'terminated', label: 'Terminated' },
];

function validate(f) {
  const e = {};
  if (!f.full_name.trim())   e.full_name       = 'Required';
  if (!f.phone.trim())       e.phone           = 'Required';
  if (!f.department)         e.department      = 'Required';
  if (!f.designation.trim()) e.designation     = 'Required';
  if (!f.date_of_joining)    e.date_of_joining = 'Required';
  if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = 'Valid email required';
  return e;
}

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form,        setForm]        = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success,     setSuccess]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [fetchError,  setFetchError]  = useState('');

  useEffect(() => {
    getEmployeeById(id)
      .then((emp) =>
        setForm({
          employee_id:     emp.employee_id,
          full_name:       emp.full_name,
          email:           emp.email,
          phone:           emp.phone,
          department:      emp.department,
          designation:     emp.designation,
          employment_type: emp.employment_type,
          status:          emp.status,
          date_of_joining: emp.date_of_joining,
          remarks:         emp.remarks ?? '',
        })
      )
      .catch((err) => setFetchError(err.message))
      .finally(() => setFetching(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    const { employee_id, ...rest } = form;
    const payload = {
      full_name:       rest.full_name.trim(),
      email:           rest.email.trim(),
      phone:           rest.phone.trim(),
      department:      rest.department,
      designation:     rest.designation.trim(),
      employment_type: rest.employment_type,
      status:          rest.status,
      date_of_joining: rest.date_of_joining,
      remarks:         rest.remarks.trim(),
    };

    setLoading(true);
    setServerError('');
    try {
      await updateEmployee(id, payload);
      setSuccess(true);
      setTimeout(() => navigate(`/employees/${id}`), 1500);
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !fetching && !!form;

  // ── Loading skeleton ──────────────────────────────────────
  if (fetching) {
    return (
      <Layout>
        <Link to={`/employees/${id}`} className="back-link">← Back to Employee</Link>
        <div className="page-header">
          <h2 className="page-title">Edit Employee</h2>
        </div>
        <div className="form-card">
          <div className="form-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="form-field" key={i}>
                <span className="skeleton-cell" style={{ width: 80, height: 12, marginBottom: 6 }} />
                <span className="skeleton-cell" style={{ width: '100%', height: 38, borderRadius: 6 }} />
              </div>
            ))}
            <div className="form-field form-field--full">
              <span className="skeleton-cell" style={{ width: 80, height: 12, marginBottom: 6 }} />
              <span className="skeleton-cell" style={{ width: '100%', height: 80, borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Fetch error ───────────────────────────────────────────
  if (fetchError || !form) {
    return (
      <Layout>
        <Link to={`/employees/${id}`} className="back-link">← Back to Employee</Link>
        <div className="alert-error">{fetchError || 'Employee not found.'}</div>
      </Layout>
    );
  }

  // ── Edit form ─────────────────────────────────────────────
  return (
    <Layout>
      <Link to={`/employees/${id}`} className="back-link">← Back to Employee</Link>

      <div className="page-header">
        <h2 className="page-title">Edit Employee</h2>
      </div>

      <div className="form-card">
        {success && (
          <div className="alert-success" style={{ marginBottom: 20 }}>
            Changes saved successfully. Redirecting…
          </div>
        )}

        {serverError && (
          <div className="alert-error" style={{ marginBottom: 20 }}>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">

            <div className="form-field">
              <label className="form-label">Employee ID</label>
              <input className="form-input" value={form.employee_id} readOnly />
            </div>

            <div className="form-field">
              <label className="form-label">Date of Joining *</label>
              <input
                type="date"
                name="date_of_joining"
                className={`form-input${fieldErrors.date_of_joining ? ' form-input--error' : ''}`}
                value={form.date_of_joining}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.date_of_joining && (
                <span className="form-error">{fieldErrors.date_of_joining}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="full_name"
                autoComplete="off"
                className={`form-input${fieldErrors.full_name ? ' form-input--error' : ''}`}
                value={form.full_name}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.full_name && (
                <span className="form-error">{fieldErrors.full_name}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                autoComplete="off"
                className={`form-input${fieldErrors.email ? ' form-input--error' : ''}`}
                value={form.email}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.email && (
                <span className="form-error">{fieldErrors.email}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Phone *</label>
              <input
                type="text"
                name="phone"
                autoComplete="off"
                className={`form-input${fieldErrors.phone ? ' form-input--error' : ''}`}
                value={form.phone}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.phone && (
                <span className="form-error">{fieldErrors.phone}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Department *</label>
              <select
                name="department"
                className={`form-select${fieldErrors.department ? ' form-select--error' : ''}`}
                value={form.department}
                onChange={handleChange}
                disabled={loading || success}
              >
                <option value="">Select department</option>
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {fieldErrors.department && (
                <span className="form-error">{fieldErrors.department}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Designation *</label>
              <input
                type="text"
                name="designation"
                autoComplete="off"
                className={`form-input${fieldErrors.designation ? ' form-input--error' : ''}`}
                value={form.designation}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.designation && (
                <span className="form-error">{fieldErrors.designation}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Employment Type</label>
              <select
                name="employment_type"
                className="form-select"
                value={form.employment_type}
                onChange={handleChange}
                disabled={loading || success}
              >
                {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Status</label>
              <select
                name="status"
                className="form-select"
                value={form.status}
                onChange={handleChange}
                disabled={loading || success}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field form-field--full">
              <label className="form-label">Remarks</label>
              <textarea
                name="remarks"
                className="form-textarea"
                value={form.remarks}
                onChange={handleChange}
                disabled={loading || success}
              />
            </div>

          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={!canSubmit || success}
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <Link to={`/employees/${id}`} className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
