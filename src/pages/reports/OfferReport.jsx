import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getOfferReport } from '../../services/reportService';
import { exportCSV, exportExcel, exportPDF } from '../../utils/exportUtils';
import { DateFilterBar, KpiCard, VBarChart, HBarChart, DonutChart, ExportBar, PctBar } from './ReportParts';
import '../../styles/Candidates.css';
import '../../styles/Reports.css';

const STATUS_COLORS = {
  draft:'#94a3b8', sent:'#2563eb', accepted:'#16a34a',
  rejected:'#dc2626', expired:'#f59e0b', revoked:'#6b7280',
};
const TYPE_COLORS = {
  full_time:'#2563eb', part_time:'#7c3aed', contract:'#0f766e', intern:'#d97706',
};

export default function OfferReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [preset,   setPreset]   = useState('All');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getOfferReport({ dateFrom, dateTo })
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

  function statusRows() {
    return (data?.tableRows || []).map((r) => [r.status.replace(/_/g,' '), r.count, r.pct + '%']);
  }
  function doCSV()   { exportCSV('offer_report',   ['Status','Count','Percentage'], statusRows()); }
  function doExcel() { exportExcel('offer_report', ['Status','Count','Percentage'], statusRows(), 'Offers'); }
  function doPDF()   { exportPDF('offer_report', 'Offer Letter Report', ['Status','Count','Percentage'], statusRows(), [100, 50, 50]); }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to="/reports" className="back-link">← Reports</Link>
          <h2 className="page-title">Offer Letter Report</h2>
          <p className="page-subtitle">Offer status breakdown, acceptance rate, and monthly trend.</p>
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
            <KpiCard label="Total Offers"     value={total}                          color="blue" />
            <KpiCard label="Sent"             value={data.kpis.sent}                 color="sky" />
            <KpiCard label="Accepted"         value={data.kpis.accepted}             color="green"
              sub={`${data.kpis.acceptanceRate}% acceptance rate`} />
            <KpiCard label="Rejected"         value={data.kpis.rejected}             color="red" />
            <KpiCard label="Pending"          value={data.kpis.pending}              color="amber" />
          </div>

          <div className="rpt-2col">
            <div className="rpt-section">
              <p className="rpt-section-title">Monthly Trend (Last 12 Months)</p>
              <VBarChart data={data.byMonth} color="#0f766e" />
            </div>
            <div className="rpt-section">
              <p className="rpt-section-title">Status Breakdown</p>
              <DonutChart data={statusDonut} total={total} label="Offers" />
            </div>
          </div>

          <div className="rpt-2col">
            <div className="rpt-section">
              <p className="rpt-section-title">By Job Role</p>
              <HBarChart data={data.byJobRole} color="#0f766e" />
            </div>
            <div className="rpt-section">
              <p className="rpt-section-title">Employment Type</p>
              <DonutChart data={typeDonut} total={total} label="Offers" />
            </div>
          </div>

          <div className="rpt-section">
            <p className="rpt-section-title">Status Summary</p>
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="text-right">Count</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.tableRows || []).map((r, i) => (
                    <tr key={i}>
                      <td style={{ textTransform:'capitalize' }}>
                        <span style={{
                          display:'inline-block', width:8, height:8, borderRadius:'50%',
                          background: STATUS_COLORS[r.status] || '#94a3b8', marginRight:8,
                        }} />
                        {r.status.replace(/_/g,' ')}
                      </td>
                      <td className="text-right">{r.count}</td>
                      <td><PctBar pct={r.pct} color={STATUS_COLORS[r.status] || '#94a3b8'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {loading && !data && <div className="rpt-empty">Loading offer data…</div>}
    </Layout>
  );
}
