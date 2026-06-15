import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getCandidateById, convertCandidateToEmployee } from '../../services/candidateService';
import { generateEmployeeId } from '../../services/employeeService';
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

export default function ConvertCandidate() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate,   setCandidate]   = useState(null);
  const [empId,       setEmpId]       = useState('');
  const [form,        setForm]        = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [fetchError,  setFetchError]  = useState('');

  useEffect(() => {
    Promise.all([getCandidateById(id), generateEmployeeId()])
      .then(([cand, nextId]) => {
        // Already converted — bounce straight to their employee profile
        if (cand.converted_employee_id) {
          navigate(`/employees/${cand.converted_employee_id}`, { replace: true });
          return;
        }
        setCandidate(cand);
        setEmpId(nextId);
        setForm({
          full_name:       cand.full_name,
          email:           cand.email,
          phone:           cand.phone,
          designation:     cand.job_role,
          department:      '',
          employment_type: 'full_time',
          status:          'active',
          date_of_joining: new Date().toISOString().slice(0, 10),
          remarks:         cand.remarks ?? '',
        });
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setFetching(false));
  }, [id, navigate]);

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

    setLoading(true);
    setServerError('');
    try {
      const employee = await convertCandidateToEmployee(id, payload);
      navigate(`/employees/${employee.id}`);
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  const canSubmit = !loading && !!form && !!empId;

  // ── Loading skeleton ──────────────────────────────────────
  if (fetching) {
    return (
      <Layout>
        <Link to={`/candidates/${id}`} className="back-link">← Back to Candidate</Link>
        <div className="page-header">
          <div>
            <h2 className="page-title">Convert to Employee</h2>
          </div>
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
        <Link to={`/candidates/${id}`} className="back-link">← Back to Candidate</Link>
        <div className="alert-error">{fetchError || 'Candidate not found.'}</div>
      </Layout>
    );
  }

  // ── Conversion form ───────────────────────────────────────
  return (
    <Layout>
      <Link to={`/candidates/${id}`} className="back-link">← Back to Candidate</Link>

      <div className="page-header">
        <div>
          <h2 className="page-title">Convert to Employee</h2>
          <p className="page-subtitle">
            Creating employee record for {candidate.full_name}
          </p>
        </div>
      </div>

      {/* ── Candidate source info ── */}
      <div className="conversion-source-card">
        <span className="conversion-source-label">Candidate</span>
        <span className="conversion-source-id">{candidate.application_id}</span>
        <span className="conversion-source-name">{candidate.full_name}</span>
        <span className={`status-badge status-${candidate.status}`}>
          {candidate.status.replace('_', ' ')}
        </span>
        <span className="conversion-source-role">{candidate.job_role}</span>
      </div>

      <div className="form-card">
        {serverError && (
          <div className="alert-error" style={{ marginBottom: 20 }}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">

            <div className="form-field">
              <label className="form-label">Employee ID</label>
              <input
                className="form-input"
                value={empId || 'Generating…'}
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
              {loading ? 'Converting…' : 'Create Employee Record'}
            </button>
            <Link to={`/candidates/${id}`} className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
