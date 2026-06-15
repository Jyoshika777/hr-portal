import jsPDF from 'jspdf';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BLUE  = [30, 64, 175];
const DARK  = [15, 23, 42];
const GRAY  = [100, 116, 139];
const LGRAY = [226, 232, 240];
const WHITE = [255, 255, 255];
const LBLUE = [239, 246, 255];
const GREEN = [21, 128, 61];
const LGRN  = [240, 253, 244];

// ── Page geometry (A4, mm) ────────────────────────────────────────────────────
const PW            = 210;
const PH            = 297;  // eslint-disable-line no-unused-vars
const ML            = 18;
const MR            = 18;
const CW            = PW - ML - MR;   // 174 mm
const HDR_H         = 24;
const CONTENT_START = HDR_H + 9;      // y = 33
const FOOTER_LINE   = 281;
const MAX_Y         = FOOTER_LINE - 5;

// ── Company constants ─────────────────────────────────────────────────────────
const CO_NAME    = 'TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED';
const CO_SHORT   = 'TRIVON';
const CO_ADDR    = 'Plot No. 12, Software Technology Park, Madhapur, Hyderabad - 500 081, Telangana, India';
const CO_CONTACT = 'Tel: +91 40 6800 0000  |  hr@trivonsoftware.com  |  www.trivonsoftware.com';
const CO_SIG     = 'Bhanu Pratap Dadi';
const CO_TITLE   = 'Chief Executive Officer';

// ── Employment type metadata ──────────────────────────────────────────────────
const EMP_LABELS = {
  full_time: 'Full-Time Permanent',
  part_time: 'Part-Time',
  contract:  'Contract',
  intern:    'Internship',
  temporary: 'Temporary',
  trainee:   'Trainee',
  remote:    'Remote (Full-Time)',
  hybrid:    'Hybrid (Full-Time)',
};

// Type groups used throughout to drive conditional content
const FT_GROUP  = ['full_time', 'remote', 'hybrid'];  // permanent employment
const CTR_GROUP = ['contract', 'temporary'];           // contract / temp

// ── Formatting helpers ────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return 'N/A';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtCurrency(amount) {
  if (!amount && amount !== 0) return 'N/A';
  const n = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
  return `Rs. ${n}`;
}

function firstName(name) {
  return (name || '').trim().split(/\s+/)[0];
}

