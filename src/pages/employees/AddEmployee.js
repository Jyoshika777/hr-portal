import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { generateEmployeeId, addEmployee } from '../../services/employeeService';
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

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  full_name:       '',
  email:           '',
  phone:           '',
  department:      '',
  designation:     '',
  employment_type: 'full_time',
  status:          'active',
  date_of_joining: today,
  remarks:         '',
};

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

export default function AddEmployee() {
  const navigate = useNavigate();

  const [empId,       setEmpId]       = useState('');
  const [idError,     setIdError]     = useState('');
  const [idLoading,   setIdLoading]   = useState(true);

  const [form,        setForm]        = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    setIdLoading(true);
    setIdError('');
    generateEmployeeId()
      .then((id) => { setEmpId(id); console.log('[AddEmployee] ID ready:', id); })
      .catch((err) => { console.error('[AddEmployee] ID generation failed:', err); setIdError(err.message); })
      .finally(() => setIdLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!empId) {
      setServerError(
        idError
          ? `Cannot save: employee ID could not be generated. ${idError}`
          : 'Employee ID is not ready. Please wait.'
      );
      return;
    }

    const errs = validate(form);
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    const payload = {
      employee_id:     empId,
      full_name:       form.full_name.trim(),
      email:           form.email.trim(),
      phone:           form.phone.trim(),
      department:      form.department,
      designation:     form.designation.trim(),
      employment_type: form.employment_type,
      status:          form.status,
      date_of_joining: form.date_of_joining,
      remarks:         form.remarks.trim(),
    };

    console.log('[AddEmployee] submitting:', payload);
    setLoading(true);
    setServerError('');

    try {
      const created = await addEmployee(payload);
      console.log('[AddEmployee] saved successfully:', created);
      navigate('/employees');
    } catch (err) {
      console.error('[AddEmployee] save failed:', err);
      setServerError(err.message || 'An unexpected error occurred. Check the browser console for details.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !idLoading && !!empId;

  return (
    <Layout>
      <Link to="/employees" className="back-link">← Back to Employees</Link>

      <div className="page-header">
        <h2 className="page-title">Add Employee</h2>
      </div>

      <div className="form-card">
        {idError && (
          <div className="alert-error" style={{ marginBottom: 20 }}>
            <strong>Setup required:</strong> {idError}
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
              <input
                className="form-input"
                value={idLoading ? 'Generating…' : (empId || 'Generation failed')}
                readOnly
              />
            </div>

            <div className="form-field">
              <label className="form-label">Date of Joining *</label>
              <input
                type="date"
                name="date_of_joining"
                className={`form-input${fieldErrors.date_of_joining ? ' form-input--error' : ''}`}
                value={form.date_of_joining}
                onChange={handleChange}
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {loading ? 'Saving…' : 'Add Employee'}
            </button>
            <Link to="/employees" className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
