import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getReviewById, updateReview,
  computeOverallRating, computeRatingLabel,
} from '../../services/performanceService';
import '../../styles/Candidates.css';
import '../../styles/Performance.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_OPTIONS = [
  { value:'annual',       label:'Annual Performance Review'    },
  { value:'quarterly',    label:'Quarterly Review'             },
  { value:'probation',    label:'Probation Review'             },
  { value:'pip',          label:'Performance Improvement Plan' },
  { value:'promotion',    label:'Promotion Recommendation'     },
  { value:'warning',      label:'Warning / Disciplinary Note'  },
  { value:'commendation', label:'Commendation / Recognition'   },
  { value:'exit',         label:'Exit Interview Review'        },
];

const REC_OPTIONS = [
  { value:'no_action',        label:'No Action Required'         },
  { value:'promote',          label:'Recommend Promotion'        },
  { value:'retain',           label:'Retain in Current Role'     },
  { value:'salary_increment', label:'Recommend Salary Increment' },
  { value:'role_change',      label:'Recommend Role Change'      },
  { value:'pip',              label:'Performance Improvement Plan' },
  { value:'warning_letter',   label:'Issue Warning Letter'       },
  { value:'terminate',        label:'Recommend Termination'      },
];

const STATUS_OPTIONS = [
  { value:'draft',        label:'Draft'        },
  { value:'submitted',    label:'Submitted'    },
  { value:'acknowledged', label:'Acknowledged' },
  { value:'closed',       label:'Closed'       },
];

const RATING_CATEGORIES = [
  { key:'rating_technical',     label:'Technical Skills / Work Quality' },
  { key:'rating_communication', label:'Communication Skills'            },
  { key:'rating_teamwork',      label:'Teamwork & Collaboration'        },
  { key:'rating_punctuality',   label:'Punctuality & Attendance'       },
  { key:'rating_initiative',    label:'Initiative & Problem Solving'   },
];

