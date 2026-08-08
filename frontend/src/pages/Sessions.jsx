import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = 'http://54.242.160.238:8000';

const conditionColor = (c) => {
  if (c === 'Hard') return '#F43F5E';
  if (c === 'Easy') return '#0D9488';
  return '#F59E0B';
};

const statusColor = (s) => {
  if (s === 'Completed') return '#0D9488';
  if (s === 'IN PROGRESS') return '#00D1B2';
  return '#F59E0B';
};

const Sessions = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/sessions`)
      .then(r => r.json())
      .then(data => setSessions(data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // Derived stats
  const totalSessions = sessions.length;
  const avgDuration = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_mins || 60), 0) / totalSessions)
    : 0;

  const locationCounts = sessions.reduce((acc, s) => {
    acc[s.location] = (acc[s.location] || 0) + 1;
    return acc;
  }, {});
  const topSpot = Object.keys(locationCounts).sort((a, b) => locationCounts[b] - locationCounts[a])[0] || '—';

  const conditionCounts = sessions.reduce((acc, s) => {
    acc[s.condition] = (acc[s.condition] || 0) + 1;
    return acc;
  }, {});
  const waveDistrib = ['Hard', 'Moderate', 'Easy'].map(c => ({
    label: c,
    pct: totalSessions > 0 ? Math.round(((conditionCounts[c] || 0) / totalSessions) * 100) : 0,
    color: conditionColor(c),
  }));

  return (
    <div className="ses-page">
      <Sidebar />
      <main className="ses-main">
        {/* Header */}
        <header className="ses-header">
          <h1 className="ses-title">Sessions</h1>
          <div className="ses-actions">
            <button className="ses-btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Calendar View
            </button>
            <button className="ses-btn-primary" onClick={() => navigate('/sessions/new')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Schedule Session
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="ses-filters">
          <div className="ses-filter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span style={{ color: '#0F172A' }}>All Sessions</span>
          </div>
          {['Instructor: All', 'Student: All', 'Conditions: All', 'Lesson Type: All'].map(filter => (
            <div key={filter} className="ses-filter">
              <span>{filter}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="ses-layout">
          {/* Main Column */}
          <div className="ses-table-container">
            {loading ? (
              <div className="ses-loading"><div className="ses-spinner" /></div>
            ) : (
              <table className="ses-table">
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>DATE/TIME</th>
                    <th style={{ width: '180px' }}>STUDENT</th>
                    <th style={{ width: '180px' }}>INSTRUCTOR</th>
                    <th>LOCATION</th>
                    <th>CONDITIONS</th>
                    <th>TYPE</th>
                    <th>STATUS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, i) => (
                    <tr key={session.id} style={{ borderBottom: i === sessions.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                      <td>
                        <div className="ses-td-primary">{session.date}</div>
                        <div className="ses-td-secondary">{session.time} · {session.duration_mins}min</div>
                      </td>
                      <td><div className="ses-td-primary">{session.student}</div></td>
                      <td><div className="ses-td-primary">{session.instructor}</div></td>
                      <td><div className="ses-td-primary">{session.location}</div></td>
                      <td>
                        <span className="ses-badge-cond" style={{ backgroundColor: `${conditionColor(session.condition)}20`, color: conditionColor(session.condition) }}>
                          {session.condition}
                        </span>
                      </td>
                      <td>
                        <span className="ses-badge-type">{session.type}</span>
                      </td>
                      <td>
                        <span className="ses-status-text" style={{ color: statusColor(session.status) }}>
                          {session.status}
                        </span>
                      </td>
                      <td>
                        <div className="ses-actions-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-end' }}>
                          <svg
                            className="ses-icon-btn"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            title="Edit Session"
                            style={{ cursor: 'pointer', opacity: 0.8 }}
                            onClick={() => navigate(`/sessions/${session.id}/edit`)}
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          <button
                             className="ses-btn-view-analysis"
                             style={{
                               backgroundColor: '#0D9488',
                               color: '#FFFFFF',
                               cursor: 'pointer',
                               border: 'none'
                             }}
                             title="View AI Video Analysis"
                             onClick={() => {
                               const videoParam = session.video_url ? `&video=${encodeURIComponent(session.video_url)}` : '';
                               navigate(`/analysis?student=${encodeURIComponent(session.student)}&date=${encodeURIComponent(session.date)}${videoParam}`);
                             }}
                           >
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                               <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                               <circle cx="12" cy="12" r="3"></circle>
                             </svg>
                             View
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                        No sessions yet —{' '}
                        <span style={{ color: '#F43F5E', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/sessions/new')}>
                          schedule one now
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Right Column */}
          <div className="ses-sidebar">
            <h2 className="ses-insights-title">Monthly Insights</h2>

            <div className="ses-stat-card">
              <div className="ses-stat-header">
                <span className="ses-stat-label">Total Sessions</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <div className="ses-stat-value">{loading ? '…' : totalSessions}</div>
            </div>

            <div className="ses-stat-card">
              <div className="ses-stat-header">
                <span className="ses-stat-label">Avg. Duration</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div className="ses-stat-value">{loading ? '…' : `${avgDuration}m`}</div>
            </div>

            <div className="ses-stat-card">
              <div className="ses-stat-header">
                <span className="ses-stat-label">Top Spot</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <div className="ses-stat-value" style={{ fontSize: '22px' }}>{loading ? '…' : topSpot}</div>
            </div>

            <div className="ses-wave-card">
              <h3 className="ses-wave-title">WAVE DISTRIBUTION</h3>
              {waveDistrib.map(w => (
                <div key={w.label} className="ses-wave-row">
                  <div className="ses-wave-header">
                    <span>{w.label}</span>
                    <span className="ses-wave-pct">{w.pct}%</span>
                  </div>
                  <div className="ses-wave-bar-bg">
                    <div className="ses-wave-bar" style={{ width: `${w.pct}%`, backgroundColor: w.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .ses-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .ses-main { flex: 1; padding: 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }

        /* Header */
        .ses-header { display: flex; justify-content: space-between; align-items: center; }
        .ses-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #000; margin: 0; }
        .ses-actions { display: flex; gap: 12px; }
        .ses-btn-secondary {
          display: flex; align-items: center; gap: 8px; padding: 8px 16px;
          background: #FFFFFF; border: 1px solid #050B1A; border-radius: 8px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #050B1A; cursor: pointer;
        }
        .ses-btn-primary {
          display: flex; align-items: center; gap: 8px; padding: 8px 16px;
          background: #F43F5E; border: none; border-radius: 8px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; cursor: pointer;
        }

        /* Filters */
        .ses-filters { display: flex; gap: 16px; flex-wrap: wrap; }
        .ses-filter {
          display: flex; align-items: center; gap: 8px; padding: 0 16px; height: 44px;
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px;
          font-size: 14px; color: #64748B; cursor: pointer;
        }

        /* Layout */
        .ses-layout { display: flex; gap: 32px; }
        
        /* Table Column */
        .ses-table-container {
          flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; 
          overflow-y: auto; max-height: calc(100vh - 240px);
        }
        .ses-table { width: 100%; border-collapse: collapse; }
        .ses-table th {
          text-align: left; padding: 20px; font-size: 13px; font-weight: 700;
          color: rgba(255, 255, 255, 0.6); text-transform: uppercase; background: #050B1A;
          position: sticky; top: 0; z-index: 1;
        }
        .ses-table td { padding: 20px; vertical-align: middle; }
        .ses-td-primary { font-size: 15px; font-weight: 600; color: #050B1A; line-height: 1.5; }
        .ses-td-secondary { font-size: 13px; color: #64748B; line-height: 1.5; }
        
        /* Badges & Status */
        .ses-badge-cond {
          padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;
        }
        .ses-badge-type {
          padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;
          background: rgba(100, 116, 139, 0.12); color: #64748B;
        }
        .ses-status-text { font-size: 13px; font-weight: 600; }
        .ses-actions-row { display: flex; gap: 16px; justify-content: flex-end; align-items: center; color: #64748B; }
        .ses-icon-btn { cursor: pointer; opacity: 0.8; transition: opacity 0.2s; }
        .ses-icon-btn:hover { opacity: 1; }
        
        .ses-btn-view-analysis {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #0D9488;
          border: none;
          border-radius: 6px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #FFFFFF;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ses-btn-view-analysis:hover {
          background: #0F766E;
          transform: translateY(-1px);
        }

        /* Right Sidebar Column */
        .ses-sidebar { display: flex; flex-direction: column; gap: 24px; width: 300px; flex-shrink: 0; }
        .ses-insights-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #000; margin: 0; }
        
        /* Stat Cards */
        .ses-stat-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .ses-stat-header { display: flex; justify-content: space-between; align-items: center; }
        .ses-stat-label { font-size: 13px; color: #64748B; }
        .ses-stat-value { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #050B1A; line-height: 1.2; }

        /* Wave Distribution Card */
        .ses-wave-card {
          background: #050B1A; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px;
        }
        .ses-wave-title { font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, 0.6); margin: 0; text-transform: uppercase; }
        .ses-wave-row { display: flex; flex-direction: column; gap: 8px; }
        .ses-wave-header { display: flex; justify-content: space-between; font-size: 12px; color: #FFFFFF; }
        .ses-wave-pct { opacity: 0.6; }
        .ses-wave-bar-bg { height: 4px; background: rgba(255, 255, 255, 0.12); border-radius: 2px; overflow: hidden; }
        .ses-wave-bar { height: 100%; border-radius: 2px; transition: width 0.6s ease; }

        /* Loading */
        .ses-loading { display: flex; justify-content: center; align-items: center; height: 200px; }
        .ses-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(244, 63, 94, 0.2); border-top-color: #F43F5E;
          border-radius: 50%; animation: ses-spin 0.7s linear infinite;
        }
        @keyframes ses-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Sessions;
