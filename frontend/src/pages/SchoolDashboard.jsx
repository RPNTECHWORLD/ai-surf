import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:8000';

const StatCard = ({ value, label, icon, color }) => (
  <div className="db-stat-card">
    <div className="db-stat-icon" style={{ background: `${color}18`, color }}>
      {icon}
    </div>
    <div>
      <div className="db-stat-value" style={{ color }}>{value}</div>
      <div className="db-stat-label">{label}</div>
    </div>
  </div>
);

const statusColors = {
  'IN PROGRESS': '#00D1B2',
  'UPCOMING': '#FF4D6D',
  'COMPLETED': '#6B7280',
};

const SchoolDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/dashboard/stats`).then((r) => r.ok ? r.json() : Promise.reject()),
      fetch(`${API}/api/dashboard/sessions`).then((r) => r.ok ? r.json() : Promise.reject()),
      fetch(`${API}/api/dashboard/activity`).then((r) => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([s, ses, act]) => { 
        setStats(s); 
        setSessions(Array.isArray(ses) ? ses : []); 
        setActivity(Array.isArray(act) ? act : []); 
      })
      .catch(() => {
        setStats({ active_instructors: 0, active_students: 0, sessions_this_month: 0, upcoming_sessions: 0 });
        setSessions([]);
        setActivity([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const activityIcon = (type) => {
    if (type === 'badge') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    );
    if (type === 'session') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D1B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    );
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D6D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  };

  return (
    <div className="db-page">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <main className="db-main">
        <header className="db-header">
          <div>
            <h1 className="db-header-title">Dashboard</h1>
            <p className="db-header-sub">Good morning — here's what's happening today.</p>
          </div>
          <button className="btn-primary db-cta" onClick={() => navigate('/register')}>+ New School</button>
        </header>

        {loading ? (
          <div className="db-loading">
            <div className="db-spinner" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="db-stats-grid">
              <StatCard value={stats?.active_instructors} label="Active Instructors" color="#00D1B2"
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>} />
              <StatCard value={stats?.active_students} label="Active Students" color="#FF4D6D"
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>} />
              <StatCard value={stats?.sessions_this_month} label="Sessions This Month" color="#7C3AED"
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>} />
              <StatCard value={stats?.upcoming_sessions} label="Upcoming Sessions" color="#F59E0B"
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} />
            </div>

            <div className="db-bottom-grid">
              {/* Sessions table */}
              <div className="db-card">
                <div className="db-card-header">
                  <h3 className="db-card-title">Today's Sessions</h3>
                  <span className="db-card-badge">{sessions.length} total</span>
                </div>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Instructor</th>
                      <th>Student</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={i}>
                        <td className="db-td-mono">{s.time}</td>
                        <td>{s.instructor}</td>
                        <td>{s.student}</td>
                        <td>
                          <span className="db-status-pill" style={{ background: `${statusColors[s.status]}18`, color: statusColors[s.status] }}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Activity feed */}
              <div className="db-card">
                <div className="db-card-header">
                  <h3 className="db-card-title">Recent Activity</h3>
                </div>
                <ul className="db-activity-list">
                  {activity.map((a) => (
                    <li key={a.id} className="db-activity-item">
                      <div className="db-activity-icon">{activityIcon(a.type)}</div>
                      <div className="db-activity-text">
                        <p>{a.text}</p>
                        <span className="db-activity-time">{a.time}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </main>

      <style>{`
        .db-page {
          display: flex;
          min-height: 100vh;
          background: #F0EEE9;
          font-family: 'Inter', sans-serif;
        }

        /* Main */
        .db-main { flex: 1; padding: 40px 48px; overflow-y: auto; }
        .db-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 36px; }
        .db-header-title {
          font-size: 32px; font-weight: 800; color: #050B1A;
          margin: 0; text-align: left;
        }
        .db-header-sub { font-size: 14px; color: #6B7280; margin-top: 4px; }
        .db-cta { padding: 12px 24px; font-size: 14px; border-radius: 10px; white-space: nowrap; }

        /* Stat cards */
        .db-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 28px;
        }
        .db-stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          transition: transform 0.2s;
        }
        .db-stat-card:hover { transform: translateY(-4px); }
        .db-stat-icon {
          width: 52px; height: 52px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .db-stat-value { font-size: 28px; font-weight: 800; }
        .db-stat-label { font-size: 12px; font-weight: 600; color: #6B7280; letter-spacing: 0.3px; margin-top: 2px; }

        /* Bottom grid */
        .db-bottom-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; }
        .db-card {
          background: #fff; border-radius: 16px; padding: 28px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .db-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .db-card-title { font-size: 18px; font-weight: 700; color: #050B1A; }
        .db-card-badge {
          background: #F3F4F6; color: #6B7280;
          font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px;
        }

        /* Table */
        .db-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .db-table th {
          text-align: left; font-size: 11px; font-weight: 600;
          color: #9CA3AF; letter-spacing: 0.5px; padding: 0 12px 12px 0;
          border-bottom: 1px solid #F3F4F6; text-transform: uppercase;
        }
        .db-table td { padding: 14px 12px 14px 0; color: #050B1A; border-bottom: 1px solid #F9FAFB; }
        .db-td-mono { font-family: monospace; font-size: 13px; color: #6B7280; }
        .db-status-pill {
          padding: 4px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        }

        /* Activity */
        .db-activity-list { list-style: none; display: flex; flex-direction: column; gap: 20px; }
        .db-activity-item { display: flex; align-items: flex-start; gap: 14px; }
        .db-activity-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: #F9FAFB; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .db-activity-text p { font-size: 13px; color: #050B1A; line-height: 1.5; margin: 0; }
        .db-activity-time { font-size: 11px; color: #9CA3AF; margin-top: 2px; display: block; }

        /* Loading */
        .db-loading { display: flex; justify-content: center; align-items: center; height: 300px; }
        .db-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(0,209,178,0.2);
          border-top-color: #00D1B2;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .db-sidebar { display: none; }
          .db-main { padding: 24px 20px; }
          .db-bottom-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default SchoolDashboard;
