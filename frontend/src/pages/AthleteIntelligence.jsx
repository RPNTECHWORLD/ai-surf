import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

// Date normalization helper (handles YYYY-MM-DD, DD-MM-YYYY, "25 Sep 2026", "01 Aug 2026", etc.)
const normalizeDateStr = (dateVal) => {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  const ymd = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const dmy = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
};

const formatDateForDisplay = (isoStr) => {
  if (!isoStr) return '';
  const parts = String(isoStr).split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return isoStr;
};

const formatLongDate = (isoStr) => {
  if (!isoStr) return '';
  const parts = String(isoStr).split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }
  return isoStr;
};

const getTodayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const AthleteIntelligence = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL'); // 'ALL', 'Beginner', 'Intermediate', 'Advanced', 'Master'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'nutrition', 'sc', 'technical', 'mental'

  // Interactive Calendar & Date Filter States
  const [selectedDashboardDate, setSelectedDashboardDate] = useState(getTodayISO());
  const [logDateInput, setLogDateInput] = useState(getTodayISO());
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());

  // Summary Metrics (All-time from server)
  const [summary, setSummary] = useState({
    nutrition: { avg_calories: 0, avg_hydration: 0, log_count: 0 },
    sc: { avg_sleep: 0, avg_recovery: 0, log_count: 0 },
    technical: { total_waves: 0, log_count: 0 },
    mental: { avg_anxiety: 0, avg_focus: 0, log_count: 0 }
  });

  // Recent Logs Lists
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [scLogs, setScLogs] = useState([]);
  const [technicalLogs, setTechnicalLogs] = useState([]);
  const [mentalLogs, setMentalLogs] = useState([]);

  // Logging Form States
  const [nutritionForm, setNutritionForm] = useState({
    calories: 2200,
    hydration_liters: 2.5,
    protein_g: 120,
    carbs_g: 250,
    fats_g: 65,
    meal_timing: ''
  });

  const [scForm, setScForm] = useState({
    workout_details: '',
    mobility_notes: '',
    sleep_score: 80,
    recovery_score: 80,
    injury_notes: ''
  });

  const [technicalForm, setTechnicalForm] = useState({
    session_notes: '',
    wave_count: 10,
    board_setup: '',
    wave_type: '',
    video_url: ''
  });

  const [mentalForm, setMentalForm] = useState({
    pre_heat_anxiety: 5,
    focus_level: 5,
    reflection_notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create a temporary Blob URL in the browser tab's memory cache
    const cachedUrl = URL.createObjectURL(file);
    setTechnicalForm(prev => ({ ...prev, video_url: cachedUrl }));
    showToast('Video cached in browser memory for testing!');
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setCurrentUser(u);

        // If user is athlete, lock to their student ID
        if (u.role === 'athlete' && u.student_id) {
          setSelectedStudentId(u.student_id.toString());
        }
      } catch (e) { }
    }

    // Fetch student list if coach or admin
    fetch(`${API}/api/students`)
      .then(res => res.json())
      .then(data => {
        setStudents(data);
        // Default select first student if role is coach/admin
        const savedUser = JSON.parse(sessionStorage.getItem('user'));
        if (savedUser && savedUser.role !== 'athlete' && data.length > 0) {
          setSelectedStudentId(data[0].id.toString());
        }
      })
      .catch(() => { });
  }, []);

  const fetchStudentData = (studentId) => {
    if (!studentId) return;

    // Fetch logs summary
    fetch(`${API}/api/students/${studentId}/logs/summary`)
      .then(res => res.json())
      .then(setSummary)
      .catch(() => { });

    // Fetch lists
    fetch(`${API}/api/students/${studentId}/logs/nutrition`).then(res => res.json()).then(setNutritionLogs).catch(() => { });
    fetch(`${API}/api/students/${studentId}/logs/sc`).then(res => res.json()).then(setScLogs).catch(() => { });
    fetch(`${API}/api/students/${studentId}/logs/technical`).then(res => res.json()).then(setTechnicalLogs).catch(() => { });
    fetch(`${API}/api/students/${studentId}/logs/mental`).then(res => res.json()).then(setMentalLogs).catch(() => { });
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentData(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Calculate student counts per skill level
  const levelCounts = useMemo(() => {
    const counts = { ALL: students.length, Beginner: 0, Intermediate: 0, Advanced: 0, Master: 0 };
    students.forEach(s => {
      const lvl = (s.level || 'Beginner').trim();
      const match = ['Beginner', 'Intermediate', 'Advanced', 'Master'].find(k => k.toLowerCase() === lvl.toLowerCase());
      if (match) {
        counts[match]++;
      } else {
        counts.Beginner++;
      }
    });
    return counts;
  }, [students]);

  // Filter students by skill level
  const filteredStudents = useMemo(() => {
    if (levelFilter === 'ALL') return students;
    return students.filter(s => (s.level || 'Beginner').toLowerCase() === levelFilter.toLowerCase());
  }, [students, levelFilter]);

  const handleLevelFilterChange = (lvl) => {
    setLevelFilter(lvl);
    const subset = lvl === 'ALL'
      ? students
      : students.filter(s => (s.level || 'Beginner').toLowerCase() === lvl.toLowerCase());
    
    if (subset.length > 0) {
      const stillInSubset = subset.some(s => s.id.toString() === selectedStudentId);
      if (!stillInSubset) {
        setSelectedStudentId(subset[0].id.toString());
      }
    } else {
      setSelectedStudentId('');
    }
  };

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Group all logs by ISO date string for calendar lookup & badges
  const logsByDateMap = useMemo(() => {
    const map = {};
    const ensure = (iso) => {
      if (!map[iso]) {
        map[iso] = { nutrition: [], sc: [], technical: [], mental: [], count: 0 };
      }
      return map[iso];
    };
    nutritionLogs.forEach(l => {
      const iso = normalizeDateStr(l.date);
      if (iso) {
        const item = ensure(iso);
        item.nutrition.push(l);
        item.count++;
      }
    });
    scLogs.forEach(l => {
      const iso = normalizeDateStr(l.date);
      if (iso) {
        const item = ensure(iso);
        item.sc.push(l);
        item.count++;
      }
    });
    technicalLogs.forEach(l => {
      const iso = normalizeDateStr(l.date);
      if (iso) {
        const item = ensure(iso);
        item.technical.push(l);
        item.count++;
      }
    });
    mentalLogs.forEach(l => {
      const iso = normalizeDateStr(l.date);
      if (iso) {
        const item = ensure(iso);
        item.mental.push(l);
        item.count++;
      }
    });
    return map;
  }, [nutritionLogs, scLogs, technicalLogs, mentalLogs]);

  // Set of all dates that have any log entries
  const allLoggedDatesSet = useMemo(() => {
    return new Set(Object.keys(logsByDateMap));
  }, [logsByDateMap]);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const calYear = currentCalendarDate.getFullYear();
  const calMonth = currentCalendarDate.getMonth();
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfMonth = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;

  // Filter logs by selected date (or all if 'ALL' is selected)
  const selectedDateISO = selectedDashboardDate === 'ALL' ? null : normalizeDateStr(selectedDashboardDate);

  const filteredNutritionLogs = useMemo(() => {
    if (!selectedDateISO) return nutritionLogs;
    return nutritionLogs.filter(l => normalizeDateStr(l.date) === selectedDateISO);
  }, [nutritionLogs, selectedDateISO]);

  const filteredScLogs = useMemo(() => {
    if (!selectedDateISO) return scLogs;
    return scLogs.filter(l => normalizeDateStr(l.date) === selectedDateISO);
  }, [scLogs, selectedDateISO]);

  const filteredTechnicalLogs = useMemo(() => {
    if (!selectedDateISO) return technicalLogs;
    return technicalLogs.filter(l => normalizeDateStr(l.date) === selectedDateISO);
  }, [technicalLogs, selectedDateISO]);

  const filteredMentalLogs = useMemo(() => {
    if (!selectedDateISO) return mentalLogs;
    return mentalLogs.filter(l => normalizeDateStr(l.date) === selectedDateISO);
  }, [mentalLogs, selectedDateISO]);

  // Date-Specific or All-Time Metrics
  const activeMetrics = useMemo(() => {
    if (!selectedDateISO) return summary;

    const nutCals = filteredNutritionLogs.reduce((acc, l) => acc + (l.calories || 0), 0);
    const nutHyd = filteredNutritionLogs.reduce((acc, l) => acc + (l.hydration_liters || 0), 0);
    const avgSleep = filteredScLogs.length > 0 ? Math.round(filteredScLogs.reduce((acc, l) => acc + (l.sleep_score || 0), 0) / filteredScLogs.length) : 0;
    const avgRecovery = filteredScLogs.length > 0 ? Math.round(filteredScLogs.reduce((acc, l) => acc + (l.recovery_score || 0), 0) / filteredScLogs.length) : 0;
    const totalWaves = filteredTechnicalLogs.reduce((acc, l) => acc + (l.wave_count || 0), 0);
    const avgFocus = filteredMentalLogs.length > 0 ? (filteredMentalLogs.reduce((acc, l) => acc + (l.focus_level || 0), 0) / filteredMentalLogs.length).toFixed(1) : 0;
    const avgAnxiety = filteredMentalLogs.length > 0 ? (filteredMentalLogs.reduce((acc, l) => acc + (l.pre_heat_anxiety || 0), 0) / filteredMentalLogs.length).toFixed(1) : 0;

    return {
      nutrition: {
        avg_calories: filteredNutritionLogs.length > 0 ? Math.round(nutCals / filteredNutritionLogs.length) : 0,
        avg_hydration: filteredNutritionLogs.length > 0 ? (nutHyd / filteredNutritionLogs.length).toFixed(1) : 0,
        log_count: filteredNutritionLogs.length
      },
      sc: {
        avg_sleep: avgSleep,
        avg_recovery: avgRecovery,
        log_count: filteredScLogs.length
      },
      technical: {
        total_waves: totalWaves,
        log_count: filteredTechnicalLogs.length
      },
      mental: {
        avg_anxiety: avgAnxiety,
        avg_focus: avgFocus,
        log_count: filteredMentalLogs.length
      }
    };
  }, [selectedDateISO, summary, filteredNutritionLogs, filteredScLogs, filteredTechnicalLogs, filteredMentalLogs]);

  const totalLogsOnSelectedDate = filteredNutritionLogs.length + filteredScLogs.length + filteredTechnicalLogs.length + filteredMentalLogs.length;

  const handleNutritionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showToast('Please select an athlete first.', 'error');
      return;
    }
    setSubmitting(true);
    const targetDateStr = formatDateForDisplay(logDateInput) || logDateInput;
    try {
      const res = await fetch(`${API}/api/students/${selectedStudentId}/logs/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nutritionForm, date: targetDateStr })
      });
      if (res.ok) {
        showToast(`Nutrition logged successfully for ${targetDateStr}!`);
        setNutritionForm({ calories: 2200, hydration_liters: 2.5, protein_g: 120, carbs_g: 250, fats_g: 65, meal_timing: '' });
        setSelectedDashboardDate(logDateInput);
        fetchStudentData(selectedStudentId);
        setActiveTab('dashboard');
      }
    } catch (err) {
      showToast('Error saving log.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSCSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showToast('Please select an athlete first.', 'error');
      return;
    }
    setSubmitting(true);
    const targetDateStr = formatDateForDisplay(logDateInput) || logDateInput;
    try {
      const res = await fetch(`${API}/api/students/${selectedStudentId}/logs/sc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scForm, date: targetDateStr })
      });
      if (res.ok) {
        showToast(`S&C session logged successfully for ${targetDateStr}!`);
        setScForm({ workout_details: '', mobility_notes: '', sleep_score: 80, recovery_score: 80, injury_notes: '' });
        setSelectedDashboardDate(logDateInput);
        fetchStudentData(selectedStudentId);
        setActiveTab('dashboard');
      }
    } catch (err) {
      showToast('Error saving log.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTechnicalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showToast('Please select an athlete first.', 'error');
      return;
    }
    setSubmitting(true);
    const targetDateStr = formatDateForDisplay(logDateInput) || logDateInput;
    try {
      const res = await fetch(`${API}/api/students/${selectedStudentId}/logs/technical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...technicalForm, date: targetDateStr })
      });
      if (res.ok) {
        showToast(`Technical training logged successfully for ${targetDateStr}!`);
        setTechnicalForm({ session_notes: '', wave_count: 10, board_setup: '', wave_type: '', video_url: '' });
        setSelectedDashboardDate(logDateInput);
        fetchStudentData(selectedStudentId);
        setActiveTab('dashboard');
      }
    } catch (err) {
      showToast('Error saving log.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMentalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showToast('Please select an athlete first.', 'error');
      return;
    }
    setSubmitting(true);
    const targetDateStr = formatDateForDisplay(logDateInput) || logDateInput;
    try {
      const res = await fetch(`${API}/api/students/${selectedStudentId}/logs/mental`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mentalForm, date: targetDateStr })
      });
      if (res.ok) {
        showToast(`Mental performance logged successfully for ${targetDateStr}!`);
        setMentalForm({ pre_heat_anxiety: 5, focus_level: 5, reflection_notes: '' });
        setSelectedDashboardDate(logDateInput);
        fetchStudentData(selectedStudentId);
        setActiveTab('dashboard');
      }
    } catch (err) {
      showToast('Error saving log.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ai-page">
      <Sidebar />
      <main className="ai-main">
        {/* Toast Toast notification */}
        {message.text && (
          <div className={`ai-toast ${message.type === 'error' ? 'toast-error' : 'toast-success'}`}>
            {message.text}
          </div>
        )}

        {/* Top Header & Selection */}
        <header className="ai-header">
          <div className="ai-header-text">
            <h1 className="ai-title">Athlete Intelligence & Analytics</h1>
            <p className="ai-sub">Log daily vitals, nutrition, surfing training, and mental readiness metrics.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {currentUser && currentUser.role !== 'athlete' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Level Filter Dropdown */}
                <div className="ai-selector-box">
                  <label>Level:</label>
                  <select
                    value={levelFilter}
                    onChange={(e) => handleLevelFilterChange(e.target.value)}
                    style={{ fontWeight: 700 }}
                  >
                    <option value="ALL">All Levels ({students.length})</option>
                    <option value="Beginner">Beginner ({levelCounts.Beginner})</option>
                    <option value="Intermediate">Intermediate ({levelCounts.Intermediate})</option>
                    <option value="Advanced">Advanced ({levelCounts.Advanced})</option>
                    <option value="Master">Master ({levelCounts.Master})</option>
                  </select>
                </div>

                {/* Athlete Dropdown */}
                <div className="ai-selector-box">
                  <label>Logging for:</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    style={{ fontWeight: 700 }}
                  >
                    {filteredStudents.length === 0 ? (
                      <option value="">No athletes in {levelFilter}</option>
                    ) : (
                      filteredStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.level || 'Beginner'})</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            )}

            {/* Top Single View Calendar Button */}
            <button
              type="button"
              className="ai-top-cal-btn"
              onClick={() => setShowCalendarModal(true)}
              title="Open interactive monthly calendar"
            >
              <span style={{ fontSize: '16px' }}>📅</span>
              <span>{selectedDashboardDate !== 'ALL' ? formatDateForDisplay(selectedDashboardDate) : 'View Calendar'}</span>
              {selectedDashboardDate !== 'ALL' && (
                <span className="ai-top-cal-badge">Selected</span>
              )}
            </button>

            {selectedDashboardDate !== 'ALL' && (
              <button
                type="button"
                className="ai-top-clear-btn"
                onClick={() => setSelectedDashboardDate('ALL')}
                title="Reset to view all dates summary"
              >
                ✕ All Dates
              </button>
            )}
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="ai-tabs">
          <button className={`ai-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard Summary
          </button>
          <button className={`ai-tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`} onClick={() => setActiveTab('nutrition')}>
            🍎 Log Nutrition
          </button>
          <button className={`ai-tab-btn ${activeTab === 'sc' ? 'active' : ''}`} onClick={() => setActiveTab('sc')}>
            🏋️ S&C Workout
          </button>
          <button className={`ai-tab-btn ${activeTab === 'technical' ? 'active' : ''}`} onClick={() => setActiveTab('technical')}>
            🏄 Technical Training
          </button>
          <button className={`ai-tab-btn ${activeTab === 'mental' ? 'active' : ''}`} onClick={() => setActiveTab('mental')}>
            🧠 Mental Prep
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="ai-dashboard">


            {/* Metrics Grid */}
            <div className="ai-metrics-grid">
              {/* Nutrition stats */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <span className="ai-card-icon">🍎</span>
                  <span className="ai-card-title">Nutrition {selectedDateISO ? 'On Date' : '(Daily Avg)'}</span>
                </div>
                <div className="ai-stat-big stat-nutrition">{activeMetrics.nutrition.avg_calories} <span className="ai-stat-unit">kcal</span></div>
                <div className="ai-stat-desc">
                  Hydration: <strong>{activeMetrics.nutrition.avg_hydration} L</strong> • {activeMetrics.nutrition.log_count} log{activeMetrics.nutrition.log_count === 1 ? '' : 's'}
                </div>
                <div className="ai-bar-track">
                  <div className="ai-bar-fill" style={{ width: `${Math.min((activeMetrics.nutrition.avg_calories / 2500) * 100, 100)}%` }} />
                </div>
              </div>

              {/* S&C stats */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <span className="ai-card-icon">🏋️</span>
                  <span className="ai-card-title">Sleep & S&C Scores</span>
                </div>
                <div className="ai-stat-big stat-sc">{activeMetrics.sc.avg_sleep}% <span className="ai-stat-unit">Sleep</span></div>
                <div className="ai-stat-desc">
                  Recovery: <strong>{activeMetrics.sc.avg_recovery}%</strong> • {activeMetrics.sc.log_count} log{activeMetrics.sc.log_count === 1 ? '' : 's'}
                </div>
                <div className="ai-bar-track">
                  <div className="ai-bar-fill bg-teal" style={{ width: `${activeMetrics.sc.avg_sleep}%` }} />
                </div>
              </div>

              {/* Technical stats */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <span className="ai-card-icon">🏄</span>
                  <span className="ai-card-title">Surf Technical</span>
                </div>
                <div className="ai-stat-big stat-tech">{activeMetrics.technical.total_waves} <span className="ai-stat-unit">Waves Ridden</span></div>
                <div className="ai-stat-desc">
                  Surf sessions logged: <strong>{activeMetrics.technical.log_count}</strong>
                </div>
                <div className="ai-bar-track">
                  <div className="ai-bar-fill bg-purple" style={{ width: `${Math.min((activeMetrics.technical.total_waves / 50) * 100, 100)}%` }} />
                </div>
              </div>

              {/* Mental performance */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <span className="ai-card-icon">🧠</span>
                  <span className="ai-card-title">Mental Diagnostics</span>
                </div>
                <div className="ai-stat-big stat-mental">{activeMetrics.mental.avg_focus}/10 <span className="ai-stat-unit">Focus</span></div>
                <div className="ai-stat-desc">
                  Pre-heat Anxiety: <strong>{activeMetrics.mental.avg_anxiety}/10</strong> • {activeMetrics.mental.log_count} log{activeMetrics.mental.log_count === 1 ? '' : 's'}
                </div>
                <div className="ai-bar-track">
                  <div className="ai-bar-fill bg-rose" style={{ width: `${activeMetrics.mental.avg_focus * 10}%` }} />
                </div>
              </div>
            </div>

            {/* ─── DAY ACTIVITY ROSTER / LOG HISTORY GRID ─── */}
            <div className="ai-history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginTop: '28px' }}>
              
              {/* 1. Surfing Technical Training Card */}
              <div className="sp-card" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="sp-card-title" style={{ margin: 0, color: '#0F172A', fontSize: '16px', fontWeight: 700 }}>
                    🌊 Surfing Training Log History {selectedDateISO ? `(${filteredTechnicalLogs.length})` : ''}
                  </h3>
                  <button
                    type="button"
                    className="ai-add-log-btn"
                    onClick={() => {
                      if (selectedDateISO) setLogDateInput(selectedDashboardDate);
                      setActiveTab('technical');
                    }}
                  >
                    + Log Surf
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredTechnicalLogs.length === 0 ? (
                    <div className="ai-empty-log-box">
                      <span>🏄‍♂️</span>
                      <p style={{ margin: '4px 0 8px', fontSize: '13px', color: '#64748B' }}>
                        {selectedDateISO ? `No surf sessions logged on ${formatLongDate(selectedDashboardDate)}.` : 'No training logs available yet.'}
                      </p>
                      <button
                        type="button"
                        className="ai-empty-btn"
                        onClick={() => {
                          if (selectedDateISO) setLogDateInput(selectedDashboardDate);
                          setActiveTab('technical');
                        }}
                      >
                        + Record Surf Session
                      </button>
                    </div>
                  ) : (
                    filteredTechnicalLogs.map(l => (
                      <div key={l.id} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12.5px', color: '#0F172A', fontWeight: 700 }}>📅 {l.date}</span>
                          <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 800, background: '#F3E8FF', padding: '2px 8px', borderRadius: '6px' }}>
                            {l.wave_count} waves &bull; {l.wave_type || 'Beach break'}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#0D9488', fontWeight: 700, marginBottom: '4px' }}>
                          Board & Fin: {l.board_setup || 'Standard Setup'}
                        </div>
                        <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                          {l.session_notes}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. S&C Workout Card */}
              <div className="sp-card" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="sp-card-title" style={{ margin: 0, color: '#0F172A', fontSize: '16px', fontWeight: 700 }}>
                    🏋️ S&C Training History {selectedDateISO ? `(${filteredScLogs.length})` : ''}
                  </h3>
                  <button
                    type="button"
                    className="ai-add-log-btn"
                    onClick={() => {
                      if (selectedDateISO) setLogDateInput(selectedDashboardDate);
                      setActiveTab('sc');
                    }}
                  >
                    + Log S&C
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredScLogs.length === 0 ? (
                    <div className="ai-empty-log-box">
                      <span>🏋️</span>
                      <p style={{ margin: '4px 0 8px', fontSize: '13px', color: '#64748B' }}>
                        {selectedDateISO ? `No workouts logged on ${formatLongDate(selectedDashboardDate)}.` : 'No workout logs available yet.'}
                      </p>
                      <button
                        type="button"
                        className="ai-empty-btn"
                        onClick={() => {
                          if (selectedDateISO) setLogDateInput(selectedDashboardDate);
                          setActiveTab('sc');
                        }}
                      >
                        + Record S&C Workout
                      </button>
                    </div>
                  ) : (
                    filteredScLogs.map(l => (
                      <div key={l.id} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12.5px', color: '#0F172A', fontWeight: 700 }}>📅 {l.date}</span>
                          <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: 800, background: '#CCFBF1', padding: '2px 8px', borderRadius: '6px' }}>
                            Recovery: {l.recovery_score}% &bull; Sleep: {l.sleep_score}%
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#1E293B', margin: 0, marginBottom: '6px' }}>
                          <strong>Workout:</strong> {l.workout_details}
                        </p>
                        {l.mobility_notes && <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}><strong>Mobility:</strong> {l.mobility_notes}</p>}
                        {l.injury_notes && <p style={{ fontSize: '12px', color: '#EF4444', margin: '4px 0 0 0', fontWeight: 600 }}>⚠️ Injury / Tightness: {l.injury_notes}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Nutrition & Hydration Card */}
              <div className="sp-card" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="sp-card-title" style={{ margin: 0, color: '#0F172A', fontSize: '16px', fontWeight: 700 }}>
                    🍎 Nutrition & Hydration {selectedDateISO ? `(${filteredNutritionLogs.length})` : ''}
                  </h3>
                  <button
                    type="button"
                    className="ai-add-log-btn"
                    onClick={() => {
                      if (selectedDateISO) setLogDateInput(selectedDashboardDate);
                      setActiveTab('nutrition');
                    }}
                  >
                    + Log Meals
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredNutritionLogs.length === 0 ? (
                    <div className="ai-empty-log-box">
                      <span>🍎</span>
                      <p style={{ margin: '4px 0 8px', fontSize: '13px', color: '#64748B' }}>
                        {selectedDateISO ? `No nutrition logged on ${formatLongDate(selectedDashboardDate)}.` : 'No nutrition logs recorded yet.'}
                      </p>
                      <button
                        type="button"
                        className="ai-empty-btn"
                        onClick={() => {
                          if (selectedDateISO) setLogDateInput(selectedDashboardDate);
                          setActiveTab('nutrition');
                        }}
                      >
                        + Record Nutrition
                      </button>
                    </div>
                  ) : (
                    filteredNutritionLogs.map(l => (
                      <div key={l.id} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12.5px', color: '#0F172A', fontWeight: 700 }}>📅 {l.date}</span>
                          <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: 800, background: '#E6F9F5', padding: '2px 8px', borderRadius: '6px' }}>
                            {l.calories} kcal &bull; {l.hydration_liters} L Hydration
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>
                          <span>Protein: <strong style={{ color: '#0F172A' }}>{l.protein_g}g</strong></span>
                          <span>&bull; Carbs: <strong style={{ color: '#0F172A' }}>{l.carbs_g}g</strong></span>
                          <span>&bull; Fats: <strong style={{ color: '#0F172A' }}>{l.fats_g}g</strong></span>
                        </div>
                        {l.meal_timing && (
                          <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, fontStyle: 'italic' }}>
                            "{l.meal_timing}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Mental Readiness & Diagnostics Card */}
              <div className="sp-card" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="sp-card-title" style={{ margin: 0, color: '#0F172A', fontSize: '16px', fontWeight: 700 }}>
                    🧠 Mental Diagnostics {selectedDateISO ? `(${filteredMentalLogs.length})` : ''}
                  </h3>
                  <button
                    type="button"
                    className="ai-add-log-btn"
                    onClick={() => {
                      if (selectedDateISO) setLogDateInput(selectedDashboardDate);
                      setActiveTab('mental');
                    }}
                  >
                    + Log Mental
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredMentalLogs.length === 0 ? (
                    <div className="ai-empty-log-box">
                      <span>🧠</span>
                      <p style={{ margin: '4px 0 8px', fontSize: '13px', color: '#64748B' }}>
                        {selectedDateISO ? `No mental logs on ${formatLongDate(selectedDashboardDate)}.` : 'No mental diagnostics logged yet.'}
                      </p>
                      <button
                        type="button"
                        className="ai-empty-btn"
                        onClick={() => {
                          if (selectedDateISO) setLogDateInput(selectedDashboardDate);
                          setActiveTab('mental');
                        }}
                      >
                        + Record Mental Prep
                      </button>
                    </div>
                  ) : (
                    filteredMentalLogs.map(l => (
                      <div key={l.id} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12.5px', color: '#0F172A', fontWeight: 700 }}>📅 {l.date}</span>
                          <span style={{ fontSize: '12px', color: '#E11D48', fontWeight: 800, background: '#FFE4E6', padding: '2px 8px', borderRadius: '6px' }}>
                            Focus: {l.focus_level}/10 &bull; Anxiety: {l.pre_heat_anxiety}/10
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.4 }}>
                          {l.reflection_notes}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Nutrition Form Tab */}
        {activeTab === 'nutrition' && (
          <div className="ai-form-card glass">
            <h2 className="ai-form-title">🍎 Nutrition & Hydration Log</h2>
            <form onSubmit={handleNutritionSubmit} className="ai-form">
              {/* Date Selector for this Log */}
              <div className="ai-form-field" style={{ maxWidth: '280px' }}>
                <label style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📅 Log Date:</span>
                </label>
                <input
                  type="date"
                  value={logDateInput}
                  onChange={(e) => setLogDateInput(e.target.value)}
                  required
                  style={{ fontWeight: 600, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1' }}
                />
              </div>

              <div className="ai-form-row">
                <div className="ai-form-field">
                  <label>Daily Caloric Intake (kcal)</label>
                  <input type="number" value={nutritionForm.calories} onChange={(e) => setNutritionForm({ ...nutritionForm, calories: parseInt(e.target.value) || 0 })} required />
                </div>
                <div className="ai-form-field">
                  <label>Hydration (Liters)</label>
                  <input type="number" step="0.1" value={nutritionForm.hydration_liters} onChange={(e) => setNutritionForm({ ...nutritionForm, hydration_liters: parseFloat(e.target.value) || 0.0 })} required />
                </div>
              </div>

              <div className="ai-form-row">
                <div className="ai-form-field">
                  <label>Protein (grams)</label>
                  <input type="number" value={nutritionForm.protein_g} onChange={(e) => setNutritionForm({ ...nutritionForm, protein_g: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="ai-form-field">
                  <label>Carbs (grams)</label>
                  <input type="number" value={nutritionForm.carbs_g} onChange={(e) => setNutritionForm({ ...nutritionForm, carbs_g: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="ai-form-field">
                  <label>Fats (grams)</label>
                  <input type="number" value={nutritionForm.fats_g} onChange={(e) => setNutritionForm({ ...nutritionForm, fats_g: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="ai-form-field">
                <label>Competition-Day Meal Timing / Notes</label>
                <textarea rows="3" value={nutritionForm.meal_timing} onChange={(e) => setNutritionForm({ ...nutritionForm, meal_timing: e.target.value })} placeholder="e.g. Oatmeal pre-heat at 7AM, Electrolytes during heat intervals, Post-heat banana recovery."></textarea>
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting Log...' : `Submit Nutrition Log for ${formatDateForDisplay(logDateInput)}`}
              </button>
            </form>
          </div>
        )}

        {/* S&C Form Tab */}
        {activeTab === 'sc' && (
          <div className="ai-form-card glass">
            <h2 className="ai-form-title">🏋️ Strength & Conditioning Log</h2>
            <form onSubmit={handleSCSubmit} className="ai-form">
              {/* Date Selector for this Log */}
              <div className="ai-form-field" style={{ maxWidth: '280px' }}>
                <label style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📅 Log Date:</span>
                </label>
                <input
                  type="date"
                  value={logDateInput}
                  onChange={(e) => setLogDateInput(e.target.value)}
                  required
                  style={{ fontWeight: 600, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1' }}
                />
              </div>

              <div className="ai-form-row">
                <div className="ai-form-field">
                  <label>Sleep Score (0 - 100%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="0" max="100" value={scForm.sleep_score} onChange={(e) => setScForm({ ...scForm, sleep_score: parseInt(e.target.value) })} style={{ flex: 1 }} />
                    <span style={{ fontWeight: 700, width: '40px' }}>{scForm.sleep_score}%</span>
                  </div>
                </div>
                <div className="ai-form-field">
                  <label>Recovery / Readiness Score (0 - 100%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="0" max="100" value={scForm.recovery_score} onChange={(e) => setScForm({ ...scForm, recovery_score: parseInt(e.target.value) })} style={{ flex: 1 }} />
                    <span style={{ fontWeight: 700, width: '40px' }}>{scForm.recovery_score}%</span>
                  </div>
                </div>
              </div>

              <div className="ai-form-field">
                <label>Workout Details & Exercise Logs</label>
                <textarea rows="3" value={scForm.workout_details} onChange={(e) => setScForm({ ...scForm, workout_details: e.target.value })} placeholder="e.g. Deadlifts 3x5 @ 120kg, Box Jumps 4x5, Plank hold 3x60s." required></textarea>
              </div>

              <div className="ai-form-field">
                <label>Mobility Notes</label>
                <input type="text" value={scForm.mobility_notes} onChange={(e) => setScForm({ ...scForm, mobility_notes: e.target.value })} placeholder="e.g. Thoracic spine stretching and foam rolling." />
              </div>

              <div className="ai-form-field">
                <label>Injury Tracking (Leave blank if fully fit)</label>
                <input type="text" value={scForm.injury_notes} onChange={(e) => setScForm({ ...scForm, injury_notes: e.target.value })} placeholder="e.g. Slight tightness in left shoulder, knee discomfort." />
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting Log...' : `Submit S&C Log for ${formatDateForDisplay(logDateInput)}`}
              </button>
            </form>
          </div>
        )}

        {/* Technical Form Tab */}
        {activeTab === 'technical' && (
          <div className="ai-form-card glass">
            <h2 className="ai-form-title">🏄 Surfing Technical Training</h2>
            <form onSubmit={handleTechnicalSubmit} className="ai-form">
              {/* Date Selector for this Log */}
              <div className="ai-form-field" style={{ maxWidth: '280px' }}>
                <label style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📅 Log Date:</span>
                </label>
                <input
                  type="date"
                  value={logDateInput}
                  onChange={(e) => setLogDateInput(e.target.value)}
                  required
                  style={{ fontWeight: 600, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1' }}
                />
              </div>

              <div className="ai-form-row">
                <div className="ai-form-field">
                  <label>Wave Count</label>
                  <input type="number" value={technicalForm.wave_count} onChange={(e) => setTechnicalForm({ ...technicalForm, wave_count: parseInt(e.target.value) || 0 })} required />
                </div>
                <div className="ai-form-field">
                  <label>Wave Type / Conditions</label>
                  <input type="text" value={technicalForm.wave_type} onChange={(e) => setTechnicalForm({ ...technicalForm, wave_type: e.target.value })} placeholder="e.g. Reef break, 4-6ft barrel swell" />
                </div>
              </div>

              <div className="ai-form-row">
                <div className="ai-form-field">
                  <label>Board & Fin Setup</label>
                  <input type="text" value={technicalForm.board_setup} onChange={(e) => setTechnicalForm({ ...technicalForm, board_setup: e.target.value })} placeholder="e.g. 6'0 Pyzel, Thruster setup" />
                </div>
              </div>

              <div className="ai-form-field">
                <label>Technical Session Notes & Reflections</label>
                <textarea rows="3" value={technicalForm.session_notes} onChange={(e) => setTechnicalForm({ ...technicalForm, session_notes: e.target.value })} placeholder="e.g. Bottom turns felt clean, but pop-up timing on late drops was slightly sluggish." required></textarea>
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting Log...' : `Submit Technical Session for ${formatDateForDisplay(logDateInput)}`}
              </button>
            </form>
          </div>
        )}

        {/* Mental Form Tab */}
        {activeTab === 'mental' && (
          <div className="ai-form-card glass">
            <h2 className="ai-form-title">🧠 Mental Performance Diagnostic</h2>
            <form onSubmit={handleMentalSubmit} className="ai-form">
              {/* Date Selector for this Log */}
              <div className="ai-form-field" style={{ maxWidth: '280px' }}>
                <label style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📅 Log Date:</span>
                </label>
                <input
                  type="date"
                  value={logDateInput}
                  onChange={(e) => setLogDateInput(e.target.value)}
                  required
                  style={{ fontWeight: 600, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1' }}
                />
              </div>

              <div className="ai-form-row">
                <div className="ai-form-field">
                  <label>Pre-Heat Anxiety Level (1 - 10)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="1" max="10" value={mentalForm.pre_heat_anxiety} onChange={(e) => setMentalForm({ ...mentalForm, pre_heat_anxiety: parseInt(e.target.value) })} style={{ flex: 1 }} />
                    <span style={{ fontWeight: 700, width: '40px' }}>{mentalForm.pre_heat_anxiety}/10</span>
                  </div>
                </div>
                <div className="ai-form-field">
                  <label>Focus Level (1 - 10)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="1" max="10" value={mentalForm.focus_level} onChange={(e) => setMentalForm({ ...mentalForm, focus_level: parseInt(e.target.value) })} style={{ flex: 1 }} />
                    <span style={{ fontWeight: 700, width: '40px' }}>{mentalForm.focus_level}/10</span>
                  </div>
                </div>
              </div>

              <div className="ai-form-field">
                <label>Post-Heat Reflection & Visualizations Notes</label>
                <textarea rows="4" value={mentalForm.reflection_notes} onChange={(e) => setMentalForm({ ...mentalForm, reflection_notes: e.target.value })} placeholder="e.g. Heart rate was elevated before paddle-out. Guided breathing for 3 mins lowered anxiety and improved wave selection." required></textarea>
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting Log...' : `Submit Mental Readiness Log for ${formatDateForDisplay(logDateInput)}`}
              </button>
            </form>
          </div>
        )}

        {/* ─── FULL MONTHLY INTERACTIVE CALENDAR MODAL ─── */}
        {showCalendarModal && (
          <div className="ai-modal-overlay" onClick={() => setShowCalendarModal(false)}>
            <div className="ai-modal-box" onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Top Header */}
              <div className="ai-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="ai-dsb-icon">
                    <span>📅</span>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontFamily: 'Outfit, sans-serif', color: '#0F172A', fontWeight: 700 }}>
                      Athlete Training & Intelligence Calendar
                    </h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                      Click any date to inspect daily logs, surfing technical notes, S&C workouts, and mental readiness
                    </p>
                  </div>
                </div>
                <button className="ai-modal-close" onClick={() => setShowCalendarModal(false)}>✕</button>
              </div>

              {/* Modal Body Scroll */}
              <div className="ai-modal-scroll">
                
                {/* Month Navigation Bar */}
                <div className="ai-cal-nav">
                  <div className="ai-cal-month-title">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="ai-cal-nav-btn"
                      onClick={() => setCurrentCalendarDate(new Date(calYear, calMonth - 1, 1))}
                    >
                      ‹ Prev
                    </button>
                    <button
                      type="button"
                      className="ai-cal-nav-btn"
                      onClick={() => {
                        const now = new Date();
                        setCurrentCalendarDate(now);
                        setSelectedDashboardDate(getTodayISO());
                        setLogDateInput(getTodayISO());
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="ai-cal-nav-btn"
                      onClick={() => setCurrentCalendarDate(new Date(calYear, calMonth + 1, 1))}
                    >
                      Next ›
                    </button>
                  </div>
                </div>

                {/* Weekday Names Header */}
                <div className="ai-grid-header">
                  {DAYS_OF_WEEK.map(d => (
                    <div key={d} className="ai-grid-th">{d}</div>
                  ))}
                </div>

                {/* Days Matrix */}
                <div className="ai-days-matrix">
                  {/* Empty pads for start of month */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`pad-${i}`} className="ai-month-cell empty"></div>
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInCalMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const cellISO = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isToday = cellISO === getTodayISO();
                    const isSelected = selectedDashboardDate === cellISO;
                    const dayData = logsByDateMap[cellISO];
                    const hasLogs = !!dayData && dayData.count > 0;

                    return (
                      <div
                        key={dayNum}
                        className={`ai-month-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                        onClick={() => {
                          setSelectedDashboardDate(cellISO);
                          setLogDateInput(cellISO);
                          setShowCalendarModal(false);
                          setActiveTab('dashboard');
                        }}
                        title={`Date: ${cellISO}${hasLogs ? ` (${dayData.count} logs recorded)` : ''}`}
                      >
                        <div className="ai-cell-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{
                              fontWeight: (isToday || hasLogs || isSelected) ? 700 : 500,
                              color: isSelected ? '#0D9488' : isToday ? '#1D4ED8' : '#0F172A'
                            }}>
                              {dayNum}
                            </span>
                            {isToday && <span className="ai-today-tag">TODAY</span>}
                          </div>
                          {hasLogs && (
                            <span className="ai-cell-badge">
                              {dayData.count} {dayData.count === 1 ? 'log' : 'logs'}
                            </span>
                          )}
                        </div>

                        {/* Activity mini-tags */}
                        {hasLogs && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                            {dayData.technical.length > 0 && (
                              <span style={{ fontSize: '9.5px', background: '#F3E8FF', color: '#7C3AED', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>
                                🏄 Surf ({dayData.technical.length})
                              </span>
                            )}
                            {dayData.sc.length > 0 && (
                              <span style={{ fontSize: '9.5px', background: '#E0F2FE', color: '#0369A1', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>
                                🏋️ S&C ({dayData.sc.length})
                              </span>
                            )}
                            {dayData.nutrition.length > 0 && (
                              <span style={{ fontSize: '9.5px', background: '#DCFCE7', color: '#15803D', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>
                                🍎 Nutrition ({dayData.nutrition.length})
                              </span>
                            )}
                            {dayData.mental.length > 0 && (
                              <span style={{ fontSize: '9.5px', background: '#FFE4E6', color: '#BE123C', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>
                                🧠 Mental ({dayData.mental.length})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Modal Footer / Fast Selection Bar */}
                <div style={{ marginTop: '20px', padding: '14px 20px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    💡 <strong>Tip:</strong> Click any date cell above to instantly view its detailed activity roster and metrics on the dashboard.
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="ai-dsb-all-btn"
                      onClick={() => {
                        setSelectedDashboardDate('ALL');
                        setShowCalendarModal(false);
                        setActiveTab('dashboard');
                      }}
                    >
                      🌐 Show All Dates Summary
                    </button>
                    <button
                      type="button"
                      className="ai-dsb-cal-btn"
                      onClick={() => setShowCalendarModal(false)}
                    >
                      Close Calendar
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .ai-page {
          display: flex;
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Instrument Sans', sans-serif;
          color: #0F172A;
          padding-top: 84px;
          box-sizing: border-box;
          width: 100%;
        }
        .ai-main {
          flex: 1;
          padding: 28px 40px 80px 40px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 28px;
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }

        /* Custom scrollbar styling */
        .ai-main::-webkit-scrollbar,
        div::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .ai-main::-webkit-scrollbar-track,
        div::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.03);
        }
        .ai-main::-webkit-scrollbar-thumb,
        div::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .ai-main::-webkit-scrollbar-thumb:hover,
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.25);
        }

        /* Toast Alert */
        .ai-toast {
          position: fixed; top: 30px; right: 80px; padding: 16px 28px; border-radius: 12px;
          color: #FFF; font-weight: 700; font-size: 14px; z-index: 1010;
          box-shadow: 0px 8px 24px rgba(0,0,0,0.12); animation: toastFade 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .toast-success { background: #0D9488; }
        .toast-error { background: #EF4444; }
        @keyframes toastFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Header */
        .ai-header { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
        .ai-header-text { display: flex; flex-direction: column; gap: 8px; }
        .ai-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #0F172A; margin: 0; }
        .ai-sub { font-size: 15px; color: #64748B; margin: 0; }

        .ai-selector-box { display: flex; align-items: center; gap: 12px; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 10px 18px; border-radius: 12px; box-shadow: 0px 4px 12px rgba(0,0,0,0.03); }
        .ai-selector-box label { font-size: 13px; font-weight: 700; color: #64748B; }
        .ai-selector-box select { border: none; font-size: 14px; font-weight: 700; color: #0F172A; outline: none; background: transparent; cursor: pointer; }
        .ai-selector-box select option { background: #FFFFFF; color: #0F172A; }

        /* Pill Tabs */
        .ai-tabs {
          display: flex;
          gap: 16px;
          border-bottom: 1px solid #E2E8F0;
          padding-bottom: 16px;
          margin-bottom: 8px;
        }
        .ai-tab-btn {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          border-radius: 30px;
          transition: all 0.2s ease;
          box-shadow: 0px 2px 6px rgba(0,0,0,0.02);
        }
        .ai-tab-btn:hover {
          color: #0F172A;
          border-color: #CBD5E1;
        }
        .ai-tab-btn.active {
          color: #FFFFFF;
          background: #0D9488;
          border-color: #0D9488;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
          font-weight: 700;
        }

        /* ─── Top Header Calendar Controls ─── */
        .ai-top-cal-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          border-radius: 12px;
          border: 1.5px solid #0D9488;
          background: #F0FDFA;
          color: #0F766E;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.1);
        }
        .ai-top-cal-btn:hover {
          background: #0D9488;
          color: #FFFFFF;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
        }
        .ai-top-cal-badge {
          background: #0D9488;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.3px;
        }
        .ai-top-cal-btn:hover .ai-top-cal-badge {
          background: #FFFFFF;
          color: #0D9488;
        }
        .ai-top-clear-btn {
          padding: 9px 14px;
          border-radius: 12px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          color: #64748B;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ai-top-clear-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
          border-color: #94A3B8;
        }

        /* ─── Date Status Bar ─── */
        .ai-date-status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          background: #FFFFFF;
          border: 1.5px solid #99F6E4;
          border-radius: 16px;
          padding: 16px 24px;
          box-shadow: 0 4px 14px rgba(13, 148, 136, 0.06);
        }
        .ai-date-status-bar.all-dates {
          border-color: #E2E8F0;
          background: #FFFFFF;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }
        .ai-dsb-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #CCFBF1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .ai-dsb-icon.all {
          background: #F1F5F9;
        }
        .ai-dsb-cal-btn {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #0D9488;
          background: #0D9488;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ai-dsb-cal-btn:hover {
          background: #0F766E;
        }
        .ai-dsb-all-btn {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ai-dsb-all-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
        }

        /* ─── Monthly Calendar Modal ─── */
        .ai-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 11, 26, 0.8);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }
        .ai-modal-box {
          background: #FFFFFF;
          border-radius: 20px;
          max-width: 1000px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .ai-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 28px;
          border-bottom: 1px solid #E2E8F0;
          background: #FFFFFF;
        }
        .ai-modal-close {
          background: #F1F5F9;
          border: none;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          font-size: 15px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ai-modal-close:hover {
          background: #E2E8F0;
          color: #0F172A;
        }
        .ai-modal-scroll {
          padding: 24px 28px;
          overflow-y: auto;
          flex: 1;
        }
        .ai-cal-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .ai-cal-month-title {
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #050B1A;
        }
        .ai-cal-nav-btn {
          padding: 6px 14px;
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ai-cal-nav-btn:hover {
          background: #E2E8F0;
        }
        .ai-grid-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-bottom: 8px;
          text-align: center;
        }
        .ai-grid-th {
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          padding: 6px 0;
        }
        .ai-days-matrix {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        .ai-month-cell {
          min-height: 84px;
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ai-month-cell:hover {
          border-color: #0D9488;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
        }
        .ai-month-cell.selected {
          border-color: #0D9488;
          background: rgba(13, 148, 136, 0.05);
        }
        .ai-month-cell.today {
          border-color: #2563EB;
        }
        .ai-month-cell.empty {
          background: transparent;
          border-color: transparent;
          cursor: default;
        }
        .ai-cell-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
        }
        .ai-cell-badge {
          background: #0D9488;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .ai-today-tag {
          background: #2563EB;
          color: #FFFFFF;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
        }

        /* Metrics Cards */
        .ai-metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .ai-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0px 4px 12px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
        }
        .ai-card:hover {
          transform: translateY(-2px);
          box-shadow: 0px 8px 24px rgba(0,0,0,0.08);
          border-color: #CBD5E1;
        }
        .ai-card-header { display: flex; align-items: center; gap: 8px; }
        .ai-card-icon { font-size: 20px; }
        .ai-card-title { font-size: 13px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .ai-stat-big {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 800;
          line-height: 1.1;
          margin: 4px 0;
          color: #0F172A;
          display: inline-block;
        }
        .ai-stat-unit {
          font-size: 14px;
          color: #64748B;
          font-weight: 500;
          margin-left: 4px;
        }
        .ai-stat-desc { font-size: 13px; color: #64748B; margin-top: 4px; }
        .ai-stat-desc strong { color: #0F172A; }

        .ai-bar-track { height: 6px; background: #F1F5F9; border-radius: 3px; width: 100%; margin-top: 12px; overflow: hidden; }
        .ai-bar-fill { height: 100%; background: #0D9488; border-radius: 3px; }
        .ai-bar-fill.bg-teal { background: #0D9488; }
        .ai-bar-fill.bg-purple { background: #7C3AED; }
        .ai-bar-fill.bg-rose { background: #F43F5E; }

        /* Action Buttons on Roster Cards */
        .ai-add-log-btn {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #0D9488;
          background: #F0FDFA;
          color: #0F766E;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ai-add-log-btn:hover {
          background: #0D9488;
          color: #FFFFFF;
        }

        .ai-empty-log-box {
          text-align: center;
          padding: 28px 16px;
          background: #F8FAFC;
          border: 1.5px dashed #CBD5E1;
          border-radius: 12px;
          color: #64748B;
        }
        .ai-empty-log-box span {
          font-size: 24px;
        }
        .ai-empty-btn {
          margin-top: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          background: #0D9488;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .ai-empty-btn:hover {
          background: #0F766E;
        }

        /* Forms styling */
        .ai-form-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0px 8px 24px rgba(0,0,0,0.04);
        }
        .ai-form-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 24px 0; }
        .ai-form { display: flex; flex-direction: column; gap: 20px; }
        
        .ai-form-field { display: flex; flex-direction: column; gap: 8px; }
        .ai-form-field label { font-size: 13px; font-weight: 700; color: #475569; }
        .ai-form-field input,
        .ai-form-field select,
        .ai-form-field textarea {
          padding: 12px; border: 1.5px solid #CBD5E1; border-radius: 10px;
          font-size: 14px; outline: none; transition: all 0.2s;
          font-family: inherit; background: #FFFFFF; color: #0F172A;
        }
        .ai-form-field input:focus,
        .ai-form-field select:focus,
        .ai-form-field textarea:focus {
          border-color: #0D9488;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
        }
        .ai-form-field select option { background: #FFFFFF; color: #0F172A; }
        .ai-form-row { display: flex; gap: 20px; }
        .ai-form-row .ai-form-field { flex: 1; }

        @media (max-width: 1024px) {
          .ai-metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .ai-history-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .ai-metrics-grid { grid-template-columns: 1fr; }
          .ai-form-row { flex-direction: column; gap: 14px; }
          .ai-header { flex-direction: column; align-items: flex-start; }
          .ai-tabs { overflow-x: auto; min-width: max-content; }
        }
      `}</style>
    </div>
  );
};

export default AthleteIntelligence;