// Strip characters outside the WinAnsi/Latin-1 range that jsPDF built-in fonts cannot render.
// This prevents invisible text, broken spacing, and garbled output in generated PDFs.
function safe(str) {
  if (str == null) return '';
  return String(str)
    .replace(/₹/g, 'Rs.')          // ₹ Indian Rupee sign
    .replace(/—/g, '-')            // — em dash
    .replace(/–/g, '-')            // – en dash
    .replace(/•/g, '-')            // • bullet
    .replace(/‘|’/g, "'")     // smart single quotes
    .replace(/“|”/g, '"')     // smart double quotes
    .replace(/…/g, '...')          // … ellipsis
    .replace(/ /g, ' ')            // non-breaking space
    .replace(/[Ā-￿]/g, (c) => // accented → base char, others → stripped
      c.normalize('NFD').replace(/[̀-ͯ]/g, '') || '');
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generateOfferPDF(offer) {
  const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let   y       = CONTENT_START;
  let   pageNum = 1;

  const type      = offer.employment_type ?? 'full_time';
  const isFT      = FT_GROUP.includes(type);
  const isCTR     = CTR_GROUP.includes(type);
  const isIntern  = type === 'intern';
  const isPT      = type === 'part_time';
  const isTrainee = type === 'trainee';

  // ── Page chrome ─────────────────────────────────────────────────────────────

  function drawHeader() {
    // Blue bar
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, PW, HDR_H, 'F');

    // Logo box — white pill with company short name
    doc.setFillColor(...WHITE);
    doc.roundedRect(ML, 5, 16, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...BLUE);
    doc.text(CO_SHORT, ML + 8, 10.5, { align: 'center' });
    doc.setFontSize(5.5);
    doc.text('SOFTWARE', ML + 8, 14, { align: 'center' });

    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(CO_NAME, ML + 20, 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(219, 234, 254);
    doc.text('Human Resources Department', ML + 20, 17);

    // Right — offer ref
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...WHITE);
    doc.text(offer.offer_number ?? '', PW - MR, 11.5, { align: 'right' });
    const rightLabel = isIntern ? 'OFFER OF INTERNSHIP' : 'OFFER OF APPOINTMENT';
    doc.text(rightLabel, PW - MR, 17, { align: 'right' });
  }

  function drawFooter() {
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.25);
    doc.line(ML, FOOTER_LINE, PW - MR, FOOTER_LINE);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`${CO_NAME} — Private & Confidential`, ML, FOOTER_LINE + 4.5);
    doc.text(`Page ${pageNum}`, PW / 2, FOOTER_LINE + 4.5, { align: 'center' });
    doc.text('Generated by TRIVON HR Portal', PW - MR, FOOTER_LINE + 4.5, { align: 'right' });
  }

  function addPage() {
    drawFooter();
    doc.addPage();
    pageNum++;
    drawHeader();
    y = CONTENT_START;
  }

  function chk(needed = 8) {
    if (y + needed > MAX_Y) addPage();
  }

  // ── Style / draw primitives ──────────────────────────────────────────────────

  function style(size, weight = 'normal', color = DARK) {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  }

  function txt(str, x, opts = {}) {
    doc.text(safe(String(str ?? '')), x, y, opts);
  }

  // Wrapped paragraph
  function para(str, { size = 9.5, weight = 'normal', color = DARK, indent = 0, gap = 3 } = {}) {
    style(size, weight, color);
    const lh    = size * 0.42;
    const lines = doc.splitTextToSize(safe(String(str ?? '')), CW - indent);
    chk(lines.length * (lh + 0.6) + gap);
    lines.forEach(l => { doc.text(l, ML + indent, y); y += lh + 0.6; });
    y += gap;
  }

  // Numbered list
  function numList(items, { size = 9, gap = 1.5 } = {}) {
    style(size, 'normal', DARK);
    const lh = size * 0.42;
    items.forEach((item, i) => {
      const lines = doc.splitTextToSize(`${i + 1}.  ${safe(String(item ?? ''))}`, CW - 6);
      chk(lines.length * (lh + 0.5) + gap);
      lines.forEach((l, j) => { doc.text(l, j === 0 ? ML : ML + 6, y); y += lh + 0.5; });
      y += gap;
    });
    y += 2;
  }

  // Bullet list
  function bulletList(items, { size = 9, gap = 1 } = {}) {
    style(size, 'normal', DARK);
    const lh = size * 0.42;
    items.forEach(item => {
      const lines = doc.splitTextToSize(`-  ${safe(String(item ?? ''))}`, CW - 5);
      chk(lines.length * (lh + 0.5) + gap);
      lines.forEach((l, j) => { doc.text(l, j === 0 ? ML : ML + 5, y); y += lh + 0.5; });
      y += gap;
    });
    y += 2;
  }

  // Blue filled section title bar
  function sectionTitle(title) {
    chk(14);
    y += 2;
    doc.setFillColor(...BLUE);
    doc.rect(ML, y - 5, CW, 9, 'F');
    style(8.5, 'bold', WHITE);
    doc.text(title.toUpperCase(), ML + 4, y + 0.5);
    y += 11;
  }

  // Green tinted sub-heading (for type-specific sections)
  function subSection(title) {
    chk(12);
    y += 1;
    doc.setFillColor(...LGRN);
    doc.rect(ML, y - 4.5, CW, 8, 'F');
    doc.setFillColor(...GREEN);
    doc.rect(ML, y - 4.5, 3, 8, 'F');
    style(8, 'bold', GREEN);
    doc.text(title.toUpperCase(), ML + 6, y + 0.5);
    y += 10;
  }

  // Two-column key-value table row
  function tableRow(label, value, { highlight = false, altBg = false } = {}) {
    const ROW_H = 9;
    chk(ROW_H + 2);

    if (highlight) {
      doc.setFillColor(...LBLUE);
    } else if (altBg) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(...WHITE);
    }
    doc.rect(ML, y - 5.5, CW, ROW_H, 'F');

    if (highlight) {
      doc.setFillColor(...BLUE);
      doc.rect(ML, y - 5.5, 3, ROW_H, 'F');
    }

    style(8, 'normal', GRAY);
    doc.text(label, ML + 5, y);

    if (highlight) {
      style(9.5, 'bold', BLUE);
    } else {
      style(9, 'bold', DARK);
    }
    doc.text(String(value), ML + 68, y);

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 3.5, PW - MR, y + 3.5);
    y += ROW_H;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Letterhead, Addressee, Subject Banner, Opening, Details Table
  // ═══════════════════════════════════════════════════════════════════════════
  drawHeader();

  // Company address block
  style(11, 'bold', BLUE);
  txt(CO_NAME, ML);
  y += 5.5;
  style(8, 'normal', GRAY);
  txt(CO_ADDR, ML);
  y += 4;
  txt(CO_CONTACT, ML);
  y += 3;

  // Blue brand rule
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.7);
  doc.line(ML, y, PW - MR, y);
  y += 6;

  // Ref number + date on same baseline
  style(8.5, 'bold', DARK);
  txt(`Ref No: ${offer.offer_number}`, ML);
  style(8.5, 'normal', GRAY);
  txt(`Date: ${fmtDate(offer.offer_date)}`, PW - MR, { align: 'right' });
  y += 9;

  // Addressee
  style(8.5, 'normal', GRAY);
  txt('To,', ML);
  y += 4.5;
  style(10.5, 'bold', DARK);
  txt(offer.candidate_name, ML);
  y += 5;
  style(8.5, 'normal', GRAY);
  txt(offer.candidate_email, ML);
  y += 4;
  txt(offer.candidate_phone, ML);
  y += 9;

  // Subject banner
  const bannerLabel = isIntern  ? 'OFFER OF INTERNSHIP'
    : isCTR   ? 'OFFER OF CONTRACT ENGAGEMENT'
    : isPT    ? 'OFFER OF PART-TIME EMPLOYMENT'
    : isTrainee ? 'OFFER OF TRAINEE APPOINTMENT'
    : 'OFFER OF APPOINTMENT';

  doc.setFillColor(...LBLUE);
  doc.rect(ML, y - 4, CW, 11, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(ML, y - 4, 3, 11, 'F');
  style(11, 'bold', BLUE);
  doc.text(bannerLabel, PW / 2, y + 3.5, { align: 'center' });
  y += 14;

  // Salutation
  style(9.5, 'normal', DARK);
  txt(`Dear ${firstName(offer.candidate_name)},`, ML);
  y += 7;

  // Opening paragraph — type-specific
  if (isIntern) {
    para(
      `We are delighted to offer you an Internship in the ${offer.department} department at ` +
      `${CO_NAME}. Following a thorough evaluation of your profile, we are pleased to extend ` +
      `this opportunity and look forward to your valuable contributions during the internship period.`
    );
  } else if (isFT) {
    const modeNote = type === 'remote' ? ' on a fully remote basis'
      : type === 'hybrid' ? ' on a hybrid work arrangement'
      : '';
    para(
      `We are pleased to offer you the position of ${offer.job_role}${modeNote} in the ` +
      `${offer.department} department at ${CO_NAME}. This offer is made following a ` +
      `comprehensive evaluation of your qualifications and experience, and we are confident ` +
      `that you will make a significant and lasting contribution to our organization.`
    );
  } else if (isPT) {
    para(
      `We are pleased to offer you a Part-Time engagement as ${offer.job_role} in the ` +
      `${offer.department} department at ${CO_NAME}. This offer follows a careful assessment ` +
      `of your qualifications and we welcome you to our team.`
    );
  } else if (isCTR) {
    para(
      `We are pleased to engage your professional services on a ${EMP_LABELS[type]} basis ` +
      `for the role of ${offer.job_role} in the ${offer.department} department at ` +
      `${CO_NAME}. The terms and scope of this engagement are detailed below.`
    );
  } else if (isTrainee) {
    para(
      `We are pleased to offer you a Trainee position as ${offer.job_role} in the ` +
      `${offer.department} department at ${CO_NAME}. This role is designed to provide you ` +
      `with structured learning, hands-on experience, and mentored development.`
    );
  } else {
    para(
      `We are pleased to offer you the position of ${offer.job_role} in the ` +
      `${offer.department} department at ${CO_NAME}. This offer follows a thorough ` +
      `evaluation of your qualifications, and we look forward to your association with us.`
    );
  }

  // ── Appointment Details Table ────────────────────────────────────────────────
  y += 2;
  style(8.5, 'bold', DARK);
  txt('APPOINTMENT DETAILS', ML);
  y += 2;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.35);
  doc.line(ML, y, PW - MR, y);
  y += 6;

  let alt = false;
  const row = (label, value, highlight = false) => {
    tableRow(label, value, { highlight, altBg: alt && !highlight });
    alt = !alt;
  };

  row('Position / Role',   offer.job_role);
  row('Department',        offer.department);
  row('Employment Type',   EMP_LABELS[type] ?? type);
  row('Date of Joining',   fmtDate(offer.date_of_joining));

  if (isIntern) {
    if (offer.internship_duration) row('Internship Duration', offer.internship_duration, false);
    row('Monthly Stipend', fmtCurrency(offer.salary), true);
  } else if (isTrainee) {
    if (offer.training_duration)  row('Training Duration', offer.training_duration, false);
    row('Monthly Salary', fmtCurrency(offer.salary), true);
    if (offer.training_stipend)   row('Training Stipend', fmtCurrency(offer.training_stipend), false);
  } else if (isFT) {
    row('Monthly Gross Salary', fmtCurrency(offer.salary), true);
    if (offer.annual_ctc)         row('Annual CTC (Total)', fmtCurrency(offer.annual_ctc));
    if (offer.probation_months)   row('Probation Period', `${offer.probation_months} month${offer.probation_months > 1 ? 's' : ''}`);
    if (offer.notice_period_days) row('Notice Period', `${offer.notice_period_days} calendar day${offer.notice_period_days > 1 ? 's' : ''}`);
    if (type === 'remote')  row('Work Mode', 'Fully Remote');
    if (type === 'hybrid')  row('Work Mode', 'Hybrid (Office + Remote)');
  } else if (isPT) {
    row('Monthly Gross Salary', fmtCurrency(offer.salary), true);
    if (offer.notice_period_days) row('Notice Period', `${offer.notice_period_days} calendar day${offer.notice_period_days > 1 ? 's' : ''}`);
  } else if (isCTR) {
    if (offer.contract_duration)  row('Contract Duration', offer.contract_duration, false);
    row('Monthly Compensation', fmtCurrency(offer.salary), true);
  } else {
    row('Monthly Salary', fmtCurrency(offer.salary), true);
  }

  if (offer.expiry_date) row('Offer Valid Until', fmtDate(offer.expiry_date));

  y += 5;

  para(
    'This offer is conditional upon successful completion of background verification and ' +
    'submission of all required documents on or before the date of joining. Please read all ' +
    'terms carefully, sign, and return a copy to the HR Department to confirm your acceptance.'
  );

  if (offer.remarks && offer.remarks.trim()) {
    para(`Additional Note: ${offer.remarks.trim()}`, { size: 8.5, color: GRAY });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Type-Specific Terms + Roles & Responsibilities
  // ═══════════════════════════════════════════════════════════════════════════
  addPage();

  // ── Full-Time / Remote / Hybrid ──────────────────────────────────────────
  if (isFT) {
    sectionTitle('Employment Terms & Benefits');

    subSection('Work Schedule & Probation');
    if (offer.probation_months) {
      para(
        `You will serve a probation period of ${offer.probation_months} month(s) commencing ` +
        `from your date of joining. During this period your employment may be reviewed and ` +
        `confirmed or terminated with 7 days' notice by either party.`
      );
    } else {
      para(
        'You will serve a probation period of 3 (three) months from the date of joining, during ' +
        'which either party may terminate the employment with 7 (seven) calendar days\' written notice.'
      );
    }

    if (type === 'remote') {
      para(
        'This is a fully remote position. You are expected to maintain a dedicated, professional ' +
        'workspace, attend all scheduled video calls, and be available during standard business hours ' +
        '(9:00 AM – 6:00 PM IST). The company may require you to visit the office for onboarding, ' +
        'team events, or client meetings with reasonable advance notice.'
      );
    } else if (type === 'hybrid') {
      para(
        'This is a hybrid position. You are required to be present at the designated office location ' +
        'on agreed days as communicated by your reporting manager. The remaining days may be worked ' +
        'remotely subject to project requirements and manager discretion.'
      );
    } else {
      para(
        'Standard working hours are 9:00 AM to 6:00 PM, Monday through Friday, with a 1-hour lunch ' +
        'break. Additional hours may be required based on project needs without additional compensation ' +
        'unless explicitly agreed otherwise.'
      );
    }

    subSection('Employee Benefits');
    if (offer.employee_benefits && offer.employee_benefits.trim()) {
      const benefitLines = offer.employee_benefits.split('\n').map(l => l.trim()).filter(Boolean);
      if (benefitLines.length > 1) {
        bulletList(benefitLines);
      } else {
        para(offer.employee_benefits.trim());
      }
    } else {
      bulletList([
        'Group Health Insurance (employee + family) as per company policy',
        'Provident Fund (PF) contribution at statutory rates (12% employer + 12% employee)',
        'Employee State Insurance (ESI) applicable as per statutory thresholds',
        'Gratuity as per the Payment of Gratuity Act, 1972 (after 5 years of continuous service)',
        'Annual performance bonus / incentive as per company performance and individual rating',
        'Mobile and internet reimbursement as per role eligibility',
      ]);
    }

    subSection('Leave Policy');
    if (offer.leave_policy && offer.leave_policy.trim()) {
      const leaveLines = offer.leave_policy.split('\n').map(l => l.trim()).filter(Boolean);
      if (leaveLines.length > 1) {
        bulletList(leaveLines);
      } else {
        para(offer.leave_policy.trim());
      }
    } else {
      bulletList([
        'Annual / Earned Leave: 18 days per calendar year (accrued at 1.5 days per month)',
        'Sick / Medical Leave: 12 days per calendar year (non-encashable)',
        'Casual Leave: 6 days per calendar year',
        'Public & National Holidays as declared by the company each year',
        'Maternity / Paternity leave as per applicable statutory provisions',
        'Leave Without Pay (LWP) at management discretion for extraordinary circumstances',
      ]);
    }

    if (offer.notice_period_days) {
      subSection('Notice Period');
      para(
        `After confirmation, either party may terminate the employment by providing ${offer.notice_period_days} ` +
        `calendar days' written notice or payment of salary in lieu thereof. The company reserves the ` +
        `right to waive the notice period at its discretion.`
      );
    }
  }

  // ── Part-Time ────────────────────────────────────────────────────────────
  if (isPT) {
    sectionTitle('Part-Time Employment Conditions');

    subSection('Working Hours & Schedule');
    para(
      'This is a part-time engagement. Working hours, schedule, and weekly commitment shall be ' +
      'agreed between you and your reporting manager prior to or on the date of joining. The ' +
      'agreed schedule may be adjusted by mutual written consent based on business requirements.'
    );

    subSection('Compensation & Benefits');
    para(
      `Your monthly compensation of ${fmtCurrency(offer.salary)} is calculated on a pro-rata ` +
      `basis relative to the agreed working hours. Statutory deductions (PF, ESI, TDS) will be ` +
      `applied where applicable. Benefits such as health insurance and leave entitlement are ` +
      `pro-rated to your contracted hours relative to a standard full-time week.`
    );

    numList([
      'Leave entitlement is pro-rated based on the fraction of full-time hours worked.',
      'Statutory deductions (PF, ESI, TDS) shall apply as per applicable law.',
      'Performance reviews may be conducted at manager discretion.',
      `Notice period: ${offer.notice_period_days ? `${offer.notice_period_days} calendar days` : '14 (fourteen) calendar days'} written notice by either party.`,
      'Remote or flexible working arrangements may be permitted subject to manager approval.',
      'The company does not guarantee minimum hours beyond those agreed in this offer.',
    ]);
  }

  // ── Internship ───────────────────────────────────────────────────────────
  if (isIntern) {
    sectionTitle('Internship Programme Details');

    subSection('Duration & Schedule');
    para(
      `The internship shall be for a period of ${offer.internship_duration || 'the agreed duration'}, ` +
      `commencing on ${fmtDate(offer.date_of_joining)}. Working hours are 9:30 AM to 6:00 PM, ` +
      `Monday through Saturday. The internship may be extended by mutual written consent.`
    );

    subSection('Learning Objectives');
    if (offer.learning_objectives && offer.learning_objectives.trim()) {
      const objLines = offer.learning_objectives.split('\n').map(l => l.trim()).filter(Boolean);
      if (objLines.length > 1) {
        bulletList(objLines);
      } else {
        para(offer.learning_objectives.trim());
      }
    } else {
      bulletList([
        `Gain practical, hands-on exposure to real-world ${offer.department} processes and workflows`,
        'Work on live projects and contribute to departmental goals and deliverables',
        'Develop professional skills including communication, problem-solving, and teamwork',
        'Learn to use industry-standard tools, platforms, and methodologies',
        `Build subject-matter depth in ${offer.job_role} functions through mentored assignments`,
        'Prepare and present project reports and deliverables at the conclusion of the internship',
      ]);
    }

    subSection('Stipend & Internship Conditions');
    numList([
      `A monthly stipend of ${fmtCurrency(offer.salary)} will be paid on the last working day of each month.`,
      'This stipend is all-inclusive and is not subject to PF or ESI deductions unless legally mandated.',
      'The intern will be assigned a dedicated mentor / supervisor from the respective department.',
      'Regular performance reviews will be conducted to assess progress, contribution, and conduct.',
      'Academic or institutional credit letters may be issued upon request, subject to supervisor approval.',
      'The intern is expected to maintain attendance of at least 90% of working days.',
    ]);
  }

  // ── Contract / Temporary ─────────────────────────────────────────────────
  if (isCTR) {
    sectionTitle(`Contract Terms${type === 'temporary' ? ' (Temporary Engagement)' : ''}`);

    subSection('Contract Duration & Commencement');
    para(
      `This contract engagement is for a period of ${offer.contract_duration || 'the agreed duration'}, ` +
      `commencing on ${fmtDate(offer.date_of_joining)}. ` +
      (type === 'temporary'
        ? 'This is a temporary engagement to meet specific business needs and does not create an obligation for permanent employment.'
        : 'This contract shall automatically expire at the end of the agreed term unless renewed in writing by both parties.')
    );

    subSection('Project / Scope of Assignment');
    if (offer.project_assignment && offer.project_assignment.trim()) {
      para(offer.project_assignment.trim());
    } else {
      para(
        `You will be engaged to deliver services in the capacity of ${offer.job_role} within the ` +
        `${offer.department} department. Specific deliverables, milestones, and acceptance criteria ` +
        `shall be communicated by your engagement manager and may be documented in a separate ` +
        `Statement of Work (SOW) or project brief.`
      );
    }

    subSection('Payment & Renewal Conditions');
    numList([
      `Monthly compensation of ${fmtCurrency(offer.salary)} shall be paid on the last working day of each calendar month.`,
      'All statutory deductions (TDS, GST where applicable) shall be applied in accordance with prevailing law.',
      offer.renewal_conditions && offer.renewal_conditions.trim()
        ? offer.renewal_conditions.trim()
        : 'Contract renewal is at the sole discretion of the company based on project requirements, budget approval, and satisfactory performance.',
      'No benefits such as PF, ESI, gratuity, or leave encashment are applicable unless explicitly stated herein.',
      'Either party may terminate this contract by providing 14 (fourteen) calendar days\' written notice.',
      'Deliverables not completed within the contract period may be negotiated for an extension or reassigned at company discretion.',
    ]);
  }

  // ── Trainee ──────────────────────────────────────────────────────────────
  if (isTrainee) {
    sectionTitle('Trainee Programme Details');

    subSection('Training Duration & Structure');
    para(
      `The training programme is for a period of ${offer.training_duration || 'the agreed duration'}, ` +
      `commencing on ${fmtDate(offer.date_of_joining)}. The programme combines structured classroom / ` +
      `online learning with on-the-job project assignments under the supervision of a designated mentor.`
    );

    subSection('Compensation During Training');
    numList([
      `Monthly salary of ${fmtCurrency(offer.salary)} shall be paid during the training period.`,
      offer.training_stipend
        ? `An additional training stipend of ${fmtCurrency(offer.training_stipend)} per month may be paid separately as per your offer terms.`
        : 'No additional training stipend is applicable beyond the monthly salary stated above.',
      'Upon successful completion of the training programme and post-training assessment, you will be considered for a permanent position subject to business requirements.',
      'Statutory deductions shall apply as per law during the training period.',
    ]);
  }

  // ── Roles & Responsibilities (all types) ────────────────────────────────
  sectionTitle('Roles and Responsibilities');

  if (offer.roles_responsibilities && offer.roles_responsibilities.trim()) {
    const lines = offer.roles_responsibilities.split('\n').map(l => l.trim()).filter(Boolean);
    lines.length > 1 ? bulletList(lines) : para(lines[0]);
  } else {
    const defaultRoles = {
      full_time: [
        `Lead and deliver projects within the ${offer.department} department in alignment with organizational goals`,
        'Drive cross-functional collaboration and contribute to team objectives and departmental KPIs',
        'Prepare and present reports, dashboards, and recommendations to senior stakeholders',
        'Mentor junior team members and support a culture of continuous learning and improvement',
        'Ensure compliance with all company policies, quality standards, and regulatory requirements',
        'Participate in performance reviews, goal-setting, and career development discussions',
        'Maintain confidentiality of company, client, and employee information at all times',
        'Contribute to process improvement initiatives and operational efficiency programs',
      ],
      part_time: [
        `Contribute to ${offer.department} department activities within the agreed working hours`,
        'Complete assigned tasks and deliverables to the standard expected for the role',
        'Attend scheduled meetings and communicate effectively with the team',
        'Maintain all records, reports, and documentation as required',
        'Adhere to company policies and professional standards at all times',
      ],
      intern: [
        `Support the ${offer.department} team in day-to-day operations and project activities`,
        'Assist in research, analysis, documentation, and reporting tasks',
        'Participate in project planning sessions and contribute meaningfully to team discussions',
        'Prepare presentations, summaries, and deliverables as assigned by the mentor',
        'Collaborate with team members across functions and departments',
        'Maintain accurate records and documentation of all assigned work',
        'Adhere to company policies, code of conduct, and professional standards',
        'Complete all tasks within stipulated timelines and communicate proactively about blockers',
      ],
      contract: [
        `Deliver contracted services as ${offer.job_role} within the ${offer.department} function`,
        'Meet all agreed milestones, deliverables, and acceptance criteria within the contract period',
        'Maintain transparent and regular communication with the engagement manager',
        'Produce high-quality work products meeting the company\'s technical and quality standards',
        'Safeguard all confidential and proprietary information received during the engagement',
        'Report progress, risks, and blockers proactively to ensure project continuity',
      ],
    };

    const roles = defaultRoles[type] || defaultRoles['full_time'];
    bulletList(roles);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — General Terms & Conditions + Confidentiality & IP
  // ═══════════════════════════════════════════════════════════════════════════
  addPage();

  sectionTitle('Terms and Conditions');

  const salaryTerm = isIntern || isTrainee
    ? `The monthly stipend / salary of ${fmtCurrency(offer.salary)} is inclusive of all allowances and subject to applicable statutory deductions.`
    : isCTR
    ? `The monthly compensation of ${fmtCurrency(offer.salary)} is payable on the last working day of each month, subject to completion of agreed deliverables and statutory deductions.`
    : `The monthly gross salary of ${fmtCurrency(offer.salary)} is inclusive of all allowances. Statutory deductions (PF, ESI, TDS) shall be applied as per prevailing law.`;

  numList([
    `This offer is valid for acceptance until ${offer.expiry_date ? fmtDate(offer.expiry_date) : '14 (fourteen) days from the date of issue'}.`,
    'The candidate must produce all original educational certificates, identity documents (Aadhaar / PAN / Passport), and two passport-size photographs on or before the date of joining.',
    `The engagement commences on ${fmtDate(offer.date_of_joining)} and shall continue for the agreed term, subject to satisfactory performance and conduct.`,
    salaryTerm,
    'Working hours, attendance, and leave entitlement shall be governed by the company\'s HR policies as communicated by the HR Department and may be updated from time to time.',
    'The candidate shall adhere to the company\'s code of conduct, dress code, information security policy, and all applicable workplace policies.',
    'This offer is subject to satisfactory completion of background, reference, and educational verification. Discovery of misrepresentation may lead to immediate withdrawal of this offer.',
    'The company reserves the right to modify, amend, or withdraw this offer prior to acceptance or before the date of joining, with written notice to the candidate.',
    `${isCTR ? 'Either party may terminate this contract' : 'Either party may exit this engagement'} by providing the requisite notice period as stipulated, or by mutual written agreement.`,
  ]);

  sectionTitle('Confidentiality and Intellectual Property');

  para(
    `During this engagement, you may have access to confidential, proprietary, and sensitive ` +
    `information belonging to ${CO_NAME} and its clients. By accepting this offer, you agree to the following obligations:`
  );

  numList([
    `Maintain strict confidentiality of all proprietary, technical, business, financial, and client information encountered during the course of your engagement with ${CO_NAME}.`,
    'Not disclose, discuss, publish, or transfer any confidential information to any third party, directly or indirectly, during or after the term of this engagement.',
    'Not use any company information, data, code, design, processes, or intellectual property for any purpose outside the defined scope of your role.',
    'Return all company property, equipment, access credentials, data, and documents upon completion or termination of the engagement without retaining any copies.',
    `All intellectual property, inventions, software, algorithms, designs, and work products conceived or developed during this engagement shall be the sole and exclusive property of ${CO_NAME}.`,
    'These confidentiality and IP obligations shall survive the expiry or termination of this engagement for a period of 2 (two) years from the date of separation.',
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — Termination + Completion Certificate + Signatures
  // ═══════════════════════════════════════════════════════════════════════════
  addPage();

  sectionTitle('Termination');

  para(
    `${CO_NAME} reserves the right to terminate this engagement immediately and without ` +
    'prior notice or compensation in any of the following circumstances:'
  );

  numList([
    'Breach of confidentiality obligations, intellectual property rights, or any company policy.',
    'Provision of false, fabricated, or misleading information during the application, onboarding, or verification process.',
    `Unsatisfactory performance, persistent poor attendance, or conduct unbecoming of a professional as assessed by the reporting manager and HR.`,
    `Any act of gross misconduct, insubordination, harassment, fraud, or any act that is detrimental to the interests or reputation of ${CO_NAME} or its clients.`,
    'Violation of applicable laws, regulations, or statutory requirements during the course of employment.',
    'Force majeure events including natural disasters, pandemics, governmental orders, or other circumstances beyond the reasonable control of the company.',
  ]);

  // Completion / Service Certificate — conditional by type
  const hasCertSection = !isCTR;
  if (hasCertSection) {
    sectionTitle(isIntern || isTrainee ? 'Completion Certificate' : 'Service Certificate');

    const certType = isIntern ? 'Internship Completion Certificate'
      : isTrainee ? 'Trainee Completion Certificate'
      : 'Letter of Experience';

    para(
      `Upon successful and satisfactory completion of this engagement, ${CO_NAME} shall issue an ` +
      `official ${certType} to ${offer.candidate_name}. This document formally acknowledges your ` +
      `contribution, designation, and period of service.`
    );

    const certBullets = isIntern || isTrainee ? [
      'The certificate will be issued within 15 (fifteen) working days of the last working day.',
      'Issuance is subject to a satisfactory final performance evaluation by the reporting manager.',
      "The certificate shall state the candidate's full name, designation, department, duration, and key contributions.",
      'A performance recommendation letter may be provided at the sole discretion of the reporting manager.',
      'Early exit or termination due to misconduct will result in forfeiture of the completion certificate.',
    ] : [
      'A Letter of Experience will be issued within 30 (thirty) working days of the last working day.',
      'Issuance is conditional upon completion of the full notice period and settlement of all dues.',
      "The document shall state the employee's designation, department, and period of service.",
      'A relieving letter will be issued simultaneously upon completion of the exit formalities.',
      'Final settlement including gratuity (if applicable) shall be processed per statutory timelines.',
    ];
    bulletList(certBullets);
  }

  // ── Signature Block ──────────────────────────────────────────────────────
  chk(80);

  y += 4;
  style(9.5, 'normal', DARK);
  txt('Yours sincerely,', ML);
  y += 4.5;
  style(8.5, 'normal', GRAY);
  txt(`For ${CO_NAME}`, ML);
  y += 20; // space for physical signature

  // Signature line
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + 65, y);
  y += 5;

  style(9.5, 'bold', DARK);
  txt(CO_SIG, ML);
  y += 4.5;
  style(8.5, 'normal', GRAY);
  txt(CO_TITLE, ML);
  y += 4;
  txt(CO_NAME, ML);
  y += 12;

  // Divider before acceptance section
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.5);
  doc.line(ML, y, PW - MR, y);
  y += 7;

  // Candidate Acceptance header
  doc.setFillColor(248, 250, 252);
  doc.rect(ML, y - 4.5, CW, 9, 'F');
  style(9.5, 'bold', DARK);
  doc.text('CANDIDATE ACCEPTANCE', ML + 4, y + 0.5);
  y += 12;

  const engLabel = isIntern ? 'Internship'
    : isCTR ? 'Contract Engagement'
    : isPT  ? 'Part-Time Employment'
    : isTrainee ? 'Trainee Appointment'
    : 'Offer of Appointment';

  para(
    `I, ${offer.candidate_name}, hereby confirm that I have carefully read and fully understood ` +
    `all the terms and conditions set forth in this ${engLabel} letter. I accept this offer for ` +
    `the position of ${offer.job_role} in the ${offer.department} department at ${CO_NAME}, ` +
    `effective ${fmtDate(offer.date_of_joining)}.`,
    { size: 9 }
  );

  y += 6;
  chk(20);

  // Dual signature / date lines
  const SIG_W = (CW - 20) / 2;
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.4);
  doc.line(ML,              y, ML + SIG_W,               y);
  doc.line(ML + SIG_W + 20, y, ML + SIG_W + 20 + SIG_W, y);

  y += 5;
  style(8, 'normal', GRAY);
  doc.text('Candidate Signature', ML, y);
  doc.text('Date of Acceptance', ML + SIG_W + 20, y);

  // Final footer
  drawFooter();

  doc.save(`${offer.offer_number}_Offer_Letter.pdf`);
}
