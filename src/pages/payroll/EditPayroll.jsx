import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getPayrollById, updatePayroll } from '../../services/payrollService';
import '../../styles/Candidates.css';
import '../../styles/Payroll.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_OPTIONS = [
  { value: 1,  label: 'January'   }, { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     }, { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       }, { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      }, { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' }, { value: 10, label: 'October'   },
  { value: 11, label: 'November'  }, { value: 12, label: 'December'  },
];

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pending'   },
  { value: 'paid',      label: 'Paid'      },
  { value: 'on_hold',   label: 'On Hold'   },
  { value: 'cancelled', label: 'Cancelled' },
];

const MODE_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash',          label: 'Cash'          },
  { value: 'cheque',        label: 'Cheque'        },
  { value: 'upi',           label: 'UPI'           },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function recordToForm(p) {
  return {
    pay_month:            p.pay_month     ?? 1,
    pay_year:             p.pay_year      ?? new Date().getFullYear(),
    basic_salary:         p.basic_salary         ?? '',
    hra:                  p.hra                  ?? '',
    transport_allowance:  p.transport_allowance  ?? '',
    medical_allowance:    p.medical_allowance     ?? '',
    other_allowances:     p.other_allowances     ?? '',
    pf_deduction:         p.pf_deduction         ?? '',
    esi_deduction:        p.esi_deduction        ?? '',
    tax_deduction:        p.tax_deduction        ?? '',
    other_deductions:     p.other_deductions     ?? '',
    payment_status:       p.payment_status ?? 'pending',
    payment_date:         p.payment_date   ?? '',
    payment_mode:         p.payment_mode   ?? 'bank_transfer',
    working_days:         p.working_days   ?? 26,
    days_worked:          p.days_worked    ?? 26,
    remarks:              p.remarks        ?? '',
  };
}

