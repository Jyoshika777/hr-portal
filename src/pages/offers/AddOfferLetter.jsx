import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getCandidateById, updateCandidate } from '../../services/candidateService';
import { generateOfferNumber, addOfferLetter } from '../../services/offerLetterService';
import '../../styles/Candidates.css';
import '../../styles/Offers.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEPARTMENT_OPTIONS = [
  'Engineering', 'Human Resources', 'Finance', 'Marketing',
  'Operations', 'Sales', 'Design', 'Legal', 'Product', 'Customer Support', 'Other',
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time',  label: 'Full-Time'  },
  { value: 'part_time',  label: 'Part-Time'  },
  { value: 'contract',   label: 'Contract'   },
  { value: 'intern',     label: 'Internship' },
  { value: 'temporary',  label: 'Temporary'  },
  { value: 'trainee',    label: 'Trainee'    },
  { value: 'remote',     label: 'Remote'     },
  { value: 'hybrid',     label: 'Hybrid'     },
];

// Employment type groups — drive conditional field visibility
const FT_GROUP  = ['full_time', 'part_time', 'remote', 'hybrid']; // permanent-style terms
const CTR_GROUP = ['contract', 'temporary'];                       // contract/temp terms

const today       = new Date().toISOString().slice(0, 10);
const twoWeeksOut = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────
function salaryLabel(type) {
  if (type === 'intern')                    return 'Monthly Stipend (₹) *';
  if (type === 'trainee')                   return 'Monthly Salary / Stipend (₹) *';
  if (CTR_GROUP.includes(type))             return 'Monthly Compensation (₹) *';
  return 'Monthly Gross Salary (₹) *';
}

function buildEmptyForm(cand = null) {
  return {
    // Core
    candidate_name:         cand?.full_name  ?? '',
    candidate_email:        cand?.email      ?? '',
    candidate_phone:        cand?.phone      ?? '',
    job_role:               cand?.job_role   ?? '',
    department:             '',
    employment_type:        'full_time',
    date_of_joining:        '',
    salary:                 '',
    offer_date:             today,
    expiry_date:            twoWeeksOut,
    remarks:                cand?.remarks    ?? '',
    roles_responsibilities: '',
    // Full-time / permanent group
    annual_ctc:             '',
    probation_months:       '',
    notice_period_days:     '',
    employee_benefits:      '',
    leave_policy:           '',
    // Internship group
    internship_duration:    '',
    learning_objectives:    '',
    // Contract / Temporary group
    contract_duration:      '',
    project_assignment:     '',
    renewal_conditions:     '',
    // Trainee group
    training_duration:      '',
    training_stipend:       '',
  };
}

