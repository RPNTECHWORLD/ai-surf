import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const statusColors = {
  'IN PROGRESS': '#00D1B2',
  'UPCOMING': '#3B82F6',
  'COMPLETED': '#6B7280',
};

const SchoolDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);

  useEffect(() => {
    let userSchoolName = null;
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.school_name) userSchoolName = parsedUser.school_name;
        if (parsedUser.role === 'athlete') {
          navigate(`/students/${parsedUser.student_id || parsedUser.id || 1}`);
          return;
        } else if (parsedUser.role === 'coach') {
          navigate(`/instructors/${parsedUser.instructor_id || parsedUser.id || 1}`);
          return;
        }
      } catch (e) {}
    }

    const savedSchool = sessionStorage.getItem('activeSchool');
    if (savedSchool) {
      try {
        const parsedSchool = JSON.parse(savedSchool);
        if (userSchoolName) parsedSchool.name = userSchoolName;
        setSchool(parsedSchool);
      } catch (e) {}
    } else if (userSchoolName) {
      setSchool({ name: userSchoolName });
    } else {
      fetch(`${API}/api/schools`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const latest = data[data.length - 1];
            setSchool({
              name: latest.name,
              owner: latest.owner,
            });
          }
        })
        .catch(err => console.error("Error fetching school:", err));
    }

    // Fetch dashboard stats, sessions and activities
    Promise.all([
      fetch(`${API}/api/dashboard/stats`).then((r) => r.json()),
      fetch(`${API}/api/dashboard/sessions`).then((r) => r.json()),
      fetch(`${API}/api/dashboard/activity`).then((r) => r.json()),
    ])
      .then(([s, ses, act]) => {
        setStats(s);
        setSessions(ses);
        setActivity(act);
      })
      .catch(() => {
        // Fallback clean data (0 students, 0 sessions)
        setStats({ active_instructors: 5, active_students: 0, sessions_this_month: 0, upcoming_sessions: 0 });
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
      {/* Shared Layout Sidebar & Header */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="db-main">
        {loading ? (
          <div className="db-loading">
            <div className="db-spinner" />
          </div>
        ) : (
          <>
            {/* Turquoise Welcome Banner */}
            <div className="db-welcome-banner">
              <div className="banner-content">
                <h2 className="banner-heading">Good morning, {school ? school.name : 'North Shore Academy'}!</h2>
                <p className="banner-subtext">
                  You have {sessions.length} sessions scheduled for today. Surf conditions are 4-6ft and clean.
                </p>
              </div>
              <div className="banner-wave-pattern">
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" style={{ height: '100%', width: '100%', opacity: 0.18 }}>
                  <path d="M0.00,49.98 C150.00,150.00 349.20,-50.00 500.00,49.98 L500.00,150.00 L0.00,150.00 Z" style={{ stroke: 'none', fill: '#ffffff' }}></path>
                </svg>
              </div>
            </div>

            {/* Quick Stats - Horizontal Row at Top */}
            <div className="db-stats-row">
              <div className="db-stat-card-h">
                <div className="stat-card-left">
                  <span className="stat-card-label">Active Instructors</span>
                  <span className="stat-card-value">{stats?.active_instructors || 0}</span>
                </div>
                <div className="stat-card-right" style={{ color: '#00D1B2', background: 'rgba(0, 209, 178, 0.1)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </div>
              </div>

              <div className="db-stat-card-h">
                <div className="stat-card-left">
                  <span className="stat-card-label">Active Students</span>
                  <span className="stat-card-value">{stats?.active_students || 0}</span>
                </div>
                <div className="stat-card-right" style={{ color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
              </div>

              <div className="db-stat-card-h">
                <div className="stat-card-left">
                  <span className="stat-card-label">Sessions This Month</span>
                  <span className="stat-card-value">{stats?.sessions_this_month || 0}</span>
                </div>
                <div className="stat-card-right" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
              </div>

              <div className="db-stat-card-h">
                <div className="stat-card-left">
                  <span className="stat-card-label">Upcoming Sessions</span>
                  <span className="stat-card-value">{stats?.upcoming_sessions || 0}</span>
                </div>
                <div className="stat-card-right" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
              </div>
            </div>
            <div className="db-quick-actions">
              <div className="action-card" onClick={() => navigate('/instructors')}>
                <div className="action-icon-wrapper" style={{ color: '#00D1B2', background: '#E6F9F5' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                </div>
                <span className="action-label">Add Instructor</span>
              </div>

              <div className="action-card" onClick={() => navigate('/students')}>
                <div className="action-icon-wrapper" style={{ color: '#3B82F6', background: '#EBF3FF' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                </div>
                <span className="action-label">Add Student</span>
              </div>

              <div className="action-card" onClick={() => navigate('/sessions/new')}>
                <div className="action-icon-wrapper" style={{ color: '#10B981', background: '#ECFDF5' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
                <span className="action-label">Schedule Session</span>
              </div>

              <div className="action-card" onClick={() => navigate('/analysis')}>
                <div className="action-icon-wrapper" style={{ color: '#EF4444', background: '#FEE2E2' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                </div>
                <span className="action-label">Upload Video</span>
              </div>
            </div>

            {/* Bottom Content Grid */}
            <div className="db-bottom-grid">
              {/* Sessions Table Card */}
              <div className="db-card">
                <div className="db-card-header">
                  <h3 className="db-card-title">Today's Sessions</h3>
                  <span className="db-card-badge">{sessions.length} total</span>
                </div>
                <div className="table-responsive">
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
                          <td style={{ fontWeight: 600, color: '#0F172A' }}>{s.instructor}</td>
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
              </div>

              {/* Recent Activity Timeline Card */}
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
        /* Welcome Banner */
        .db-welcome-banner {
          background: linear-gradient(135deg, #1fa38e 0%, #157a6b 100%);
          border-radius: 16px;
          padding: 36px 40px;
          color: #FFFFFF;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(21, 122, 107, 0.15);
        }
        .banner-content {
          position: relative;
          z-index: 2;
        }
        .banner-heading {
          font-size: 28px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0 0 8px 0;
          text-align: left;
        }
        .banner-subtext {
          font-size: 15px;
          opacity: 0.95;
          margin: 0;
          text-align: left;
          line-height: 1.5;
        }
        .banner-wave-pattern {
          position: absolute;
          right: 0;
          bottom: 0;
          top: 0;
          width: 60%;
          pointer-events: none;
          z-index: 1;
        }

        /* Quick Action Cards */
        .db-quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        .action-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.04);
          border-color: #CBD5E1;
        }
        .action-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .action-label {
          font-size: 14.5px;
          font-weight: 700;
          color: #0F172A;
        }

        /* Bottom Grid */
        .db-bottom-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 24px;
        }
        .db-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          border: 1px solid rgba(0,0,0,0.03);
        }
        .db-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .db-card-title {
          font-size: 18px;
          font-weight: 700;
          color: #050B1A;
          margin: 0;
        }
        .db-card-badge {
          background: #F3F4F6;
          color: #6B7280;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
        }

        /* Table */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .db-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .db-table th {
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #9CA3AF;
          letter-spacing: 0.5px;
          padding: 0 12px 12px 0;
          border-bottom: 1px solid #F3F4F6;
          text-transform: uppercase;
        }
        .db-table td {
          padding: 16px 12px 16px 0;
          color: #4B5563;
          border-bottom: 1px solid #F9FAFB;
        }
        .db-td-mono {
          font-family: monospace;
          font-size: 13px;
          color: #6B7280;
        }
        .db-status-pill {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        /* Activity */
        .db-activity-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 0;
          margin: 0;
        }
        .db-activity-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .db-activity-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #F9FAFB;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .db-activity-text p {
          font-size: 13.5px;
          color: #1F2937;
          line-height: 1.5;
          margin: 0;
          text-align: left;
        }
        .db-activity-time {
          font-size: 11px;
          color: #9CA3AF;
          margin-top: 2px;
          display: block;
          text-align: left;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .db-quick-actions {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .db-quick-actions {
            grid-template-columns: 1fr;
          }
          .db-welcome-banner {
            padding: 24px;
          }
          .banner-heading {
            font-size: 22px;
          }
          .banner-subtext {
            font-size: 13.5px;
          }
        }
      `}</style>
    </div>
  );
};

export default SchoolDashboard;