function validate(f) {
  const e = {};

  if (!f.pay_month)
    e.pay_month = 'Required';
  if (!f.pay_year || isNaN(Number(f.pay_year)) || Number(f.pay_year) < 2020)
    e.pay_year = 'Enter a valid year (2020 or later)';
  if (!f.basic_salary || num(f.basic_salary) <= 0)
    e.basic_salary = 'Basic salary must be greater than zero';

  const posOrZero = (val, key, label) => {
    if (val !== '' && val !== undefined && val !== null) {
      if (isNaN(num(val)) || num(val) < 0)
        e[key] = `${label} cannot be negative`;
    }
  };
  posOrZero(f.hra,                 'hra',                 'HRA');
  posOrZero(f.transport_allowance, 'transport_allowance', 'Transport allowance');
  posOrZero(f.medical_allowance,   'medical_allowance',   'Medical allowance');
  posOrZero(f.other_allowances,    'other_allowances',    'Other allowances');
  posOrZero(f.pf_deduction,        'pf_deduction',        'PF deduction');
  posOrZero(f.esi_deduction,       'esi_deduction',       'ESI deduction');
  posOrZero(f.tax_deduction,       'tax_deduction',       'Tax deduction');
  posOrZero(f.other_deductions,    'other_deductions',    'Other deductions');

  const wd = parseInt(f.working_days, 10);
  const dw = parseInt(f.days_worked,  10);
  if (!f.working_days || isNaN(wd) || wd < 1)
    e.working_days = 'Must be at least 1';
  if (isNaN(dw) || dw < 0)
    e.days_worked = 'Cannot be negative';
  else if (!isNaN(wd) && dw > wd)
    e.days_worked = `Cannot exceed working days (${wd})`;

  return e;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({ label, error, hint, children, span }) {
  return (
    <div className="form-field" style={span ? { gridColumn: '1 / -1' } : undefined}>
      <label className="form-label">{label}</label>
      {children}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

function SectionDivider({ title, subtitle }) {
  return (
    <div className="pay-section-divider">
      <p className="pay-section-title">{title}</p>
      {subtitle && <p className="pay-section-sub">{subtitle}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EditPayroll() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [payroll,  setPayroll]  = useState(null);
  const [form,     setForm]     = useState(null);
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    getPayrollById(id)
      .then((p) => { setPayroll(p); setForm(recordToForm(p)); setLoading(false); })
      .catch((err) => { setApiError(err.message); setLoading(false); });
  }, [id]);

  // Live totals
  const totalEarnings   = form
    ? num(form.basic_salary) + num(form.hra) + num(form.transport_allowance)
      + num(form.medical_allowance) + num(form.other_allowances)
    : 0;
  const totalDeductions = form
    ? num(form.pf_deduction) + num(form.esi_deduction)
      + num(form.tax_deduction) + num(form.other_deductions)
    : 0;
  const netSalary = totalEarnings - totalDeductions;

  function set(field) {
    return (e) => {
      const val = e.target.value;
      setForm((f) => ({ ...f, [field]: val }));
      if (errors[field]) setErrors((er) => { const c = { ...er }; delete c[field]; return c; });
    };
  }

  const fmtCurrency = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(v);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');
    try {
      const payload = {
        pay_month:           parseInt(form.pay_month,    10),
        pay_year:            parseInt(form.pay_year,     10),
        basic_salary:        num(form.basic_salary),
        hra:                 num(form.hra)                 || 0,
        transport_allowance: num(form.transport_allowance) || 0,
        medical_allowance:   num(form.medical_allowance)   || 0,
        other_allowances:    num(form.other_allowances)    || 0,
        pf_deduction:        num(form.pf_deduction)        || 0,
        esi_deduction:       num(form.esi_deduction)       || 0,
        tax_deduction:       num(form.tax_deduction)       || 0,
        other_deductions:    num(form.other_deductions)    || 0,
        payment_status:      form.payment_status,
        payment_date:        form.payment_date || null,
        payment_mode:        form.payment_mode,
        working_days:        parseInt(form.working_days, 10),
        days_worked:         parseInt(form.days_worked,  10),
        remarks:             form.remarks.trim() || null,
      };
      await updatePayroll(id, payload);
      navigate(`/payroll/${id}`);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <Link to="/payroll" className="back-link">← Payroll</Link>
        <p style={{ color: '#64748b', marginTop: 12 }}>Loading…</p>
      </Layout>
    );
  }

  if (!form) {
    return (
      <Layout>
        <Link to="/payroll" className="back-link">← Payroll</Link>
        <div className="alert-error" style={{ marginTop: 12 }}>{apiError || 'Record not found.'}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to={`/payroll/${id}`} className="back-link">← {payroll?.payroll_number}</Link>
          <h2 className="page-title" style={{ marginTop: 4 }}>Edit Payroll Record</h2>
          <p className="page-subtitle">
            {payroll?.employee_name} ({payroll?.employee_ref})
          </p>
        </div>
      </div>

      {apiError && <div className="alert-error" style={{ marginBottom: 16 }}>{apiError}</div>}

      {/* Locked employee banner */}
      <div className="pay-emp-selected-card" style={{ maxWidth: 860, marginBottom: 24 }}>
        <p className="pay-emp-selected-ref">{payroll?.employee_ref}</p>
        <p className="pay-emp-selected-name">{payroll?.employee_name}</p>
        <p className="pay-emp-selected-meta">
          {[payroll?.department, payroll?.designation].filter(Boolean).join(' · ')}&ensp;
          <span style={{ color: '#94a3b8', fontSize: 11 }}>
            Employee cannot be changed on an existing payroll record.
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="pay-form">

        {/* ══ Pay Period ════════════════════════════════════════════════════ */}
        <SectionDivider title="Pay Period" />
        <div className="pay-form-grid-3">
          <Field label="Month *" error={errors.pay_month}>
            <select
              className={`form-select${errors.pay_month ? ' form-input--error' : ''}`}
              value={form.pay_month}
              onChange={set('pay_month')}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Year *" error={errors.pay_year}>
            <input
              type="number"
              className={`form-input${errors.pay_year ? ' form-input--error' : ''}`}
              value={form.pay_year}
              min={2020}
              max={2100}
              onChange={set('pay_year')}
            />
          </Field>

          <div />

          <Field label="Working Days *" error={errors.working_days}>
            <input
              type="number"
              className={`form-input${errors.working_days ? ' form-input--error' : ''}`}
              value={form.working_days}
              min={1}
              max={31}
              onChange={set('working_days')}
            />
          </Field>

          <Field label="Days Worked *" error={errors.days_worked}>
            <input
              type="number"
              className={`form-input${errors.days_worked ? ' form-input--error' : ''}`}
              value={form.days_worked}
              min={0}
              max={form.working_days}
              onChange={set('days_worked')}
            />
          </Field>
        </div>

        {/* ══ Earnings ══════════════════════════════════════════════════════ */}
        <SectionDivider title="Earnings" subtitle="All amounts in INR (₹) per month" />
        <div className="pay-form-grid">
          <Field label="Basic Salary *" error={errors.basic_salary}>
            <input type="number" className={`form-input${errors.basic_salary ? ' form-input--error' : ''}`}
              placeholder="0.00" value={form.basic_salary} min={0} step="0.01" onChange={set('basic_salary')} />
          </Field>
          <Field label="HRA" error={errors.hra}>
            <input type="number" className="form-input" placeholder="0.00"
              value={form.hra} min={0} step="0.01" onChange={set('hra')} />
          </Field>
          <Field label="Transport Allowance" error={errors.transport_allowance}>
            <input type="number" className="form-input" placeholder="0.00"
              value={form.transport_allowance} min={0} step="0.01" onChange={set('transport_allowance')} />
          </Field>
          <Field label="Medical Allowance" error={errors.medical_allowance}>
            <input type="number" className="form-input" placeholder="0.00"
              value={form.medical_allowance} min={0} step="0.01" onChange={set('medical_allowance')} />
          </Field>
          <Field label="Other Allowances" error={errors.other_allowances}>
            <input type="number" className="form-input" placeholder="0.00"
              value={form.other_allowances} min={0} step="0.01" onChange={set('other_allowances')} />
          </Field>
        </div>

        {/* ══ Deductions ════════════════════════════════════════════════════ */}
        <SectionDivider title="Deductions" />
        <div className="pay-form-grid">
          <Field label="Provident Fund (PF)" error={errors.pf_deduction}>
            <input type="number" className="form-input" placeholder="0.00"
              value={form.pf_deduction} min={0} step="0.01" onChange={set('pf_deduction')} />
          </Field>
          <Field label="ESI" error={errors.esi_deduction}>
            <input type="number" className="form-input" placeholder="0.00"
              value={form.esi_deduction} min={0} step="0.01" onChange={set('esi_deduction')} />
          </Field>
          <Field label="TDS / Income Tax" error={errors.tax_deduction}>
            <input type="number" className="form-input" placeholder="0.00"
              value={form.tax_deduction} min={0} step="0.01" onChange={set('tax_deduction')} />
          </Field>
          <Field label="Other Deductions" error={errors.other_deductions}>
            <input type="number" className="form-input" placeholder="0.00"
              value={form.other_deductions} min={0} step="0.01" onChange={set('other_deductions')} />
          </Field>
        </div>

        {/* ══ Live salary summary ═══════════════════════════════════════════ */}
        <div className="pay-summary-card">
          <div className="pay-summary-row">
            <span className="pay-summary-label">Gross Earnings</span>
            <span className="pay-summary-value">{fmtCurrency(totalEarnings)}</span>
          </div>
          <div className="pay-summary-row">
            <span className="pay-summary-label">Total Deductions</span>
            <span className="pay-summary-value pay-summary-value--ded">
              − {fmtCurrency(totalDeductions)}
            </span>
          </div>
          <div className="pay-summary-divider" />
          <div className="pay-summary-row pay-summary-row--net">
            <span className="pay-summary-label--net">Net Salary (Take-Home)</span>
            <span className={`pay-summary-value--net${netSalary < 0 ? ' pay-summary-value--negative' : ''}`}>
              {fmtCurrency(netSalary)}
            </span>
          </div>
        </div>

        {/* ══ Payment Info ══════════════════════════════════════════════════ */}
        <SectionDivider title="Payment Information" />
        <div className="pay-form-grid-3">
          <Field label="Payment Status" error={errors.payment_status}>
            <select className="form-select" value={form.payment_status} onChange={set('payment_status')}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment Mode" error={errors.payment_mode}>
            <select className="form-select" value={form.payment_mode} onChange={set('payment_mode')}>
              {MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment Date" hint="Leave blank if not yet paid">
            <input type="date" className="form-input" value={form.payment_date} onChange={set('payment_date')} />
          </Field>
        </div>

        {/* ══ Remarks ═══════════════════════════════════════════════════════ */}
        <SectionDivider title="Remarks" />
        <div className="pay-form-grid">
          <Field label="Additional Remarks (optional)" span>
            <textarea className="form-textarea" rows={3}
              placeholder="Any notes about this payroll record…"
              value={form.remarks} onChange={set('remarks')} />
          </Field>
        </div>

        {/* ══ Form actions ══════════════════════════════════════════════════ */}
        <div className="form-actions">
          <Link to={`/payroll/${id}`} className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
