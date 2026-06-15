// Global accent-color theme system.
// applyTheme() sets CSS custom properties on :root so every component that
// uses CSS variables (buttons, sidebar, avatars, focus rings, etc.) updates
// instantly without re-rendering or a page reload.
//
// loadSavedTheme() reads the saved preference from localStorage and applies it.
// Call this once before the first React render (see App.js).

export const ACCENT_PALETTES = {
  indigo: {
    label: 'Indigo',
    dark:  '#3730A3',
    c500:  '#4F46E5',
    c400:  '#6366F1',
    c300:  '#818CF8',
    c200:  '#A5B4FC',
    c100:  '#EEF2FF',
    c50:   '#F5F3FF',
    ring:   'rgba(99,102,241,0.2)',
    shadow: 'rgba(79,70,229,0.3)',
    bg18:   'rgba(99,102,241,0.18)',
    bg15:   'rgba(99,102,241,0.15)',
    bg08:   'rgba(99,102,241,0.08)',
    sh45:   'rgba(99,102,241,0.45)',
    sh50:   'rgba(99,102,241,0.5)',
  },
  blue: {
    label: 'Blue',
    dark:  '#1D4ED8',
    c500:  '#2563EB',
    c400:  '#3B82F6',
    c300:  '#60A5FA',
    c200:  '#93C5FD',
    c100:  '#DBEAFE',
    c50:   '#EFF6FF',
    ring:   'rgba(59,130,246,0.2)',
    shadow: 'rgba(37,99,235,0.3)',
    bg18:   'rgba(59,130,246,0.18)',
    bg15:   'rgba(59,130,246,0.15)',
    bg08:   'rgba(59,130,246,0.08)',
    sh45:   'rgba(59,130,246,0.45)',
    sh50:   'rgba(59,130,246,0.5)',
  },
  violet: {
    label: 'Violet',
    dark:  '#6D28D9',
    c500:  '#7C3AED',
    c400:  '#8B5CF6',
    c300:  '#A78BFA',
    c200:  '#C4B5FD',
    c100:  '#EDE9FE',
    c50:   '#F5F3FF',
    ring:   'rgba(139,92,246,0.2)',
    shadow: 'rgba(124,58,237,0.3)',
    bg18:   'rgba(139,92,246,0.18)',
    bg15:   'rgba(139,92,246,0.15)',
    bg08:   'rgba(139,92,246,0.08)',
    sh45:   'rgba(139,92,246,0.45)',
    sh50:   'rgba(139,92,246,0.5)',
  },
  rose: {
    label: 'Rose',
    dark:  '#BE123C',
    c500:  '#E11D48',
    c400:  '#F43F5E',
    c300:  '#FB7185',
    c200:  '#FDA4AF',
    c100:  '#FFE4E6',
    c50:   '#FFF1F2',
    ring:   'rgba(244,63,94,0.2)',
    shadow: 'rgba(225,29,72,0.3)',
    bg18:   'rgba(244,63,94,0.18)',
    bg15:   'rgba(244,63,94,0.15)',
    bg08:   'rgba(244,63,94,0.08)',
    sh45:   'rgba(244,63,94,0.45)',
    sh50:   'rgba(244,63,94,0.5)',
  },
  emerald: {
    label: 'Emerald',
    dark:  '#047857',
    c500:  '#059669',
    c400:  '#10B981',
    c300:  '#34D399',
    c200:  '#6EE7B7',
    c100:  '#D1FAE5',
    c50:   '#ECFDF5',
    ring:   'rgba(16,185,129,0.2)',
    shadow: 'rgba(5,150,105,0.3)',
    bg18:   'rgba(16,185,129,0.18)',
    bg15:   'rgba(16,185,129,0.15)',
    bg08:   'rgba(16,185,129,0.08)',
    sh45:   'rgba(16,185,129,0.45)',
    sh50:   'rgba(16,185,129,0.5)',
  },
  orange: {
    label: 'Orange',
    dark:  '#C2410C',
    c500:  '#EA580C',
    c400:  '#F97316',
    c300:  '#FB923C',
    c200:  '#FED7AA',
    c100:  '#FFEDD5',
    c50:   '#FFF7ED',
    ring:   'rgba(249,115,22,0.2)',
    shadow: 'rgba(234,88,12,0.3)',
    bg18:   'rgba(249,115,22,0.18)',
    bg15:   'rgba(249,115,22,0.15)',
    bg08:   'rgba(249,115,22,0.08)',
    sh45:   'rgba(249,115,22,0.45)',
    sh50:   'rgba(249,115,22,0.5)',
  },
};

export function applyTheme(accentKey) {
  const p = ACCENT_PALETTES[accentKey] || ACCENT_PALETTES.indigo;
  const root = document.documentElement;

  // Core aliases (used by existing --accent / --accent-h / --accent-lt rules)
  root.style.setProperty('--accent',    p.c500);
  root.style.setProperty('--accent-h',  p.dark);
  root.style.setProperty('--accent-lt', p.c100);

  // Full scale
  root.style.setProperty('--accent-50',   p.c50);
  root.style.setProperty('--accent-100',  p.c100);
  root.style.setProperty('--accent-200',  p.c200);
  root.style.setProperty('--accent-300',  p.c300);
  root.style.setProperty('--accent-400',  p.c400);
  root.style.setProperty('--accent-500',  p.c500);
  root.style.setProperty('--accent-dark', p.dark);

  // Semantic aliases
  root.style.setProperty('--accent-ring',   p.ring);
  root.style.setProperty('--accent-shadow', p.shadow);
  root.style.setProperty('--accent-bg-18',  p.bg18);
  root.style.setProperty('--accent-bg-15',  p.bg15);
  root.style.setProperty('--accent-bg-08',  p.bg08);
  root.style.setProperty('--accent-sh45',   p.sh45);
  root.style.setProperty('--accent-sh50',   p.sh50);

  // Sidebar active-item variables (already in Layout.css :root)
  root.style.setProperty('--sb-item-a-bg',   p.bg18);
  root.style.setProperty('--sb-item-a-glow', p.ring);
  root.style.setProperty('--sb-item-a-bd',   p.c300);

  root.setAttribute('data-accent', accentKey);
}

export function loadSavedTheme() {
  try {
    const saved = localStorage.getItem('hr_accent') || 'indigo';
    applyTheme(saved);
  } catch {
    applyTheme('indigo');
  }
}

export function applyDarkMode(mode) {
  // mode: 'light' | 'dark' | 'system'
  let isDark = false;
  if (mode === 'dark') isDark = true;
  else if (mode === 'system') isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  try { localStorage.setItem('hr_theme', mode); } catch {}
}

export function loadSavedDarkMode() {
  try {
    const saved = localStorage.getItem('hr_theme') || 'light';
    applyDarkMode(saved);
  } catch {
    applyDarkMode('light');
  }
}

export function applyDensity(density) {
  // density: 'compact' | 'comfortable' | 'spacious'
  document.body.setAttribute('data-density', density || 'comfortable');
  try { localStorage.setItem('hr_density', density); } catch {}
}

export function loadSavedDensity() {
  try {
    const saved = localStorage.getItem('hr_density') || 'comfortable';
    applyDensity(saved);
  } catch {
    applyDensity('comfortable');
  }
}
