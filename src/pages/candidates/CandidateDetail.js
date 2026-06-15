import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getCandidateById, deleteCandidate } from '../../services/candidateService';
import '../../styles/Candidates.css';

const STATUS_LABELS = {
  applied:   'Applied',
  screening: 'Screening',
  interview: 'Interview',
  selected:  'Selected',
  offer_sent:'Offer Sent',
  joined:    'Joined',
  rejected:  'Rejected',
};

const AVATAR_COLORS = [
  '#1e40af', '#6d28d9', '#b45309',
  '#15803d', '#0f766e', '#be185d',
];

function avatarColor(name) {
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate,       setCandidate]       = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [deleteError,     setDeleteError]     = useState('');

  useEffect(() => {
    getCandidateById(id)
      .then(setCandidate)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteCandidate(id);
      navigate('/candidates');
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="table-loading"><div className="spinner" /></div>
      </Layout>
    );
  }

  if (error || !candidate) {
    return (
      <Layout>
        <Link to="/candidates" className="back-link">← Back to Candidates</Link>
        <div className="alert-error">{error || 'Candidate not found.'}</div>
      </Layout>
    );
  }

  const color = avatarColor(candidate.full_name);

  return (
    <Layout>
      <Link to="/candidates" className="back-link">← Back to Candidates</Link>

      {/* ── Profile header card ── */}
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar" style={{ background: color }}>
            {initials(candidate.full_name)}
          </div>

          <div className="profile-info">
            <h2 className="profile-name">{candidate.full_name}</h2>
            <p className="profile-role">{candidate.job_role}</p>
            <div className="profile-meta">
              <span className="profile-app-id-chip">{candidate.application_id}</span>
              <span className={`status-badge status-${candidate.status}`}>
                {STATUS_LABELS[candidate.status] ?? candidate.status}
              </span>
            </div>
          </div>

          <div className="profile-header-actions">
            <Link
              to={`/documents/entity/candidate/${candidate.application_id}?entityName=${encodeURIComponent(candidate.full_name)}`}
              className="btn-secondary"
            >
              Documents
            </Link>
            <Link to={`/candidates/${id}/edit`} className="btn-primary">Edit</Link>
            {(candidate.status === 'selected' || candidate.status === 'offer_sent') && (
              <Link to={`/offers/new?candidateId=${id}`} className="btn-ghost">
                Generate Offer
              </Link>
            )}
            {candidate.status === 'joined' && !candidate.converted_employee_id && (
              <Link to={`/candidates/${id}/convert`} className="btn-convert">
                Convert to Employee
              </Link>
            )}
            {candidate.converted_employee_id && (
              <Link to={`/employees/${candidate.converted_employee_id}`} className="btn-ghost">
                View Employee
              </Link>
            )}
            <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Conversion banner (only for joined candidates) ── */}
      {candidate.status === 'joined' && (
        <div className={`conversion-banner${candidate.converted_employee_id ? ' conversion-banner--done' : ''}`}>
          <div className="conversion-banner-content">
            <div>
              <p className="conversion-banner-title">
                {candidate.converted_employee_id ? 'Converted to employee' : 'Ready to onboard'}
              </p>
              <p className="conversion-banner-sub">
                {candidate.converted_employee_id
                  ? 'This candidate has an active employee record.'
                  : 'This candidate has joined. Create their employee record to complete onboarding.'}
              </p>
            </div>
          </div>
          {candidate.converted_employee_id ? (
            <Link to={`/employees/${candidate.converted_employee_id}`} className="btn-ghost">
              View Employee Profile →
            </Link>
          ) : (
            <Link to={`/candidates/${id}/convert`} className="btn-convert">
              Convert to Employee →
            </Link>
          )}
        </div>
      )}

      {/* ── Contact + Application sections ── */}
      <div className="profile-sections">
        <div className="profile-section">
          <h3 className="profile-section-title">Contact Information</h3>
          <div className="profile-field">
            <p className="profile-field-label">Email Address</p>
            <p className="profile-field-value">{candidate.email}</p>
          </div>
          <div className="profile-field">
            <p className="profile-field-label">Phone Number</p>
            <p className="profile-field-value">{candidate.phone}</p>
          </div>
        </div>

        <div className="profile-section">
          <h3 className="profile-section-title">Application Details</h3>
          <div className="profile-fields-grid">
            <div className="profile-field">
              <p className="profile-field-label">Application ID</p>
              <p className="profile-field-value profile-field-mono">
                {candidate.application_id}
              </p>
            </div>
            <div className="profile-field">
              <p className="profile-field-label">Current Status</p>
              <p className="profile-field-value">
                <span className={`status-badge status-${candidate.status}`}>
                  {STATUS_LABELS[candidate.status] ?? candidate.status}
                </span>
              </p>
            </div>
            <div className="profile-field">
              <p className="profile-field-label">Applied Date</p>
              <p className="profile-field-value">{formatDate(candidate.applied_date)}</p>
            </div>
            <div className="profile-field">
              <p className="profile-field-label">Record Created</p>
              <p className="profile-field-value">{formatDateTime(candidate.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Remarks ── */}
      <div className="profile-remarks-card">
        <h3 className="profile-section-title">Remarks</h3>
        {candidate.remarks ? (
          <p className="profile-remarks-text">{candidate.remarks}</p>
        ) : (
          <p className="profile-remarks-empty">No remarks added.</p>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Candidate</h3>
            <p className="modal-body">
              Remove <strong>{candidate.full_name}</strong> ({candidate.application_id})?
              This action cannot be undone.
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
