import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { generateApplicationId, addCandidate } from '../../services/candidateService';
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

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  full_name:    '',
  email:        '',
  phone:        '',
  job_role:     '',
  status:       'applied',
  remarks:      '',
  applied_date: today,
};

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

export default function AddCandidate() {
  const navigate = useNavigate();

  const [appId,       setAppId]       = useState('');
  const [idError,     setIdError]     = useState('');
  const [idLoading,   setIdLoading]   = useState(true);

  const [form,        setForm]        = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    setIdLoading(true);
    setIdError('');

    generateApplicationId()
      .then((id) => {
        setAppId(id);
        console.log('[AddCandidate] application ID ready:', id);
      })
      .catch((err) => {
        console.error('[AddCandidate] ID generation failed:', err);
        setIdError(err.message);
      })
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

    if (!appId) {
      setServerError(
        idError
          ? `Cannot save: application ID could not be generated. ${idError}`
          : 'Application ID is not ready yet. Please wait.'
      );
      return;
    }

    const errs = validate(form);
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    const payload = {
      application_id: appId,
      full_name:      form.full_name.trim(),
      email:          form.email.trim(),
      phone:          form.phone.trim(),
      job_role:       form.job_role.trim(),
      status:         form.status,
      remarks:        form.remarks.trim(),
      applied_date:   form.applied_date,
    };

    console.log('[AddCandidate] submitting:', payload);
    setLoading(true);
    setServerError('');

    try {
      const created = await addCandidate(payload);
      console.log('[AddCandidate] saved successfully:', created);
      navigate('/candidates');
    } catch (err) {
      console.error('[AddCandidate] save failed:', err);
      setServerError(err.message || 'An unexpected error occurred. Check the browser console for details.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !idLoading && !!appId;

  return (
    <Layout>
      <Link to="/candidates" className="back-link">
        ← Back to Candidates
      </Link>

      <div className="page-header">
        <h2 className="page-title">Add Candidate</h2>
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
              <label className="form-label">Application ID</label>
              <input
                className="form-input"
                value={idLoading ? 'Generating…' : (appId || 'Generation failed')}
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
                disabled={loading}
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
              <label className="form-label">Job Role *</label>
              <input
                type="text"
                name="job_role"
                autoComplete="off"
                className={`form-input${fieldErrors.job_role ? ' form-input--error' : ''}`}
                value={form.job_role}
                onChange={handleChange}
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {loading ? 'Saving…' : 'Add Candidate'}
            </button>
            <Link to="/candidates" className="btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
