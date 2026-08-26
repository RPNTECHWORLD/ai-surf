import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';


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

const statusBg = (s) => {
  if (s === 'Completed') return 'rgba(13, 148, 136, 0.12)';
  if (s === 'IN PROGRESS') return 'rgba(0, 209, 178, 0.15)';
  return 'rgba(245, 158, 11, 0.12)';
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Sessions = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('All');
  const [instructorFilter, setInstructorFilter] = useState('All');
  const [studentFilter, setStudentFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Calendar Modal State
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState('month'); // 'month' | 'ground_ops' | 'week'
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 24)); // Default August 2026
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('24 Aug 2026');
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);

  // User Context for Role-Based Data Isolation
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const isStudent = currentUser?.role === 'athlete';
  const currentStudentName = currentUser?.name || 'Eric Sheldon';

  const fetchSessions = () => {
    setLoading(true);
    fetch(`${API}/api/sessions`)
      .then(r => r.json())
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching sessions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Role-Scoped Base Sessions List
  const roleScopedSessions = useMemo(() => {
    if (!isStudent) return sessions; // Admins, School & Coaches see ALL sessions across students

    // Student Role: Strictly isolate to ONLY sessions belonging to this specific student
    const mySessions = sessions.filter(s => {
      if (s.student && s.student.toLowerCase() === currentStudentName.toLowerCase()) return true;
      if (currentUser?.student_id && s.student_id === currentUser.student_id) return true;
      return false;
    });

    // Fallback: If mock data doesn't match name yet, show sessions matched by name
    return mySessions.length > 0 ? mySessions : sessions.filter(s => s.student === 'Eric Sheldon' || s.student === currentStudentName);
  }, [sessions, currentUser, isStudent, currentStudentName]);

  // Extract unique instructors and students for dropdowns
  const availableInstructors = useMemo(() => {
    const names = new Set(roleScopedSessions.map(s => s.instructor).filter(Boolean));
    return Array.from(names);
  }, [roleScopedSessions]);

  const availableStudents = useMemo(() => {
    const names = new Set(roleScopedSessions.map(s => s.student).filter(Boolean));
    return Array.from(names);
  }, [roleScopedSessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    return roleScopedSessions.filter(s => {
      // Status & Date filter
      if (statusFilter === 'Today') {
        if (s.date !== todayStr) return false;
      } else if (statusFilter !== 'All') {
        if (s.status !== statusFilter) return false;
      }

      // Instructor filter
      if (instructorFilter !== 'All' && s.instructor !== instructorFilter) {
        return false;
      }

      // Student filter (for Admins/Coaches)
      if (studentFilter !== 'All' && s.student !== studentFilter) {
        return false;
      }

      // Condition filter
      if (conditionFilter !== 'All' && s.condition !== conditionFilter) {
        return false;
      }

      // Lesson Type filter
      if (typeFilter !== 'All' && s.type !== typeFilter) {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          (s.student || '').toLowerCase().includes(q) ||
          (s.instructor || '').toLowerCase().includes(q) ||
          (s.location || '').toLowerCase().includes(q) ||
          (s.notes || '').toLowerCase().includes(q) ||
          (s.date || '').toLowerCase().includes(q) ||
          (s.time || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [roleScopedSessions, statusFilter, instructorFilter, studentFilter, conditionFilter, typeFilter, searchQuery]);

  const hasActiveFilters = 
    statusFilter !== 'All' ||
    instructorFilter !== 'All' ||
    studentFilter !== 'All' ||
    conditionFilter !== 'All' ||
    typeFilter !== 'All' ||
    searchQuery.trim() !== '';

  const resetFilters = () => {
    setStatusFilter('All');
    setInstructorFilter('All');
    setStudentFilter('All');
    setConditionFilter('All');
    setTypeFilter('All');
    setSearchQuery('');
  };

  // Derived stats
  const totalSessions = roleScopedSessions.length;
  const avgDuration = totalSessions > 0
    ? Math.round(roleScopedSessions.reduce((sum, s) => sum + (s.duration_mins || 60), 0) / totalSessions)
    : 0;

  const locationCounts = roleScopedSessions.reduce((acc, s) => {
    if (s.location) acc[s.location] = (acc[s.location] || 0) + 1;
    return acc;
  }, {});
  const topSpot = Object.keys(locationCounts).sort((a, b) => locationCounts[b] - locationCounts[a])[0] || '—';

  const conditionCounts = roleScopedSessions.reduce((acc, s) => {
    if (s.condition) acc[s.condition] = (acc[s.condition] || 0) + 1;
    return acc;
  }, {});
  const waveDistrib = ['Hard', 'Moderate', 'Easy'].map(c => ({
    label: c,
    pct: totalSessions > 0 ? Math.round(((conditionCounts[c] || 0) / totalSessions) * 100) : 0,
    color: conditionColor(c),
  }));

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group sessions by date string e.g. "24 Aug 2026"
  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  // Selected date's sessions
  const activeDaySessions = useMemo(() => {
    return sessions.filter(s => s.date === selectedCalendarDate);
  }, [sessions, selectedCalendarDate]);

  return (
    <div className="ses-page">
      <Sidebar />
      <main className="ses-main">
        {/* Header */}
        <header className="ses-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="ses-title">Surf Sessions</h1>
              <span className="ses-live-pill">
                <span className="ses-pulsing-dot"></span> LIVE SCHEDULE
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              Aquatic Indica Ground Operations & Coaching Management Platform
            </p>
          </div>
          <div className="ses-actions">
            <button className="ses-btn-secondary" onClick={() => setShowCalendarModal(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Interactive Calendar & Ground Ops
            </button>
            <button className="ses-btn-primary" onClick={() => navigate('/sessions/new')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Schedule Session
            </button>
          </div>
        </header>

        {/* Search & Filter Bar */}
        <div className="ses-filters-container">
          <div className="ses-filters-top">
            {/* Search Input */}
            <div className="ses-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search student, coach, spot, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ses-search-input"
              />
              {searchQuery && (
                <button className="ses-clear-btn" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>

            {/* Status / Date Filter */}
            <div className="ses-select-wrap">
              <label className="ses-select-label">Status</label>
              <select
                className="ses-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Today">Today's Sessions</option>
                <option value="Upcoming">Upcoming</option>
                <option value="IN PROGRESS">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Instructor Filter */}
            <div className="ses-select-wrap">
              <label className="ses-select-label">Instructor</label>
              <select
                className="ses-select"
                value={instructorFilter}
                onChange={(e) => setInstructorFilter(e.target.value)}
              >
                <option value="All">All Instructors</option>
                {availableInstructors.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Student Filter / Locked Badge */}
            {!isStudent ? (
              <div className="ses-select-wrap">
                <label className="ses-select-label">Student</label>
                <select
                  className="ses-select"
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                >
                  <option value="All">All Students</option>
                  {availableStudents.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="ses-select-wrap">
                <label className="ses-select-label">Student Account</label>
                <div style={{ padding: '8px 14px', borderRadius: '8px', background: '#F1F5F9', color: '#0F172A', fontWeight: 800, fontSize: '13px', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>👤</span> {currentStudentName}
                </div>
              </div>
            )}

            {/* Condition Filter */}
            <div className="ses-select-wrap">
              <label className="ses-select-label">Conditions</label>
              <select
                className="ses-select"
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
              >
                <option value="All">All Conditions</option>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Lesson Type Filter */}
            <div className="ses-select-wrap">
              <label className="ses-select-label">Lesson Type</label>
              <select
                className="ses-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Master">Master</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button className="ses-reset-btn" onClick={resetFilters} title="Reset all filters">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                Reset
              </button>
            )}
          </div>

          <div className="ses-filter-summary">
            <span>
              Showing <strong>{filteredSessions.length}</strong> of <strong>{totalSessions}</strong> sessions
            </span>
            {hasActiveFilters && (
              <span className="ses-filter-active-pill">
                Active Filter Applied
              </span>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="ses-layout">
          {/* Main Column: Sessions Table */}
          <div className="ses-table-container">
            {loading ? (
              <div className="ses-loading">
                <div className="ses-spinner" />
                <span style={{ color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Loading sessions from AWS Cloud...</span>
              </div>
            ) : (
              <table className="ses-table">
                <thead>
                  <tr>
                    <th style={{ width: '170px' }}>DATE & TIME</th>
                    <th style={{ width: '160px' }}>STUDENT</th>
                    <th style={{ width: '160px' }}>INSTRUCTOR</th>
                    <th>LOCATION</th>
                    <th>CONDITIONS</th>
                    <th>TYPE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session, i) => (
                    <tr key={session.id} className="ses-table-row" style={{ borderBottom: i === filteredSessions.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                      <td>
                        <div className="ses-td-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          {session.date}
                        </div>
                        <div className="ses-td-secondary">{session.time} · {session.duration_mins || 60} mins</div>
                      </td>
                      <td>
                        <div className="ses-td-primary" style={{ fontWeight: 600 }}>{session.student || '—'}</div>
                      </td>
                      <td>
                        <div className="ses-td-primary" style={{ color: '#0F766E' }}>{session.instructor || '—'}</div>
                      </td>
                      <td>
                        <div className="ses-td-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          {session.location || 'Aquatic Indica Spot'}
                        </div>
                        {session.notes && (
                          <div className="ses-td-secondary" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={session.notes}>
                            {session.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className="ses-badge-cond"
                          style={{
                            backgroundColor: `${conditionColor(session.condition)}18`,
                            color: conditionColor(session.condition),
                            border: `1px solid ${conditionColor(session.condition)}40`
                          }}
                        >
                          {session.condition || 'Moderate'}
                        </span>
                      </td>
                      <td>
                        <span className="ses-badge-type">{session.type || 'Beginner'}</span>
                      </td>
                      <td>
                        <span
                          className="ses-status-pill"
                          style={{
                            backgroundColor: statusBg(session.status),
                            color: statusColor(session.status)
                          }}
                        >
                          <span className="ses-status-dot" style={{ backgroundColor: statusColor(session.status) }}></span>
                          {session.status || 'Upcoming'}
                        </span>
                      </td>
                      <td>
                        <div className="ses-actions-row">
                          <button
                            className="ses-icon-btn"
                            title="Edit Session"
                            onClick={() => navigate(`/sessions/${session.id}/edit`)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="ses-btn-view-analysis"
                            title="View Video Analysis"
                            onClick={() => {
                              const videoParam = session.video_url ? `&video=${encodeURIComponent(session.video_url)}` : '';
                              navigate(`/analysis?student=${encodeURIComponent(session.student || '')}&date=${encodeURIComponent(session.date || '')}${videoParam}`);
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Analysis
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSessions.length === 0 && !loading && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏄‍♂️</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                          No sessions match your filter criteria
                        </div>
                        <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
                          Try clearing filters or schedule a new session for this time slot.
                        </p>
                        {hasActiveFilters ? (
                          <button className="ses-btn-secondary" style={{ margin: '0 auto' }} onClick={resetFilters}>
                            Clear Filters
                          </button>
                        ) : (
                          <button className="ses-btn-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/sessions/new')}>
                            + Schedule First Session
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Right Column: Insights */}
          <div className="ses-sidebar">
            <h2 className="ses-insights-title">Monthly Insights</h2>

            <div className="ses-stat-card">
              <div className="ses-stat-header">
                <span className="ses-stat-label">Total Sessions</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <div className="ses-stat-value">{loading ? '…' : totalSessions}</div>
            </div>

            <div className="ses-stat-card">
              <div className="ses-stat-header">
                <span className="ses-stat-label">Avg. Duration</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div className="ses-stat-value">{loading ? '…' : `${avgDuration} mins`}</div>
            </div>

            <div className="ses-stat-card">
              <div className="ses-stat-header">
                <span className="ses-stat-label">Top Spot</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <div className="ses-stat-value" style={{ fontSize: '20px' }}>{loading ? '…' : topSpot}</div>
            </div>

            <div className="ses-wave-card">
              <h3 className="ses-wave-title">Wave Distribution</h3>
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

        {/* Enhanced Pro Calendar & Ground Ops Modal */}
        {showCalendarModal && (
          <div className="ses-modal-overlay" onClick={() => { setShowCalendarModal(false); setSelectedSessionDetail(null); }}>
            <div className="ses-modal-box" onClick={(e) => e.stopPropagation()}>
              {/* Modal Topbar */}
              <div className="ses-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="ses-modal-icon-badge">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '20px', fontFamily: 'Outfit, sans-serif', color: '#050B1A', fontWeight: 700 }}>
                        Sessions Hub & Ground Operations
                      </h2>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                        Visual calendar, coach allocations & daily student attendance
                      </p>
                    </div>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="ses-modal-tabs">
                    <button
                      className={`ses-modal-tab ${calendarViewMode === 'month' ? 'active' : ''}`}
                      onClick={() => setCalendarViewMode('month')}
                    >
                      📅 Month Grid
                    </button>
                    <button
                      className={`ses-modal-tab ${calendarViewMode === 'ground_ops' ? 'active' : ''}`}
                      onClick={() => setCalendarViewMode('ground_ops')}
                    >
                      🏄‍♂️ Daily Ground Sheet
                    </button>
                    <button
                      className={`ses-modal-tab ${calendarViewMode === 'week' ? 'active' : ''}`}
                      onClick={() => setCalendarViewMode('week')}
                    >
                      ⏱️ Timeline View
                    </button>
                  </div>
                </div>

                <button className="ses-modal-close" onClick={() => { setShowCalendarModal(false); setSelectedSessionDetail(null); }}>✕</button>
              </div>

              {/* Modal Body */}
              <div className="ses-modal-content-scroll">
                
                {/* 1. MONTHLY INTERACTIVE CALENDAR VIEW */}
                {calendarViewMode === 'month' && (
                  <div className="ses-cal-month-view">
                    {/* Month Navigator Header */}
                    <div className="ses-cal-nav-bar">
                      <div className="ses-cal-month-title">
                        {MONTH_NAMES[month]} {year}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="ses-cal-nav-btn" onClick={handlePrevMonth}>‹ Prev</button>
                        <button className="ses-cal-nav-btn" onClick={() => setCurrentDate(new Date(2026, 7, 24))}>Today</button>
                        <button className="ses-cal-nav-btn" onClick={handleNextMonth}>Next ›</button>
                      </div>
                    </div>

                    {/* Weekday Names Header */}
                    <div className="ses-cal-grid-header">
                      {DAYS_OF_WEEK.map(d => (
                        <div key={d} className="ses-cal-grid-th">{d}</div>
                      ))}
                    </div>

                    {/* Days Matrix */}
                    <div className="ses-cal-days-grid">
                      {/* Blank pads for start of month */}
                      {Array.from({ length: firstDayIndex }).map((_, i) => (
                        <div key={`pad-${i}`} className="ses-cal-day-cell empty"></div>
                      ))}

                      {/* Day cells */}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dayStr = `${String(dayNum).padStart(2, '0')} ${MONTH_NAMES[month].substring(0, 3)} ${year}`;
                        const daySessions = sessionsByDate[dayStr] || [];
                        const isSelected = selectedCalendarDate === dayStr;
                        const isToday = dayNum === 24 && month === 7 && year === 2026;

                        return (
                          <div
                            key={dayNum}
                            className={`ses-cal-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => {
                              setSelectedCalendarDate(dayStr);
                            }}
                          >
                            <div className="ses-cal-day-num">
                              <span className={isToday ? 'ses-cal-today-badge' : ''}>{dayNum}</span>
                              {daySessions.length > 0 && (
                                <span className="ses-cal-session-count-badge">
                                  {daySessions.length} {daySessions.length === 1 ? 'slot' : 'slots'}
                                </span>
                              )}
                            </div>

                            {/* Session Pills Inside Day */}
                            <div className="ses-cal-day-events">
                              {daySessions.slice(0, 3).map(s => (
                                <div
                                  key={s.id}
                                  className="ses-cal-event-pill"
                                  style={{
                                    borderLeftColor: statusColor(s.status),
                                    backgroundColor: statusBg(s.status)
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSessionDetail(s);
                                  }}
                                  title={`${s.time} · ${s.student} with Coach ${s.instructor}`}
                                >
                                  <strong style={{ color: '#0F172A' }}>{s.time}</strong> {s.student}
                                </div>
                              ))}
                              {daySessions.length > 3 && (
                                <div className="ses-cal-more-events">
                                  +{daySessions.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Day Expanded Drawer */}
                    {selectedCalendarDate && (
                      <div className="ses-cal-day-drawer">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'Outfit, sans-serif', color: '#050B1A' }}>
                            📅 Roster for <strong style={{ color: '#0D9488' }}>{selectedCalendarDate}</strong> ({activeDaySessions.length} Scheduled)
                          </h3>
                          <button
                            className="ses-btn-primary"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => navigate('/sessions/new')}
                          >
                            + Schedule Slot
                          </button>
                        </div>

                        <div className="ses-cal-drawer-cards">
                          {activeDaySessions.map(s => (
                            <div key={s.id} className="ses-cal-drawer-item" onClick={() => setSelectedSessionDetail(s)}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{s.student}</div>
                                  <div style={{ fontSize: '12px', color: '#64748B' }}>Coach: <strong style={{ color: '#0F766E' }}>{s.instructor}</strong></div>
                                </div>
                                <span className="ses-status-pill" style={{ backgroundColor: statusBg(s.status), color: statusColor(s.status), padding: '2px 8px', fontSize: '10px' }}>
                                  {s.status}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: '#64748B' }}>
                                <span>⏰ {s.time} ({s.duration_mins}m)</span>
                                <span>🌊 {s.location}</span>
                              </div>
                            </div>
                          ))}
                          {activeDaySessions.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                              No surf lessons scheduled on this date. Click "+ Schedule Slot" to book one!
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. DAILY GROUND OPERATIONS / ATTENDANCE SHEET */}
                {calendarViewMode === 'ground_ops' && (
                  <div className="ses-ground-ops-view">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#F8FAFC', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Ground Date:</span>
                        <strong style={{ fontSize: '15px', color: '#0F172A', marginLeft: '8px' }}>24 Aug 2026 (Today)</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span className="ses-badge-type" style={{ background: '#CCFBF1', color: '#0F766E' }}>
                          🌊 Conditions: 4-6ft Peeling Clean
                        </span>
                        <span className="ses-badge-type" style={{ background: '#E0E7FF', color: '#4338CA' }}>
                          🏄‍♂️ Active Coaches: 4 on Duty
                        </span>
                      </div>
                    </div>

                    <table className="ses-table" style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                      <thead>
                        <tr>
                          <th>SLOT / TIME</th>
                          <th>STUDENT NAME</th>
                          <th>ASSIGNED COACH</th>
                          <th>COURSE & GUESTS</th>
                          <th>BEACH SPOT</th>
                          <th>STATUS</th>
                          <th style={{ textAlign: 'right' }}>QUICK ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(s => (
                          <tr key={s.id} className="ses-table-row">
                            <td>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>{s.time}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{s.date}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>{s.student}</div>
                              <span className="ses-badge-type" style={{ fontSize: '10px', padding: '2px 6px' }}>{s.type}</span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0F766E' }}>{s.instructor}</div>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>ISA Certified</span>
                            </td>
                            <td>
                              <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>3 Days Course</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>Solo / Group</div>
                            </td>
                            <td>
                              <div style={{ fontSize: '13px', color: '#0F172A' }}>{s.location}</div>
                              <span style={{ fontSize: '10px', color: conditionColor(s.condition), fontWeight: 700 }}>{s.condition}</span>
                            </td>
                            <td>
                              <span className="ses-status-pill" style={{ backgroundColor: statusBg(s.status), color: statusColor(s.status) }}>
                                {s.status}
                              </span>
                            </td>
                            <td>
                              <div className="ses-actions-row">
                                <a
                                  href={`https://wa.me/919876543210?text=Hi%20${encodeURIComponent(s.student)}!%20Your%20Aquatic%20Indica%20Surf%20Session%20with%20Coach%20${encodeURIComponent(s.instructor)}%20is%20at%20${encodeURIComponent(s.time)}%20at%20${encodeURIComponent(s.location)}.%20See%20you%20in%20the%20water!`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ses-whatsapp-quick-btn"
                                  title="Send WhatsApp Reminder"
                                >
                                  💬 WhatsApp
                                </a>
                                <button
                                  className="ses-btn-view-analysis"
                                  style={{ padding: '4px 10px', fontSize: '11px' }}
                                  onClick={() => {
                                    const videoParam = s.video_url ? `&video=${encodeURIComponent(s.video_url)}` : '';
                                    navigate(`/analysis?student=${encodeURIComponent(s.student || '')}&date=${encodeURIComponent(s.date || '')}${videoParam}`);
                                  }}
                                >
                                  Analysis
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. TIMELINE VIEW */}
                {calendarViewMode === 'week' && (
                  <div className="ses-timeline-view">
                    <div className="ses-timeline-grid">
                      {['06:00 AM (Dawn Patrol)', '08:00 AM (Morning)', '09:30 AM (Mid-Day)', '02:00 PM (Afternoon)', '04:00 PM (Sunset Session)'].map(slot => {
                        const slotSessions = sessions.filter(s => s.time && s.time.includes(slot.substring(0, 5)));
                        return (
                          <div key={slot} className="ses-timeline-row">
                            <div className="ses-timeline-time-label">
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{slot}</span>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>{slotSessions.length} sessions booked</span>
                            </div>
                            <div className="ses-timeline-cards-flex">
                              {slotSessions.map(s => (
                                <div key={s.id} className="ses-timeline-card" onClick={() => setSelectedSessionDetail(s)}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '14px', color: '#0F172A' }}>{s.student}</strong>
                                    <span className="ses-status-pill" style={{ backgroundColor: statusBg(s.status), color: statusColor(s.status), fontSize: '10px', padding: '2px 6px' }}>
                                      {s.status}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#0F766E', margin: '4px 0' }}>
                                    🏄‍♂️ Coach: {s.instructor}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                                    📍 {s.location} · {s.condition}
                                  </div>
                                </div>
                              ))}
                              {slotSessions.length === 0 && (
                                <div className="ses-timeline-empty-slot" onClick={() => navigate('/sessions/new')}>
                                  + Available Slot (Click to Book)
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Single Session Detail Popup (When clicked) */}
              {selectedSessionDetail && (
                <div className="ses-detail-popup-overlay" onClick={() => setSelectedSessionDetail(null)}>
                  <div className="ses-detail-popup" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🏄‍♂️</span>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#050B1A', fontFamily: 'Outfit, sans-serif' }}>
                          Session Details
                        </h3>
                      </div>
                      <button className="ses-modal-close" style={{ width: '28px', height: '28px', fontSize: '12px' }} onClick={() => setSelectedSessionDetail(null)}>✕</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Student</span>
                        <span className="ses-detail-val" style={{ fontWeight: 700, color: '#0F172A' }}>{selectedSessionDetail.student}</span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Instructor / Coach</span>
                        <span className="ses-detail-val" style={{ color: '#0F766E', fontWeight: 600 }}>{selectedSessionDetail.instructor}</span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Date & Time</span>
                        <span className="ses-detail-val">{selectedSessionDetail.date} at {selectedSessionDetail.time} ({selectedSessionDetail.duration_mins}m)</span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Surf Spot</span>
                        <span className="ses-detail-val">🌊 {selectedSessionDetail.location}</span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Ocean Conditions</span>
                        <span className="ses-badge-cond" style={{ backgroundColor: `${conditionColor(selectedSessionDetail.condition)}18`, color: conditionColor(selectedSessionDetail.condition) }}>
                          {selectedSessionDetail.condition}
                        </span>
                      </div>
                      <div className="ses-detail-row">
                        <span className="ses-detail-label">Status</span>
                        <span className="ses-status-pill" style={{ backgroundColor: statusBg(selectedSessionDetail.status), color: statusColor(selectedSessionDetail.status) }}>
                          {selectedSessionDetail.status}
                        </span>
                      </div>
                      {selectedSessionDetail.notes && (
                        <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Coach Notes:</span>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#334155' }}>{selectedSessionDetail.notes}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <button
                        className="ses-btn-primary"
                        style={{ flex: 1, padding: '10px' }}
                        onClick={() => {
                          const videoParam = selectedSessionDetail.video_url ? `&video=${encodeURIComponent(selectedSessionDetail.video_url)}` : '';
                          navigate(`/analysis?student=${encodeURIComponent(selectedSessionDetail.student || '')}&date=${encodeURIComponent(selectedSessionDetail.date || '')}${videoParam}`);
                        }}
                      >
                        Launch AI Video Analysis
                      </button>
                      <button
                        className="ses-btn-secondary"
                        onClick={() => navigate(`/sessions/${selectedSessionDetail.id}/edit`)}
                      >
                        Edit Slot
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>

      <style>{`
        .ses-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .ses-main { flex: 1; padding: 32px 40px; display: flex; flex-direction: column; gap: 24px; overflow-y: auto; }

        /* Header */
        .ses-header { display: flex; justify-content: space-between; align-items: center; }
        .ses-title { font-family: 'Outfit', sans-serif; font-size: 30px; font-weight: 700; color: #050B1A; margin: 0; }
        .ses-live-pill {
          display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px;
          background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3);
          border-radius: 20px; font-size: 11px; font-weight: 700; color: #0D9488; letter-spacing: 0.5px;
        }
        .ses-pulsing-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #0D9488;
          box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.7); animation: ses-pulse 1.8s infinite;
        }
        @keyframes ses-pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(13, 148, 136, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(13, 148, 136, 0); }
        }

        .ses-actions { display: flex; gap: 12px; }
        .ses-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
          background: #FFFFFF; border: 1.5px solid #CBD5E1; border-radius: 10px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #0F172A; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .ses-btn-secondary:hover { background: #F1F5F9; border-color: #94A3B8; }
        
        .ses-btn-primary {
          display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
          background: #F43F5E; border: none; border-radius: 10px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25);
        }
        .ses-btn-primary:hover { background: #E11D48; transform: translateY(-1px); }

        /* Filters Container */
        .ses-filters-container {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px 20px;
          display: flex; flex-direction: column; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }
        .ses-filters-top {
          display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;
        }

        .ses-search-box {
          display: flex; align-items: center; gap: 8px; padding: 0 14px; height: 42px;
          background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 8px;
          flex: 1; min-width: 220px; transition: border-color 0.2s;
        }
        .ses-search-box:focus-within { border-color: #0D9488; background: #FFFFFF; }
        .ses-search-input {
          border: none; outline: none; background: transparent; width: 100%; font-size: 14px; color: #0F172A;
        }
        .ses-clear-btn {
          border: none; background: #CBD5E1; color: #475569; width: 18px; height: 18px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 12px; cursor: pointer;
        }

        .ses-select-wrap {
          display: flex; flex-direction: column; gap: 4px; min-width: 140px;
        }
        .ses-select-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;
        }
        .ses-select {
          height: 42px; padding: 0 12px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 13px; font-weight: 600; color: #0F172A; cursor: pointer; outline: none; transition: border-color 0.2s;
        }
        .ses-select:focus { border-color: #0D9488; background: #FFFFFF; }

        .ses-reset-btn {
          display: flex; align-items: center; gap: 6px; height: 42px; padding: 0 14px;
          background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px;
          color: #DC2626; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .ses-reset-btn:hover { background: #FCA5A5; color: #991B1B; }

        .ses-filter-summary {
          display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748B;
          padding-top: 8px; border-top: 1px solid #F1F5F9;
        }
        .ses-filter-active-pill {
          background: #CCFBF1; color: #0F766E; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 12px;
        }

        /* Layout */
        .ses-layout { display: flex; gap: 28px; }
        
        .ses-table-container {
          flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; 
          overflow-y: auto; max-height: calc(100vh - 280px); box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }
        .ses-table { width: 100%; border-collapse: collapse; text-align: left; }
        .ses-table th {
          padding: 16px 20px; font-size: 12px; font-weight: 700;
          color: rgba(255, 255, 255, 0.7); text-transform: uppercase; background: #050B1A;
          position: sticky; top: 0; z-index: 1; letter-spacing: 0.5px;
        }
        .ses-table td { padding: 18px 20px; vertical-align: middle; }
        .ses-table-row:hover { background-color: #F8FAFC; }
        .ses-td-primary { font-size: 14px; font-weight: 600; color: #050B1A; line-height: 1.4; }
        .ses-td-secondary { font-size: 12px; color: #64748B; line-height: 1.4; margin-top: 2px; }
        
        .ses-badge-cond {
          display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;
        }
        .ses-badge-type {
          display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;
          background: rgba(100, 116, 139, 0.12); color: #475569;
        }
        .ses-status-pill {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px;
          font-size: 12px; font-weight: 700; text-transform: uppercase;
        }
        .ses-status-dot {
          width: 6px; height: 6px; border-radius: 50%;
        }

        .ses-actions-row { display: flex; gap: 10px; justify-content: flex-end; align-items: center; }
        .ses-icon-btn {
          width: 32px; height: 32px; border-radius: 6px; border: 1px solid #E2E8F0;
          background: #FFFFFF; color: #64748B; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .ses-icon-btn:hover { background: #F1F5F9; color: #0F172A; border-color: #CBD5E1; }
        
        .ses-btn-view-analysis {
          display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px;
          background: #0D9488; border: none; border-radius: 6px;
          font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; color: #FFFFFF;
          cursor: pointer; transition: all 0.2s;
        }
        .ses-btn-view-analysis:hover { background: #0F766E; transform: translateY(-1px); }

        .ses-whatsapp-quick-btn {
          display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
          background: #25D366; color: #FFFFFF; font-size: 11px; font-weight: 700;
          border-radius: 6px; text-decoration: none; transition: all 0.2s;
        }
        .ses-whatsapp-quick-btn:hover { background: #1EBE5B; transform: translateY(-1px); }

        /* Right Sidebar */
        .ses-sidebar { display: flex; flex-direction: column; gap: 20px; width: 300px; flex-shrink: 0; }
        .ses-insights-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #050B1A; margin: 0; }
        
        .ses-stat-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px;
          display: flex; flex-direction: column; gap: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }
        .ses-stat-header { display: flex; justify-content: space-between; align-items: center; }
        .ses-stat-label { font-size: 13px; color: #64748B; font-weight: 500; }
        .ses-stat-value { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 700; color: #050B1A; line-height: 1.2; }

        .ses-wave-card {
          background: #050B1A; border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 16px;
        }
        .ses-wave-title { font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.6); margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .ses-wave-row { display: flex; flex-direction: column; gap: 8px; }
        .ses-wave-header { display: flex; justify-content: space-between; font-size: 12px; color: #FFFFFF; }
        .ses-wave-pct { opacity: 0.6; }
        .ses-wave-bar-bg { height: 6px; background: rgba(255, 255, 255, 0.12); border-radius: 3px; overflow: hidden; }
        .ses-wave-bar { height: 100%; border-radius: 3px; transition: width 0.6s ease; }

        /* Calendar & Ground Ops Modal */
        .ses-modal-overlay {
          position: fixed; inset: 0; background: rgba(5, 11, 26, 0.8); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px;
        }
        .ses-modal-box {
          background: #FFFFFF; border-radius: 20px; max-width: 1100px; width: 100%; max-height: 90vh;
          display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .ses-modal-header {
          display: flex; justify-content: space-between; align-items: center; padding: 20px 28px;
          border-bottom: 1px solid #E2E8F0; background: #FFFFFF;
        }
        .ses-modal-icon-badge {
          width: 44px; height: 44px; border-radius: 12px; background: #CCFBF1;
          display: flex; align-items: center; justify-content: center;
        }
        .ses-modal-tabs {
          display: flex; gap: 6px; background: #F1F5F9; padding: 4px; border-radius: 10px; margin-left: 20px;
        }
        .ses-modal-tab {
          padding: 6px 14px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
          color: #64748B; background: transparent; cursor: pointer; transition: all 0.2s;
        }
        .ses-modal-tab.active {
          background: #FFFFFF; color: #0F172A; box-shadow: 0 2px 4px rgba(0,0,0,0.06);
        }
        .ses-modal-close {
          background: #F1F5F9; border: none; width: 34px; height: 34px; border-radius: 50%;
          font-size: 15px; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s;
        }
        .ses-modal-close:hover { background: #E2E8F0; color: #0F172A; }

        .ses-modal-content-scroll {
          padding: 24px 28px; overflow-y: auto; flex: 1;
        }

        /* Month View */
        .ses-cal-nav-bar {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
        }
        .ses-cal-month-title {
          font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700; color: #050B1A;
        }
        .ses-cal-nav-btn {
          padding: 6px 14px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; transition: all 0.2s;
        }
        .ses-cal-nav-btn:hover { background: #E2E8F0; }

        .ses-cal-grid-header {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 8px; text-align: center;
        }
        .ses-cal-grid-th {
          font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; padding: 6px 0;
        }

        .ses-cal-days-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;
        }
        .ses-cal-day-cell {
          min-height: 90px; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 10px;
          padding: 8px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; transition: all 0.2s;
        }
        .ses-cal-day-cell:hover { border-color: #0D9488; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.04); }
        .ses-cal-day-cell.selected { border-color: #0D9488; background: rgba(13, 148, 136, 0.03); }
        .ses-cal-day-cell.today { border-color: #F43F5E; }
        .ses-cal-day-cell.empty { background: transparent; border-color: transparent; cursor: default; }

        .ses-cal-day-num {
          display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; color: #0F172A;
        }
        .ses-cal-today-badge {
          background: #F43F5E; color: #FFFFFF; padding: 2px 6px; border-radius: 6px; font-size: 11px;
        }
        .ses-cal-session-count-badge {
          background: #0D9488; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px;
        }

        .ses-cal-day-events { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
        .ses-cal-event-pill {
          font-size: 11px; padding: 3px 6px; border-radius: 4px; border-left: 3px solid #0D9488;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #334155;
        }
        .ses-cal-more-events { font-size: 10px; color: #64748B; font-weight: 600; text-align: center; }

        .ses-cal-day-drawer {
          margin-top: 20px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 18px;
        }
        .ses-cal-drawer-cards {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;
        }
        .ses-cal-drawer-item {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;
          cursor: pointer; transition: all 0.2s;
        }
        .ses-cal-drawer-item:hover { border-color: #0D9488; box-shadow: 0 4px 8px rgba(0,0,0,0.04); }

        /* Timeline View */
        .ses-timeline-grid { display: flex; flex-direction: column; gap: 14px; }
        .ses-timeline-row {
          background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px;
          display: flex; gap: 20px; align-items: center;
        }
        .ses-timeline-time-label { width: 180px; flex-shrink: 0; display: flex; flex-direction: column; }
        .ses-timeline-cards-flex { display: flex; gap: 12px; flex: 1; flex-wrap: wrap; }
        .ses-timeline-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;
          min-width: 220px; cursor: pointer; transition: all 0.2s;
        }
        .ses-timeline-card:hover { border-color: #0D9488; transform: translateY(-1px); }
        .ses-timeline-empty-slot {
          padding: 10px 16px; border: 1.5px dashed #CBD5E1; border-radius: 8px; font-size: 12px;
          font-weight: 600; color: #64748B; cursor: pointer; transition: all 0.2s;
        }
        .ses-timeline-empty-slot:hover { border-color: #0D9488; color: #0D9488; background: #CCFBF1; }

        /* Detail Popup */
        .ses-detail-popup-overlay {
          position: fixed; inset: 0; background: rgba(5, 11, 26, 0.5); backdrop-filter: blur(2px);
          display: flex; align-items: center; justify-content: center; z-index: 1100;
        }
        .ses-detail-popup {
          background: #FFFFFF; border-radius: 16px; max-width: 480px; width: 90%; padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        }
        .ses-detail-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0; border-bottom: 1px solid #F1F5F9;
        }
        .ses-detail-label { color: #64748B; font-size: 13px; }
        .ses-detail-val { font-size: 14px; }

        .ses-loading { display: flex; flex-direction: column; gap: 12px; justify-content: center; align-items: center; height: 260px; }
        .ses-spinner {
          width: 38px; height: 38px;
          border: 3.5px solid rgba(13, 148, 136, 0.2); border-top-color: #0D9488;
          border-radius: 50%; animation: ses-spin 0.7s linear infinite;
        }
        @keyframes ses-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Sessions;
