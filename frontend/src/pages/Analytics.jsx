import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const BADGE_COLORS = {
  WHITE: { bg: '#E2E8F0', text: '#64748B' },
  YELLOW: { bg: '#F59E0B', text: '#F59E0B' },
  GREEN: { bg: '#10B981', text: '#10B981' },
  BLUE: { bg: '#3B82F6', text: '#3B82F6' },
  RED: { bg: '#F43F5E', text: '#F43F5E' },
};
const BADGE_ORDER = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED'];

const Analytics = () => {
  const [badgeStats, setBadgeStats] = useState([
    { label: 'WHITE', count: 0 },
    { label: 'YELLOW', count: 0 },
    { label: 'GREEN', count: 0 },
    { label: 'BLUE', count: 0 },
    { label: 'RED', count: 0 },
  ]);
  const [students, setStudents] = useState([]);
  const [allStudentsList, setAllStudentsList] = useState([]);
  const [allSessionsList, setAllSessionsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('user') || '{}'); } catch (e) { return {}; }
  })();

  const activeSchool = (() => {
    try {
      const s = sessionStorage.getItem('activeSchool');
      if (s) {
        const parsed = JSON.parse(s);
        return parsed?.name || s;
      }
      return currentUser?.school || currentUser?.school_name || '';
    } catch (e) { return currentUser?.school || ''; }
  })();

  const userRole = (currentUser?.role || '').toLowerCase().trim();
  const isCoach = userRole === 'coach';
  const isStudent = userRole === 'athlete' || userRole === 'student' || userRole === 'user';
  const coachId = currentUser?.instructor_id || currentUser?.id;
  const coachName = currentUser?.name || '';
  const studentId = currentUser?.student_id || currentUser?.id;
  const studentName = (currentUser?.name || '').toLowerCase().trim();
  const studentEmail = (currentUser?.email || '').toLowerCase().trim();

  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (isCoach && coachId) {
      queryParams.append('instructor_id', coachId);
    } else if (activeSchool && activeSchool.toLowerCase() !== 'super admin' && activeSchool.toLowerCase() !== 'all') {
      queryParams.append('school', activeSchool);
    }
    const qStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

    Promise.all([
      fetch(`${API}/api/analytics/badges${qStr}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/analytics/students${qStr}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/students`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/sessions`).then(r => r.json()).catch(() => []),
    ])
      .then(([badges, studs, stdsList, sessList]) => {
        if (Array.isArray(badges)) setBadgeStats(badges);
        if (Array.isArray(studs)) setStudents(studs);
        if (Array.isArray(stdsList)) setAllStudentsList(stdsList);
        if (Array.isArray(sessList)) setAllSessionsList(sessList);
      })
      .catch((err) => {
        console.error('Analytics fetch error:', err);
      })
      .finally(() => setLoading(false));
  }, [isCoach, coachId, activeSchool]);

  const getGuestsForStudent = (student) => {
    if (!student) return [];
    const guestNames = new Set();

    const parseGuests = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
      return [];
    };

    // 1. Direct guests_details
    parseGuests(student.guests_details).forEach(g => {
      const name = typeof g === 'string' ? g.trim() : (g?.name ? String(g.name).trim() : '');
      if (name) guestNames.add(name);
    });

    // 2. Matched student from full students list
    const matchedStd = allStudentsList.find(s => 
      (student.id && s.id === student.id) ||
      ((student.name || '').toLowerCase().trim() === (s.name || '').toLowerCase().trim())
    );
    if (matchedStd) {
      parseGuests(matchedStd.guests_details).forEach(g => {
        const name = typeof g === 'string' ? g.trim() : (g?.name ? String(g.name).trim() : '');
        if (name) guestNames.add(name);
      });
    }

    // 3. Sessions list matching student
    allSessionsList.forEach(sess => {
      const matchId = student.id && (String(sess.student_id) === String(student.id));
      const matchName = (student.name || '').toLowerCase().trim() === (sess.student || sess.student_name || '').toLowerCase().trim();
      if (matchId || matchName) {
        if (sess.guest_name && sess.guest_name.trim()) {
          guestNames.add(sess.guest_name.trim());
        } else if (sess.is_guest && sess.student && sess.student.trim()) {
          guestNames.add(sess.student.trim());
        }
      }
    });

    // 4. Storage fallback
    if (guestNames.size === 0) {
      try {
        const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        const stNameLower = (student.name || '').toLowerCase().trim();
        if (stNameLower && (savedUser.name || '').toLowerCase().trim() === stNameLower) {
          parseGuests(savedUser.guests_details).forEach(g => {
            const name = typeof g === 'string' ? g.trim() : (g?.name ? String(g.name).trim() : '');
            if (name) guestNames.add(name);
          });
        }
      } catch (e) {}
    }

    return Array.from(guestNames);
  };

  const filteredStudents = useMemo(() => {
    if (!students || students.length === 0) return [];

    // STUDENT ROLE: Show only their own record + their own guests
    if (isStudent) {
      const me = students.find(s => {
        if (studentId && (String(s.id) === String(studentId) || String(s.user_id) === String(studentId))) return true;
        if (studentEmail && (s.email || '').toLowerCase().trim() === studentEmail) return true;
        if (studentName && (s.name || '').toLowerCase().trim() === studentName) return true;
        return false;
      });
      if (!me) return [];
      const result = [{ ...me, isGuest: false, displayKey: `student_${me.id}` }];
      getGuestsForStudent(me).forEach(gName => {
        result.push({
          id: `guest_${me.id}_${gName}`,
          name: gName,
          isGuest: true,
          parentName: me.name,
          parentId: me.id,
          school: me.school,
          instructor: me.instructor || '—',
          badges: 0,
          badge_levels: [],
          nextTime: '3 weeks',
          nextColor: '#64748B',
          displayKey: `guest_${me.id}_${gName}`
        });
      });
      return result;
    }
    
    // Base filter by coach or school
    const scoped = students.filter(s => {
      if (isCoach && (coachId || coachName)) {
        const cNameLower = (coachName || '').toLowerCase().trim();
        const hasSessionWithCoach = allSessionsList.some(sess => {
          const sessStatus = (sess.status || '').toLowerCase().trim();
          if (sessStatus === 'cancelled' || sessStatus === 'canceled') return false;

          const sInstLower = (sess.instructor || sess.instructor_name || '').toLowerCase().trim();
          const instMatch = 
            (cNameLower && sInstLower && (sInstLower === cNameLower || sInstLower.includes(cNameLower) || cNameLower.includes(sInstLower))) ||
            (coachId && (sess.instructor_id === coachId || String(sess.instructor_id) === String(coachId) || parseInt(sess.instructor_id) === parseInt(coachId)));

          if (!instMatch) return false;

          const matchId = s.id && (String(sess.student_id) === String(s.id));
          const sNameLower = (s.name || '').toLowerCase().trim();
          const matchName = sNameLower && (
            (sess.student || '').toLowerCase().trim() === sNameLower ||
            (sess.student_name || '').toLowerCase().trim() === sNameLower
          );

          return matchId || matchName;
        });

        return hasSessionWithCoach;
      }
      if (activeSchool && activeSchool.toLowerCase() !== 'super admin' && activeSchool.toLowerCase() !== 'all') {
        const sSchool = (s.school || '').toLowerCase().trim();
        const actSchool = activeSchool.toLowerCase().trim();
        return sSchool === actSchool;
      }
      return true;
    });

    // Expand students with accompanying guests
    const expanded = [];
    scoped.forEach(student => {
      expanded.push({
        ...student,
        isGuest: false,
        displayKey: `student_${student.id || student.name}`
      });

      const guests = getGuestsForStudent(student);
      guests.forEach(gName => {
        expanded.push({
          id: `guest_${student.id}_${gName}`,
          name: gName,
          isGuest: true,
          parentName: student.name,
          parentId: student.id,
          school: student.school,
          instructor_id: student.instructor_id,
          instructor: student.instructor || '—',
          badges: 0,
          badge_levels: [],
          nextTime: '3 weeks',
          nextColor: '#64748B',
          displayKey: `guest_${student.id}_${gName}`
        });
      });
    });

    return expanded;
  }, [students, isCoach, isStudent, coachId, coachName, studentId, studentName, studentEmail, activeSchool, allStudentsList, allSessionsList]);

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
                  {filteredStudents.map((student, i) => (
                    <tr
                      key={student.displayKey || i}
                      style={{
                        borderBottom: i === filteredStudents.length - 1 ? 'none' : '1px solid #E2E8F0',
                        backgroundColor: student.isGuest ? 'rgba(240, 249, 255, 0.45)' : 'transparent'
                      }}
                    >
                      <td className="an-student-name">
                        {student.isGuest ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', paddingLeft: '14px' }}>
                            <span style={{ color: '#94A3B8', fontSize: '13px' }}>↳</span>
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{student.name}</span>
                            <span style={{
                              fontSize: '10.5px',
                              background: '#E0F2FE',
                              color: '#0369A1',
                              border: '1px solid #BAE6FD',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}>
                              Guest of {student.parentName}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{student.name}</span>
                        )}
                      </td>
                      <td>
                        <div className="an-badge-history">
                          {BADGE_ORDER.map((badgeLevel, index) => {
                            const earned = student.badge_levels?.includes(badgeLevel) || index < student.badges;
                            const colors = BADGE_COLORS[badgeLevel];
                            return (
                              <div
                                key={index}
                                className="an-badge-circle"
                                title={earned ? `${badgeLevel} Badge (Earned)` : `${badgeLevel} Badge`}
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
                  {filteredStudents.length === 0 && (
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
        .an-page {
          display: flex;
          min-height: 100vh;
          height: auto !important;
          background: #F8FAFC;
          font-family: 'Instrument Sans', sans-serif;
          padding-top: 0px;
          box-sizing: border-box;
          width: 100%;
          overflow-y: auto !important;
        }
        .an-main {
          flex: 1;
          padding: 32px 40px 80px 40px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
          overflow-y: visible !important;
        }

        /* Header */
        .an-header { display: flex; justify-content: space-between; align-items: center; }
        .an-header-text { display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
        .an-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.2; text-align: left; }
        .an-sub { font-size: 13.5px; color: #64748B; margin: 4px 0 0 0; line-height: 1.4; text-align: left; }
        .an-export-btn {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px;
          padding: 10px 20px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; color: #0F172A; cursor: pointer;
          transition: all 0.2s ease;
        }
        .an-export-btn:hover { background: #F1F5F9; border-color: #CBD5E1; }

        /* Loading */
        .an-loading { display: flex; justify-content: center; align-items: center; height: 300px; }
        .an-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(244, 63, 94, 0.2); border-top-color: #F43F5E;
          border-radius: 50%; animation: an-spin 0.7s linear infinite;
        }
        @keyframes an-spin { to { transform: rotate(360deg); } }

        /* Stats Row */
        .an-stats-row { display: flex; gap: 16px; width: 100%; }
        .an-stat-card {
          flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px;
          display: flex; flex-direction: column; gap: 8px; box-sizing: border-box;
        }
        .an-stat-top { display: flex; justify-content: space-between; align-items: center; }
        .an-stat-label { font-size: 12px; font-weight: 700; color: #64748B; opacity: 0.7; text-transform: uppercase; }
        .an-stat-dot { width: 10px; height: 10px; border-radius: 50%; }
        .an-stat-count { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; line-height: 1.1; }
        .an-stat-desc { font-size: 12px; color: #64748B; line-height: 1.3; }

        /* Funnel Card */
        .an-funnel-card {
          background: #050B1A; border-radius: 20px; padding: 32px;
          display: flex; flex-direction: column; align-items: center; gap: 24px; box-sizing: border-box;
        }
        .an-funnel-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #FFFFFF; margin: 0; }
        .an-funnel-chart { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 600px; box-sizing: border-box; }
        .an-funnel-row { display: flex; align-items: center; gap: 16px; width: 100%; }
        .an-funnel-label { width: 60px; font-size: 12px; font-weight: 700; color: #FFFFFF; opacity: 0.7; flex-shrink: 0; }
        .an-funnel-bar-container { flex: 1; display: flex; align-items: center; gap: 12px; min-width: 0; }
        .an-funnel-bar { height: 26px; border-radius: 4px; transition: width 0.6s ease; min-width: 4px; }
        .an-funnel-value { font-size: 12px; font-weight: 700; color: #FFFFFF; }

        /* Table */
        .an-table-container { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; width: 100%; }
        .an-table { width: 100%; border-collapse: collapse; }
        .an-table th {
          text-align: left; padding: 16px 20px; font-size: 12px; font-weight: 700;
          color: #94A3B8; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; background: #F8F6F2;
        }
        .an-table td { padding: 16px 20px; vertical-align: middle; font-size: 12px; }
        .an-student-name { font-weight: 600; color: #0F172A; }
        .an-instructor-name { color: #0F172A; }
        .an-badge-history { display: flex; gap: 8px; }
        .an-badge-circle { width: 16px; height: 16px; border-radius: 50%; transition: transform 0.2s; cursor: help; }
        .an-badge-circle:hover { transform: scale(1.3); }

        @media (max-width: 768px) {
          .an-page {
            padding-top: 0px !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }
          .an-main {
            padding: 14px 12px 60px 12px !important;
            gap: 14px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          /* Header */
          .an-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
            width: 100% !important;
          }
          .an-header-text {
            width: 100% !important;
          }
          .an-title {
            font-size: 20px !important;
            font-weight: 800 !important;
          }
          .an-sub {
            font-size: 12px !important;
            margin: 2px 0 0 0 !important;
          }
          .an-export-btn {
            padding: 6px 14px !important;
            font-size: 11px !important;
            border-radius: 8px !important;
            align-self: flex-start !important;
          }

          /* Stats Row - Compact and responsive, no side scrolling! */
          .an-stats-row {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(95px, 1fr)) !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .an-stat-card {
            padding: 10px 12px !important;
            border-radius: 12px !important;
            gap: 4px !important;
            flex: unset !important;
            box-sizing: border-box !important;
          }
          .an-stat-top {
            gap: 4px !important;
          }
          .an-stat-label {
            font-size: 10px !important;
          }
          .an-stat-dot {
            width: 8px !important;
            height: 8px !important;
          }
          .an-stat-count {
            font-size: 20px !important;
            line-height: 1.1 !important;
          }
          .an-stat-desc {
            font-size: 10px !important;
            line-height: 1.2 !important;
            color: #64748B !important;
          }

          /* Retention Funnel - Compact dark card */
          .an-funnel-card {
            padding: 16px 14px !important;
            border-radius: 16px !important;
            gap: 14px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            align-items: stretch !important;
          }
          .an-funnel-title {
            font-size: 15px !important;
            font-weight: 700 !important;
            text-align: left !important;
            width: 100% !important;
          }
          .an-funnel-chart {
            width: 100% !important;
            max-width: 100% !important;
            gap: 8px !important;
            box-sizing: border-box !important;
          }
          .an-funnel-row {
            gap: 8px !important;
            width: 100% !important;
          }
          .an-funnel-label {
            width: 50px !important;
            font-size: 11px !important;
            flex-shrink: 0 !important;
          }
          .an-funnel-bar-container {
            flex: 1 !important;
            min-width: 0 !important;
            gap: 8px !important;
          }
          .an-funnel-bar {
            height: 18px !important;
            min-width: 6px !important;
            border-radius: 4px !important;
          }
          .an-funnel-value {
            font-size: 11px !important;
            font-weight: 700 !important;
          }

          /* Table - Touch scrollable & compact */
          .an-table-container {
            border-radius: 12px !important;
            width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            box-sizing: border-box !important;
          }
          .an-table th {
            padding: 10px 12px !important;
            font-size: 10px !important;
            white-space: nowrap !important;
          }
          .an-table td {
            padding: 10px 12px !important;
            font-size: 11px !important;
            white-space: nowrap !important;
          }
          .an-badge-circle {
            width: 12px !important;
            height: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Analytics;
