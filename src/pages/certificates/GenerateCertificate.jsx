import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { createCertificate, CERT_TYPES } from '../../services/certificateService';
import '../../styles/Candidates.css';
import '../../styles/Certificates.css';

const TODAY = new Date().toISOString().split('T')[0];

const TEMPLATE_OPTIONS = [
  {
    value: 'classic',
    name: 'Classic Prestige',
    desc: 'Elegant double border, centered layout, traditional formal design',
    preview: (
      <div style={{ height: 76, background: '#fff', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden', borderRadius: '8px 8px 0 0', border: '2px solid #cbd5e1' }}>
        <div style={{ position: 'absolute', top: 4, left: 4, width: 12, height: 12, borderTop: '2.5px solid #4f46e5', borderLeft: '2.5px solid #4f46e5' }} />
        <div style={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderTop: '2.5px solid #4f46e5', borderRight: '2.5px solid #4f46e5' }} />
        <div style={{ position: 'absolute', bottom: 4, left: 4, width: 12, height: 12, borderBottom: '2.5px solid #4f46e5', borderLeft: '2.5px solid #4f46e5' }} />
        <div style={{ position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, borderBottom: '2.5px solid #4f46e5', borderRight: '2.5px solid #4f46e5' }} />
        <div style={{ width: 18, height: 18, background: '#4f46e5', borderRadius: 4 }} />
        <div style={{ fontSize: 8, fontWeight: 800, color: '#1e40af', letterSpacing: 0.5 }}>CERTIFICATE</div>
        <div style={{ width: 48, height: 1.5, background: '#4f46e5', borderRadius: 2 }} />
        <div style={{ fontSize: 7, color: '#94a3b8', fontStyle: 'italic' }}>Recipient Name</div>
      </div>
    ),
  },
  {
    value: 'modern',
    name: 'Modern Executive',
    desc: 'Left accent sidebar, gradient header, contemporary corporate design',
    preview: (
      <div style={{ height: 76, display: 'flex', borderRadius: '8px 8px 0 0', overflow: 'hidden', border: '2px solid #cbd5e1' }}>
        <div style={{ width: 14, background: '#4f46e5', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          {[0,1,2,3].map((i) => <div key={i} style={{ width: 6, height: 1, background: 'rgba(255,255,255,0.45)' }} />)}
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(180deg, #4338ca 0%, #6366f1 100%)', padding: '7px 8px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: '#fff', borderRadius: 2, flexShrink: 0 }} />
            <div style={{ width: '70%', height: 4, background: 'rgba(255,255,255,0.85)', borderRadius: 2 }} />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ background: '#fff', borderRadius: '4px 4px 0 0', padding: '5px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ width: '35%', height: 3, background: '#e2e8f0', borderRadius: 2 }} />
            <div style={{ width: '70%', height: 5, background: '#4f46e5', borderRadius: 2 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    value: 'elite',
    name: 'Elite Award',
    desc: 'Dark premium header, award seal, maximum impact for prestigious awards',
    preview: (
      <div style={{ height: 76, borderRadius: '8px 8px 0 0', overflow: 'hidden', border: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 38, background: '#0f172a', position: 'relative', display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#4f46e5' }} />
          <div style={{ width: 13, height: 13, background: '#4f46e5', borderRadius: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ width: '80%', height: 3.5, background: 'rgba(255,255,255,0.8)', borderRadius: 2 }} />
            <div style={{ width: '55%', height: 2.5, background: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
          </div>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#4f46e5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #818cf8' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5' }} />
            </div>
          </div>
        </div>
        <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <div style={{ fontSize: 7, color: '#94a3b8', fontStyle: 'italic' }}>This is to certify that</div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#4f46e5', fontStyle: 'italic' }}>Recipient Name</div>
          <div style={{ width: 56, height: 2, background: 'linear-gradient(90deg, #4f46e5 60%, #818cf8 80%, #dbeafe 100%)', borderRadius: 2 }} />
        </div>
      </div>
    ),
  },
];

const TYPE_META = {
  internship_completion: {
    icon: '🎓',
    programLabel: 'Department / Area',
    programPlaceholder: 'e.g. Software Development',
    showDates: true,
    dateLabel: 'Internship Period',
  },
  training_completion: {
    icon: '📚',
    programLabel: 'Training Program Name',
    programPlaceholder: 'e.g. Leadership & Management',
    showDates: true,
    dateLabel: 'Training Period',
  },
  employee_recognition: {
    icon: '🏆',
    programLabel: 'Reason / Contribution',
    programPlaceholder: 'e.g. Outstanding Customer Service',
    showDates: false,
    dateLabel: '',
  },
  appreciation: {
    icon: '🌟',
    programLabel: 'Reason / Initiative',
    programPlaceholder: 'e.g. Project Delivery Excellence',
    showDates: false,
    dateLabel: '',
  },
  achievement: {
    icon: '🥇',
    programLabel: 'Achievement Description',
    programPlaceholder: 'e.g. Top Sales Performer Q1 2026',
    showDates: false,
    dateLabel: '',
  },
  course_completion: {
    icon: '📜',
    programLabel: 'Course Name',
    programPlaceholder: 'e.g. Advanced React Development',
    showDates: true,
    dateLabel: 'Course Period',
  },
};

const EMPTY = {
  recipient_name:   '',
  employee_id:      '',
  certificate_type: 'internship_completion',
  program_name:     '',
  start_date:       '',
  end_date:         '',
  issue_date:       TODAY,
  signatory_name:   'Bhanu Pratap Dadi',
  signatory_title:  'Chief Executive Officer',
  status:           'issued',
  notes:            '',
  template:         'classic',
};

export default function GenerateCertificate() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const meta = TYPE_META[form.certificate_type] || TYPE_META.internship_completion;

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleTypeSelect = (type) => {
    setForm((f) => ({
      ...f,
      certificate_type: type,
      program_name: '',
      start_date: '',
      end_date: '',
    }));
  };

  const validate = () => {
    if (!form.recipient_name.trim()) return 'Recipient name is required.';
    if (!form.certificate_type)      return 'Certificate type is required.';
    if (!form.issue_date)            return 'Issue date is required.';
    if (!form.signatory_name.trim()) return 'Signatory name is required.';
    if (!form.signatory_title.trim())return 'Signatory title is required.';
    if (meta.showDates && form.start_date && form.end_date && form.end_date < form.start_date)
      return 'End date cannot be before start date.';
    return null;
  };

  const handleSubmit = async (e, asDraft = false) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const cert = await createCertificate({
        ...form,
        recipient_name:  form.recipient_name.trim(),
        signatory_name:  form.signatory_name.trim(),
        signatory_title: form.signatory_title.trim(),
        program_name:    form.program_name.trim() || null,
        employee_id:     form.employee_id.trim()  || null,
        notes:           form.notes.trim()         || null,
        start_date:      form.start_date || null,
        end_date:        form.end_date   || null,
        status:          asDraft ? 'draft' : 'issued',
      });
      setSuccess(`Certificate ${cert.certificate_number} generated successfully!`);
      setTimeout(() => navigate(`/certificates/${cert.id}`), 1200);
    } catch (e) {
      setError(e.message || 'Failed to generate certificate');
    }
    setSaving(false);
  };

  return (
    <Layout>
      <div className="cand-page">
        <Link to="/certificates" className="cert-back">
          ← Back to Certificates
        </Link>

        <div className="cert-page-header">
          <div className="cert-page-title-group">
            <h1 className="cert-page-title">Generate Certificate</h1>
            <p className="cert-page-subtitle">Create and issue a new certificate</p>
          </div>
        </div>

        {error   && <div className="cert-alert cert-alert--error">⚠ {error}</div>}
        {success && <div className="cert-alert cert-alert--success">✓ {success}</div>}

        <form onSubmit={(e) => handleSubmit(e, false)} noValidate>

          {/* Design template picker */}
          <div className="cert-form-card">
            <p className="cert-form-section-title">Certificate Design</p>
            <div className="cert-tpl-picker">
              {TEMPLATE_OPTIONS.map((tpl) => (
                <button
                  type="button"
                  key={tpl.value}
                  className={`cert-tpl-option${form.template === tpl.value ? ' cert-tpl-option--active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, template: tpl.value }))}
                >
                  <div className="cert-tpl-preview">{tpl.preview}</div>
                  <div className="cert-tpl-info">
                    <div className="cert-tpl-name">{tpl.name}</div>
                    <div className="cert-tpl-desc">{tpl.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Certificate type */}
          <div className="cert-form-card">
            <p className="cert-form-section-title">Certificate Type</p>
            <div className="cert-type-picker">
              {Object.entries(CERT_TYPES).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`cert-type-option${form.certificate_type === value ? ' cert-type-option--active' : ''}`}
                  onClick={() => handleTypeSelect(value)}
                >
                  <span className="cert-type-option-icon">{TYPE_META[value].icon}</span>
                  <span className="cert-type-option-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient details */}
          <div className="cert-form-card">
            <p className="cert-form-section-title">Recipient Information</p>
            <div className="cert-form-grid">
              <div className="cert-field">
                <label className="cert-label cert-label--req">Recipient Name</label>
                <input
                  className="cert-input"
                  placeholder="Full name of the recipient"
                  value={form.recipient_name}
                  onChange={(e) => set('recipient_name', e.target.value)}
                  required
                />
              </div>
              <div className="cert-field">
                <label className="cert-label">Employee ID</label>
                <input
                  className="cert-input"
                  placeholder="Optional employee or intern ID"
                  value={form.employee_id}
                  onChange={(e) => set('employee_id', e.target.value)}
                />
              </div>
              <div className="cert-field cert-form-col-2">
                <label className="cert-label">{meta.programLabel}</label>
                <input
                  className="cert-input"
                  placeholder={meta.programPlaceholder}
                  value={form.program_name}
                  onChange={(e) => set('program_name', e.target.value)}
                />
              </div>
              {meta.showDates && (
                <>
                  <div className="cert-field">
                    <label className="cert-label">Start Date</label>
                    <input
                      type="date" className="cert-input"
                      value={form.start_date}
                      onChange={(e) => set('start_date', e.target.value)}
                    />
                    <span className="cert-hint">{meta.dateLabel} — start</span>
                  </div>
                  <div className="cert-field">
                    <label className="cert-label">End Date</label>
                    <input
                      type="date" className="cert-input"
                      value={form.end_date}
                      min={form.start_date || undefined}
                      onChange={(e) => set('end_date', e.target.value)}
                    />
                    <span className="cert-hint">{meta.dateLabel} — end</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Certificate details */}
          <div className="cert-form-card">
            <p className="cert-form-section-title">Certificate Details</p>
            <div className="cert-form-grid cert-form-grid--3">
              <div className="cert-field">
                <label className="cert-label cert-label--req">Issue Date</label>
                <input
                  type="date" className="cert-input"
                  value={form.issue_date}
                  onChange={(e) => set('issue_date', e.target.value)}
                  required
                />
              </div>
              <div className="cert-field">
                <label className="cert-label cert-label--req">Signatory Name</label>
                <input
                  className="cert-input"
                  placeholder="Name of the authorized signatory"
                  value={form.signatory_name}
                  onChange={(e) => set('signatory_name', e.target.value)}
                  required
                />
              </div>
              <div className="cert-field">
                <label className="cert-label cert-label--req">Signatory Title</label>
                <input
                  className="cert-input"
                  placeholder="e.g. Chief Executive Officer"
                  value={form.signatory_title}
                  onChange={(e) => set('signatory_title', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="cert-form-card">
            <p className="cert-form-section-title">Additional Notes</p>
            <div className="cert-field">
              <label className="cert-label">Internal Notes</label>
              <textarea
                className="cert-textarea"
                placeholder="Internal notes — not shown on the certificate"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
              <span className="cert-hint">These notes are for record-keeping only and will not appear on the printed certificate.</span>
            </div>
          </div>

          <div className="cert-form-actions">
            <button type="submit" className="cert-btn cert-btn--primary" disabled={saving}>
              {saving ? 'Generating…' : '✓ Generate & Issue Certificate'}
            </button>
            <button
              type="button"
              className="cert-btn cert-btn--ghost"
              disabled={saving}
              onClick={(e) => handleSubmit(e, true)}
            >
              Save as Draft
            </button>
            <Link to="/certificates" className="cert-btn cert-btn--ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
