import { useState, useEffect, useCallback, useId } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getHiringReport } from '../../services/reportService';
import { exportCSV, exportExcel, exportPDF } from '../../utils/exportUtils';
import '../../styles/Reports.css';
import '../../styles/HiringReport.css';

// ── colour palette per status ─────────────────────────────────────────────────
const STATUS_COLOR = {
  applied:    '#6366F1',
  screening:  '#8B5CF6',
  interview:  '#F59E0B',
  selected:   '#10B981',
  offer_sent: '#14B8A6',
  joined:     '#16A34A',
  rejected:   '#EF4444',
  on_hold:    '#94A3B8',
};

const FUNNEL_STAGES = [
  { key: 'applied',    label: 'Applied'    },
  { key: 'screening',  label: 'Screening'  },
  { key: 'interview',  label: 'Interview'  },
  { key: 'selected',   label: 'Selected'   },
  { key: 'offer_sent', label: 'Offer Sent' },
  { key: 'joined',     label: 'Joined'     },
];

const PRESETS = ['30D', '90D', '6M', '1Y', 'All'];

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(d) { return d.toISOString().slice(0, 10); }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
function cap(s) { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

// ── SVG icon set ─────────────────────────────────────────────────────────────
function Icon({ name, size = 18, color }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color || 'currentColor', strokeWidth: '1.8',
    strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'users':    return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'trending': return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case 'check':    return <svg {...p} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
    case 'x':        return <svg {...p} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    case 'refresh':  return <svg {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
    case 'activity': return <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case 'filter':   return <svg {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
    case 'download': return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
    case 'back':     return <svg {...p} strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
    default: return null;
  }
}

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
function Skel({ w, h, r = 8, style }) {
  return <span className="hr-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, iconBg, iconColor, iconName, loading }) {
  return (
    <div className="hr-kpi">
      <div className="hr-kpi-icon" style={{ background: iconBg }}>
        <Icon name={iconName} size={18} color={iconColor} />
      </div>
      {loading
        ? <><Skel w={56} h={32} style={{ margin: '12px 0 4px' }} /><Skel w={80} h={12} /></>
        : <>
            <p className="hr-kpi-value">{value ?? '—'}</p>
            <p className="hr-kpi-label">{label}</p>
            {sub && <p className="hr-kpi-sub">{sub}</p>}
          </>}
    </div>
  );
}

// ── SVG Area / Line Chart ─────────────────────────────────────────────────────
function AreaChart({ data = [], color = '#6366F1' }) {
  const uid = useId();
  const gid = uid.replace(/:/g, '');
  if (!data.length) return <div className="hr-chart-empty">No monthly data available</div>;

  const W = 700, H = 160, PL = 10, PR = 10, PT = 12, PB = 26;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const max = Math.max(...data.map((d) => d.value), 1);

  const pts = data.map((d, i) => [
    PL + (data.length === 1 ? cW / 2 : (i / (data.length - 1)) * cW),
    PT + cH - (d.value / max) * cH,
  ]);

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${(PT + cH).toFixed(1)} L${pts[0][0].toFixed(1)},${(PT + cH).toFixed(1)} Z`;

  const nonZero = data.filter((d) => d.value > 0).length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ width: '100%', height: H, display: 'block' }}>
      <defs>
        <linearGradient id={`ag-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PL} x2={W - PR} y1={PT + cH * f} y2={PT + cH * f}
          stroke="#F1F5F9" strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#ag-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" />
      {nonZero <= 10 && pts.map((p, i) => data[i].value > 0 && (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="5" fill={color} stroke="#fff" strokeWidth="2" />
          {data[i].value > 0 && (
            <text x={p[0]} y={p[1] - 9} textAnchor="middle" fontSize="9.5"
              fontFamily="inherit" fontWeight="700" fill={color}>{data[i].value}</text>
          )}
        </g>
      ))}
      {data.map((d, i) => (
        <text key={i} x={pts[i][0]} y={H - 4} textAnchor="middle"
          fontSize="9" fontFamily="inherit" fill="#94A3B8">{d.label}</text>
      ))}
    </svg>
  );
}

