import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { getCandidateStats, getRecentCandidates } from '../services/candidateService';
import { getEmployeeStats, getEmployeeDeptStats } from '../services/employeeService';
import { getOfferStats, getRecentOffers } from '../services/offerLetterService';
import { getPayrollStats } from '../services/payrollService';
import { getPerformanceStats } from '../services/performanceService';
import { getUserProfile } from '../services/settingsService';
import '../styles/Dashboard.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

const GREETINGS = [
  { prefix: 'Welcome back,',                suffix: '!', fallback: 'Welcome back!'                      },
  { prefix: 'Hello,',                       suffix: '!', fallback: 'Hello there!'                       },
  { prefix: 'Glad to see you,',             suffix: '!', fallback: 'Glad to see you!'                   },
  { prefix: 'Good to have you here,',       suffix: '!', fallback: 'Good to have you here!'             },
  { prefix: 'Ready to make progress today,',suffix: '?', fallback: 'Ready to make progress today?'      },
  { prefix: 'Welcome,',                     suffix: '!', fallback: 'Welcome!'                           },
];

function getDailyGreeting() {
  const day = Math.floor(Date.now() / 86_400_000);
  return GREETINGS[day % GREETINGS.length];
}

function today() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
function Icon({ name, size = 20, color }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color || 'currentColor',
    strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'users':      return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'briefcase':  return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
    case 'file-text':  return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case 'star':       return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'trending':   return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case 'check':      return <svg {...p} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
    case 'clock':      return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'arrow-right':return <svg {...p} strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    case 'refresh':    return <svg {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
    case 'plus':       return <svg {...p} strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case 'bar-chart':  return <svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><path d="M2 20h20"/></svg>;
    case 'dollar':     return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'candidate':  return <svg {...p}><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>;
    case 'pipeline':   return <svg {...p}><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="3" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/></svg>;
    case 'offer':      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>;
    case 'payroll':    return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
    default: return null;
  }
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor, icon, iconBg, iconColor, href, loading, refreshing }) {
  const navigate = useNavigate();
  return (
    <div
      className={`db-kpi${refreshing ? ' db-kpi--refreshing' : ''}`}
      onClick={() => navigate(href)}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(href)}
    >
      <div className="db-kpi-top">
        <div>
          <p className="db-kpi-label">{label}</p>
          {loading
            ? <div className="db-skeleton" style={{ width: 64, height: 40, marginTop: 4 }} />
            : <p className="db-kpi-value">{value ?? '—'}</p>}
        </div>
        <div className="db-kpi-icon" style={{ background: iconBg }}>
          <Icon name={icon} size={22} color={iconColor} />
        </div>
      </div>
      {!loading && sub && (
        <p className="db-kpi-sub" style={subColor ? { color: subColor } : {}}>{sub}</p>
      )}
      {loading && <div className="db-skeleton" style={{ width: '60%', height: 14, marginTop: 10 }} />}
    </div>
  );
}

// ── Activity row ──────────────────────────────────────────────────────────────
const STATUS_PILL = {
  applied:   { label: 'Applied',    bg: '#EEF2FF', color: '#4338CA' },
  screening: { label: 'Screening',  bg: '#F5F3FF', color: '#6D28D9' },
  interview: { label: 'Interview',  bg: '#FFFBEB', color: '#B45309' },
  selected:  { label: 'Selected',   bg: '#ECFDF5', color: '#065F46' },
  offer_sent:{ label: 'Offer Sent', bg: '#F0FDFA', color: '#0F766E' },
  joined:    { label: 'Joined',     bg: '#DCFCE7', color: '#166534' },
  rejected:  { label: 'Rejected',   bg: '#FEF2F2', color: '#B91C1C' },
  draft:     { label: 'Draft',      bg: '#F1F5F9', color: '#64748B' },
  sent:      { label: 'Sent',       bg: '#EEF2FF', color: '#4338CA' },
  accepted:  { label: 'Accepted',   bg: '#DCFCE7', color: '#166534' },
  expired:   { label: 'Expired',    bg: '#FFFBEB', color: '#B45309' },
};

