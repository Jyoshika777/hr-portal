import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getAllCandidates, updateCandidate } from '../services/candidateService';
import '../styles/Pipeline.css';

const STATUSES = [
  { key: 'applied',    label: 'Applied',    color: '#4F46E5', bg: 'rgba(79,70,229,0.08)',  headerGrad: 'linear-gradient(135deg,#4F46E5,#6366F1)' },
  { key: 'screening',  label: 'Screening',  color: '#7C3AED', bg: 'rgba(124,58,237,0.07)', headerGrad: 'linear-gradient(135deg,#7C3AED,#8B5CF6)' },
  { key: 'interview',  label: 'Interview',  color: '#D97706', bg: 'rgba(217,119,6,0.07)',  headerGrad: 'linear-gradient(135deg,#D97706,#F59E0B)' },
  { key: 'selected',   label: 'Selected',   color: '#059669', bg: 'rgba(5,150,105,0.07)',  headerGrad: 'linear-gradient(135deg,#059669,#10B981)' },
  { key: 'offer_sent', label: 'Offer Sent', color: '#0891B2', bg: 'rgba(8,145,178,0.07)',  headerGrad: 'linear-gradient(135deg,#0891B2,#06B6D4)' },
  { key: 'joined',     label: 'Joined',     color: '#16A34A', bg: 'rgba(22,163,74,0.07)',  headerGrad: 'linear-gradient(135deg,#16A34A,#22C55E)' },
  { key: 'rejected',   label: 'Rejected',   color: '#DC2626', bg: 'rgba(220,38,38,0.07)',  headerGrad: 'linear-gradient(135deg,#DC2626,#EF4444)' },
];

function groupByStatus(candidates) {
  const groups = {};
  STATUSES.forEach(({ key }) => { groups[key] = []; });
  candidates.forEach((c) => {
    if (groups[c.status] !== undefined) groups[c.status].push(c);
  });
  return groups;
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#4F46E5','#7C3AED','#0891B2','#059669','#D97706','#DC2626','#DB2777',
];