const RATING_HINTS = { 1:'Poor', 2:'Below Average', 3:'Average', 4:'Good', 5:'Excellent' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function recordToForm(p) {
  return {
    employee_id:           p.employee_id           ?? '',
    employee_ref:          p.employee_ref           ?? '',
    employee_name:         p.employee_name          ?? '',
    department:            p.department             ?? '',
    designation:           p.designation            ?? '',
    review_type:           p.review_type            ?? 'annual',
    review_period_start:   p.review_period_start    ?? '',
    review_period_end:     p.review_period_end      ?? '',
    review_date:           p.review_date            ?? '',
    reviewer_name:         p.reviewer_name          ?? '',
    reviewer_designation:  p.reviewer_designation   ?? '',
    rating_technical:      p.rating_technical       ?? null,
    rating_communication:  p.rating_communication   ?? null,
    rating_teamwork:       p.rating_teamwork        ?? null,
    rating_punctuality:    p.rating_punctuality     ?? null,
    rating_initiative:     p.rating_initiative      ?? null,
    performance_notes:     p.performance_notes      ?? '',
    achievements:          p.achievements           ?? '',
    areas_for_improvement: p.areas_for_improvement  ?? '',
    goals_next_period:     p.goals_next_period       ?? '',
    behavior_feedback:     p.behavior_feedback       ?? '',
    recommendation:        p.recommendation         ?? 'no_action',
    status:                p.status                 ?? 'draft',
    is_shared_with_employee: p.is_shared_with_employee ?? false,
    remarks:               p.remarks               ?? '',
  };
}

function validate(f) {
  const e = {};
  if (!f.employee_ref.trim())   e.employee_ref   = 'Employee is required';
  if (!f.review_type)           e.review_type    = 'Required';
  if (!f.review_date)           e.review_date    = 'Required';
  if (!f.reviewer_name.trim())  e.reviewer_name  = 'Required';
  return e;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({ label, error, hint, children, span }) {
  return (
    <div className="form-field" style={span ? { gridColumn:'1/-1' } : undefined}>
      <label className="form-label">{label}</label>
      {children}
      {hint  && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

function SectionDivider({ title, subtitle }) {
  return (
    <div className="perf-section-divider">
      <p className="perf-section-title">{title}</p>
      {subtitle && <p className="perf-section-sub">{subtitle}</p>}
    </div>
  );
}

function RatingWidget({ value, onChange }) {
  return (
    <div className="rating-widget">
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          title={RATING_HINTS[n]}
          className={`rating-btn rating-btn--${n}${value === n ? ' rating-btn--active' : ''}`}
          onClick={() => onChange(value === n ? null : n)}
        >
          {n}
        </button>
      ))}
      {value && (
        <button type="button" className="rating-clear-btn" onClick={() => onChange(null)}>
          ✕ clear
        </button>
      )}
      {value && <span className="rating-widget-label">— {RATING_HINTS[value]}</span>}
    </div>
  );
}

function OverallCard({ form }) {
  const cats = {
    rating_technical:     form.rating_technical,
    rating_communication: form.rating_communication,
    rating_teamwork:      form.rating_teamwork,
    rating_punctuality:   form.rating_punctuality,
    rating_initiative:    form.rating_initiative,
  };
  const overall = computeOverallRating(cats);
  const label   = computeRatingLabel(overall);

  const LABEL_TEXT = {
    outstanding:'Outstanding', exceeds_expectations:'Exceeds Expectations',
    meets_expectations:'Meets Expectations', needs_improvement:'Needs Improvement',
    unsatisfactory:'Unsatisfactory',
  };

  const CATEGORY_SHORT = {
    rating_technical:'Technical', rating_communication:'Communication',
    rating_teamwork:'Teamwork', rating_punctuality:'Punctuality', rating_initiative:'Initiative',
  };

  return (
    <div className="perf-overall-card">
      <div>
        {overall
          ? <div className="perf-overall-number">{overall.toFixed(1)}</div>
          : <div className="perf-overall-number perf-overall-number--empty">No ratings yet</div>
        }
        {label && <div className="perf-overall-label">{LABEL_TEXT[label]}</div>}
      </div>
      <div className="perf-overall-breakdown">
        {RATING_CATEGORIES.map(({ key }) => {
          const val = form[key];
          return (
            <div key={key} className="perf-overall-row">
              <span className="perf-overall-cat">{CATEGORY_SHORT[key]}</span>
              <div className="perf-overall-dots">
                {[1,2,3,4,5].map((n) => (
                  <span key={n} className={`perf-overall-dot${val && n <= val ? ' perf-overall-dot--filled':''}`} />
                ))}
              </div>
              <span style={{ fontSize:11, opacity:0.7, marginLeft:4, minWidth:10 }}>{val ?? '–'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EditPerformanceReview() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [form,       setForm]       = useState(null);
  const [errors,     setErrors]     = useState({});
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [loadError,  setLoadError]  = useState('');
  const [apiError,   setApiError]   = useState('');

  useEffect(() => {
    getReviewById(id)
      .then((r) => setForm(recordToForm(r)))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function set(field) {
    return (e) => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: val }));
      if (errors[field]) setErrors((er) => { const c = { ...er }; delete c[field]; return c; });
    };
  }

  function setRating(field) {
    return (val) => setForm((f) => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');
    try {
      const cats = {
        rating_technical:     form.rating_technical,
        rating_communication: form.rating_communication,
        rating_teamwork:      form.rating_teamwork,
        rating_punctuality:   form.rating_punctuality,
        rating_initiative:    form.rating_initiative,
      };
      const overall_rating = computeOverallRating(cats);
      const rating_label   = computeRatingLabel(overall_rating);

      const payload = {
        employee_id:           form.employee_id   || null,
        employee_ref:          form.employee_ref.trim(),
        employee_name:         form.employee_name.trim(),
        department:            form.department.trim()  || null,
        designation:           form.designation.trim() || null,
        review_type:           form.review_type,
        review_period_start:   form.review_period_start || null,
        review_period_end:     form.review_period_end   || null,
        review_date:           form.review_date,
        reviewer_name:         form.reviewer_name.trim(),
        reviewer_designation:  form.reviewer_designation.trim() || null,
        rating_technical:      form.rating_technical     ?? null,
        rating_communication:  form.rating_communication ?? null,
        rating_teamwork:       form.rating_teamwork      ?? null,
        rating_punctuality:    form.rating_punctuality   ?? null,
        rating_initiative:     form.rating_initiative    ?? null,
        overall_rating,
        rating_label,
        performance_notes:     form.performance_notes.trim()     || null,
        achievements:          form.achievements.trim()           || null,
        areas_for_improvement: form.areas_for_improvement.trim() || null,
        goals_next_period:     form.goals_next_period.trim()      || null,
        behavior_feedback:     form.behavior_feedback.trim()      || null,
        recommendation:        form.recommendation,
        status:                form.status,
        is_shared_with_employee: form.is_shared_with_employee,
        remarks:               form.remarks.trim() || null,
      };

      await updateReview(id, payload);
      navigate(`/performance/${id}`);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Layout><div className="page-loading">Loading review…</div></Layout>;
  }

  if (loadError || !form) {
    return (
      <Layout>
        <div className="alert-error">
          {loadError || 'Review not found.'}
          <Link to="/performance" style={{ marginLeft:12 }}>← Back to list</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to={`/performance/${id}`} className="back-link">← Back to Review</Link>
          <h2 className="page-title" style={{ marginTop:4 }}>Edit Performance Review</h2>
          <p className="page-subtitle">{form.employee_name} · {form.employee_ref}</p>
        </div>
      </div>

      {apiError && <div className="alert-error" style={{ marginBottom:16 }}>{apiError}</div>}

      <form onSubmit={handleSubmit} noValidate className="perf-form">

        {/* ══ Employee (locked) ════════════════════════════════════════════ */}
        <SectionDivider title="Employee" />
        <div className="perf-emp-selected-card perf-emp-selected-card--locked">
          <p className="perf-emp-selected-ref">{form.employee_ref}</p>
          <p className="perf-emp-selected-name">{form.employee_name}</p>
          <p className="perf-emp-selected-meta">
            {[form.department, form.designation].filter(Boolean).join(' · ') || 'No dept/designation'}
          </p>
          <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Employee cannot be changed after creation</p>
        </div>

        {/* ══ Review Metadata ══════════════════════════════════════════════ */}
        <SectionDivider title="Review Details" />
        <div className="perf-form-grid-3">
          <Field label="Review Type *" error={errors.review_type}>
            <select className="form-select" value={form.review_type} onChange={set('review_type')}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Review Date *" error={errors.review_date}>
            <input type="date"
              className={`form-input${errors.review_date ? ' form-input--error' : ''}`}
              value={form.review_date} onChange={set('review_date')}
            />
          </Field>

          <div />

          <Field label="Review Period Start">
            <input type="date" className="form-input" value={form.review_period_start} onChange={set('review_period_start')} />
          </Field>

          <Field label="Review Period End">
            <input type="date" className="form-input" value={form.review_period_end} onChange={set('review_period_end')} />
          </Field>
        </div>

        {/* ══ Reviewer ════════════════════════════════════════════════════ */}
        <SectionDivider title="Reviewer Information" />
        <div className="perf-form-grid">
          <Field label="Reviewer Name *" error={errors.reviewer_name}>
            <input type="text"
              className={`form-input${errors.reviewer_name ? ' form-input--error' : ''}`}
              value={form.reviewer_name} onChange={set('reviewer_name')}
            />
          </Field>

          <Field label="Reviewer Designation">
            <input type="text" className="form-input"
              value={form.reviewer_designation} onChange={set('reviewer_designation')}
            />
          </Field>
        </div>

        {/* ══ Category Ratings ════════════════════════════════════════════ */}
        <SectionDivider title="Category Ratings" subtitle="Click a number to change · click same number to clear" />
        <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:900 }}>
          {RATING_CATEGORIES.map(({ key, label }) => (
            <div key={key} className="form-field">
              <label className="form-label">{label}</label>
              <RatingWidget value={form[key]} onChange={setRating(key)} />
            </div>
          ))}
        </div>

        <OverallCard form={form} />

        {/* ══ Performance Notes ═══════════════════════════════════════════ */}
        <SectionDivider title="Performance Notes" />
        <div className="perf-form-grid" style={{ gridTemplateColumns:'1fr' }}>
          <Field label="Performance Notes">
            <textarea className="form-textarea" rows={4}
              value={form.performance_notes} onChange={set('performance_notes')}
            />
          </Field>
          <Field label="Key Achievements">
            <textarea className="form-textarea" rows={3}
              value={form.achievements} onChange={set('achievements')}
            />
          </Field>
          <Field label="Areas for Improvement">
            <textarea className="form-textarea" rows={3}
              value={form.areas_for_improvement} onChange={set('areas_for_improvement')}
            />
          </Field>
          <Field label="Goals for Next Period">
            <textarea className="form-textarea" rows={3}
              value={form.goals_next_period} onChange={set('goals_next_period')}
            />
          </Field>
          <Field label="Behavior Feedback">
            <textarea className="form-textarea" rows={3}
              value={form.behavior_feedback} onChange={set('behavior_feedback')}
            />
          </Field>
        </div>

        {/* ══ Outcome ════════════════════════════════════════════════════ */}
        <SectionDivider title="Outcome & Recommendation" />
        <div className="perf-form-grid-3">
          <Field label="Recommendation">
            <select className="form-select" value={form.recommendation} onChange={set('recommendation')}>
              {REC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Review Status">
            <select className="form-select" value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Share with Employee">
            <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:8 }}>
              <input type="checkbox" id="share-chk"
                checked={form.is_shared_with_employee}
                onChange={set('is_shared_with_employee')}
                style={{ width:16, height:16, cursor:'pointer' }}
              />
              <label htmlFor="share-chk" style={{ fontSize:13, color:'#374151', cursor:'pointer' }}>
                Shared with employee
              </label>
            </div>
          </Field>
        </div>

        {/* ══ Internal Remarks ═════════════════════════════════════════════ */}
        <SectionDivider title="Internal HR Remarks" />
        <div className="perf-form-grid" style={{ gridTemplateColumns:'1fr' }}>
          <Field label="Internal Remarks (optional)">
            <textarea className="form-textarea" rows={3}
              value={form.remarks} onChange={set('remarks')}
            />
          </Field>
        </div>

        {/* ══ Form actions ════════════════════════════════════════════════ */}
        <div className="form-actions">
          <Link to={`/performance/${id}`} className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