function StatusPill({ status }) {
  const s = STATUS_PILL[status] ?? { label: status, bg: '#F1F5F9', color: '#64748B' };
  return (
    <span className="db-pill" style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

function ActivityItem({ icon, iconBg, iconColor, title, sub, status, time, href }) {
  return (
    <Link to={href} className="db-activity-item">
      <div className="db-activity-icon" style={{ background: iconBg }}>
        <Icon name={icon} size={15} color={iconColor} />
      </div>
      <div className="db-activity-body">
        <p className="db-activity-title">{title}</p>
        <p className="db-activity-sub">{sub}</p>
      </div>
      <div className="db-activity-right">
        <StatusPill status={status} />
        <span className="db-activity-time">{time}</span>
      </div>
    </Link>
  );
}

// ── Quick action button ───────────────────────────────────────────────────────
function QuickAction({ label, desc, icon, iconBg, iconColor, to }) {
  return (
    <Link to={to} className="db-qa">
      <div className="db-qa-icon" style={{ background: iconBg }}>
        <Icon name={icon} size={18} color={iconColor} />
      </div>
      <div className="db-qa-text">
        <span className="db-qa-label">{label}</span>
        <span className="db-qa-desc">{desc}</span>
      </div>
      <span className="db-qa-arrow"><Icon name="arrow-right" size={14} color="#94A3B8" /></span>
    </Link>
  );
}

// ── Department bar ────────────────────────────────────────────────────────────
function DeptBar({ dept, count, max }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div className="db-dept-row">
      <span className="db-dept-name">{dept}</span>
      <div className="db-dept-track">
        <div className="db-dept-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="db-dept-count">{count}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  // ── Profile / greeting ────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');

  // ── Dashboard data ────────────────────────────────────────────
  const [candStats,   setCandStats]   = useState(null);
  const [empStats,    setEmpStats]    = useState(null);
  const [offerStats,  setOfferStats]  = useState(null);
  const [payStats,    setPayStats]    = useState(null);
  const [perfStats,   setPerfStats]   = useState(null);
  const [deptStats,   setDeptStats]   = useState([]);
  const [recentCands, setRecentCands] = useState([]);
  const [recentOffs,  setRecentOffs]  = useState([]);

  // ── Load state ────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastAt,     setLastAt]     = useState(null);
  const [refreshErr, setRefreshErr] = useState('');
  const [refreshOk,  setRefreshOk]  = useState(false);

  // Prevents two concurrent refresh calls (manual + interval race)
  const isFetchingRef = useRef(false);
  const okTimerRef    = useRef(null);

  // ── Core data-fetch ───────────────────────────────────────────
  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh && isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isRefresh) {
      setRefreshing(true);
      setRefreshErr('');
      setRefreshOk(false);
      clearTimeout(okTimerRef.current);
    } else {
      setLoading(true);
    }

    const results = await Promise.allSettled([
      getCandidateStats(),
      getEmployeeStats(),
      getOfferStats(),
      getPayrollStats(),
      getPerformanceStats(),
      getEmployeeDeptStats(),
      getRecentCandidates(6),
      getRecentOffers(4),
    ]);

    const [cand, emp, offer, pay, perf, dept, rCand, rOff] = results;

    if (cand.status  === 'fulfilled') setCandStats(cand.value);
    if (emp.status   === 'fulfilled') setEmpStats(emp.value);
    if (offer.status === 'fulfilled') setOfferStats(offer.value);
    if (pay.status   === 'fulfilled') setPayStats(pay.value);
    if (perf.status  === 'fulfilled') setPerfStats(perf.value);
    if (dept.status  === 'fulfilled') setDeptStats(dept.value);
    if (rCand.status === 'fulfilled') setRecentCands(rCand.value);
    if (rOff.status  === 'fulfilled') setRecentOffs(rOff.value);

    const failCount = results.filter((r) => r.status === 'rejected').length;

    setLastAt(new Date());
    setLoading(false);
    setRefreshing(false);
    isFetchingRef.current = false;

    if (isRefresh) {
      if (failCount === results.length) {
        setRefreshErr('Could not reach the data source. Check your connection and try again.');
      } else if (failCount > 0) {
        setRefreshErr(`${failCount} of ${results.length} data sources failed. Some figures may be outdated.`);
      } else {
        setRefreshOk(true);
        okTimerRef.current = setTimeout(() => setRefreshOk(false), 3000);
      }
    }
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(() => loadAll(true), 90_000);
    return () => {
      clearInterval(t);
      clearTimeout(okTimerRef.current);
    };
  }, [loadAll]);

  // ── Profile name ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    getUserProfile(userId)
      .then((p) => setDisplayName(p?.display_name || ''))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    function onProfileUpdate(e) {
      const name = e.detail?.display_name;
      if (name !== undefined) setDisplayName(name || '');
    }
    window.addEventListener('profile-updated', onProfileUpdate);
    return () => window.removeEventListener('profile-updated', onProfileUpdate);
  }, []);

  // ── Derived values ────────────────────────────────────────────
  const offerByStatus  = offerStats?.byStatus ?? {};
  const payByStatus    = payStats?.byStatus   ?? {};
  const perfByStatus   = perfStats?.byStatus  ?? {};
  const pendingOffers  = offerByStatus.sent   ?? 0;
  const pendingReviews = (perfByStatus.draft  ?? 0) + (perfByStatus.submitted ?? 0);
  const pendingPayroll = (payByStatus.pending ?? 0) + (payByStatus.on_hold    ?? 0);

  const activity = [
    ...recentCands.map((c) => ({
      key: `c-${c.id}`, icon: 'candidate', iconBg: '#EEF2FF', iconColor: '#4338CA',
      title: c.full_name, sub: c.job_role || 'Candidate',
      status: c.status, time: timeAgo(c.created_at), ts: c.created_at,
      href: `/candidates/${c.id}`,
    })),
    ...recentOffs.map((o) => ({
      key: `o-${o.id}`, icon: 'offer', iconBg: '#F5F3FF', iconColor: '#7C3AED',
      title: o.candidate_name, sub: o.job_role || o.offer_number,
      status: o.status, time: timeAgo(o.created_at || o.offer_date),
      ts: o.created_at || o.offer_date, href: `/offers/${o.id}`,
    })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 8);

  const deptMax     = deptStats[0]?.count ?? 1;
  const lastUpdated = lastAt
    ? lastAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;
  const { prefix, suffix, fallback } = getDailyGreeting();

  return (
    <Layout>
      <div className="db-wrap">

        {/* ── Header ── */}
        <div className="db-header">
          <div className="db-header-left">
            <h1 className="db-greeting">
              {displayName
                ? <>{prefix} <span className="db-name">{displayName}</span>{suffix}</>
                : fallback}
            </h1>
            <p className="db-date">{today()}</p>
          </div>

          <button
            className={`db-refresh-btn${refreshing ? ' db-refresh-btn--active' : ''}`}
            onClick={() => loadAll(true)}
            disabled={loading}
            title="Refresh all dashboard data"
            aria-busy={refreshing}
          >
            <span className={refreshing ? 'db-spin' : ''} aria-hidden="true">
              <Icon name="refresh" size={14} />
            </span>
            {refreshing ? 'Refreshing…' : lastUpdated ? `Updated ${lastUpdated}` : 'Refresh'}
          </button>
        </div>

        {/* ── Refresh status banners ── */}
        {refreshErr && (
          <div className="db-status-bar db-status-bar--error" role="alert">
            <span>⚠ {refreshErr}</span>
            <button className="db-status-bar-close" onClick={() => setRefreshErr('')} aria-label="Dismiss">✕</button>
          </div>
        )}
        {refreshOk && (
          <div className="db-status-bar db-status-bar--success" role="status">
            <span>✓ Dashboard updated successfully</span>
          </div>
        )}

        {/* ── KPI Row ── */}
        <div className={`db-kpi-row${refreshing ? ' db-kpi-row--refreshing' : ''}`}>
          <KpiCard
            label="Active Employees"
            value={empStats?.active}
            sub={empStats ? `${empStats.total} total · ${empStats.probation ?? 0} on probation` : ''}
            icon="users" iconBg="#EEF2FF" iconColor="#4338CA"
            href="/employees" loading={loading} refreshing={refreshing}
          />
          <KpiCard
            label="Candidates in Pipeline"
            value={candStats?.active}
            sub={candStats ? `${candStats.total} total · ${candStats.interview ?? 0} in interview` : ''}
            icon="pipeline" iconBg="#F0FDF4" iconColor="#16A34A"
            href="/candidates" loading={loading} refreshing={refreshing}
          />
          <KpiCard
            label="Offers Awaiting Response"
            value={pendingOffers}
            sub={offerByStatus.accepted != null ? `${offerByStatus.accepted} accepted · ${offerByStatus.rejected ?? 0} rejected` : ''}
            subColor={pendingOffers > 0 ? '#D97706' : undefined}
            icon="offer" iconBg="#FDF4FF" iconColor="#9333EA"
            href="/offers" loading={loading} refreshing={refreshing}
          />
          <KpiCard
            label="Reviews Pending"
            value={pendingReviews}
            sub={perfStats ? `Avg rating: ${perfStats.avgRating ?? '—'} / 5.0` : ''}
            subColor={pendingReviews > 0 ? '#DC2626' : undefined}
            icon="star" iconBg="#FFFBEB" iconColor="#D97706"
            href="/performance" loading={loading} refreshing={refreshing}
          />
        </div>

        {/* ── Secondary stats strip ── */}
        <div className={`db-strip${refreshing ? ' db-strip--refreshing' : ''}`}>
          <div className="db-strip-item">
            <Icon name="briefcase" size={15} color="#64748B" />
            <span className="db-strip-label">Payroll pending</span>
            <span className="db-strip-value">{loading ? '—' : pendingPayroll}</span>
          </div>
          <div className="db-strip-sep" />
          <div className="db-strip-item">
            <Icon name="file-text" size={15} color="#64748B" />
            <span className="db-strip-label">Offers this month</span>
            <span className="db-strip-value">{loading ? '—' : (offerByStatus.total ?? 0)}</span>
          </div>
          <div className="db-strip-sep" />
          <div className="db-strip-item">
            <Icon name="trending" size={15} color="#64748B" />
            <span className="db-strip-label">Candidates applied</span>
            <span className="db-strip-value">{loading ? '—' : (candStats?.total ?? 0)}</span>
          </div>
          <div className="db-strip-sep" />
          <div className="db-strip-item">
            <Icon name="check" size={15} color="#64748B" />
            <span className="db-strip-label">Offer acceptance rate</span>
            <span className="db-strip-value">
              {loading || !offerByStatus.total ? '—'
                : `${Math.round(((offerByStatus.accepted ?? 0) / offerByStatus.total) * 100)}%`}
            </span>
          </div>
        </div>

        {/* ── Main two-column ── */}
        <div className="db-main">

          {/* Left: Recent Activity */}
          <div className={`db-card db-activity-card${refreshing ? ' db-card--refreshing' : ''}`}>
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Recent Activity</h2>
                <p className="db-card-sub">Latest candidates and offer letters</p>
              </div>
              <Link to="/candidates" className="db-card-link">View all →</Link>
            </div>

            {loading ? (
              <div className="db-activity-list">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="db-activity-skeleton">
                    <div className="db-skeleton db-skeleton--circle" />
                    <div className="db-skeleton-lines">
                      <div className="db-skeleton" style={{ width: '55%', height: 13 }} />
                      <div className="db-skeleton" style={{ width: '35%', height: 11, marginTop: 5 }} />
                    </div>
                    <div className="db-skeleton" style={{ width: 58, height: 22, borderRadius: 99 }} />
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="db-empty">
                <Icon name="clock" size={32} color="#CBD5E1" />
                <p>No recent activity yet.</p>
                <Link to="/candidates/add" className="btn-primary" style={{ marginTop: 12 }}>Add first candidate</Link>
              </div>
            ) : (
              <div className="db-activity-list">
                {activity.map((item) => <ActivityItem key={item.key} {...item} />)}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="db-right-col">

            {/* Quick Actions */}
            <div className="db-card">
              <div className="db-card-header">
                <h2 className="db-card-title">Quick Actions</h2>
              </div>
              <div className="db-qa-list">
                <QuickAction label="Add Candidate"    desc="Register a new applicant"      icon="candidate" iconBg="#EEF2FF" iconColor="#4338CA" to="/candidates/add" />
                <QuickAction label="Add Employee"     desc="Onboard a team member"          icon="users"     iconBg="#F0FDF4" iconColor="#16A34A" to="/employees/add" />
                <QuickAction label="New Offer Letter" desc="Generate and send an offer"     icon="offer"     iconBg="#F5F3FF" iconColor="#7C3AED" to="/offers/new" />
                <QuickAction label="Pipeline Board"   desc="Kanban view of all stages"      icon="pipeline"  iconBg="#F0FDFA" iconColor="#0D9488" to="/pipeline" />
                <QuickAction label="New Payroll"      desc="Process employee salary"        icon="payroll"   iconBg="#FFFBEB" iconColor="#D97706" to="/payroll/new" />
                <QuickAction label="Add Review"       desc="Create a performance review"    icon="star"      iconBg="#FFF1F2" iconColor="#E11D48" to="/performance/new" />
              </div>
            </div>

            {/* Department headcount */}
            {(deptStats.length > 0 || loading) && (
              <div className={`db-card${refreshing ? ' db-card--refreshing' : ''}`}>
                <div className="db-card-header">
                  <div>
                    <h2 className="db-card-title">Department Headcount</h2>
                    <p className="db-card-sub">Active employees by department</p>
                  </div>
                  <Link to="/employees" className="db-card-link">All →</Link>
                </div>

                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
                    {[70, 55, 40, 30].map((w, i) => (
                      <div key={i} className="db-skeleton" style={{ width: `${w}%`, height: 12 }} />
                    ))}
                  </div>
                ) : (
                  <div className="db-dept-list">
                    {deptStats.slice(0, 6).map(({ dept, count }) => (
                      <DeptBar key={dept} dept={dept} count={count} max={deptMax} />
                    ))}
                    {deptStats.length > 6 && (
                      <Link to="/employees" className="db-dept-more">
                        +{deptStats.length - 6} more departments →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </Layout>
  );
}
