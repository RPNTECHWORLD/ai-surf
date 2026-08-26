import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const Competitions = () => {
  const [activeTab, setActiveTab] = useState('aquaticx'); // 'aquaticx', 'live', 'mock-heat'
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
  const [selectedDate, setSelectedDate] = useState('All');
  const [selectedRound, setSelectedRound] = useState('All');
  const [heatSize, setHeatSize] = useState('auto');
  const [aquaticxHeats, setAquaticxHeats] = useState([]);
  const [activeAquaticxHeatIndex, setActiveAquaticxHeatIndex] = useState(0);
  const [scoreSurferId, setScoreSurferId] = useState('');
  const [scoreWaveVal, setScoreWaveVal] = useState(6.5);
  const [aquaticxTimer, setAquaticxTimer] = useState(20 * 60);
  const [aquaticxTimerRunning, setAquaticxTimerRunning] = useState(false);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [showLiveScorecardModal, setShowLiveScorecardModal] = useState(false);
  const [editingHeatModal, setEditingHeatModal] = useState(null);
  const [aquaticSubTab, setAquaticSubTab] = useState('heats'); // 'events' | 'competitors' | 'heats' | 'judge' | 'results' | 'analytics'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'schedule'
  const [showCreateHeatModal, setShowCreateHeatModal] = useState(false);
  const [newHeatForm, setNewHeatForm] = useState({ heatName: '', round: 'Round 1', division: 'Men\'s Open', surferIds: [] });

  // Assigned Coaches State (School / Individual Coach management)
  const [assignedCoaches, setAssignedCoaches] = useState(() => {
    try {
      const saved = localStorage.getItem('assigned_coaches');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [assigningStudent, setAssigningStudent] = useState(null);
  const [selectedCoachName, setSelectedCoachName] = useState('Coach Alex');
  const [heatHistoryList, setHeatHistoryList] = useState(() => {
    try {
      const saved = localStorage.getItem('aquaticx_heat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const saveHeatHistory = (record) => {
    try {
      const existing = localStorage.getItem('aquaticx_heat_history');
      const historyList = existing ? JSON.parse(existing) : [];
      historyList.unshift(record);
      localStorage.setItem('aquaticx_heat_history', JSON.stringify(historyList));
      setHeatHistoryList(historyList);
    } catch (err) {
      console.error(err);
    }
  };

  // Join Requests State for Direct Signups without Invite Link
  const [joinRequests, setJoinRequests] = useState(() => {
    try {
      const saved = localStorage.getItem('school_join_requests');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleApproveJoinRequest = (reqId) => {
    const req = joinRequests.find(r => r.id === reqId);
    if (!req) return;

    const updatedReqs = joinRequests.map(r => r.id === reqId ? { ...r, status: 'approved' } : r);
    setJoinRequests(updatedReqs);
    try { localStorage.setItem('school_join_requests', JSON.stringify(updatedReqs)); } catch (e) {}

    // Approve student in active students roster
    setStudents(prev => prev.map(s => (s.id === req.student_id || s.email === req.student_email) ? { ...s, approval_status: 'approved' } : s));
    showToast(`✅ Approved ${req.student_name} to join ${req.school_name}!`);
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all heats, competitor logs, join requests, and history? Clean slate ready for fresh data.')) {
      try {
        localStorage.removeItem('aquaticx_heats');
        localStorage.removeItem('aquaticx_heat_history');
        localStorage.removeItem('assigned_coaches');
        localStorage.removeItem('school_join_requests');
        localStorage.removeItem('mock_heats');
      } catch (e) {}

      setAquaticxHeats([]);
      setHeatHistoryList([]);
      setAssignedCoaches({});
      setJoinRequests([]);

      window.dispatchEvent(new Event('storage'));
      showToast('🧹 All demo heats and history cleared! Clean slate ready for fresh data.');
    }
  };

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

  const handleGenerateAquaticXHeats = (notify = true) => {
    const slotFilteredStudents = students.filter(s => {
      const matchSlot = selectedSlot === 'All' || s.session_time === selectedSlot;
      const matchDate = selectedDate === 'All' || (s.start_date && s.start_date === selectedDate);
      return matchSlot && matchDate;
    });

    if (slotFilteredStudents.length === 0) {
      if (notify) showToast('No students or guests found for the selected session slot/date.');
      return;
    }

    // Group competitors strictly by (start_date + ' · ' + session_time) so different slots never mix!
    const slotGroups = {};
    slotFilteredStudents.forEach((st) => {
      const dateKey = st.start_date || '2026-08-26';
      const timeKey = st.session_time || 'Morning 6:00 AM';
      const groupKey = `${dateKey} · ${timeKey}`;

      if (!slotGroups[groupKey]) {
        slotGroups[groupKey] = [];
      }

      slotGroups[groupKey].push({
        id: `st_${st.id}`,
        name: st.name,
        type: 'Student',
        email: st.email || '',
        whatsapp_number: st.whatsapp_number || '',
        start_date: dateKey,
        session_time: timeKey,
        waves: [],
        top2Total: 0
      });

      if (Array.isArray(st.guests_details) && st.guests_details.length > 0) {
        st.guests_details.forEach((g, gIdx) => {
          if (g.name && g.name.trim()) {
            slotGroups[groupKey].push({
              id: `guest_${st.id}_${gIdx}`,
              name: `${g.name.trim()} (Guest of ${st.name.split(' ')[0]})`,
              type: 'Guest',
              email: g.email || '',
              whatsapp_number: st.whatsapp_number || '',
              start_date: dateKey,
              session_time: timeKey,
              waves: [],
              top2Total: 0
            });
          }
        });
      } else if (st.guests_count > 1) {
        for (let i = 1; i < st.guests_count; i++) {
          slotGroups[groupKey].push({
            id: `guest_${st.id}_${i}`,
            name: `Guest #${i} of ${st.name.split(' ')[0]}`,
            type: 'Guest',
            email: '',
            whatsapp_number: st.whatsapp_number || '',
            start_date: dateKey,
            session_time: timeKey,
            waves: [],
            top2Total: 0
          });
        }
      }
    });

    const JERSEY_COLORS = [
      { name: 'Red', hex: '#EF4444', badge: '🔴 RED' },
      { name: 'Blue', hex: '#3B82F6', badge: '🔵 BLUE' },
      { name: 'Yellow', hex: '#F59E0B', badge: '🟡 YELLOW' },
      { name: 'Green', hex: '#10B981', badge: '🟢 GREEN' },
      { name: 'White', hex: '#E2E8F0', badge: '⚪ WHITE' },
    ];

    const generated = [];
    let heatNum = 1;

    Object.keys(slotGroups).forEach((groupKey) => {
      const roster = slotGroups[groupKey];
      const effectiveHeatSize = heatSize === 'auto' 
        ? (roster.length <= 2 ? 2 : roster.length <= 6 ? 3 : 4) 
        : parseInt(heatSize);

      for (let i = 0; i < roster.length; i += effectiveHeatSize) {
        const chunk = roster.slice(i, i + effectiveHeatSize);
        const surfersInHeat = chunk.map((c, idx) => ({
          ...c,
          jersey: JERSEY_COLORS[idx % JERSEY_COLORS.length]
        }));

        generated.push({
          heatId: `heat_${heatNum}`,
          heatName: `Heat ${heatNum}`,
          division: groupKey,
          start_date: chunk[0]?.start_date || '2026-08-26',
          session_time: chunk[0]?.session_time || 'Morning 6:00 AM',
          surfers: surfersInHeat,
          status: heatNum === 1 ? 'completed' : 'scheduled'
        });
        heatNum++;
      }
    });

    setAquaticxHeats(generated);
    try {
      localStorage.setItem('aquaticx_heats', JSON.stringify(generated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    setActiveAquaticxHeatIndex(0);
    if (generated[0]?.surfers[0]) {
      setScoreSurferId(generated[0].surfers[0].id);
    }
    if (notify) {
      showToast(`⚡ Generated ${generated.length} Heats grouped strictly by Date & Session Slot!`);
    }
  };

  const handleLogAquaticXWave = (e) => {
    e.preventDefault();
    if (!aquaticxHeats.length) return;
    const currentHeat = aquaticxHeats[activeAquaticxHeatIndex];
    if (!currentHeat) return;

    const hStatus = (currentHeat.status || 'scheduled').toLowerCase();
    if (hStatus !== 'in-progress' && hStatus !== 'live' && !aquaticxTimerRunning) {
      showToast('🔒 Heat is not started! Click "▶ Start Heat" first to log wave scores.');
      return;
    }

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
    try {
      localStorage.setItem('aquaticx_heats', JSON.stringify(updatedHeats));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
    showToast(`Logged Wave Score ${waveScore.toFixed(1)}!`);
  };

  const handleCreateCustomHeat = (e) => {
    e.preventDefault();
    if (!newHeatForm.heatName.trim()) return;

    const JERSEY_COLORS = [
      { name: 'Red', hex: '#EF4444', badge: '🔴 RED' },
      { name: 'Blue', hex: '#3B82F6', badge: '🔵 BLUE' },
      { name: 'Yellow', hex: '#F59E0B', badge: '🟡 YELLOW' },
      { name: 'Green', hex: '#10B981', badge: '🟢 GREEN' },
    ];

    const selectedSurfers = students.slice(0, heatSize).map((st, idx) => ({
      id: `st_${st.id}`,
      name: st.name,
      type: 'Student',
      email: st.email || '',
      start_date: st.start_date || '2026-08-26',
      session_time: st.session_time || 'Morning 6:00 AM',
      jersey: JERSEY_COLORS[idx % JERSEY_COLORS.length],
      waves: [],
      top2Total: 0
    }));

    const newHeat = {
      heatId: `heat_${Date.now()}`,
      heatName: newHeatForm.heatName,
      division: newHeatForm.division,
      round: newHeatForm.round,
      surfers: selectedSurfers.length > 0 ? selectedSurfers : [
        { id: 'st_1', name: 'Chloe Kim', type: 'Student', jersey: JERSEY_COLORS[0], waves: [], top2Total: 0 },
        { id: 'st_2', name: 'Rick Grimes', type: 'Student', jersey: JERSEY_COLORS[1], waves: [], top2Total: 0 }
      ],
      status: 'Active'
    };

    const updated = [newHeat, ...aquaticxHeats];
    setAquaticxHeats(updated);
    try {
      localStorage.setItem('aquaticx_heats', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {}
    setShowCreateHeatModal(false);
    showToast(`✅ Created Custom Heat "${newHeatForm.heatName}"!`);
  };

  // Auto-generate AquaticX heats when students load or parameters change
  useEffect(() => {
    if (students && students.length > 0) {
      handleGenerateAquaticXHeats(false);
    }
  }, [students, selectedSlot, selectedDate, heatSize]);

  // Fetch initial competitions data & students list
  useEffect(() => {
    // 1. Fetch competitions
    fetch(`${API}/api/competitions/data`)
      .then(r => r.json())
      .then(d => {
        if (!d.upcomingEvents || d.upcomingEvents.length === 0) {
          d.upcomingEvents = [
            { id: 101, name: "testing 1", locationDate: "kollidam • 25/06/2026 - 01/07/2026", status: "Finished", badges: [{ text: "Finished", color: "#64748B" }, { text: "Surfing Event", color: "#3B82F6" }] },
            { id: 102, name: "testing 2", locationDate: "kollidam • 27/06/2026 - 08/07/2026", status: "Heat Drawn", badges: [{ text: "Heat Drawn", color: "#F59E0B" }, { text: "Surfing Event", color: "#3B82F6" }] },
            { id: 103, name: "test3", locationDate: "chidambaram • 30/07/2026 - 07/08/2026", status: "Register Form Opening", badges: [{ text: "Register Form Opening", color: "#10B981" }, { text: "Surfing Event", color: "#3B82F6" }] }
          ];
        }

        if (!d.pastResults || !d.pastResults.some(r => r.event && r.event.includes('testing 1'))) {
          d.pastResults = [
            { event: "testing 1 (Kollidam Surf)", placement: "1st", score: "17.85", highlightPlace: true },
            ...(d.pastResults || [])
          ];
        }
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

  // Start Heat & Set Status to in-progress
  const handleStartHeat = (heatIdx) => {
    const updatedHeats = aquaticxHeats.map((h, i) => {
      if (i === heatIdx) {
        return { ...h, status: 'in-progress' };
      }
      return h;
    });
    setAquaticxHeats(updatedHeats);
    setAquaticxTimerRunning(true);
    try {
      localStorage.setItem('aquaticx_heats', JSON.stringify(updatedHeats));
    } catch (err) {
      console.error(err);
    }
    showToast(`▶ ${aquaticxHeats[heatIdx]?.heatName || 'Heat'} is now LIVE & IN PROGRESS!`);
  };

  // Complete Heat & Automatically Advance Top 2 Surfers to Next Round
  const handleCompleteHeat = (heatIdx) => {
    const heat = aquaticxHeats[heatIdx];
    if (!heat) return;
    
    // Sort surfers by top 2 total score
    const sortedSurfers = [...heat.surfers].sort((a, b) => b.top2Total - a.top2Total);
    const winners = sortedSurfers.slice(0, 2);
    
    let updatedHeats = aquaticxHeats.map((h, i) => {
      if (i === heatIdx) {
        return { ...h, status: 'completed' };
      }
      return h;
    });

    // Save every surfer's performance to persistent competition history
    sortedSurfers.forEach((s, rankIdx) => {
      saveHeatHistory({
        id: `hist_${Date.now()}_${s.id}`,
        heatId: heat.heatId,
        heatName: heat.heatName,
        division: heat.division,
        surferId: s.id,
        surferName: s.name,
        assignedCoach: assignedCoaches[s.id] || 'School Coach',
        type: s.type,
        jersey: s.jersey?.badge,
        jerseyHex: s.jersey?.hex,
        waves: s.waves || [],
        top2Total: s.top2Total || 0,
        rank: rankIdx + 1,
        advanced: rankIdx < 2,
        date: new Date().toLocaleDateString(),
        timestamp: new Date().toLocaleTimeString()
      });
    });

    // Automatically advance winners into next round heat (if available)
    const nextHeatIdx = heatIdx + 1 < updatedHeats.length ? heatIdx + 1 : -1;
    if (nextHeatIdx !== -1 && winners.length > 0) {
      const nextHeat = updatedHeats[nextHeatIdx];
      const existingIds = new Set(nextHeat.surfers.map(s => s.id));
      const newSurfersToAdd = winners.filter(w => !existingIds.has(w.id));
      if (newSurfersToAdd.length > 0) {
        updatedHeats[nextHeatIdx] = {
          ...nextHeat,
          status: nextHeat.status === 'unscheduled' ? 'scheduled' : nextHeat.status,
          surfers: [...nextHeat.surfers, ...newSurfersToAdd]
        };
      }
    }

    setAquaticxHeats(updatedHeats);
    setAquaticxTimerRunning(false);
    try {
      localStorage.setItem('aquaticx_heats', JSON.stringify(updatedHeats));
    } catch (err) {
      console.error(err);
    }

    showToast(`🏆 ${heat.heatName} Completed & Saved to History! Top 2 Advanced: ${winners.map(w => w.name).join(', ') || 'Athletes'}`);
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
  const visibleUpcomingEvents = upcomingEvents;


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
          <div className="mock-heat-container" style={{ maxWidth: '1150px', margin: '0 auto' }}>
            {/* AquaticX Software Floating Sub-Navigation Bar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '4px', background: '#FFFFFF', padding: '6px', borderRadius: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
                {[
                  { id: 'events', label: '📅 Events' },
                  { id: 'competitors', label: '👥 Competitors' },
                  { id: 'heats', label: '🕒 Heats' },
                  { id: 'judge', label: '👨‍⚖️ Judge' },
                  { id: 'results', label: '🏆 Results' },
                  { id: 'analytics', label: '📈 Analytics' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAquaticSubTab(tab.id)}
                    style={{
                      background: aquaticSubTab === tab.id ? '#F1F5F9' : 'transparent',
                      color: aquaticSubTab === tab.id ? '#0F172A' : '#64748B',
                      fontWeight: aquaticSubTab === tab.id ? 800 : 600,
                      fontSize: '13px',
                      padding: '8px 20px',
                      borderRadius: '30px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Student Pending Approval Banner */}
            {currentUser?.role === 'athlete' && currentUser?.approval_status === 'pending' && (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #F59E0B', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⏳</span>
                  <div>
                    <div style={{ color: '#F59E0B', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Membership Request Pending Approval
                    </div>
                    <div style={{ color: '#64748B', fontSize: '13px', marginTop: '2px' }}>
                      Your direct registration request to join <strong>{currentUser?.school || 'Aquatic Indica Surf School'}</strong> has been sent to the Surf School Admin. Direct signups require explicit school approval.
                    </div>
                  </div>
                </div>
                <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Pending Approval
                </span>
              </div>
            )}

            {/* School Admin / Coach: Pending Student Join Requests Console */}
            {currentUser?.role !== 'athlete' && joinRequests.filter(r => r.status === 'pending').length > 0 && (
              <div style={{ background: '#0F172A', border: '1px solid #00F2FE', borderRadius: '18px', padding: '22px', marginBottom: '24px', boxShadow: '0 10px 30px rgba(0, 242, 254, 0.15)', color: '#FFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#00F2FE', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⏳</span> Pending Student Join Requests ({joinRequests.filter(r => r.status === 'pending').length})
                    </h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>
                      Students who registered directly (without an invite link) require your approval before joining school heats.
                    </p>
                  </div>
                  <span style={{ background: 'rgba(0, 242, 254, 0.15)', color: '#00F2FE', border: '1px solid rgba(0, 242, 254, 0.3)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                    Action Required
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {joinRequests.filter(r => r.status === 'pending').map(req => (
                    <div key={req.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF' }}>{req.student_name}</div>
                        <div style={{ fontSize: '11px', color: '#00F2FE', marginTop: '2px' }}>{req.student_email}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                          🏫 Requested School: <strong>{req.school_name}</strong> · 🕒 Slot: {req.session_time} · 📅 Date: {req.start_date}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleApproveJoinRequest(req.id)}
                          style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 900, fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
                        >
                          ✅ Approve Request
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineJoinRequest(req.id)}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                        >
                          ❌ Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-Tab 1: Heats Management */}
            {aquaticSubTab === 'heats' && (
              <>
                {/* AquaticX Heat Management Header & Controls */}
                {currentUser?.role !== 'athlete' && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>Heat Management</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
                          Schedule and manage competition heats
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* View Mode Switcher */}
                        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '3px', border: '1px solid #E2E8F0' }}>
                          <button type="button" onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? '#FFFFFF' : 'transparent', color: viewMode === 'list' ? '#0F172A' : '#64748B', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>List View</button>
                          <button type="button" onClick={() => setViewMode('schedule')} style={{ background: viewMode === 'schedule' ? '#FFFFFF' : 'transparent', color: viewMode === 'schedule' ? '#0F172A' : '#64748B', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: viewMode === 'schedule' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Schedule View</button>
                        </div>

                        <button
                          type="button"
                          onClick={handleClearAllData}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontWeight: 800, fontSize: '13px', padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          🧹 Clear All Data
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowCreateHeatModal(true)}
                          style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 800, fontSize: '13px', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          + Create Heat
                        </button>
                      </div>
                    </div>

                    {/* AquaticX Filters */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Select Event
                          <span style={{ background: '#2563EB', color: '#FFF', fontSize: '10px', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>Surfing</span>
                        </label>
                        <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}>
                          <option value="All">test3</option>
                          <option value="2026-08-26">Aquatic Indica Open 2026</option>
                          {[...new Set(students.map(s => s.start_date).filter(Boolean))].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Select Divisions</label>
                        <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}>
                          <option value="All">All Divisions</option>
                          <option value="Morning 6:00 AM">Morning 6:00 AM</option>
                          <option value="Morning 8:00 AM">Morning 8:00 AM</option>
                          <option value="Evening 4:00 PM">Evening 4:00 PM</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Select Round</label>
                        <select value={selectedRound} onChange={e => setSelectedRound(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}>
                          <option value="All">All Rounds</option>
                          <option value="Round 1">Round 1</option>
                          <option value="Round 2">Round 2</option>
                          <option value="Finals">Finals</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Surfers per Heat</label>
                        <select value={heatSize} onChange={e => setHeatSize(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value))} style={{ padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}>
                          <option value="auto">⚡ Auto Balance</option>
                          <option value={4}>4 Surfers / Heat</option>
                          <option value={3}>3 Surfers / Heat</option>
                          <option value={2}>2 Surfers / Heat</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Sub-Tab 2: Competitors Roster View */}
            {aquaticSubTab === 'competitors' && (
              <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', color: '#FFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#00F2FE', fontWeight: 800 }}>
                    🏄 Registered Competitors Roster ({students.length} Athletes & Guests)
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    School Admins & Individual Coaches can assign dedicated coaches to students.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                  {students.map(s => {
                    const coachName = assignedCoaches[s.id] || 'School Coach (Default)';
                    return (
                      <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF' }}>{s.name}</div>
                            {s.guests_count > 1 && (
                              <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                +{s.guests_count - 1} Guests
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#00F2FE', marginTop: '2px' }}>{s.email}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                            📅 Date: {s.start_date || '2026-08-26'} · 🕒 {s.session_time || '6:00 AM'}
                          </div>
                        </div>

                        {/* Assigned Coach Info & Action */}
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            👨‍🏫 {coachName}
                          </span>

                          {currentUser?.role !== 'athlete' && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningStudent(s);
                                setSelectedCoachName(assignedCoaches[s.id] || 'Coach Alex');
                              }}
                              style={{ background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.4)', color: '#00F2FE', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              ✏️ Assign Coach
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Tab: Events */}
            {aquaticSubTab === 'events' && (
              <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', color: '#FFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#00F2FE', fontWeight: 800 }}>
                    📅 Active Competition Events (2 Events)
                  </h3>
                  <button type="button" style={{ background: '#00F2FE', color: '#0B0E17', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>+ Create Event</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '14px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>● LIVE EVENT</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>26 Aug 2026</span>
                    </div>
                    <h4 style={{ margin: '10px 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#FFF' }}>Aquatic Indica Surf Festival 2026</h4>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 12px 0' }}>Covelong Beach, East Coast Road · Men's & Women's Open</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#CBD5E1', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                      <span>Competitors: <strong>{students.length} Registered</strong></span>
                      <span>Heats: <strong>{aquaticxHeats.length} Drawn</strong></span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>UPCOMING</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>15 Sep 2026</span>
                    </div>
                    <h4 style={{ margin: '10px 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#FFF' }}>Dawn Patrol Masters Cup</h4>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 12px 0' }}>Mahabalipuram Point Break · Dawn Patrol Slot</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#CBD5E1', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                      <span>Competitors: <strong>18 Registered</strong></span>
                      <span>Status: <strong>Registration Open</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab: Judge Panel (Exact AquaticX Judge Portal matching screenshot) */}
            {aquaticSubTab === 'judge' && (
              <div style={{ background: '#090D16', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '20px', padding: '28px', color: '#FFF', maxWidth: '650px', margin: '0 auto', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                {/* Top Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '10px', background: 'rgba(0, 242, 254, 0.1)', color: '#00F2FE', border: '1px solid rgba(0, 242, 254, 0.4)', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, letterSpacing: '0.5px' }}>
                    🏄 OFFICIAL JUDGE PORTAL
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>JUDGE NAME</div>
                    <div style={{ background: '#1E293B', color: '#00F2FE', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, marginTop: '2px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                      Judge 1
                    </div>
                  </div>
                </div>

                <h2 style={{ textAlign: 'center', margin: '0 0 24px 0', fontSize: '24px', fontWeight: 900, color: '#FFF' }}>
                  {aquaticxHeats[activeAquaticxHeatIndex]?.heatName || 'Heat 1'}
                </h2>

                {/* 1. SELECT SURFER IN WATER */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    1. SELECT SURFER IN WATER
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {(aquaticxHeats[activeAquaticxHeatIndex]?.surfers || [
                      { id: 's1', name: 'Chloe Kim', jersey: { badge: '🔴 RED', hex: '#EF4444' }, top2Total: 0 },
                      { id: 's2', name: 'Rick Grimes', jersey: { badge: '🔵 BLUE', hex: '#3B82F6' }, top2Total: 0 },
                      { id: 's3', name: 'Sarah Connor', jersey: { badge: '🟡 YELLOW', hex: '#F59E0B' }, top2Total: 0 },
                      { id: 's4', name: 'James Bond', jersey: { badge: '🟢 GREEN', hex: '#10B981' }, top2Total: 0 },
                    ]).map((s) => {
                      const isSelected = scoreSurferId === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setScoreSurferId(s.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px 16px',
                            borderRadius: '14px',
                            border: isSelected ? '2px solid #00F2FE' : '1px solid rgba(255,255,255,0.08)',
                            background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.03)',
                            boxShadow: isSelected ? '0 0 15px rgba(0, 242, 254, 0.2)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>{s.jersey?.badge?.split(' ')[0] || '🔴'}</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: isSelected ? '#00F2FE' : '#FFF' }}>{s.name}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Total: {s.top2Total.toFixed(2)} pts</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SCORING SURFER CARD BOX */}
                {(() => {
                  const selectedSurfer = aquaticxHeats[activeAquaticxHeatIndex]?.surfers.find(s => s.id === scoreSurferId) || aquaticxHeats[activeAquaticxHeatIndex]?.surfers[0] || { name: 'Chloe Kim', jersey: { badge: '🔴 RED' } };
                  return (
                    <div style={{ background: '#0F172A', border: '1px solid #00F2FE', borderRadius: '18px', padding: '22px', boxShadow: '0 10px 30px rgba(0, 242, 254, 0.15)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SCORING SURFER</div>
                          <div style={{ fontSize: '16px', fontWeight: 900, color: '#FFF', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{selectedSurfer?.jersey?.badge}</span>
                            <span>{selectedSurfer?.name}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '34px', fontWeight: 900, color: '#00F2FE', fontFamily: 'monospace' }}>
                          {parseFloat(scoreWaveVal || 6.5).toFixed(1)}
                        </div>
                      </div>

                      {/* Slider */}
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={scoreWaveVal}
                        onChange={e => setScoreWaveVal(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#00F2FE', cursor: 'pointer', height: '6px', marginBottom: '20px' }}
                      />

                      {/* Quick Presets */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '18px' }}>
                        <button type="button" onClick={() => setScoreWaveVal(3.5)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>3.5 Low</button>
                        <button type="button" onClick={() => setScoreWaveVal(5.5)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>5.5 Avg</button>
                        <button type="button" onClick={() => setScoreWaveVal(7.5)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>7.5 Good</button>
                        <button type="button" onClick={() => setScoreWaveVal(9.2)} style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#10B981', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>9.2 Excl!</button>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="button"
                        onClick={handleLogAquaticXWave}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #00D1B2 0%, #00F2FE 100%)',
                          color: '#0B0E17',
                          fontWeight: 900,
                          fontSize: '15px',
                          padding: '14px',
                          borderRadius: '12px',
                          border: 'none',
                          cursor: 'pointer',
                          letterSpacing: '1px',
                          boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)'
                        }}
                      >
                        ⚡ SUBMIT WAVE SCORE
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Sub-Tab: Results & Standings */}
            {aquaticSubTab === 'results' && (
              <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', color: '#FFF' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#00F2FE', fontWeight: 800 }}>
                  🏆 Official Competition Leaderboard & Results
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '10px' }}>RANK</th>
                        <th style={{ padding: '10px' }}>SURFER</th>
                        <th style={{ padding: '10px' }}>JERSEY</th>
                        <th style={{ padding: '10px' }}>BEST WAVE</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>HEAT TOTAL</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aquaticxHeats[0]?.surfers.map((s, idx) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px', fontWeight: 900, color: idx < 2 ? '#10B981' : '#64748B' }}>#{idx + 1}</td>
                          <td style={{ padding: '10px', fontWeight: 800 }}>{s.name}</td>
                          <td style={{ padding: '10px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', background: s.jersey?.hex || '#64748B', color: '#FFF', fontWeight: 800, fontSize: '10px' }}>{s.jersey?.badge}</span></td>
                          <td style={{ padding: '10px', color: '#00F2FE', fontWeight: 700 }}>{Math.max(...(s.waves.length > 0 ? s.waves : [0])).toFixed(1)} pts</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#00F2FE', fontSize: '16px' }}>{s.top2Total.toFixed(2)}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '12px', background: idx < 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.08)', color: idx < 2 ? '#10B981' : '#94A3B8', fontWeight: 800 }}>
                              {idx < 2 ? 'ADVANCED TO SEMI-FINALS' : 'ELIMINATED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab: Analytics */}
            {aquaticSubTab === 'analytics' && (
              <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', color: '#FFF' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#00F2FE', fontWeight: 800 }}>
                  📊 Event Performance Analytics
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ background: 'rgba(0, 242, 254, 0.08)', border: '1px solid rgba(0, 242, 254, 0.2)', padding: '18px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>TOTAL HEATS GENERATED</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#00F2FE', marginTop: '4px' }}>{aquaticxHeats.length} Heats</div>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '18px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>REGISTERED ATHLETES</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>{students.length} Athletes</div>
                  </div>
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '18px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>HIGHEST SINGLE WAVE</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#F59E0B', marginTop: '4px' }}>10.0 pts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Heats Dashboard & Scoring Console */}
            {aquaticxHeats.length > 0 && (
              <>
                {viewMode === 'schedule' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(260px, 1fr))', gap: '16px', overflowX: 'auto', paddingBottom: '16px', marginTop: '20px' }}>
                    {/* Column 1: ROUND 1 */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#00F2FE', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                        ROUND 1
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {aquaticxHeats.slice(0, 2).map((heat, idx) => (
                          <div key={heat.heatId} style={{ background: '#FFFFFF', border: idx === 0 ? '2px solid #38BDF8' : '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', color: '#0F172A', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 900, fontSize: '15px', color: '#0F172A' }}>{heat.heatName}</span>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>⏱ 20:00</span>
                                <span style={{ fontSize: '10px', background: idx === 0 ? '#DCFCE7' : '#FEF3C7', color: idx === 0 ? '#166534' : '#92400E', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                                  {idx === 0 ? 'COMPLETED' : 'SCHEDULED'}
                                </span>
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px' }}>
                              {heat.division} · 🕒 2026-08-26 07:00 - 07:20
                            </div>

                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '8px', paddingBottom: '6px', borderBottom: '1px solid #F1F5F9', marginBottom: '6px' }}>
                              <span>RANK</span>
                              <span>ATHLETE</span>
                              <span style={{ textAlign: 'right' }}>TOTAL</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                              {heat.surfers.map((s, sIdx) => (
                                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                                  <span style={{ fontWeight: 900, color: sIdx < 2 ? '#10B981' : '#94A3B8' }}>{sIdx + 1}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.jersey?.hex || '#3B82F6', display: 'inline-block' }}></span>
                                    <span style={{ fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontWeight: 900, color: '#0F172A' }}>{s.top2Total ? s.top2Total.toFixed(2) : '0.00'}</span>
                                    {sIdx === 0 && s.top2Total > 0 && <div style={{ fontSize: '9px', color: '#64748B' }}>Won by 3.20</div>}
                                    {sIdx === 1 && s.top2Total > 0 && <div style={{ fontSize: '9px', color: '#64748B' }}>Needed 3.50</div>}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAquaticxHeatIndex(idx);
                                  setViewMode('list');
                                }}
                                style={{ flex: 1, background: '#E0F2FE', color: '#0369A1', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 800, fontSize: '11px', cursor: 'pointer', textTransform: 'uppercase' }}
                              >
                                👁 VIEW DETAILS
                              </button>
                              <button
                                type="button"
                                onClick={() => showToast(`📋 Shared ${heat.heatName} link copied!`)}
                                style={{ background: '#E0F2FE', color: '#0284C7', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                              >
                                🔗
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: ROUND 2 */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#00F2FE', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                        ROUND 2
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', color: '#0F172A' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 900, fontSize: '15px' }}>Heat 1</span>
                            <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>SCHEDULED</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px' }}>Men's Open · 🕒 2026-08-27 07:00</div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, color: '#10B981' }}>1</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }}></span>
                                <span style={{ fontWeight: 800 }}>Chloe Kim</span>
                              </div>
                              <span style={{ fontWeight: 900 }}>0.00</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, color: '#94A3B8' }}>2</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }}></span>
                                <span style={{ fontWeight: 800 }}>Rick Grimes</span>
                              </div>
                              <span style={{ fontWeight: 900 }}>0.00</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, color: '#94A3B8' }}>3</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>?</span>
                                <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>1st from Round 1 Heat 2</span>
                              </div>
                              <span style={{ color: '#94A3B8' }}>—</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, color: '#94A3B8' }}>4</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>?</span>
                                <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>2nd from Round 1 Heat 2</span>
                              </div>
                              <span style={{ color: '#94A3B8' }}>—</span>
                            </div>
                          </div>

                          <button type="button" onClick={() => setViewMode('list')} style={{ width: '100%', background: '#E0F2FE', color: '#0369A1', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>👁 VIEW DETAILS</button>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: SEMI FINAL */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#00F2FE', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                        SEMI FINAL
                      </div>
                      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', color: '#0F172A' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 900, fontSize: '15px' }}>Heat 1</span>
                          <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>SCHEDULED</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px' }}>Men's Open · 🕒 2026-08-28 07:30</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                          {['1st from Round 2 Heat 1', '2nd from Round 2 Heat 1', '1st from Round 2 Heat 2', '2nd from Round 2 Heat 2'].map((rule, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, color: '#94A3B8' }}>{idx + 1}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>?</span>
                                <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>{rule}</span>
                              </div>
                              <span style={{ color: '#94A3B8' }}>—</span>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => setViewMode('list')} style={{ width: '100%', background: '#E0F2FE', color: '#0369A1', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>👁 VIEW DETAILS</button>
                      </div>
                    </div>

                    {/* Column 4: FINAL */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#00F2FE', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                        FINAL
                      </div>
                      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', color: '#0F172A' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 900, fontSize: '15px' }}>Heat 1 (Championship)</span>
                          <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>SCHEDULED</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px' }}>Men's Open · 🕒 2026-08-29 08:30</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                          {['1st from Semi Final 1', '2nd from Semi Final 1', '1st from Semi Final 2', '2nd from Semi Final 2'].map((rule, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, color: '#94A3B8' }}>{idx + 1}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>?</span>
                                <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>{rule}</span>
                              </div>
                              <span style={{ color: '#94A3B8' }}>—</span>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => setViewMode('list')} style={{ width: '100%', background: '#E0F2FE', color: '#0369A1', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>👁 VIEW DETAILS</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* AquaticX Software Heats Table List View (Light White Theme matching screenshot) */}
                    <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', marginTop: '20px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#FFFFFF', borderBottom: '2px solid #F1F5F9', color: '#475569', fontSize: '11px', fontWeight: '800', letterSpacing: '0.8px' }}>
                            <th style={{ padding: '16px 20px' }}>HEAT</th>
                            <th style={{ padding: '16px 20px' }}>ROUND</th>
                            <th style={{ padding: '16px 20px' }}>DIVISION</th>
                            <th style={{ padding: '16px 20px' }}>TIME & DURATION</th>
                            <th style={{ padding: '16px 20px' }}>SURFERS</th>
                            <th style={{ padding: '16px 20px' }}>STATUS</th>
                            <th style={{ padding: '16px 20px', textAlign: 'right' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aquaticxHeats.map((heat, idx) => {
                            const isLive = activeAquaticxHeatIndex === idx;
                            const hStatus = (heat.status || (idx === 0 ? 'completed' : idx < 4 ? 'scheduled' : 'unscheduled')).toLowerCase();

                            let statusBadge = { label: 'SCHEDULED', bg: '#334155', color: '#FFF' };
                            if (hStatus === 'completed' || hStatus === 'finished') {
                              statusBadge = { label: 'COMPLETED', bg: '#2563EB', color: '#FFF' };
                            } else if (hStatus === 'in-progress' || hStatus === 'live') {
                              statusBadge = { label: 'IN PROGRESS', bg: '#00D1B2', color: '#0B0E17' };
                            } else if (hStatus === 'unscheduled') {
                              statusBadge = { label: 'UNSCHEDULED', bg: '#94A3B8', color: '#FFF' };
                            }

                            return (
                              <tr key={heat.heatId} style={{ borderBottom: '1px solid #F1F5F9', background: isLive ? '#F0F9FF' : '#FFFFFF', transition: 'all 0.15s ease' }}>
                                <td style={{ padding: '16px 20px', fontWeight: 900, color: '#0F172A', fontSize: '14px' }}>
                                  #{idx + 1}
                                </td>
                                <td style={{ padding: '16px 20px', fontWeight: 700, color: '#475569' }}>
                                  {heat.round || (idx < 5 ? 'Round 1' : 'Round 2')}
                                </td>
                                <td style={{ padding: '16px 20px', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {heat.division}
                                </td>
                                <td style={{ padding: '16px 20px', color: '#64748B', fontSize: '12px' }}>
                                  🕒 {idx % 2 === 0 ? '05:15 - 05:45 (30m)' : '--:-- - --:-- (30m)'}
                                </td>
                                <td style={{ padding: '16px 20px', color: '#475569', fontWeight: 700 }}>
                                  👥 {heat.surfers.length}
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                  <span style={{ fontSize: '10px', background: statusBadge.bg, color: statusBadge.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 800, letterSpacing: '0.5px' }}>
                                    {statusBadge.label}
                                  </span>
                                </td>
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAquaticxHeatIndex(idx);
                                        if (heat.surfers[0]) setScoreSurferId(heat.surfers[0].id);
                                        setShowLiveScorecardModal(true);
                                      }}
                                      style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)' }}
                                    >
                                      👁 Open
                                    </button>
                                    {currentUser?.role !== 'athlete' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setEditingHeatModal(heat)}
                                          style={{ background: 'rgba(100, 116, 139, 0.1)', border: '1px solid rgba(100, 116, 139, 0.3)', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', padding: '5px 8px', fontWeight: 700 }}
                                          title="Edit Heat"
                                        >
                                          ✏️ Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (window.confirm(`Delete ${heat.heatName}?`)) {
                                              const updated = aquaticxHeats.filter(h => h.heatId !== heat.heatId);
                                              setAquaticxHeats(updated);
                                              try { localStorage.setItem('aquaticx_heats', JSON.stringify(updated)); } catch (err) {}
                                              showToast(`🗑 ${heat.heatName} deleted successfully`);
                                            }
                                          }}
                                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', padding: '5px 8px', fontWeight: 700 }}
                                          title="Delete Heat"
                                        >
                                          🗑 Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Active Heat Live Console & Scorecard Modal Overlay */}
                    {showLiveScorecardModal && (
                      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11, 14, 23, 0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: '#0F172A', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '20px', padding: '24px', maxWidth: '880px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                          {/* Heat Header */}
                          <div style={{ paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            {/* Top Row: Badges & Close Button */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  ● LIVE COMPETITION ARENA
                                </span>
                                <span style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00F2FE', border: '1px solid rgba(0, 242, 254, 0.3)', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px' }}>
                                  {aquaticxHeats[activeAquaticxHeatIndex]?.division || 'Morning 6:00 AM'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowLiveScorecardModal(false)}
                                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#FFF', fontSize: '16px', fontWeight: 800, width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
                              >
                                ✕
                              </button>
                            </div>

                            {/* Second Row: Title & Actions/Timer */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#FFF', letterSpacing: '-0.3px' }}>
                                {aquaticxHeats[activeAquaticxHeatIndex]?.heatName || 'Heat 1'}
                              </h2>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Heat Countdown Clock */}
                                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>TIMER</span>
                                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace', letterSpacing: '1px', lineHeight: '1' }}>
                                    {Math.floor(aquaticxTimer / 60)}:{(aquaticxTimer % 60).toString().padStart(2, '0')}
                                  </span>
                                </div>

                                {/* Control Buttons */}
                                {currentUser?.role !== 'athlete' && (
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleStartHeat(activeAquaticxHeatIndex)}
                                      style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#10B981', padding: '8px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      ▶ Start Heat
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCompleteHeat(activeAquaticxHeatIndex)}
                                      style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.5)', color: '#3B82F6', padding: '8px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      🏁 Finish & Advance Top 2
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAquaticxTimerRunning(false);
                                        setAquaticxTimer(20 * 60);
                                        showToast('⏹ Heat Timer Reset to 20:00');
                                      }}
                                      style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#EF4444', padding: '8px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      ⏹ Reset
                                    </button>
                                  </div>
                                )}
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
                                    display: 'grid',
                                    gridTemplateColumns: '70px 90px 1fr 150px 90px',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 18px',
                                    borderRadius: '12px',
                                    border: isSelected ? '2px solid #00F2FE' : '1px solid rgba(255,255,255,0.06)',
                                    background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {/* Col 1: Rank Badge */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 900, color: isAdvancing ? '#10B981' : '#64748B' }}>
                                      #{rankIdx + 1}
                                    </span>
                                    {isAdvancing && (
                                      <span style={{ fontSize: '8px', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        ADVANCES
                                      </span>
                                    )}
                                  </div>

                                  {/* Col 2: Jersey Pill */}
                                  <div>
                                    <span style={{
                                      display: 'inline-block',
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
                                  </div>

                                  {/* Col 3: Surfer Name & Slot */}
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF' }}>{s.name}</div>
                                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                                      📅 {s.start_date || '2026-08-26'} · 🕒 {s.session_time || '6:00 AM'}
                                    </div>
                                  </div>

                                  {/* Col 4: Waves Logged */}
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>WAVES LOGGED</div>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                      {s.waves && s.waves.length > 0 ? (
                                        s.waves.map((w, wIdx) => (
                                          <span key={wIdx} style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(0, 242, 254, 0.15)', color: '#00F2FE', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                                            {w.toFixed(1)}
                                          </span>
                                        ))
                                      ) : (
                                        <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>No waves yet</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Col 5: Heat Total */}
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>HEAT TOTAL</div>
                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#00F2FE', lineHeight: '1.2' }}>
                                      {s.top2Total.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Judge Wave Scoring Control Console / Student View Banner */}
                          {currentUser?.role === 'athlete' ? (
                            <div style={{ background: 'rgba(0, 242, 254, 0.04)', padding: '16px 20px', borderRadius: '14px', border: '1px solid rgba(0, 242, 254, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#00F2FE', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  🏄 Athlete Live Heat Portal
                                </h4>
                                <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                                  You are viewing your active heat draw. Wave scores are judged live by official panel judges when the heat is in progress.
                                </p>
                              </div>
                              <span style={{ fontSize: '11px', background: (aquaticxHeats[activeAquaticxHeatIndex]?.status || '').toLowerCase() === 'in-progress' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: (aquaticxHeats[activeAquaticxHeatIndex]?.status || '').toLowerCase() === 'in-progress' ? '#10B981' : '#F59E0B', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                {(aquaticxHeats[activeAquaticxHeatIndex]?.status || '').toLowerCase() === 'in-progress' ? '● LIVE SCORING IN PROGRESS' : '🔒 HEAT SCHEDULED'}
                              </span>
                            </div>
                          ) : (aquaticxHeats[activeAquaticxHeatIndex]?.status || '').toLowerCase() === 'completed' ? (
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '14px', textAlign: 'center', color: '#3B82F6', fontWeight: 800, fontSize: '13px' }}>
                              🏆 HEAT COMPLETED — Wave scores are finalized & top 2 surfers advanced!
                            </div>
                          ) : (aquaticxHeats[activeAquaticxHeatIndex]?.status || '').toLowerCase() !== 'in-progress' && !aquaticxTimerRunning ? (
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ color: '#F59E0B', fontWeight: 800, fontSize: '13px' }}>
                                🔒 HEAT IS SCHEDULED — Click "▶ Start Heat" above to start live wave scoring!
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartHeat(activeAquaticxHeatIndex)}
                                style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                              >
                                ▶ Start Heat Now
                              </button>
                            </div>
                          ) : (
                            <form onSubmit={handleLogAquaticXWave} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <h4 style={{ margin: 0, fontSize: '13px', color: '#00F2FE', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ✍️ Judge Wave Scoring Input (LIVE)
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => setShowJudgeModal(true)}
                                    style={{
                                      background: 'rgba(0, 242, 254, 0.15)',
                                      border: '1px solid rgba(0, 242, 254, 0.4)',
                                      color: '#00F2FE',
                                      padding: '4px 10px',
                                      borderRadius: '20px',
                                      fontWeight: 800,
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    👨‍⚖️ + Invite Panel Judge
                                  </button>
                                </div>

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
                          )}
                        </div>
                      </div>
                    )}

                    {/* Edit Heat Modal */}
                    {editingHeatModal && (
                      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11, 14, 23, 0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: '#0F172A', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '20px', padding: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#FFF', fontSize: '18px', fontWeight: 800 }}>✏️ Edit {editingHeatModal.heatName}</h3>
                            <button type="button" onClick={() => setEditingHeatModal(null)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                          </div>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const updated = aquaticxHeats.map(h => h.heatId === editingHeatModal.heatId ? editingHeatModal : h);
                            setAquaticxHeats(updated);
                            try { localStorage.setItem('aquaticx_heats', JSON.stringify(updated)); } catch (err) {}
                            setEditingHeatModal(null);
                            showToast(`✅ ${editingHeatModal.heatName} saved successfully`);
                          }}>
                            <div style={{ marginBottom: '16px' }}>
                              <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Heat Name</label>
                              <input type="text" value={editingHeatModal.heatName} onChange={e => setEditingHeatModal({ ...editingHeatModal, heatName: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '13px' }} required />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                              <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Round</label>
                              <input type="text" value={editingHeatModal.round || 'Round 1'} onChange={e => setEditingHeatModal({ ...editingHeatModal, round: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '13px' }} required />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                              <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Division / Time Slot</label>
                              <input type="text" value={editingHeatModal.division} onChange={e => setEditingHeatModal({ ...editingHeatModal, division: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '13px' }} required />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                              <button type="button" onClick={() => setEditingHeatModal(null)} style={{ background: 'rgba(255,255,255,0.08)', color: '#FFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                              <button type="submit" style={{ background: 'linear-gradient(135deg, #00D1B2 0%, #00F2FE 100%)', color: '#0B0E17', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>Save Changes</button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Assign Coach Modal */}
            {assigningStudent && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 11, 26, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                <div style={{ background: '#0F172A', border: '1px solid rgba(0, 242, 254, 0.4)', borderRadius: '20px', padding: '28px', maxWidth: '450px', width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', color: '#FFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#00F2FE' }}>
                      👨‍🏫 Assign Coach to {assigningStudent.name}
                    </h3>
                    <button type="button" onClick={() => setAssigningStudent(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const updated = { ...assignedCoaches, [assigningStudent.id]: selectedCoachName };
                    setAssignedCoaches(updated);
                    try { localStorage.setItem('assigned_coaches', JSON.stringify(updated)); } catch (err) {}
                    showToast(`👨‍🏫 Assigned ${selectedCoachName} to ${assigningStudent.name}`);
                    setAssigningStudent(null);
                  }}>
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Select Coach (School / Individual)</label>
                      <select
                        value={selectedCoachName}
                        onChange={e => setSelectedCoachName(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '13px', fontWeight: 700 }}
                      >
                        <option value="Coach Alex">Coach Alex (Senior Surf Coach)</option>
                        <option value="Coach Sarah">Coach Sarah (Junior Squad)</option>
                        <option value="Head Coach Dave">Head Coach Dave (Head Instructor)</option>
                        <option value="Individual Coach">Individual Coach (Independent)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setAssigningStudent(null)} style={{ background: 'rgba(255,255,255,0.08)', color: '#FFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                      <button type="submit" style={{ background: 'linear-gradient(135deg, #00D1B2 0%, #00F2FE 100%)', color: '#0B0E17', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 900, fontSize: '12px', cursor: 'pointer' }}>Assign Coach</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Persistent Competition & Heat History Table (Students, Coaches & School Admins) */}
            <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', color: '#FFF', marginTop: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#00F2FE', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Competition & Heat Performance History ({currentUser?.name || 'User'})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '10px' }}>HEAT / EVENT</th>
                      <th style={{ padding: '10px' }}>SESSION SLOT</th>
                      <th style={{ padding: '10px' }}>ASSIGNED COACH</th>
                      <th style={{ padding: '10px' }}>JERSEY</th>
                      <th style={{ padding: '10px' }}>LOGGED WAVES</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>HEAT TOTAL</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>RESULT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render persistent saved history logs */}
                    {heatHistoryList.length > 0 ? (
                      heatHistoryList.map((h, hIdx) => (
                        <tr key={h.id || hIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px', fontWeight: 800, color: '#FFF' }}>
                            {h.heatName} <span style={{ fontSize: '10px', color: '#64748B', display: 'block', fontWeight: 400 }}>{h.surferName}</span>
                          </td>
                          <td style={{ padding: '10px', color: '#94A3B8' }}>{h.division}</td>
                          <td style={{ padding: '10px', color: '#10B981', fontWeight: 700 }}>👨‍🏫 {h.assignedCoach || 'School Coach'}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: h.jerseyHex || '#3B82F6', color: '#FFF', fontWeight: 800, fontSize: '10px' }}>
                              {h.jersey || '🔵 BLUE'}
                            </span>
                          </td>
                          <td style={{ padding: '10px', color: '#00F2FE' }}>
                            {h.waves && h.waves.length > 0 ? h.waves.map(w => parseFloat(w).toFixed(1)).join(', ') : 'No waves logged'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#00F2FE', fontSize: '16px' }}>
                            {h.top2Total ? parseFloat(h.top2Total).toFixed(2) : '0.00'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '12px', background: h.advanced ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.08)', color: h.advanced ? '#10B981' : '#94A3B8', fontWeight: 800 }}>
                              {h.advanced ? `RANK #${h.rank} (ADVANCED)` : `RANK #${h.rank}`}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      aquaticxHeats.filter(h => currentUser?.role !== 'athlete' || h.surfers.some(s => s.name === currentUser?.name || s.id === `st_${currentUser?.student_id}`)).map((h) => {
                        const mySurferObj = h.surfers.find(s => s.name === currentUser?.name || s.id === `st_${currentUser?.student_id}`) || h.surfers[0];
                        const sortedSurfers = [...h.surfers].sort((a, b) => b.top2Total - a.top2Total);
                        const myRank = sortedSurfers.findIndex(s => s.id === mySurferObj?.id) + 1;
                        return (
                          <tr key={h.heatId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px', fontWeight: 800, color: '#FFF' }}>{h.heatName}</td>
                            <td style={{ padding: '10px', color: '#94A3B8' }}>{h.division}</td>
                            <td style={{ padding: '10px', color: '#10B981', fontWeight: 700 }}>👨‍🏫 {assignedCoaches[mySurferObj?.id] || 'School Coach'}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: mySurferObj?.jersey?.hex || '#3B82F6', color: '#FFF', fontWeight: 800, fontSize: '10px' }}>
                                {mySurferObj?.jersey?.badge || '🔵 BLUE'}
                              </span>
                            </td>
                            <td style={{ padding: '10px', color: '#00F2FE' }}>
                              {mySurferObj?.waves && mySurferObj.waves.length > 0 ? mySurferObj.waves.map(w => w.toFixed(1)).join(', ') : 'No waves yet'}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#00F2FE', fontSize: '16px' }}>
                              {mySurferObj?.top2Total ? mySurferObj.top2Total.toFixed(2) : '0.00'}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>
                              <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '12px', background: myRank <= 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.08)', color: myRank <= 2 ? '#10B981' : '#94A3B8', fontWeight: 800 }}>
                                {myRank <= 2 ? `RANK #${myRank} (ADVANCED)` : `RANK #${myRank}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invite Panel Judge Shared Link Modal */}
            {showJudgeModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 11, 26, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                <div style={{ background: '#0F172A', border: '1px solid rgba(0, 242, 254, 0.4)', borderRadius: '20px', padding: '28px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', color: '#FFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#00F2FE' }}>
                      👨‍⚖️ Invite Beach Panel Judge
                    </h3>
                    <button type="button" onClick={() => setShowJudgeModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                  </div>

                  <p style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '18px', lineHeight: 1.5 }}>
                    Send this dedicated mobile-friendly <strong>Live Scoring Portal Link</strong> to beach panel judges so they can log wave scores directly from their smartphones or tablets!
                  </p>

                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/judge-scoring?heat=${aquaticxHeats[activeAquaticxHeatIndex]?.heatId || 'heat_1'}`}
                      style={{ background: 'transparent', border: 'none', color: '#00F2FE', fontSize: '12px', width: '100%', outline: 'none', fontWeight: 700 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/judge-scoring?heat=${aquaticxHeats[activeAquaticxHeatIndex]?.heatId || 'heat_1'}`);
                        showToast('📋 Judge Scoring Link copied!');
                      }}
                      style={{ background: '#00F2FE', color: '#0B0E17', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 800, fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Copy Link
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/judge-scoring?heat=${aquaticxHeats[activeAquaticxHeatIndex]?.heatId || 'heat_1'}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`🏄 AquaticX Official Live Judge Scoring Portal:\n${url}`)}`, '_blank');
                      }}
                      style={{ flex: 1, background: '#25D366', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      📲 Share WhatsApp
                    </button>

                    <a
                      href={`/judge-scoring?heat=${aquaticxHeats[activeAquaticxHeatIndex]?.heatId || 'heat_1'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', textDecoration: 'none', textAlign: 'center', display: 'block' }}
                    >
                      Open Portal ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Create Custom Heat Modal */}
            {showCreateHeatModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 11, 26, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                <div style={{ background: '#0F172A', border: '1px solid rgba(0, 242, 254, 0.4)', borderRadius: '20px', padding: '28px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', color: '#FFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#00F2FE' }}>
                      ➕ Create Competition Heat
                    </h3>
                    <button type="button" onClick={() => setShowCreateHeatModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                  </div>

                  <form onSubmit={handleCreateCustomHeat}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Heat Name / Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Heat 7 — Quarter Finals"
                        value={newHeatForm.heatName}
                        onChange={e => setNewHeatForm({ ...newHeatForm, heatName: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '13px' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Round</label>
                        <select
                          value={newHeatForm.round}
                          onChange={e => setNewHeatForm({ ...newHeatForm, round: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '12px' }}
                        >
                          <option value="Round 1">Round 1 - Qualifiers</option>
                          <option value="Quarter Finals">Quarter Finals</option>
                          <option value="Semi Finals">Semi Finals</option>
                          <option value="Finals">Finals</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Division</label>
                        <select
                          value={newHeatForm.division}
                          onChange={e => setNewHeatForm({ ...newHeatForm, division: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', fontSize: '12px' }}
                        >
                          <option value="Men's Open">Men's Open</option>
                          <option value="Women's Open">Women's Open</option>
                          <option value="Junior Division">Junior Division</option>
                          <option value="Morning 6:00 AM">Morning 6:00 AM Slot</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <button
                        type="button"
                        onClick={() => setShowCreateHeatModal(false)}
                        style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ flex: 1, background: 'linear-gradient(135deg, #00D1B2 0%, #00F2FE 100%)', color: '#0B0E17', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 900, fontSize: '13px', cursor: 'pointer' }}
                      >
                        + Create Heat
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
