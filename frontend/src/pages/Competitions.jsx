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

  // AquaticX Multi-Surfer Heat Engine States
  const [selectedSlot, setSelectedSlot] = useState('All');
  const [heatSize, setHeatSize] = useState(4);
  const [aquaticxHeats, setAquaticxHeats] = useState([]);
  const [activeAquaticxHeatIndex, setActiveAquaticxHeatIndex] = useState(0);
  const [scoreSurferId, setScoreSurferId] = useState('');
  const [scoreWaveVal, setScoreWaveVal] = useState(6.5);
  const [aquaticxTimer, setAquaticxTimer] = useState(20 * 60);
  const [aquaticxTimerRunning, setAquaticxTimerRunning] = useState(false);

  useEffect(() => {
    let interval = null;
    if (aquaticxTimerRunning && aquaticxTimer > 0) {
      interval = setInterval(() => {
        setAquaticxTimer(t => t - 1);
      }, 1000);
    } else if (aquaticxTimer === 0 && aquaticxTimerRunning) {
      setAquaticxTimerRunning(false);
      showToast('⏰ Heat Time is Up! Horn Sounding 🚨');
    }
    return () => clearInterval(interval);
  }, [aquaticxTimerRunning, aquaticxTimer]);

  const handleGenerateAquaticXHeats = () => {
    let competitorRoster = [];
    const slotFilteredStudents = students.filter(s => 
      selectedSlot === 'All' || s.session_time === selectedSlot
    );

    slotFilteredStudents.forEach((st) => {
      competitorRoster.push({
        id: `st_${st.id}`,
        name: st.name,
        type: 'Student',
        email: st.email || '',
        whatsapp_number: st.whatsapp_number || '',
        waves: [],
        top2Total: 0
      });

      if (Array.isArray(st.guests_details) && st.guests_details.length > 0) {
        st.guests_details.forEach((g, gIdx) => {
          if (g.name && g.name.trim()) {
            competitorRoster.push({
              id: `guest_${st.id}_${gIdx}`,
              name: `${g.name.trim()} (Guest of ${st.name.split(' ')[0]})`,
              type: 'Guest',
              email: g.email || '',
              whatsapp_number: g.whatsapp_number || '',
              waves: [],
              top2Total: 0
            });
          }
        });
      } else if (st.guests_count > 1) {
        for (let i = 1; i < st.guests_count; i++) {
          competitorRoster.push({
            id: `guest_${st.id}_${i}`,
            name: `Guest #${i} of ${st.name.split(' ')[0]}`,
            type: 'Guest',
            email: '',
            whatsapp_number: st.whatsapp_number || '',
            waves: [],
            top2Total: 0
          });
        }
      }
    });

    if (competitorRoster.length === 0) {
      showToast('No students or guests found for this session slot.');
      return;
    }

    const JERSEY_COLORS = [
      { name: 'Red', hex: '#EF4444', badge: '🔴 RED' },
      { name: 'Blue', hex: '#3B82F6', badge: '🔵 BLUE' },
      { name: 'Yellow', hex: '#F59E0B', badge: '🟡 YELLOW' },
      { name: 'Green', hex: '#10B981', badge: '🟢 GREEN' },
      { name: 'White', hex: '#E2E8F0', badge: '⚪ WHITE' },
    ];

    const generated = [];
    let heatNum = 1;
    for (let i = 0; i < competitorRoster.length; i += heatSize) {
      const chunk = competitorRoster.slice(i, i + heatSize);
      const surfersInHeat = chunk.map((c, idx) => ({
        ...c,
        jersey: JERSEY_COLORS[idx % JERSEY_COLORS.length]
      }));

      generated.push({
        heatId: `heat_${heatNum}`,
        heatName: `Heat ${heatNum}`,
        division: selectedSlot === 'All' ? "All Session Slots" : selectedSlot,
        surfers: surfersInHeat,
        status: 'Active'
      });
      heatNum++;
    }

    setAquaticxHeats(generated);
    setActiveAquaticxHeatIndex(0);
    if (generated[0]?.surfers[0]) {
      setScoreSurferId(generated[0].surfers[0].id);
    }
    showToast(`⚡ Generated ${generated.length} Heats for ${competitorRoster.length} Competitors (Students + Guests)!`);
  };

  const handleLogAquaticXWave = (e) => {
    e.preventDefault();
    if (!aquaticxHeats.length) return;
    const currentHeat = aquaticxHeats[activeAquaticxHeatIndex];
    if (!currentHeat) return;

    const waveScore = parseFloat(scoreWaveVal);
    if (isNaN(waveScore)) return;

    const updatedHeats = aquaticxHeats.map((h, hIdx) => {
      if (hIdx !== activeAquaticxHeatIndex) return h;
      const updatedSurfers = h.surfers.map((s) => {
        if (s.id !== scoreSurferId) return s;
        const newWaves = [...s.waves, waveScore];
        const sorted = [...newWaves].sort((a, b) => b - a);
        const top2 = (sorted[0] || 0) + (sorted[1] || 0);
        return {
          ...s,
          waves: newWaves,
          top2Total: parseFloat(top2.toFixed(2))
        };
      });

      updatedSurfers.sort((a, b) => b.top2Total - a.top2Total);

      return {
        ...h,
        surfers: updatedSurfers
      };
    });

    setAquaticxHeats(updatedHeats);
    showToast(`Logged Wave Score ${waveScore.toFixed(1)}!`);
  };

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
            <h1 className="cmp-title" style={{ color: '#0F172A', fontSize: '32px', fontWeight: 800, margin: 0, textAlign: 'left' }}>Competitions Hub</h1>
            <p style={{ color: '#475569', fontSize: '14px', margin: '4px 0 0 0' }}>Track live WSL heats or run mock heat scoring simulations for athletes.</p>
          </div>
          <div className="cmp-tab-switcher">
            <button className={`cmp-tab-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
              🏆 Live Events
            </button>
            <button className={`cmp-tab-btn ${activeTab === 'aquaticx' ? 'active' : ''}`} onClick={() => setActiveTab('aquaticx')}>
              🏄 AquaticX Multi-Surfer Heats
            </button>
            <button className={`cmp-tab-btn ${activeTab === 'mock-heat' ? 'active' : ''}`} onClick={() => setActiveTab('mock-heat')}>
              ⏱️ Solo Mock Heat
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

        {/* Tab 2: AquaticX Multi-Surfer Heat Engine */}
        {activeTab === 'aquaticx' && (
          <div className="mock-heat-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="card-dark" style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', marginBottom: '24px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px' }}>🏄</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#F8FAFC' }}>AquaticX Multi-Surfer Heat Engine</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94A3B8' }}>
                    Automatically generate heats for all registered students and their accompanying guests (up to 10 guests per student) for any session slot or division.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', marginTop: '20px', alignItems: 'flex-end' }}>
                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Select Session Slot / Division</label>
                  <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '13px' }}>
                    <option value="All">All Registered Students & Guests</option>
                    <option value="Morning 6:00 AM">Morning 6:00 AM (Dawn Patrol)</option>
                    <option value="Morning 8:00 AM">Morning 8:00 AM</option>
                    <option value="Evening 4:00 PM">Evening 4:00 PM</option>
                  </select>
                </div>

                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Surfers per Heat</label>
                  <select value={heatSize} onChange={e => setHeatSize(parseInt(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '13px' }}>
                    <option value={4}>4 Surfers / Heat (Red, Blue, Yellow, Green)</option>
                    <option value={3}>3 Surfers / Heat</option>
                    <option value={2}>2 Surfers / Heat (Man-on-Man)</option>
                  </select>
                </div>

                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #00D1B2 0%, #00F2FE 100%)',
                    color: '#0B0E17',
                    fontWeight: 800,
                    fontSize: '13px',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    height: '44px',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={handleGenerateAquaticXHeats}
                >
                  ⚡ Auto-Generate AquaticX Heats
                </button>
              </div>
            </div>

            {/* Generated Heats Dashboard & Scoring Console */}
            {aquaticxHeats.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', marginTop: '20px' }}>
                {/* Left Column: Heat Selector Cards */}
                <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#F8FAFC', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📋 Heat Schedule
                    </h3>
                    <span style={{ fontSize: '11px', background: 'rgba(0, 242, 254, 0.15)', color: '#00F2FE', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      {aquaticxHeats.length} Heats
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {aquaticxHeats.map((h, hIdx) => {
                      const isActive = activeAquaticxHeatIndex === hIdx;
                      return (
                        <button
                          key={h.heatId}
                          type="button"
                          onClick={() => {
                            setActiveAquaticxHeatIndex(hIdx);
                            if (h.surfers[0]) setScoreSurferId(h.surfers[0].id);
                          }}
                          style={{
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: isActive ? '2px solid #00F2FE' : '1px solid rgba(255,255,255,0.06)',
                            background: isActive ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'rgba(255,255,255,0.02)',
                            boxShadow: isActive ? '0 0 15px rgba(0, 242, 254, 0.2)' : 'none',
                            color: '#FFF',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: isActive ? '#00F2FE' : '#F8FAFC' }}>{h.heatName}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{h.surfers.length} Surfers · {h.division}</div>
                          </div>
                          <span style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            background: isActive ? '#00F2FE' : 'rgba(255,255,255,0.08)',
                            color: isActive ? '#0B0E17' : '#94A3B8',
                            fontWeight: 800,
                            letterSpacing: '0.5px'
                          }}>
                            {isActive ? '● LIVE' : 'READY'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Live Heat Scoreboard & Surfer Scorecards */}
                <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                  {/* Heat Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          ● LIVE COMPETITION HEAT
                        </span>
                      </div>
                      <h2 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 800, color: '#FFF' }}>
                        {aquaticxHeats[activeAquaticxHeatIndex]?.heatName} — {aquaticxHeats[activeAquaticxHeatIndex]?.division}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Heat Countdown Clock */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>HEAT TIMER</div>
                        <div style={{
                          fontSize: '26px',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          color: aquaticxTimerRunning ? '#00F2FE' : '#F59E0B',
                          letterSpacing: '1px',
                          lineHeight: 1
                        }}>
                          {formatTime(aquaticxTimer)}
                        </div>
                      </div>

                      {/* Control Buttons: Start ▶, Pause ⏸, Stop ⏹ */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {!aquaticxTimerRunning ? (
                          <button
                            type="button"
                            onClick={() => setAquaticxTimerRunning(true)}
                            style={{
                              background: 'rgba(16, 185, 129, 0.2)',
                              border: '1px solid rgba(16, 185, 129, 0.5)',
                              color: '#10B981',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            ▶ Start
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAquaticxTimerRunning(false)}
                            style={{
                              background: 'rgba(245, 158, 11, 0.2)',
                              border: '1px solid rgba(245, 158, 11, 0.5)',
                              color: '#F59E0B',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            ⏸ Pause
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setAquaticxTimerRunning(false);
                            setAquaticxTimer(20 * 60);
                            showToast('⏹ Heat Timer Reset to 20:00');
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            color: '#EF4444',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ⏹ Stop
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Surfer Scorecards List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                    {aquaticxHeats[activeAquaticxHeatIndex]?.surfers.map((s, rankIdx) => {
                      const isSelected = scoreSurferId === s.id;
                      const isAdvancing = rankIdx < 2;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setScoreSurferId(s.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: isSelected ? '2px solid #00F2FE' : '1px solid rgba(255,255,255,0.06)',
                            background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Rank & Jersey */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'center', minWidth: '32px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 900, color: isAdvancing ? '#10B981' : '#64748B' }}>
                                #{rankIdx + 1}
                              </span>
                              {isAdvancing && (
                                <div style={{ fontSize: '9px', color: '#10B981', fontWeight: 800, marginTop: '-2px' }}>ADVANCES</div>
                              )}
                            </div>

                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: s.jersey?.hex || '#64748B',
                              color: '#FFF',
                              fontWeight: 900,
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                              boxShadow: `0 2px 8px ${s.jersey?.hex || '#000'}40`
                            }}>
                              {s.jersey?.badge}
                            </span>

                            <div>
                              <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF' }}>{s.name}</div>
                              <span style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: s.type === 'Guest' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                                color: s.type === 'Guest' ? '#F59E0B' : '#00F2FE',
                                fontWeight: 700,
                                display: 'inline-block',
                                marginTop: '2px'
                              }}>
                                {s.type}
                              </span>
                            </div>
                          </div>

                          {/* Waves Logged & Top 2 Total */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>WAVES LOGGED</div>
                              {s.waves.length === 0 ? (
                                <span style={{ color: '#475569', fontSize: '12px', fontStyle: 'italic' }}>No waves yet</span>
                              ) : (
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                  {s.waves.map((w, wIdx) => (
                                    <span key={wIdx} style={{
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      background: 'rgba(255,255,255,0.08)',
                                      color: '#F8FAFC',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                      {w.toFixed(1)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: 'right', minWidth: '70px' }}>
                              <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>HEAT TOTAL</div>
                              <div style={{ fontSize: '20px', fontWeight: 900, color: '#00F2FE', lineHeight: '1.2' }}>
                                {s.top2Total.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Judge Wave Scoring Control Console */}
                  <form onSubmit={handleLogAquaticXWave} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '13px', color: '#00F2FE', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ✍️ Judge Live Wave Scoring Input
                      </h4>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" onClick={() => setScoreWaveVal(5.0)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}>+5.0 Avg</button>
                        <button type="button" onClick={() => setScoreWaveVal(7.5)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}>+7.5 Good</button>
                        <button type="button" onClick={() => setScoreWaveVal(9.0)} style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10B981', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 800 }}>+9.0 Excellent!</button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11px', color: '#CBD5E1', marginBottom: '4px', display: 'block', fontWeight: 700 }}>Select Surfer in Active Heat</label>
                        <select value={scoreSurferId} onChange={e => setScoreSurferId(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '13px', width: '100%', fontWeight: 700 }}>
                          {aquaticxHeats[activeAquaticxHeatIndex]?.surfers.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.jersey?.badge} - {s.name} ({s.top2Total.toFixed(2)} pts)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11px', color: '#CBD5E1', marginBottom: '4px', display: 'block', fontWeight: 700 }}>Wave Score (0.0 - 10.0)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={scoreWaveVal}
                          onChange={e => setScoreWaveVal(e.target.value)}
                          style={{ padding: '10px 12px', borderRadius: '8px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '13px', width: '100%', fontWeight: 800 }}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        style={{
                          background: 'linear-gradient(135deg, #00D1B2 0%, #00F2FE 100%)',
                          color: '#0B0E17',
                          fontWeight: 900,
                          fontSize: '13px',
                          padding: '0 24px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          height: '42px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 0 12px rgba(0, 242, 254, 0.3)'
                        }}
                      >
                        ⚡ Log Wave Score
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Solo Mock Heat Engine */}
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
