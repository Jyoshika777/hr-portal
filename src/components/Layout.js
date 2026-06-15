import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { globalSearch, getRecentSearches, addRecentSearch, clearRecentSearches } from '../services/searchService';
import { fetchNotifications, markAsRead, markAllRead } from '../services/notificationService';
import { getAppSettings } from '../services/settingsService';
import '../styles/Layout.css';

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
function Icon({ name, size = 20 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: '1.75', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'dashboard':   return <svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
    case 'candidates':  return <svg {...p}><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>;
    case 'pipeline':    return <svg {...p}><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="3" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/></svg>;
    case 'employees':   return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'offers':      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>;
    case 'payroll':     return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/></svg>;
    case 'performance': return <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case 'documents':   return <svg {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
    case 'reports':      return <svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><path d="M2 20h20"/></svg>;
    case 'certificates': return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8M8 13h5"/><circle cx="16" cy="16" r="3"/><path d="M14.5 18.5 16 17l1.5 1.5"/></svg>;
    case 'settings':    return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'chevronLeft': return <svg {...p} strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>;
    case 'chevronRight':return <svg {...p} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>;
    case 'chevronDown': return <svg {...p} strokeWidth="2.2"><polyline points="6 9 12 15 18 9"/></svg>;
    case 'menu':        return <svg {...p} strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
    case 'signOut':     return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    case 'user':        return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'search':      return <svg {...p} strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
    case 'bell':        return <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case 'zap':         return <svg {...p} strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case 'plus':        return <svg {...p} strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case 'x':           return <svg {...p} strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    case 'clock':       return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'check':       return <svg {...p} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
    case 'externalLink':return <svg {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
    default: return null;
  }
}

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',    icon: 'dashboard'   },
  { to: '/candidates',  label: 'Candidates',   icon: 'candidates'  },
  { to: '/pipeline',    label: 'Pipeline',     icon: 'pipeline'    },
  { to: '/employees',   label: 'Employees',    icon: 'employees'   },
  { to: '/offers',      label: 'Offer Letters',icon: 'offers'      },
  { type: 'divider', label: 'Management' },
  { to: '/payroll',     label: 'Payroll',      icon: 'payroll'     },
  { to: '/performance', label: 'Performance',  icon: 'performance' },
  { to: '/documents',   label: 'Documents',    icon: 'documents'   },
  { type: 'divider', label: 'Insights' },
  { to: '/reports',       label: 'Reports',      icon: 'reports'       },
  { to: '/certificates',  label: 'Certificates', icon: 'certificates'  },
  { to: '/settings',      label: 'Settings',     icon: 'settings'      },
];

const PAGE_LABELS = {
  dashboard: 'Dashboard', candidates: 'Candidates', pipeline: 'Pipeline Board',
  employees: 'Employees', offers: 'Offer Letters', payroll: 'Payroll',
  performance: 'Performance Reviews', documents: 'Document Management',
  reports: 'Analytics & Reports', certificates: 'Certificates', settings: 'Settings',
};

const QUICK_ACTIONS = [
  { label: 'Add Candidate',    href: '/candidates/add', icon: 'candidates', color: '#4F46E5' },
  { label: 'Add Employee',     href: '/employees/add',  icon: 'employees',  color: '#059669' },
  { label: 'New Offer Letter', href: '/offers/new',     icon: 'offers',     color: '#D97706' },
  { label: 'Create Payroll',   href: '/payroll/new',    icon: 'payroll',    color: '#0284C7' },
  { label: 'Upload Document',  href: '/documents/upload', icon: 'documents',color: '#7C3AED' },
  { label: 'Add Review',       href: '/performance/new',icon: 'performance',color: '#DB2777' },
  { label: 'View Reports',     href: '/reports',        icon: 'reports',    color: '#64748B' },
];

function getPageTitle(pathname) {
  return PAGE_LABELS[pathname.split('/')[1]] || 'HR Portal';
}

function getInitials(email) {
  if (!email) return 'HR';
  const name = email.split('@')[0];
  const parts = name.split(/[._\-+]/);
  if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Global Search Component ───────────────────────────────────────────────────
function GlobalSearch() {
  const navigate = useNavigate();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [recents,  setRecents]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState(-1);   // keyboard nav index
  const inputRef   = useRef(null);
  const wrapRef    = useRef(null);
  const debounceRef= useRef(null);

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await globalSearch(query);
      setResults(res);
      setLoading(false);
    }, 320);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleFocus = () => {
    setOpen(true);
    setRecents(getRecentSearches());
    setFocused(-1);
  };

  const allItems = query.trim() ? results : [];

  const navigate_ = (href) => {
    if (query.trim()) addRecentSearch(query.trim());
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(href);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused((f) => Math.min(f + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused((f) => Math.max(f - 1, -1)); }
    if (e.key === 'Enter' && focused >= 0 && allItems[focused]) {
      navigate_(allItems[focused].href);
    }
  };

  const showRecents = open && !query.trim() && recents.length > 0;
  const showResults = open && query.trim().length >= 2;
  const showEmpty   = open && query.trim().length >= 2 && !loading && results.length === 0;

  return (
    <div className="gs-wrap" ref={wrapRef}>
      <label className={`gs-bar${open ? ' gs-bar--open' : ''}`}>
        <span className="gs-icon"><Icon name="search" size={15} /></span>
        <input
          ref={inputRef}
          className="gs-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setFocused(-1); }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search employees, candidates, documents…"
          autoComplete="off"
          spellCheck={false}
          aria-label="Global search"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {loading
          ? <span className="gs-spinner" aria-hidden="true" />
          : query
            ? <button className="gs-clear" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }} aria-label="Clear search"><Icon name="x" size={13} /></button>
            : <kbd className="gs-kbd">⌘K</kbd>}
      </label>

      {open && (showRecents || showResults || showEmpty) && (
        <div className="gs-dropdown" role="listbox" aria-label="Search results">
          {/* Recent searches */}
          {showRecents && (
            <div className="gs-section">
              <div className="gs-section-hd">
                <span>Recent</span>
                <button className="gs-clear-recent" onClick={() => { clearRecentSearches(); setRecents([]); }}>Clear</button>
              </div>
              {recents.map((term) => (
                <button key={term} className="gs-recent-item"
                  onClick={() => { setQuery(term); }}>
                  <Icon name="clock" size={13} />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {showResults && results.length > 0 && (
            <div className="gs-section">
              <div className="gs-section-hd"><span>{results.length} result{results.length !== 1 ? 's' : ''}</span></div>
              {results.map((r, i) => (
                <button key={r.uid}
                  className={`gs-result${focused === i ? ' gs-result--focused' : ''}`}
                  onClick={() => navigate_(r.href)}
                  onMouseEnter={() => setFocused(i)}
                  role="option"
                  aria-selected={focused === i}
                >
                  <span className="gs-result-badge" style={{ background: r.color + '18', color: r.color }}>{r.badge}</span>
                  <span className="gs-result-body">
                    <span className="gs-result-title">{r.title}</span>
                    {r.sub && <span className="gs-result-sub">{r.sub}</span>}
                  </span>
                  <span className="gs-result-arrow"><Icon name="externalLink" size={12} /></span>
                </button>
              ))}
            </div>
          )}

          {/* Empty */}
          {showEmpty && (
            <div className="gs-empty">
              <span className="gs-empty-icon">🔍</span>
              <span>No results for "<strong>{query}</strong>"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Notifications Dropdown ────────────────────────────────────────────────────
function NotificationsDropdown() {
  const navigate = useNavigate();
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);   // increment to re-render read state
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotifs(await fetchNotifications()); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const handleRead = (n) => {
    markAsRead(n.id);
    setVersion((v) => v + 1);
    setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    setOpen(false);
    navigate(n.href);
  };

  const handleMarkAllRead = () => {
    markAllRead(notifs);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setVersion((v) => v + 1);
  };

  return (
    <div className="nd-wrap" ref={wrapRef}>
      <button className={`topbar-icon-btn${open ? ' topbar-icon-btn--active' : ''}`}
        onClick={() => setOpen((o) => !o)} title="Notifications" aria-haspopup="true" aria-expanded={open}>
        <Icon name="bell" size={17} />
        {unreadCount > 0 && (
          <span className="nd-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nd-dropdown" role="dialog" aria-label="Notifications">
          <div className="nd-header">
            <span className="nd-title">Notifications {unreadCount > 0 && <span className="nd-count">{unreadCount}</span>}</span>
            {unreadCount > 0 && (
              <button className="nd-mark-all" onClick={handleMarkAllRead}>Mark all read</button>
            )}
          </div>

          {loading ? (
            <div className="nd-loading">Loading…</div>
          ) : notifs.length === 0 ? (
            <div className="nd-empty">
              <span className="nd-empty-icon">🔔</span>
              <span>No recent notifications</span>
            </div>
          ) : (
            <div className="nd-list">
              {notifs.map((n) => (
                <button key={n.id + version} className={`nd-item${n.read ? ' nd-item--read' : ''}`}
                  onClick={() => handleRead(n)}>
                  <span className="nd-item-icon" style={{ background: n.color + '18' }}>{n.icon}</span>
                  <span className="nd-item-body">
                    <span className="nd-item-title">{n.title}</span>
                    <span className="nd-item-body-text">{n.body}</span>
                    <span className="nd-item-time">{n.time}</span>
                  </span>
                  {!n.read && <span className="nd-unread-dot" />}
                </button>
              ))}
            </div>
          )}

          <div className="nd-footer">
            <button className="nd-footer-link" onClick={() => setOpen(false)}>
              View all activity →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quick Actions Dropdown ────────────────────────────────────────────────────
function QuickActionsDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div className="qa-wrap" ref={wrapRef}>
      <button className={`topbar-icon-btn${open ? ' topbar-icon-btn--active' : ''}`}
        onClick={() => setOpen((o) => !o)} title="Quick Actions" aria-haspopup="true" aria-expanded={open}>
        <Icon name="zap" size={17} />
      </button>

      {open && (
        <div className="qa-dropdown" role="menu" aria-label="Quick actions">
          <div className="qa-header">Quick Actions</div>
          <div className="qa-grid">
            {QUICK_ACTIONS.map(({ label, href, icon, color }) => (
              <button key={href} className="qa-item" role="menuitem"
                onClick={() => { setOpen(false); navigate(href); }}>
                <span className="qa-icon" style={{ background: color + '18', color }}>
                  <Icon name={icon} size={16} />
                </span>
                <span className="qa-label">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function Layout({ children, fullWidth = false }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoUrl,     setLogoUrl]     = useState('');
  const profileRef = useRef(null);

  const { session, signOut } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const userEmail = session?.user?.email ?? '';
  const initials  = getInitials(userEmail);
  const userName  = userEmail.split('@')[0];
  const pageTitle = getPageTitle(location.pathname);

  // Load company logo from settings on mount
  useEffect(() => {
    getAppSettings()
      .then((s) => { if (s?.company_logo_url) setLogoUrl(s.company_logo_url); })
      .catch(() => {});
  }, []);

  // React to logo updates dispatched from Company Settings save
  useEffect(() => {
    function onBrandingUpdate(e) {
      const { company_logo_url } = e.detail || {};
      if (company_logo_url !== undefined) setLogoUrl(company_logo_url || '');
    }
    window.addEventListener('company-settings-updated', onBrandingUpdate);
    return () => window.removeEventListener('company-settings-updated', onBrandingUpdate);
  }, []);

  useEffect(() => { setMobileOpen(false); setProfileOpen(false); }, [location.pathname]);

  useEffect(() => {
    localStorage.removeItem('sb_collapsed');
    localStorage.removeItem('sb_nav_v2');
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    function onOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [profileOpen]);

  const handleSignOut = async () => { await signOut(); navigate('/login', { replace: true }); };

  return (
    <div className={`app-shell${collapsed ? ' sb-collapsed' : ''}${mobileOpen ? ' sb-mobile-open' : ''}`}>

      {/* Mobile backdrop */}
      <div className="sb-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />

      {/* ═══ SIDEBAR ═══════════════════════════════════════════════════════════ */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">

        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-logo-wrap">
            {logoUrl
              ? <img src={logoUrl} alt="Company logo" className="sb-logo sb-logo--img" />
              : <div className="sb-logo"><span>HR</span></div>}
            <div className="sb-brand-text">
              <span className="sb-brand-name">Trivon HR Portal</span>
            </div>
          </div>
          <button className="sb-toggle" onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sb-nav" aria-label="Main navigation">
          <ul>
            {NAV_ITEMS.map((item, idx) => {
              if (item.type === 'divider') {
                return (
                  <li key={`d${idx}`} className="sb-divider">
                    <span className="sb-divider-label">{item.label}</span>
                  </li>
                );
              }
              return (
                <li key={item.to}>
                  <NavLink to={item.to}
                    className={({ isActive }) => `sb-item${isActive ? ' sb-item--active' : ''}`}
                    title={collapsed ? item.label : undefined}>
                    <span className="sb-item-icon"><Icon name={item.icon} size={18} /></span>
                    <span className="sb-item-label">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Profile footer */}
        <div className="sb-footer" ref={profileRef}>
          {profileOpen && (
            <div className="sb-profile-dropdown">
              <div className="sb-pd-header">
                <div className="sb-pd-avatar">{initials}</div>
                <div className="sb-pd-info">
                  <span className="sb-pd-name">{userName}</span>
                  <span className="sb-pd-email">{userEmail}</span>
                </div>
              </div>
              <div className="sb-pd-sep" />
              <button className="sb-pd-item"
                onClick={() => { navigate('/settings'); setProfileOpen(false); }}>
                <Icon name="user" size={14} /><span>My Profile</span>
              </button>
              <button className="sb-pd-item"
                onClick={() => { navigate('/settings'); setProfileOpen(false); }}>
                <Icon name="settings" size={14} /><span>Settings</span>
              </button>
              <div className="sb-pd-sep" />
              <button className="sb-pd-item sb-pd-item--danger" onClick={handleSignOut}>
                <Icon name="signOut" size={14} /><span>Sign Out</span>
              </button>
            </div>
          )}
          <button className={`sb-user-btn${profileOpen ? ' sb-user-btn--open' : ''}`}
            onClick={() => setProfileOpen((o) => !o)}
            title={collapsed ? `${userName} · ${userEmail}` : undefined}
            aria-haspopup="true" aria-expanded={profileOpen}>
            <div className="sb-user-avatar">{initials}</div>
            <div className="sb-user-info">
              <span className="sb-user-name">{userName}</span>
              <span className="sb-user-role">HR Administrator</span>
            </div>
            <span className={`sb-user-chevron${profileOpen ? ' sb-user-chevron--open' : ''}`}>
              <Icon name="chevronDown" size={13} />
            </span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN BODY ═════════════════════════════════════════════════════════ */}
      <div className="app-body">

        {/* Topbar */}
        <header className="topbar" role="banner">
          <div className="topbar-left">
            <button className="topbar-hamburger"
              onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle navigation">
              <Icon name="menu" size={20} />
            </button>
            <span className="topbar-page-title">{pageTitle}</span>
          </div>

          <div className="topbar-center">
            <GlobalSearch />
          </div>

          <div className="topbar-right">
            <QuickActionsDropdown />
            <NotificationsDropdown />
            <div className="topbar-divider" />
            <div className="topbar-user" title={userEmail}>
              <div className="topbar-avatar">{initials}</div>
              <div className="topbar-user-text">
                <span className="topbar-username">{userName}</span>
                <span className="topbar-user-sub">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`app-main${fullWidth ? ' app-main--full' : ''}`} role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
