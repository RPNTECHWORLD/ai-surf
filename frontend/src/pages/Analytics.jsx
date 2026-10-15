import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import DateRangeFilterBar, { getIsoDate } from '../components/DateRangeFilterBar';

const API = import.meta.env.VITE_API_URL || '';

const BADGE_COLORS = {
  WHITE: { bg: '#E2E8F0', border: '#94A3B8', text: '#64748B', label: 'Beginner' },
  YELLOW: { bg: '#F59E0B', border: '#D97706', text: '#D97706', label: 'Advance Beginner' },
  GREEN: { bg: '#10B981', border: '#059669', text: '#059669', label: 'Intermediate' },
  BLUE: { bg: '#3B82F6', border: '#2563EB', text: '#2563EB', label: 'Advance Intermediate' },
  RED: { bg: '#F43F5E', border: '#E11D48', text: '#E11D48', label: 'Pro' },
};
const BADGE_ORDER = ['WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED'];

function parseLocalDateOnly(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  const s = String(dateStr).trim();
  if (!s) return null;

  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
  }
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

function getStudentCourseTotalDays(student) {
  if (!student) return 3;
  if (student.totalDays && !isNaN(parseInt(student.totalDays, 10))) {
    return parseInt(student.totalDays, 10);
  }
  if (student.total_days && !isNaN(parseInt(student.total_days, 10))) {
    return parseInt(student.total_days, 10);
  }
  const durStr = student.course_duration || student.courseDuration || student.course || student.waitlistGroup || '';
  const match = String(durStr).match(/(\d+)\s*Day/i);
  if (match) return parseInt(match[1], 10);
  return 3;
}

