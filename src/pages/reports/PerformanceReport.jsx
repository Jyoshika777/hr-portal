import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getPerformanceReport } from '../../services/reportService';
import { exportCSV, exportExcel, exportPDF } from '../../utils/exportUtils';
import { DateFilterBar, KpiCard, HBarChart, DonutChart, ExportBar, PctBar } from './ReportParts';
import '../../styles/Reports.css';

// ── Status / type colour maps ─────────────────────────────────────────────────
const TYPE_COLORS = {
  annual:    '#2563eb',
  mid_year:  '#7c3aed',
  probation: '#f59e0b',
  quarterly: '#0f766e',
  ad_hoc:    '#94a3b8',
};
const REC_COLORS = {
  promote:                       '#16a34a',
  retain:                        '#2563eb',
  performance_improvement_plan:  '#f59e0b',
  terminate:                     '#dc2626',
};
const STATUS_COLORS = {
  draft:        '#94a3b8',
  submitted:    '#2563eb',
  acknowledged: '#7c3aed',
  closed:       '#16a34a',
};

// ── Safe Object.entries helper — never throws on null/undefined ───────────────
function safeEntries(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj);
}

// ── Rating distribution bars ──────────────────────────────────────────────────
function RatingDistBar({ data, total }) {
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length || !total) {
    return (
      <div className="rpt-empty" style={{ minHeight: 80 }}>
        No rating data available
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>{d.label}</span>
            <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700 }}>
              {d.count}
              <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>({d.pct ?? 0}%)</span>
            </span>
          </div>
          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${d.pct ?? 0}%`,
                background: d.color || '#94a3b8',
                borderRadius: 99,
                transition: 'width .5s ease',
                minWidth: d.count > 0 ? 4 : 0,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, r = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
      backgroundSize: '200%',
      animation: 'rpt-shimmer 1.4s ease infinite',
      display: 'block',
    }} />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PerformanceReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [preset,   setPreset]   = useState('All');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getPerformanceReport({ dateFrom, dateTo })
      .then((r) => {
        if (!r.ok) throw new Error(r.error || 'Failed to load performance data');
        setData(r);
      })
      .catch((e) => {
        setError(e.message);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // ── Derived data — all guarded against null/undefined ────────────────────
  const total = data?.kpis?.total ?? 0;

  // Every Object.entries call goes through safeEntries() so null/undefined
  // data fields can never throw "Cannot convert undefined to object".
  const reviewTypeData = data
    ? safeEntries(data.byType)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => ({
          label: k.replace(/_/g, ' '),
          value: v,
          color: TYPE_COLORS[k] || '#94a3b8',
        }))
    : [];

  const recData = data
    ? safeEntries(data.byRec)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => ({
          label: k.replace(/_/g, ' '),
          value: v,
          color: REC_COLORS[k] || '#94a3b8',
        }))
    : [];

  const statusData = data
    ? safeEntries(data.byStatus)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => ({
          label: k.replace(/_/g, ' '),
          value: v,
          color: STATUS_COLORS[k] || '#94a3b8',
        }))
    : [];

  const ratingDist = Array.isArray(data?.ratingDist) ? data.ratingDist : [];
  const byDept     = Array.isArray(data?.byDept)     ? data.byDept     : [];

  const avgRatingNum = data?.kpis?.avgRating != null
    ? parseFloat(data.kpis.avgRating)
    : null;

  // ── Exports ───────────────────────────────────────────────────────────────
  function deptRows() {
    return byDept.map((r) => [
      r.label ?? '—',
      r.count ?? 0,
      r.value != null ? r.value : '—',
    ]);
  }
  const doCSV   = () => exportCSV('performance_report',   ['Department', 'Reviews', 'Avg Rating'], deptRows());
  const doExcel = () => exportExcel('performance_report', ['Department', 'Reviews', 'Avg Rating'], deptRows(), 'Performance');
  const doPDF   = () => exportPDF('performance_report', 'Performance Report',
    ['Department', 'Reviews', 'Avg Rating'], deptRows(), [120, 50, 50]);

  // ── Colour helper for avg rating ──────────────────────────────────────────
  function ratingColor(v) {
    if (v == null) return '#94a3b8';
    if (v >= 4.5) return '#16a34a';
    if (v >= 3.5) return '#2563eb';
    if (v >= 2.5) return '#7c3aed';
    if (v >= 1.5) return '#d97706';
    return '#dc2626';
  }

  return (
    <Layout>
      {/* shimmer keyframes */}
      <style>{`@keyframes rpt-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div className="page-header">
        <div>
          <Link to="/reports" className="back-link">← Reports</Link>
          <h2 className="page-title">Performance Report</h2>
          <p className="page-subtitle">
            Rating distribution, review types, department averages, and recommendations.
          </p>
        </div>
      </div>

      <DateFilterBar
        dateFrom={dateFrom} dateTo={dateTo}
        setDateFrom={setDateFrom} setDateTo={setDateTo}
        active={preset} setActive={setPreset}
        loading={loading} onRefresh={load}
      />

      {/* ── Error banner ── */}
      {error && (
        <div className="alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button
            onClick={load}
            style={{ marginLeft: 12, fontWeight: 700, fontSize: 12, background: 'none',
              border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', color: '#b91c1c' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && !data && (
        <div>
          <div className="rpt-kpi-row" style={{ marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rpt-kpi-card" style={{ gap: 8 }}>
                <Skeleton w="60%" h={11} />
                <Skeleton w="40%" h={28} />
              </div>
            ))}
          </div>
          <div className="rpt-2col">
            {[1, 2].map((i) => (
              <div key={i} className="rpt-section">
                <Skeleton w="45%" h={14} r={4} />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[80, 65, 55, 40, 30].map((w, j) => <Skeleton key={j} w={`${w}%`} h={10} />)}
                </div>
              </div>
            ))}
          </div>
          <div className="rpt-2col">
            {[1, 2].map((i) => (
              <div key={i} className="rpt-section">
                <Skeleton w="45%" h={14} r={4} />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[70, 55, 40].map((w, j) => <Skeleton key={j} w={`${w}%`} h={10} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content — only shown when data is available ── */}
      {data && !loading && (
        <>
          <ExportBar onCSV={doCSV} onExcel={doExcel} onPDF={doPDF} />

          {/* KPI row */}
          <div className="rpt-kpi-row">
            <KpiCard label="Total Reviews"
              value={total.toLocaleString()}
              color="blue" />
            <KpiCard label="Avg Rating"
              value={avgRatingNum != null ? `${avgRatingNum} / 5` : '—'}
              color="purple"
              sub={avgRatingNum != null ? 'weighted across all reviews' : 'no rated reviews yet'} />
            <KpiCard label="Outstanding"
              value={(data.kpis?.outstanding ?? 0).toLocaleString()}
              color="green"
              sub={total > 0 ? `${Math.round(((data.kpis?.outstanding ?? 0) / total) * 100)}% of reviews` : undefined} />
            <KpiCard label="Closed"
              value={(data.kpis?.closed ?? 0).toLocaleString()}
              color="sky" />
            <KpiCard label="Draft"
              value={(data.kpis?.draft ?? 0).toLocaleString()}
              color="amber" />
          </div>

          {/* Row 1: rating distribution + status donut */}
          <div className="rpt-2col">
            <div className="rpt-section">
              <p className="rpt-section-title">Rating Distribution</p>
              <RatingDistBar data={ratingDist} total={total} />
            </div>

            <div className="rpt-section">
              <p className="rpt-section-title">Review Status</p>
              {statusData.length > 0
                ? <DonutChart data={statusData} total={total} label="Reviews" />
                : <div className="rpt-empty" style={{ minHeight: 80 }}>No status data</div>}
            </div>
          </div>

          {/* Row 2: review types + recommendations */}
          <div className="rpt-2col">
            <div className="rpt-section">
              <p className="rpt-section-title">By Review Type</p>
              {reviewTypeData.length > 0
                ? <HBarChart data={reviewTypeData} color="#7c3aed" />
                : <div className="rpt-empty" style={{ minHeight: 80 }}>No review type data</div>}
            </div>

            <div className="rpt-section">
              <p className="rpt-section-title">Recommendations</p>
              {recData.length > 0
                ? <HBarChart data={recData} color="#16a34a" />
                : <div className="rpt-empty" style={{ minHeight: 80 }}>No recommendation data</div>}
            </div>
          </div>

          {/* Department avg ratings table */}
          {byDept.length > 0 ? (
            <div className="rpt-section">
              <p className="rpt-section-title">Average Rating by Department</p>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th className="text-right">Reviews</th>
                      <th className="text-right">Avg Rating</th>
                      <th>Rating Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDept.map((r, i) => {
                      const val   = r.value ?? 0;
                      const color = ratingColor(val > 0 ? val : null);
                      const barPct = Math.round((val / 5) * 100);
                      return (
                        <tr key={i}>
                          <td>{r.label ?? '—'}</td>
                          <td className="text-right">{r.count ?? 0}</td>
                          <td className="text-right" style={{ fontWeight: 600, color }}>
                            {val > 0 ? val.toFixed(1) : '—'}
                          </td>
                          <td>
                            <PctBar pct={barPct} color={color} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rpt-section">
              <p className="rpt-section-title">Average Rating by Department</p>
              <div className="rpt-empty">
                No department data available. Add performance reviews with department fields to see this chart.
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state — data loaded but zero reviews */}
      {!loading && !error && data && total === 0 && (
        <div className="rpt-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
            No performance reviews found
          </p>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {dateFrom || dateTo
              ? 'No reviews match the selected date range. Try adjusting the filter.'
              : 'Create your first performance review to see analytics here.'}
          </p>
        </div>
      )}
    </Layout>
  );
}
