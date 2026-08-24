import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const Competitions = () => {
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'mock-heat'
  const [data, setData] = useState({
    upcomingEvents: [],
    heatCompetitors: [],
    pastResults: []
  });
  const [loading, setLoading] = useState(true);

  // Students list for Mock Heat Setup
  const [students, setStudents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Mock Heat Form/Active state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [heatDuration, setHeatDuration] = useState(20); // mins
  const [strategyFocus, setStrategyFocus] = useState('');
  const [activeHeat, setActiveHeat] = useState(null); // active heat object

  // Live simulation states
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [priorityStatus, setPriorityStatus] = useState('Athlete');
  const [waveProgression, setWaveProgression] = useState([]);
  const [wavesList, setWavesList] = useState([]);

  // Scoring controls
  const [judgeScore, setJudgeScore] = useState(6.0);
  const [judgeNotes, setJudgeNotes] = useState('');
  const [submittingWave, setSubmittingWave] = useState(false);

  // Complete & AI analysis states
  const [strategyExecution, setStrategyExecution] = useState('');
  const [completingHeat, setCompletingHeat] = useState(false);
  const [analyzingHeat, setAnalyzingHeat] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null); // { tactical_strengths: [], tactical_weaknesses: [], coaching_advice: "" }

  const [toastMsg, setToastMsg] = useState('');

  // Fetch initial competitions data & students list
  useEffect(() => {
    // 1. Fetch competitions
    fetch(`${API}/api/competitions/data`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load competitions:', err);
        setLoading(false);
      });

    // 2. Fetch student list for setup dropdown
    fetch(`${API}/api/students`)
      .then(res => res.json())
      .then(data => {
        setStudents(data);
        if (data.length > 0) {
          setSelectedStudentId(data[0].id.toString());
        }
      })
      .catch(() => {});

    // 3. Load user context
    const saved = sessionStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setCurrentUser(u);
        if (u.role === 'athlete' && u.student_id) {
          setSelectedStudentId(u.student_id.toString());
        }
      } catch (e) {}
    }
  }, []);

  // Poll/Check if the selected student already has an active mock heat running
  const checkActiveMockHeat = (studentId) => {
    if (!studentId) return;
    fetch(`${API}/api/mock-heats/active/${studentId}`)
      .then(res => res.json())
      .then(d => {
        if (d.active) {
          setActiveHeat(d);
          setPriorityStatus(d.priority_status);
          setWaveProgression(d.wave_progression || []);
          setWavesList(d.waves || []);
          // Restore visual countdown
          setTimeRemaining(d.duration_mins * 60);
          setAiAnalysis(null);
          setStrategyExecution('');
        } else {
          setActiveHeat(null);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (selectedStudentId) {
      checkActiveMockHeat(selectedStudentId);
    }
  }, [selectedStudentId, activeTab]);

  // Live Timer tick effect
  useEffect(() => {
    let interval = null;
    if (activeHeat && timeRemaining > 0 && !isTimerPaused) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && activeHeat && !isTimerPaused) {
      showToast('Heat time is up! Log final reflections.');
    }
    return () => clearInterval(interval);
  }, [activeHeat, timeRemaining, isTimerPaused]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Get timestamp string (time remaining)
  const getTimerTimestamp = () => {
    return formatTime(timeRemaining) + ' remaining';
  };

  // API Call: Start mock heat
  const handleStartMockHeat = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    try {
      const coachId = currentUser?.instructor_id || currentUser?.id || 1;
      const res = await fetch(`${API}/api/mock-heats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: parseInt(selectedStudentId),
          coach_id: parseInt(coachId),
          duration_mins: parseInt(heatDuration),
          strategy_focus: strategyFocus
        })
      });
      if (res.ok) {
        const d = await res.json();
        showToast('🚀 Mock Heat Started!');
        // Refresh and load heat state
        checkActiveMockHeat(selectedStudentId);
      } else {
        showToast('Error starting mock heat.');
      }
    } catch (err) {
      showToast('Connection error starting mock heat.');
    }
  };

  // API Call: Log wave score
  const handleLogWave = async (e) => {
    e.preventDefault();
    if (!activeHeat) return;
    setSubmittingWave(true);
    try {
      const res = await fetch(`${API}/api/mock-heats/${activeHeat.id}/waves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: parseFloat(judgeScore),
          notes: judgeNotes,
          timestamp: getTimerTimestamp()
        })
      });
      if (res.ok) {
        const d = await res.json();
        showToast(`Wave score ${judgeScore} logged!`);
        setJudgeNotes('');
        setJudgeScore(6.0);
        // Refresh active heat layout
        checkActiveMockHeat(selectedStudentId);
      } else {
        showToast('Error saving wave score.');
      }
    } catch (err) {
      showToast('Connection error saving wave.');
    } finally {
      setSubmittingWave(false);
    }
  };

  // API Call: Toggle priority
  const handleTogglePriority = async () => {
    if (!activeHeat) return;
    try {
      const res = await fetch(`${API}/api/mock-heats/${activeHeat.id}/priority`, {
        method: 'POST'
      });
      if (res.ok) {
        const d = await res.json();
        setPriorityStatus(d.priority_status);
        checkActiveMockHeat(selectedStudentId);
        showToast(`Priority: ${d.priority_status}`);
      }
    } catch (e) {}
  };

  // API Call: End/Complete mock heat
  const handleCompleteMockHeat = async () => {
    if (!activeHeat) return;
    setCompletingHeat(true);
    try {
      const res = await fetch(`${API}/api/mock-heats/${activeHeat.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_execution: strategyExecution
        })
      });
      if (res.ok) {
        showToast('Heat completed & synced to student profile! 🎉');
        // Trigger AI analysis next
        handleRunAIAnalysis();
      } else {
        showToast('Error completing heat.');
        setCompletingHeat(false);
      }
    } catch (err) {
      showToast('Connection error completing heat.');
      setCompletingHeat(false);
    }
  };

  // API Call: Run AI Tactical Analysis
  const handleRunAIAnalysis = async () => {
    if (!activeHeat) return;
    setAnalyzingHeat(true);
    try {
      const res = await fetch(`${API}/api/mock-heats/${activeHeat.id}/analyze`, {
        method: 'POST'
      });
      if (res.ok) {
        const d = await res.json();
        setAiAnalysis(d);
        showToast('AI analysis generated successfully!');
      } else {
        showToast('Error generating AI analysis.');
      }
    } catch (err) {
      showToast('Connection error loading AI analysis.');
    } finally {
      setCompletingHeat(false);
      setAnalyzingHeat(false);
    }
  };

  // Clear states to start a new heat
  const handleResetArena = () => {
    setActiveHeat(null);
    setAiAnalysis(null);
    setStrategyExecution('');
    setStrategyFocus('');
    setWavesList([]);
    setWaveProgression([]);
  };

  const { upcomingEvents = [], heatCompetitors = [], pastResults = [] } = data || {};
  const visibleUpcomingEvents = upcomingEvents.filter(
    (ev) => !['heat drawn', 'finished', 'finished - result published', 'live', 'ongoing'].includes((ev.status || '').toLowerCase())
  );

  return (
    <div className="cmp-page">
      <Sidebar />
      <main className="cmp-main">
        {/* Toast Toast notification */}
        {toastMsg && (
          <div className="cmp-toast">
            {toastMsg}
          </div>
        )}

        {/* Top Header & Tab Switcher */}
        <header className="cmp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="cmp-title">Competitions Hub</h1>
            <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>Track live WSL heats or run mock heat scoring simulations for athletes.</p>
          </div>
          <div className="cmp-tab-switcher">
            <button className={`cmp-tab-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
              🏆 Live Events
            </button>
            <button className={`cmp-tab-btn ${activeTab === 'mock-heat' ? 'active' : ''}`} onClick={() => setActiveTab('mock-heat')}>
              ⏱️ Mock Heat Engine
            </button>
          </div>
        </header>

        {/* Tab 1: Live Heats & Schedules */}
        {activeTab === 'live' && (
          <div className="cmp-layout">
            {/* Left Column: Upcoming Events */}
            <div className="cmp-col-left">
              <h2 className="cmp-section-title">Upcoming Events</h2>
              
              <div className="cmp-events-list">
                {visibleUpcomingEvents.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px', padding: '16px 0' }}>No upcoming registration events</div>
                ) : (
                  visibleUpcomingEvents.map((event) => (
                    <div key={event.id} className="cmp-event-card">

                    <div className="cmp-event-info">
                      <div className="cmp-event-name">{event.name}</div>
                      <div className="cmp-event-loc">{event.locationDate}</div>
                      
                      <div className="cmp-badges">
                        {event.badges && event.badges.map((badge, index) => (
                          <span 
                            key={index} 
                            className="cmp-badge"
                            style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                          >
                            {badge.text}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="cmp-btn-register">Register Now</button>
                  </div>
                )))}
              </div>

            </div>

            {/* Right Column: Live & History */}
            <div className="cmp-col-right">
              {data.hasLiveEvent ? (
                <div className="cmp-live-card">
                  <div className="cmp-live-header-row">
                    <div className="cmp-live-titles">
                      <span className="cmp-live-badge">LIVE COMPETITION</span>
                      <h1 className="cmp-live-main-title">{data.liveEventName}</h1>
                      <p className="cmp-live-sub">{data.liveEventLocation}</p>
                    </div>
                    
                    <div className="cmp-live-countdown">
                      <span className="cmp-countdown-label">HEAT COUNTDOWN</span>
                      <div className="cmp-countdown-time">04:12:00</div>
                    </div>
                  </div>

                  <div className="cmp-heat-section">
                    <h3 className="cmp-heat-title">{data.liveHeatName}</h3>
                    
                    <div className="cmp-heat-table-wrapper">
                      <table className="cmp-heat-table">
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Competitor</th>
                            <th style={{ textAlign: 'right' }}>Rank</th>
                            <th style={{ textAlign: 'right' }}>Seed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {heatCompetitors.map((comp, i) => (
                            <tr key={i}>
                              <td style={{ textAlign: 'left', color: '#FFF' }}>{comp.name}</td>
                              <td style={{ textAlign: 'right', color: comp.highlight ? '#0D9488' : '#FFF' }}>{comp.rank}</td>
                              <td style={{ textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>{comp.seed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cmp-live-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '260px', textAlign: 'center' }}>
                  <span className="cmp-live-badge" style={{ marginBottom: '16px' }}>LIVE COMPETITION</span>
                  <h2 style={{ color: '#FFF', fontFamily: 'Outfit', fontSize: '24px', margin: '0 0 12px 0' }}>No Live Competitions</h2>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '15px' }}>
                    There are no active events running right now. <br />
                    Check the upcoming schedule on the left or view past history below!
                  </p>
                </div>
              )}

              {/* Competition History */}
              <div className="cmp-history-card">
                <h2 className="cmp-section-title">Competition History</h2>
                
                <div className="cmp-history-table-wrapper">
                  <table className="cmp-history-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>EVENT</th>
                        <th style={{ textAlign: 'right' }}>PLACEMENT</th>
                        <th style={{ textAlign: 'right' }}>SCORE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastResults.map((result, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: 'left', color: '#000' }}>{result.event}</td>
                          <td style={{ textAlign: 'right', color: result.highlightPlace ? '#F59E0B' : '#0F172A', fontWeight: '700' }}>{result.placement}</td>
                          <td style={{ textAlign: 'right', color: '#64748B' }}>{result.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Mock Heat Engine */}
        {activeTab === 'mock-heat' && (
          <div className="mock-heat-container">
            {/* Mode A: Setup Mock Heat Form */}
            {!activeHeat && !aiAnalysis && (
              <div className="mock-setup-card glass">
                <h2 className="mock-card-title">Setup Mock Heat</h2>
                <p className="mock-card-sub">Simulate official heat parameters to train priority positioning and wave logging tactical reflexes.</p>
                
                <form onSubmit={handleStartMockHeat} className="mock-form">
                  <div className="form-field">
                    <label>Select Surfer (Athlete)</label>
                    <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} required>
                      {currentUser?.role === 'athlete' ? (
                        <option value={currentUser.student_id}>{currentUser.name}</option>
                      ) : (
                        students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)
                      )}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-field" style={{ flex: 1 }}>
                      <label>Heat Duration (minutes)</label>
                      <select value={heatDuration} onChange={(e) => setHeatDuration(parseInt(e.target.value))} required>
                        <option value={10}>10 Minutes</option>
                        <option value={15}>15 Minutes</option>
                        <option value={20}>20 Minutes</option>
                        <option value={25}>25 Minutes</option>
                      </select>
                    </div>

                    <div className="form-field" style={{ flex: 1 }}>
                      <label>Priority Setting</label>
                      <select disabled value="Athlete">
                        <option value="Athlete">Athlete holds priority first</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Heat Strategy Focus / Notes</label>
                    <input 
                      type="text" 
                      value={strategyFocus} 
                      onChange={(e) => setStrategyFocus(e.target.value)}
                      placeholder="e.g. Wait for outside set waves; hold priority; target quick wave backups"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-start-heat">
                    🚀 Initialize & Start Live Heat
                  </button>
                </form>
              </div>
            )}

            {/* Mode B: Live Mock Heat Simulation Arena */}
            {activeHeat && !aiAnalysis && (
              <div className="live-arena-grid">
                {/* Scoreboard Vitals Header */}
                <div className="live-arena-header card-dark full-width">
                  <div className="live-arena-top-row">
                    <div className="live-arena-info">
                      <span className="live-badge-glow">HEAT ACTIVE</span>
                      <h2 className="live-athlete-name">
                        Surfer: {students.find(s => s.id.toString() === selectedStudentId.toString())?.name || 'Athlete'}
                      </h2>
                      <p className="live-strategy-tag">Strategy Focus: <strong>{activeHeat.strategy_focus || 'Open'}</strong></p>
                    </div>

                    {/* Heat Timer */}
                    <div className="live-timer-container">
                      <span className="timer-label">TIME REMAINING</span>
                      <div className="timer-digits digital-font">
                        {formatTime(timeRemaining)}
                      </div>
                      <div className="timer-controls">
                        <button className="btn-timer-toggle" onClick={() => setIsTimerPaused(!isTimerPaused)}>
                          {isTimerPaused ? '▶ Resume' : '⏸ Pause'}
                        </button>
                      </div>
                    </div>

                    {/* Live Heat Total (Top 2 waves) */}
                    <div className="live-total-score-card">
                      <span className="score-card-label">HEAT TOTAL (TOP 2)</span>
                      <div className="score-card-val">{activeHeat.heat_total} <span style={{ fontSize: '14px', color: '#94A3B8' }}>/ 20</span></div>
                      <span className="score-card-desc">{wavesList.length} waves logged</span>
                    </div>
                  </div>
                </div>

                {/* Left Column: Judge Scoring Interface */}
                <div className="live-panel live-scoring-panel glass">
                  <h3 className="panel-title">👨‍⚖️ Judge Scoring & Wave Logger</h3>
                  <p className="panel-sub">Score rides on a 1.0 - 10.0 scale in real-time. Comments automatically sync to athlete history.</p>

                  <form onSubmit={handleLogWave} className="live-scoring-form">
                    <div className="form-field">
                      <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Wave Score</span>
                        <strong style={{ fontSize: '18px', color: '#0D9488' }}>{judgeScore.toFixed(1)}</strong>
                      </label>
                      <input 
                        type="range" 
                        min="1.0" 
                        max="10.0" 
                        step="0.1" 
                        value={judgeScore}
                        onChange={(e) => setJudgeScore(parseFloat(e.target.value))}
                        className="scoring-slider"
                      />
                      <div className="slider-ticks">
                        <span>1.0 (Poor)</span>
                        <span>5.0 (Average)</span>
                        <span>8.0 (Good)</span>
                        <span>10.0 (Excellent)</span>
                      </div>
                    </div>

                    <div className="form-field">
                      <label>Wave Technical Notes</label>
                      <input 
                        type="text" 
                        value={judgeNotes} 
                        onChange={(e) => setJudgeNotes(e.target.value)}
                        placeholder="e.g. Sharp snap on open face, failed popup, clean bottom turn"
                        required
                      />
                    </div>

                    <button type="submit" className="btn-log-wave" disabled={submittingWave || timeRemaining === 0}>
                      {submittingWave ? 'Logging Wave...' : '🌊 Record Wave Score'}
                    </button>
                  </form>

                  <div className="priority-control-card">
                    <div className="priority-info">
                      <span className="priority-label">CURRENT PRIORITY</span>
                      <div className={`priority-value-tag ${priorityStatus.toLowerCase()}`}>
                        {priorityStatus === 'Athlete' ? 'Athlete Holds Priority 🥇' : 'Opponent Holds Priority 🥈'}
                      </div>
                    </div>
                    <button className="btn-toggle-priority" onClick={handleTogglePriority}>
                      Toggle Priority Status
                    </button>
                  </div>
                </div>

                {/* Right Column: Live Wave Feed */}
                <div className="live-panel live-feed-panel glass">
                  <h3 className="panel-title">📝 Live Wave & Heat Event Log</h3>
                  <p className="panel-sub">Chronological event stream synced from the scoring dashboard.</p>

                  <div className="live-events-feed">
                    {waveProgression.length === 0 ? (
                      <p className="empty-feed">No events logged yet. Catch a wave or adjust priority to start logging feed.</p>
                    ) : (
                      waveProgression.slice().reverse().map((item, idx) => (
                        <div key={idx} className="feed-item">
                          <span className="feed-timestamp">{item.time}</span>
                          <div className="feed-content">
                            <span className="feed-action">{item.action}</span>
                            {item.notes && <p className="feed-notes">"{item.notes}"</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="arena-footer-controls">
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748B' }}>Complete Simulation</h4>
                    <textarea 
                      rows="2" 
                      value={strategyExecution} 
                      onChange={(e) => setStrategyExecution(e.target.value)} 
                      placeholder="Evaluate strategy execution (e.g. Waited for sets successfully, but lost priority in second half)."
                      style={{ width: '100%', marginBottom: '12px' }}
                    />
                    <button 
                      className="btn-complete-heat" 
                      onClick={handleCompleteMockHeat} 
                      disabled={completingHeat}
                    >
                      {completingHeat ? 'Ending heat...' : '🏁 End Heat & Run AI Analysis'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mode C: AI Post-Heat Tactical Analysis Report */}
            {aiAnalysis && (
              <div className="mock-ai-report glass">
                <div className="report-header">
                  <span className="ai-report-badge">🤖 AI TACTICAL REPORT</span>
                  <h2 className="report-title">Mock Heat Tactical Evaluation</h2>
                  <p className="report-sub">Combined evaluation of strategy metrics, priority logs, and wave score progression.</p>
                </div>

                <div className="report-summary-vitals">
                  <div className="vital-metric">
                    <span className="vital-label">FINAL SCORE</span>
                    <span className="vital-val">{activeHeat?.heat_total || '0.0'}</span>
                  </div>
                  <div className="vital-metric">
                    <span className="vital-label">WAVES RIDDEN</span>
                    <span className="vital-val">{wavesList.length}</span>
                  </div>
                  <div className="vital-metric">
                    <span className="vital-label">BEST WAVE</span>
                    <span className="vital-val">
                      {wavesList.length > 0 ? Math.max(...wavesList.map(w => w.score)).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                <div className="report-findings-grid">
                  <div className="findings-col findings-strengths">
                    <h3>✅ Tactical Strengths</h3>
                    <ul>
                      {aiAnalysis.tactical_strengths.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="findings-col findings-weaknesses">
                    <h3>⚠️ Tactical Weaknesses</h3>
                    <ul>
                      {aiAnalysis.tactical_weaknesses.map((weak, idx) => (
                        <li key={idx}>{weak}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="coaching-advice-card">
                  <h4>💡 Coach Prescription & AI Target Drill</h4>
                  <p>{aiAnalysis.coaching_advice}</p>
                </div>

                <div className="report-actions">
                  <button className="btn-primary" onClick={handleResetArena}>
                    Reset Arena & Log Next Heat
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        .cmp-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .cmp-main { flex: 1; padding: 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }

        /* Header */
        .cmp-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #050B1A; margin: 0; line-height: 1.2; }

        /* Tab Switcher */
        .cmp-tab-switcher { display: flex; gap: 12px; background: #FFF; border: 1.5px solid #E2E8F0; padding: 6px; border-radius: 30px; }
        .cmp-tab-btn {
          border: none; background: transparent; padding: 8px 24px; border-radius: 20px; font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 700; color: #64748B; cursor: pointer; transition: all 0.2s ease;
        }
        .cmp-tab-btn.active {
          background: #0D9488; color: #FFFFFF; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
        }

        /* Layout */
        .cmp-layout { display: flex; gap: 32px; align-items: flex-start; }

        /* Left Column */
        .cmp-col-left { display: flex; flex-direction: column; gap: 20px; width: 340px; flex-shrink: 0; }
        .cmp-section-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #000; margin: 0; }
        
        .cmp-events-list { display: flex; flex-direction: column; gap: 16px; }
        .cmp-event-card {
          background: #FFFFFF; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0px 4px 16px rgba(5, 11, 26, 0.02);
          border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 16px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cmp-event-card:hover {
          transform: translateY(-4px);
          box-shadow: 0px 12px 32px rgba(5, 11, 26, 0.06);
          border-color: rgba(5, 11, 26, 0.08);
        }
        .cmp-event-info { display: flex; flex-direction: column; gap: 4px; }
        .cmp-event-name { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #000; }
        .cmp-event-loc { font-size: 12px; color: #64748B; }
        .cmp-badges { display: flex; gap: 8px; margin-top: 4px; }
        .cmp-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .cmp-btn-register {
          width: 100%; padding: 12px 0; background: #0D9488; border-radius: 10px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #FFF; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
        }
        .cmp-btn-register:hover {
          background: #0B7A70;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.4);
        }

        /* Right Column */
        .cmp-col-right { flex: 1; display: flex; flex-direction: column; gap: 24px; }

        /* Live Competition Card */
        .cmp-live-card {
          background: #050B1A; border: 1px solid rgba(226, 232, 240, 0.1); 
          box-shadow: 0px 24px 48px rgba(5, 11, 26, 0.15), inset 0 1px 1px rgba(255,255,255,0.05);
          border-radius: 24px; padding: 48px; display: flex; flex-direction: column; gap: 32px;
          position: relative; overflow: hidden;
        }
        .cmp-live-card::before {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, transparent 60%);
          pointer-events: none;
        }
        .cmp-live-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .cmp-live-titles { display: flex; flex-direction: column; gap: 8px; }
        .cmp-live-badge {
          display: inline-flex; align-items: center; justify-content: center; padding: 4px 8px; width: fit-content;
          background: rgba(13, 148, 136, 0.12); border-radius: 4px; color: #0D9488;
          font-size: 12px; font-weight: 700; text-transform: uppercase;
        }
        .cmp-live-main-title { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 700; color: #FFF; margin: 0; }
        .cmp-live-sub { font-size: 16px; color: rgba(255,255,255,0.6); margin: 0; }

        .cmp-live-countdown { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .cmp-countdown-label { font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase; }
        .cmp-countdown-time { font-family: 'Outfit', sans-serif; font-size: 40px; font-weight: 800; color: #F59E0B; line-height: 1; }

        .cmp-heat-section { display: flex; flex-direction: column; gap: 16px; }
        .cmp-heat-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #FFF; margin: 0; }
        
        .cmp-heat-table-wrapper { background: rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; }
        .cmp-heat-table { width: 100%; border-collapse: collapse; }
        .cmp-heat-table th {
          padding: 12px 16px; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.02);
        }
        .cmp-heat-table td {
          padding: 16px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.07);
          transition: background 0.2s ease;
        }
        .cmp-heat-table tr:hover td { background: rgba(255,255,255,0.03); }
        .cmp-heat-table tr:last-child td { border-bottom: none; }

        /* Competition History */
        .cmp-history-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; box-shadow: 0px 8px 24px rgba(0,0,0,0.03);
          border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 20px;
        }
        .cmp-history-table-wrapper { border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; }
        .cmp-history-table { width: 100%; border-collapse: collapse; }
        .cmp-history-table th {
          padding: 16px; font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase;
          background: #F8F6F2; border-bottom: 1px solid #E2E8F0;
        }
        .cmp-history-table td {
          padding: 16px; font-size: 14px; border-bottom: 1px solid #E2E8F0;
          transition: background 0.2s ease;
        }
        .cmp-history-table tr:hover td { background: rgba(248, 250, 252, 0.5); }
        .cmp-history-table tr:last-child td { border-bottom: none; }

        /* Toast Alert */
        .cmp-toast {
          position: fixed; top: 30px; right: 40px; padding: 16px 28px; border-radius: 12px;
          background: #0D9488; color: #FFF; font-weight: 700; font-size: 14px; z-index: 1050;
          box-shadow: 0px 8px 24px rgba(0,0,0,0.12); animation: toastFade 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes toastFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Mock Setup Card */
        .mock-setup-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; padding: 48px; max-width: 650px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
        .mock-card-title { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0; }
        .mock-card-sub { font-size: 14px; color: #64748B; margin: 0 0 32px 0; line-height: 1.5; }
        
        .mock-form { display: flex; flex-direction: column; gap: 20px; }
        .form-field { display: flex; flex-direction: column; gap: 8px; }
        .form-field label { font-size: 13px; font-weight: 700; color: #475569; }
        .mock-form select,
        .mock-form input,
        .arena-footer-controls textarea {
          padding: 14px; border: 1.5px solid #CBD5E1; border-radius: 12px; font-size: 14px; font-family: inherit; outline: none; background: #FFF; color: #0F172A;
        }
        .mock-form select:focus,
        .mock-form input:focus,
        .arena-footer-controls textarea:focus {
          border-color: #0D9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
        }
        .form-row { display: flex; gap: 20px; }
        .btn-start-heat {
          margin-top: 12px; padding: 16px; background: #0D9488; color: #FFF; font-family: 'Outfit', sans-serif;
          font-weight: 700; font-size: 15px; border-radius: 12px; border: none; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.25);
        }
        .btn-start-heat:hover { background: #0B7A70; transform: translateY(-1px); }

        /* Live Arena Grid */
        .live-arena-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 32px; }
        .full-width { grid-column: span 2; }
        .card-dark {
          background: #050B1A; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 32px;
          color: #FFF; position: relative; overflow: hidden;
        }
        .live-arena-top-row { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; }
        
        .live-badge-glow {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; font-size: 11px; font-weight: 800;
          color: #EF4444; background: rgba(239, 68, 68, 0.15); border-radius: 30px; letter-spacing: 0.5px;
          animation: pulseGlow 2s infinite; width: fit-content;
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        
        .live-athlete-name { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 700; margin: 8px 0 4px 0; }
        .live-strategy-tag { font-size: 13px; color: rgba(255,255,255,0.6); margin: 0; }

        /* Live Timer digits */
        .live-timer-container { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .timer-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); letter-spacing: 1px; }
        .timer-digits { font-size: 48px; font-weight: 800; color: #F59E0B; font-family: monospace; letter-spacing: 1px; line-height: 1; }
        .timer-controls { margin-top: 8px; }
        .btn-timer-toggle {
          border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); padding: 6px 14px;
          border-radius: 20px; color: #FFF; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .btn-timer-toggle:hover { background: rgba(255,255,255,0.15); }

        /* Score Card */
        .live-total-score-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 18px 24px; min-width: 180px; text-align: center; }
        .score-card-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); }
        .score-card-val { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; color: #FFF; margin: 4px 0; }
        .score-card-desc { font-size: 12px; color: #94A3B8; }

        /* Panels */
        .live-panel { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.01); }
        .panel-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0F172A; margin: 0; }
        .panel-sub { font-size: 13px; color: #64748B; margin: 0 0 8px 0; line-height: 1.4; }

        .live-scoring-form { display: flex; flex-direction: column; gap: 20px; }
        .scoring-slider {
          -webkit-appearance: none; width: 100%; height: 8px; border-radius: 4px; background: #E2E8F0; outline: none; margin: 12px 0 6px 0;
        }
        .scoring-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #0D9488; cursor: pointer;
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.4); transition: transform 0.1s;
        }
        .scoring-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
        
        .slider-ticks { display: flex; justify-content: space-between; font-size: 11px; color: #64748B; font-weight: 600; }
        .btn-log-wave {
          padding: 14px; background: #0D9488; color: #FFF; font-family: 'Outfit', sans-serif; font-weight: 700;
          font-size: 14px; border-radius: 10px; border: none; cursor: pointer; transition: background 0.2s;
        }
        .btn-log-wave:hover { background: #0B7A70; }

        /* Priority block */
        .priority-control-card {
          margin-top: 12px; background: #F8FAFC; border: 1.5px dashed #E2E8F0; border-radius: 16px; padding: 20px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .priority-info { display: flex; flex-direction: column; gap: 4px; }
        .priority-label { font-size: 11px; font-weight: 700; color: #64748B; }
        .priority-value-tag { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; }
        .priority-value-tag.athlete { color: #0D9488; }
        .priority-value-tag.opponent { color: #F59E0B; }
        
        .btn-toggle-priority {
          padding: 10px 16px; background: #FFF; border: 1.5px solid #CBD5E1; font-weight: 700; font-size: 12px;
          border-radius: 10px; cursor: pointer; transition: all 0.2s; color: #334155;
        }
        .btn-toggle-priority:hover { background: #F1F5F9; border-color: #94A3B8; }

        /* Live Feed events */
        .live-feed-panel { max-height: 560px; }
        .live-events-feed {
          flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-right: 8px; min-height: 180px;
          border: 1px solid #F1F5F9; background: #FAF9F6; border-radius: 16px; padding: 16px;
        }
        .empty-feed { font-size: 13px; color: #94A3B8; text-align: center; margin-top: 40px; }
        .feed-item { display: flex; gap: 12px; align-items: flex-start; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px; }
        .feed-item:last-child { border-bottom: none; }
        .feed-timestamp { font-size: 11px; font-weight: 700; color: #F59E0B; font-family: monospace; background: #FEF3C7; padding: 2px 6px; border-radius: 4px; }
        .feed-content { display: flex; flex-direction: column; gap: 2px; }
        .feed-action { font-size: 13px; font-weight: 600; color: #0F172A; }
        .feed-notes { font-size: 12px; color: #64748B; font-style: italic; margin: 2px 0 0 0; }

        .arena-footer-controls { margin-top: 12px; border-top: 1px solid #E2E8F0; padding-top: 16px; }
        .btn-complete-heat {
          width: 100%; padding: 14px; background: #F43F5E; color: #FFF; font-family: 'Outfit', sans-serif;
          font-weight: 700; font-size: 14px; border-radius: 10px; border: none; cursor: pointer; transition: background 0.2s;
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.2);
        }
        .btn-complete-heat:hover { background: #E11D48; }

        /* AI Report view */
        .mock-ai-report { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; padding: 48px; max-width: 750px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
        .ai-report-badge { padding: 4px 10px; font-size: 11px; font-weight: 800; color: #7C3AED; background: rgba(124, 58, 237, 0.1); border-radius: 4px; width: fit-content; margin-bottom: 12px; display: block; }
        .report-header { margin-bottom: 32px; }
        .report-title { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0; }
        .report-sub { font-size: 14px; color: #64748B; margin: 0; }

        .report-summary-vitals { display: flex; gap: 16px; margin-bottom: 32px; }
        .vital-metric { flex: 1; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 16px; text-align: center; }
        .vital-label { font-size: 11px; font-weight: 700; color: #64748B; display: block; margin-bottom: 6px; }
        .vital-val { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; color: #0F172A; }

        .report-findings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .findings-col { background: #FAF9F6; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; }
        .findings-col h3 { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; margin: 0 0 16px 0; }
        .findings-strengths h3 { color: #0D9488; }
        .findings-weaknesses h3 { color: #EF4444; }
        
        .findings-col ul { padding-left: 20px; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .findings-col li { font-size: 13px; color: #334155; line-height: 1.5; font-weight: 500; }

        .coaching-advice-card { background: rgba(13, 148, 136, 0.06); border: 1px solid rgba(13, 148, 136, 0.15); border-radius: 16px; padding: 24px; margin-bottom: 32px; }
        .coaching-advice-card h4 { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #0D9488; margin: 0 0 8px 0; }
        .coaching-advice-card p { font-size: 13px; color: #334155; margin: 0; line-height: 1.6; font-weight: 500; }

        .report-actions { display: flex; justify-content: center; }
      `}</style>
    </div>
  );
};

export default Competitions;