function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function Pipeline() {
  const [columns,  setColumns]  = useState(() => groupByStatus([]));
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    getAllCandidates()
      .then((data) => setColumns(groupByStatus(data)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDragStart = (e, candidate, fromStatus) => {
    setDragging({ candidate, fromStatus });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOver !== status) setDragOver(status);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);
  };

  const handleDrop = async (e, toStatus) => {
    e.preventDefault();
    setDragOver(null);

    if (!dragging) return;
    const { candidate, fromStatus } = dragging;
    setDragging(null);

    if (fromStatus === toStatus) return;

    setColumns((prev) => ({
      ...prev,
      [fromStatus]: prev[fromStatus].filter((c) => c.id !== candidate.id),
      [toStatus]:   [{ ...candidate, status: toStatus }, ...prev[toStatus]],
    }));

    setUpdating(candidate.id);
    try {
      await updateCandidate(candidate.id, { status: toStatus });
    } catch (err) {
      setColumns((prev) => ({
        ...prev,
        [toStatus]:   prev[toStatus].filter((c) => c.id !== candidate.id),
        [fromStatus]: [{ ...candidate, status: fromStatus }, ...prev[fromStatus]],
      }));
      setError(`Could not move ${candidate.full_name}: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const totalCount      = STATUSES.reduce((sum, { key }) => sum + columns[key].length, 0);
  const interviewCount  = columns['interview'].length;
  const selectedCount   = columns['selected'].length + columns['offer_sent'].length;
  const joinedCount     = columns['joined'].length;
  const hiringProgress  = totalCount > 0 ? Math.round((joinedCount / totalCount) * 100) : 0;

  const summaryStats = [
    {
      label: 'Total Candidates',
      value: totalCount,
      icon: '👥',
      color: '#4F46E5',
      bg: '#EEF2FF',
      sub: `${STATUSES.length} active stages`,
    },
    {
      label: 'Interviews Scheduled',
      value: interviewCount,
      icon: '🗓️',
      color: '#D97706',
      bg: '#FFFBEB',
      sub: 'In interview stage',
    },
    {
      label: 'Selected / Offered',
      value: selectedCount,
      icon: '✅',
      color: '#059669',
      bg: '#ECFDF5',
      sub: 'Selected + Offer sent',
    },
    {
      label: 'Hiring Progress',
      value: `${hiringProgress}%`,
      icon: '📈',
      color: '#0891B2',
      bg: '#F0FDFA',
      sub: `${joinedCount} candidate${joinedCount !== 1 ? 's' : ''} joined`,
    },
  ];

  return (
    <Layout fullWidth>
      <div className="pipeline-wrap">
        {/* ─── Page Header ─── */}
        <div className="pipeline-page-header">
          <div>
            <h2 className="page-title">Recruitment Pipeline</h2>
            <p className="page-subtitle">
              {loading
                ? 'Loading candidates…'
                : `${totalCount} candidate${totalCount !== 1 ? 's' : ''} across ${STATUSES.length} stages`}
            </p>
          </div>
          <Link to="/candidates/add" className="btn-primary">
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Candidate
          </Link>
        </div>

        {error && (
          <div className="pipeline-error">
            <span>{error}</span>
            <button className="pipeline-error-dismiss" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* ─── Recruitment Summary ─── */}
        <div className="pipeline-summary-grid">
          {summaryStats.map((s) => (
            <div
              key={s.label}
              className="pipeline-summary-card"
              style={{ '--ps-color': s.color, '--ps-bg': s.bg }}
            >
              <div className="ps-icon-wrap" style={{ background: s.bg }}>
                <span className="ps-icon">{s.icon}</span>
              </div>
              <div className="ps-body">
                <div className="ps-label">{s.label}</div>
                {loading
                  ? <div className="skeleton-cell" style={{ width: 48, height: 28, borderRadius: 6, margin: '6px 0 4px' }} />
                  : <div className="ps-value" style={{ color: s.color }}>{s.value}</div>
                }
                <div className="ps-sub">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Kanban Board ─── */}
        <div className="pipeline-board">
          {STATUSES.map(({ key, label, color, bg, headerGrad }) => (
            <div
              key={key}
              className={`pipeline-col${dragOver === key ? ' pipeline-col--over' : ''}`}
              style={{ '--col-color': color, '--col-bg': bg }}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, key)}
            >
              {/* Column header */}
              <div className="pipeline-col-header" style={{ background: headerGrad }}>
                <span className="pipeline-col-title">{label}</span>
                {loading ? (
                  <span className="skeleton-cell" style={{ width: 26, height: 22, borderRadius: 20, background: 'rgba(255,255,255,0.25)' }} />
                ) : (
                  <span className="pipeline-col-count">{columns[key].length}</span>
                )}
              </div>

              {/* Column body */}
              <div className="pipeline-col-body">
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <div className="pipeline-card-skeleton" key={i}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <div className="skeleton-cell" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div className="skeleton-cell" style={{ width: '70%', height: 13, marginBottom: 6 }} />
                          <div className="skeleton-cell" style={{ width: '50%', height: 11 }} />
                        </div>
                      </div>
                      <div className="skeleton-cell" style={{ width: '40%', height: 11 }} />
                    </div>
                  ))
                ) : (
                  <>
                    {dragOver === key && dragging && (
                      <div className="pipeline-drop-indicator" style={{ background: color }} />
                    )}

                    {columns[key].length === 0 ? (
                      <div className={`pipeline-col-empty${dragOver === key ? ' pipeline-col-empty--over' : ''}`}
                        style={dragOver === key ? { borderColor: color, color, background: bg } : {}}>
                        Drop here
                      </div>
                    ) : (
                      columns[key].map((c) => (
                        <div
                          key={c.id}
                          draggable
                          className={[
                            'pipeline-card',
                            dragging?.candidate.id === c.id ? 'pipeline-card--dragging' : '',
                            updating === c.id ? 'pipeline-card--updating' : '',
                          ].filter(Boolean).join(' ')}
                          onDragStart={(e) => handleDragStart(e, c, key)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="pipeline-card-top">
                            <div
                              className="pipeline-card-avatar"
                              style={{ background: avatarColor(c.full_name) }}
                            >
                              {getInitials(c.full_name)}
                            </div>
                            <div className="pipeline-card-info">
                              <Link
                                to={`/candidates/${c.id}`}
                                className="pipeline-card-name"
                                onClick={(e) => { if (dragging) e.preventDefault(); }}
                              >
                                {c.full_name}
                              </Link>
                              <p className="pipeline-card-role">{c.job_role}</p>
                            </div>
                          </div>
                          <div className="pipeline-card-footer">
                            <span className="pipeline-card-id">{c.application_id}</span>
                            <span className="pipeline-card-date">{formatDate(c.applied_date)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
