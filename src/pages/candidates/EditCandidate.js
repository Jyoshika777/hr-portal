import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getCandidateById, updateCandidate } from '../../services/candidateService';
import '../../styles/Candidates.css';

const STATUS_OPTIONS = [
  { value: 'applied',    label: 'Applied'    },
  { value: 'screening',  label: 'Screening'  },
  { value: 'interview',  label: 'Interview'  },
  { value: 'selected',   label: 'Selected'   },
  { value: 'offer_sent', label: 'Offer Sent' },
  { value: 'joined',     label: 'Joined'     },
  { value: 'rejected',   label: 'Rejected'   },
];

function validate(f) {
  const e = {};
  if (!f.full_name.trim())    e.full_name    = 'Required';
  if (!f.phone.trim())        e.phone        = 'Required';
  if (!f.job_role.trim())     e.job_role     = 'Required';
  if (!f.applied_date)        e.applied_date = 'Required';
  if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = 'Valid email required';
  return e;
}

export default function EditCandidate() {
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
    getCandidateById(id)
      .then((c) =>
        setForm({
          application_id: c.application_id,
          full_name:      c.full_name,
          email:          c.email,
          phone:          c.phone,
          job_role:       c.job_role,
          status:         c.status,
          remarks:        c.remarks ?? '',
          applied_date:   c.applied_date,
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
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    const { application_id, ...payload } = form;
    const trimmed = {
      full_name:    payload.full_name.trim(),
      email:        payload.email.trim(),
      phone:        payload.phone.trim(),
      job_role:     payload.job_role.trim(),
      status:       payload.status,
      remarks:      payload.remarks.trim(),
      applied_date: payload.applied_date,
    };

    setLoading(true);
    setServerError('');

    try {
      await updateCandidate(id, trimmed);
      setSuccess(true);
      setTimeout(() => navigate(`/candidates/${id}`), 1500);
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred. Check the browser console for details.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !fetching && !!form;

  // ── Loading skeleton ──────────────────────────────────────
  if (fetching) {
    return (
      <Layout>
        <Link to={`/candidates/${id}`} className="back-link">← Back to Candidate</Link>
        <div className="page-header">
          <h2 className="page-title">Edit Candidate</h2>
        </div>
        <div className="form-card">
          <div className="form-grid">
            {Array.from({ length: 6 }).map((_, i) => (
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

  // ── Edit form ─────────────────────────────────────────────
  return (
    <Layout>
      <Link to={`/candidates/${id}`} className="back-link">← Back to Candidate</Link>

      <div className="page-header">
        <h2 className="page-title">Edit Candidate</h2>
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
              <label className="form-label">Application ID</label>
              <input
                className="form-input"
                value={form.application_id}
                readOnly
              />
            </div>

            <div className="form-field">
              <label className="form-label">Applied Date *</label>
              <input
                type="date"
                name="applied_date"
                className={`form-input${fieldErrors.applied_date ? ' form-input--error' : ''}`}
                value={form.applied_date}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.applied_date && (
                <span className="form-error">{fieldErrors.applied_date}</span>
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
              <label className="form-label">Job Role *</label>
              <input
                type="text"
                name="job_role"
                autoComplete="off"
                className={`form-input${fieldErrors.job_role ? ' form-input--error' : ''}`}
                value={form.job_role}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.job_role && (
                <span className="form-error">{fieldErrors.job_role}</span>
              )}
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
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
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
            <button type="submit" className="btn-primary" disabled={!canSubmit || success}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <Link to={`/candidates/${id}`} className="btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
