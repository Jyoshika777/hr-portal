import { useState, useEffect, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getAnalyticsOverview, fmtINR } from '../../services/reportService';
import '../../styles/Reports.css';

// ── Inline SVG icon set ───────────────────────────────────────────────────────
function Icon({ name, size = 20, color }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color || 'currentColor', strokeWidth: '1.8',
    strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'users':      return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'briefcase':  return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
    case 'trending':   return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case 'star':       return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'file':       return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
    case 'dollar':     return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'arrow':      return <svg {...p} strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    case 'chart':      return <svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><path d="M2 20h20"/></svg>;
    case 'target':     return <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'activity':   return <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case 'check':      return <svg {...p} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
    case 'pipeline':   return <svg {...p}><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="3" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/></svg>;
    case 'refresh':    return <svg {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
    default: return null;
  }
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function Skeleton({ w, h, r = 8, style }) {
  return <div className="an-skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ── SVG Area / Line Chart ─────────────────────────────────────────────────────
function AreaChart({ data = [], color = '#4F46E5', gradId }) {
  const id = useId();
  const gid = gradId || id;
  if (!data.length) return <div className="an-chart-empty">No data</div>;

  const W = 560, H = 130, PL = 8, PR = 8, PT = 8, PB = 22;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const max = Math.max(...data.map((d) => d.value), 1);
  const pts = data.map((d, i) => [
    PL + (data.length === 1 ? cW / 2 : (i / (data.length - 1)) * cW),
    PT + cH - (d.value / max) * cH,
  ]);

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = linePath +
    ` L${pts[pts.length - 1][0].toFixed(1)},${(PT + cH).toFixed(1)}` +
    ` L${pts[0][0].toFixed(1)},${(PT + cH).toFixed(1)} Z`;

  const nonZeroCount = data.filter((d) => d.value > 0).length;
  const showLabels = data.length <= 12;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
      {nonZeroCount <= 8 && pts.map((p, i) => (
        data[i].value > 0 && (
          <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={color} stroke="#fff" strokeWidth="2" />
        )
      ))}
      {showLabels && data.map((d, i) => (
        <text key={i} x={pts[i][0]} y={H - 3} textAnchor="middle"
          fontSize="9" fontFamily="inherit" fill="#94A3B8">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ segments = [], size = 140, label, sublabel }) {
  const R = 46, CX = size / 2, CY = size / 2;
  const circ = 2 * Math.PI * R;
  const total = segments.reduce((s, g) => s + (g.value || 0), 0);
  let offset = 0;
  const GAP = total > 0 ? circ * 0.008 : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {total === 0 ? (
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F1F5F9" strokeWidth="18" />
      ) : (
        segments.filter((g) => g.value > 0).map((seg, i) => {
          const dash = (seg.value / total) * circ - GAP;
          const el = (
            <circle key={i} cx={CX} cy={CY} r={R}
              fill="none" stroke={seg.color} strokeWidth="18"
              strokeDasharray={`${Math.max(0, dash)} ${circ}`}
              strokeDashoffset={-offset + circ * 0.25}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          );
          offset += (seg.value / total) * circ;
          return el;
        })
      )}
      <circle cx={CX} cy={CY} r={R - 10} fill="white" />
      {label && (
        <>
          <text x={CX} y={CY - 5} textAnchor="middle" fontSize="18" fontWeight="800"
            fontFamily="inherit" fill="#0F172A">{label}</text>
          {sublabel && (
            <text x={CX} y={CY + 13} textAnchor="middle" fontSize="10"
              fontFamily="inherit" fill="#94A3B8">{sublabel}</text>
          )}
        </>
      )}
    </svg>
  );
}

// ── Ring gauge (single %) ─────────────────────────────────────────────────────
function RingGauge({ pct = 0, color = '#4F46E5', size = 120, thickness = 12 }) {
  const R = (size / 2) - thickness;
  const CX = size / 2, CY = size / 2;
  const circ = 2 * Math.PI * R;
  const dash = (Math.min(pct, 100) / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F1F5F9" strokeWidth={thickness} />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={thickness}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color = '#4F46E5', suffix = '' }) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div className="an-hbar-row">
      <span className="an-hbar-label">{label}</span>
      <div className="an-hbar-track">
        <div className="an-hbar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="an-hbar-val">{value}{suffix}</span>
    </div>
  );
}

// ── Funnel ────────────────────────────────────────────────────────────────────
function Funnel({ stages = [] }) {
  const maxCount = stages[0]?.count || 1;
  const COLORS = ['#6366F1','#8B5CF6','#EC4899','#F97316','#10B981','#14B8A6'];
  return (
    <div className="an-funnel">
      {stages.map((s, i) => {
        const pct = Math.max(6, Math.round((s.count / maxCount) * 100));
        const convPct = i === 0 ? 100 : Math.round((s.count / maxCount) * 100);
        const color = COLORS[i % COLORS.length];
        return (
          <div key={s.key} className="an-funnel-stage">
            <div className="an-funnel-meta">
              <span className="an-funnel-label">{s.label}</span>
              <span className="an-funnel-conv" style={{ color }}>{convPct}%</span>
            </div>
            <div className="an-funnel-track">
              <div className="an-funnel-bar"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}>
                <span className="an-funnel-count">{s.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, iconBg, iconColor, href, loading, trend, trendUp }) {
  const navigate = useNavigate();
  return (
    <div className="an-kpi" onClick={() => href && navigate(href)}
      style={{ cursor: href ? 'pointer' : 'default' }}>
      <div className="an-kpi-top">
        <div className="an-kpi-icon" style={{ background: iconBg }}>
          <Icon name={icon} size={20} color={iconColor} />
        </div>
        {trend != null && (
          <span className={`an-trend ${trendUp ? 'an-trend--up' : 'an-trend--down'}`}>
            {trendUp ? '↑' : '↓'} {trend}%
          </span>
        )}
      </div>
      {loading
        ? <Skeleton w={72} h={38} style={{ marginTop: 12 }} />
        : <p className="an-kpi-value">{value ?? '—'}</p>}
      <p className="an-kpi-label">{label}</p>
      {loading
        ? <Skeleton w="60%" h={12} style={{ marginTop: 6 }} />
        : sub && <p className="an-kpi-sub">{sub}</p>}
    </div>
  );
}

// ── Report nav card ───────────────────────────────────────────────────────────
function NavCard({ name, desc, icon, iconBg, iconColor, to, count, loading }) {
  return (
    <Link to={to} className="an-nav-card">
      <div className="an-nav-icon" style={{ background: iconBg }}>
        <Icon name={icon} size={22} color={iconColor} />
      </div>
      <div className="an-nav-body">
        <p className="an-nav-name">{name}</p>
        <p className="an-nav-desc">{desc}</p>
      </div>
      <div className="an-nav-right">
        {loading
          ? <Skeleton w={36} h={20} r={6} />
          : <span className="an-nav-count">{(count ?? 0).toLocaleString()}</span>}
        <span className="an-nav-arrow"><Icon name="arrow" size={14} color="#CBD5E1" /></span>
      </div>
    </Link>
  );
}

// ── Legend row ────────────────────────────────────────────────────────────────
function LegendRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="an-legend-row">
      <span className="an-legend-dot" style={{ background: color }} />
      <span className="an-legend-label">{label}</span>
      <span className="an-legend-val">{value}</span>
      <span className="an-legend-pct">{pct}%</span>
    </div>
  );
}

// ── Insight chip ──────────────────────────────────────────────────────────────
function Insight({ icon, text, sub, color = '#4F46E5', bg = '#EEF2FF' }) {
  return (
    <div className="an-insight">
      <div className="an-insight-icon" style={{ background: bg, color }}>{icon}</div>
      <div className="an-insight-text">
        <p className="an-insight-main">{text}</p>
        {sub && <p className="an-insight-sub">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReportsOverview() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    getAnalyticsOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [refresh]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const h  = data?.hiring;
  const e  = data?.employees;
  const o  = data?.offers;
  const p  = data?.payroll;
  const pf = data?.performance;
  const cn = data?.counts ?? {};

  const acceptRate  = o?.kpis?.acceptanceRate  ?? 0;
  const offerTotal  = o?.kpis?.total           ?? 0;
  const avgRating   = pf?.kpis?.avgRating;
  const totalEmp    = e?.kpis?.total           ?? 0;
  const activeEmp   = e?.kpis?.active          ?? 0;
  const joinRate    = h?.kpis?.joinRate        ?? 0;
  const payTotal    = p?.kpis?.totalNet        ?? 0;
  const payRecs     = p?.kpis?.total           ?? 0;

  const empStatusSegs = [
    { label: 'Active',     value: e?.kpis?.active      ?? 0, color: '#10B981' },
    { label: 'Probation',  value: e?.kpis?.probation   ?? 0, color: '#3B82F6' },
    { label: 'On Leave',   value: e?.kpis?.onLeave     ?? 0, color: '#F59E0B' },
    { label: 'Terminated', value: e?.kpis?.terminated  ?? 0, color: '#EF4444' },
  ];

  const offerSegs = [
    { label: 'Accepted', value: o?.kpis?.accepted ?? 0, color: '#10B981' },
    { label: 'Rejected', value: o?.kpis?.rejected ?? 0, color: '#EF4444' },
    { label: 'Sent',     value: o?.kpis?.sent     ?? 0, color: '#6366F1' },
    { label: 'Draft',    value: (o?.byStatus?.draft ?? 0), color: '#CBD5E1' },
  ];

  const ratingSegs = (pf?.ratingDist ?? []).map((r) => ({
    label: r.label, value: r.count, color: r.color,
  }));

  const deptRows  = (e?.byDept  ?? []).slice(0, 6);
  const deptMax   = deptRows[0]?.value ?? 1;
  const roleRows  = (h?.byJobRole ?? []).slice(0, 6);
  const roleMax   = roleRows[0]?.value ?? 1;

  const hiringTrend = h?.byMonth ?? [];

  // Build quick insights
  const insights = [];
  if (!loading && data) {
    if (acceptRate >= 70) insights.push({ icon: '🎯', text: `${acceptRate}% offer acceptance rate`, sub: 'Above target — great employer brand', color: '#059669', bg: '#ECFDF5' });
    else if (acceptRate > 0) insights.push({ icon: '📋', text: `${acceptRate}% offer acceptance rate`, sub: 'Consider improving offer packages', color: '#D97706', bg: '#FFFBEB' });
    if (joinRate >= 50) insights.push({ icon: '✅', text: `${joinRate}% candidates joined`, sub: 'Strong pipeline-to-hire conversion', color: '#4338CA', bg: '#EEF2FF' });
    if ((e?.kpis?.probation ?? 0) > 0) insights.push({ icon: '⏳', text: `${e.kpis.probation} employees on probation`, sub: 'Review completion timelines', color: '#D97706', bg: '#FFFBEB' });
    if (avgRating) insights.push({ icon: '⭐', text: `Avg performance rating: ${avgRating}/5`, sub: `Based on ${pf?.kpis?.total ?? 0} reviews`, color: '#7C3AED', bg: '#F5F3FF' });
    if ((p?.kpis?.pending ?? 0) > 0) insights.push({ icon: '💰', text: `${p.kpis.pending} payrolls pending`, sub: 'Action required before month-end', color: '#DC2626', bg: '#FEF2F2' });
    if (insights.length === 0) insights.push({ icon: '📊', text: 'Analytics ready', sub: 'All modules reporting data', color: '#4338CA', bg: '#EEF2FF' });
  }

  return (
    <Layout>
      <div className="an-page">

        {/* ── Header ── */}
        <div className="an-header">
          <div className="an-header-left">
            <h1 className="an-title">Analytics &amp; Reports</h1>
            <p className="an-subtitle">Real-time insights across your entire HR operation</p>
          </div>
          <div className="an-header-right">
            <button className="an-refresh-btn" onClick={() => setRefresh((n) => n + 1)} disabled={loading}>
              <span className={loading ? 'an-spin' : ''}><Icon name="refresh" size={13} /></span>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="an-kpi-row">
          <KpiCard label="Total Candidates" value={(cn.candidates ?? 0).toLocaleString()}
            sub={h?.kpis ? `${h.kpis.joined} joined · ${h.kpis.joinRate}% conversion` : ''}
            icon="trending" iconBg="#EEF2FF" iconColor="#4338CA"
            href="/reports/hiring" loading={loading} />
          <KpiCard label="Active Employees" value={(activeEmp).toLocaleString()}
            sub={e?.kpis ? `${totalEmp} total · ${e.kpis.probation ?? 0} on probation` : ''}
            icon="users" iconBg="#F0FDF4" iconColor="#16A34A"
            href="/reports/employees" loading={loading} />
          <KpiCard label="Offer Acceptance" value={acceptRate > 0 ? `${acceptRate}%` : '—'}
            sub={o?.kpis ? `${o.kpis.accepted} accepted of ${o.kpis.total} total` : ''}
            icon="target" iconBg="#FDF4FF" iconColor="#9333EA"
            href="/reports/offers" loading={loading}
            trend={acceptRate > 0 ? acceptRate : null} trendUp={acceptRate >= 60} />
          <KpiCard label="Total Payroll" value={payTotal > 0 ? fmtINR(payTotal) : (payRecs > 0 ? `${payRecs} records` : '—')}
            sub={p?.kpis ? `${p.kpis.paid} paid · ${p.kpis.pending ?? 0} pending` : ''}
            icon="dollar" iconBg="#FFFBEB" iconColor="#D97706"
            href="/reports/payroll" loading={loading} />
          <KpiCard label="Avg Performance" value={avgRating ? `${avgRating}/5` : '—'}
            sub={pf?.kpis ? `${pf.kpis.total} reviews · ${pf.kpis.outstanding ?? 0} outstanding` : ''}
            icon="star" iconBg="#FFF1F2" iconColor="#E11D48"
            href="/reports/performance" loading={loading} />
        </div>

        {/* ── Main grid ── */}
        <div className="an-main-grid">

          {/* ══ Left column (wide) ══ */}
          <div className="an-left-col">

            {/* Recruitment Funnel */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-icon" style={{ background: '#EEF2FF' }}>
                  <Icon name="pipeline" size={17} color="#4338CA" />
                </div>
                <div>
                  <h3 className="an-card-title">Recruitment Pipeline Funnel</h3>
                  <p className="an-card-sub">Candidate conversion across all hiring stages</p>
                </div>
                <Link to="/reports/hiring" className="an-card-link">Full report →</Link>
              </div>
              {loading
                ? <div className="an-funnel-skel">{[100,78,58,42,28,18].map((w,i)=><Skeleton key={i} w={`${w}%`} h={36} style={{marginBottom:8}}/>)}</div>
                : (h?.funnel?.length
                  ? <Funnel stages={h.funnel} />
                  : <div className="an-chart-empty">No candidate data yet</div>)}
            </div>

            {/* Hiring trend */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-icon" style={{ background: '#EEF2FF' }}>
                  <Icon name="activity" size={17} color="#4338CA" />
                </div>
                <div>
                  <h3 className="an-card-title">12-Month Hiring Trend</h3>
                  <p className="an-card-sub">New candidates applied per month</p>
                </div>
                <Link to="/reports/hiring" className="an-card-link">Details →</Link>
              </div>
              {loading
                ? <Skeleton w="100%" h={130} />
                : <AreaChart data={hiringTrend} color="#6366F1" gradId="hiringGrad" />}
            </div>

            {/* Two-col: employee donut + job roles */}
            <div className="an-two-col">
              {/* Employee status donut */}
              <div className="an-card">
                <div className="an-card-header">
                  <div className="an-card-icon" style={{ background: '#F0FDF4' }}>
                    <Icon name="users" size={17} color="#16A34A" />
                  </div>
                  <div>
                    <h3 className="an-card-title">Employee Distribution</h3>
                    <p className="an-card-sub">Status breakdown</p>
                  </div>
                </div>
                {loading ? (
                  <div className="an-donut-wrap"><Skeleton w={140} h={140} r="50%" /></div>
                ) : (
                  <div className="an-donut-layout">
                    <DonutChart segments={empStatusSegs} size={140}
                      label={totalEmp.toString()} sublabel="Employees" />
                    <div className="an-legend">
                      {empStatusSegs.map((s) => (
                        <LegendRow key={s.label} {...s} total={totalEmp} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top job roles */}
              <div className="an-card">
                <div className="an-card-header">
                  <div className="an-card-icon" style={{ background: '#FFFBEB' }}>
                    <Icon name="briefcase" size={17} color="#D97706" />
                  </div>
                  <div>
                    <h3 className="an-card-title">Top Job Roles</h3>
                    <p className="an-card-sub">Most applied positions</p>
                  </div>
                </div>
                {loading
                  ? <div>{[80,65,55,40,30].map((w,i)=><Skeleton key={i} w={`${w}%`} h={12} style={{marginBottom:14}}/>)}</div>
                  : roleRows.length
                    ? <div className="an-hbar-list">
                        {roleRows.map((r) => (
                          <HBar key={r.label} label={r.label} value={r.value} max={roleMax} color="#F59E0B" />
                        ))}
                      </div>
                    : <div className="an-chart-empty">No data</div>}
              </div>
            </div>

            {/* Two-col: payroll month chart + offer status */}
            <div className="an-two-col">
              {/* Payroll trend */}
              <div className="an-card">
                <div className="an-card-header">
                  <div className="an-card-icon" style={{ background: '#FFFBEB' }}>
                    <Icon name="dollar" size={17} color="#D97706" />
                  </div>
                  <div>
                    <h3 className="an-card-title">Payroll Activity</h3>
                    <p className="an-card-sub">Records processed per month ({new Date().getFullYear()})</p>
                  </div>
                </div>
                {loading ? <Skeleton w="100%" h={130} /> : (
                  <AreaChart
                    data={(p?.byMonth ?? []).map((m) => ({ label: m.label, value: m.count }))}
                    color="#F59E0B" gradId="payrollGrad"
                  />
                )}
              </div>

              {/* Offer donut */}
              <div className="an-card">
                <div className="an-card-header">
                  <div className="an-card-icon" style={{ background: '#FDF4FF' }}>
                    <Icon name="file" size={17} color="#9333EA" />
                  </div>
                  <div>
                    <h3 className="an-card-title">Offer Status</h3>
                    <p className="an-card-sub">{offerTotal} total offer letters</p>
                  </div>
                </div>
                {loading ? (
                  <div className="an-donut-wrap"><Skeleton w={140} h={140} r="50%" /></div>
                ) : (
                  <div className="an-donut-layout">
                    <DonutChart segments={offerSegs} size={140}
                      label={offerTotal.toString()} sublabel="Offers" />
                    <div className="an-legend">
                      {offerSegs.map((s) => (
                        <LegendRow key={s.label} {...s} total={offerTotal} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Department headcount + performance */}
            <div className="an-two-col">
              <div className="an-card">
                <div className="an-card-header">
                  <div className="an-card-icon" style={{ background: '#F0FDF4' }}>
                    <Icon name="chart" size={17} color="#16A34A" />
                  </div>
                  <div>
                    <h3 className="an-card-title">Department Headcount</h3>
                    <p className="an-card-sub">Active employees by department</p>
                  </div>
                  <Link to="/reports/employees" className="an-card-link">More →</Link>
                </div>
                {loading
                  ? <div>{[85,70,55,40,25].map((w,i)=><Skeleton key={i} w={`${w}%`} h={12} style={{marginBottom:14}}/>)}</div>
                  : deptRows.length
                    ? <div className="an-hbar-list">
                        {deptRows.map((r) => (
                          <HBar key={r.label} label={r.label} value={r.value} max={deptMax} color="#10B981" />
                        ))}
                      </div>
                    : <div className="an-chart-empty">No employee data</div>}
              </div>

              <div className="an-card">
                <div className="an-card-header">
                  <div className="an-card-icon" style={{ background: '#FFF1F2' }}>
                    <Icon name="star" size={17} color="#E11D48" />
                  </div>
                  <div>
                    <h3 className="an-card-title">Performance Ratings</h3>
                    <p className="an-card-sub">Distribution across {pf?.kpis?.total ?? '—'} reviews</p>
                  </div>
                </div>
                {loading
                  ? <div>{[85,70,55,40,25].map((w,i)=><Skeleton key={i} w={`${w}%`} h={12} style={{marginBottom:14}}/>)}</div>
                  : ratingSegs.length
                    ? <div className="an-hbar-list">
                        {ratingSegs.map((r) => (
                          <HBar key={r.label} label={r.label} value={r.value}
                            max={Math.max(...ratingSegs.map((x) => x.value), 1)} color={r.color} />
                        ))}
                      </div>
                    : <div className="an-chart-empty">No review data yet</div>}
              </div>
            </div>

          </div>

          {/* ══ Right sidebar ══ */}
          <div className="an-right-col">

            {/* Offer acceptance gauge */}
            <div className="an-card an-gauge-card">
              <h3 className="an-card-title" style={{ marginBottom: 4 }}>Offer Acceptance Rate</h3>
              <p className="an-card-sub">vs. sent + responded offers</p>
              <div className="an-gauge-wrap">
                {loading
                  ? <Skeleton w={130} h={130} r="50%" />
                  : <RingGauge pct={acceptRate} color={acceptRate >= 70 ? '#10B981' : acceptRate >= 50 ? '#F59E0B' : '#EF4444'} size={130} />}
                <div className="an-gauge-label">
                  {loading
                    ? <Skeleton w={48} h={32} />
                    : <><span className="an-gauge-pct">{acceptRate}%</span>
                       <span className="an-gauge-sub">acceptance</span></>}
                </div>
              </div>
              {!loading && o?.kpis && (
                <div className="an-gauge-stats">
                  <div className="an-gauge-stat"><span style={{ color: '#10B981', fontWeight: 700 }}>{o.kpis.accepted}</span><span>Accepted</span></div>
                  <div className="an-gauge-stat"><span style={{ color: '#EF4444', fontWeight: 700 }}>{o.kpis.rejected}</span><span>Rejected</span></div>
                  <div className="an-gauge-stat"><span style={{ color: '#6366F1', fontWeight: 700 }}>{o.kpis.sent}</span><span>Awaiting</span></div>
                </div>
              )}
            </div>

            {/* Quick insights */}
            <div className="an-card">
              <h3 className="an-card-title" style={{ marginBottom: 16 }}>Quick Insights</h3>
              {loading
                ? <div className="an-insights-list">{[1,2,3].map((i)=>(
                    <div key={i} className="an-insight-skel">
                      <Skeleton w={36} h={36} r={10} />
                      <div><Skeleton w={140} h={12} /><Skeleton w={100} h={10} style={{marginTop:5}}/></div>
                    </div>))}</div>
                : <div className="an-insights-list">
                    {insights.slice(0, 5).map((ins, i) => <Insight key={i} {...ins} />)}
                  </div>}
            </div>

            {/* Report nav links */}
            <div className="an-card">
              <h3 className="an-card-title" style={{ marginBottom: 12 }}>Detailed Reports</h3>
              <p className="an-card-sub" style={{ marginBottom: 14 }}>Drill into module-level analytics</p>
              <div className="an-nav-list">
                <NavCard name="Hiring Report" desc="Pipeline & funnel analysis"
                  icon="trending" iconBg="#EEF2FF" iconColor="#4338CA"
                  to="/reports/hiring" count={cn.candidates} loading={loading} />
                <NavCard name="Employee Report" desc="Headcount & growth"
                  icon="users" iconBg="#F0FDF4" iconColor="#16A34A"
                  to="/reports/employees" count={cn.employees} loading={loading} />
                <NavCard name="Payroll Report" desc="Salary distribution"
                  icon="dollar" iconBg="#FFFBEB" iconColor="#D97706"
                  to="/reports/payroll" count={cn.payroll} loading={loading} />
                <NavCard name="Performance Report" desc="Ratings & reviews"
                  icon="star" iconBg="#FFF1F2" iconColor="#E11D48"
                  to="/reports/performance" count={cn.performance} loading={loading} />
                <NavCard name="Offer Report" desc="Acceptance & trends"
                  icon="file" iconBg="#FDF4FF" iconColor="#9333EA"
                  to="/reports/offers" count={cn.offers} loading={loading} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