function validate(f) {
  const e = {};
  // Always required
  if (!f.candidate_name.trim())  e.candidate_name  = 'Required';
  if (!f.candidate_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.candidate_email))
    e.candidate_email = 'Valid email required';
  if (!f.candidate_phone.trim()) e.candidate_phone = 'Required';
  if (!f.job_role.trim())        e.job_role        = 'Required';
  if (!f.department)             e.department      = 'Required';
  if (!f.date_of_joining)        e.date_of_joining = 'Required';
  if (!f.offer_date)             e.offer_date      = 'Required';
  if (!f.salary || isNaN(Number(f.salary)) || Number(f.salary) <= 0)
    e.salary = 'Enter a valid positive amount';

  // Type-specific required fields
  if (f.employment_type === 'intern' && !f.internship_duration.trim())
    e.internship_duration = 'Required for internship';
  if (CTR_GROUP.includes(f.employment_type) && !f.contract_duration.trim())
    e.contract_duration = 'Required';
  if (f.employment_type === 'trainee' && !f.training_duration.trim())
    e.training_duration = 'Required for trainee';

  // Optional numeric fields — validate only when filled
  const posNum = (val, key, label) => {
    if (val !== '' && (isNaN(Number(val)) || Number(val) <= 0))
      e[key] = `${label} must be a positive number`;
  };
  posNum(f.annual_ctc,         'annual_ctc',         'Annual CTC');
  posNum(f.probation_months,   'probation_months',   'Probation period');
  posNum(f.notice_period_days, 'notice_period_days', 'Notice period');
  posNum(f.training_stipend,   'training_stipend',   'Training stipend');

  return e;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionDivider({ title }) {
  return (
    <div className="form-field form-field--full" style={{ marginTop: 4, marginBottom: -4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em',
          color: '#94a3b8', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        <span style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>
    </div>
  );
}

function Field({ label, error, children, full = false }) {
  return (
    <div className={`form-field${full ? ' form-field--full' : ''}`}>
      <label className="form-label">{label}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AddOfferLetter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get('candidateId');

  const [offerNum,    setOfferNum]    = useState('');
  const [candidate,   setCandidate]   = useState(null);
  const [form,        setForm]        = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [fetchError,  setFetchError]  = useState('');

  useEffect(() => {
    Promise.all([
      generateOfferNumber(),
      candidateId ? getCandidateById(candidateId) : Promise.resolve(null),
    ])
      .then(([num, cand]) => {
        setOfferNum(num);
        setCandidate(cand);
        setForm(buildEmptyForm(cand));
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setFetching(false));
  }, [candidateId]);

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

    const num = (val) => (val !== '' && val != null ? Number(val) : null);

    const payload = {
      offer_number:           offerNum,
      candidate_id:           candidateId || null,
      candidate_name:         form.candidate_name.trim(),
      candidate_email:        form.candidate_email.trim(),
      candidate_phone:        form.candidate_phone.trim(),
      job_role:               form.job_role.trim(),
      department:             form.department,
      employment_type:        form.employment_type,
      date_of_joining:        form.date_of_joining,
      salary:                 Number(form.salary),
      offer_date:             form.offer_date,
      expiry_date:            form.expiry_date || null,
      status:                 'draft',
      remarks:                form.remarks.trim(),
      roles_responsibilities: form.roles_responsibilities.trim(),
      // Permanent / FT group
      annual_ctc:             num(form.annual_ctc),
      probation_months:       num(form.probation_months),
      notice_period_days:     num(form.notice_period_days),
      employee_benefits:      form.employee_benefits.trim(),
      leave_policy:           form.leave_policy.trim(),
      // Intern group
      internship_duration:    form.internship_duration.trim(),
      learning_objectives:    form.learning_objectives.trim(),
      // Contract / Temporary group
      contract_duration:      form.contract_duration.trim(),
      project_assignment:     form.project_assignment.trim(),
      renewal_conditions:     form.renewal_conditions.trim(),
      // Trainee group
      training_duration:      form.training_duration.trim(),
      training_stipend:       num(form.training_stipend),
    };

    setLoading(true);
    setServerError('');
    try {
      const offer = await addOfferLetter(payload);
      if (candidateId) {
        try { await updateCandidate(candidateId, { status: 'offer_sent' }); }
        catch (err) { console.warn('[AddOfferLetter] candidate status update failed:', err.message); }
      }
      navigate(`/offers/${offer.id}`);
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  const type       = form?.employment_type ?? 'full_time';
  const showFT     = FT_GROUP.includes(type);
  const showCTR    = CTR_GROUP.includes(type);
  const showIntern = type === 'intern';
  const showTrain  = type === 'trainee';
  const canSubmit  = !loading && !!form && !!offerNum;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (fetching) {
    return (
      <Layout>
        <Link to="/offers" className="back-link">← Back to Offer Letters</Link>
        <div className="page-header">
          <h2 className="page-title">New Offer Letter</h2>
        </div>
        <div className="form-card">
          <div className="form-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div className="form-field" key={i}>
                <span className="skeleton-cell" style={{ width: 80, height: 12, marginBottom: 6 }} />
                <span className="skeleton-cell" style={{ width: '100%', height: 38, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (fetchError || !form) {
    return (
      <Layout>
        <Link to="/offers" className="back-link">← Back to Offer Letters</Link>
        <div className="alert-error">{fetchError || 'Could not load form.'}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to="/offers" className="back-link">← Back to Offer Letters</Link>

      <div className="page-header">
        <div>
          <h2 className="page-title">New Offer Letter</h2>
          {candidate && (
            <p className="page-subtitle">
              Pre-filled from candidate{' '}
              <Link to={`/candidates/${candidateId}`} className="action-link">
                {candidate.application_id}
              </Link>
              {' '}· Status will be updated to <strong>Offer Sent</strong>
            </p>
          )}
        </div>
      </div>

      {candidate && (
        <div className="conversion-source-card">
          <span className="conversion-source-label">Candidate</span>
          <span className="conversion-source-id">{candidate.application_id}</span>
          <span className="conversion-source-name">{candidate.full_name}</span>
          <span className={`status-badge status-${candidate.status}`}>
            {candidate.status.replace(/_/g, ' ')}
          </span>
          <span className="conversion-source-role">{candidate.job_role}</span>
        </div>
      )}

      <div className="form-card">
        {serverError && (
          <div className="alert-error" style={{ marginBottom: 20 }}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">

            {/* ── Offer reference ── */}
            <SectionDivider title="Offer Reference" />

            <Field label="Offer Number">
              <input className="form-input" value={offerNum || 'Generating…'} readOnly />
            </Field>

            <Field label="Offer Date *" error={fieldErrors.offer_date}>
              <input
                type="date" name="offer_date"
                className={`form-input${fieldErrors.offer_date ? ' form-input--error' : ''}`}
                value={form.offer_date} onChange={handleChange} disabled={loading}
              />
            </Field>

            <Field label="Offer Valid Until">
              <input
                type="date" name="expiry_date" className="form-input"
                value={form.expiry_date} onChange={handleChange} disabled={loading}
              />
            </Field>

            {/* ── Candidate details ── */}
            <SectionDivider title="Candidate Details" />

            <Field label="Full Name *" error={fieldErrors.candidate_name}>
              <input
                type="text" name="candidate_name" autoComplete="off"
                className={`form-input${fieldErrors.candidate_name ? ' form-input--error' : ''}`}
                value={form.candidate_name} onChange={handleChange} disabled={loading}
              />
            </Field>

            <Field label="Email *" error={fieldErrors.candidate_email}>
              <input
                type="email" name="candidate_email" autoComplete="off"
                className={`form-input${fieldErrors.candidate_email ? ' form-input--error' : ''}`}
                value={form.candidate_email} onChange={handleChange} disabled={loading}
              />
            </Field>

            <Field label="Phone *" error={fieldErrors.candidate_phone}>
              <input
                type="text" name="candidate_phone" autoComplete="off"
                className={`form-input${fieldErrors.candidate_phone ? ' form-input--error' : ''}`}
                value={form.candidate_phone} onChange={handleChange} disabled={loading}
              />
            </Field>

            {/* ── Position ── */}
            <SectionDivider title="Position Details" />

            <Field label="Job Role *" error={fieldErrors.job_role}>
              <input
                type="text" name="job_role" autoComplete="off"
                className={`form-input${fieldErrors.job_role ? ' form-input--error' : ''}`}
                value={form.job_role} onChange={handleChange} disabled={loading}
              />
            </Field>

            <Field label="Department *" error={fieldErrors.department}>
              <select
                name="department"
                className={`form-select${fieldErrors.department ? ' form-select--error' : ''}`}
                value={form.department} onChange={handleChange} disabled={loading}
              >
                <option value="">Select department</option>
                {DEPARTMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>

            <Field label="Employment Type">
              <select
                name="employment_type" className="form-select"
                value={form.employment_type} onChange={handleChange} disabled={loading}
              >
                {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Date of Joining *" error={fieldErrors.date_of_joining}>
              <input
                type="date" name="date_of_joining"
                className={`form-input${fieldErrors.date_of_joining ? ' form-input--error' : ''}`}
                value={form.date_of_joining} onChange={handleChange} disabled={loading}
              />
            </Field>

            <Field label={salaryLabel(type)} error={fieldErrors.salary}>
              <input
                type="number" name="salary" min="0" step="1" autoComplete="off"
                placeholder="e.g. 75000"
                className={`form-input${fieldErrors.salary ? ' form-input--error' : ''}`}
                value={form.salary} onChange={handleChange} disabled={loading}
              />
            </Field>

            {/* ── Full-Time / Permanent employment terms ── */}
            {showFT && (
              <>
                <SectionDivider title="Employment Terms" />

                <Field label="Annual CTC (₹)" error={fieldErrors.annual_ctc}>
                  <input
                    type="number" name="annual_ctc" min="0" step="1" autoComplete="off"
                    placeholder="e.g. 900000"
                    className={`form-input${fieldErrors.annual_ctc ? ' form-input--error' : ''}`}
                    value={form.annual_ctc} onChange={handleChange} disabled={loading}
                  />
                </Field>

                <Field label="Probation Period (months)" error={fieldErrors.probation_months}>
                  <input
                    type="number" name="probation_months" min="0" step="1" autoComplete="off"
                    placeholder="e.g. 3"
                    className={`form-input${fieldErrors.probation_months ? ' form-input--error' : ''}`}
                    value={form.probation_months} onChange={handleChange} disabled={loading}
                  />
                </Field>

                <Field label="Notice Period (days)" error={fieldErrors.notice_period_days}>
                  <input
                    type="number" name="notice_period_days" min="0" step="1" autoComplete="off"
                    placeholder="e.g. 30"
                    className={`form-input${fieldErrors.notice_period_days ? ' form-input--error' : ''}`}
                    value={form.notice_period_days} onChange={handleChange} disabled={loading}
                  />
                </Field>

                <Field label="Employee Benefits" full>
                  <textarea
                    name="employee_benefits" className="form-textarea" rows={3}
                    placeholder="e.g. Health insurance, PF, Gratuity, Annual bonus…"
                    value={form.employee_benefits} onChange={handleChange} disabled={loading}
                  />
                </Field>

                <Field label="Leave Policy" full>
                  <textarea
                    name="leave_policy" className="form-textarea" rows={3}
                    placeholder="e.g. 18 days annual leave, 12 days sick leave, 12 days casual leave…"
                    value={form.leave_policy} onChange={handleChange} disabled={loading}
                  />
                </Field>
              </>
            )}

            {/* ── Internship-specific terms ── */}
            {showIntern && (
              <>
                <SectionDivider title="Internship Details" />

                <Field label="Internship Duration *" error={fieldErrors.internship_duration}>
                  <input
                    type="text" name="internship_duration" autoComplete="off"
                    placeholder="e.g. 6 months (Jan 2025 – Jun 2025)"
                    className={`form-input${fieldErrors.internship_duration ? ' form-input--error' : ''}`}
                    value={form.internship_duration} onChange={handleChange} disabled={loading}
                  />
                </Field>

                <Field label="Learning Objectives" full>
                  <textarea
                    name="learning_objectives" className="form-textarea" rows={4}
                    placeholder="Enter each learning objective on a new line…"
                    value={form.learning_objectives} onChange={handleChange} disabled={loading}
                  />
                </Field>
              </>
            )}

            {/* ── Contract / Temporary terms ── */}
            {showCTR && (
              <>
                <SectionDivider title="Contract Details" />

                <Field label="Contract Duration *" error={fieldErrors.contract_duration}>
                  <input
                    type="text" name="contract_duration" autoComplete="off"
                    placeholder="e.g. 12 months"
                    className={`form-input${fieldErrors.contract_duration ? ' form-input--error' : ''}`}
                    value={form.contract_duration} onChange={handleChange} disabled={loading}
                  />
                </Field>

                <Field label="Project / Scope Assignment" full>
                  <textarea
                    name="project_assignment" className="form-textarea" rows={3}
                    placeholder="Describe the project or assignment scope…"
                    value={form.project_assignment} onChange={handleChange} disabled={loading}
                  />
                </Field>

                <Field label="Renewal Conditions" full>
                  <textarea
                    name="renewal_conditions" className="form-textarea" rows={3}
                    placeholder="Conditions under which the contract may be renewed…"
                    value={form.renewal_conditions} onChange={handleChange} disabled={loading}
                  />
                </Field>
              </>
            )}

            {/* ── Trainee terms ── */}
            {showTrain && (
              <>
                <SectionDivider title="Training Details" />

                <Field label="Training Duration *" error={fieldErrors.training_duration}>
                  <input
                    type="text" name="training_duration" autoComplete="off"
                    placeholder="e.g. 3 months"
                    className={`form-input${fieldErrors.training_duration ? ' form-input--error' : ''}`}
                    value={form.training_duration} onChange={handleChange} disabled={loading}
                  />
                </Field>

                <Field label="Training Stipend (₹/month)" error={fieldErrors.training_stipend}>
                  <input
                    type="number" name="training_stipend" min="0" step="1" autoComplete="off"
                    placeholder="e.g. 15000"
                    className={`form-input${fieldErrors.training_stipend ? ' form-input--error' : ''}`}
                    value={form.training_stipend} onChange={handleChange} disabled={loading}
                  />
                </Field>
              </>
            )}

            {/* ── Roles & responsibilities ── */}
            <SectionDivider title="Roles & Responsibilities" />

            <Field label="Roles & Responsibilities" full>
              <textarea
                name="roles_responsibilities" className="form-textarea" rows={5}
                placeholder="Enter each responsibility on a new line, or leave blank to use the default template for this employment type…"
                value={form.roles_responsibilities} onChange={handleChange} disabled={loading}
              />
            </Field>

            {/* ── Notes ── */}
            <SectionDivider title="Additional Notes" />

            <Field label="Remarks" full>
              <textarea
                name="remarks" className="form-textarea" rows={3}
                placeholder="Any additional terms or notes to include in the offer letter…"
                value={form.remarks} onChange={handleChange} disabled={loading}
              />
            </Field>

          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {loading ? 'Generating…' : 'Generate Offer Letter'}
            </button>
            <Link to="/offers" className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
