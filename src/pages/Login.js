import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import '../styles/Login.css';

// ── Validation ────────────────────────────────────────────────────────────────
function validate(email, password) {
  const errors = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  return errors;
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,6 12,13 22,6"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IconEye({ off }) {
  return off ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

// ── Decorative background shapes (pure CSS/SVG, no external assets) ───────────
function BgShapes() {
  return (
    <div className="lg-bg-shapes" aria-hidden="true">
      <div className="lg-shape lg-shape-1" />
      <div className="lg-shape lg-shape-2" />
      <div className="lg-shape lg-shape-3" />
      <div className="lg-orb lg-orb-1" />
      <div className="lg-orb lg-orb-2" />
    </div>
  );
}

// ── Brand panel (left side on desktop) ───────────────────────────────────────
function BrandPanel() {
  return (
    <div className="lg-brand">
      <BgShapes />
      <div className="lg-brand-content">
        {/* Logo mark */}
        <div className="lg-brand-logo">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="rgba(255,255,255,0.15)"/>
            <text x="18" y="26" fontFamily="system-ui,sans-serif" fontSize="20"
              fontWeight="800" fill="#fff" textAnchor="middle">T</text>
          </svg>
          <span className="lg-brand-name">Trivon HR</span>
        </div>

        {/* Hero headline */}
        <h2 className="lg-brand-headline">
          Manage Your Workforce
          <span className="lg-brand-highlight"> Efficiently</span>
        </h2>
        <p className="lg-brand-tagline">
          A unified platform for hiring, payroll, performance, and people — built for modern teams.
        </p>

        {/* Feature list */}
        <ul className="lg-feature-list">
          {[
            'End-to-end candidate pipeline',
            'Automated payroll processing',
            'Performance review workflows',
            'Real-time HR analytics',
          ].map((f) => (
            <li key={f} className="lg-feature-item">
              <span className="lg-feature-icon"><IconCheck /></span>
              {f}
            </li>
          ))}
        </ul>

        {/* Floating stat cards */}
        <div className="lg-stats">
          <div className="lg-stat">
            <span className="lg-stat-num">12k+</span>
            <span className="lg-stat-label">Employees managed</span>
          </div>
          <div className="lg-stat">
            <span className="lg-stat-num">98%</span>
            <span className="lg-stat-label">Uptime SLA</span>
          </div>
          <div className="lg-stat">
            <span className="lg-stat-num">4.9★</span>
            <span className="lg-stat-label">User satisfaction</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Login component ──────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const [form,        setForm]        = useState({ email: '', password: '' });
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);
  const [remember,    setRemember]    = useState(false);
  const [focusedField, setFocused]   = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name])   setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError)    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(form.email, form.password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setServerError('');
    const { error } = await supabase.auth.signInWithPassword({
      email:    form.email,
      password: form.password,
    });
    setLoading(false);
    if (error) {
      setServerError(error.message);
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="lg-root">
      {/* ── Left brand panel (hidden on mobile) ── */}
      <BrandPanel />

      {/* ── Right form panel ── */}
      <div className="lg-form-panel">
        <div className="lg-form-inner">

          {/* Mobile-only logo */}
          <div className="lg-mobile-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="mgl" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366F1"/>
                  <stop offset="100%" stopColor="#4338CA"/>
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="9" fill="url(#mgl)"/>
              <text x="16" y="23" fontFamily="system-ui,sans-serif" fontSize="17"
                fontWeight="800" fill="#fff" textAnchor="middle">T</text>
            </svg>
            <span className="lg-mobile-brand">Trivon HR</span>
          </div>

          {/* Heading */}
          <div className="lg-form-header">
            <h1 className="lg-form-title">Welcome back</h1>
            <p className="lg-form-subtitle">Sign in to your HR Portal account</p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="lg-server-error" role="alert">
              <IconAlert />
              <span>{serverError}</span>
            </div>
          )}

          <form className="lg-form" onSubmit={handleSubmit} noValidate>

            {/* Email field */}
            <div className={`lg-field ${errors.email ? 'lg-field--error' : ''} ${focusedField === 'email' ? 'lg-field--focused' : ''}`}>
              <label htmlFor="lg-email" className="lg-label">Email address</label>
              <div className="lg-input-wrap">
                <span className="lg-input-icon"><IconMail /></span>
                <input
                  id="lg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleChange}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  className="lg-input"
                  disabled={loading}
                  aria-describedby={errors.email ? 'email-err' : undefined}
                />
              </div>
              {errors.email && (
                <span id="email-err" className="lg-field-error" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Password field */}
            <div className={`lg-field ${errors.password ? 'lg-field--error' : ''} ${focusedField === 'password' ? 'lg-field--focused' : ''}`}>
              <div className="lg-label-row">
                <label htmlFor="lg-password" className="lg-label">Password</label>
              </div>
              <div className="lg-input-wrap">
                <span className="lg-input-icon"><IconLock /></span>
                <input
                  id="lg-password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  className="lg-input lg-input--pwd"
                  disabled={loading}
                  aria-describedby={errors.password ? 'pwd-err' : undefined}
                />
                <button
                  type="button"
                  className="lg-pwd-toggle"
                  onClick={() => setShowPwd((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  <IconEye off={showPwd} />
                </button>
              </div>
              {errors.password && (
                <span id="pwd-err" className="lg-field-error" role="alert">
                  {errors.password}
                </span>
              )}
            </div>

            {/* Remember me */}
            <div className="lg-remember-row">
              <label className="lg-checkbox-label">
                <span className={`lg-checkbox ${remember ? 'lg-checkbox--on' : ''}`}
                  onClick={() => setRemember((v) => !v)}
                  role="checkbox" aria-checked={remember} tabIndex={0}
                  onKeyDown={(e) => e.key === ' ' && setRemember((v) => !v)}>
                  {remember && <IconCheck />}
                </span>
                <span className="lg-remember-text">Remember me</span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="lg-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <span className="lg-spinner" aria-hidden="true" />
              ) : (
                <>Sign in to Portal</>
              )}
            </button>

          </form>

          {/* Footer note */}
          <p className="lg-footer-note">
            Protected by enterprise-grade encryption. Your data stays private.
          </p>
        </div>
      </div>
    </div>
  );
}
