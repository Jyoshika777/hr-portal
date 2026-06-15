import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getPayrollById, updatePayroll, deletePayroll } from '../../services/payrollService';
import { generatePayslipPDF } from '../../utils/generatePayslipPDF';
import '../../styles/Candidates.css';
import '../../styles/Payroll.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_LABELS = {
  pending:   'Pending',
  paid:      'Paid',
  on_hold:   'On Hold',
  cancelled: 'Cancelled',
};

const MODE_LABELS = {
  bank_transfer: 'Bank Transfer',
  cash:          'Cash',
  cheque:        'Cheque',
  upi:           'UPI',
};

// ── Formatting helpers ────────────────────────────────────────────────────────
function fmtINR(v) {
  if (v == null || v === '') return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(parseFloat(v) || 0);
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function payPeriod(p) {
  if (!p) return '—';
  return `${MONTHS[p.pay_month] ?? p.pay_month} ${p.pay_year}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoCard({ title, children, full }) {
  return (
    <div className={`pay-detail-card${full ? ' pay-detail-card--full' : ''}`}>
      <p className="pay-detail-card-title">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value, mono, amount, net, pre }) {
  let cls = 'pay-detail-value';
  if (mono)   cls += ' pay-detail-value--mono';
  if (amount) cls += ' pay-detail-value--amount';
  if (net)    cls += ' pay-detail-value--net';
  if (pre)    cls += ' pay-detail-value--pre';
  return (
    <div className="pay-detail-field">
      <span className="pay-detail-label">{label}</span>
      {pre
        ? <pre className={cls}>{value || '—'}</pre>
        : <span className={cls}>{value || '—'}</span>
      }
    </div>
  );
}

// ── Payslip HTML preview ──────────────────────────────────────────────────────
function PayslipPreview({ p }) {
  if (!p) return null;
  const CO_NAME    = 'TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED';
  const CO_ADDR    = 'Plot No. 12, Software Technology Park, Madhapur, Hyderabad – 500 081, Telangana';
  const CO_CONTACT = 'Tel: +91 40 6800 0000  |  hr@trivonsoftware.com';
  const CO_SIG     = 'Bhanu Pratap Dadi';
  const CO_TITLE   = 'Chief Executive Officer';

  const earnings = [
    { label: 'Basic Salary',        value: fmtINR(p.basic_salary)        },
    { label: 'HRA',                 value: fmtINR(p.hra)                 },
    { label: 'Transport Allowance', value: fmtINR(p.transport_allowance) },
    { label: 'Medical Allowance',   value: fmtINR(p.medical_allowance)   },
    { label: 'Other Allowances',    value: fmtINR(p.other_allowances)    },
  ];

  const deductions = [
    { label: 'Provident Fund (PF)', value: fmtINR(p.pf_deduction)      },
    { label: 'ESI',                 value: fmtINR(p.esi_deduction)      },
    { label: 'TDS / Income Tax',    value: fmtINR(p.tax_deduction)      },
    { label: 'Other Deductions',    value: fmtINR(p.other_deductions)   },
  ];

  const statusColor = {
    paid:      '#f0fdf4',
    pending:   '#eff6ff',
    on_hold:   '#fffbeb',
    cancelled: '#fef2f2',
  }[p.payment_status] ?? '#f1f5f9';

  return (
    <div className="pay-slip-doc">
      {/* ── Letterhead ── */}
      <div className="pay-slip-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="pay-slip-logo-box">TRIVON</div>
          <div>
            <p className="pay-slip-co-name">{CO_NAME}</p>
            <p className="pay-slip-co-sub">{CO_ADDR}</p>
            <p className="pay-slip-co-sub" style={{ marginTop: 2 }}>{CO_CONTACT}</p>
          </div>
        </div>
        <div className="pay-slip-title-box">
          <p className="pay-slip-title">SALARY PAYSLIP</p>
          <p className="pay-slip-period">For the period: <strong>{payPeriod(p)}</strong></p>
          <p className="pay-slip-period">Payslip No: <strong>{p.payroll_number}</strong></p>
        </div>
      </div>

      {/* ── Employee info ── */}
      <div className="pay-slip-section">Employee Information</div>
      <div className="pay-slip-info-grid">
        {[
          ['Employee ID',  p.employee_ref  ?? '—'],
          ['Employee Name',p.employee_name ?? '—'],
          ['Department',   p.department    ?? '—'],
          ['Designation',  p.designation   ?? '—'],
          ['Pay Period',   payPeriod(p)],
          ['Payment Mode', MODE_LABELS[p.payment_mode] ?? (p.payment_mode ?? '—')],
          ['Payment Date', p.payment_date ? fmtDate(p.payment_date) : '—'],
          ['Payment Status', STATUS_LABELS[p.payment_status] ?? p.payment_status],
        ].map(([label, value]) => (
          <div key={label} className="pay-slip-info-row">
            <span className="pay-slip-info-label">{label}</span>
            <span className="pay-slip-info-value">{value}</span>
          </div>
        ))}
      </div>

      {/* ── Attendance ── */}
      <div className="pay-slip-section">Attendance Summary</div>
      <div className="pay-slip-info-grid" style={{ gridTemplateColumns: '1fr' }}>
        {[
          ['Total Working Days', p.working_days ?? '—'],
          ['Days Worked',        p.days_worked ?? '—'],
          ['Leave / Absent Days', (p.working_days ?? 0) - (p.days_worked ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="pay-slip-info-row">
            <span className="pay-slip-info-label">{label}</span>
            <span className="pay-slip-info-value">{value}</span>
          </div>
        ))}
      </div>

      {/* ── Earnings / Deductions ── */}
      <div className="pay-slip-section">Earnings &amp; Deductions</div>
      <div className="pay-slip-table-wrap">
        <div className="pay-slip-col">
          <div className="pay-slip-col-head pay-slip-col-head--earn">Earnings</div>
          {earnings.map((row) => (
            <div key={row.label} className="pay-slip-comp-row">
              <span className="pay-slip-comp-name">{row.label}</span>
              <span className="pay-slip-comp-val">{row.value}</span>
            </div>
          ))}
          <div className="pay-slip-comp-row" style={{ background: '#eff6ff', fontWeight: 700 }}>
            <span style={{ color: '#1e40af', fontWeight: 700 }}>Gross Earnings</span>
            <span className="pay-slip-comp-val" style={{ color: '#1e40af' }}>
              {fmtINR(p.total_earnings)}
            </span>
          </div>
        </div>

        <div className="pay-slip-col">
          <div className="pay-slip-col-head pay-slip-col-head--ded">Deductions</div>
          {deductions.map((row) => (
            <div key={row.label} className="pay-slip-comp-row">
              <span className="pay-slip-comp-name">{row.label}</span>
              <span className="pay-slip-comp-val">{row.value}</span>
            </div>
          ))}
          {/* Pad to match earnings rows */}
          {Array.from({ length: Math.max(0, earnings.length - deductions.length) }).map((_, i) => (
            <div key={`pad-${i}`} className="pay-slip-comp-row">
              <span className="pay-slip-comp-name">—</span>
              <span className="pay-slip-comp-val">—</span>
            </div>
          ))}
          <div className="pay-slip-comp-row" style={{ background: '#fef2f2', fontWeight: 700 }}>
            <span style={{ color: '#b91c1c', fontWeight: 700 }}>Total Deductions</span>
            <span className="pay-slip-comp-val" style={{ color: '#b91c1c' }}>
              {fmtINR(p.total_deductions)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Net salary bar ── */}
      <div className="pay-slip-net-bar">
        <div className="pay-slip-net-items">
          <span>Gross: <strong>{fmtINR(p.total_earnings)}</strong></span>
          <span>Deductions: <strong>{fmtINR(p.total_deductions)}</strong></span>
        </div>
        <div>
          <div className="pay-slip-net-label">NET SALARY</div>
          <div className="pay-slip-net-amount">{fmtINR(p.net_salary)}</div>
        </div>
      </div>

      {/* ── Remarks ── */}
      {p.remarks && (
        <>
          <div className="pay-slip-section">Remarks</div>
          <p style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
            {p.remarks}
          </p>
        </>
      )}

      {/* ── Terms ── */}
      <div className="pay-slip-section">Terms &amp; Conditions</div>
      <ol style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, paddingLeft: 18, margin: '8px 0' }}>
        <li>This is a computer-generated payslip and is valid without a physical signature.</li>
        <li>PF is computed at 12% of Basic Salary (employee contribution). ESI applies where applicable.</li>
        <li>TDS is deducted based on estimated annual income as per prevailing tax slabs.</li>
        <li>Disputes must be reported to HR within 7 working days of this payslip.</li>
        <li>This document is confidential. Do not share outside the organisation.</li>
      </ol>

      {/* ── Signature ── */}
      <div className="pay-slip-sig-row">
        <div>
          <div className="pay-slip-sig-line" />
          <p className="pay-slip-sig-name">{CO_SIG}</p>
          <p className="pay-slip-sig-title">{CO_TITLE}</p>
          <p className="pay-slip-sig-title">{CO_NAME}</p>
        </div>
        <div>
          <div className="pay-slip-sig-line" />
          <p className="pay-slip-sig-name">{p.employee_name}</p>
          <p className="pay-slip-sig-title">{p.employee_ref}</p>
          <p className="pay-slip-sig-title">Employee Signature &amp; Date</p>
        </div>
      </div>

      {/* ── Payment status stamp ── */}
      <div style={{
        marginTop: 24, textAlign: 'center',
        padding: '10px 20px', borderRadius: 6,
        background: statusColor,
        border: `1.5px solid ${statusColor === '#f0fdf4' ? '#bbf7d0' : statusColor === '#eff6ff' ? '#bfdbfe' : statusColor === '#fffbeb' ? '#fef08a' : '#fecaca'}`,
        fontFamily: 'Arial, sans-serif',
        fontSize: 12.5,
        fontWeight: 700,
        color: statusColor === '#f0fdf4' ? '#15803d' : statusColor === '#eff6ff' ? '#1d4ed8' : statusColor === '#fffbeb' ? '#b45309' : '#b91c1c',
      }}>
        Payment Status: {STATUS_LABELS[p.payment_status] ?? p.payment_status}
        {p.payment_date ? ` — Paid on ${fmtDate(p.payment_date)}` : ''}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PayrollDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [payroll,       setPayroll]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [activeTab,     setActiveTab]     = useState('details');
  const [statusUpdating,setStatusUpdating]= useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [downloading,   setDownloading]   = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getPayrollById(id)
      .then((data) => { if (active) { setPayroll(data); setLoading(false); } })
      .catch((err) => { if (active) { setError(err.message); setLoading(false); } });
    return () => { active = false; };
  }, [id]);

  async function markStatus(status) {
    setStatusUpdating(true);
    try {
      const updated = await updatePayroll(id, {
        payment_status: status,
        ...(status === 'paid' && !payroll.payment_date
          ? { payment_date: new Date().toISOString().slice(0, 10) }
          : {}),
      });
      setPayroll(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePayroll(id);
      navigate('/payroll');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  function handleDownload() {
    setDownloading(true);
    try {
      generatePayslipPDF(payroll);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="page-header">
          <div>
            <Link to="/payroll" className="back-link">← Payroll</Link>
            <h2 className="page-title" style={{ marginTop: 4 }}>Payroll Detail</h2>
          </div>
        </div>
        <p style={{ color: '#64748b' }}>Loading…</p>
      </Layout>
    );
  }

  if (error && !payroll) {
    return (
      <Layout>
        <Link to="/payroll" className="back-link">← Payroll</Link>
        <div className="alert-error" style={{ marginTop: 12 }}>{error}</div>
      </Layout>
    );
  }

  const p = payroll;
  const isPending  = p.payment_status === 'pending';
  const isPaid     = p.payment_status === 'paid';
  const isOnHold   = p.payment_status === 'on_hold';
  const isFinal    = isPaid;

  return (
    <Layout>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/payroll" className="back-link">← Payroll</Link>

        <div className="page-header" style={{ marginTop: 8, marginBottom: 0 }}>
          <div>
            <h2 className="page-title" style={{ marginBottom: 4 }}>
              {p.payroll_number}
              <span className={`status-badge status-pay-${p.payment_status}`}
                style={{ marginLeft: 12, verticalAlign: 'middle', fontSize: 13 }}>
                {STATUS_LABELS[p.payment_status] ?? p.payment_status}
              </span>
            </h2>
            <p className="page-subtitle">
              {p.employee_name} ({p.employee_ref}) &nbsp;·&nbsp; {payPeriod(p)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status workflow */}
            {isPending && (
              <>
                <button
                  className="btn-ghost"
                  style={{ color: '#15803d', borderColor: '#bbf7d0' }}
                  disabled={statusUpdating}
                  onClick={() => markStatus('paid')}
                >
                  {statusUpdating ? '…' : '✓ Mark Paid'}
                </button>
                <button
                  className="btn-ghost"
                  style={{ color: '#b45309', borderColor: '#fef08a' }}
                  disabled={statusUpdating}
                  onClick={() => markStatus('on_hold')}
                >
                  {statusUpdating ? '…' : 'Put On Hold'}
                </button>
              </>
            )}
            {isOnHold && (
              <button
                className="btn-ghost"
                style={{ color: '#15803d', borderColor: '#bbf7d0' }}
                disabled={statusUpdating}
                onClick={() => markStatus('paid')}
              >
                {statusUpdating ? '…' : '✓ Mark Paid'}
              </button>
            )}
            {!isFinal && (
              <button
                className="btn-ghost"
                style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                disabled={statusUpdating}
                onClick={() => markStatus('cancelled')}
              >
                {statusUpdating ? '…' : 'Cancel Payroll'}
              </button>
            )}

            {/* Core actions */}
            <Link to={`/payroll/${id}/edit`} className="btn-ghost">Edit</Link>
            <button
              className="btn-primary"
              style={{ background: '#1e40af' }}
              disabled={downloading}
              onClick={handleDownload}
            >
              {downloading ? 'Generating…' : '↓ Download Payslip'}
            </button>
            <button className="btn-ghost action-link--danger" onClick={() => setDeleteConfirm(true)}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Tab bar ── */}
      <div className="pay-tabs">
        <button
          className={`pay-tab-btn${activeTab === 'details' ? ' pay-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`pay-tab-btn${activeTab === 'preview' ? ' pay-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          Payslip Preview
        </button>
      </div>

      {/* ══ DETAILS TAB ═══════════════════════════════════════════════════════ */}
      {activeTab === 'details' && (
        <>
          <div className="pay-detail-grid">
            {/* Employee Info */}
            <InfoCard title="Employee Information">
              <div className="pay-detail-fields">
                <Field label="Employee ID"  value={p.employee_ref}  mono />
                <Field label="Employee Name" value={p.employee_name} />
                <Field label="Department"   value={p.department ?? '—'} />
                <Field label="Designation"  value={p.designation ?? '—'} />
              </div>
            </InfoCard>

            {/* Payroll Summary */}
            <InfoCard title="Payroll Summary">
              <div className="pay-detail-fields">
                <Field label="Payroll Number" value={p.payroll_number} mono />
                <Field label="Pay Period"     value={payPeriod(p)} />
                <Field label="Payment Status"
                  value={
                    <span className={`status-badge status-pay-${p.payment_status}`}>
                      {STATUS_LABELS[p.payment_status] ?? p.payment_status}
                    </span>
                  }
                />
                <Field label="Payment Mode"
                  value={MODE_LABELS[p.payment_mode] ?? p.payment_mode} />
                <Field label="Payment Date"   value={fmtDate(p.payment_date)} />
                <Field label="Created"
                  value={p.created_at
                    ? new Date(p.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '—'}
                />
              </div>
            </InfoCard>

            {/* Attendance */}
            <InfoCard title="Attendance">
              <div className="pay-detail-fields">
                <Field label="Working Days"    value={p.working_days ?? '—'} />
                <Field label="Days Worked"     value={p.days_worked  ?? '—'} />
                <Field label="Leave / Absent"  value={(p.working_days ?? 0) - (p.days_worked ?? 0)} />
              </div>
            </InfoCard>

            {/* Net Salary highlight */}
            <InfoCard title="Net Salary">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                <div className="pay-detail-field">
                  <span className="pay-detail-label">Gross Earnings</span>
                  <span className="pay-detail-value pay-detail-value--amount">{fmtINR(p.total_earnings)}</span>
                </div>
                <div className="pay-detail-field">
                  <span className="pay-detail-label">Total Deductions</span>
                  <span className="pay-detail-value" style={{ color: '#b91c1c', fontWeight: 700, fontSize: 16 }}>
                    − {fmtINR(p.total_deductions)}
                  </span>
                </div>
                <div style={{ height: 1, background: '#e2e8f0', width: '100%' }} />
                <div className="pay-detail-field">
                  <span className="pay-detail-label">Take-Home Net</span>
                  <span className={`pay-detail-value pay-detail-value--net${parseFloat(p.net_salary) < 0 ? ' pay-summary-value--negative' : ''}`}>
                    {fmtINR(p.net_salary)}
                  </span>
                </div>
              </div>
            </InfoCard>
          </div>

          {/* Earnings breakdown */}
          <div className="pay-detail-grid">
            <InfoCard title="Earnings Breakdown">
              <table className="pay-breakdown-table">
                <thead>
                  <tr><th>Component</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Basic Salary',        p.basic_salary],
                    ['HRA',                 p.hra],
                    ['Transport Allowance', p.transport_allowance],
                    ['Medical Allowance',   p.medical_allowance],
                    ['Other Allowances',    p.other_allowances],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{fmtINR(val)}</td>
                    </tr>
                  ))}
                  <tr className="row-total">
                    <td><strong>Gross Earnings</strong></td>
                    <td><strong>{fmtINR(p.total_earnings)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </InfoCard>

            <InfoCard title="Deductions Breakdown">
              <table className="pay-breakdown-table">
                <thead>
                  <tr><th>Deduction</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Provident Fund (PF)', p.pf_deduction],
                    ['ESI',                p.esi_deduction],
                    ['TDS / Income Tax',   p.tax_deduction],
                    ['Other Deductions',   p.other_deductions],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{fmtINR(val)}</td>
                    </tr>
                  ))}
                  <tr className="row-total row-total-ded">
                    <td><strong>Total Deductions</strong></td>
                    <td><strong>{fmtINR(p.total_deductions)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </InfoCard>
          </div>

          {/* Remarks */}
          {p.remarks && (
            <InfoCard title="Remarks" full>
              <Field value={p.remarks} pre />
            </InfoCard>
          )}
        </>
      )}

      {/* ══ PAYSLIP PREVIEW TAB ══════════════════════════════════════════════ */}
      {activeTab === 'preview' && (
        <>
          <div className="pay-preview-bar">
            <p className="pay-preview-note">
              HTML preview — matches the PDF payslip. Use the Download button to save a PDF.
            </p>
            <button
              className="btn-primary"
              style={{ background: '#1e40af' }}
              disabled={downloading}
              onClick={handleDownload}
            >
              {downloading ? 'Generating…' : '↓ Download PDF'}
            </button>
          </div>
          <div className="pay-preview-wrap">
            <PayslipPreview p={p} />
          </div>
        </>
      )}

      {/* ── Delete modal ── */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Payroll Record</h3>
            <p className="modal-body">
              Permanently delete payroll <strong>{p.payroll_number}</strong> for{' '}
              <strong>{p.employee_name}</strong> ({payPeriod(p)})?{' '}
              This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
