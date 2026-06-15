import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getReviewById, updateReview, deleteReview } from '../../services/performanceService';
import '../../styles/Candidates.css';
import '../../styles/Performance.css';

// ── Constants / label maps ─────────────────────────────────────────────────────
const TYPE_LABELS = {
  annual:'Annual Review', quarterly:'Quarterly Review', probation:'Probation Review',
  pip:'PIP', promotion:'Promotion Recommendation', warning:'Warning / Disciplinary',
  commendation:'Commendation', exit:'Exit Interview Review',
};

const REC_LABELS = {
  promote:'Recommend Promotion', retain:'Retain in Current Role',
  pip:'Performance Improvement Plan', warning_letter:'Issue Warning Letter',
  terminate:'Recommend Termination', no_action:'No Action Required',
  salary_increment:'Recommend Salary Increment', role_change:'Recommend Role Change',
};

const STATUS_LABELS   = { draft:'Draft', submitted:'Submitted', acknowledged:'Acknowledged', closed:'Closed' };
const RATING_LABELS   = { outstanding:'Outstanding', exceeds_expectations:'Exceeds Expectations',
                           meets_expectations:'Meets Expectations', needs_improvement:'Needs Improvement',
                           unsatisfactory:'Unsatisfactory' };
const RATING_HINTS    = { 1:'Poor', 2:'Below Average', 3:'Average', 4:'Good', 5:'Excellent' };

const CATEGORIES = [
  { key:'rating_technical',     label:'Technical Skills / Work Quality' },
  { key:'rating_communication', label:'Communication Skills'            },
  { key:'rating_teamwork',      label:'Teamwork & Collaboration'        },
  { key:'rating_punctuality',   label:'Punctuality & Attendance'       },
  { key:'rating_initiative',    label:'Initiative & Problem Solving'   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    year:'numeric', month:'short', day:'numeric',
  });
}

