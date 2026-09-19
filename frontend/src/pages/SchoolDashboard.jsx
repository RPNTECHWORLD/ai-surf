import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const normalizeToYYYYMMDD = (dVal) => {
  if (!dVal) return '';
  const str = String(dVal).trim();
  
  const yyyymmdd = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (yyyymmdd) {
    return `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
  }
  
  const ddmmyyyy = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }
  
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  return str;
};

const buildDashboardTodayGroups = (sessionList) => {
  const buckets = new Map();

  (sessionList || []).forEach(session => {
    let explicitGrp = (session.group_name && session.group_name.trim() !== '') ? session.group_name.trim() : null;
    if (!explicitGrp && session.notes) {
      const notesStr = session.notes.trim();
      const groupMatch = notesStr.match(/\b(Group\s+[A-Za-z0-9]+)\b/i);
      if (groupMatch) {
        explicitGrp = groupMatch[1].trim();
      } else if (notesStr.includes(' - Automated')) {
        explicitGrp = notesStr.split(' - Automated')[0].trim();
      }
    }

    const key = explicitGrp ? `GRP__${explicitGrp}__${session.time}` : `SESS__${session.id}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        id: session.id,
        groupName: explicitGrp || (session.student ? `${session.student}'s Session` : 'Individual Session'),
        isGroup: Boolean(explicitGrp),
        time: session.time || '08:30 AM',
        instructor: session.instructor || session.instructor_name || 'Assigned Coach',
        status: session.status || 'Pending',
        location: session.location || '',
        students: []
      });
    }
    if (session.student) {
      buckets.get(key).students.push(session.student);
    }
  });

  return Array.from(buckets.values()).sort((a, b) => {
    return a.groupName.localeCompare(b.groupName, undefined, { numeric: true, sensitivity: 'base' });
  });
};

const SchoolDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ active_instructors: 0, active_students: 0, sessions_this_month: 0, upcoming_sessions: 0 });
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [currentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let userSchoolName = null;
    if (currentUser) {
      if (currentUser.school_name) {
        userSchoolName = typeof currentUser.school_name === 'string' ? currentUser.school_name : currentUser.school_name?.name;
      } else if (currentUser.school) {
        userSchoolName = typeof currentUser.school === 'string' ? currentUser.school : currentUser.school?.name;
      }
      if (currentUser.role === 'athlete') {
        navigate(`/students/${currentUser.student_id || currentUser.id || 1}`);
        return;
      } else if (currentUser.role === 'coach') {
        navigate(`/instructors/${currentUser.instructor_id || currentUser.id || 1}`);
        return;
      }
    }

    const savedSchool = sessionStorage.getItem('activeSchool');
    if (savedSchool) {
      try {
        const parsedSchool = JSON.parse(savedSchool);
        if (userSchoolName) {
          parsedSchool.name = userSchoolName;
        } else if (parsedSchool.name && typeof parsedSchool.name === 'object') {
          parsedSchool.name = parsedSchool.name?.name || 'Aquatic Indica Surf School';
        }
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
              name: typeof latest.name === 'string' ? latest.name : (latest.name?.name || 'Aquatic Indica Surf School'),
              owner: typeof latest.owner === 'string' ? latest.owner : '',
            });
          }
        })
        .catch(err => console.error("Error fetching school:", err));
    }

    const currentSchoolName = (() => {
      try {
        const saved = sessionStorage.getItem('activeSchool');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.name) return typeof parsed.name === 'string' ? parsed.name : parsed.name?.name;
        }
        const user = sessionStorage.getItem('user');
        if (user) {
          const parsed = JSON.parse(user);
          if (parsed.school) return typeof parsed.school === 'string' ? parsed.school : parsed.school?.name;
          if (parsed.school_name) return typeof parsed.school_name === 'string' ? parsed.school_name : parsed.school_name?.name;
        }
      } catch (e) {}
      return userSchoolName || null;
    })();

    const schoolLower = (currentSchoolName || '').toLowerCase().trim();
    const isSuperAdmin = currentUser?.role === 'superadmin' || schoolLower === 'super admin';
    const effectiveSchool = (currentSchoolName && schoolLower !== 'school admin' && schoolLower !== 'super admin')
      ? currentSchoolName
      : 'Aquatic Indica Surf School';
    const schoolParam = (!isSuperAdmin && effectiveSchool) ? `?school=${encodeURIComponent(effectiveSchool)}` : '';

    // Fetch real instructors, students, sessions & activity log
    Promise.all([
      fetch(`${API}/api/instructors${schoolParam}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/students${schoolParam}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/sessions${schoolParam}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/dashboard/activity${schoolParam}`).then(r => r.json()).catch(() => []),
    ])
      .then(([insts, studs, allSessions, act]) => {
        const instructorsList = Array.isArray(insts) ? insts : [];
        const studentsList = Array.isArray(studs) ? studs : [];
        const sessionsList = Array.isArray(allSessions) ? allSessions : [];
        const activitiesList = Array.isArray(act) ? act : [];

        // Today's local date
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayISO = `${y}-${m}-${d}`;
        const currentYearMonth = `${y}-${m}`;

        // Filter sessions that occur today
        const todaySessions = sessionsList.filter(s => {
          const sISO = normalizeToYYYYMMDD(s.date);
          return sISO === todayISO;
        });

        const groupedToday = buildDashboardTodayGroups(todaySessions);

        const sessionsThisMonth = sessionsList.filter(s => {
          const sISO = normalizeToYYYYMMDD(s.date);
          return sISO.startsWith(currentYearMonth);
        }).length;

        const upcomingCount = sessionsList.filter(s => {
          const sISO = normalizeToYYYYMMDD(s.date);
          return sISO >= todayISO && s.status !== 'Completed';
        }).length;

        setStats({
          active_instructors: instructorsList.length,
          active_students: studentsList.length,
          sessions_this_month: sessionsThisMonth,
          upcoming_sessions: upcomingCount
        });

        setSessions(groupedToday);
        setActivity(activitiesList);
      })
      .catch((err) => {
        console.error("Error loading dashboard data:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  const schoolDisplayName = typeof school?.name === 'string'
    ? school.name
    : (school?.name?.name || 'Aquatic Indica Surf School');

  const activityIcon = (type) => {
    if (type === 'badge') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    );
    if (type === 'session') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    );
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  };

  return (
    <div className="db-page">
      {/* Top Header Navigation */}
      <Sidebar />

      {/* Main Dashboard Content */}
      <main className="db-main">
        {loading ? (
          <div className="db-loading">
            <div className="db-spinner" />
            <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Loading school dashboard...</span>
          </div>
        ) : (
          <>
            {/* Emerald/Teal Welcome Banner with Breathing Room & Actions */}
            <div className="db-welcome-banner">
              <div className="banner-content">
                <div className="banner-pills-row">
                  <span className="banner-date-badge">
                    📅 {todayFormatted}
                  </span>
                </div>
                <h2 className="banner-heading">
                  Good morning, {schoolDisplayName}!
                </h2>
                <p className="banner-subtext">
                  You have <strong>{sessions.length} training group{sessions.length === 1 ? '' : 's'} / session{sessions.length === 1 ? '' : 's'}</strong> scheduled for today. Ready for water sessions and technique coaching.
                </p>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="db-stats-row">
              <div className="db-stat-card-h" onClick={() => navigate('/instructors')} style={{ cursor: 'pointer' }} title="View All Instructors">
                <div className="stat-card-left">
                  <span className="stat-card-label">Active Instructors</span>
                  <span className="stat-card-value">{stats?.active_instructors || 0}</span>
                  <span className="stat-card-micro" style={{ color: '#0D9488' }}>Certified Coaches</span>
                </div>
                <div className="stat-card-right" style={{ color: '#0D9488', background: '#0D948818' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </div>
              </div>

              <div className="db-stat-card-h" onClick={() => navigate('/students')} style={{ cursor: 'pointer' }} title="View All Students">
                <div className="stat-card-left">
                  <span className="stat-card-label">Active Students</span>
                  <span className="stat-card-value">{stats?.active_students || 0}</span>
                  <span className="stat-card-micro" style={{ color: '#0284C7' }}>Enrolled Athletes</span>
                </div>
                <div className="stat-card-right" style={{ color: '#0284C7', background: '#0284C718' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
              </div>

              <div className="db-stat-card-h" onClick={() => navigate('/sessions')} style={{ cursor: 'pointer' }} title="View Sessions">
                <div className="stat-card-left">
                  <span className="stat-card-label">Sessions This Month</span>
                  <span className="stat-card-value">{stats?.sessions_this_month || 0}</span>
                  <span className="stat-card-micro" style={{ color: '#10B981' }}>Monthly Total</span>
                </div>
                <div className="stat-card-right" style={{ color: '#10B981', background: '#10B98118' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
              </div>

              <div className="db-stat-card-h" onClick={() => navigate('/sessions')} style={{ cursor: 'pointer' }} title="View Upcoming Sessions">
                <div className="stat-card-left">
                  <span className="stat-card-label">Upcoming Sessions</span>
                  <span className="stat-card-value">{stats?.upcoming_sessions || 0}</span>
                  <span className="stat-card-micro" style={{ color: '#F59E0B' }}>Scheduled Slots</span>
                </div>
                <div className="stat-card-right" style={{ color: '#F59E0B', background: '#F59E0B18' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
              </div>
            </div>

            {/* Quick Action Cards Grid */}
            <div className="db-quick-actions">
              <div className="action-card" onClick={() => navigate('/instructors')} style={{ cursor: 'pointer' }}>
                <div className="action-icon-wrapper" style={{ color: '#0D9488', background: '#CCFBF1' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                </div>
                <div className="action-text-box">
                  <span className="action-label">Add Instructor</span>
                  <span className="action-sublabel">Register coach & profile</span>
                </div>
              </div>

              <div className="action-card" onClick={() => navigate('/students')} style={{ cursor: 'pointer' }}>
                <div className="action-icon-wrapper" style={{ color: '#0284C7', background: '#E0F2FE' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                </div>
                <div className="action-text-box">
                  <span className="action-label">Add Student</span>
                  <span className="action-sublabel">Enroll student athlete</span>
                </div>
              </div>

              <div className="action-card" onClick={() => navigate('/sessions/new')} style={{ cursor: 'pointer' }}>
                <div className="action-icon-wrapper" style={{ color: '#10B981', background: '#D1FAE5' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
                <div className="action-text-box">
                  <span className="action-label">Schedule Session</span>
                  <span className="action-sublabel">Plan multi-slot coaching</span>
                </div>
              </div>

              <div className="action-card" onClick={() => navigate('/analysis')} style={{ cursor: 'pointer' }}>
                <div className="action-icon-wrapper" style={{ color: '#F43F5E', background: '#FFE4E6' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                </div>
                <div className="action-text-box">
                  <span className="action-label">Upload Video</span>
                  <span className="action-sublabel">AI technique analysis</span>
                </div>
              </div>
            </div>

            {/* Bottom Content Grid: Left (Sessions) + Right (Activity) */}
            <div className="db-bottom-grid">
              {/* Today's Sessions Card */}
              <div className="db-card">
                <div className="db-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 className="db-card-title">Today's Sessions</h3>
                    <span className="db-card-badge">{sessions.length} {sessions.length === 1 ? 'Group' : 'Groups'}</span>
                  </div>
                  <button
                    type="button"
                    className="db-view-all-link"
                    onClick={() => navigate('/sessions')}
                  >
                    View All in Sessions Hub →
                  </button>
                </div>

                {sessions.length === 0 ? (
                  /* High-end Empty State for Today's Sessions */
                  <div className="db-empty-sessions">
                    <div className="db-empty-icon-wrap">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12c.6 0 1.2-.2 1.7-.5 2.1-1.3 4.5-1.3 6.6 0 2.1 1.3 4.5 1.3 6.6 0 2.1-1.3 4.5-1.3 6.6 0 .5.3 1.1.5 1.7.5"/>
                        <path d="M2 17c.6 0 1.2-.2 1.7-.5 2.1-1.3 4.5-1.3 6.6 0 2.1 1.3 4.5 1.3 6.6 0 2.1-1.3 4.5-1.3 6.6 0 .5.3 1.1.5 1.7.5"/>
                      </svg>
                    </div>
                    <h4 className="db-empty-title">No Surf Sessions Scheduled for Today</h4>
                    <p className="db-empty-sub">
                      You're all clear today! You can schedule new group training, assign coaches, or inspect upcoming sessions on the interactive calendar.
                    </p>
                    <button
                      type="button"
                      className="db-empty-btn"
                      onClick={() => navigate('/sessions/new')}
                    >
                      + Schedule Today's Session
                    </button>
                  </div>
                ) : (
                  /* Rich Session Group List */
                  <div className="db-sessions-list">
                    {sessions.map((grp, idx) => (
                      <div
                        key={grp.id || idx}
                        className="db-session-item-card"
                        onClick={() => navigate('/sessions')}
                        title="Click to view in Sessions Hub"
                      >
                        <div className="db-sic-left">
                          <span className="db-sic-time">⏰ {grp.time}</span>
                          <div className="db-sic-group-row">
                            <span className="db-sic-group-name">{grp.groupName}</span>
                            <span className="db-sic-student-count">{grp.students.length} Students</span>
                          </div>
                          {grp.students.length > 0 && (
                            <div className="db-sic-students-chips">
                              {grp.students.slice(0, 4).map((name, sIdx) => (
                                <span key={sIdx} className="db-sic-chip">{name}</span>
                              ))}
                              {grp.students.length > 4 && (
                                <span className="db-sic-chip more">+{grp.students.length - 4} more</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="db-sic-right">
                          <div className="db-sic-coach-box">
                            <span className="db-sic-coach-label">Coach</span>
                            <span className="db-sic-coach-val">🏄‍♂️ {grp.instructor}</span>
                          </div>
                          <span className={`db-status-pill ${grp.status?.toLowerCase()}`}>
                            {grp.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity Timeline Card */}
              <div className="db-card">
                <div className="db-card-header">
                  <h3 className="db-card-title">Recent Activity</h3>
                  <span className="db-card-badge">Live Feed</span>
                </div>
                
                {activity.length === 0 ? (
                  <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No recent activity logged yet.
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <style>{`
        /* Welcome Banner */
        .db-welcome-banner {
          background: linear-gradient(135deg, #0F766E 0%, #0D9488 55%, #14B8A6 100%);
          border-radius: 18px;
          padding: 32px 38px;
          color: #FFFFFF;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          box-shadow: 0 10px 30px -5px rgba(13, 148, 136, 0.25);
          position: relative;
          box-sizing: border-box;
          width: 100%;
        }
        .banner-content {
          flex: 1;
        }
        .banner-pills-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .banner-date-badge, .banner-condition-badge, .banner-live-pill {
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
        }
        .banner-date-badge {
          background: rgba(255, 255, 255, 0.18);
          color: #FFFFFF;
        }
        .banner-condition-badge {
          background: rgba(0, 0, 0, 0.15);
          color: #E6FFFA;
        }
        .banner-live-pill {
          background: #10B981;
          color: #FFFFFF;
          letter-spacing: 0.5px;
        }
        .banner-heading {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0 0 8px 0;
          line-height: 1.25;
        }
        .banner-subtext {
          font-size: 14.5px;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          line-height: 1.5;
        }
        .banner-actions {
          flex-shrink: 0;
        }
        .banner-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          color: #0F766E;
          border: none;
          padding: 12px 22px;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
          transition: all 0.2s ease;
        }
        .banner-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
          background: #F0FDFA;
        }

        /* Quick Stats Grid */
        .db-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          width: 100%;
        }
        .db-stat-card-h {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }
        .db-stat-card-h:hover {
          transform: translateY(-2px);
          border-color: #CBD5E1;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        }
        .stat-card-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-card-label {
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748B;
          letter-spacing: 0.5px;
        }
        .stat-card-value {
          font-family: 'Outfit', sans-serif;
          font-size: 30px;
          font-weight: 800;
          color: #0F172A;
          line-height: 1.1;
        }
        .stat-card-micro {
          font-size: 11px;
          font-weight: 700;
        }
        .stat-card-right {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Quick Actions Grid */
        .db-quick-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          width: 100%;
        }
        .action-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
        }
        .action-card:hover {
          transform: translateY(-2px);
          border-color: #0D9488;
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.1);
        }
        .action-icon-wrapper {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .action-text-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .action-label {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
        }
        .action-sublabel {
          font-size: 11.5px;
          color: #64748B;
        }

        /* Bottom Grid */
        .db-bottom-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 24px;
          width: 100%;
          align-items: start;
        }
        .db-card {
          background: #FFFFFF;
          border-radius: 18px;
          padding: 24px 28px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          box-sizing: border-box;
        }
        .db-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid #F1F5F9;
        }
        .db-card-title {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }
        .db-card-badge {
          background: #F1F5F9;
          color: #475569;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 14px;
        }
        .db-view-all-link {
          background: transparent;
          border: none;
          color: #0D9488;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .db-view-all-link:hover {
          color: #0F766E;
          text-decoration: underline;
        }

        /* Empty State */
        .db-empty-sessions {
          padding: 42px 24px;
          text-align: center;
        }
        .db-empty-icon-wrap {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: #F0FDFA;
          color: #0D9488;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          border: 1px solid #CCFBF1;
        }
        .db-empty-title {
          font-family: 'Outfit', sans-serif;
          font-size: 17px;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 6px 0;
        }
        .db-empty-sub {
          font-size: 13px;
          color: #64748B;
          max-width: 380px;
          margin: 0 auto 20px;
          line-height: 1.5;
        }
        .db-empty-btn {
          background: #0D9488;
          color: #FFFFFF;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
          transition: all 0.15s ease;
        }
        .db-empty-btn:hover {
          background: #0F766E;
        }

        /* Session Group Item Cards */
        .db-sessions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .db-session-item-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .db-session-item-card:hover {
          border-color: #0D9488;
          background: #F0FDFA;
          transform: translateY(-1px);
        }
        .db-sic-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .db-sic-time {
          font-size: 12px;
          font-weight: 800;
          color: #0D9488;
        }
        .db-sic-group-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .db-sic-group-name {
          font-size: 15px;
          font-weight: 800;
          color: #0F172A;
        }
        .db-sic-student-count {
          font-size: 11.5px;
          font-weight: 700;
          background: #E2E8F0;
          color: #475569;
          padding: 2px 7px;
          border-radius: 6px;
        }
        .db-sic-students-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .db-sic-chip {
          font-size: 11px;
          font-weight: 600;
          background: #FFFFFF;
          color: #334155;
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
        }
        .db-sic-chip.more {
          background: #F1F5F9;
          color: #64748B;
        }
        .db-sic-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .db-sic-coach-box {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .db-sic-coach-label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          color: #94A3B8;
          letter-spacing: 0.5px;
        }
        .db-sic-coach-val {
          font-size: 12.5px;
          font-weight: 700;
          color: #0F172A;
        }
        .db-status-pill {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .db-status-pill.pending, .db-status-pill.upcoming {
          background: #FEF3C7;
          color: #D97706;
        }
        .db-status-pill.completed {
          background: #DCFCE7;
          color: #15803D;
        }
        .db-status-pill.in\ progress {
          background: #CCFBF1;
          color: #0F766E;
        }

        /* Activity Timeline */
        .db-activity-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 0;
          margin: 0;
        }
        .db-activity-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #F8FAFC;
        }
        .db-activity-item:last-child {
          border-bottom: none;
        }
        .db-activity-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .db-activity-text p {
          font-size: 13px;
          color: #1E293B;
          line-height: 1.45;
          margin: 0;
          font-weight: 500;
        }
        .db-activity-time {
          font-size: 11px;
          color: #94A3B8;
          margin-top: 3px;
          display: block;
          font-weight: 600;
        }

        /* Loading */
        .db-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 14px;
        }
        .db-spinner {
          width: 36px;
          height: 36px;
          border: 3.5px solid #CCFBF1;
          border-top-color: #0D9488;
          border-radius: 50%;
          animation: dbSpin 0.7s linear infinite;
        }
        @keyframes dbSpin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .db-stats-row, .db-quick-actions {
            grid-template-columns: repeat(2, 1fr);
          }
          .db-bottom-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .db-welcome-banner {
            flex-direction: column;
            align-items: flex-start;
            padding: 24px;
          }
          .banner-heading {
            font-size: 22px;
          }
          .db-stats-row, .db-quick-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SchoolDashboard;
