// Shared chart primitives and filter bar for report pages

// ── Date preset helper ────────────────────────────────────────────────────────
export function applyPreset(preset, setDateFrom, setDateTo) {
  const fmt = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  if (preset === 'All') { setDateFrom(''); setDateTo(''); return; }
  const d = new Date(today);
  if      (preset === '30D') d.setDate(d.getDate() - 30);
  else if (preset === '90D') d.setDate(d.getDate() - 90);
  else if (preset === '6M')  d.setMonth(d.getMonth() - 6);
  else if (preset === '1Y')  d.setFullYear(d.getFullYear() - 1);
  setDateFrom(fmt(d));
  setDateTo(fmt(today));
}

const PRESETS = ['30D','90D','6M','1Y','All'];

// ── Date Filter Bar ───────────────────────────────────────────────────────────
export function DateFilterBar({ dateFrom, dateTo, setDateFrom, setDateTo, active, setActive, loading, onRefresh }) {
  function pick(p) {
    setActive(p);
    applyPreset(p, setDateFrom, setDateTo);
  }
  return (
    <div className="rpt-filter-bar">
      <label>From</label>
      <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setActive(''); }} />
      <label>To</label>
      <input type="date" value={dateTo}   onChange={(e) => { setDateTo(e.target.value);   setActive(''); }} />
      <div className="rpt-quick-btns">
        {PRESETS.map((p) => (
          <button key={p} className={`rpt-quick-btn${active === p ? ' rpt-quick-btn--active' : ''}`} onClick={() => pick(p)}>
            {p}
          </button>
        ))}
      </div>
      <button className="btn-secondary" disabled={loading} onClick={onRefresh}
        style={{ marginLeft:8, padding:'6px 14px', fontSize:13 }}>
        {loading ? 'Loading…' : 'Apply'}
      </button>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, color = 'blue' }) {
  return (
    <div className={`rpt-kpi-card rpt-kpi-card--${color}`}>
      <span className="rpt-kpi-label">{label}</span>
      <span className="rpt-kpi-value">{value ?? '—'}</span>
      {sub && <span className="rpt-kpi-sub">{sub}</span>}
    </div>
  );
}

// ── Vertical Bar Chart ────────────────────────────────────────────────────────
export function VBarChart({ data, color = '#2563eb', maxH = 150 }) {
  const max = Math.max(...(data || []).map((d) => d.value), 1);
  if (!data?.length) return <div className="rpt-empty">No data</div>;
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:maxH+28, paddingBottom:20, overflowX:'auto' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, minWidth:32, flex:1 }}>
          <span className="rpt-vbar-val">{d.value || ''}</span>
          <div
            className="rpt-vbar"
            style={{
              height: `${Math.max(3, Math.round((d.value / max) * maxH))}px`,
              background: d.color || color,
              width:'100%',
            }}
          />
          <span className="rpt-vbar-label" title={d.label}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Horizontal Bar Chart ──────────────────────────────────────────────────────
export function HBarChart({ data, color = '#2563eb' }) {
  const max = Math.max(...(data || []).map((d) => d.value), 1);
  if (!data?.length) return <div className="rpt-empty">No data</div>;
  return (
    <div className="rpt-hbar-list">
      {data.map((d, i) => (
        <div key={i} className="rpt-hbar-row">
          <span className="rpt-hbar-label" title={d.label}>{d.label}</span>
          <div className="rpt-hbar-track">
            <div
              className="rpt-hbar-fill"
              style={{ width:`${Math.round((d.value / max) * 100)}%`, background: d.color || color }}
            />
          </div>
          <span className="rpt-hbar-count">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── SVG Donut Chart ───────────────────────────────────────────────────────────
export function DonutChart({ data, total, label = 'Total' }) {
  const R   = 52;
  const CX  = 68;
  const CY  = 68;
  const SW  = 14;
  const circumference = 2 * Math.PI * R;
  let offset = 0;

  const segments = (data || []).filter((d) => d.value > 0).map((d) => {
    const pct  = total ? d.value / total : 0;
    const dash = circumference * pct;
    const seg  = { ...d, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <div className="rpt-donut-wrap">
      <svg width={CX * 2} height={CY * 2} style={{ overflow:'visible' }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={SW} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={SW}
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={-(seg.offset)}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        ))}
        <text x={CX} y={CY - 6} style={{ fontSize:20, fontWeight:700, fill:'#0f172a', textAnchor:'middle', dominantBaseline:'auto' }}>
          {total ?? 0}
        </text>
        <text x={CX} y={CY + 12} style={{ fontSize:11, fill:'#64748b', textAnchor:'middle', dominantBaseline:'auto' }}>
          {label}
        </text>
      </svg>
      <div className="rpt-donut-legend" style={{ maxWidth:200 }}>
        {(data || []).map((d, i) => (
          <div key={i} className="rpt-donut-legend-row">
            <span className="rpt-donut-legend-dot" style={{ background: d.color }} />
            <span className="rpt-donut-legend-label">{d.label}</span>
            <span className="rpt-donut-legend-val">{d.value}</span>
            <span className="rpt-donut-legend-pct">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Export Toolbar ────────────────────────────────────────────────────────────
export function ExportBar({ onCSV, onExcel, onPDF }) {
  return (
    <div className="rpt-export-bar">
      <button className="rpt-export-btn rpt-export-btn--csv"   onClick={onCSV}>   ↓ CSV</button>
      <button className="rpt-export-btn rpt-export-btn--excel" onClick={onExcel}> ↓ Excel</button>
      <button className="rpt-export-btn rpt-export-btn--pdf"   onClick={onPDF}>   ↓ PDF</button>
    </div>
  );
}

// ── Pct bar (inline table cell usage) ────────────────────────────────────────
export function PctBar({ pct, color = '#2563eb' }) {
  return (
    <div className="rpt-table-pct-bar">
      <div className="rpt-table-pct-track">
        <div className="rpt-table-pct-fill" style={{ width:`${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize:11, color:'#64748b', minWidth:28 }}>{pct}%</span>
    </div>
  );
}