function statusWorkflow(status) {
  const actions = [];
  if (status === 'draft')        actions.push({ next:'submitted',    label:'Submit Review',   cls:'btn-primary'   });
  if (status === 'submitted')    actions.push({ next:'acknowledged', label:'Mark Acknowledged', cls:'btn-primary' });
  if (status !== 'closed')       actions.push({ next:'closed',       label:'Close Review',    cls:'btn-secondary' });
  return actions;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoCard({ title, children }) {
  return (
    <div className="perf-detail-card">
      <h4 className="perf-detail-card-title">{title}</h4>
      <div className="perf-detail-fields">{children}</div>
    </div>
  );
}

function Field({ label, value, badge, full }) {
  return (
    <div className="perf-detail-field" style={full ? { gridColumn:'1/-1' } : undefined}>
      <span className="perf-detail-label">{label}</span>
      <span className="perf-detail-value">
        {badge ? badge : (value || '—')}
      </span>
    </div>
  );
}

function RatingBar({ value }) {
  if (!value) return <span style={{ color:'#94a3b8' }}>Not rated</span>;
  const pct = (value / 5) * 100;
  const colors = { 1:'#ef4444', 2:'#f59e0b', 3:'#3b82f6', 4:'#6366f1', 5:'#10b981' };
  return (
    <div className="perf-rating-bar-row">
      <div className="perf-rating-bar-track">
        <div
          className="perf-rating-bar-fill"
          style={{ width:`${pct}%`, background: colors[value] }}
        />
      </div>
      <span className="perf-rating-bar-value">{value}/5 — {RATING_HINTS[value]}</span>
    </div>
  );
}

function NotesSection({ label, value, variant }) {
  if (!value) return null;
  return (
    <div className={`perf-notes-section${variant ? ` perf-notes-section--${variant}` : ''}`}>
      <p className="perf-notes-label">{label}</p>
      <p className="perf-notes-body">{value}</p>
    </div>
  );
}

function StarHero({ rating, label }) {
  if (!rating) return null;
  const r = parseFloat(rating);
  const full  = Math.floor(r);
  const half  = r - full >= 0.3;
  return (
    <div className="perf-rating-hero">
      <div className="perf-rating-hero-number">{r.toFixed(1)}</div>
      <div className="perf-stars">
        {[1,2,3,4,5].map((n) => (
          <span
            key={n}
            className={
              n <= full ? 'perf-star--filled'
              : (n === full + 1 && half) ? 'perf-star--half'
              : 'perf-star--empty'
            }
          >★</span>
        ))}
      </div>
      {label && (
        <span className={`status-badge rating-${label}`}>
          {RATING_LABELS[label] ?? label}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PerformanceDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [review,      setReview]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [actionErr,   setActionErr]   = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [activeTab,   setActiveTab]   = useState('details');
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  useEffect(() => {
    setLoading(true);
    getReviewById(id)
      .then(setReview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(nextStatus) {
    setTransitioning(true);
    setActionErr('');
    try {
      const updated = await updateReview(id, { status: nextStatus });
      setReview(updated);
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setTransitioning(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteReview(id);
      navigate('/performance');
    } catch (e) {
      setActionErr(e.message);
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="page-loading">Loading performance review…</div>
      </Layout>
    );
  }

  if (error || !review) {
    return (
      <Layout>
        <div className="alert-error">
          {error || 'Review not found.'}
          <Link to="/performance" style={{ marginLeft: 12 }}>← Back to list</Link>
        </div>
      </Layout>
    );
  }

  const actions = statusWorkflow(review.status);

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <Link to="/performance" className="back-link">← Performance Reviews</Link>
          <h2 className="page-title" style={{ marginTop:4 }}>
            {review.review_number}
            <span className={`status-badge status-rev-${review.status}`} style={{ marginLeft:10, verticalAlign:'middle' }}>
              {STATUS_LABELS[review.status] ?? review.status}
            </span>
          </h2>
          <p className="page-subtitle">
            {review.employee_name} · {review.employee_ref}
          </p>
        </div>

        <div className="detail-header-actions">
          {actions.map((a) => (
            <button
              key={a.next}
              className={a.cls}
              disabled={transitioning}
              onClick={() => handleStatusChange(a.next)}
            >
              {a.label}
            </button>
          ))}
          <Link to={`/performance/${id}/edit`} className="btn-secondary">Edit</Link>
          <button className="btn-danger" onClick={() => setShowDelete(true)}>Delete</button>
        </div>
      </div>

      {actionErr && (
        <div className="alert-error" style={{ marginBottom:16 }}>{actionErr}</div>
      )}

      {/* ── Tabs ── */}
      <div className="perf-tabs">
        {['details','notes'].map((t) => (
          <button
            key={t}
            className={`perf-tab-btn${activeTab === t ? ' perf-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t === 'details' ? 'Details & Ratings' : 'Performance Notes'}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════ DETAILS TAB ════════════════════════ */}
      {activeTab === 'details' && (
        <div>
          {/* Overall rating hero */}
          {review.overall_rating && (
            <StarHero rating={review.overall_rating} label={review.rating_label} />
          )}

          {/* Employee & Review Info side by side */}
          <div className="perf-detail-grid">
            <InfoCard title="Employee Information">
              <Field label="Employee ID"   value={review.employee_ref}  />
              <Field label="Full Name"     value={review.employee_name} />
              <Field label="Department"    value={review.department}    />
              <Field label="Designation"   value={review.designation}   />
            </InfoCard>

            <InfoCard title="Review Information">
              <Field label="Review Number" value={review.review_number} />
              <Field label="Review Type"
                badge={
                  <span className={`rev-type-badge rev-type-${review.review_type}`}>
                    {TYPE_LABELS[review.review_type] ?? review.review_type}
                  </span>
                }
              />
              <Field label="Review Date"   value={fmtDate(review.review_date)} />
              <Field label="Period"        value={
                review.review_period_start
                  ? `${fmtDate(review.review_period_start)} → ${fmtDate(review.review_period_end)}`
                  : undefined
              } />
              <Field label="Reviewer"      value={review.reviewer_name} />
              <Field label="Reviewer Designation" value={review.reviewer_designation} />
            </InfoCard>
          </div>

          {/* Category ratings */}
          <div className="perf-detail-card perf-detail-card--full">
            <h4 className="perf-detail-card-title">Category Ratings</h4>
            <div className="perf-rating-bars">
              {CATEGORIES.map(({ key, label }) => (
                <div key={key} className="perf-rating-bar-item">
                  <span className="perf-rating-bar-label">{label}</span>
                  <RatingBar value={review[key]} />
                </div>
              ))}
            </div>
          </div>

          {/* Outcome */}
          <div className="perf-detail-grid">
            <InfoCard title="Outcome">
              <Field label="Recommendation"
                badge={
                  <span className={`status-badge rec-${review.recommendation}`}>
                    {REC_LABELS[review.recommendation] ?? review.recommendation}
                  </span>
                }
              />
              <Field label="Status"
                badge={
                  <span className={`status-badge status-rev-${review.status}`}>
                    {STATUS_LABELS[review.status] ?? review.status}
                  </span>
                }
              />
              <Field label="Shared with Employee" value={review.is_shared_with_employee ? 'Yes' : 'No'} />
            </InfoCard>

            <InfoCard title="Timestamps">
              <Field label="Created"      value={new Date(review.created_at).toLocaleString('en-IN')} />
              <Field label="Last Updated" value={new Date(review.updated_at).toLocaleString('en-IN')} />
            </InfoCard>
          </div>

          {/* Internal remarks */}
          {review.remarks && (
            <div className="perf-detail-card perf-detail-card--full">
              <h4 className="perf-detail-card-title">Internal HR Remarks</h4>
              <p style={{ fontSize:14, color:'#374151', lineHeight:1.6, margin:0 }}>{review.remarks}</p>
            </div>
          )}

          {/* Employee history link */}
          <div style={{ marginTop:20 }}>
            <Link to={`/performance/employee/${review.employee_ref}`} className="action-link">
              View all reviews for {review.employee_name} →
            </Link>
          </div>
        </div>
      )}

      {/* ════════════════════════════════ NOTES TAB ══════════════════════════ */}
      {activeTab === 'notes' && (
        <div className="perf-detail-card perf-detail-card--full" style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {!review.performance_notes && !review.achievements && !review.areas_for_improvement
           && !review.goals_next_period && !review.behavior_feedback ? (
            <p style={{ color:'#94a3b8', fontSize:14, padding:'12px 0' }}>
              No performance notes recorded for this review.
            </p>
          ) : (
            <>
              <NotesSection label="Performance Notes"      value={review.performance_notes}     />
              <NotesSection label="Key Achievements"       value={review.achievements}           variant="green" />
              <NotesSection label="Areas for Improvement"  value={review.areas_for_improvement}  variant="warning" />
              <NotesSection label="Goals for Next Period"  value={review.goals_next_period}       />
              <NotesSection label="Behavior Feedback"      value={review.behavior_feedback}       variant="red" />
            </>
          )}
        </div>
      )}

      {/* ── Delete modal ── */}
      {showDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Performance Review</h3>
            <p className="modal-body">
              Permanently delete review <strong>{review.review_number}</strong> for{' '}
              <strong>{review.employee_name}</strong>? This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" disabled={deleting} onClick={() => setShowDelete(false)}>
                Cancel
              </button>
              <button className="btn-danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
