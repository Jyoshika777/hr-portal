import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getEmployeeReport } from '../../services/reportService';
import { exportCSV, exportExcel, exportPDF } from '../../utils/exportUtils';
import { DateFilterBar, KpiCard, VBarChart, HBarChart, DonutChart, ExportBar, PctBar } from './ReportParts';
import '../../styles/Candidates.css';
import '../../styles/Reports.css';

const STATUS_COLORS = {
  active:'#16a34a', on_leave:'#f59e0b', probation:'#6366f1',
  terminated:'#dc2626', inactive:'#94a3b8',
};
const TYPE_COLORS = {
  full_time:'#2563eb', part_time:'#7c3aed', contract:'#0f766e', intern:'#d97706',
};

export default function EmployeeReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [preset,   setPreset]   = useState('All');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getEmployeeReport({ dateFrom, dateTo })
      .then((r) => { if (!r.ok) throw new Error(r.error); setData(r); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const statusDonut = data
    ? Object.entries(data.byStatus ?? {}).sort(([, a],[, b]) => b-a).map(([k,v]) => ({
        label: k.replace(/_/g,' '), value: v, color: STATUS_COLORS[k] || '#94a3b8',
      }))
    : [];

  const typeDonut = data
    ? Object.entries(data.byType ?? {}).sort(([, a],[, b]) => b-a).map(([k,v]) => ({
        label: k.replace(/_/g,' '), value: v, color: TYPE_COLORS[k] || '#94a3b8',
      }))
    : [];

  const total = data?.kpis?.total ?? 0;

  function deptTableRows() {
    return (data?.deptTable || []).map((r) => [r.dept, r.total, r.active]);
  }
  function doCSV()   { exportCSV('employee_report',   ['Department','Total','Active'], deptTableRows()); }
  function doExcel() { exportExcel('employee_report', ['Department','Total','Active'], deptTableRows(), 'Employees'); }
  function doPDF()   { exportPDF('employee_report', 'Employee Report', ['Department','Total','Active'], deptTableRows(), [90,50,50]); }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to="/reports" className="back-link">← Reports</Link>
          <h2 className="page-title">Employee Report</h2>
          <p className="page-subtitle">Headcount by department, status, and joining trend.</p>
        </div>
      </div>

      <DateFilterBar
        dateFrom={dateFrom} dateTo={dateTo}
        setDateFrom={setDateFrom} setDateTo={setDateTo}
        active={preset} setActive={setPreset}
        loading={loading} onRefresh={load}
      />

      {error && <div className="alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {data && (
        <>
          <ExportBar onCSV={doCSV} onExcel={doExcel} onPDF={doPDF} />

          <div className="rpt-kpi-row">
            <KpiCard label="Total Employees" value={total}              color="blue" />
            <KpiCard label="Active"          value={data.kpis.active}   color="green" sub={`${total ? Math.round(data.kpis.active/total*100) : 0}% of workforce`} />
            <KpiCard label="On Leave"        value={data.kpis.onLeave}  color="amber" />
            <KpiCard label="Probation"       value={data.kpis.probation} color="purple" />
            <KpiCard label="Terminated"      value={data.kpis.terminated} color="red" />
          </div>

          <div className="rpt-2col">
            <div className="rpt-section">
              <p className="rpt-section-title">By Department</p>
              <HBarChart data={data.byDept} color="#2563eb" />
            </div>
            <div className="rpt-section">
              <p className="rpt-section-title">Status Breakdown</p>
              <DonutChart data={statusDonut} total={total} label="Employees" />
            </div>
          </div>

          <div className="rpt-2col">
            <div className="rpt-section">
              <p className="rpt-section-title">Joining Trend (Last 12 Months)</p>
              <VBarChart data={data.joinTrend} color="#16a34a" />
            </div>
            <div className="rpt-section">
              <p className="rpt-section-title">Employment Type</p>
              <DonutChart data={typeDonut} total={total} label="Employees" />
            </div>
          </div>

          <div className="rpt-section">
            <p className="rpt-section-title">Department Summary</p>
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Active</th>
                    <th>Active %</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.deptTable || []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.dept}</td>
                      <td className="text-right">{r.total}</td>
                      <td className="text-right">{r.active}</td>
                      <td>
                        <PctBar
                          pct={r.total ? Math.round((r.active / r.total) * 100) : 0}
                          color="#16a34a"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {loading && !data && <div className="rpt-empty">Loading report data…</div>}
    </Layout>
  );
}