function getStudentEndDate(student) {
  if (!student) return '';
  const rawStart = student.startDate || student.start_date;
  if (!rawStart) return student.end_date || student.endDate || '';

  const startDate = parseLocalDateOnly(rawStart);
  if (!startDate) return student.end_date || student.endDate || '';

  if (student.end_date) {
    const parsedEnd = parseLocalDateOnly(student.end_date);
    if (parsedEnd && parsedEnd >= startDate) {
      const y = parsedEnd.getFullYear();
      const m = String(parsedEnd.getMonth() + 1).padStart(2, '0');
      const d = String(parsedEnd.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const totalDays = getStudentCourseTotalDays(student);
  const end = new Date(startDate);
  end.setDate(startDate.getDate() + (totalDays - 1));

  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isStudentActive(student, targetDate = new Date()) {
  if (!student) return false;
  const status = (student.status || student.approval_status || '').toLowerCase().trim();
  if (status === 'inactive' || status === 'pending' || status === 'rejected') return false;

  const rawStart = student.startDate || student.start_date;
  if (!rawStart) return false;

  const startDate = parseLocalDateOnly(rawStart);
  if (!startDate) return false;

  const totalDays = getStudentCourseTotalDays(student);
  const target = targetDate instanceof Date ? targetDate : (parseLocalDateOnly(targetDate) || new Date());
  const targetClean = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const startClean = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  const diffMs = targetClean.getTime() - startClean.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const dayNumber = diffDays + 1;

  return dayNumber >= 1 && dayNumber <= totalDays;
}

function isStudentActiveForRange(student, dateRange, sessionsList = []) {
  if (!student) return false;
  const status = (student.status || student.approval_status || '').toLowerCase().trim();
  if (status === 'inactive' || status === 'pending' || status === 'rejected') return false;

  // "All" preset or empty range shows all valid students
  if (!dateRange || dateRange.preset === 'all' || (!dateRange.startDate && !dateRange.endDate)) {
    return true;
  }

  const sIdStr = student.id ? String(student.id) : '';
  const sNameLower = (student.name || '').toLowerCase().trim();

  // 1. Single day evaluation (Yesterday, Today, Tomorrow, or single custom date)
  if (dateRange.startDate && dateRange.endDate && dateRange.startDate === dateRange.endDate) {
    const targetDate = dateRange.startDate;

    if (isStudentActive(student, targetDate)) return true;

    const sStart = (student.start_date || student.startDate || '').slice(0, 10);
    if (sStart === targetDate) return true;

    const hasSessionToday = sessionsList.some(sess => {
      const sessStatus = (sess.status || '').toLowerCase().trim();
      if (sessStatus === 'cancelled' || sessStatus === 'canceled') return false;
      const matchId = sIdStr && String(sess.student_id) === sIdStr;
      const matchName = sNameLower && (
        (sess.student || '').toLowerCase().trim() === sNameLower ||
        (sess.student_name || '').toLowerCase().trim() === sNameLower ||
        (sess.guest_name || '').toLowerCase().trim() === sNameLower
      );
      if (!matchId && !matchName) return false;
      const sessDate = (sess.date || '').slice(0, 10);
      return sessDate === targetDate;
    });
    return hasSessionToday;
  }

  // 2. Date Range evaluation (startDate to endDate)
  const rangeStart = dateRange.startDate;
  const rangeEnd = dateRange.endDate || dateRange.startDate;

  const sStart = (student.start_date || student.startDate || '').slice(0, 10);
  const sEnd = getStudentEndDate(student) || sStart;

  let courseOverlaps = false;
  if (sStart && sEnd) {
    courseOverlaps = (!rangeStart || sEnd >= rangeStart) && (!rangeEnd || sStart <= rangeEnd);
  } else if (sStart) {
    courseOverlaps = (!rangeStart || sStart >= rangeStart) && (!rangeEnd || sStart <= rangeEnd);
  }

  if (courseOverlaps) return true;

  const hasSessionInRange = sessionsList.some(sess => {
    const sessStatus = (sess.status || '').toLowerCase().trim();
    if (sessStatus === 'cancelled' || sessStatus === 'canceled') return false;
    const matchId = sIdStr && String(sess.student_id) === sIdStr;
    const matchName = sNameLower && (
      (sess.student || '').toLowerCase().trim() === sNameLower ||
      (sess.student_name || '').toLowerCase().trim() === sNameLower ||
      (sess.guest_name || '').toLowerCase().trim() === sNameLower
    );
    if (!matchId && !matchName) return false;
    const sessDate = (sess.date || '').slice(0, 10);
    if (!sessDate) return false;
    return (!rangeStart || sessDate >= rangeStart) && (!rangeEnd || sessDate <= rangeEnd);
  });

  return hasSessionInRange;
}

function mapLevelToBadgeInfo(rawLevel, existingBadgeLevels = []) {
  const lvl = String(rawLevel || '').toLowerCase().trim();
  let baseBadge = 'WHITE';
  let badgeRank = 1;
  let nextTime = '3 weeks';
  let nextColor = '#64748B';

  if (lvl.includes('pro') || lvl.includes('master')) {
    baseBadge = 'RED';
    badgeRank = 5;
    nextTime = 'Max Level';
    nextColor = '#0D9488';
  } else if (lvl.includes('advance intermediate') || lvl.includes('advanced intermediate')) {
    baseBadge = 'BLUE';
    badgeRank = 4;
    nextTime = '3 months';
    nextColor = '#64748B';
  } else if (lvl.includes('intermediate')) {
    baseBadge = 'GREEN';
    badgeRank = 3;
    nextTime = 'Ready Now';
    nextColor = '#0D9488';
  } else if (lvl.includes('advance beginner') || lvl.includes('advanced beginner') || lvl.includes('yellow')) {
    baseBadge = 'YELLOW';
    badgeRank = 2;
    nextTime = '1 month';
    nextColor = '#64748B';
  } else if (lvl.includes('advanced')) {
    baseBadge = 'RED';
    badgeRank = 5;
    nextTime = 'Max Level';
    nextColor = '#0D9488';
  } else {
    baseBadge = 'WHITE';
    badgeRank = 1;
    nextTime = '3 weeks';
    nextColor = '#64748B';
  }

  const dbCount = Array.isArray(existingBadgeLevels) ? existingBadgeLevels.length : 0;
  const effectiveRank = rawLevel ? badgeRank : (dbCount > 0 ? dbCount : 1);
  const earnedLevels = BADGE_ORDER.slice(0, effectiveRank);
  const currentBadge = BADGE_ORDER[effectiveRank - 1] || baseBadge;

  if (effectiveRank >= 5) {
    nextTime = 'Max Level';
    nextColor = '#0D9488';
  } else if (effectiveRank === 4) {
    nextTime = '3 months';
    nextColor = '#64748B';
  } else if (effectiveRank === 3) {
    nextTime = 'Ready Now';
    nextColor = '#0D9488';
  } else if (effectiveRank === 2) {
    nextTime = '1 month';
    nextColor = '#64748B';
  } else if (effectiveRank === 1) {
    nextTime = '3 weeks';
    nextColor = '#64748B';
  }

  return {
    currentBadge,
    badgeCount: effectiveRank,
    badgeLevels: earnedLevels,
    nextTime,
    nextColor
  };
}

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

  // Date Range Filter State
  const [dateRange, setDateRange] = useState(() => ({
    startDate: getIsoDate(0),
    endDate: getIsoDate(0),
    preset: 'today'
  }));
  const [searchQuery, setSearchQuery] = useState('');

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

    const stdSchoolParam = (activeSchool && activeSchool.toLowerCase() !== 'super admin' && activeSchool.toLowerCase() !== 'all')
      ? `?school=${encodeURIComponent(activeSchool)}`
      : '?school=all';

    Promise.all([
      fetch(`${API}/api/analytics/badges${qStr}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/analytics/students${qStr}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/students${stdSchoolParam}`).then(r => r.json()).catch(() => []),
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
    const guestMap = new Map();

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

    const addGuest = (g) => {
      if (!g) return;
      const name = typeof g === 'string' ? g.trim() : (g?.name ? String(g.name).trim() : '');
      if (!name) return;
      const existing = guestMap.get(name.toLowerCase());
      const level = (typeof g === 'object' && g.level) ? g.level : (existing?.level || student.level || 'Beginner');
      guestMap.set(name.toLowerCase(), {
        name,
        level,
        ...(typeof g === 'object' ? g : {})
      });
    };

    // 1. Direct guests_details
    parseGuests(student.guests_details).forEach(addGuest);

    // 2. Matched student from full students list
    const matchedStd = allStudentsList.find(s => 
      (student.id && s.id === student.id) ||
      ((student.name || '').toLowerCase().trim() === (s.name || '').toLowerCase().trim())
    );
    if (matchedStd) {
      parseGuests(matchedStd.guests_details).forEach(addGuest);
    }

    // 3. Sessions list matching student
    allSessionsList.forEach(sess => {
      const matchId = student.id && (String(sess.student_id) === String(student.id));
      const matchName = (student.name || '').toLowerCase().trim() === (sess.student || sess.student_name || '').toLowerCase().trim();
      if (matchId || matchName) {
        if (sess.guest_name && sess.guest_name.trim()) {
          addGuest({ name: sess.guest_name.trim(), level: sess.level || student.level || 'Beginner' });
        } else if (sess.is_guest && sess.student && sess.student.trim()) {
          addGuest({ name: sess.student.trim(), level: sess.level || student.level || 'Beginner' });
        }
      }
    });

    // 4. Storage fallback
    if (guestMap.size === 0) {
      try {
        const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        const stNameLower = (student.name || '').toLowerCase().trim();
        if (stNameLower && (savedUser.name || '').toLowerCase().trim() === stNameLower) {
          parseGuests(savedUser.guests_details).forEach(addGuest);
        }
      } catch (e) {}
    }

    return Array.from(guestMap.values());
  };

  const filteredStudents = useMemo(() => {
    // Merge students from allStudentsList and analytics students
    // allStudentsList has start_date, course_duration, and level
    const sourceList = (allStudentsList && allStudentsList.length > 0) ? allStudentsList : students;
    if (!sourceList || sourceList.length === 0) return [];

    // STUDENT ROLE: Show only their own record + their own guests
    if (isStudent) {
      const me = sourceList.find(s => {
        if (studentId && (String(s.id) === String(studentId) || String(s.user_id) === String(studentId))) return true;
        if (studentEmail && (s.email || '').toLowerCase().trim() === studentEmail) return true;
        if (studentName && (s.name || '').toLowerCase().trim() === studentName) return true;
        return false;
      });
      if (!me) return [];
      if (!isStudentActiveForRange(me, dateRange, allSessionsList)) return [];

      const badgeInfo = mapLevelToBadgeInfo(me.level, me.badge_levels);
      const result = [{
        ...me,
        isGuest: false,
        displayKey: `student_${me.id}`,
        badges: badgeInfo.badgeCount,
        badge_levels: badgeInfo.badgeLevels,
        currentBadge: badgeInfo.currentBadge,
        nextTime: badgeInfo.nextTime,
        nextColor: badgeInfo.nextColor
      }];
      getGuestsForStudent(me).forEach(g => {
        const gBadgeInfo = mapLevelToBadgeInfo(g.level || me.level, []);
        result.push({
          id: `guest_${me.id}_${g.name}`,
          name: g.name,
          isGuest: true,
          parentName: me.name,
          parentId: me.id,
          school: me.school,
          instructor: me.instructor || '—',
          badges: gBadgeInfo.badgeCount,
          badge_levels: gBadgeInfo.badgeLevels,
          currentBadge: gBadgeInfo.currentBadge,
          nextTime: gBadgeInfo.nextTime,
          nextColor: gBadgeInfo.nextColor,
          displayKey: `guest_${me.id}_${g.name}`
        });
      });
      return result;
    }
    
    // Base filter: MUST BE ACTIVE IN SELECTED DATE RANGE, and match coach or school
    const scoped = sourceList.filter(s => {
      // 1. MUST BE ACTIVE IN SELECTED DATE RANGE:
      if (!isStudentActiveForRange(s, dateRange, allSessionsList)) return false;

      // 2. Coach Filter
      if (isCoach && (coachId || coachName)) {
        const cNameLower = (coachName || '').toLowerCase().trim();
        const instMatch = (s.instructor_id && (s.instructor_id === coachId || String(s.instructor_id) === String(coachId))) ||
          ((s.instructor || '').toLowerCase().trim() === cNameLower);
        if (instMatch) return true;

        const hasSessionWithCoach = allSessionsList.some(sess => {
          const sessStatus = (sess.status || '').toLowerCase().trim();
          if (sessStatus === 'cancelled' || sessStatus === 'canceled') return false;

          const sInstLower = (sess.instructor || sess.instructor_name || '').toLowerCase().trim();
          const matchCoach = 
            (cNameLower && sInstLower && (sInstLower === cNameLower || sInstLower.includes(cNameLower) || cNameLower.includes(sInstLower))) ||
            (coachId && (sess.instructor_id === coachId || String(sess.instructor_id) === String(coachId) || parseInt(sess.instructor_id) === parseInt(coachId)));

          if (!matchCoach) return false;

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

      // 3. School Filter
      if (activeSchool && activeSchool.toLowerCase() !== 'super admin' && activeSchool.toLowerCase() !== 'all') {
        const sSchool = (s.school || s.school_name || '').toLowerCase().trim();
        const actSchool = activeSchool.toLowerCase().trim();
        return sSchool === actSchool;
      }
      return true;
    });

    // Expand students with accompanying guests
    const expanded = [];
    scoped.forEach(student => {
      const anStudent = students.find(an => an.id === student.id || (an.name && an.name.toLowerCase().trim() === (student.name || '').toLowerCase().trim()));
      const instName = student.instructor || student.instructor_name || anStudent?.instructor || '—';
      const badgeInfo = mapLevelToBadgeInfo(student.level, student.badge_levels || anStudent?.badge_levels);

      expanded.push({
        ...student,
        instructor: instName,
        isGuest: false,
        badges: badgeInfo.badgeCount,
        badge_levels: badgeInfo.badgeLevels,
        currentBadge: badgeInfo.currentBadge,
        nextTime: badgeInfo.nextTime,
        nextColor: badgeInfo.nextColor,
        displayKey: `student_${student.id || student.name}`
      });

      const guests = getGuestsForStudent(student);
      guests.forEach(g => {
        const gBadgeInfo = mapLevelToBadgeInfo(g.level || student.level || 'Beginner');
        expanded.push({
          id: `guest_${student.id}_${g.name}`,
          name: g.name,
          isGuest: true,
          parentName: student.name,
          parentId: student.id,
          school: student.school,
          instructor_id: student.instructor_id,
          instructor: instName,
          badges: gBadgeInfo.badgeCount,
          badge_levels: gBadgeInfo.badgeLevels,
          currentBadge: gBadgeInfo.currentBadge,
          nextTime: gBadgeInfo.nextTime,
          nextColor: gBadgeInfo.nextColor,
          displayKey: `guest_${student.id}_${g.name}`
        });
      });
    });

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return expanded.filter(st => {
        const nameMatch = (st.name || '').toLowerCase().includes(q);
        const parentMatch = (st.parentName || '').toLowerCase().includes(q);
        const instMatch = (st.instructor || '').toLowerCase().includes(q);
        return nameMatch || parentMatch || instMatch;
      });
    }

    return expanded;
  }, [students, isCoach, isStudent, coachId, coachName, studentId, studentName, studentEmail, activeSchool, allStudentsList, allSessionsList, dateRange, searchQuery]);

  // Compute stats dynamically from the active students
  const displayBadgeStats = useMemo(() => {
    const counts = { WHITE: 0, YELLOW: 0, GREEN: 0, BLUE: 0, RED: 0 };
    filteredStudents.forEach(st => {
      if (st.currentBadge && counts[st.currentBadge] !== undefined) {
        counts[st.currentBadge]++;
      }
    });
    return BADGE_ORDER.map(label => ({
      label,
      count: counts[label] || 0
    }));
  }, [filteredStudents]);

  const maxCount = displayBadgeStats.length > 0 ? Math.max(...displayBadgeStats.map(b => b.count), 1) : 1;

  return (
    <div className="an-page">
      <Sidebar />
      <main className="an-main">
        {/* Header */}
        <header className="an-header">
          <div className="an-header-text">
            <h1 className="an-title">Badge Progression</h1>
            <p className="an-sub">Track active students, registrations, and skill badges across your school.</p>
          </div>
          <button className="an-export-btn" onClick={() => window.print()}>Export PDF Report</button>
        </header>

        {/* Controls Row: Search & Date Range Filter Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: '1 1 280px',
            maxWidth: '380px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '0 14px',
            height: '42px',
            boxSizing: 'border-box',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search student or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '13.5px',
                fontFamily: "'Instrument Sans', sans-serif",
                color: '#0F172A',
                marginLeft: '10px'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            )}
          </div>

          <DateRangeFilterBar
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            preset={dateRange.preset}
            onChange={({ startDate, endDate, preset }) => {
              setDateRange({ startDate, endDate, preset });
            }}
          />
        </div>

        {loading ? (
          <div className="an-loading"><div className="an-spinner" /></div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="an-stats-row">
              {displayBadgeStats.map(stat => {
                const colors = BADGE_COLORS[stat.label] || { bg: '#E2E8F0', border: '#94A3B8', text: '#64748B', label: 'Beginner' };
                return (
                  <div key={stat.label} className="an-stat-card">
                    <div className="an-stat-top">
                      <span className="an-stat-label">{stat.label}</span>
                      <div className="an-stat-dot" style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border || colors.text}` }} />
                    </div>
                    <div className="an-stat-count" style={{ color: stat.label === 'WHITE' ? '#0F172A' : colors.text }}>
                      {stat.count}
                    </div>
                    <div className="an-stat-desc">
                      Active: <strong style={{ color: colors.text }}>{colors.label}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Retention Funnel */}
            <div className="an-funnel-card">
              <h2 className="an-funnel-title">Retention Funnel</h2>
              <div className="an-funnel-chart">
                {displayBadgeStats.map(stat => {
                  const widthPct = (stat.count / maxCount) * 100;
                  const colors = BADGE_COLORS[stat.label] || { bg: '#E2E8F0', text: '#64748B', label: 'Beginner' };
                  return (
                    <div key={stat.label} className="an-funnel-row">
                      <span className="an-funnel-label" style={{ minWidth: '160px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{stat.label.charAt(0).toUpperCase() + stat.label.slice(1).toLowerCase()}</span>
                        <span style={{ fontSize: '11px', opacity: 0.65, fontWeight: 500 }}>({colors.label})</span>
                      </span>
                      <div className="an-funnel-bar-container">
                        <div
                          className="an-funnel-bar"
                          style={{
                            width: `${Math.max(widthPct, stat.count > 0 ? 6 : 0)}%`,
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
                                title={earned ? `${badgeLevel} Badge (Earned - ${colors.label})` : `${badgeLevel} Badge (${colors.label})`}
                                style={{
                                  backgroundColor: earned ? (badgeLevel === 'WHITE' ? '#CBD5E1' : colors.bg) : 'transparent',
                                  border: `2px solid ${earned ? (colors.border || colors.text || colors.bg) : '#E2E8F0'}`
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
                        No students found for the selected date filter.
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
          flex-direction: column;
          min-height: 100vh;
          height: auto !important;
          background: #F8F6F2;
          font-family: 'Instrument Sans', sans-serif;
          box-sizing: border-box;
          width: 100%;
          overflow-y: auto !important;
        }
        .an-main {
          flex: 1;
          margin-top: 72px !important;
          min-height: calc(100vh - 72px) !important;
          height: auto !important;
          padding: 32px 40px 120px 40px !important;
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
        .an-funnel-label { width: auto; min-width: 175px; font-size: 12px; font-weight: 700; color: #FFFFFF; opacity: 0.85; flex-shrink: 0; }
        .an-funnel-bar-container { flex: 1; display: flex; align-items: center; gap: 12px; min-width: 0; }
        .an-funnel-bar { height: 26px; border-radius: 4px; transition: width 0.6s ease; min-width: 4px; }
        .an-funnel-value { font-size: 12px; font-weight: 700; color: #FFFFFF; }

        /* Table */
        .an-table-container { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; }
        .an-table { width: 100%; border-collapse: collapse; }
        .an-table th {
          text-align: left; padding: 16px 20px; font-size: 12px; font-weight: 700;
          color: #94A3B8; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; background: #F8F6F2;
        }
        .an-table td { padding: 16px 20px; vertical-align: middle; font-size: 12px; }
        .an-student-name { font-weight: 600; color: #0F172A; }
        .an-instructor-name { color: #0F172A; }
        .an-badge-history { display: flex; gap: 8px; align-items: center; }
        .an-badge-circle { width: 18px; height: 18px; border-radius: 50%; transition: transform 0.2s; cursor: help; box-sizing: border-box; }
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
