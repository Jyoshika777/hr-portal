import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getPayrollReport, fmtINR } from '../../services/reportService';
import { exportCSV, exportExcel, exportPDF } from '../../utils/exportUtils';
import { KpiCard, DonutChart, ExportBar, PctBar } from './ReportParts';
import '../../styles/Candidates.css';
import '../../styles/Reports.css';

const STATUS_COLORS = { paid:'#16a34a', pending:'#f59e0b', on_hold:'#dc2626' };

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

function MoneyVBarChart({ data, color = '#2563eb' }) {
  const max = Math.max(...(data || []).map((d) => d.netSalary), 1);
  if (!data?.length) return <div className="rpt-empty">No data</div>;
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:178, paddingBottom:20, overflowX:'auto' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, minWidth:32, flex:1 }}>
          <span className="rpt-vbar-val" style={{ fontSize:9 }}>
            {d.count ? `${d.count}` : ''}
          </span>
          <div
            className="rpt-vbar"
            style={{
              height: `${Math.max(3, Math.round((d.netSalary / max) * 150))}px`,
              background: d.paid > 0 ? color : '#e2e8f0',
              width: '100%',
            }}
          />
          <span className="rpt-vbar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function PayrollReport() {
  const currentYear = new Date().getFullYear();
  const [year,    setYear]    = useState(currentYear);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getPayrollReport({ year })
      .then((r) => { if (!r.ok) throw new Error(r.error); setData(r); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [year]);

  const statusDonut = data
    ? Object.entries(data.byStatus ?? {}).sort(([, a],[, b]) => b-a).map(([k,v]) => ({
        label: k.replace(/_/g,' '), value: v, color: STATUS_COLORS[k] || '#94a3b8',
      }))
    : [];

  const total = data?.kpis?.total ?? 0;

  function deptRows() {
    return (data?.deptTable || []).map((r) => [
      r.dept, r.count,
      fmtINR(r.totalEarnings), fmtINR(r.totalDeductions), fmtINR(r.netSalary),
    ]);
  }
  function doCSV()   { exportCSV('payroll_report',   ['Department','Count','Total Earnings','Deductions','Net Salary'], deptRows()); }
  function doExcel() { exportExcel('payroll_report', ['Department','Count','Total Earnings','Deductions','Net Salary'], deptRows(), 'Payroll'); }
  function doPDF()   {
    exportPDF('payroll_report', `Payroll Report ${year}`,
      ['Department','Count','Earnings','Deductions','Net'],
      deptRows(), [80,35,55,55,55]);
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to="/reports" className="back-link">← Reports</Link>
          <h2 className="page-title">Payroll Report</h2>
          <p className="page-subtitle">Monthly payroll totals, department-wise salary, and payment status.</p>
        </div>
      </div>

      {/* Year filter */}
      <div className="rpt-filter-bar" style={{ marginBottom:24 }}>
        <label>Financial Year</label>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button className="btn-secondary" disabled={loading} onClick={load}
          style={{ padding:'6px 14px', fontSize:13 }}>
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>

      {error && <div className="alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {data && (
        <>
          <ExportBar onCSV={doCSV} onExcel={doExcel} onPDF={doPDF} />

          <div className="rpt-kpi-row">
            <KpiCard label="Total Records"  value={total}                  color="blue" />
            <KpiCard label="Paid"           value={data.kpis.paid}         color="green" sub={`${total ? Math.round(data.kpis.paid/total*100) : 0}% of total`} />
            <KpiCard label="Pending"        value={data.kpis.pending}      color="amber" />
            <KpiCard label="On Hold"        value={data.kpis.onHold}       color="red" />
            <KpiCard label="Total Net Pay"  value={fmtINR(data.kpis.totalNet)} color="sky" />
            <KpiCard label="Avg Net Salary" value={fmtINR(data.kpis.avgNet)}   color="purple" />
          </div>

          <div className="rpt-2col">
            <div className="rpt-section">
              <p className="rpt-section-title">Monthly Net Salary ({year})</p>
              <MoneyVBarChart data={data.byMonth} color="#2563eb" />
              <p style={{ fontSize:11, color:'#94a3b8', marginTop:6, textAlign:'center' }}>
                Bar height = net salary; number = payslip count
              </p>
            </div>
            <div className="rpt-section">
              <p className="rpt-section-title">Payment Status</p>
              <DonutChart data={statusDonut} total={total} label="Payslips" />
            </div>
          </div>

          <div className="rpt-section">
            <p className="rpt-section-title">Department-wise Payroll ({year})</p>
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th className="text-right">Payslips</th>
                    <th className="text-right">Total Earnings</th>
                    <th className="text-right">Deductions</th>
                    <th className="text-right">Net Salary</th>
                    <th>Net %</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.deptTable || []).map((r, i) => {
                    const totalNet = data.kpis.totalNet || 1;
                    return (
                      <tr key={i}>
                        <td>{r.dept}</td>
                        <td className="text-right">{r.count}</td>
                        <td className="text-right">{fmtINR(r.totalEarnings)}</td>
                        <td className="text-right" style={{ color:'#dc2626' }}>{fmtINR(r.totalDeductions)}</td>
                        <td className="text-right" style={{ fontWeight:600 }}>{fmtINR(r.netSalary)}</td>
                        <td>
                          <PctBar pct={Math.round((r.netSalary / totalNet) * 100)} color="#2563eb" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {data.deptTable.length > 0 && (
                  <tfoot>
                    <tr style={{ fontWeight:700, borderTop:'2px solid #e2e8f0' }}>
                      <td>Total</td>
                      <td className="text-right">{total}</td>
                      <td className="text-right">{fmtINR(data.kpis.totalEarnings)}</td>
                      <td className="text-right">{fmtINR(data.kpis.totalEarnings - data.kpis.totalNet)}</td>
                      <td className="text-right">{fmtINR(data.kpis.totalNet)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {loading && !data && <div className="rpt-empty">Loading payroll data…</div>}
    </Layout>
  );
}
