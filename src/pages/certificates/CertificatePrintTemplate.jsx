/**
 * CertificatePrintTemplate — source of truth for ALL certificate rendering.
 * Used by: detail page (scaled-down preview) AND PDF generation (html2canvas).
 * A4 landscape at 96 dpi = 1122 × 793 px.
 */

const W = 1122;
const H = 793;

const THEMES = {
  internship_completion: { c1: '#1e40af', c2: '#3b82f6', acc: '#dbeafe' },
  training_completion:   { c1: '#065f46', c2: '#10b981', acc: '#d1fae5' },
  employee_recognition:  { c1: '#92400e', c2: '#f59e0b', acc: '#fef3c7' },
  appreciation:          { c1: '#5b21b6', c2: '#8b5cf6', acc: '#ede9fe' },
  achievement:           { c1: '#9f1239', c2: '#f43f5e', acc: '#ffe4e6' },
  course_completion:     { c1: '#0f5986', c2: '#0ea5e9', acc: '#e0f2fe' },
};

const CERT_TITLES = {
  internship_completion: 'Certificate of Internship Completion',
  training_completion:   'Certificate of Training Completion',
  employee_recognition:  'Employee Recognition Award',
  appreciation:          'Certificate of Appreciation',
  achievement:           'Certificate of Achievement',
  course_completion:     'Course Completion Certificate',
};

function fmtDate(str) {
  if (!str) return 'N/A';
  try {
    return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return str; }
}

function buildBody(cert) {
  const { certificate_type: t, program_name: p, start_date: s, end_date: e } = cert;
  const dr = s && e ? ` from ${fmtDate(s)} to ${fmtDate(e)}` : '';
  const pi = p ? ` in ${p}` : '';
  const pt = p ? ` towards ${p}` : '';
  switch (t) {
    case 'internship_completion':
      return `has successfully completed the Internship Programme${pi}${dr} at TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED, demonstrating commendable dedication, professionalism, and commitment throughout the internship period.`;
    case 'training_completion':
      return `has successfully completed the Training Programme${pi}${dr} conducted by TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED, exhibiting exceptional commitment, skill development, and a commendable attitude toward continuous learning.`;
    case 'employee_recognition':
      return `is hereby recognized and awarded for Outstanding Performance and Dedication${pi} at TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED. This recognition is a testament to their exemplary contribution, work ethic, and unwavering commitment to excellence.`;
    case 'appreciation':
      return `is hereby appreciated and acknowledged for their Valuable Contribution${pt} at TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED. We sincerely commend their efforts, enthusiasm, teamwork, and professional commitment throughout their tenure.`;
    case 'achievement':
      return `has demonstrated Exceptional Achievement${pi}${dr} at TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED. This award is presented in recognition of outstanding merit, distinguished performance, and remarkable accomplishment.`;
    case 'course_completion':
      return `has successfully completed the${p ? ' ' + p : ''} Course${dr} organised by TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED, demonstrating thorough understanding, disciplined study, and commitment to professional development.`;
    default:
      return `is hereby recognised and awarded for their distinguished service and outstanding contribution at TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED.`;
  }
}

