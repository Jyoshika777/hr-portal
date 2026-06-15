import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getOfferLetterById,
  updateOfferLetter,
  deleteOfferLetter,
} from '../../services/offerLetterService';
import { generateOfferPDF } from '../../utils/generateOfferPDF';
import '../../styles/Candidates.css';
import '../../styles/Offers.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const CO_NAME  = 'TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED';
const CO_ADDR  = 'Plot No. 12, Software Technology Park, Madhapur, Hyderabad – 500 081';
const CO_SIG   = 'Bhanu Pratap Dadi';
const CO_TITLE = 'Chief Executive Officer';

const STATUS_LABELS = {
  draft: 'Draft', sent: 'Sent', accepted: 'Accepted',
  rejected: 'Rejected', expired: 'Expired',
};

const TYPE_LABELS = {
  full_time: 'Full-Time Permanent', part_time: 'Part-Time',
  contract:  'Contract',           intern:    'Internship',
  temporary: 'Temporary',          trainee:   'Trainee',
  remote:    'Remote (Full-Time)', hybrid:    'Hybrid (Full-Time)',
};

const FT_GROUP  = ['full_time', 'remote', 'hybrid'];
const CTR_GROUP = ['contract', 'temporary'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fmtDateShort(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
function fmtCurrency(v) {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(v);
}
function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function firstName(n) { return (n || '').trim().split(/\s+/)[0]; }

// ── Small reusable pieces ─────────────────────────────────────────────────────
function InfoCard({ title, children, full = false }) {
  return (
    <div className={`offer-detail-card${full ? ' offer-detail-card--full' : ''}`}>
      <p className="offer-detail-card-title">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value, mono = false, salary = false, pre = false, children }) {
  const cls = salary ? 'offer-detail-value--salary'
    : mono  ? 'offer-detail-value--mono'
    : pre   ? 'offer-detail-value--pre'
    : 'offer-detail-value';
  return (
    <div className="offer-detail-field">
      <span className="offer-detail-label">{label}</span>
      {children
        ? <div className={cls}>{children}</div>
        : <span className={cls}>{value ?? '—'}</span>}
    </div>
  );
}

// ── Type-specific detail card ─────────────────────────────────────────────────
function TypeSpecificCard({ offer }) {
  const t = offer.employment_type;
  if (!t) return null;

  const isFT  = FT_GROUP.includes(t);
  const isCTR = CTR_GROUP.includes(t);
  const isIntern  = t === 'intern';
  const isTrainee = t === 'trainee';

  if (!isFT && !isCTR && !isIntern && !isTrainee) return null;

  const title = isFT  ? 'Employment Terms'
    : isCTR ? 'Contract Details'
    : isIntern ? 'Internship Details'
    : 'Training Details';

  return (
    <InfoCard title={title}>
      {isFT && (
        <div className="offer-detail-fields-grid">
          {offer.annual_ctc         && <Field label="Annual CTC"          value={fmtCurrency(offer.annual_ctc)} salary />}
          {offer.probation_months   && <Field label="Probation Period"    value={`${offer.probation_months} month${offer.probation_months > 1 ? 's' : ''}`} />}
          {offer.notice_period_days && <Field label="Notice Period"       value={`${offer.notice_period_days} days`} />}
          {(t === 'remote' || t === 'hybrid') && <Field label="Work Mode" value={t === 'remote' ? 'Fully Remote' : 'Hybrid'} />}
          {offer.employee_benefits && offer.employee_benefits.trim() && (
            <Field label="Employee Benefits" pre>{offer.employee_benefits}</Field>
          )}
          {offer.leave_policy && offer.leave_policy.trim() && (
            <Field label="Leave Policy" pre>{offer.leave_policy}</Field>
          )}
          {!offer.annual_ctc && !offer.probation_months && !offer.notice_period_days
            && !offer.employee_benefits && !offer.leave_policy && (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              No additional employment terms recorded.
            </p>
          )}
        </div>
      )}
      {isCTR && (
        <div className="offer-detail-fields-grid">
          {offer.contract_duration && <Field label="Contract Duration" value={offer.contract_duration} />}
          {offer.project_assignment && offer.project_assignment.trim() && (
            <Field label="Project / Scope" pre>{offer.project_assignment}</Field>
          )}
          {offer.renewal_conditions && offer.renewal_conditions.trim() && (
            <Field label="Renewal Conditions" pre>{offer.renewal_conditions}</Field>
          )}
          {!offer.contract_duration && !offer.project_assignment && !offer.renewal_conditions && (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              No contract details recorded.
            </p>
          )}
        </div>
      )}
      {isIntern && (
        <div className="offer-detail-fields-grid">
          {offer.internship_duration && <Field label="Internship Duration" value={offer.internship_duration} />}
          {offer.learning_objectives && offer.learning_objectives.trim() && (
            <Field label="Learning Objectives" pre>{offer.learning_objectives}</Field>
          )}
          {!offer.internship_duration && !offer.learning_objectives && (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              No internship details recorded.
            </p>
          )}
        </div>
      )}
      {isTrainee && (
        <div className="offer-detail-fields-grid">
          {offer.training_duration && <Field label="Training Duration" value={offer.training_duration} />}
          {offer.training_stipend  && <Field label="Training Stipend"  value={fmtCurrency(offer.training_stipend)} />}
          {!offer.training_duration && !offer.training_stipend && (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              No training details recorded.
            </p>
          )}
        </div>
      )}
    </InfoCard>
  );
}

// ── HTML offer letter preview ─────────────────────────────────────────────────
function OfferPreview({ offer }) {
  const t        = offer.employment_type ?? 'full_time';
  const isFT     = FT_GROUP.includes(t);
  const isCTR    = CTR_GROUP.includes(t);
  const isIntern = t === 'intern';
  const isPT     = t === 'part_time';
  const isTrainee = t === 'trainee';

  const bannerLabel = isIntern ? 'OFFER OF INTERNSHIP'
    : isCTR  ? 'OFFER OF CONTRACT ENGAGEMENT'
    : isPT   ? 'OFFER OF PART-TIME EMPLOYMENT'
    : isTrainee ? 'OFFER OF TRAINEE APPOINTMENT'
    : 'OFFER OF APPOINTMENT';

  // Opening paragraph
  const openingPara = isFT
    ? `We are pleased to offer you the position of ${offer.job_role}${
        t === 'remote' ? ' on a fully remote basis' : t === 'hybrid' ? ' on a hybrid arrangement' : ''
      } in the ${offer.department} department at ${CO_NAME}. This offer follows a comprehensive evaluation of your qualifications and we look forward to your contribution to our organization.`
    : isIntern
    ? `We are delighted to offer you an Internship in the ${offer.department} department at ${CO_NAME}. Following a thorough evaluation of your profile, we are pleased to extend this opportunity and look forward to your contributions during the internship period.`
    : isPT
    ? `We are pleased to offer you a Part-Time engagement as ${offer.job_role} in the ${offer.department} department at ${CO_NAME}.`
    : isCTR
    ? `We are pleased to engage your professional services on a ${TYPE_LABELS[t]} basis for the role of ${offer.job_role} in the ${offer.department} department at ${CO_NAME}. The terms and scope of this engagement are detailed below.`
    : isTrainee
    ? `We are pleased to offer you a Trainee position as ${offer.job_role} in the ${offer.department} department at ${CO_NAME}. This role is designed to provide structured learning, hands-on experience, and mentored development.`
    : `We are pleased to offer you the position of ${offer.job_role} in the ${offer.department} department at ${CO_NAME}.`;

  // Table rows
  function TableRow({ label, value, salary = false }) {
    return (
      <div className={`offer-details-row${salary ? ' offer-details-row--salary' : ''}`}>
        <span className="offer-details-label">{label}</span>
        <span className={`offer-details-value${salary ? ' offer-salary-value' : ''}`}>{value}</span>
      </div>
    );
  }

  // Section heading (blue bar)
  function SH({ children }) {
    return <div className="offer-preview-section">{children}</div>;
  }

  // Sub-heading (green bar)
  function SubH({ children }) {
    return <div className="offer-preview-sub">{children}</div>;
  }

  function BulletList({ items }) {
    return (
      <ul className="offer-preview-list">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
  }

  function NumList({ items }) {
    return (
      <ol className="offer-preview-list">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ol>
    );
  }

  function TextBlock({ children }) {
    return <div className="offer-preview-textblock">{children}</div>;
  }

  // Default roles by type
  const defaultRoles = isFT ? [
    `Lead and deliver projects within the ${offer.department} department in alignment with organizational goals`,
    'Drive cross-functional collaboration and contribute to team objectives and departmental KPIs',
    'Prepare and present reports, dashboards, and recommendations to senior stakeholders',
    'Maintain confidentiality of company, client, and employee information at all times',
    'Contribute to process improvement initiatives and operational efficiency programs',
  ] : isIntern ? [
    `Support the ${offer.department} team in day-to-day operations and project activities`,
    'Assist in research, analysis, documentation, and reporting tasks',
    'Participate in project planning sessions and contribute meaningfully to team discussions',
    'Prepare presentations, summaries, and deliverables as assigned by the mentor',
    'Adhere to company policies, code of conduct, and professional standards',
  ] : isCTR ? [
    `Deliver contracted services as ${offer.job_role} within the ${offer.department} function`,
    'Meet all agreed milestones, deliverables, and acceptance criteria within the contract period',
    'Maintain transparent communication with the engagement manager',
    'Safeguard all confidential and proprietary information received during the engagement',
  ] : [
    `Contribute to ${offer.department} department activities within the agreed scope`,
    'Complete assigned tasks and deliverables to the standard expected for the role',
    'Maintain all records, reports, and documentation as required',
    'Adhere to company policies and professional standards at all times',
  ];

  const rolesLines = offer.roles_responsibilities
    ? offer.roles_responsibilities.split('\n').map(l => l.trim()).filter(Boolean)
    : [];

  const salaryTerm = isIntern || isTrainee
    ? `The monthly stipend of ${fmtCurrency(offer.salary)} is inclusive of all allowances and subject to applicable statutory deductions.`
    : isCTR
    ? `The monthly compensation of ${fmtCurrency(offer.salary)} is payable on the last working day of each month, subject to satisfactory delivery and statutory deductions.`
    : `The monthly gross salary of ${fmtCurrency(offer.salary)} is inclusive of all allowances. Statutory deductions (PF, ESI, TDS) shall be applied as per law.`;

  return (
    <div className="offer-letter-document">

      {/* ── Letterhead ── */}
      <div className="offer-letterhead">
        <div className="offer-letterhead-left">
          <div className="offer-company-logo" style={{ width: 52, height: 52, fontSize: 9, letterSpacing: 0.5 }}>
            <div style={{ lineHeight: 1.2 }}><div>TRIVON</div><div style={{ fontSize: 7 }}>SOFTWARE</div></div>
          </div>
          <div>
            <p className="offer-company-name" style={{ fontSize: 14 }}>{CO_NAME}</p>
            <p className="offer-company-dept">Human Resources Department</p>
            <p className="offer-company-dept" style={{ marginTop: 2 }}>{CO_ADDR}</p>
          </div>
        </div>
        <div className="offer-letterhead-right">
          <p className="offer-ref">Ref: <strong>{offer.offer_number}</strong></p>
          <p className="offer-ref">Date: {fmtDate(offer.offer_date)}</p>
        </div>
      </div>

      <hr className="offer-rule" />

      {/* ── Subject banner ── */}
      <div style={{
        background: '#eff6ff', borderLeft: '4px solid #1e40af',
        padding: '10px 16px', marginBottom: 20,
      }}>
        <p style={{ margin: 0, fontFamily: 'Arial,sans-serif', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.06em', color: '#1e40af', textAlign: 'center' }}>
          {bannerLabel}
        </p>
      </div>

      {/* ── Addressee ── */}
      <div className="offer-addressee">
        <p>To,</p>
        <p><strong>{offer.candidate_name}</strong></p>
        <p>{offer.candidate_email}</p>
        <p>{offer.candidate_phone}</p>
      </div>

      <p className="offer-salutation">Dear {firstName(offer.candidate_name)},</p>
      <p className="offer-para">{openingPara}</p>

      {/* ── Appointment details table ── */}
      <p className="offer-para" style={{ marginBottom: 6 }}>
        <strong style={{ fontFamily: 'Arial,sans-serif', fontSize: 12, letterSpacing: '0.04em' }}>
          APPOINTMENT DETAILS
        </strong>
      </p>
      <div className="offer-details-box">
        <TableRow label="Position / Role"  value={offer.job_role} />
        <TableRow label="Department"       value={offer.department} />
        <TableRow label="Employment Type"  value={TYPE_LABELS[t] ?? t} />
        <TableRow label="Date of Joining"  value={fmtDate(offer.date_of_joining)} />

        {isIntern  && offer.internship_duration && <TableRow label="Internship Duration" value={offer.internship_duration} />}
        {isIntern  && <TableRow label="Monthly Stipend"       value={fmtCurrency(offer.salary)} salary />}
        {isTrainee && offer.training_duration   && <TableRow label="Training Duration"   value={offer.training_duration} />}
        {isTrainee && <TableRow label="Monthly Salary"        value={fmtCurrency(offer.salary)} salary />}
        {isTrainee && offer.training_stipend    && <TableRow label="Training Stipend"    value={fmtCurrency(offer.training_stipend)} />}
        {isFT   && <TableRow label="Monthly Gross Salary"     value={fmtCurrency(offer.salary)} salary />}
        {isFT   && offer.annual_ctc         && <TableRow label="Annual CTC (Total)"      value={fmtCurrency(offer.annual_ctc)} />}
        {isFT   && offer.probation_months   && <TableRow label="Probation Period"         value={`${offer.probation_months} month${offer.probation_months > 1 ? 's' : ''}`} />}
        {isFT   && offer.notice_period_days && <TableRow label="Notice Period"            value={`${offer.notice_period_days} calendar days`} />}
        {t === 'remote' && <TableRow label="Work Mode" value="Fully Remote" />}
        {t === 'hybrid' && <TableRow label="Work Mode" value="Hybrid (Office + Remote)" />}
        {isPT   && <TableRow label="Monthly Gross Salary"     value={fmtCurrency(offer.salary)} salary />}
        {isPT   && offer.notice_period_days && <TableRow label="Notice Period"            value={`${offer.notice_period_days} calendar days`} />}
        {isCTR  && offer.contract_duration  && <TableRow label="Contract Duration"        value={offer.contract_duration} />}
        {isCTR  && <TableRow label="Monthly Compensation"     value={fmtCurrency(offer.salary)} salary />}
        {offer.expiry_date && <TableRow label="Offer Valid Until" value={fmtDate(offer.expiry_date)} />}
      </div>

      <p className="offer-para">
        This offer is conditional upon successful background verification and submission of
        all required documents on or before your date of joining. Please read all terms carefully,
        sign, and return a copy to the HR Department to confirm acceptance.
      </p>

      {offer.remarks && offer.remarks.trim() && (
        <p className="offer-para offer-para--remarks">{offer.remarks}</p>
      )}

      {/* ── Type-specific section ── */}
      {isFT && (
        <>
          <SH>Employment Terms & Benefits</SH>
          <SubH>Work Schedule & Probation</SubH>
          <p className="offer-para">
            {offer.probation_months
              ? `You will serve a probation period of ${offer.probation_months} month(s) from your date of joining. During probation, either party may terminate employment with 7 days' notice.`
              : "You will serve a probation period of 3 (three) months from the date of joining."}
            {t === 'remote' && ' This is a fully remote position. You are expected to maintain a professional workspace and be available during standard business hours (9:00 AM – 6:00 PM IST).'}
            {t === 'hybrid' && ' This is a hybrid position. Office attendance on agreed days is required; remaining days may be worked remotely subject to manager discretion.'}
            {t === 'full_time' && ' Standard working hours are 9:00 AM to 6:00 PM, Monday through Friday.'}
          </p>
          <SubH>Employee Benefits</SubH>
          {offer.employee_benefits && offer.employee_benefits.trim()
            ? <TextBlock>{offer.employee_benefits}</TextBlock>
            : <BulletList items={[
                'Group Health Insurance (employee + family)',
                'Provident Fund (PF) at statutory rates (12% employer + 12% employee)',
                'Gratuity as per the Payment of Gratuity Act, 1972',
                'Annual performance bonus as per company and individual rating',
                'Mobile and internet reimbursement as per role eligibility',
              ]} />
          }
          <SubH>Leave Policy</SubH>
          {offer.leave_policy && offer.leave_policy.trim()
            ? <TextBlock>{offer.leave_policy}</TextBlock>
            : <BulletList items={[
                'Annual / Earned Leave: 18 days per calendar year',
                'Sick / Medical Leave: 12 days per calendar year',
                'Casual Leave: 6 days per calendar year',
                'Public & National Holidays as declared annually',
              ]} />
          }
        </>
      )}

      {isPT && (
        <>
          <SH>Part-Time Employment Conditions</SH>
          <p className="offer-para">
            Working hours and weekly commitment shall be agreed with your reporting manager.
            Monthly compensation of {fmtCurrency(offer.salary)} is calculated on a pro-rata basis.
            {offer.notice_period_days && ` Notice period: ${offer.notice_period_days} calendar days by either party.`}
          </p>
          <NumList items={[
            'Leave entitlement is pro-rated based on the fraction of full-time hours worked.',
            'Statutory deductions (PF, ESI, TDS) apply as per applicable law.',
            'The company does not guarantee minimum hours beyond those agreed in this offer.',
          ]} />
        </>
      )}

      {isIntern && (
        <>
          <SH>Internship Programme Details</SH>
          <SubH>Duration & Schedule</SubH>
          <p className="offer-para">
            {`The internship is for a period of ${offer.internship_duration || 'the agreed duration'}, commencing on ${fmtDate(offer.date_of_joining)}. Working hours are 9:30 AM to 6:00 PM, Monday through Saturday.`}
          </p>
          <SubH>Learning Objectives</SubH>
          {offer.learning_objectives && offer.learning_objectives.trim()
            ? <TextBlock>{offer.learning_objectives}</TextBlock>
            : <BulletList items={[
                `Gain practical exposure to ${offer.department} processes and workflows`,
                'Work on live projects and contribute to departmental deliverables',
                'Develop professional skills including communication and problem-solving',
                `Build subject-matter depth in ${offer.job_role} through mentored assignments`,
              ]} />
          }
          <SubH>Stipend & Conditions</SubH>
          <NumList items={[
            `Monthly stipend of ${fmtCurrency(offer.salary)} paid on the last working day of each month.`,
            'The intern will be assigned a dedicated mentor from the respective department.',
            'Attendance of at least 90% of working days is expected.',
            'Academic credit letters may be issued upon request, subject to supervisor approval.',
          ]} />
        </>
      )}

      {isCTR && (
        <>
          <SH>{`Contract Terms${t === 'temporary' ? ' (Temporary Engagement)' : ''}`}</SH>
          <SubH>Duration & Commencement</SubH>
          <p className="offer-para">
            {`This engagement is for a period of ${offer.contract_duration || 'the agreed duration'}, commencing on ${fmtDate(offer.date_of_joining)}. `}
            {t === 'temporary'
              ? 'This is a temporary engagement and does not create an obligation for permanent employment.'
              : 'The contract expires at the end of the agreed term unless renewed in writing by both parties.'}
          </p>
          {offer.project_assignment && offer.project_assignment.trim() && (
            <>
              <SubH>Project / Scope of Assignment</SubH>
              <TextBlock>{offer.project_assignment}</TextBlock>
            </>
          )}
          <SubH>Payment & Renewal</SubH>
          <NumList items={[
            `Monthly compensation of ${fmtCurrency(offer.salary)} paid on the last working day of each month.`,
            offer.renewal_conditions && offer.renewal_conditions.trim()
              ? offer.renewal_conditions
              : 'Contract renewal is at the sole discretion of the company based on project requirements and satisfactory performance.',
            'Either party may terminate by providing 14 calendar days\' written notice.',
          ]} />
        </>
      )}

      {isTrainee && (
        <>
          <SH>Training Programme Details</SH>
          <p className="offer-para">
            {`The training programme is for a period of ${offer.training_duration || 'the agreed duration'}, commencing on ${fmtDate(offer.date_of_joining)}. The programme combines structured learning with on-the-job assignments under a designated mentor.`}
          </p>
          <NumList items={[
            `Monthly salary of ${fmtCurrency(offer.salary)} during the training period.`,
            offer.training_stipend
              ? `Additional training stipend of ${fmtCurrency(offer.training_stipend)}/month.`
              : 'No additional training stipend beyond the monthly salary stated.',
            'Upon successful completion you will be considered for a permanent position subject to business requirements.',
          ]} />
        </>
      )}

      {/* ── Roles & Responsibilities ── */}
      <SH>Roles and Responsibilities</SH>
      {rolesLines.length > 0
        ? <BulletList items={rolesLines} />
        : <BulletList items={defaultRoles} />
      }

      {/* ── Terms & Conditions ── */}
      <SH>Terms and Conditions</SH>
      <NumList items={[
        `This offer is valid until ${offer.expiry_date ? fmtDate(offer.expiry_date) : '14 days from the date of issue'}.`,
        'Original educational certificates, identity documents, and photographs must be submitted on or before the date of joining.',
        salaryTerm,
        "The candidate shall adhere to the company's code of conduct, dress code, and information security policy.",
        'This offer is subject to satisfactory background and reference verification.',
        'The company reserves the right to modify or withdraw this offer prior to acceptance with written notice.',
      ]} />

      {/* ── Confidentiality ── */}
      <SH>Confidentiality and Intellectual Property</SH>
      <NumList items={[
        `Maintain strict confidentiality of all proprietary, business, financial, and client information of ${CO_NAME}.`,
        'Not disclose any confidential information to third parties during or after the term of this engagement.',
        `All intellectual property developed during this engagement shall be the exclusive property of ${CO_NAME}.`,
        'These obligations survive the termination of this engagement for a period of 2 years.',
      ]} />

      {/* ── Termination ── */}
      <SH>Termination</SH>
      <NumList items={[
        'Breach of confidentiality obligations, IP rights, or company policies.',
        'Provision of false or misleading information during the application or onboarding process.',
        'Unsatisfactory performance, poor attendance, or gross misconduct.',
        'Force majeure events or circumstances beyond the reasonable control of the company.',
      ]} />

      {/* ── Completion certificate (not shown for contract types) ── */}
      {!isCTR && (
        <>
          <SH>{isIntern || isTrainee ? 'Completion Certificate' : 'Service Certificate'}</SH>
          <p className="offer-para">
            Upon successful completion of this engagement, {CO_NAME} shall issue an official{' '}
            {isIntern ? 'Internship Completion Certificate'
              : isTrainee ? 'Trainee Completion Certificate'
              : 'Letter of Experience'}{' '}
            within {isIntern || isTrainee ? '15 (fifteen)' : '30 (thirty)'} working days of the last working day,
            subject to satisfactory performance evaluation and completion of exit formalities.
          </p>
        </>
      )}

      {/* ── Signature block ── */}
      <div className="offer-signature">
        <p className="offer-para">Yours sincerely,</p>
        <p className="offer-para" style={{ color: '#64748b', fontSize: 12.5 }}>
          For {CO_NAME}
        </p>
        <div className="offer-sig-spacer" />
        <div className="offer-sig-line" />
        <p className="offer-sig-name">{CO_SIG}</p>
        <p className="offer-sig-title">{CO_TITLE}</p>
        <p className="offer-sig-company">{CO_NAME}</p>
      </div>

      {/* ── Candidate acceptance ── */}
      <hr className="offer-rule offer-rule--acceptance" />
      <p className="offer-acceptance-heading">CANDIDATE ACCEPTANCE</p>
      <p className="offer-para">
        I, <strong>{offer.candidate_name}</strong>, hereby confirm that I have carefully read and
        fully understood all the terms and conditions of this{' '}
        {isIntern ? 'Internship'
          : isCTR  ? 'Contract Engagement'
          : isPT   ? 'Part-Time Employment'
          : isTrainee ? 'Trainee Appointment'
          : 'Offer of Appointment'}{' '}
        letter and accept the offer for the position of <strong>{offer.job_role}</strong> in the{' '}
        <strong>{offer.department}</strong> department at {CO_NAME}, effective{' '}
        <strong>{fmtDate(offer.date_of_joining)}</strong>.
      </p>
      <div className="offer-acceptance-fields">
        <div className="offer-acceptance-field">
          <div className="offer-acceptance-line" />
          <p className="offer-acceptance-field-label">Candidate Signature</p>
        </div>
        <div className="offer-acceptance-field">
          <div className="offer-acceptance-line" />
          <p className="offer-acceptance-field-label">Date of Acceptance</p>
        </div>
      </div>

    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OfferLetterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [offer,           setOffer]           = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [activeTab,       setActiveTab]       = useState('details');
  const [statusUpdating,  setStatusUpdating]  = useState(false);
  const [statusError,     setStatusError]     = useState('');
  const [downloading,     setDownloading]     = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [deleteError,     setDeleteError]     = useState('');

  useEffect(() => {
    getOfferLetterById(id)
      .then(setOffer)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    setStatusError('');
    try {
      const updated = await updateOfferLetter(id, { status: newStatus });
      setOffer(updated);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    try { generateOfferPDF(offer); }
    finally { setTimeout(() => setDownloading(false), 800); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteOfferLetter(id);
      navigate('/offers');
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="table-loading"><div className="spinner" /></div>
      </Layout>
    );
  }

  if (error || !offer) {
    return (
      <Layout>
        <Link to="/offers" className="back-link">← Back to Offer Letters</Link>
        <div className="alert-error">{error || 'Offer letter not found.'}</div>
      </Layout>
    );
  }

  const isFinal = ['accepted', 'rejected', 'expired'].includes(offer.status);

  return (
    <Layout>
      <Link to="/offers" className="back-link">← Back to Offer Letters</Link>

      {/* ── Page header ── */}
      <div className="offer-detail-header">
        <div>
          <h2 className="page-title" style={{ fontFamily: 'SF Mono, Fira Code, Consolas, monospace', letterSpacing: '0.04em' }}>
            {offer.offer_number}
          </h2>
          <p className="page-subtitle">
            {offer.candidate_name} · {offer.job_role} · {offer.department}
          </p>
        </div>

        <div className="offer-detail-actions">
          <span className={`status-badge status-offer-${offer.status}`}>
            {STATUS_LABELS[offer.status] ?? offer.status}
          </span>
          <span className={`offer-type-badge offer-type-${offer.employment_type}`}>
            {TYPE_LABELS[offer.employment_type] ?? offer.employment_type}
          </span>

          {offer.status === 'draft' && (
            <button className="btn-ghost" onClick={() => handleStatusChange('sent')} disabled={statusUpdating}>
              Mark Sent
            </button>
          )}
          {offer.status === 'sent' && (
            <>
              <button className="btn-ghost offer-btn-accept" onClick={() => handleStatusChange('accepted')} disabled={statusUpdating}>
                Mark Accepted
              </button>
              <button className="btn-ghost offer-btn-reject" onClick={() => handleStatusChange('rejected')} disabled={statusUpdating}>
                Mark Rejected
              </button>
            </>
          )}
          {!isFinal && (
            <button className="btn-ghost" onClick={() => handleStatusChange('expired')} disabled={statusUpdating}>
              Mark Expired
            </button>
          )}

          <Link to={`/offers/${id}/edit`} className="btn-ghost">Edit</Link>
          <button className="btn-ghost offer-btn-pdf" onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
          <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>Delete</button>
        </div>
      </div>

      {statusError && (
        <div className="alert-error" style={{ marginBottom: 16 }}>{statusError}</div>
      )}

      {offer.candidate_id && (
        <div style={{ marginBottom: 20 }}>
          <Link to={`/candidates/${offer.candidate_id}`} className="action-link">
            ← View Candidate Profile
          </Link>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="offer-tabs">
        <button
          className={`offer-tab-btn${activeTab === 'details' ? ' offer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`offer-tab-btn${activeTab === 'preview' ? ' offer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          PDF Preview
        </button>
      </div>

      {/* ── Details tab ── */}
      {activeTab === 'details' && (
        <>
          {/* Row 1: Candidate + Offer summary */}
          <div className="offer-detail-info-grid">
            <InfoCard title="Candidate Information">
              <div className="offer-detail-fields-grid">
                <Field label="Full Name"     value={offer.candidate_name} />
                <Field label="Email Address" value={offer.candidate_email} />
                <Field label="Phone Number"  value={offer.candidate_phone} />
                {offer.candidate_id && (
                  <div className="offer-detail-field">
                    <span className="offer-detail-label">Candidate Profile</span>
                    <Link to={`/candidates/${offer.candidate_id}`} className="action-link" style={{ fontSize: 13.5 }}>
                      View Profile →
                    </Link>
                  </div>
                )}
              </div>
            </InfoCard>

            <InfoCard title="Offer Summary">
              <div className="offer-detail-fields-grid">
                <Field label="Offer Number" value={offer.offer_number} mono />
                <Field label="Status">
                  <span className={`status-badge status-offer-${offer.status}`}>
                    {STATUS_LABELS[offer.status] ?? offer.status}
                  </span>
                </Field>
                <Field label="Offer Date"      value={fmtDateShort(offer.offer_date)} />
                <Field label="Offer Valid Until" value={offer.expiry_date ? fmtDateShort(offer.expiry_date) : 'No expiry'} />
                <Field label="Record Created"  value={fmtDateTime(offer.created_at)} />
              </div>
            </InfoCard>
          </div>

          {/* Row 2: Position + Type-specific */}
          <div className="offer-detail-info-grid">
            <InfoCard title="Position Details">
              <div className="offer-detail-fields-grid">
                <Field label="Job Role"        value={offer.job_role} />
                <Field label="Department"      value={offer.department} />
                <Field label="Employment Type">
                  <span className={`offer-type-badge offer-type-${offer.employment_type}`}>
                    {TYPE_LABELS[offer.employment_type] ?? offer.employment_type}
                  </span>
                </Field>
                <Field label="Date of Joining" value={fmtDateShort(offer.date_of_joining)} />
                <Field
                  label={offer.employment_type === 'intern' ? 'Monthly Stipend' : 'Monthly Gross Salary'}
                  value={fmtCurrency(offer.salary)}
                  salary
                />
              </div>
            </InfoCard>

            <TypeSpecificCard offer={offer} />
          </div>

          {/* Row 3: Roles & Responsibilities */}
          {offer.roles_responsibilities && offer.roles_responsibilities.trim() && (
            <InfoCard title="Roles & Responsibilities" full>
              <p className="offer-detail-value--pre">{offer.roles_responsibilities}</p>
            </InfoCard>
          )}

          {/* Row 4: Remarks */}
          {offer.remarks && offer.remarks.trim() && (
            <InfoCard title="Remarks" full>
              <p className="offer-detail-value--pre">{offer.remarks}</p>
            </InfoCard>
          )}
        </>
      )}

      {/* ── PDF Preview tab ── */}
      {activeTab === 'preview' && (
        <>
          <div className="offer-preview-bar">
            <p className="offer-preview-note">
              This preview mirrors the PDF content. Download to get the print-ready A4 document.
            </p>
            <button className="btn-ghost offer-btn-pdf" onClick={handleDownload} disabled={downloading}>
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
          <div className="offer-preview-wrap">
            <OfferPreview offer={offer} />
          </div>
        </>
      )}

      {/* ── Delete modal ── */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Offer Letter</h3>
            <p className="modal-body">
              Delete offer <strong>{offer.offer_number}</strong> for{' '}
              <strong>{offer.candidate_name}</strong>? This cannot be undone.
            </p>
            {deleteError && (
              <div className="alert-error" style={{ marginBottom: 16 }}>{deleteError}</div>
            )}
            <div className="modal-actions">
              <button
                className="btn-ghost"
                onClick={() => { setShowDeleteModal(false); setDeleteError(''); }}
                disabled={deleting}
              >
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