// ── Visual Funnel (SVG trapezoids) ────────────────────────────────────────────
function VisualFunnel({ stages, loading }) {
  if (loading) {
    return (
      <div className="hr-funnel-wrap">
        {[100, 82, 64, 48, 34, 22].map((w, i) => (
          <Skel key={i} w={`${w}%`} h={48} style={{ margin: '0 auto 6px', display: 'block' }} />
        ))}
      </div>
    );
  }
  const filled = stages.filter((s) => s.count > 0);
  if (!filled.length) return <div className="hr-chart-empty">No pipeline data yet. Add candidates to see the funnel.</div>;

  const firstCount = stages[0]?.count || 1;

  return (
    <div className="hr-funnel-wrap">
      {stages.map((stage, i) => {
        const convRate = pct(stage.count, firstCount);
        const dropRate = i > 0 ? pct(stage.count, stages[i - 1].count) : 100;
        const barW = Math.max(22, convRate);
        const isLast = i === stages.length - 1;

        return (
          <div key={stage.key} className="hr-funnel-item">
            {/* Trapezoid bar */}
            <div className="hr-funnel-bar-row">
              <div
                className="hr-funnel-bar"
                style={{
                  width: `${barW}%`,
                  background: `linear-gradient(135deg, ${stage.color}dd, ${stage.color})`,
                  boxShadow: `0 2px 12px ${stage.color}30`,
                }}
              >
                <span className="hr-funnel-bar-label">{stage.label}</span>
                <span className="hr-funnel-bar-count">{stage.count}</span>
                <span className="hr-funnel-bar-pct">{convRate}%</span>
              </div>
            </div>
            {/* Conversion arrow between stages */}
            {!isLast && (
              <div className="hr-funnel-arrow">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1 L7 10 M4 7 L7 11 L10 7" stroke={
                    dropRate >= 70 ? '#10B981' : dropRate >= 40 ? '#F59E0B' : '#EF4444'
                  } strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hr-funnel-drop" style={{
                  color: dropRate >= 70 ? '#10B981' : dropRate >= 40 ? '#F59E0B' : '#EF4444',
                }}>
                  {dropRate}% converted
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ data = [], total = 0, label = '' }) {
  const R = 52, CX = 68, CY = 68, SW = 14;
  const circ = 2 * Math.PI * R;
  let off = 0;
  const segs = data.filter((d) => d.value > 0).map((d) => {
    const dash = circ * (d.value / total);
    const s = { ...d, dash, off };
    off += dash;
    return s;
  });

  if (!data.length) return <div className="hr-chart-empty">No status data</div>;

  return (
    <div className="hr-donut-layout">
      <svg width={CX * 2} height={CY * 2} viewBox={`0 0 ${CX * 2} ${CY * 2}`}
        style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F1F5F9" strokeWidth={SW} />
        {segs.map((s, i) => (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none"
            stroke={s.color} strokeWidth={SW}
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.off}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        ))}
        <text x={CX} y={CY - 5} textAnchor="middle" fontSize="20"
          fontWeight="800" fill="#0F172A" fontFamily="inherit">{total}</text>
        <text x={CX} y={CY + 13} textAnchor="middle" fontSize="11"
          fill="#94A3B8" fontFamily="inherit">{label}</text>
      </svg>
      <div className="hr-donut-legend">
        {data.map((d, i) => (
          <div key={i} className="hr-donut-row">
            <span className="hr-donut-dot" style={{ background: d.color }} />
            <span className="hr-donut-name">{cap(d.label)}</span>
            <span className="hr-donut-val">{d.value}</span>
            <span className="hr-donut-pct">{total ? pct(d.value, total) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────
function HBars({ data = [], color = '#6366F1', loading }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[90, 70, 55, 40, 30].map((w, i) => <Skel key={i} w={`${w}%`} h={12} />)}
    </div>
  );
  if (!data.length) return <div className="hr-chart-empty">No role data yet</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.slice(0, 10).map((d, i) => (
        <div key={i} className="hr-hbar-row">
          <span className="hr-hbar-label" title={d.label}>{d.label || '—'}</span>
          <div className="hr-hbar-track">
            <div className="hr-hbar-fill"
              style={{ width: `${Math.max(3, Math.round((d.value / max) * 100))}%`, background: color }} />
          </div>
          <span className="hr-hbar-val">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Ring gauge ────────────────────────────────────────────────────────────────
function RingGauge({ pct: p = 0, color = '#10B981', size = 110 }) {
  const R = size / 2 - 10;
  const circ = 2 * Math.PI * R;
  const dash = (Math.min(p, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="#F1F5F9" strokeWidth="10" />
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
}

// ── Date Filter Bar ───────────────────────────────────────────────────────────
function FilterBar({ dateFrom, dateTo, setDateFrom, setDateTo, preset, setPreset, loading, onApply }) {
  function pick(p) {
    setPreset(p);
    const today = new Date();
    if (p === 'All') { setDateFrom(''); setDateTo(''); return; }
    const d = new Date(today);
    if      (p === '30D') d.setDate(d.getDate() - 30);
    else if (p === '90D') d.setDate(d.getDate() - 90);
    else if (p === '6M')  d.setMonth(d.getMonth() - 6);
    else if (p === '1Y')  d.setFullYear(d.getFullYear() - 1);
    setDateFrom(fmt(d));
    setDateTo(fmt(today));
  }
  return (
    <div className="hr-filter-bar">
      <div className="hr-filter-icon"><Icon name="filter" size={14} color="#6366F1" /></div>
      <div className="hr-presets">
        {PRESETS.map((p) => (
          <button key={p} className={`hr-preset${preset === p ? ' hr-preset--on' : ''}`}
            onClick={() => pick(p)}>{p}</button>
        ))}
      </div>
      <div className="hr-filter-sep" />
      <label className="hr-filter-label">From</label>
      <input type="date" className="hr-date-input" value={dateFrom}
        onChange={(e) => { setDateFrom(e.target.value); setPreset(''); }} />
      <label className="hr-filter-label">To</label>
      <input type="date" className="hr-date-input" value={dateTo}
        onChange={(e) => { setDateTo(e.target.value); setPreset(''); }} />
      <button className="hr-apply-btn" onClick={onApply} disabled={loading}>
        <span className={loading ? 'hr-spin' : ''}><Icon name="refresh" size={13} /></span>
        {loading ? 'Loading…' : 'Apply'}
      </button>
    </div>
  );
}

// ── Export bar ────────────────────────────────────────────────────────────────
function ExportBar({ onCSV, onExcel, onPDF }) {
  return (
    <div className="hr-export-bar">
      <Icon name="download" size={13} color="#64748B" />
      <button className="hr-export-btn hr-export-btn--csv"   onClick={onCSV}>CSV</button>
      <button className="hr-export-btn hr-export-btn--excel" onClick={onExcel}>Excel</button>
      <button className="hr-export-btn hr-export-btn--pdf"   onClick={onPDF}>PDF</button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HiringReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [preset,   setPreset]   = useState('All');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getHiringReport({ dateFrom, dateTo })
      .then((r) => {
        if (!r.ok) throw new Error(r.error || 'Failed to load report');
        setData(r);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ─────────────────────────────────────────────────────────
  const joinRate     = data?.kpis?.joinRate     ?? 0;
  const total        = data?.kpis?.total        ?? 0;
  const joined       = data?.kpis?.joined       ?? 0;
  const rejected     = data?.kpis?.rejected     ?? 0;
  const active       = data?.kpis?.active       ?? 0;

  const funnelStages = FUNNEL_STAGES.map((s) => ({
    ...s,
    count: data?.byStatus?.[s.key] ?? 0,
    color: STATUS_COLOR[s.key],
  }));

  const donutData = data
    ? Object.entries(data.byStatus || {})
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => ({ label: k, value: v, color: STATUS_COLOR[k] || '#94A3B8' }))
    : [];

  // ── Exports ───────────────────────────────────────────────────────────────
  function rows() {
    return (data?.tableRows || []).map((r) => [cap(r.status), r.count, `${r.pct}%`]);
  }
  const doCSV   = () => exportCSV('hiring_report',   ['Status', 'Count', 'Percentage'], rows());
  const doExcel = () => exportExcel('hiring_report', ['Status', 'Count', 'Percentage'], rows(), 'Hiring');
  const doPDF   = () => exportPDF('hiring_report', 'Hiring Report', ['Status', 'Count', 'Percentage'], rows(), [120, 60, 60]);

  return (
    <Layout>
      <div className="hr-page">

        {/* ── Page header ── */}
        <div className="hr-page-header">
          <div className="hr-breadcrumb">
            <Link to="/reports" className="hr-back-link">
              <Icon name="back" size={14} /> Reports
            </Link>
            <span className="hr-breadcrumb-sep">/</span>
            <span className="hr-breadcrumb-current">Hiring Report</span>
          </div>
          <div className="hr-title-row">
            <div>
              <h1 className="hr-title">Hiring Report</h1>
              <p className="hr-subtitle">Candidate pipeline, funnel conversion, and monthly trends</p>
            </div>
            {data && !loading && <ExportBar onCSV={doCSV} onExcel={doExcel} onPDF={doPDF} />}
          </div>
        </div>

        {/* ── Filter bar ── */}
        <FilterBar
          dateFrom={dateFrom} dateTo={dateTo}
          setDateFrom={setDateFrom} setDateTo={setDateTo}
          preset={preset} setPreset={setPreset}
          loading={loading} onApply={load}
        />

        {/* ── Error ── */}
        {error && (
          <div className="hr-error">
            <Icon name="x" size={16} color="#DC2626" />
            <span>{error}</span>
            <button className="hr-error-retry" onClick={load}>Retry</button>
          </div>
        )}

        {/* ── KPI cards ── */}
        <div className="hr-kpi-row">
          <KpiCard label="Total Candidates" value={total.toLocaleString()}
            sub="All time in selected range" loading={loading}
            iconName="users" iconBg="#EEF2FF" iconColor="#4338CA" />
          <KpiCard label="Active Pipeline" value={active.toLocaleString()}
            sub="Currently in process" loading={loading}
            iconName="activity" iconBg="#FFF7ED" iconColor="#D97706" />
          <KpiCard label="Successfully Joined" value={joined.toLocaleString()}
            sub={`${joinRate}% conversion rate`} loading={loading}
            iconName="check" iconBg="#F0FDF4" iconColor="#16A34A" />
          <KpiCard label="Rejected / Dropped" value={rejected.toLocaleString()}
            sub={total > 0 ? `${pct(rejected, total)}% rejection rate` : '—'} loading={loading}
            iconName="x" iconBg="#FFF1F2" iconColor="#E11D48" />
        </div>

        {/* ── Join rate + Monthly trend ── */}
        <div className="hr-row-trend">

          {/* Join rate gauge */}
          <div className="hr-card hr-gauge-card">
            <p className="hr-card-title">Join Rate</p>
            <p className="hr-card-sub">Applied → Joined conversion</p>
            <div className="hr-gauge-wrap">
              {loading
                ? <Skel w={110} h={110} r="50%" />
                : <RingGauge pct={joinRate}
                    color={joinRate >= 40 ? '#10B981' : joinRate >= 20 ? '#F59E0B' : '#EF4444'} />}
              <div className="hr-gauge-center">
                {loading
                  ? <Skel w={44} h={28} />
                  : <><span className="hr-gauge-pct">{joinRate}%</span>
                     <span className="hr-gauge-sub">joined</span></>}
              </div>
            </div>
            {!loading && data && (
              <div className="hr-gauge-meta">
                <div className="hr-gauge-stat">
                  <span style={{ color: '#10B981', fontWeight: 800 }}>{joined}</span>
                  <span>Joined</span>
                </div>
                <div className="hr-gauge-stat">
                  <span style={{ color: '#EF4444', fontWeight: 800 }}>{rejected}</span>
                  <span>Rejected</span>
                </div>
                <div className="hr-gauge-stat">
                  <span style={{ color: '#F59E0B', fontWeight: 800 }}>{active}</span>
                  <span>Active</span>
                </div>
              </div>
            )}
          </div>

          {/* Monthly trend */}
          <div className="hr-card hr-trend-card">
            <div className="hr-card-header-row">
              <div>
                <p className="hr-card-title">Monthly Applications</p>
                <p className="hr-card-sub">New candidates in the last 12 months</p>
              </div>
              <div className="hr-card-badge" style={{ background: '#EEF2FF', color: '#4338CA' }}>
                <Icon name="trending" size={12} color="#4338CA" />
                Last 12 months
              </div>
            </div>
            {loading
              ? <Skel w="100%" h={160} style={{ marginTop: 8 }} />
              : <AreaChart data={data?.byMonth ?? []} color="#6366F1" />}
          </div>
        </div>

        {/* ── Pipeline Funnel ── */}
        <div className="hr-card">
          <div className="hr-card-header-row">
            <div>
              <p className="hr-card-title">Recruitment Pipeline Funnel</p>
              <p className="hr-card-sub">Candidate flow across all hiring stages — wider = more candidates</p>
            </div>
            {!loading && data && (
              <div className="hr-card-badge" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                <Icon name="check" size={12} color="#16A34A" />
                {pct(joined, total)}% join rate
              </div>
            )}
          </div>

          <VisualFunnel stages={funnelStages} loading={loading} />

          {/* Stage summary pills */}
          {!loading && (
            <div className="hr-funnel-pills">
              {funnelStages.map((s) => (
                <div key={s.key} className="hr-funnel-pill" style={{ borderColor: s.color + '44', background: s.color + '0F' }}>
                  <span className="hr-funnel-pill-dot" style={{ background: s.color }} />
                  <span className="hr-funnel-pill-label">{s.label}</span>
                  <span className="hr-funnel-pill-count" style={{ color: s.color }}>{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Job roles + Status donut ── */}
        <div className="hr-row-2col">

          <div className="hr-card">
            <div className="hr-card-header-row" style={{ marginBottom: 16 }}>
              <div>
                <p className="hr-card-title">Top Job Roles</p>
                <p className="hr-card-sub">Most common positions applied for</p>
              </div>
            </div>
            <HBars data={data?.byJobRole ?? []} color="#8B5CF6" loading={loading} />
          </div>

          <div className="hr-card">
            <div className="hr-card-header-row" style={{ marginBottom: 16 }}>
              <div>
                <p className="hr-card-title">Status Breakdown</p>
                <p className="hr-card-sub">Distribution across {total.toLocaleString()} candidates</p>
              </div>
            </div>
            {loading
              ? <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <Skel w={136} h={136} r="50%" />
                  <div style={{ flex: 1 }}>
                    {[1, 2, 3, 4].map((i) => <Skel key={i} w="100%" h={14} style={{ marginBottom: 10 }} />)}
                  </div>
                </div>
              : <DonutChart data={donutData} total={total} label="candidates" />}
          </div>
        </div>

        {/* ── Status table ── */}
        <div className="hr-card">
          <div className="hr-card-header-row" style={{ marginBottom: 14 }}>
            <div>
              <p className="hr-card-title">Status Summary Table</p>
              <p className="hr-card-sub">Detailed count and share per status</p>
            </div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => <Skel key={i} w="100%" h={40} r={6} />)}
            </div>
          ) : (
            <div className="hr-table-wrap">
              <table className="hr-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="hr-th-right">Count</th>
                    <th>Share</th>
                    <th className="hr-th-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.tableRows || []).length === 0 ? (
                    <tr><td colSpan={4} className="hr-td-empty">No data</td></tr>
                  ) : (data?.tableRows || []).map((r, i) => (
                    <tr key={i}>
                      <td>
                        <span className="hr-status-dot"
                          style={{ background: STATUS_COLOR[r.status] || '#94A3B8' }} />
                        {cap(r.status)}
                      </td>
                      <td className="hr-td-right hr-td-bold">{r.count}</td>
                      <td className="hr-td-bar">
                        <div className="hr-pct-track">
                          <div className="hr-pct-fill"
                            style={{ width: `${r.pct}%`, background: STATUS_COLOR[r.status] || '#94A3B8' }} />
                        </div>
                      </td>
                      <td className="hr-td-right hr-td-muted">{r.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
