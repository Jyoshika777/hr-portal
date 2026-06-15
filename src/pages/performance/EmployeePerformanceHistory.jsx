import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getReviewsByEmployee } from '../../services/performanceService';
import '../../styles/Candidates.css';
import '../../styles/Performance.css';

// ── Label maps ────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  annual:'Annual Review', quarterly:'Quarterly Review', probation:'Probation Review',
  pip:'PIP', promotion:'Promotion', warning:'Warning', commendation:'Commendation', exit:'Exit Review',
};

const REC_LABELS = {
  promote:'Promote', retain:'Retain', pip:'PIP', warning_letter:'Warning',
  terminate:'Terminate', no_action:'No Action', salary_increment:'Salary Increment', role_change:'Role Change',
};

const STATUS_LABELS   = { draft:'Draft', submitted:'Submitted', acknowledged:'Acknowledged', closed:'Closed' };
const RATING_LABELS   = {
  outstanding:'Outstanding', exceeds_expectations:'Exceeds Expectations',
  meets_expectations:'Meets Expectations', needs_improvement:'Needs Improvement',
  unsatisfactory:'Unsatisfactory',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    year:'numeric', month:'short', day:'numeric',
  });
}

function getRatingColor(rating) {
  if (!rating) return '#94a3b8';
  const r = parseFloat(rating);
  if (r >= 4.5) return '#10b981';
  if (r >= 3.5) return '#6366f1';
  if (r >= 2.5) return '#3b82f6';
  if (r >= 1.5) return '#f59e0b';
  return '#ef4444';
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="perf-emp-summary-card">
      <p className="perf-emp-summary-label">{label}</p>
      <p className="perf-emp-summary-value" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="perf-emp-summary-sub">{sub}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmployeePerformanceHistory() {
  const { employeeRef } = useParams();

  const [reviews,   setReviews]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    getReviewsByEmployee(employeeRef)
      .then(setReviews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [employeeRef]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const rated    = reviews.filter((r) => r.overall_rating != null);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, r) => s + parseFloat(r.overall_rating), 0) / rated.length).toFixed(1)
    : null;

  const latestRating = rated.length > 0 ? parseFloat(rated[0].overall_rating).toFixed(1) : null;

  const countByType = reviews.reduce((acc, r) => {
    acc[r.review_type] = (acc[r.review_type] || 0) + 1;
    return acc;
  }, {});

  const employeeName = reviews[0]?.employee_name ?? employeeRef;

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <Link to="/performance" className="back-link">← Performance Reviews</Link>
          <h2 className="page-title" style={{ marginTop:4 }}>Performance History</h2>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${employeeName} · ${employeeRef}`}
          </p>
        </div>
        <Link to={`/performance/new?employeeId=${employeeRef}`} className="btn-primary">
          + New Review
        </Link>
      </div>

      {error && <div className="alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {!loading && !error && (
        <>
          {/* ── Summary banner ── */}
          <div className="perf-emp-summary">
            <StatCard
              label="Total Reviews"
              value={reviews.length}
              sub={`${rated.length} with rating`}
            />
            <StatCard
              label="Average Rating"
              value={avgRating ? `${avgRating} / 5.0` : '—'}
              sub={avgRating ? `Based on ${rated.length} review${rated.length !== 1 ? 's' : ''}` : 'No rated reviews'}
              color={avgRating ? getRatingColor(avgRating) : undefined}
            />
            <StatCard
              label="Latest Rating"
              value={latestRating ? `${latestRating} / 5.0` : '—'}
              sub={rated[0] ? fmtDate(rated[0].review_date) : 'N/A'}
              color={latestRating ? getRatingColor(latestRating) : undefined}
            />
            <StatCard
              label="Review Types"
              value={Object.keys(countByType).length}
              sub={Object.entries(countByType)
                .map(([t, c]) => `${TYPE_LABELS[t] ?? t}: ${c}`)
                .join(', ') || '—'}
            />
          </div>

          {/* ── Timeline ── */}
          {reviews.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8' }}>
              <p style={{ fontSize:16 }}>No performance reviews for {employeeName} yet.</p>
              <Link to={`/performance/new?employeeId=${employeeRef}`} className="btn-primary" style={{ marginTop:16, display:'inline-block' }}>
                Create First Review
              </Link>
            </div>
          ) : (
            <div className="perf-history-timeline">
              {reviews.map((r) => (
                <div key={r.id} className="perf-history-item">
                  {/* Timeline dot */}
                  <div className="perf-history-dot-col">
                    <div
                      className="perf-history-dot"
                      style={{ background: getRatingColor(r.overall_rating) }}
                    />
                    <div className="perf-history-line" />
                  </div>

                  {/* Card */}
                  <div className="perf-history-card">
                    <div className="perf-history-card-header">
                      <div>
                        <span className={`rev-type-badge rev-type-${r.review_type}`}>
                          {TYPE_LABELS[r.review_type] ?? r.review_type}
                        </span>
                        <span style={{ fontSize:12, color:'#64748b', marginLeft:10 }}>
                          {fmtDate(r.review_date)}
                        </span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span className={`status-badge status-rev-${r.status}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                        <Link to={`/performance/${r.id}`} className="action-link">
                          View →
                        </Link>
                      </div>
                    </div>

                    <div className="perf-history-card-body">
                      <div className="perf-history-meta">
                        <span style={{ fontSize:13, color:'#475569' }}>
                          Reviewer: <strong>{r.reviewer_name}</strong>
                        </span>
                        <span style={{ fontSize:12, color:'#94a3b8' }}>
                          {r.review_number}
                        </span>
                      </div>

                      <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:8 }}>
                        {r.overall_rating ? (
                          <div className="perf-history-score" style={{ color: getRatingColor(r.overall_rating) }}>
                            <span style={{ fontSize:20, fontWeight:800 }}>
                              {parseFloat(r.overall_rating).toFixed(1)}
                            </span>
                            <span style={{ fontSize:11, marginLeft:2 }}>/5 ★</span>
                          </div>
                        ) : (
                          <span style={{ fontSize:13, color:'#94a3b8' }}>Not rated</span>
                        )}

                        {r.rating_label && (
                          <span className={`status-badge rating-${r.rating_label}`}>
                            {RATING_LABELS[r.rating_label] ?? r.rating_label}
                          </span>
                        )}

                        {r.recommendation && r.recommendation !== 'no_action' && (
                          <span className={`status-badge rec-${r.recommendation}`}>
                            {REC_LABELS[r.recommendation] ?? r.recommendation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="page-loading">Loading performance history…</div>
      )}
    </Layout>
  );
}
