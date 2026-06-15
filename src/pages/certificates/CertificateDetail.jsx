import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getCertificate, updateCertificate, deleteCertificate,
  CERT_TYPES, STATUS_LABELS,
} from '../../services/certificateService';
import { downloadCertificatePDF, fetchLogoAsDataUrl } from '../../utils/generateCertificatePDF';
import { getAppSettings } from '../../services/settingsService';
import CertificatePrintTemplate from './CertificatePrintTemplate';
import '../../styles/Certificates.css';

// A4 landscape at 96 dpi
const CERT_W = 1122;
const CERT_H = 793;

const TYPE_ICONS = {
  internship_completion: '🎓',
  training_completion:   '📚',
  employee_recognition:  '🏆',
  appreciation:          '🌟',
  achievement:           '🥇',
  course_completion:     '📜',
};

const TEMPLATE_LABELS = {
  classic: 'Classic Prestige',
  modern:  'Modern Executive',
  elite:   'Elite Award',
};

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Collapsible panel section ─────────────────────────────────────────────────
function PanelSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="cert-dl-section">
      <button className="cert-dl-section-hdr" onClick={() => setOpen((o) => !o)}>
        <span className="cert-dl-section-title">{title}</span>
        <svg
          className={`cert-dl-chevron${open ? ' cert-dl-chevron--open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && <div className="cert-dl-section-body">{children}</div>}
    </div>
  );
}

// ── Info row in panel ─────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="cert-dl-info-row">
      <span className="cert-dl-info-label">{label}</span>
      <span className={`cert-dl-info-value${mono ? ' cert-dl-info-value--mono' : ''}`}>{value}</span>
    </div>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconRevoke = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconZoomIn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

const IconZoomOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

const IconFitWidth = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 17 2 12 8 7"/>
    <polyline points="16 7 22 12 16 17"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
  </svg>
);

const IconFullscreen = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/>
    <polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/>
    <line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"/>
    <path d="M12 19l-7-7 7-7"/>
  </svg>
);

// ═════════════════════════════════════════════════════════════════════════════
export default function CertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const stageRef = useRef(null);

  const [cert,        setCert]        = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [actionErr,   setActionErr]   = useState('');
  const [downloading, setDownloading] = useState(false);
  const [working,     setWorking]     = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [confirmRev,  setConfirmRev]  = useState(false);

  // Zoom state
  const [zoomMode,   setZoomMode]   = useState('fit-width');
  const [customZoom, setCustomZoom] = useState(1.0);
  const [stageW,     setStageW]     = useState(820);

  useEffect(() => {
    getCertificate(id)
      .then(setCert)
      .catch((e) => setError(e.message || 'Certificate not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getAppSettings()
      .then((s) => s?.company_logo_url ? fetchLogoAsDataUrl(s.company_logo_url) : null)
      .then((d) => { if (d) setLogoDataUrl(d); })
      .catch(() => {});
  }, []);

  // Measure stage width for fit-to-width calculation
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => setStageW(entry.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const effectiveScale = useMemo(() => {
    if (zoomMode === 'fit-width') return Math.max(0.1, (stageW - 64) / CERT_W);
    return customZoom;
  }, [zoomMode, stageW, customZoom]);

  const scaledW = Math.round(CERT_W * effectiveScale);
  const scaledH = Math.round(CERT_H * effectiveScale);

  const zoomTo = (next) => {
    setZoomMode('custom');
    setCustomZoom(Math.max(0.1, Math.min(3.0, parseFloat(next.toFixed(2)))));
  };

  const enterFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
  };

  const handleDownload = async () => {
    if (!cert || !printRef.current) return;
    setDownloading(true);
    setActionErr('');
    try {
      await downloadCertificatePDF(cert, printRef.current);
    } catch (e) {
      setActionErr(e.message || 'PDF generation failed. Please try again.');
    }
    setDownloading(false);
  };

  const handleRevoke = async () => {
    setWorking(true); setActionErr('');
    try { const u = await updateCertificate(id, { status: 'revoked' }); setCert(u); setConfirmRev(false); }
    catch (e) { setActionErr(e.message || 'Failed to revoke'); }
    setWorking(false);
  };

  const handleReissue = async () => {
    setWorking(true); setActionErr('');
    try { const u = await updateCertificate(id, { status: 'issued' }); setCert(u); }
    catch (e) { setActionErr(e.message || 'Failed to reissue'); }
    setWorking(false);
  };

  const handleDelete = async () => {
    setWorking(true);
    try { await deleteCertificate(id); navigate('/certificates', { replace: true }); }
    catch (e) { setActionErr(e.message || 'Failed to delete'); setWorking(false); }
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout fullWidth>
        <div style={{ padding: '24px 28px' }}>
          <div className="cert-skeleton" style={{ height: 28, width: 180, marginBottom: 16 }} />
          <div className="cert-skeleton" style={{ height: 480, borderRadius: 10 }} />
        </div>
      </Layout>
    );
  }

  if (error || !cert) {
    return (
      <Layout fullWidth>
        <div style={{ padding: '24px 28px' }}>
          <div className="cert-alert cert-alert--error">⚠ {error || 'Certificate not found'}</div>
          <Link to="/certificates" className="cert-dl-back" style={{ marginTop: 16 }}>
            <IconBack /> Back to Certificates
          </Link>
        </div>
      </Layout>
    );
  }

  const zoomPct     = Math.round(effectiveScale * 100);
  const isFitWidth  = zoomMode === 'fit-width';
  const isCustom100 = zoomMode === 'custom' && Math.round(customZoom * 100) === 100;

  return (
    <Layout fullWidth>
      <div className="cert-dl-page">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="cert-dl-header">
          <Link to="/certificates" className="cert-dl-back">
            <IconBack />
            Certificates
          </Link>
          <div className="cert-dl-header-main">
            <div className="cert-dl-title-row">
              <h1 className="cert-dl-title">{cert.certificate_number}</h1>
              <span className={`cert-badge cert-status--${cert.status}`}>
                {STATUS_LABELS[cert.status]}
              </span>
              <span className="cert-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                {TYPE_ICONS[cert.certificate_type]} {CERT_TYPES[cert.certificate_type]}
              </span>
            </div>
            <p className="cert-dl-subtitle">
              Issued to <strong>{cert.recipient_name}</strong>
              {cert.employee_id && <> · <span style={{ fontFamily: 'monospace' }}>{cert.employee_id}</span></>}
              {cert.issue_date && <> · {fmtDate(cert.issue_date)}</>}
            </p>
          </div>
        </div>

        {actionErr && (
          <div className="cert-dl-action-err">⚠ {actionErr}</div>
        )}

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="cert-dl-body">

          {/* ── Left info panel ─────────────────────────────────────────── */}
          <div className="cert-dl-panel">

            {/* Actions */}
            <PanelSection title="Actions">
              <div className="cert-dl-actions-list">
                <button
                  className="cert-dl-act cert-dl-act--primary"
                  onClick={handleDownload}
                  disabled={cert.status === 'revoked' || downloading}
                >
                  <IconDownload />
                  {downloading ? 'Generating PDF…' : 'Download PDF'}
                </button>

                {cert.status === 'draft' && (
                  <button className="cert-dl-act cert-dl-act--success" onClick={handleReissue} disabled={working}>
                    <IconCheck /> Issue Certificate
                  </button>
                )}

                {cert.status === 'issued' && (
                  <button className="cert-dl-act cert-dl-act--warn" onClick={() => setConfirmRev(true)} disabled={working}>
                    <IconRevoke /> Revoke
                  </button>
                )}

                {cert.status === 'revoked' && (
                  <button className="cert-dl-act cert-dl-act--secondary" onClick={handleReissue} disabled={working}>
                    ↩ Re-issue
                  </button>
                )}

                <button className="cert-dl-act cert-dl-act--danger" onClick={() => setConfirmDel(true)} disabled={working}>
                  <IconTrash /> Delete
                </button>
              </div>
            </PanelSection>

            {/* Recipient */}
            <PanelSection title="Recipient">
              <InfoRow label="Full Name"    value={cert.recipient_name} />
              <InfoRow label="Employee ID"  value={cert.employee_id} mono />
              <InfoRow label="Type"         value={`${TYPE_ICONS[cert.certificate_type]} ${CERT_TYPES[cert.certificate_type]}`} />
              {cert.program_name && <InfoRow label="Programme"  value={cert.program_name} />}
              {cert.start_date   && <InfoRow label="Start Date" value={fmtDate(cert.start_date)} />}
              {cert.end_date     && <InfoRow label="End Date"   value={fmtDate(cert.end_date)} />}
            </PanelSection>

            {/* Certificate details */}
            <PanelSection title="Certificate" defaultOpen={false}>
              <InfoRow label="Number"      value={cert.certificate_number} mono />
              <InfoRow label="Verify Code" value={cert.verification_code}  mono />
              <InfoRow label="Issue Date"  value={fmtDate(cert.issue_date)} />
              <InfoRow label="Signatory"   value={cert.signatory_name} />
              <InfoRow label="Title"       value={cert.signatory_title} />
              <InfoRow label="Status"      value={STATUS_LABELS[cert.status]} />
              <InfoRow label="Template"    value={TEMPLATE_LABELS[cert.template] || 'Classic Prestige'} />
            </PanelSection>

            {/* Notes */}
            {cert.notes && (
              <PanelSection title="Notes" defaultOpen={false}>
                <p className="cert-dl-notes-text">{cert.notes}</p>
              </PanelSection>
            )}

          </div>

          {/* ── Viewer column ──────────────────────────────────────────── */}
          <div className="cert-dl-viewer-col">

            {/* Zoom toolbar */}
            <div className="cert-dl-zoom-bar">
              <div className="cert-dl-zoom-left">
                <button
                  className="cert-dl-z-btn"
                  onClick={() => zoomTo(effectiveScale - 0.25)}
                  disabled={effectiveScale <= 0.12}
                  title="Zoom out"
                >
                  <IconZoomOut />
                </button>

                <span className="cert-dl-z-pct">{zoomPct}%</span>

                <button
                  className="cert-dl-z-btn"
                  onClick={() => zoomTo(effectiveScale + 0.25)}
                  disabled={effectiveScale >= 3}
                  title="Zoom in"
                >
                  <IconZoomIn />
                </button>

                <div className="cert-dl-z-sep" />

                <button
                  className={`cert-dl-z-mode${isFitWidth ? ' cert-dl-z-mode--on' : ''}`}
                  onClick={() => setZoomMode('fit-width')}
                  title="Fit to width"
                >
                  <IconFitWidth /> Fit Width
                </button>

                <button
                  className={`cert-dl-z-mode${isCustom100 ? ' cert-dl-z-mode--on' : ''}`}
                  onClick={() => zoomTo(1)}
                  title="100% actual size"
                >
                  100%
                </button>

                {[50, 150, 200].map((pct) => (
                  <button
                    key={pct}
                    className={`cert-dl-z-mode${zoomMode === 'custom' && Math.round(customZoom * 100) === pct ? ' cert-dl-z-mode--on' : ''}`}
                    onClick={() => zoomTo(pct / 100)}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div className="cert-dl-zoom-right">
                <span className="cert-dl-z-info">
                  {CERT_W} × {CERT_H} px
                </span>
                <button className="cert-dl-z-btn cert-dl-z-fs" onClick={enterFullscreen} title="Fullscreen">
                  <IconFullscreen /> Fullscreen
                </button>
              </div>
            </div>

            {/* ── Document stage ─────────────────────────────────────── */}
            <div className="cert-dl-stage" ref={stageRef}>
              <div
                className="cert-dl-stage-inner"
                style={{ minHeight: scaledH + 72 }}
              >
                {/*
                  Outer div tells layout how much space the scaled cert needs.
                  Inner div is the full-size cert, scaled via CSS transform.
                */}
                <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0 }}>
                  <div
                    className="cert-dl-doc"
                    style={{
                      width: CERT_W,
                      height: CERT_H,
                      transform: `scale(${effectiveScale})`,
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  >
                    <CertificatePrintTemplate cert={cert} logoDataUrl={logoDataUrl} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Hidden print target ──────────────────────────────────────────── */}
        <div
          ref={printRef}
          style={{
            position: 'fixed',
            left: -9999,
            top: 0,
            width: CERT_W,
            height: CERT_H,
            overflow: 'hidden',
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          <CertificatePrintTemplate cert={cert} logoDataUrl={logoDataUrl} />
        </div>

        {/* ── Revoke modal ─────────────────────────────────────────────────── */}
        {confirmRev && (
          <div className="cert-modal-overlay" onClick={() => !working && setConfirmRev(false)}>
            <div className="cert-modal" onClick={(e) => e.stopPropagation()}>
              <p className="cert-modal-title">Revoke Certificate?</p>
              <p className="cert-modal-body">
                Revoking <strong>{cert.certificate_number}</strong> marks it as invalid and disables PDF download.
                You can re-issue it later if needed.
              </p>
              <div className="cert-modal-actions">
                <button className="cert-btn cert-btn--ghost" onClick={() => setConfirmRev(false)} disabled={working}>Cancel</button>
                <button className="cert-btn cert-btn--danger" onClick={handleRevoke} disabled={working}>
                  {working ? 'Revoking…' : 'Revoke'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete modal ──────────────────────────────────────────────────── */}
        {confirmDel && (
          <div className="cert-modal-overlay" onClick={() => !working && setConfirmDel(false)}>
            <div className="cert-modal" onClick={(e) => e.stopPropagation()}>
              <p className="cert-modal-title">Delete Certificate?</p>
              <p className="cert-modal-body">
                This will permanently delete <strong>{cert.certificate_number}</strong>. This action cannot be undone.
              </p>
              <div className="cert-modal-actions">
                <button className="cert-btn cert-btn--ghost" onClick={() => setConfirmDel(false)} disabled={working}>Cancel</button>
                <button className="cert-btn cert-btn--danger" onClick={handleDelete} disabled={working}>
                  {working ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
