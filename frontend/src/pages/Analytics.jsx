import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:8000';

const BADGE_COLORS = {
  WHITE: { bg: '#E2E8F0', text: '#64748B' },
  YELLOW: { bg: '#F59E0B', text: '#F59E0B' },
  GREEN: { bg: '#10B981', text: '#10B981' },
  BLUE: { bg: '#3B82F6', text: '#3B82F6' },
  RED: { bg: '#F43F5E', text: '#F43F5E' },
};
const BADGE_ORDER = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED'];

const Analytics = () => {
  const [badgeStats, setBadgeStats] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/analytics/badges`).then(r => r.json()),
      fetch(`${API}/api/analytics/students`).then(r => r.json()),
    ])
      .then(([badges, studs]) => {
        setBadgeStats(badges);
        setStudents(studs);
      })
      .catch(() => {
        // Fallback mock data
        setBadgeStats([
          { label: 'WHITE', count: 6 },
          { label: 'YELLOW', count: 4 },
          { label: 'GREEN', count: 3 },
          { label: 'BLUE', count: 2 },
          { label: 'RED', count: 1 },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxCount = badgeStats.length > 0 ? Math.max(...badgeStats.map(b => b.count), 1) : 1;

  return (
    <div className="an-page">
      <Sidebar />
      <main className="an-main">
        {/* Header */}
        <header className="an-header">
          <div className="an-header-text">
            <h1 className="an-title">Badge Progression</h1>
            <p className="an-sub">Track the distribution of skills and levels across the entire student population.</p>
          </div>
          <button className="an-export-btn">Export PDF Report</button>
        </header>

        {loading ? (
          <div className="an-loading"><div className="an-spinner" /></div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="an-stats-row">
              {badgeStats.map(stat => {
                const colors = BADGE_COLORS[stat.label] || { bg: '#E2E8F0', text: '#64748B' };
                return (
                  <div key={stat.label} className="an-stat-card">
                    <div className="an-stat-top">
                      <span className="an-stat-label">{stat.label}</span>
                      <div className="an-stat-dot" style={{ backgroundColor: colors.bg, border: `2px solid ${colors.text}` }} />
                    </div>
                    <div className="an-stat-count" style={{ color: colors.text === '#64748B' ? '#0F172A' : colors.text }}>
                      {stat.count}
                    </div>
                    <div className="an-stat-desc">Students currently at this level</div>
                  </div>
                );
              })}
            </div>

            {/* Retention Funnel */}
            <div className="an-funnel-card">
              <h2 className="an-funnel-title">Retention Funnel</h2>
              <div className="an-funnel-chart">
                {badgeStats.map(stat => {
                  const widthPct = (stat.count / maxCount) * 100;
                  const colors = BADGE_COLORS[stat.label] || { bg: '#E2E8F0', text: '#64748B' };
                  return (
                    <div key={stat.label} className="an-funnel-row">
                      <span className="an-funnel-label">
                        {stat.label.charAt(0).toUpperCase() + stat.label.slice(1).toLowerCase()}
                      </span>
                      <div className="an-funnel-bar-container">
                        <div
                          className="an-funnel-bar"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: colors.bg,
                            color: stat.label === 'WHITE' ? '#0F172A' : '#FFFFFF'
                          }}
                        />
                        <span className="an-funnel-value">{stat.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div className="an-table-container">
              <table className="an-table">
                <thead>
                  <tr>
                    <th>STUDENT NAME</th>
                    <th>BADGE HISTORY</th>
                    <th>ESTIMATED TIME TO NEXT</th>
                    <th>CURRENT INSTRUCTOR</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => (
                    <tr key={i} style={{ borderBottom: i === students.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                      <td className="an-student-name">{student.name}</td>
                      <td>
                        <div className="an-badge-history">
                          {BADGE_ORDER.map((badgeLevel, index) => {
                            const earned = student.badge_levels?.includes(badgeLevel) || index < student.badges;
                            const colors = BADGE_COLORS[badgeLevel];
                            return (
                              <div
                                key={index}
                                className="an-badge-circle"
                                title={badgeLevel}
                                style={{
                                  backgroundColor: earned ? colors.bg : 'transparent',
                                  border: `2px solid ${earned ? colors.bg : '#E2E8F0'}`
                                }}
                              />
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ color: student.nextColor }}>{student.nextTime}</td>
                      <td className="an-instructor-name">{student.instructor || '—'}</td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                        No student data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <style>{`
        .an-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .an-main { flex: 1; padding: 40px 80px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }

        /* Header */
        .an-header { display: flex; justify-content: space-between; align-items: center; }
        .an-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.2; }
        .an-sub { font-size: 16px; color: #64748B; margin: 8px 0 0 0; }
        .an-export-btn {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px;
          padding: 12px 24px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; color: #0F172A; cursor: pointer;
        }

        /* Loading */
        .an-loading { display: flex; justify-content: center; align-items: center; height: 300px; }
        .an-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(244, 63, 94, 0.2); border-top-color: #F43F5E;
          border-radius: 50%; animation: an-spin 0.7s linear infinite;
        }
        @keyframes an-spin { to { transform: rotate(360deg); } }

        /* Stats Row */
        .an-stats-row { display: flex; gap: 20px; }
        .an-stat-card {
          flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .an-stat-top { display: flex; justify-content: space-between; align-items: center; }
        .an-stat-label { font-size: 12px; font-weight: 700; color: #64748B; opacity: 0.6; text-transform: uppercase; }
        .an-stat-dot { width: 12px; height: 12px; border-radius: 50%; }
        .an-stat-count { font-family: 'Outfit', sans-serif; font-size: 40px; font-weight: 700; line-height: 1.2; }
        .an-stat-desc { font-size: 12px; color: #64748B; }

        /* Funnel Card */
        .an-funnel-card {
          background: #050B1A; border-radius: 24px; padding: 40px;
          display: flex; flex-direction: column; align-items: center; gap: 32px;
        }
        .an-funnel-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #FFFFFF; margin: 0; }
        .an-funnel-chart { display: flex; flex-direction: column; gap: 12px; width: 600px; }
        .an-funnel-row { display: flex; align-items: center; gap: 16px; }
        .an-funnel-label { width: 60px; font-size: 12px; font-weight: 700; color: #FFFFFF; opacity: 0.6; }
        .an-funnel-bar-container { flex: 1; display: flex; align-items: center; gap: 12px; }
        .an-funnel-bar { height: 32px; border-radius: 4px; transition: width 0.6s ease; min-width: 4px; }
        .an-funnel-value { font-size: 12px; font-weight: 700; color: #FFFFFF; }

        /* Table */
        .an-table-container { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; }
        .an-table { width: 100%; border-collapse: collapse; }
        .an-table th {
          text-align: left; padding: 20px 24px; font-size: 12px; font-weight: 700;
          color: #94A3B8; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; background: #F8F6F2;
        }
        .an-table td { padding: 20px 24px; vertical-align: middle; font-size: 12px; }
        .an-student-name { font-weight: 600; color: #0F172A; }
        .an-instructor-name { color: #0F172A; }
        .an-badge-history { display: flex; gap: 8px; }
        .an-badge-circle { width: 16px; height: 16px; border-radius: 50%; transition: transform 0.2s; cursor: help; }
        .an-badge-circle:hover { transform: scale(1.3); }
      `}</style>
    </div>
  );
};

export default Analytics;
