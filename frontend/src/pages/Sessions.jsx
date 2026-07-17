import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const Sessions = () => {
  const navigate = useNavigate();
  const sessionsList = [
    {
      date: '12 Jun 2025', time: '08:00 AM • 90 min',
      student: 'Chloe Kim', instructor: 'Kai Lenny', location: 'Pipeline',
      condition: 'Hard', conditionColor: '#F43F5E',
      type: 'Advanced', status: 'Completed', statusColor: '#0D9488'
    },
    {
      date: '12 Jun 2025', time: '10:30 AM • 60 min',
      student: 'Emma Watson', instructor: 'Bethany H.', location: 'Waikiki',
      condition: 'Easy', conditionColor: '#0D9488',
      type: 'Beginner', status: 'Completed', statusColor: '#0D9488'
    },
    {
      date: '13 Jun 2025', time: '07:30 AM • 120 min',
      student: 'John Miller', instructor: 'Kai Lenny', location: 'Sunset Beach',
      condition: 'Moderate', conditionColor: '#F59E0B',
      type: 'Intermediate', status: 'Upcoming', statusColor: '#F59E0B'
    },
    {
      date: '13 Jun 2025', time: '01:00 PM • 90 min',
      student: 'Rick Grimes', instructor: 'Kolohe A.', location: 'Pipeline',
      condition: 'Hard', conditionColor: '#F43F5E',
      type: 'Master', status: 'Upcoming', statusColor: '#F59E0B'
    }
  ];

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
            <span style={{color: '#0F172A'}}>Jun 1 - Jun 30, 2025</span>
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
                {sessionsList.map((session, i) => (
                  <tr key={i} style={{ borderBottom: i === sessionsList.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                    <td>
                      <div className="ses-td-primary">{session.date}</div>
                      <div className="ses-td-secondary">{session.time}</div>
                    </td>
                    <td><div className="ses-td-primary">{session.student}</div></td>
                    <td><div className="ses-td-primary">{session.instructor}</div></td>
                    <td><div className="ses-td-primary">{session.location}</div></td>
                    <td>
                      <span className="ses-badge-cond" style={{ backgroundColor: `${session.conditionColor}20`, color: session.conditionColor }}>
                        {session.condition}
                      </span>
                    </td>
                    <td>
                      <span className="ses-badge-type">
                        {session.type}
                      </span>
                    </td>
                    <td>
                      <span className="ses-status-text" style={{ color: session.statusColor }}>
                        {session.status}
                      </span>
                    </td>
                    <td>
                      <div className="ses-actions-row">
                        <svg className="ses-icon-btn" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <svg className="ses-icon-btn" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column */}
          <div className="ses-sidebar">
            <h2 className="ses-insights-title">Monthly Insights</h2>
            
            <div className="ses-stat-card">
              <div className="ses-stat-header">
                <span className="ses-stat-label">Total Sessions</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <div className="ses-stat-value">124</div>
            </div>

            <div className="ses-stat-card">
              <div className="ses-stat-header">
                <span className="ses-stat-label">Avg. Duration</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div className="ses-stat-value">82m</div>
            </div>

            <div className="ses-stat-card">
              <div className="ses-stat-header">
                <span className="ses-stat-label">Top Spot</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <div className="ses-stat-value">Pipeline</div>
            </div>

            <div className="ses-wave-card">
              <h3 className="ses-wave-title">WAVE DISTRIBUTION</h3>
              
              <div className="ses-wave-row">
                <div className="ses-wave-header">
                  <span>Hard</span>
                  <span className="ses-wave-pct">45%</span>
                </div>
                <div className="ses-wave-bar-bg">
                  <div className="ses-wave-bar" style={{ width: '45%', backgroundColor: '#F43F5E' }}></div>
                </div>
              </div>

              <div className="ses-wave-row">
                <div className="ses-wave-header">
                  <span>Moderate</span>
                  <span className="ses-wave-pct">35%</span>
                </div>
                <div className="ses-wave-bar-bg">
                  <div className="ses-wave-bar" style={{ width: '35%', backgroundColor: '#F59E0B' }}></div>
                </div>
              </div>

              <div className="ses-wave-row">
                <div className="ses-wave-header">
                  <span>Easy</span>
                  <span className="ses-wave-pct">20%</span>
                </div>
                <div className="ses-wave-bar-bg">
                  <div className="ses-wave-bar" style={{ width: '20%', backgroundColor: '#0D9488' }}></div>
                </div>
              </div>
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
          flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden;
        }
        .ses-table { width: 100%; border-collapse: collapse; }
        .ses-table th {
          text-align: left; padding: 20px; font-size: 13px; font-weight: 700;
          color: rgba(255, 255, 255, 0.6); text-transform: uppercase; background: #050B1A;
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
        .ses-actions-row { display: flex; gap: 12px; justify-content: flex-end; color: #64748B; }
        .ses-icon-btn { cursor: pointer; opacity: 0.8; }
        .ses-icon-btn:hover { opacity: 1; }

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
        .ses-wave-bar { height: 100%; border-radius: 2px; }
      `}</style>
    </div>
  );
};

export default Sessions;
