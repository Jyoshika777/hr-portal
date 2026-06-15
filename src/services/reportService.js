import { supabase } from './supabaseClient';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtMonthLabel(y, m) {
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

function safeGte(query, field, val) {
  return val ? query.gte(field, val) : query;
}
function safeLte(query, field, val) {
  return val ? query.lte(field, val) : query;
}

function countBy(rows, field) {
  return rows.reduce((acc, r) => {
    const k = r[field] ?? 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function groupByMonth(rows, dateField, numMonths = 12) {
  const now = new Date();
  return Array.from({ length: numMonths }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (numMonths - 1 - i), 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const count = rows.filter((r) => {
      const rd = new Date(r[dateField]);
      return !isNaN(rd) && rd.getFullYear() === y && rd.getMonth() + 1 === m;
    }).length;
    return { label: fmtMonthLabel(y, m), value: count, year: y, month: m };
  });
}

function topN(countMap, n = 10) {
  return Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

function safePct(num, denom) {
  if (!denom) return 0;
  return Math.round((num / denom) * 100);
}

function missingMsg(table) {
  return `The ${table} table is not migrated yet. Run the SQL migration and refresh.`;
}

// ── 1. Hiring Report ──────────────────────────────────────────────────────────
export async function getHiringReport({ dateFrom = '', dateTo = '' } = {}) {
  try {
    let q = supabase
      .from('candidates')
      .select('id,status,job_role,created_at');

    q = safeGte(q, 'created_at', dateFrom ? dateFrom + 'T00:00:00' : '');
    q = safeLte(q, 'created_at', dateTo   ? dateTo   + 'T23:59:59' : '');

    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;

    const rows      = data ?? [];
    const byStatus  = countBy(rows, 'status');
    const byJobRole = countBy(rows, 'job_role');
    const total     = rows.length;

    const FUNNEL_STAGES = [
      { key:'applied',    label:'Applied',    color:'#93c5fd' },
      { key:'screening',  label:'Screening',  color:'#818cf8' },
      { key:'interview',  label:'Interview',  color:'#f59e0b' },
      { key:'selected',   label:'Selected',   color:'#34d399' },
      { key:'offer_sent', label:'Offer Sent', color:'#14b8a6' },
      { key:'joined',     label:'Joined',     color:'#16a34a' },
    ];

    const funnel = FUNNEL_STAGES.map((s) => ({
      ...s,
      count: byStatus[s.key] || 0,
    }));

    const joined   = byStatus.joined   || 0;
    const rejected = byStatus.rejected || 0;
    const active   = total - joined - rejected;

    const tableRows = Object.entries(byStatus)
      .sort(([, a], [, b]) => b - a)
      .map(([status, count]) => ({ status, count, pct: safePct(count, total) }));

    return {
      ok: true,
      kpis: {
        total,
        active,
        joined,
        rejected,
        joinRate: safePct(joined, total),
        rejectionRate: safePct(rejected, total),
      },
      byStatus,
      byMonth: groupByMonth(rows, 'created_at'),
      byJobRole: topN(byJobRole),
      funnel,
      tableRows,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── 2. Employee Report ────────────────────────────────────────────────────────
export async function getEmployeeReport({ dateFrom = '', dateTo = '' } = {}) {
  try {
    let q = supabase
      .from('employees')
      .select('id,status,department,employment_type,date_of_joining,created_at');

    q = safeGte(q, 'created_at', dateFrom ? dateFrom + 'T00:00:00' : '');
    q = safeLte(q, 'created_at', dateTo   ? dateTo   + 'T23:59:59' : '');

    const { data, error } = await q;
    if (error) throw error;

    const rows      = data ?? [];
    const byStatus  = countBy(rows, 'status');
    const byDept    = countBy(rows, 'department');
    const byType    = countBy(rows, 'employment_type');
    const total     = rows.length;

    const deptTable = Object.entries(byDept)
      .sort(([, a], [, b]) => b - a)
      .map(([dept, total_emp]) => ({
        dept: dept || 'Not Set',
        total: total_emp,
        active: rows.filter((r) => r.department === dept && r.status === 'active').length,
      }));

    return {
      ok: true,
      kpis: {
        total,
        active:     byStatus.active      || 0,
        onLeave:    byStatus.on_leave    || 0,
        probation:  byStatus.probation   || 0,
        terminated: byStatus.terminated  || 0,
      },
      byDept:  topN(byDept),
      byStatus,
      byType,
      joinTrend: groupByMonth(rows, 'created_at'),
      deptTable,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── 3. Payroll Report ─────────────────────────────────────────────────────────
export async function getPayrollReport({ year = new Date().getFullYear() } = {}) {
  try {
    const { data, error } = await supabase
      .from('payroll')
      .select('id,employee_name,department,pay_month,pay_year,payment_status,total_earnings,total_deductions,net_salary,basic_salary')
      .eq('pay_year', year)
      .order('pay_month', { ascending: true });

    if (error) throw error;

    const rows        = data ?? [];
    const byStatus    = countBy(rows, 'payment_status');
    const byDeptMap   = {};

    rows.forEach((r) => {
      const dept = r.department || 'Not Set';
      if (!byDeptMap[dept]) byDeptMap[dept] = { dept, count:0, totalEarnings:0, totalDeductions:0, netSalary:0 };
      byDeptMap[dept].count++;
      byDeptMap[dept].totalEarnings   += Number(r.total_earnings   || 0);
      byDeptMap[dept].totalDeductions += Number(r.total_deductions || 0);
      byDeptMap[dept].netSalary       += Number(r.net_salary       || 0);
    });

    const byMonthMap = {};
    for (let m = 1; m <= 12; m++) {
      const mRows = rows.filter((r) => r.pay_month === m);
      byMonthMap[m] = {
        label: MONTHS[m - 1],
        month: m,
        count: mRows.length,
        netSalary:       mRows.reduce((s, r) => s + Number(r.net_salary       || 0), 0),
        totalEarnings:   mRows.reduce((s, r) => s + Number(r.total_earnings   || 0), 0),
        totalDeductions: mRows.reduce((s, r) => s + Number(r.total_deductions || 0), 0),
        paid: mRows.filter((r) => r.payment_status === 'paid').length,
      };
    }

    const byMonth    = Object.values(byMonthMap);
    const deptTable  = Object.values(byDeptMap).sort((a, b) => b.netSalary - a.netSalary);

    const totalNet   = rows.reduce((s, r) => s + Number(r.net_salary || 0), 0);
    const totalEarn  = rows.reduce((s, r) => s + Number(r.total_earnings || 0), 0);
    const paidRows   = rows.filter((r) => r.payment_status === 'paid');
    const paidNet    = paidRows.reduce((s, r) => s + Number(r.net_salary || 0), 0);
    const avgNet     = rows.length ? Math.round(totalNet / rows.length) : 0;

    return {
      ok: true,
      year,
      kpis: {
        total:    rows.length,
        paid:     byStatus.paid    || 0,
        pending:  byStatus.pending || 0,
        onHold:   byStatus.on_hold || 0,
        totalNet,
        totalEarnings: totalEarn,
        paidNet,
        avgNet,
      },
      byMonth,
      byStatus,
      deptTable,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── 4. Performance Report ─────────────────────────────────────────────────────
export async function getPerformanceReport({ dateFrom = '', dateTo = '' } = {}) {
  try {
    let q = supabase
      .from('performance_reviews')
      .select('id,overall_rating,rating_label,review_type,recommendation,status,department,review_date,created_at');

    q = safeGte(q, 'review_date', dateFrom);
    q = safeLte(q, 'review_date', dateTo);

    const { data, error } = await q;
    if (error) throw error;

    const rows     = data ?? [];
    const byLabel  = countBy(rows, 'rating_label');
    const byType   = countBy(rows, 'review_type');
    const byRec    = countBy(rows, 'recommendation');
    const byStatus = countBy(rows, 'status');
    const total    = rows.length;

    const rated    = rows.filter((r) => r.overall_rating != null);
    const avgRating = rated.length
      ? (rated.reduce((s, r) => s + parseFloat(r.overall_rating), 0) / rated.length).toFixed(1)
      : null;

    const deptRatingMap = {};
    rows.forEach((r) => {
      const dept = r.department || 'Not Set';
      if (!deptRatingMap[dept]) deptRatingMap[dept] = { dept, ratings: [], count: 0 };
      deptRatingMap[dept].count++;
      if (r.overall_rating != null) deptRatingMap[dept].ratings.push(parseFloat(r.overall_rating));
    });

    const byDept = Object.values(deptRatingMap)
      .map((d) => ({
        label: d.dept,
        value: d.ratings.length
          ? Math.round((d.ratings.reduce((s, v) => s + v, 0) / d.ratings.length) * 10) / 10
          : 0,
        count: d.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const LABEL_COLORS = {
      outstanding:'#16a34a', exceeds_expectations:'#2563eb',
      meets_expectations:'#7c3aed', needs_improvement:'#d97706', unsatisfactory:'#dc2626',
    };
    const LABEL_TEXT = {
      outstanding:'Outstanding', exceeds_expectations:'Exceeds Expectations',
      meets_expectations:'Meets Expectations', needs_improvement:'Needs Improvement',
      unsatisfactory:'Unsatisfactory',
    };

    const ratingDist = Object.entries(LABEL_TEXT).map(([key, label]) => ({
      label,
      count: byLabel[key] || 0,
      color: LABEL_COLORS[key],
      pct:   safePct(byLabel[key] || 0, total),
    }));

    return {
      ok: true,
      kpis: {
        total,
        avgRating,
        outstanding: byLabel.outstanding || 0,
        closed:      byStatus.closed     || 0,
        draft:       byStatus.draft      || 0,
      },
      byLabel,
      byType,
      byRec,
      byStatus,   // was omitted — caused Object.entries(undefined) crash in the component
      byDept,
      ratingDist,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── 5. Offer Letter Report ────────────────────────────────────────────────────
export async function getOfferReport({ dateFrom = '', dateTo = '' } = {}) {
  try {
    let q = supabase
      .from('offer_letters')
      .select('id,offer_number,candidate_name,job_role,department,status,employment_type,created_at');

    q = safeGte(q, 'created_at', dateFrom ? dateFrom + 'T00:00:00' : '');
    q = safeLte(q, 'created_at', dateTo   ? dateTo   + 'T23:59:59' : '');

    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;

    const rows      = data ?? [];
    const byStatus  = countBy(rows, 'status');
    const byRole    = countBy(rows, 'job_role');
    const byType    = countBy(rows, 'employment_type');
    const total     = rows.length;
    const accepted  = byStatus.accepted  || 0;
    const rejected  = byStatus.rejected  || 0;
    const sent      = byStatus.sent      || 0;

    const tableRows = Object.entries(byStatus)
      .sort(([, a], [, b]) => b - a)
      .map(([status, count]) => ({ status, count, pct: safePct(count, total) }));

    return {
      ok: true,
      kpis: {
        total,
        sent,
        accepted,
        rejected,
        acceptanceRate: safePct(accepted, sent + accepted + rejected),
        pending: (byStatus.draft || 0) + sent,
      },
      byStatus,
      byMonth: groupByMonth(rows, 'created_at'),
      byJobRole: topN(byRole),
      byType,
      tableRows,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── 6. Overview numbers ───────────────────────────────────────────────────────
export async function getOverviewNumbers() {
  const [cand, emp, pay, perf, offer, docs] = await Promise.allSettled([
    supabase.from('candidates').select('id', { count:'exact', head:true }),
    supabase.from('employees').select('id', { count:'exact', head:true }),
    supabase.from('payroll').select('id', { count:'exact', head:true }),
    supabase.from('performance_reviews').select('id', { count:'exact', head:true }),
    supabase.from('offer_letters').select('id', { count:'exact', head:true }),
    supabase.from('documents').select('id', { count:'exact', head:true }),
  ]);

  return {
    candidates:   cand.status  === 'fulfilled' ? (cand.value.count  ?? 0) : 0,
    employees:    emp.status   === 'fulfilled' ? (emp.value.count   ?? 0) : 0,
    payroll:      pay.status   === 'fulfilled' ? (pay.value.count   ?? 0) : 0,
    performance:  perf.status  === 'fulfilled' ? (perf.value.count  ?? 0) : 0,
    offers:       offer.status === 'fulfilled' ? (offer.value.count ?? 0) : 0,
    documents:    docs.status  === 'fulfilled' ? (docs.value.count  ?? 0) : 0,
  };
}

// ── 7. Analytics Overview (all modules in one parallel call) ─────────────────
export async function getAnalyticsOverview() {
  const [hiring, employees, offers, payroll, performance, counts] = await Promise.allSettled([
    getHiringReport(),
    getEmployeeReport(),
    getOfferReport(),
    getPayrollReport(),
    getPerformanceReport(),
    getOverviewNumbers(),
  ]);

  return {
    hiring:      hiring.status      === 'fulfilled' ? hiring.value      : null,
    employees:   employees.status   === 'fulfilled' ? employees.value   : null,
    offers:      offers.status      === 'fulfilled' ? offers.value      : null,
    payroll:     payroll.status     === 'fulfilled' ? payroll.value     : null,
    performance: performance.status === 'fulfilled' ? performance.value : null,
    counts:      counts.status      === 'fulfilled' ? counts.value      : {},
  };
}

// ── Utility: INR formatter ────────────────────────────────────────────────────
export function fmtINR(num) {
  if (!num && num !== 0) return '—';
  return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(num);
}

export { missingMsg };