// ── Shared Footer (all 3 templates) ──────────────────────────────────────────
function CertFooter({ cert, c1, c2, acc, fromLeft = 48 }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 110, zIndex: 2 }}>
      {/* Separator */}
      <div style={{ height: 1, background: '#e2e8f0', margin: `0 ${fromLeft}px 16px` }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: `0 ${fromLeft}px 22px`, gap: 24 }}>

        {/* Verification box */}
        <div style={{ minWidth: 220, background: acc, border: `1.5px solid ${c2}`, borderRadius: 10, padding: '10px 18px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 2.5, color: c1, fontWeight: 800, marginBottom: 7, fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>
            Verification Code
          </div>
          <div style={{ fontSize: 18, fontFamily: '"Courier New", Courier, monospace', fontWeight: 800, color: c1, letterSpacing: 2 }}>
            {cert.verification_code || ''}
          </div>
        </div>

        {/* Issue date */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#94a3b8', fontWeight: 700, marginBottom: 7, fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>
            Date of Issue
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
            {fmtDate(cert.issue_date)}
          </div>
        </div>

        {/* Signature */}
        <div style={{ minWidth: 220, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ borderBottom: '2px solid #0f172a', marginBottom: 10 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'Arial, sans-serif', marginBottom: 4 }}>
            {cert.signatory_name || ''}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'Arial, sans-serif' }}>
            {cert.signatory_title || ''}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Logo element ──────────────────────────────────────────────────────────────
function LogoImg({ logoDataUrl, c1, size = 72 }) {
  if (logoDataUrl) {
    return (
      <img
        src={logoDataUrl}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, background: c1, borderRadius: Math.round(size * 0.15),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.46), fontWeight: 900, color: '#fff',
      fontFamily: 'Arial, sans-serif',
    }}>
      T
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — CLASSIC PRESTIGE
// White page · double border · corner ornaments · centered layout
// ════════════════════════════════════════════════════════════════════════════════
function Classic({ cert, logoDataUrl, c1, c2, acc }) {
  const title = CERT_TITLES[cert.certificate_type] || 'Certificate';
  const name  = cert.recipient_name || '';
  const body  = buildBody(cert);
  const ulW   = Math.min(name.length * 24 + 80, 560);

  return (
    <div style={{ width: W, height: H, background: '#fff', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* Watermark */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ fontSize: 200, fontWeight: 900, color: c1, opacity: 0.04, transform: 'rotate(-25deg)', whiteSpace: 'nowrap', userSelect: 'none', fontFamily: 'Arial, sans-serif' }}>
          TRIVON
        </div>
      </div>

      {/* Outer border */}
      <div style={{ position: 'absolute', inset: 14, border: `3px solid ${c1}`, boxSizing: 'border-box', pointerEvents: 'none' }} />
      {/* Inner border */}
      <div style={{ position: 'absolute', inset: 22, border: `1px solid ${c2}`, boxSizing: 'border-box', pointerEvents: 'none' }} />

      {/* Corner ornaments — top-left */}
      <div style={{ position: 'absolute', top: 14, left: 14, width: 72, height: 10, background: c1 }} />
      <div style={{ position: 'absolute', top: 14, left: 14, width: 10, height: 72, background: c1 }} />
      <div style={{ position: 'absolute', top: 32, left: 32, width: 12, height: 12, background: c2, transform: 'rotate(45deg)' }} />

      {/* Corner ornaments — top-right */}
      <div style={{ position: 'absolute', top: 14, right: 14, width: 72, height: 10, background: c1 }} />
      <div style={{ position: 'absolute', top: 14, right: 14, width: 10, height: 72, background: c1 }} />
      <div style={{ position: 'absolute', top: 32, right: 32, width: 12, height: 12, background: c2, transform: 'rotate(45deg)' }} />

      {/* Corner ornaments — bottom-left */}
      <div style={{ position: 'absolute', bottom: 14, left: 14, width: 72, height: 10, background: c1 }} />
      <div style={{ position: 'absolute', bottom: 14, left: 14, width: 10, height: 72, background: c1 }} />
      <div style={{ position: 'absolute', bottom: 32, left: 32, width: 12, height: 12, background: c2, transform: 'rotate(45deg)' }} />

      {/* Corner ornaments — bottom-right */}
      <div style={{ position: 'absolute', bottom: 14, right: 14, width: 72, height: 10, background: c1 }} />
      <div style={{ position: 'absolute', bottom: 14, right: 14, width: 10, height: 72, background: c1 }} />
      <div style={{ position: 'absolute', bottom: 32, right: 32, width: 12, height: 12, background: c2, transform: 'rotate(45deg)' }} />

      {/* Main content */}
      <div style={{ position: 'absolute', top: 30, bottom: 110, left: 48, right: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, overflow: 'hidden' }}>

        {/* Logo */}
        <div style={{ marginBottom: 10 }}>
          <LogoImg logoDataUrl={logoDataUrl} c1={c1} size={70} />
        </div>

        {/* Company name */}
        <div style={{ fontSize: 11, fontWeight: 800, color: c1, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
          TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 16, fontFamily: 'Arial, sans-serif' }}>
          Human Resources Department
        </div>

        {/* Diamond divider */}
        <div style={{ display: 'flex', alignItems: 'center', width: '48%', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1.5, background: c1 }} />
          <div style={{ width: 10, height: 10, background: c2, transform: 'rotate(45deg)', flexShrink: 0 }} />
          <div style={{ flex: 1, height: 1.5, background: c1 }} />
        </div>

        {/* "PROUDLY PRESENTS" */}
        <div style={{ fontSize: 10, color: c2, fontWeight: 800, letterSpacing: 5, marginBottom: 10, fontFamily: 'Arial, sans-serif' }}>
          PROUDLY PRESENTS
        </div>

        {/* Certificate title */}
        <div style={{ fontSize: 28, fontWeight: 800, color: c1, fontFamily: 'Georgia, "Times New Roman", serif', textAlign: 'center', marginBottom: 8, letterSpacing: 0.3 }}>
          {title}
        </div>

        {/* Double underline */}
        <div style={{ width: 480, height: 3, background: c1, marginBottom: 3, borderRadius: 1 }} />
        <div style={{ width: 420, height: 1, background: c2, marginBottom: 16 }} />

        {/* "This is to certify that" */}
        <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
          This is to certify that
        </div>

        {/* Recipient name */}
        <div style={{ fontSize: 50, fontWeight: 800, fontStyle: 'italic', color: c1, fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: -0.5, textAlign: 'center', lineHeight: 1.1, marginBottom: 6 }}>
          {name}
        </div>

        {/* 3-segment underline */}
        <div style={{ display: 'flex', width: ulW, height: 4, marginBottom: 10, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ flex: 65, background: c1 }} />
          <div style={{ flex: 22, background: c2 }} />
          <div style={{ flex: 13, background: acc }} />
        </div>

        {/* Employee ID */}
        {cert.employee_id && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontFamily: 'Arial, sans-serif' }}>
            [ Employee ID: {cert.employee_id} ]
          </div>
        )}

        {/* Body text */}
        <div style={{ fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 1.75, maxWidth: 860, marginTop: 6, fontFamily: 'Arial, sans-serif', flexShrink: 0 }}>
          {body}
        </div>
      </div>

      <CertFooter cert={cert} c1={c1} c2={c2} acc={acc} fromLeft={48} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — MODERN EXECUTIVE
