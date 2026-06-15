import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getOfferLetterById, updateOfferLetter } from '../../services/offerLetterService';
import '../../styles/Candidates.css';
import '../../styles/Offers.css';

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
  { value: 'draft',    label: 'Draft'    },
  { value: 'sent',     label: 'Sent'     },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired',  label: 'Expired'  },
];

function validate(f) {
  const e = {};
  if (!f.candidate_name.trim())  e.candidate_name  = 'Required';
  if (!f.candidate_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.candidate_email))
    e.candidate_email = 'Valid email required';
  if (!f.candidate_phone.trim()) e.candidate_phone = 'Required';
  if (!f.job_role.trim())        e.job_role        = 'Required';
  if (!f.department)             e.department      = 'Required';
  if (!f.date_of_joining)        e.date_of_joining = 'Required';
  if (!f.offer_date)             e.offer_date      = 'Required';
  if (!f.salary || isNaN(Number(f.salary)) || Number(f.salary) <= 0)
    e.salary = 'Enter a valid monthly salary';
  return e;
}

export default function EditOffer() {
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
    getOfferLetterById(id)
      .then((offer) =>
        setForm({
          offer_number:    offer.offer_number,
          candidate_name:  offer.candidate_name,
          candidate_email: offer.candidate_email,
          candidate_phone: offer.candidate_phone,
          job_role:        offer.job_role,
          department:      offer.department,
          employment_type: offer.employment_type,
          date_of_joining: offer.date_of_joining,
          salary:          String(offer.salary),
          offer_date:      offer.offer_date,
          expiry_date:           offer.expiry_date ?? '',
          status:                offer.status,
          remarks:               offer.remarks ?? '',
          roles_responsibilities: offer.roles_responsibilities ?? '',
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

    const { offer_number, ...rest } = form;
    const payload = {
      candidate_name:  rest.candidate_name.trim(),
      candidate_email: rest.candidate_email.trim(),
      candidate_phone: rest.candidate_phone.trim(),
      job_role:        rest.job_role.trim(),
      department:      rest.department,
      employment_type: rest.employment_type,
      date_of_joining: rest.date_of_joining,
      salary:          Number(rest.salary),
      offer_date:      rest.offer_date,
      expiry_date:     rest.expiry_date || null,
      status:                rest.status,
      remarks:               rest.remarks.trim(),
      roles_responsibilities: rest.roles_responsibilities.trim(),
    };

    setLoading(true);
    setServerError('');
    try {
      await updateOfferLetter(id, payload);
      setSuccess(true);
      setTimeout(() => navigate(`/offers/${id}`), 1500);
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !fetching && !!form && !success;

  // ── Loading skeleton ──────────────────────────────────────
  if (fetching) {
    return (
      <Layout>
        <Link to={`/offers/${id}`} className="back-link">← Back to Offer Letter</Link>
        <div className="page-header">
          <h2 className="page-title">Edit Offer Letter</h2>
        </div>
        <div className="form-card">
          <div className="form-grid">
            {Array.from({ length: 10 }).map((_, i) => (
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
        <Link to={`/offers/${id}`} className="back-link">← Back to Offer Letter</Link>
        <div className="alert-error">{fetchError || 'Offer letter not found.'}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to={`/offers/${id}`} className="back-link">← Back to Offer Letter</Link>

      <div className="page-header">
        <h2 className="page-title">Edit Offer Letter</h2>
      </div>

      <div className="form-card">
        {success && (
          <div className="alert-success" style={{ marginBottom: 20 }}>
            Changes saved successfully. Redirecting…
          </div>
        )}
        {serverError && (
          <div className="alert-error" style={{ marginBottom: 20 }}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">

            <div className="form-field">
              <label className="form-label">Offer Number</label>
              <input className="form-input" value={form.offer_number} readOnly />
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

            <div className="form-field">
              <label className="form-label">Candidate Name *</label>
              <input
                type="text"
                name="candidate_name"
                autoComplete="off"
                className={`form-input${fieldErrors.candidate_name ? ' form-input--error' : ''}`}
                value={form.candidate_name}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.candidate_name && <span className="form-error">{fieldErrors.candidate_name}</span>}
            </div>

            <div className="form-field">
              <label className="form-label">Candidate Email *</label>
              <input
                type="email"
                name="candidate_email"
                autoComplete="off"
                className={`form-input${fieldErrors.candidate_email ? ' form-input--error' : ''}`}
                value={form.candidate_email}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.candidate_email && <span className="form-error">{fieldErrors.candidate_email}</span>}
            </div>

            <div className="form-field">
              <label className="form-label">Candidate Phone *</label>
              <input
                type="text"
                name="candidate_phone"
                autoComplete="off"
                className={`form-input${fieldErrors.candidate_phone ? ' form-input--error' : ''}`}
                value={form.candidate_phone}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.candidate_phone && <span className="form-error">{fieldErrors.candidate_phone}</span>}
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
              {fieldErrors.job_role && <span className="form-error">{fieldErrors.job_role}</span>}
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
              {fieldErrors.department && <span className="form-error">{fieldErrors.department}</span>}
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
              <label className="form-label">Date of Joining *</label>
              <input
                type="date"
                name="date_of_joining"
                className={`form-input${fieldErrors.date_of_joining ? ' form-input--error' : ''}`}
                value={form.date_of_joining}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.date_of_joining && <span className="form-error">{fieldErrors.date_of_joining}</span>}
            </div>

            <div className="form-field">
              <label className="form-label">Monthly Gross Salary (₹) *</label>
              <input
                type="number"
                name="salary"
                min="0"
                step="1"
                className={`form-input${fieldErrors.salary ? ' form-input--error' : ''}`}
                value={form.salary}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.salary && <span className="form-error">{fieldErrors.salary}</span>}
            </div>

            <div className="form-field">
              <label className="form-label">Offer Date *</label>
              <input
                type="date"
                name="offer_date"
                className={`form-input${fieldErrors.offer_date ? ' form-input--error' : ''}`}
                value={form.offer_date}
                onChange={handleChange}
                disabled={loading || success}
              />
              {fieldErrors.offer_date && <span className="form-error">{fieldErrors.offer_date}</span>}
            </div>

            <div className="form-field">
              <label className="form-label">Offer Valid Until</label>
              <input
                type="date"
                name="expiry_date"
                className="form-input"
                value={form.expiry_date}
                onChange={handleChange}
                disabled={loading || success}
              />
            </div>

            <div className="form-field form-field--full">
              <label className="form-label">Roles &amp; Responsibilities</label>
              <textarea
                name="roles_responsibilities"
                className="form-textarea"
                rows={5}
                placeholder="Enter each responsibility on a new line, or leave blank to use the default template…"
                value={form.roles_responsibilities}
                onChange={handleChange}
                disabled={loading || success}
              />
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
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <Link to={`/offers/${id}`} className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
