import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const AthleteIntelligence = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'nutrition', 'sc', 'technical', 'mental'

  // Summary Metrics
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

  // Get current date string e.g. "03 Aug 2026"
  const getTodayStr = () => {
    const today = new Date();
    return today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
      } catch (e) {}
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
      .catch(() => {});
  }, []);

  const fetchStudentData = (studentId) => {
    if (!studentId) return;

    // Fetch logs summary
    fetch(`${API}/api/students/${studentId}/logs/summary`)
      .then(res => res.json())
      .then(setSummary)
      .catch(() => {});

    // Fetch lists
    fetch(`${API}/api/students/${studentId}/logs/nutrition`).then(res => res.json()).then(setNutritionLogs).catch(() => {});
    fetch(`${API}/api/students/${studentId}/logs/sc`).then(res => res.json()).then(setScLogs).catch(() => {});
    fetch(`${API}/api/students/${studentId}/logs/technical`).then(res => res.json()).then(setTechnicalLogs).catch(() => {});
    fetch(`${API}/api/students/${studentId}/logs/mental`).then(res => res.json()).then(setMentalLogs).catch(() => {});
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentData(selectedStudentId);
    }
  }, [selectedStudentId]);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleNutritionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/students/${selectedStudentId}/logs/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nutritionForm, date: getTodayStr() })
      });
      if (res.ok) {
        showToast('Nutrition logged successfully!');
        setNutritionForm({ calories: 2200, hydration_liters: 2.5, protein_g: 120, carbs_g: 250, fats_g: 65, meal_timing: '' });
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
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/students/${selectedStudentId}/logs/sc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scForm, date: getTodayStr() })
      });
      if (res.ok) {
        showToast('S&C session logged successfully!');
        setScForm({ workout_details: '', mobility_notes: '', sleep_score: 80, recovery_score: 80, injury_notes: '' });
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
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/students/${selectedStudentId}/logs/technical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...technicalForm, date: getTodayStr() })
      });
      if (res.ok) {
        showToast('Technical training logged successfully!');
        setTechnicalForm({ session_notes: '', wave_count: 10, board_setup: '', wave_type: '', video_url: '' });
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
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/students/${selectedStudentId}/logs/mental`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mentalForm, date: getTodayStr() })
      });
      if (res.ok) {
        showToast('Mental performance logged successfully!');
        setMentalForm({ pre_heat_anxiety: 5, focus_level: 5, reflection_notes: '' });
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
          {currentUser && currentUser.role !== 'athlete' && (
            <div className="ai-selector-box">
              <label>Logging for:</label>
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
                ))}
              </select>
            </div>
          )}
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
            <div className="ai-metrics-grid">
              {/* Nutrition stats */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <span className="ai-card-icon">🍎</span>
                  <span className="ai-card-title">Nutrition (Daily Avg)</span>
                </div>
                <div className="ai-stat-big stat-nutrition">{summary.nutrition.avg_calories} <span className="ai-stat-unit">kcal</span></div>
                <div className="ai-stat-desc">
                  Hydration: <strong>{summary.nutrition.avg_hydration} L</strong> • {summary.nutrition.log_count} log entries
                </div>
                <div className="ai-bar-track">
                  <div className="ai-bar-fill" style={{ width: `${Math.min((summary.nutrition.avg_calories / 2500) * 100, 100)}%` }} />
                </div>
              </div>

              {/* S&C stats */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <span className="ai-card-icon">🏋️</span>
                  <span className="ai-card-title">Sleep & S&C Scores</span>
                </div>
                <div className="ai-stat-big stat-sc">{summary.sc.avg_sleep}% <span className="ai-stat-unit">Sleep</span></div>
                <div className="ai-stat-desc">
                  Recovery: <strong>{summary.sc.avg_recovery}%</strong> • {summary.sc.log_count} log entries
                </div>
                <div className="ai-bar-track">
                  <div className="ai-bar-fill bg-teal" style={{ width: `${summary.sc.avg_sleep}%` }} />
                </div>
              </div>

              {/* Technical stats */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <span className="ai-card-icon">🏄</span>
                  <span className="ai-card-title">Surf Technical</span>
                </div>
                <div className="ai-stat-big stat-tech">{summary.technical.total_waves} <span className="ai-stat-unit">Waves Ridden</span></div>
                <div className="ai-stat-desc">
                  Surf sessions logged: <strong>{summary.technical.log_count}</strong>
                </div>
                <div className="ai-bar-track">
                  <div className="ai-bar-fill bg-purple" style={{ width: `${Math.min((summary.technical.total_waves / 50) * 100, 100)}%` }} />
                </div>
              </div>

              {/* Mental performance */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <span className="ai-card-icon">🧠</span>
                  <span className="ai-card-title">Mental Diagnostics</span>
                </div>
                <div className="ai-stat-big stat-mental">{summary.mental.avg_focus}/10 <span className="ai-stat-unit">Focus</span></div>
                <div className="ai-stat-desc">
                  Pre-heat Anxiety: <strong>{summary.mental.avg_anxiety}/10</strong> • {summary.mental.log_count} logs
                </div>
                <div className="ai-bar-track">
                  <div className="ai-bar-fill bg-rose" style={{ width: `${summary.mental.avg_focus * 10}%` }} />
                </div>
              </div>
            </div>

            {/* Recent logs lists */}
            <div className="ai-history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginTop: '32px' }}>
              {/* Technical Wave details */}
              <div className="sp-card" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px' }}>
                <h3 className="sp-card-title" style={{ marginBottom: '16px', color: '#0F172A' }}>🌊 Surfing Training Log History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                  {technicalLogs.length === 0 ? <p style={{ fontSize: '13px', color: '#64748B' }}>No training logs available yet.</p> :
                    technicalLogs.map(l => (
                      <div key={l.id} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{l.date}</span>
                          <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 700 }}>{l.wave_count} waves ({l.wave_type || 'beach'})</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, marginBottom: '4px' }}>Board: {l.board_setup || 'Shortboard'}</div>
                        <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{l.session_notes}</p>
                        {/* l.video_url && (
                          <div style={{ marginTop: '12px' }}>
                            <video src={l.video_url} controls style={{ width: '100%', borderRadius: '12px', background: '#0F172A', maxHeight: '240px', display: 'block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                              <a href={l.video_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px', color: '#0D9488', fontWeight: 600, textDecoration: 'none', gap: '6px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                Open video
                              </a>
                              <button 
                                onClick={() => {
                                  const studentName = students.find(s => s.id.toString() === selectedStudentId)?.name || 'Athlete';
                                  navigate(`/analysis?video=${encodeURIComponent(l.video_url)}&student=${encodeURIComponent(studentName)}&date=${encodeURIComponent(l.date)}`);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px', color: '#7C3AED', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', gap: '6px', padding: 0 }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                AI Video Analysis
                              </button>
                            </div>
                          </div>
                        ) */}
                      </div>
                    ))}
                </div>
              </div>

              {/* S&C logs */}
              <div className="sp-card" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px' }}>
                <h3 className="sp-card-title" style={{ marginBottom: '16px', color: '#0F172A' }}>🏋️ S&C Training History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                  {scLogs.length === 0 ? <p style={{ fontSize: '13px', color: '#64748B' }}>No workout logs available yet.</p> :
                    scLogs.map(l => (
                      <div key={l.id} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{l.date}</span>
                          <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: 700 }}>Recovery: {l.recovery_score}%</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, marginBottom: '4px' }}>Sleep Score: {l.sleep_score}%</div>
                        <p style={{ fontSize: '13px', color: '#475569', margin: 0, marginBottom: '6px' }}><strong>Workout:</strong> {l.workout_details}</p>
                        {l.mobility_notes && <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}><strong>Mobility:</strong> {l.mobility_notes}</p>}
                        {l.injury_notes && <p style={{ fontSize: '12px', color: '#EF4444', margin: '4px 0 0 0' }}>⚠️ <strong>Injury:</strong> {l.injury_notes}</p>}
                      </div>
                    ))}
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
                {submitting ? 'Submitting Log...' : 'Submit Nutrition Log'}
              </button>
            </form>
          </div>
        )}

        {/* S&C Form Tab */}
        {activeTab === 'sc' && (
          <div className="ai-form-card glass">
            <h2 className="ai-form-title">🏋️ Strength & Conditioning Log</h2>
            <form onSubmit={handleSCSubmit} className="ai-form">
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
                {submitting ? 'Submitting Log...' : 'Submit S&C Log'}
              </button>
            </form>
          </div>
        )}

        {/* Technical Form Tab */}
        {activeTab === 'technical' && (
          <div className="ai-form-card glass">
            <h2 className="ai-form-title">🏄 Surfing Technical Training</h2>
            <form onSubmit={handleTechnicalSubmit} className="ai-form">
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
                {/* <div className="ai-form-field">
                  <label>Session Video Attachment (Upload file or paste URL)</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input type="url" value={technicalForm.video_url} onChange={(e) => setTechnicalForm({ ...technicalForm, video_url: e.target.value })} placeholder="Paste video URL..." style={{ flex: 1 }} />
                    <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 'bold' }}>OR</span>
                    <input type="file" accept="video/*" onChange={handleVideoFileChange} id="video-upload-input" style={{ display: 'none' }} />
                    <label htmlFor="video-upload-input" className="btn-secondary" style={{ padding: '12px 18px', borderRadius: '10px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '6px', whiteSpace: 'nowrap', border: '1.5px solid #CBD5E1', color: '#475569', fontWeight: 600, background: '#FFF' }}>
                      {uploadingVideo ? 'Uploading...' : '📁 Choose Video'}
                    </label>
                  </div>
                  {technicalForm.video_url && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: 700 }}>✓ Attached Video Preview:</span>
                        <span style={{ fontSize: '12px', color: '#475569', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{technicalForm.video_url}</span>
                      </div>
                      <video src={technicalForm.video_url} controls style={{ width: '100%', borderRadius: '12px', background: '#0F172A', maxHeight: '200px', display: 'block', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    </div>
                  )}
                </div> */}
              </div>

              <div className="ai-form-field">
                <label>Technical Session Notes & Reflections</label>
                <textarea rows="3" value={technicalForm.session_notes} onChange={(e) => setTechnicalForm({ ...technicalForm, session_notes: e.target.value })} placeholder="e.g. Bottom turns felt clean, but pop-up timing on late drops was slightly sluggish." required></textarea>
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting Log...' : 'Submit Technical Session'}
              </button>
            </form>
          </div>
        )}

        {/* Mental Form Tab */}
        {activeTab === 'mental' && (
          <div className="ai-form-card glass">
            <h2 className="ai-form-title">🧠 Mental Performance Diagnostic</h2>
            <form onSubmit={handleMentalSubmit} className="ai-form">
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
                {submitting ? 'Submitting Log...' : 'Submit Mental Readiness Log'}
              </button>
            </form>
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
          margin-bottom: 16px;
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
      `}</style>
    </div>
  );
};

export default AthleteIntelligence;