// Left sidebar · gradient header · left-aligned · contemporary corporate
// ════════════════════════════════════════════════════════════════════════════════
function Modern({ cert, logoDataUrl, c1, c2, acc }) {
  const SB = 88;      // sidebar width
  const ML = SB + 32; // content left margin
  const HDR_H = 152;  // header height

  const title    = CERT_TITLES[cert.certificate_type] || 'Certificate';
  const name     = cert.recipient_name || '';
  const body     = buildBody(cert);
  const ulW      = Math.min(name.length * 28 + 60, W - ML - 60);
  const shortType = (title.toUpperCase());

  return (
    <div style={{ width: W, height: H, background: '#fff', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* Gradient header (right of sidebar) */}
      <div style={{ position: 'absolute', top: 0, left: SB, right: 0, height: HDR_H, background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }} />

      {/* Header c2 accent stripe at bottom */}
      <div style={{ position: 'absolute', top: HDR_H - 5, left: SB, right: 0, height: 5, background: c2 }} />

      {/* Left sidebar */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: SB, height: H, background: c1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        {/* Decorative lines */}
        {[0,1,2,3,4,5].map((i) => (
          <div key={i} style={{ width: 44, height: 2, background: 'rgba(255,255,255,0.25)', borderRadius: 1 }} />
        ))}
        {/* Rotated label */}
        <div style={{ position: 'absolute', bottom: 40, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 4, transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>
          TRIVON HR
        </div>
      </div>

      {/* Subtle border on right / bottom of content area */}
      <div style={{ position: 'absolute', top: HDR_H, left: SB, right: 0, bottom: 0, border: `1px solid #e2e8f0`, borderTop: 'none', boxSizing: 'border-box', pointerEvents: 'none' }} />

      {/* Header content */}
      <div style={{ position: 'absolute', top: 0, left: ML, right: 48, height: HDR_H, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Logo + company info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <LogoImg logoDataUrl={logoDataUrl} c1={c2} size={56} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', marginBottom: 5 }}>
              TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED
            </div>
            <div style={{ fontSize: 10, color: 'rgba(210,230,255,0.9)', fontFamily: 'Arial, sans-serif' }}>
              Human Resources Department
            </div>
          </div>
          {/* Cert number right-aligned */}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(210,230,255,0.75)', fontFamily: '"Courier New", monospace', letterSpacing: 0.5, textAlign: 'right' }}>
            {cert.certificate_number || ''}
          </div>
        </div>
      </div>

      {/* Main content (below header) */}
      <div style={{ position: 'absolute', top: HDR_H + 18, bottom: 110, left: ML, right: 48, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Type badge */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ background: acc, borderLeft: `5px solid ${c1}`, padding: '7px 18px', fontSize: 10, fontWeight: 800, color: c1, letterSpacing: 1.5, fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>
            {shortType}
          </div>
        </div>

        {/* "PRESENTED TO" */}
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 3, marginBottom: 8, fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>
          Presented To
        </div>

        {/* Recipient name */}
        <div style={{ fontSize: 52, fontWeight: 800, fontStyle: 'italic', color: c1, fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: -0.5, lineHeight: 1.05, marginBottom: 8 }}>
          {name}
        </div>

        {/* 3-segment underline */}
        <div style={{ display: 'flex', width: ulW, height: 5, marginBottom: 14, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ flex: 65, background: c1 }} />
          <div style={{ flex: 22, background: c2 }} />
          <div style={{ flex: 13, background: acc }} />
        </div>

        {/* Employee ID */}
        {cert.employee_id && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10, fontFamily: 'Arial, sans-serif' }}>
            Employee ID: {cert.employee_id}
          </div>
        )}

        {/* Body text */}
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, fontFamily: 'Arial, sans-serif', maxWidth: 720, marginTop: 4 }}>
          {body}
        </div>
      </div>

      <CertFooter cert={cert} c1={c1} c2={c2} acc={acc} fromLeft={ML} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — ELITE AWARD
// Dark header · award seal · accent bar · centered premium layout
// ════════════════════════════════════════════════════════════════════════════════
function Elite({ cert, logoDataUrl, c1, c2, acc }) {
  const HDR_H = 264;
  const title  = CERT_TITLES[cert.certificate_type] || 'Certificate';
  const name   = cert.recipient_name || '';
  const body   = buildBody(cert);
  const ulW    = Math.min(name.length * 28 + 80, 640);

  return (
    <div style={{ width: W, height: H, background: '#fff', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* Dark header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HDR_H, background: '#0f172a' }} />

      {/* c1 top stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 16, background: c1 }} />

      {/* c2 bottom stripe of header */}
      <div style={{ position: 'absolute', top: HDR_H - 12, left: 0, right: 0, height: 12, background: c2 }} />

      {/* Diagonal texture in header */}
      <div style={{ position: 'absolute', top: 16, left: 0, right: 0, height: HDR_H - 28, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', top: -80, left: i * 60 - 100, width: 2, height: HDR_H + 80, background: 'rgba(255,255,255,0.04)', transform: 'rotate(30deg)' }} />
        ))}
      </div>

      {/* Award seal (top right) */}
      <div style={{ position: 'absolute', top: 28, right: 48, width: 100, height: 100, borderRadius: '50%', background: c2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 6px ${c1}` }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: c1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <div style={{ fontSize: 7, fontWeight: 800, color: c1, letterSpacing: 0.5, fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>CERTIFIED</div>
              <div style={{ fontSize: 5.5, color: c1, fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>TRIVON HR</div>
            </div>
          </div>
        </div>
      </div>

      {/* Header content */}
      <div style={{ position: 'absolute', top: 32, left: 48, right: 180, height: HDR_H - 32, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

        {/* Logo + company info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <LogoImg logoDataUrl={logoDataUrl} c1={c1} size={60} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', marginBottom: 5 }}>
              TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED
            </div>
            <div style={{ fontSize: 10, color: 'rgba(190,215,255,0.85)', fontFamily: 'Arial, sans-serif' }}>
              Human Resources Department
            </div>
          </div>
        </div>

        {/* PRESENTS label */}
        <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 8, marginBottom: 14, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', opacity: 0.85 }}>
          PRESENTS
        </div>

        {/* Certificate title */}
        <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: 0.3, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          {title}
        </div>
      </div>

      {/* Body — left accent bar */}
      <div style={{ position: 'absolute', top: HDR_H, left: 0, bottom: 0, width: 28, background: c1 }} />

      {/* Main body content */}
      <div style={{ position: 'absolute', top: HDR_H + 18, bottom: 110, left: 48, right: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>

        {/* "This is to certify that" */}
        <div style={{ fontSize: 14, color: '#94a3b8', fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 12 }}>
          This is to certify that
        </div>

        {/* Recipient name */}
        <div style={{ fontSize: 54, fontWeight: 800, fontStyle: 'italic', color: c1, fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: -0.5, textAlign: 'center', lineHeight: 1.05, marginBottom: 8 }}>
          {name}
        </div>

        {/* 3-segment underline */}
        <div style={{ display: 'flex', width: ulW, height: 5, marginBottom: 14, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ flex: 60, background: c1 }} />
          <div style={{ flex: 25, background: c2 }} />
          <div style={{ flex: 15, background: acc }} />
        </div>

        {/* Employee ID */}
        {cert.employee_id && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10, fontFamily: 'Arial, sans-serif' }}>
            Employee ID: {cert.employee_id}
          </div>
        )}

        {/* Body text */}
        <div style={{ fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 1.75, maxWidth: 900, marginTop: 4, fontFamily: 'Arial, sans-serif' }}>
          {body}
        </div>
      </div>

      <CertFooter cert={cert} c1={c1} c2={c2} acc={acc} fromLeft={48} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CertificatePrintTemplate({ cert, logoDataUrl }) {
  if (!cert) return null;
  const theme    = THEMES[cert.certificate_type] || THEMES.achievement;
  const template = cert.template || 'classic';
  const { c1, c2, acc } = theme;

  if (template === 'modern') return <Modern cert={cert} logoDataUrl={logoDataUrl} c1={c1} c2={c2} acc={acc} />;
  if (template === 'elite')  return <Elite  cert={cert} logoDataUrl={logoDataUrl} c1={c1} c2={c2} acc={acc} />;
  return <Classic cert={cert} logoDataUrl={logoDataUrl} c1={c1} c2={c2} acc={acc} />;
}
