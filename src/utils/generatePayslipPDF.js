import jsPDF from 'jspdf';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BLUE   = [30,  64,  175];
const DARK   = [15,  23,  42];
const GRAY   = [100, 116, 139];
const LGRAY  = [226, 232, 240];
const WHITE  = [255, 255, 255];
const LBLUE  = [239, 246, 255];
const GREEN  = [21,  128, 61]; // eslint-disable-line no-unused-vars
const LGRN   = [240, 253, 244];
const LRED   = [254, 242, 242];

// ── Page geometry (A4 portrait, mm) ───────────────────────────────────────────
const PW   = 210;
const ML   = 18;
const MR   = 18;
const CW   = PW - ML - MR;   // 174 mm content width
const FOOTER_LINE = 281;

// ── Company constants ─────────────────────────────────────────────────────────
const CO_NAME    = 'TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED';
const CO_ADDR    = 'Plot No. 12, Software Technology Park, Madhapur, Hyderabad – 500 081, Telangana';
const CO_CONTACT = 'Tel: +91 40 6800 0000  |  hr@trivonsoftware.com  |  www.trivonsoftware.com';
const CO_SIG     = 'Bhanu Pratap Dadi';
const CO_SIG_TTL = 'Chief Executive Officer';

// ── Month names ────────────────────────────────────────────────────────────────
const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Formatting ─────────────────────────────────────────────────────────────────
function fmtINR(amount) {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(parseFloat(amount) || 0);
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function payPeriod(record) {
  return `${MONTHS[record.pay_month] ?? record.pay_month} ${record.pay_year}`;
}

// ── Low-level drawing helpers ─────────────────────────────────────────────────
function rgb(doc, color) { doc.setTextColor(...color); }
function fill(doc, color) { doc.setFillColor(...color); }
function stroke(doc, color) { doc.setDrawColor(...color); }

function rect(doc, x, y, w, h, color) {
  fill(doc, color);
  doc.rect(x, y, w, h, 'F');
}

function hLine(doc, y, x1, x2, color, lw = 0.3) {
  stroke(doc, color);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

function bold(doc, sz)   { doc.setFont('helvetica', 'bold');   doc.setFontSize(sz); }
function normal(doc, sz) { doc.setFont('helvetica', 'normal'); doc.setFontSize(sz); }
function italic(doc, sz) { doc.setFont('helvetica', 'italic'); doc.setFontSize(sz); }

// ── Header (drawn on every page) ──────────────────────────────────────────────
function drawHeader(doc, record) {
  // Blue top bar
  rect(doc, 0, 0, PW, 24, BLUE);

  // White logo box
  fill(doc, WHITE);
  doc.roundedRect(ML, 4, 24, 16, 2, 2, 'F');

  // Logo text
  bold(doc, 8);
  rgb(doc, BLUE);
  doc.text('TRIVON', ML + 12, 14.5, { align: 'center' });

  // Company name + dept
  bold(doc, 10);
  rgb(doc, WHITE);
  doc.text(CO_NAME, ML + 28, 11);
  normal(doc, 7.5);
  doc.text('Human Resources Department  ·  Payroll Division', ML + 28, 16.5);

  // Payslip label on right
  bold(doc, 9);
  rgb(doc, WHITE);
  doc.text('SALARY PAYSLIP', PW - MR, 14, { align: 'right' });
}

// ── Footer (drawn on every page) ──────────────────────────────────────────────
function drawFooter(doc, record, pageNum, totalPages) {
  hLine(doc, FOOTER_LINE, ML, PW - MR, LGRAY);

  normal(doc, 7);
  rgb(doc, GRAY);
  doc.text(CO_ADDR,    ML, FOOTER_LINE + 4);
  doc.text(CO_CONTACT, ML, FOOTER_LINE + 8);

  doc.text(
    `Payslip: ${record.payroll_number}  |  Period: ${payPeriod(record)}  |  Page ${pageNum} of ${totalPages}`,
    PW - MR,
    FOOTER_LINE + 6,
    { align: 'right' }
  );
}

// ── Section heading bar ───────────────────────────────────────────────────────
function sectionBar(doc, y, title, color = BLUE) {
  rect(doc, ML, y, CW, 7, color);
  bold(doc, 8);
  rgb(doc, WHITE);
  doc.text(title.toUpperCase(), ML + 3, y + 5);
  return y + 7 + 3;
}

// ── Two-column table row helper ───────────────────────────────────────────────
// Used for earnings/deductions side-by-side layout
function twoColRow(doc, y, lLabel, lVal, rLabel, rVal, shade = false, lHighlight = false, rHighlight = false) {
  const colW = CW / 2;
  const lx   = ML;
  const rx   = ML + colW;
  const rh   = 7;

  if (shade) {
    rect(doc, lx, y, colW, rh, LBLUE);
    rect(doc, rx, y, colW, rh, LRED);
  } else {
    rect(doc, lx, y, colW, rh, lHighlight ? LGRN : [250, 252, 255]);
    rect(doc, rx, y, colW, rh, rHighlight ? [254, 249, 195] : [252, 252, 252]);
  }

  // Left label + value
  normal(doc, 8.5);
  rgb(doc, DARK);
  doc.text(lLabel, lx + 3, y + 4.8);
  bold(doc, 8.5);
  doc.text(lVal, lx + colW - 3, y + 4.8, { align: 'right' });

  // Divider
  hLine(doc, y, rx, rx, LGRAY, 0.2);

  // Right label + value
  normal(doc, 8.5);
  rgb(doc, DARK);
  doc.text(rLabel, rx + 3, y + 4.8);
  bold(doc, 8.5);
  doc.text(rVal, PW - MR - 3, y + 4.8, { align: 'right' });

  // Row bottom border
  hLine(doc, y + rh, ML, PW - MR, LGRAY, 0.2);

  return y + rh;
}

// ── Single full-width info row ─────────────────────────────────────────────────
function infoRow(doc, y, label, value, altBg = false) {
  const rh = 6.5;
  rect(doc, ML, y, CW, rh, altBg ? [248, 250, 252] : WHITE);
  normal(doc, 8);
  rgb(doc, GRAY);
  doc.text(label, ML + 3, y + 4.3);
  bold(doc, 8);
  rgb(doc, DARK);
  doc.text(String(value ?? '—'), PW - MR - 3, y + 4.3, { align: 'right' });
  hLine(doc, y + rh, ML, PW - MR, LGRAY, 0.15);
  return y + rh;
}

// ── Payslip column headers ─────────────────────────────────────────────────────
function twoColHeader(doc, y) {
  const colW = CW / 2;
  rect(doc, ML, y, colW, 6.5, BLUE);
  rect(doc, ML + colW, y, colW, 6.5, [185, 28, 28]);
  bold(doc, 8);
  rgb(doc, WHITE);
  doc.text('EARNINGS',   ML + colW / 2, y + 4.5, { align: 'center' });
  doc.text('DEDUCTIONS', ML + colW + colW / 2, y + 4.5, { align: 'center' });
  hLine(doc, y + 6.5, ML, PW - MR, LGRAY, 0.2);
  return y + 6.5;
}

// ── Net salary highlighted bar ─────────────────────────────────────────────────
function netSalaryBar(doc, y, totalEarnings, totalDeductions, netSalary) {
  const barH = 12;
  rect(doc, ML, y, CW, barH, BLUE);

  bold(doc, 8.5);
  rgb(doc, WHITE);
  doc.text('GROSS EARNINGS', ML + 3, y + 5);
  doc.text(fmtINR(totalEarnings), ML + CW / 3 - 3, y + 5, { align: 'right' });

  doc.text('TOTAL DEDUCTIONS', ML + CW / 3 + 3, y + 5);
  doc.text(fmtINR(totalDeductions), ML + (2 * CW) / 3 - 3, y + 5, { align: 'right' });

  bold(doc, 10);
  doc.text('NET SALARY', ML + (2 * CW) / 3 + 3, y + 7);
  doc.text(fmtINR(netSalary), PW - MR - 3, y + 7, { align: 'right' });

  return y + barH;
}

// ── Main export ────────────────────────────────────────────────────────────────
export function generatePayslipPDF(record) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const TOTAL_PAGES = 2;
  let y;

  // ══ PAGE 1 ══════════════════════════════════════════════════════════════════
  drawHeader(doc, record);
  drawFooter(doc, record, 1, TOTAL_PAGES);
  y = 33;

  // ── Company address strip ──
  normal(doc, 7.5);
  rgb(doc, GRAY);
  doc.text(CO_ADDR, ML, y);
  doc.text(CO_CONTACT, ML, y + 4);
  y += 9;
  hLine(doc, y, ML, PW - MR, LGRAY);
  y += 4;

  // ── Payslip title ──
  bold(doc, 13);
  rgb(doc, BLUE);
  doc.text('SALARY PAYSLIP', PW / 2, y, { align: 'center' });
  y += 5;
  bold(doc, 10);
  rgb(doc, DARK);
  doc.text(`Pay Period: ${payPeriod(record)}`, PW / 2, y, { align: 'center' });
  y += 7;
  hLine(doc, y, ML, PW - MR, BLUE, 0.5);
  y += 5;

  // ── Employee info section ──
  y = sectionBar(doc, y, 'Employee Information');

  // Two column info layout: left side employee details, right side payslip meta
  const colW = CW / 2;
  const EMP_ROWS = [
    ['Employee ID',   record.employee_ref  ?? '—'],
    ['Employee Name', record.employee_name ?? '—'],
    ['Department',    record.department    ?? '—'],
    ['Designation',   record.designation   ?? '—'],
  ];
  const META_ROWS = [
    ['Payslip Number', record.payroll_number ?? '—'],
    ['Pay Period',     payPeriod(record)],
    ['Payment Mode',   (record.payment_mode ?? '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())],
    ['Payment Date',   record.payment_date ? fmtDate(record.payment_date) : '—'],
  ];

  const maxRows = Math.max(EMP_ROWS.length, META_ROWS.length);
  for (let i = 0; i < maxRows; i++) {
    const rh  = 6.5;
    const alt = i % 2 === 1;
    rect(doc, ML,         y, colW,    rh, alt ? [248, 250, 252] : WHITE);
    rect(doc, ML + colW,  y, colW,    rh, alt ? [248, 250, 252] : WHITE);
    hLine(doc, y,         ML, PW - MR, LGRAY, 0.15);

    if (EMP_ROWS[i]) {
      normal(doc, 8); rgb(doc, GRAY);
      doc.text(EMP_ROWS[i][0], ML + 3, y + 4.3);
      bold(doc, 8); rgb(doc, DARK);
      doc.text(String(EMP_ROWS[i][1]), ML + colW - 3, y + 4.3, { align: 'right' });
    }
    if (META_ROWS[i]) {
      normal(doc, 8); rgb(doc, GRAY);
      doc.text(META_ROWS[i][0], ML + colW + 3, y + 4.3);
      bold(doc, 8); rgb(doc, DARK);
      doc.text(String(META_ROWS[i][1]), PW - MR - 3, y + 4.3, { align: 'right' });
    }

    hLine(doc, y + rh, ML, PW - MR, LGRAY, 0.15);
    y += rh;
  }

  // ── Attendance ──
  y += 4;
  y = sectionBar(doc, y, 'Attendance Summary');
  y = infoRow(doc, y, 'Total Working Days',       record.working_days ?? '—', false);
  y = infoRow(doc, y, 'Days Worked',              record.days_worked ?? '—',  true);
  y = infoRow(doc, y, 'Leave / Absent Days',
    ((record.working_days ?? 0) - (record.days_worked ?? 0)), false);

  // ── Earnings / Deductions table ──
  y += 5;
  y = twoColHeader(doc, y);

  const earnings = [
    ['Basic Salary',         fmtINR(record.basic_salary)],
    ['HRA',                  fmtINR(record.hra)],
    ['Transport Allowance',  fmtINR(record.transport_allowance)],
    ['Medical Allowance',    fmtINR(record.medical_allowance)],
    ['Other Allowances',     fmtINR(record.other_allowances)],
  ];

  const deductions = [
    ['Provident Fund (PF)',  fmtINR(record.pf_deduction)],
    ['ESI',                  fmtINR(record.esi_deduction)],
    ['TDS / Income Tax',     fmtINR(record.tax_deduction)],
    ['Other Deductions',     fmtINR(record.other_deductions)],
  ];

  const maxEarDed = Math.max(earnings.length, deductions.length);
  for (let i = 0; i < maxEarDed; i++) {
    const e = earnings[i]   ?? ['', ''];
    const d = deductions[i] ?? ['', ''];
    y = twoColRow(doc, y, e[0], e[1], d[0], d[1], false);
  }

  // Totals row
  y = twoColRow(doc, y, 'Gross Earnings', fmtINR(record.total_earnings),
                        'Total Deductions', fmtINR(record.total_deductions), true);

  // Net salary bar
  y += 3;
  y = netSalaryBar(doc, y,
    parseFloat(record.total_earnings   ?? 0),
    parseFloat(record.total_deductions ?? 0),
    parseFloat(record.net_salary       ?? 0)
  );

  // ── Net salary in words ──
  y += 4;
  normal(doc, 8);
  rgb(doc, GRAY);
  doc.text(
    `Net Salary (in figures): ${fmtINR(record.net_salary)}`,
    ML, y
  );

  // ── Remarks ──
  if (record.remarks) {
    y += 7;
    hLine(doc, y, ML, PW - MR, LGRAY);
    y += 3;
    bold(doc, 8);
    rgb(doc, GRAY);
    doc.text('REMARKS', ML, y);
    y += 4;
    normal(doc, 8);
    rgb(doc, DARK);
    const lines = doc.splitTextToSize(record.remarks, CW);
    doc.text(lines, ML, y);
    y += lines.length * 4;
  }

  // ══ PAGE 2 ══════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(doc, record);
  drawFooter(doc, record, 2, TOTAL_PAGES);
  y = 33;

  // ── Terms & Notes ──
  y = sectionBar(doc, y, 'Terms & Conditions');
  const terms = [
    'This payslip is a computer-generated document and does not require a physical signature to be valid.',
    'The salary components shown are as per the offer letter and subsequent revisions agreed upon.',
    'PF is computed at 12% of Basic Salary (employee contribution). ESI applies where applicable.',
    'TDS is deducted based on estimated annual taxable income as per prevailing income-tax slabs.',
    'Disputes, if any, must be reported to the HR department within 7 working days of this payslip date.',
    'This payslip is confidential. Sharing it outside the organisation is prohibited.',
  ];
  y += 2;
  for (let i = 0; i < terms.length; i++) {
    rect(doc, ML, y, CW, 8, i % 2 === 0 ? WHITE : [248, 250, 252]);
    bold(doc, 8); rgb(doc, BLUE);
    doc.text(`${i + 1}.`, ML + 3, y + 5.3);
    normal(doc, 8); rgb(doc, DARK);
    const lines = doc.splitTextToSize(terms[i], CW - 10);
    doc.text(lines, ML + 9, y + 5.3);
    y += Math.max(8, lines.length * 4.5 + 3);
  }

  // ── Statutory deduction summary ──
  y += 4;
  y = sectionBar(doc, y, 'Statutory Deduction Summary', [100, 116, 139]);
  y = infoRow(doc, y, 'PF Deduction (Employee)',  fmtINR(record.pf_deduction),  false);
  y = infoRow(doc, y, 'ESI Deduction (Employee)', fmtINR(record.esi_deduction), true);
  y = infoRow(doc, y, 'TDS / Income Tax',         fmtINR(record.tax_deduction), false);
  y = infoRow(doc, y, 'Other Deductions',         fmtINR(record.other_deductions), true);
  y = infoRow(doc, y, 'Total Statutory Deductions',
    fmtINR(record.total_deductions), false
  );

  // ── Payment status bar ──
  y += 6;
  const statusColors = {
    paid:      [21,  128, 61],
    pending:   [30,  64,  175],
    on_hold:   [180, 83,  9],
    cancelled: [185, 28,  28],
  };
  const statusColor = statusColors[record.payment_status] ?? BLUE;
  rect(doc, ML, y, CW, 10, statusColor);
  bold(doc, 10);
  rgb(doc, WHITE);
  const statusLabel = (record.payment_status ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  doc.text(`Payment Status: ${statusLabel}`, PW / 2, y + 7, { align: 'center' });
  y += 13;

  // ── Signature block ──
  y += 4;
  hLine(doc, y, ML, PW - MR, LGRAY);
  y += 8;

  // Company signature (left)
  bold(doc, 8.5);
  rgb(doc, DARK);
  doc.text(CO_SIG, ML, y);
  normal(doc, 8);
  rgb(doc, GRAY);
  doc.text(CO_SIG_TTL, ML, y + 4.5);
  doc.text(CO_NAME,    ML, y + 9);

  // Vertical divider
  hLine(doc, y - 2, PW / 2, PW / 2, LGRAY, 0.3);

  // Employee acknowledgement (right)
  bold(doc, 8.5);
  rgb(doc, DARK);
  doc.text(record.employee_name ?? '', PW / 2 + 4, y);
  normal(doc, 8);
  rgb(doc, GRAY);
  doc.text(record.employee_ref  ?? '', PW / 2 + 4, y + 4.5);
  doc.text('Employee Signature & Date',   PW / 2 + 4, y + 9);

  // Signature lines
  hLine(doc, y + 14, ML,         ML + 55,       DARK, 0.5);
  hLine(doc, y + 14, PW / 2 + 4, PW / 2 + 59,  DARK, 0.5);
  y += 18;

  // ── Disclaimer ──
  y += 4;
  italic(doc, 7);
  rgb(doc, GRAY);
  const disclaimer =
    'This is a system-generated payslip. If you have any discrepancies, please contact the HR department ' +
    'at hr@trivonsoftware.com within 7 working days of receipt. This document is confidential.';
  const dlines = doc.splitTextToSize(disclaimer, CW);
  doc.text(dlines, ML, y);

  // ── Save ──
  const period = payPeriod(record).replace(/\s/g, '_');
  doc.save(`Payslip_${record.payroll_number}_${period}.pdf`);
}
