// JudgeDashboard.jsx - Version 2.0 (Dynamic Best Waves)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Waves, LogOut, ChevronDown, Loader2, User, Clock, AlertCircle, HelpCircle, X, CheckCircle, RotateCcw, Flag, Check, Play, Pause, Trash2, Zap } from 'lucide-react';
import axios from 'axios';
import bgImage from '../../assets/bg.jpeg';
const useAdminTheme = () => ({ adminTheme: 'light' });

const API_BASE = 'http://54.84.243.251/api';

const formatDivisionName = (name, event = null) => {
    if (!name) return name;
    if (event && event.division_aliases) {
        try {
            const aliases = typeof event.division_aliases === 'string' ? JSON.parse(event.division_aliases) : event.division_aliases;
            if (aliases && aliases[name] && aliases[name].trim() !== '') {
                return aliases[name];
            }
        } catch (e) {
            // Ignore
        }
    }
    return name;
};

const getFriendlyColorName = (color) => {
    const c = color?.toUpperCase() || '';
    if (c === '#FF0000' || c === 'RED') return 'Red';
    if (c === '#FFFFFF' || c === 'WHITE') return 'White';
    if (c === '#FFFF00' || c === 'YELLOW') return 'Yellow';
    if (c === '#0000FF' || c === 'BLUE') return 'Blue';
    if (c === '#008000' || c === 'GREEN') return 'Green';
    if (c === '#000000' || c === 'BLACK') return 'Black';
    return '';
};

const JudgeDashboard = () => {
    const navigate = useNavigate();
    const { adminTheme } = useAdminTheme();
    const [judge, setJudge] = useState(null);
    const [heats, setHeats] = useState([]);
    const [assignedHeatIds, setAssignedHeatIds] = useState([]);
    const [selectedHeatId, setSelectedHeatId] = useState('');
    const [events, setEvents] = useState([]);
    const [filterEvent, setFilterEvent] = useState('');
    const [filterDivision, setFilterDivision] = useState('');
    const [filterRound, setFilterRound] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [scores, setScores] = useState({}); // { 'surferId-waveNum': score }
    const [remainingTime, setRemainingTime] = useState('--:--');
    const [startTimer, setStartTimer] = useState(null); // { heatId, remainingSeconds, heat }
    const [scoringModal, setScoringModal] = useState(null); // { surfer, waveNumber, currentScore }
    const [scoreStatuses, setScoreStatuses] = useState({}); // { 'surferId-waveNum': { status, id } }
    const [activeSessions, setActiveSessions] = useState([]); // Sessions currently being scored
    const [message, setMessage] = useState('');
    const [serverTimeOffset, setServerTimeOffset] = useState(0); // Difference between server and local time
    const [rescoreAlerts, setRescoreAlerts] = useState([]); // Queue of rescore notifications
    const [overrideAlerts, setOverrideAlerts] = useState([]); // List of master overrides
    const timeoutRefs = useRef({}); // Store timeouts for debouncing
    const [rescoreSameScoreWarning, setRescoreSameScoreWarning] = useState(false);
    const [isResettingScore, setIsResettingScore] = useState(false);

    // SUP Stopwatch & Timekeeper States
    const [supStopwatchTime, setSupStopwatchTime] = useState(0);
    const [supStopwatchRunning, setSupStopwatchRunning] = useState(false);
    const [supRecordedFinishes, setSupRecordedFinishes] = useState([]);
    const [supSubmitted, setSupSubmitted] = useState(false);
    const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
    const [editingFinish, setEditingFinish] = useState(null);
    const [customAlert, setCustomAlert] = useState(null);
    const [customConfirm, setCustomConfirm] = useState(null);

    const supStopwatchRef = useRef(null);
    const supStartTimeRef = useRef(0);
    const supAccumulatedTimeRef = useRef(0);
    // Tracks which heat's SUP finishes we've already loaded from DB
    const supLoadedForHeatRef = useRef(null);
    // Tracks which heat's SUP timer we've already restored
    const supTimerLoadedForHeatRef = useRef(null);
    // Tracks the last heat ID for which finishes were written to localStorage
    const supLastSavedHeatIdRef = useRef(null);
    // Tracks the previous actual_start_time so we can detect when admin starts a fresh run
    const prevActualStartTimeRef = useRef(null);

    const updateDbSupTimer = async (running, accumulated, startTime) => {
        if (!selectedHeat?.id) return;
        try {
            await axios.post(`${API_BASE}/heats/${selectedHeat.id}/sup-timer`, {
                running: running ? 1 : 0,
                accumulated: accumulated || 0,
                start_time: startTime ? new Date(startTime).toISOString() : null
            });
        } catch (err) {
            console.error('Failed to sync SUP timer to DB:', err);
        }
    };

    const inProgressHeat = heats.find(h => h.status === 'in-progress');
    const assignedHeats = heats.filter(h => assignedHeatIds.includes(h.id));
    const selectedHeat = inProgressHeat || heats.find(h => h.id === selectedHeatId) || assignedHeats[0] || heats[0];
    const isSupEvent = selectedHeat?.event_type === 'SUP Event';

    // Extremely accurate millisecond stopwatch timer
    useEffect(() => {
        if (supStopwatchRunning) {
            supStopwatchRef.current = setInterval(() => {
                const elapsed = Date.now() - supStartTimeRef.current;
                setSupStopwatchTime(supAccumulatedTimeRef.current + elapsed);
            }, 10);
        } else {
            if (supStopwatchRef.current) {
                clearInterval(supStopwatchRef.current);
            }
            supAccumulatedTimeRef.current = supStopwatchTime;
        }

        return () => {
            if (supStopwatchRef.current) {
                clearInterval(supStopwatchRef.current);
            }
        };
    }, [supStopwatchRunning]);

    // Fix #1: Auto-stop stopwatch when heat scheduled time runs out (remainingTime hits 00:00) — but NOT for SUP heats
    useEffect(() => {
        if (!isSupEvent && remainingTime === '00:00' && supStopwatchRunning) {
            setSupStopwatchRunning(false);
            if (selectedHeat?.id) {
                const finalTime = supAccumulatedTimeRef.current + (Date.now() - supStartTimeRef.current);
                localStorage.setItem(`sup_timer_${selectedHeat.id}`, JSON.stringify({
                    running: false,
                    accumulated: finalTime,
                    startTime: null
                }));
                updateDbSupTimer(false, finalTime, null);
            }
        }
    }, [remainingTime, supStopwatchRunning, selectedHeat?.id, isSupEvent]);

    // Initial load and polling for heat updates
    useEffect(() => {
        const loadData = async () => {
            let info = sessionStorage.getItem('judgeInfo');
            if (!info) {
                const defaultJudge = {
                    id: 'judge_master',
                    name: 'Ironman',
                    email: 'ironman@gmail.com',
                    role: 'scoring',
                    judge_number: 1,
                    status: 'Active',
                    admin_id: 'admin'
                };
                sessionStorage.setItem('judgeInfo', JSON.stringify(defaultJudge));
                info = JSON.stringify(defaultJudge);
            }
            if (info) {
                const parsed = JSON.parse(info);
                setJudge(parsed);
                await fetchJudgeData(parsed.id);
            }
        };

        loadData();
        // Poll every 3 seconds — heats don't change that fast, reducing DB load
        const interval = setInterval(() => {
            const info = sessionStorage.getItem('judgeInfo');
            if (info) {
                const parsed = JSON.parse(info);
                fetchJudgeData(parsed.id);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const fetchJudgeData = async (judgeId) => {
        try {
            const res = await axios.get(`${API_BASE}/judges/${judgeId}/dashboard-sync`).catch(() => null);
            if (res && res.data) {
                const { judge: currentJudge, assignedHeatIds: heatIds, heats: heatsData, server_time } = res.data;

                // Update heats and assignments (filter out break blocks)
                const nonBreakHeats = (heatsData || []).filter(h => h.division !== 'Break' && !(h.round || '').toLowerCase().includes('break'));
                setHeats(nonBreakHeats);
                setAssignedHeatIds(heatIds || nonBreakHeats.map(h => h.id));

                if (server_time) {
                    setServerTimeOffset(prev => {
                        if (prev === 0) {
                            const serverTime = new Date(server_time).getTime();
                            const localTime = Date.now();
                            return serverTime - localTime;
                        }
                        return prev;
                    });
                }

                if (currentJudge) {
                    setJudge(currentJudge);
                    sessionStorage.setItem('judgeInfo', JSON.stringify(currentJudge));
                }
            } else {
                // Fallback: fetch all heats directly
                const [heatsRes, eventsRes] = await Promise.all([
                    axios.get(`${API_BASE}/heats`).catch(() => ({ data: [] })),
                    axios.get(`${API_BASE}/events`).catch(() => ({ data: [] }))
                ]);
                const nonBreakHeats = (heatsRes.data || []).filter(h => h.division !== 'Break' && !(h.round || '').toLowerCase().includes('break'));
                setHeats(nonBreakHeats);
                setAssignedHeatIds(nonBreakHeats.map(h => h.id));
                setEvents(eventsRes.data || []);
            }

            try {
                const evRes = await axios.get(`${API_BASE}/events`);
                if (evRes.data) setEvents(evRes.data);
            } catch (_) { }
        } catch (err) {
            console.error('Error fetching judge data:', err);
        } finally {
            setIsLoading(false);
        }
    };



    const formatStopwatchTime = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    const getOrdinalSuffix = (num) => {
        if (num === 1) return '1st';
        if (num === 2) return '2nd';
        if (num === 3) return '3rd';
        return `${num}th`;
    };

    const handleAssignCompetitor = (finishId, competitorId) => {
        setSupRecordedFinishes(prev => prev.map(f => {
            if (f.id === finishId) {
                return { ...f, competitorId };
            }
            return f;
        }));
    };

    const handleOpenEditFinish = (finish) => {
        if (isFullySubmitted) return;
        const ms = finish.time;
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        setEditingFinish({
            id: finish.id,
            minutes: minutes.toString(),
            seconds: seconds.toString(),
            centiseconds: centiseconds.toString()
        });
    };

    const handleSaveEditedFinish = () => {
        if (!editingFinish) return;
        const { id, minutes, seconds, centiseconds } = editingFinish;

        const totalMs = (parseInt(minutes || 0) * 60000) + (parseInt(seconds || 0) * 1000) + (parseInt(centiseconds || 0) * 10);

        setSupRecordedFinishes(prev => {
            let updated = prev.map(f => {
                if (f.id === id) {
                    return { ...f, time: totalMs };
                }
                return f;
            });

            updated.sort((a, b) => {
                const finalA = a.time + (a.penalty * 10000);
                const finalB = b.time + (b.penalty * 10000);
                return finalA - finalB;
            });

            updated = updated.map((f, idx) => ({
                ...f,
                position: idx + 1
            }));

            return updated;
        });

        setEditingFinish(null);
    };

    const handleDeleteFinish = async (finishId) => {
        // If finishId is a string (nanoid), it's from DB, delete it
        if (typeof finishId === 'string' || finishId < 1000000000000) {
            const finish = supRecordedFinishes.find(f => f.id === finishId);
            if (finish && finish.competitorId) {
                try {
                    await axios.post(`${API_BASE}/scores/reset`, {
                        heat_id: selectedHeat.id,
                        surfer_id: finish.competitorId,
                        judge_id: judge.id,
                        wave_number: 1
                    });
                } catch (err) {
                    console.error("Failed to delete score from DB", err);
                }
            }
        }

        setSupRecordedFinishes(prev => {
            const filtered = prev.filter(f => f.id !== finishId);
            return filtered.map((f, idx) => ({
                ...f,
                position: idx + 1
            }));
        });
    };

    // Core reset — no confirm dialog, no DB score delete (backend wipes scores on heat start).
    // Called automatically when admin starts a new heat, and also by the manual reset handler.
    const executeSupReset = (heatId, heatActualStartTime) => {
        setSupStopwatchRunning(false);
        setSupStopwatchTime(0);
        supAccumulatedTimeRef.current = 0;
        supStartTimeRef.current = 0;
        setSupRecordedFinishes([]);
        setSupSubmitted(false);
        supLoadedForHeatRef.current = null;
        supTimerLoadedForHeatRef.current = null;
        supLastSavedHeatIdRef.current = heatId;

        if (heatId) {
            // Clear localStorage for this heat — stamp with current actualStartTime so
            // the new run's saves are immediately accepted.
            localStorage.setItem(`sup_timer_${heatId}`, JSON.stringify({
                running: false,
                accumulated: 0,
                startTime: null
            }));
            localStorage.setItem(`sup_finishes_${heatId}`, JSON.stringify({
                actualStartTime: heatActualStartTime,
                finishes: []
            }));
            updateDbSupTimer(false, 0, null);
        }
    };

    const handleSupReset = () => {
        setCustomConfirm({
            message: 'Reset stopwatch and clear all recorded finishes?',
            onConfirm: async () => {
                setCustomConfirm(null);
                const dbFinishes = supRecordedFinishes.filter(f => (typeof f.id === 'string' || f.id < 1000000000000) && f.competitorId);
                for (const finish of dbFinishes) {
                    try {
                        await axios.post(`${API_BASE}/scores/reset`, {
                            heat_id: selectedHeat.id,
                            surfer_id: finish.competitorId,
                            judge_id: judge.id,
                            wave_number: 1
                        });
                    } catch (err) {
                        console.error('Failed to delete score from DB', err);
                    }
                }
                executeSupReset(selectedHeat?.id, selectedHeat?.actual_start_time);
            }
        });
    };

    const isFullySubmitted = selectedHeat?.surfers?.length > 0 &&
        supRecordedFinishes.length === selectedHeat.surfers.length &&
        supRecordedFinishes.every(f => typeof f.id === 'string');

    // Stable surfer sort: always sort by heat_surfer_id (nanoid set at heat creation)
    // so every judge sees the same fixed row order regardless of API response order or priority changes.
    // Priority number updates in-place; rows never physically move.
    const getStablySortedSurfers = (surfers) => {
        if (!surfers || surfers.length === 0) return surfers || [];
        return [...surfers].sort((a, b) => {
            // heat_surfer_id is the nanoid pk of the heat_surfers join row — stable forever
            if (a.heat_surfer_id && b.heat_surfer_id) {
                return a.heat_surfer_id < b.heat_surfer_id ? -1 : a.heat_surfer_id > b.heat_surfer_id ? 1 : 0;
            }
            // Fallback: sort by surfer id
            return a.id - b.id;
        });
    };

    // Set initial selection and handle auto-selection for in-progress heats
    useEffect(() => {
        if (inProgressHeat) {
            if (selectedHeatId !== inProgressHeat.id) {
                setSelectedHeatId(inProgressHeat.id);
            }
            setFilterEvent(String(inProgressHeat.event_id || ''));
            setFilterDivision(inProgressHeat.division || '');
            setFilterRound(inProgressHeat.round || '');
        } else if (!selectedHeatId && assignedHeats.length > 0) {
            setSelectedHeatId(assignedHeats[0].id);
        }
    }, [heats, inProgressHeat, selectedHeatId, assignedHeats]);

    // ─── Cascade filter derived values ──────────────────────────────────
    const canSelectDivision = !!filterEvent;
    const canSelectRound = !!filterEvent && !!filterDivision;
    const canSelectHeat = !!filterEvent && !!filterDivision && !!filterRound;

    const filteredDivisions = canSelectDivision
        ? [...new Set(assignedHeats.filter(h => String(h.event_id) === String(filterEvent)).map(h => h.division).filter(d => d && d !== 'Break'))].sort()
        : [];

    const filteredRounds = canSelectRound
        ? [...new Set(
            assignedHeats
                .filter(h =>
                    String(h.event_id) === String(filterEvent) &&
                    h.division === filterDivision &&
                    h.round
                )
                .map(h => h.round)
        )].sort((a, b) => {
            const getWeight = (r) => {
                const lower = r.toLowerCase();
                if (lower === 'final') return 10000;
                if (lower === 'semi final' || lower === 'semifinal') return 9000;
                if (lower === 'quarter final' || lower === 'quarterfinal') return 8000;
                const numMatch = lower.match(/\d+/);
                const num = numMatch ? parseInt(numMatch[0], 10) : 0;
                if (lower.includes('qualifier')) return 1000 + num;
                if (lower.includes('round')) return 2000 + num;
                return 5000;
            };
            const wA = getWeight(a), wB = getWeight(b);
            return wA === wB ? a.localeCompare(b) : wA - wB;
        })
        : [];

    const filteredHeatsForSelect = canSelectHeat
        ? assignedHeats.filter(h =>
            String(h.event_id) === String(filterEvent) &&
            h.division === filterDivision &&
            h.round === filterRound
        )
        : [];
    // ────────────────────────────────────────────────────────────────────



    // Fetch scores when selected heat or judge changes, and poll for updates
    useEffect(() => {
        if (selectedHeat && judge) {
            fetchScores(selectedHeat.id, judge.id, selectedHeat.event_type);
            fetchLiveStatus(selectedHeat.id);

            // Poll for updates every 2 seconds
            const interval = setInterval(() => {
                fetchScores(selectedHeat.id, judge.id, selectedHeat.event_type);
                fetchLiveStatus(selectedHeat.id);
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [selectedHeat?.id, judge?.id]);

    const fetchLiveStatus = async (heatId) => {
        try {
            const res = await axios.get(`${API_BASE}/heats/${heatId}/live-status`);
            if (res.data.activeSessions) {
                setActiveSessions(res.data.activeSessions);
            } else {
                setActiveSessions([]);
            }
        } catch (err) {
            console.error('Error fetching live status:', err);
        }
    };

    // Timer effect — uses serverTimeOffset from state but must NOT re-mount
    // just because serverTimeOffset changes (it's set once and then stable).
    // Using a ref allows the interval to always read the latest value without re-creating.
    const serverTimeOffsetRef = useRef(serverTimeOffset);
    useEffect(() => { serverTimeOffsetRef.current = serverTimeOffset; }, [serverTimeOffset]);

    // ── One-time startup sweep: purge old-format sup_finishes_* entries from localStorage ──
    // The old format was a plain JSON array with no actualStartTime, making it impossible to
    // validate freshness.  We cannot safely reuse any entry in that format, so we remove them all
    // once when the component mounts so the judge always starts with a clean slate.
    useEffect(() => {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sup_finishes_')) {
                try {
                    const raw = localStorage.getItem(key);
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        toRemove.push(key);
                    }
                } catch (e) {
                    toRemove.push(key); // corrupt — also remove
                }
            }
        }
        toRemove.forEach(k => localStorage.removeItem(k));
    }, []); // runs exactly once on mount

    // Restore timer and finishes from localStorage or actual_start_time ONCE on mount/heat change
    useEffect(() => {
        if (!selectedHeat?.id) return;

        // ── ALWAYS wipe in-memory state first ──────────────────────────────────
        // This is the primary guard: no matter what localStorage or DB returns later,
        // the old heat's data is gone from the UI immediately on any heat/time change.
        setSupRecordedFinishes([]);
        setSupSubmitted(false);
        supLoadedForHeatRef.current = null;
        supTimerLoadedForHeatRef.current = null;
        // ───────────────────────────────────────────────────────────────────────

        if (selectedHeat?.event_type === 'SUP Event') {
            // Proactively clear any stale finishes or timers from localStorage for scheduled/unstarted heats
            if (selectedHeat.status === 'scheduled' || !selectedHeat.status) {
                prevActualStartTimeRef.current = null;
                localStorage.removeItem(`sup_finishes_${selectedHeat.id}`);
                localStorage.removeItem(`sup_timer_${selectedHeat.id}`);
                setSupStopwatchTime(0);
                setSupStopwatchRunning(false);
                supAccumulatedTimeRef.current = 0;
                supTimerLoadedForHeatRef.current = selectedHeat.id;
                supLastSavedHeatIdRef.current = selectedHeat.id;
                return;
            }

            // ── Auto page-reload when admin starts a fresh heat run ───────────────
            // If actual_start_time changed (admin pressed Start again on same heat, or
            // judge switched to a newly started heat), the cleanest fix is a full page
            // reload — it wipes all React state and stale localStorage in one shot.
            const currentStartTime = selectedHeat.actual_start_time;
            if (
                prevActualStartTimeRef.current !== null &&          // not first load
                prevActualStartTimeRef.current !== currentStartTime // start time changed
            ) {
                prevActualStartTimeRef.current = currentStartTime;
                window.location.reload();
                return; // nothing else matters — page is reloading
            }
            prevActualStartTimeRef.current = currentStartTime;
            // ─────────────────────────────────────────────────────────────────────

            // Load finishes from localStorage only if they belong to THIS exact heat run.
            // executeSupReset just wrote an empty entry, so we re-read to see if there's
            // anything valid to restore (e.g. page refresh mid-heat).
            const localFinishes = localStorage.getItem(`sup_finishes_${selectedHeat.id}`);
            let validLocalFinishes = [];
            if (localFinishes) {
                try {
                    const parsed = JSON.parse(localFinishes);
                    if (parsed && !Array.isArray(parsed) && parsed.actualStartTime === selectedHeat.actual_start_time) {
                        validLocalFinishes = parsed.finishes || [];
                    }
                } catch (e) {
                    localStorage.removeItem(`sup_finishes_${selectedHeat.id}`);
                }
            }
            if (validLocalFinishes.length > 0) {
                setSupRecordedFinishes(validLocalFinishes);
            }
            supLastSavedHeatIdRef.current = selectedHeat.id;


            if (supTimerLoadedForHeatRef.current !== selectedHeat.id) {
                supTimerLoadedForHeatRef.current = selectedHeat.id;

                const dbRunning = selectedHeat?.sup_timer_running === 1;
                const dbAccumulated = selectedHeat?.sup_timer_accumulated || 0;
                const dbStartTime = selectedHeat?.sup_timer_start_time ? new Date(selectedHeat.sup_timer_start_time).getTime() : null;

                const savedTimer = localStorage.getItem(`sup_timer_${selectedHeat.id}`);
                let running = dbRunning;
                let accumulated = dbAccumulated;
                let startTime = dbStartTime;
                let hasSaved = false;

                if (savedTimer) {
                    try {
                        const local = JSON.parse(savedTimer);
                        running = local.running;
                        accumulated = local.accumulated || 0;
                        startTime = local.startTime;
                        hasSaved = true;
                    } catch (e) { }
                }

                if (!hasSaved && !dbRunning && selectedHeat?.status === 'in-progress' && selectedHeat?.actual_start_time) {
                    // Auto-start is now disabled as per user request. The judge will manually start the stopwatch.
                }

                supAccumulatedTimeRef.current = accumulated || 0;
                if (running && startTime) {
                    supStartTimeRef.current = startTime;
                    setSupStopwatchTime(accumulated + (Date.now() - startTime));
                    setSupStopwatchRunning(true);
                } else {
                    setSupStopwatchTime(accumulated || 0);
                    setSupStopwatchRunning(false);
                }
            }
        } else {
            setSupRecordedFinishes([]);
            setSupStopwatchTime(0);
            setSupStopwatchRunning(false);
            supAccumulatedTimeRef.current = 0;
        }
    }, [selectedHeat?.id, selectedHeat?.event_type, selectedHeat?.status, selectedHeat?.actual_start_time, serverTimeOffset]);

    // Save finishes to localStorage to survive page refresh before submission
    useEffect(() => {
        if (selectedHeat?.id && isSupEvent) {
            if (supLoadedForHeatRef.current === selectedHeat.id) {
                localStorage.setItem(`sup_finishes_${selectedHeat.id}`, JSON.stringify({
                    actualStartTime: selectedHeat.actual_start_time,
                    finishes: supRecordedFinishes
                }));
            }
        }
    }, [supRecordedFinishes, selectedHeat?.id, isSupEvent, selectedHeat?.actual_start_time]);

    useEffect(() => {
        const updateTimer = () => {
            if (selectedHeat) {
                const offset = serverTimeOffsetRef.current;
                if (selectedHeat.status === 'in-progress' && selectedHeat.actual_start_time) {
                    const start = new Date(selectedHeat.actual_start_time).getTime();
                    const now = Date.now() + offset;

                    if (now < start) {
                        // Negative countdown phase (-0:10 to 0:00)
                        const diff = Math.ceil((start - now) / 1000);
                        setRemainingTime(`-0:${diff.toString().padStart(2, '0')}`);
                    } else {
                        const elapsed = Math.floor((now - start) / 1000);
                        const total = (selectedHeat.duration || 30) * 60;
                        const remaining = Math.max(0, total - elapsed);
                        const mins = Math.floor(remaining / 60);
                        const secs = remaining % 60;
                        setRemainingTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                    }
                } else if (selectedHeat.status === 'completed') {
                    setRemainingTime('00:00');
                } else {
                    setRemainingTime(`${selectedHeat.duration || 30}:00`);
                }
            }
        };

        updateTimer();
        const timerInterval = setInterval(updateTimer, 1000);

        return () => clearInterval(timerInterval);
        // serverTimeOffset intentionally excluded — accessed via ref to avoid restart jitter
    }, [selectedHeat]);

    const handleManualRefresh = async () => {
        if (judge) {
            await Promise.all([
                fetchJudgeData(judge.id),
                selectedHeat ? fetchScores(selectedHeat.id, judge.id) : Promise.resolve()
            ]);
        }
    };

    // ... (rest of component) ...



    // Start Timer Effect (Polls for 'start soon' timers)
    useEffect(() => {
        const checkStartTimers = () => {
            const activeTimerHeat = heats.find(h => {
                // Only check heats assigned to this judge
                if (!assignedHeatIds.includes(h.id)) return false;

                if (!h.timer_start_time || !h.timer_duration) return false;
                const startTime = new Date(h.timer_start_time).getTime();
                const now = Date.now() + serverTimeOffset;
                // Timer is shown if we have reached the start time and the heat is still scheduled
                return now >= startTime && (h.status === 'scheduled' || !h.status);
            });

            if (activeTimerHeat) {
                const startTime = new Date(activeTimerHeat.timer_start_time).getTime();
                const durationMs = activeTimerHeat.timer_duration * 60 * 1000;
                const now = Date.now() + serverTimeOffset;
                const remaining = Math.max(0, Math.ceil((startTime + durationMs - now) / 1000));

                if (remaining === 0 && (activeTimerHeat.status === 'scheduled' || !activeTimerHeat.status)) {
                    // Trigger Auto Start
                    axios.patch(`${API_BASE}/heats/${activeTimerHeat.id}/status`, {
                        status: 'in-progress',
                        mode: 'auto-timer'
                    }).catch(err => console.error('Auto-start failed:', err));
                }

                setStartTimer({
                    heatId: activeTimerHeat.id,
                    remainingSeconds: remaining,
                    heat: activeTimerHeat
                });

                // Auto-select this heat if not already selected
                if (selectedHeatId !== activeTimerHeat.id) {
                    setSelectedHeatId(activeTimerHeat.id);
                }
            } else {
                setStartTimer(null);
            }
        };

        const timer = setInterval(checkStartTimers, 1000);
        checkStartTimers(); // Initial check
        return () => clearInterval(timer);
    }, [heats, selectedHeatId, assignedHeatIds]);

    const fetchScores = async (heatId, judgeId, heatEventType) => {
        try {
            const response = await axios.get(`${API_BASE}/scores`, {
                params: { heat_id: heatId, judge_id: judgeId }
            });
            const scoresMap = {};
            const statusesMap = {};
            // Group by wave key — a judge may have 2 rows (a regular score + INT row)
            const byWave = {};
            response.data.forEach(s => {
                const key = `${s.surfer_id}-${s.wave_number}`;
                if (!byWave[key]) byWave[key] = [];
                byWave[key].push(s);
            });
            Object.entries(byWave).forEach(([key, rows]) => {
                let regularRow = rows.find(r => !r.is_interference);
                const intRow = rows.find(r => !!r.is_interference);

                // If there's no normal non-INT row, but the INT row exists AND has a real score or was master overridden,
                // it means the master consolidated the score + INT into a single row. Fall back to it.
                if (!regularRow && intRow && (intRow.score > 0 || intRow.master_override_score !== null)) {
                    regularRow = intRow;
                }

                if (regularRow) {
                    const isRescore = regularRow.status === 'rescore';
                    scoresMap[key] = isRescore && regularRow.original_score != null
                        ? regularRow.original_score
                        : regularRow.score;
                }
                const primaryRow = regularRow || intRow;
                if (primaryRow) {
                    statusesMap[key] = {
                        status: primaryRow.status || 'pending',
                        id: primaryRow.id,
                        rejectionNotified: primaryRow.rejection_notified,
                        is_interference: !!intRow,
                        interference_pct: intRow?.interference_pct || null,
                        has_score: !!regularRow,
                        original_score: primaryRow.original_score ?? null
                    };
                }
            });
            setScores(scoresMap);
            setScoreStatuses(statusesMap);

            // ── SUP: Restore recorded finishes from DB on first load for this heat ──
            // Only runs once per heat (ref guard) so it doesn't overwrite live state during a race
            if (heatEventType === 'SUP Event' && supLoadedForHeatRef.current !== heatId) {
                supLoadedForHeatRef.current = heatId;
                // Filter to only real finish scores (wave_number=1, not interference)
                const supScores = response.data
                    .filter(s => !s.is_interference && s.wave_number === 1 && s.score > 0)
                    .sort((a, b) => a.score - b.score); // ascending: lowest time = 1st place
                if (supScores.length > 0) {
                    setSupRecordedFinishes(supScores.map((s, idx) => ({
                        id: s.id,
                        position: idx + 1,
                        time: s.score,        // score = milliseconds
                        competitorId: String(s.surfer_id),
                        penalty: 0            // penalty already baked into saved score
                    })));
                } else {
                    const localFinishes = localStorage.getItem(`sup_finishes_${heatId}`);
                    if (localFinishes) {
                        try {
                            const parsed = JSON.parse(localFinishes);
                            if (Array.isArray(parsed)) {
                                // Old format — no actualStartTime embedded, cannot validate — treat as stale
                                setSupRecordedFinishes([]);
                                localStorage.removeItem(`sup_finishes_${heatId}`);
                            } else if (parsed && typeof parsed === 'object') {
                                if (parsed.actualStartTime === selectedHeat?.actual_start_time) {
                                    setSupRecordedFinishes(parsed.finishes || []);
                                } else {
                                    setSupRecordedFinishes([]);
                                    localStorage.removeItem(`sup_finishes_${heatId}`);
                                }
                            }
                        } catch (e) {
                            setSupRecordedFinishes([]);
                            localStorage.removeItem(`sup_finishes_${heatId}`);
                        }
                    }
                }
            }

            // Check for unnotified rejections
            const unnotifiedRejections = response.data.filter(
                s => s.status === 'rejected' && s.rejection_notified === 0
            );

            if (unnotifiedRejections.length > 0) {
                // Notify user about rejections
                unnotifiedRejections.forEach(async (s) => {
                    setCustomAlert({ message: `Your score for Wave ${s.wave_number} has been rejected by the Head Judge. Please re-score this wave.` });
                    // Mark as notified
                    await axios.patch(`${API_BASE}/scores/${s.id}/notified`);
                });
                // Refresh scores to update notification status
                setTimeout(() => fetchScores(heatId, judgeId), 500);
            }

            // Check for unnotified rescore requests
            const unnotifiedRescores = response.data.filter(
                s => s.status === 'rescore' && s.rescore_notified === 0
            );

            if (unnotifiedRescores.length > 0) {
                // Queue up alerts to show one modal at a time
                const surfers = selectedHeat?.surfers || [];
                const newAlerts = unnotifiedRescores.map(s => {
                    const surfer = surfers.find(surf => surf.id == s.surfer_id);
                    if (!surfer) return null; // Wait for surfer data if not yet loaded
                    const jersey = surfer?.color || 'jersey';
                    return {
                        id: s.id,
                        waveNumber: s.wave_number,
                        jersey,
                        scoreId: s.id,
                        originalScore: s.original_score,
                        // Preserve INT data so modal can pre-select it
                        is_interference: s.is_interference ? 1 : 0,
                        interference_pct: s.interference_pct || 0,
                        surfer,
                        heatId
                    };
                }).filter(Boolean);
                setRescoreAlerts(prev => {
                    // Avoid duplicates
                    const existingIds = new Set(prev.map(a => a.id));
                    return [...prev, ...newAlerts.filter(a => !existingIds.has(a.id))];
                });
            }

            // Check for unnotified master overrides
            const unnotifiedOverrides = response.data.filter(
                s => s.master_override_score !== null && s.master_override_notified === 0
            );

            if (unnotifiedOverrides.length > 0) {
                const surfers = selectedHeat?.surfers || [];
                const newOverrideAlerts = unnotifiedOverrides.map(s => {
                    const surfer = surfers.find(surf => surf.id === s.surfer_id);
                    const color = surfer?.color || 'jersey';
                    return {
                        id: s.id,
                        waveNumber: s.wave_number,
                        jersey: color,
                        oldScore: s.original_score,
                        newScore: s.master_override_score,
                        scoreId: s.id,
                        heatId
                    };
                });
                setOverrideAlerts(prev => {
                    const existingIds = new Set(prev.map(a => a.id));
                    return [...prev, ...newOverrideAlerts.filter(a => !existingIds.has(a.id))];
                });
            }
        } catch (err) {
            console.error('Error fetching scores:', err);
        }
    };

    const handleScoreReset = async () => {
        if (!judge || !selectedHeat || !scoringModal?.surfer || !scoringModal?.waveNumber) return;

        try {
            setIsResettingScore(true);

            await axios.post(`${API_BASE}/scores/reset`, {
                heat_id: selectedHeat.id,
                surfer_id: scoringModal.surfer.id,
                judge_id: judge.id,
                wave_number: scoringModal.waveNumber
            });

            const key = `${scoringModal.surfer.id}-${scoringModal.waveNumber}`;
            setScores(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            setScoreStatuses(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });

            setMessage(`Wave ${scoringModal.waveNumber} reset. Please rescore.`);
            setTimeout(() => setMessage(''), 3000);
            setRescoreSameScoreWarning(false);
            setScoringModal(null);

            await Promise.all([
                fetchScores(selectedHeat.id, judge.id),
                fetchLiveStatus(selectedHeat.id),
                fetchJudgeData(judge.id)
            ]);
        } catch (err) {
            console.error('Error resetting score:', err);
            setCustomAlert({ message: 'Failed to reset score.' });
        } finally {
            setIsResettingScore(false);
        }
    };

    const handleScoreSubmit = async (surferId, waveNumber, score) => {
        if (!judge || !selectedHeat || selectedHeat.status !== 'in-progress') return;

        // Check for other judges' interference marks on this wave
        const sessionForWave = activeSessions.find(s => s.surfer_id === surferId && s.wave_number === waveNumber);
        const pendingInts = sessionForWave?.scores.filter(s => !!s.is_interference) || [];
        const myPendingInt = pendingInts.find(s => s.judge_id === judge.id);
        const othersPendingInt = pendingInts.filter(s => s.judge_id !== judge.id);
        // Also check statusesMap for this judge's own INT (survives polling gaps)
        const myStatusInt = scoreStatuses[`${surferId}-${waveNumber}`]?.is_interference;

        // Only block if another judge has INT AND this judge hasn't yet marked their own INT.
        // Check 3 sources: (1) backend active session, (2) scoreStatuses map, (3) local modal selection (INT not yet sent to backend)
        const myIntSelected = (scoringModal?.interferenceSelected !== null && scoringModal?.interferenceSelected !== undefined);
        if (othersPendingInt.length > 0 && !myPendingInt && !myStatusInt && !myIntSelected) {
            setCustomAlert({ message: "Another judge has marked Interference for this wave. Please mark your interference first." });
            setScoringModal(prev => ({ ...prev, showInterference: true }));
            return false;
        }

        try {
            // 1. If interference is selected in the modal, submit it first
            if (scoringModal?.interferenceSelected !== undefined && scoringModal?.interferenceSelected !== null) {
                await axios.patch(`${API_BASE}/heats/${selectedHeat.id}/interference/mark`, {
                    surfer_id: surferId,
                    percentage: scoringModal.interferenceSelected,
                    wave_number: waveNumber,
                    judge_id: judge.id
                });
            }

            // 2. Submit the regular score
            await axios.post(`${API_BASE}/scores`, {
                heat_id: selectedHeat.id,
                surfer_id: surferId,
                judge_id: judge.id,
                wave_number: waveNumber,
                score: parseFloat(score)
            });

            // Update local state
            setScores(prev => ({
                ...prev,
                [`${surferId}-${waveNumber}`]: score
            }));
            setMessage(`Score for Wave ${waveNumber} submitted!`);
            setTimeout(() => setMessage(''), 3000);

            // Remove any rescore alert card for this surfer+wave, whether the judge
            // used the OK button on the card or tapped the cell directly.
            setRescoreAlerts(prev => prev.filter(a =>
                !(a.surfer?.id == surferId && a.waveNumber === waveNumber)
            ));

            return true;
        } catch (err) {
            console.error('Error submitting score:', err);
            setCustomAlert({ message: 'Failed to save score.' });
            return false;
        }
    };

    const handleUnlockWave = async (surfer, waveNumber) => {
        const surferId = surfer.id;
        // Optimistic update: immediately show the new cell in UI
        setHeats(prev => prev.map(h => {
            if (h.id !== selectedHeat?.id) return h;
            return {
                ...h,
                surfers: (h.surfers || []).map(s => {
                    if (s.id !== surferId) return s;
                    return { ...s, waves_unlocked: (s.waves_unlocked || 10) + 1 };
                })
            };
        }));

        // Immediately open the scoring modal for the newly unlocked cell
        setRescoreSameScoreWarning(false);
        setScoringModal({
            surfer,
            waveNumber: waveNumber,
            currentScore: undefined,
            selectedBase: undefined,
            typedDigits: [],
            selection: null,
            interferenceSelected: null,
            isRescore: false
        });

        try {
            await axios.patch(`${API_BASE}/heats/${selectedHeat.id}/surfers/${surferId}/unlock-wave`);
            // Background sync — don't block UI
            if (judge?.id) fetchJudgeData(judge.id);
            if (selectedHeat?.id && judge?.id) fetchScores(selectedHeat.id, judge.id);
        } catch (err) {
            console.error('Error unlocking wave:', err);
            // Revert optimistic update on error
            if (judge?.id) fetchJudgeData(judge.id);
        }
    };

    const maxWaves = selectedHeat?.max_waves === 0
        ? Math.max(10, ...(selectedHeat?.surfers || []).map(s => s.waves_unlocked || 0)) + 1
        : (selectedHeat?.max_waves || 10);
    const waves = Array.from({ length: maxWaves }, (_, i) => i + 1);

    const isScoringLocked = selectedHeat?.status !== 'in-progress' || (remainingTime.startsWith('-') && !remainingTime.includes('--'));

    const handleRescoreAlertOk = async (passedAlert) => {
        const alertObj = passedAlert || rescoreAlerts[0];
        if (!alertObj) return;
        try {
            await axios.patch(`${API_BASE}/scores/${alertObj.scoreId}/rescore-notified`);

            // Mark as notified in local state too
            if (judge?.id && selectedHeat?.id) {
                fetchScores(selectedHeat.id, judge.id);
            }

            // Open the scoring modal for this wave
            // Try to get surfer from alert or fallback to current heat's surfers
            let surferToScore = alertObj.surfer;
            if (!surferToScore && selectedHeat?.surfers) {
                // If surfer was missing in alert (race condition), try finding it now
                try {
                    const singleScoreRes = await axios.get(`${API_BASE}/scores/${alertObj.scoreId}`);
                    if (singleScoreRes.data && selectedHeat.surfers) {
                        surferToScore = selectedHeat.surfers.find(s => s.id == singleScoreRes.data.surfer_id);
                    }
                } catch (fetchErr) {
                    console.error('Failed to resolve surfer from backend:', fetchErr);
                }
            }

            if (surferToScore) {
                const oldScore = alertObj.originalScore;
                // Restore INT if this wave had one — judge doesn't need to re-mark it
                const savedIntPct = (alertObj.is_interference && alertObj.interference_pct)
                    ? alertObj.interference_pct
                    : null;
                setScoringModal({
                    surfer: surferToScore,
                    waveNumber: alertObj.waveNumber,
                    currentScore: oldScore,
                    typedDigits: oldScore != null ? oldScore.toString().split('').filter(c => c !== '.').map(Number) : [],
                    selectedBase: oldScore != null ? Math.floor(oldScore) : undefined,
                    selection: oldScore,
                    // Pre-select the previous INT percentage — judge does NOT need to re-mark it
                    interferenceSelected: savedIntPct,
                    isRescore: true,
                    rescoreAlertId: alertObj.id
                });
                // Mark the card as "waiting for score" — keep it visible but show pending state
                setRescoreAlerts(prev => prev.map(a =>
                    a.id === alertObj.id ? { ...a, pendingOpen: true } : a
                ));
            } else {
                console.warn('Could not find surfer for rescore alert:', alertObj);
                // Last resort: if we still can't find it, we can't open properly
                setCustomAlert({ message: "Could not open scoring - surfer data missing. Please refresh." });
            }
        } catch (err) {
            console.error('Error acknowledging rescore:', err);
        }
        // NOTE: Do NOT remove the alert here — it stays until the judge actually submits a new score
    };

    const handleOverrideAlertClose = async (alertId) => {
        try {
            await axios.patch(`${API_BASE}/scores/${alertId}/override-notified`);
            setOverrideAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (err) {
            console.error('Error acknowledging override:', err);
        }
    };

    return (
        <div className={`admin-layout${adminTheme === 'dark' ? ' admin-dark' : ''}`}>
            {/* Global Success Toast */}
            {message && (
                <div style={{
                    position: 'fixed',
                    top: '32px',
                    right: '32px',
                    background: '#ecfdf5',
                    border: '1px solid #10b981',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'toast-slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: '#10b981',
                    zIndex: 9999,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}>
                    <div style={{
                        background: '#10b981',
                        color: 'white',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Check size={14} strokeWidth={3} />
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>{message}</p>
                </div>
            )}

            {/* Notifications and Alerts Area Area Above Table */}

            <style>
                {`
                    .scoring-dots span {
                        animation: blink 1.4s infinite both;
                        font-weight: 800;
                    }
                    .scoring-dots span:nth-child(2) { animation-delay: 0.2s; }
                    .scoring-dots span:nth-child(3) { animation-delay: 0.4s; }
                    @keyframes blink {
                        0% { opacity: 0.2; }
                        20% { opacity: 1; }
                        100% { opacity: 0.2; }
                    }
                    `}
            </style>
            {/* Header */}
            <header className="header" style={{
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white',
                borderBottom: 'none',
                overflow: 'hidden'
            }}>
                {/* Dark Overlay for Readability */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(15, 23, 42, 0.4))',
                    zIndex: 1
                }} />

                <div className="jd-header-content" style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="icon-box" style={{ width: '40px', height: '40px', marginBottom: 0, background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', flexShrink: 0 }}>
                            <Waves size={20} strokeWidth={2.5} style={{ color: 'white' }} />
                        </div>
                        <div className="jd-header-text">
                            <h1 style={{ fontSize: '18px', fontWeight: '700', color: 'white', margin: 0, lineHeight: 1.2 }}>Surf Competition</h1>
                            <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>Judge Scoring Console</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="jd-user-info" style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: 'white', margin: 0 }}>{judge?.name || 'Guest Judge'}</p>
                            <p style={{ fontSize: '9px', padding: '1px 6px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', borderRadius: '4px', fontWeight: '700', margin: 0, display: 'inline-block' }}>
                                Judge #{judge?.judge_number || '-'}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('judgeInfo');
                                navigate('/judge/login');
                            }}
                            className="btn-secondary"
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                flexShrink: 0
                            }}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="container-max jd-main-content animate-fade-in">
                <div className="jd-title-section" style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-1.5px', marginBottom: '8px' }}>
                        {isSupEvent ? 'Judge Panel & Timekeeper' : 'Judge Scoring Interface'}
                    </h2>
                    <p className="text-secondary" style={{ fontSize: '16px' }}>
                        {isSupEvent ? 'Record finish times in order, then assign competitors to positions' : 'Click on any wave cell to enter your score'}
                    </p>
                </div>

                {isLoading ? (
                    <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                        <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                        <p className="text-secondary">Loading dashboard...</p>
                    </div>
                ) : judge?.status === 'Pending' ? (
                    <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                        <div className="icon-box" style={{ margin: '0 auto 20px', background: 'rgba(255, 138, 0, 0.1)' }}>
                            <Clock size={32} style={{ color: '#ff8a00' }} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Awaiting Approval</h3>
                        <p className="text-secondary" style={{ fontSize: '15px' }}>Your request is pending approval from the event organizer.</p>
                    </div>
                ) : assignedHeats.length === 0 ? (
                    <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                        <div className="icon-box" style={{ margin: '0 auto 20px', background: 'var(--surface-hover)' }}>
                            <User size={32} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>No Heat Assigned</h3>
                        <p className="text-secondary" style={{ fontSize: '15px' }}>Please wait for the event organizer to assign you to a heat.</p>
                    </div>
                ) : (
                    <>
                        {/* Heat Selection Card */}
                        <div className="card" style={{ padding: '24px', marginBottom: '32px', background: 'rgba(15, 23, 42, 0.01)', border: '1px solid var(--border-dim)' }}>
                            {(inProgressHeat || startTimer) && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: 'rgba(239,68,68,0.07)', color: '#ef4444',
                                    padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.18)',
                                    fontSize: '12px', fontWeight: '800', marginBottom: '16px'
                                }}>
                                    <Zap size={13} />
                                    LIVE LOCK — Heat #{(inProgressHeat || startTimer?.heat)?.heat_number} · {(inProgressHeat || startTimer?.heat)?.round} · {formatDivisionName((inProgressHeat || startTimer?.heat)?.division, events.find(e => e.id === (inProgressHeat || startTimer?.heat)?.event_id))} is live
                                </div>
                            )}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '16px'
                            }}>
                                {/* 1. Select Event */}
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block', flexShrink: 0 }} />
                                        Event
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            className="form-control"
                                            value={filterEvent}
                                            disabled={!!inProgressHeat || !!startTimer}
                                            onChange={(e) => {
                                                setFilterEvent(e.target.value);
                                                setFilterDivision('');
                                                setFilterRound('');
                                                setSelectedHeatId('');
                                            }}
                                            style={{ fontSize: '13px', fontWeight: '600', padding: '10px 36px 10px 14px', appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none', width: '100%', borderRadius: '10px', border: '1.5px solid var(--border-dim)', background: 'var(--bg-main)', cursor: (inProgressHeat || startTimer) ? 'not-allowed' : 'pointer' }}
                                        >
                                            <option value="">Select Event</option>
                                            {[...new Set(assignedHeats.map(h => h.event_id))].map(evId => {
                                                const h = assignedHeats.find(x => x.event_id === evId);
                                                return <option key={evId} value={String(evId)}>{h?.event_name || evId}</option>;
                                            })}
                                        </select>
                                        <ChevronDown size={14} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    </div>
                                </div>

                                {/* 2. Select Section */}
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8b5cf6', display: 'inline-block', flexShrink: 0 }} />
                                        Section
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            className="form-control"
                                            value={filterDivision}
                                            disabled={!!inProgressHeat || !!startTimer || !canSelectDivision}
                                            onChange={(e) => {
                                                setFilterDivision(e.target.value);
                                                setFilterRound('');
                                                setSelectedHeatId('');
                                            }}
                                            style={{ fontSize: '13px', fontWeight: '600', padding: '10px 36px 10px 14px', appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none', width: '100%', borderRadius: '10px', border: '1.5px solid var(--border-dim)', background: 'var(--bg-main)', cursor: (inProgressHeat || startTimer || !canSelectDivision) ? 'not-allowed' : 'pointer', opacity: (!canSelectDivision || !filteredDivisions.length) ? 0.5 : 1 }}
                                        >
                                            <option value="">Select Section</option>
                                            {filteredDivisions.map(div => (
                                                <option key={div} value={div}>{div}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    </div>
                                </div>

                                {/* 3. Select Round */}
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
                                        Round
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            className="form-control"
                                            value={filterRound}
                                            disabled={!!inProgressHeat || !!startTimer || !canSelectRound}
                                            onChange={(e) => {
                                                setFilterRound(e.target.value);
                                                setSelectedHeatId('');
                                            }}
                                            style={{ fontSize: '13px', fontWeight: '600', padding: '10px 36px 10px 14px', appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none', width: '100%', borderRadius: '10px', border: '1.5px solid var(--border-dim)', background: 'var(--bg-main)', cursor: (inProgressHeat || startTimer || !canSelectRound) ? 'not-allowed' : 'pointer', opacity: (!canSelectRound || !filteredRounds.length) ? 0.5 : 1 }}
                                        >
                                            <option value="">Select Round</option>
                                            {filteredRounds.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    </div>
                                </div>

                                {/* 4. Select Heat */}
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
                                        Heat
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            className="form-control"
                                            value={selectedHeatId}
                                            disabled={!!inProgressHeat || !!startTimer || !canSelectHeat}
                                            onChange={(e) => setSelectedHeatId(e.target.value)}
                                            style={{ fontSize: '13px', fontWeight: '600', padding: '10px 36px 10px 14px', appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none', width: '100%', borderRadius: '10px', border: '1.5px solid var(--border-dim)', background: 'var(--bg-main)', cursor: (inProgressHeat || startTimer || !canSelectHeat) ? 'not-allowed' : 'pointer', opacity: (!canSelectHeat || !filteredHeatsForSelect.length) ? 0.5 : 1 }}
                                        >
                                            <option value="">Select Heat</option>
                                            {filteredHeatsForSelect.map(h => (
                                                <option key={h.id} value={h.id}>
                                                    {h.status === 'in-progress' ? '🔥 LIVE: ' : ''}Heat #{h.heat_number}{h.sup_category ? ` [${h.sup_category}]` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    </div>
                                </div>
                            </div>
                        </div>


                        {selectedHeat && (
                            <div className="card jd-status-card" style={{
                                padding: '24px 32px',
                                marginBottom: '24px',
                                background: selectedHeat.status === 'in-progress'
                                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.07), rgba(34, 197, 94, 0.02))'
                                    : selectedHeat.status === 'completed'
                                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.07), rgba(239, 68, 68, 0.02))'
                                        : 'linear-gradient(135deg, rgba(148, 163, 184, 0.1), rgba(148, 163, 184, 0.04))',
                                border: `1px solid ${selectedHeat.status === 'in-progress' ? 'rgba(34, 197, 94, 0.25)' :
                                    selectedHeat.status === 'completed' ? 'rgba(239, 68, 68, 0.25)' :
                                        'rgba(148, 163, 184, 0.25)'
                                    }`,
                                borderRadius: '20px',
                                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02)',
                                transition: 'all 0.3s ease'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '24px',
                                    width: '100%'
                                }} className="jd-status-layout">

                                    {/* Left: Status & Timer info */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '24px',
                                        flexWrap: 'wrap',
                                        flexShrink: 0
                                    }}>
                                        <div>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                                color: 'var(--text-muted)',
                                                display: 'block',
                                                marginBottom: '6px'
                                            }}>
                                                Heat Status
                                            </span>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '6px 16px',
                                                borderRadius: '12px',
                                                fontSize: '15px',
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                color: selectedHeat.status === 'in-progress' ? '#15803d' :
                                                    selectedHeat.status === 'completed' ? '#dc2626' : '#475569',
                                                background: selectedHeat.status === 'in-progress' ? 'rgba(34, 197, 94, 0.15)' :
                                                    selectedHeat.status === 'completed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.15)',
                                                border: `1px solid ${selectedHeat.status === 'in-progress' ? 'rgba(34, 197, 94, 0.25)' :
                                                        selectedHeat.status === 'completed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.2)'
                                                    }`
                                            }} className={selectedHeat.status === 'in-progress' ? 'animate-pulse' : ''}>
                                                {selectedHeat.status === 'in-progress' ? '● Progress' :
                                                    selectedHeat.status === 'completed' ? '● Completed' : '○ Scheduled'}
                                            </span>
                                        </div>

                                        {selectedHeat.event_type !== 'SUP Event' && (
                                            <>
                                                <div className="jd-status-divider" style={{ width: '1px', height: '40px', background: 'var(--border-dim)' }} />
                                                <div>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '1px',
                                                        color: 'var(--text-muted)',
                                                        display: 'block',
                                                        marginBottom: '6px'
                                                    }}>
                                                        Time Remaining
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Clock size={20} style={{ color: selectedHeat.status === 'in-progress' ? '#3b82f6' : 'var(--text-muted)' }} />
                                                        <span style={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '28px',
                                                            fontWeight: '800',
                                                            color: remainingTime === '00:00' ? '#ef4444' :
                                                                selectedHeat.status === 'in-progress' ? '#3b82f6' :
                                                                    selectedHeat.status === 'completed' ? '#ef4444' : '#000000',
                                                        }}>
                                                            {remainingTime}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Vertical/Horizontal Separator */}
                                    <div className="jd-status-divider-main" style={{ width: '1px', height: '50px', background: 'var(--border-dim)' }} />

                                    {/* Right: Full Heat Details badging */}
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        minWidth: '280px'
                                    }}>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            color: 'var(--text-muted)'
                                        }}>
                                            Heat Information Details
                                        </span>

                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                            alignItems: 'center'
                                        }}>
                                            {/* Event Name Badge */}
                                            <div style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                background: 'rgba(15, 23, 42, 0.05)',
                                                border: '1px solid rgba(15, 23, 42, 0.08)',
                                                color: 'var(--text-dark)',
                                                fontSize: '13px',
                                                fontWeight: '750',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }} title="Event Name">
                                                <span style={{ fontSize: '14px' }}>🏆</span>
                                                <span>{selectedHeat.event_name}</span>
                                            </div>

                                            {/* Sport/Type Badge */}
                                            <div style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                background: isSupEvent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                border: `1px solid ${isSupEvent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                                                color: isSupEvent ? '#047857' : '#1d4ed8',
                                                fontSize: '13px',
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{ fontSize: '14px' }}>🏄</span>
                                                <span>{isSupEvent ? 'SUP Racing' : 'Surfing'}</span>
                                            </div>

                                            {/* SUP Category Badge (if SUP) */}
                                            {isSupEvent && selectedHeat.sup_category && (
                                                <div style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    background: 'rgba(139, 92, 246, 0.1)',
                                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                                    color: '#6d28d9',
                                                    fontSize: '13px',
                                                    fontWeight: '800',
                                                    textTransform: 'uppercase',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <span style={{ fontSize: '14px' }}>⚡</span>
                                                    <span>{selectedHeat.sup_category} Category</span>
                                                </div>
                                            )}

                                            {/* Division Badge */}
                                            <div style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                                color: '#b45309',
                                                fontSize: '13px',
                                                fontWeight: '750',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }} title="Division">
                                                <span style={{ fontSize: '14px' }}>👥</span>
                                                <span>{selectedHeat.division || 'Open Division'}</span>
                                            </div>

                                            {/* Round & Heat Number Badge */}
                                            <div style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                background: 'rgba(14, 165, 233, 0.1)',
                                                border: '1px solid rgba(14, 165, 233, 0.2)',
                                                color: '#0369a1',
                                                fontSize: '13px',
                                                fontWeight: '800',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{ fontSize: '14px' }}>⏱</span>
                                                <span>{selectedHeat.round} · Heat #{selectedHeat.heat_number}</span>
                                            </div>

                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {!isSupEvent && isScoringLocked && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px 24px',
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.1)',
                                borderRadius: '12px',
                                color: '#ef4444',
                                marginBottom: '24px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                <AlertCircle size={20} />
                                <span>
                                    Scoring is disabled.
                                    {(remainingTime.startsWith('-') && !remainingTime.includes('--'))
                                        ? ' The heat is about to start.'
                                        : ` Heat is currently ${selectedHeat?.status || 'unknown'}.`}
                                </span>
                            </div>
                        )}

                        {/* Interference marking dashboard alert */}
                        {!isSupEvent && !!selectedHeat?.pending_interference_surfer_id && (
                            <div className="animate-fade-in" style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '20px',
                                padding: '32px',
                                marginBottom: '32px',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
                                backdropFilter: 'blur(10px)'
                            }}>
                                {/* Background Decorative element */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-20px',
                                    right: '-20px',
                                    width: '120px',
                                    height: '120px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '50%',
                                    filter: 'blur(40px)',
                                    zIndex: 0
                                }} />

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '24px' }}>
                                        <div style={{
                                            background: '#ef4444',
                                            color: 'white',
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                                            flexShrink: 0
                                        }}>
                                            <AlertCircle size={28} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                                                Interference Marking Required
                                            </h3>
                                            <p style={{ color: 'var(--text-gray)', fontSize: '15px', lineHeight: '1.6', fontWeight: '500' }}>
                                                The tabulator has signaled an interference. Please determine the penalty for
                                                <strong style={{ color: '#ef4444', marginLeft: '6px', fontSize: '16px' }}>
                                                    {(() => {
                                                        const surfer = selectedHeat.surfers.find(s => s.id === selectedHeat.pending_interference_surfer_id);
                                                        const colorName = surfer ? getFriendlyColorName(surfer.color) : '';
                                                        return colorName ? `${colorName} Surfer` : 'Surfer';
                                                    })()}
                                                </strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {[25, 50, 75, 100].map(pct => (
                                            <button
                                                key={pct}
                                                onClick={async () => {
                                                    try {
                                                        await axios.patch(`${API_BASE}/heats/${selectedHeat.id}/interference/mark`, {
                                                            surfer_id: selectedHeat.pending_interference_surfer_id,
                                                            percentage: pct,
                                                            wave_number: selectedHeat.pending_interference_wave_number,
                                                            judge_id: judge.id
                                                        });
                                                        fetchJudgeData(judge.id);
                                                    } catch (err) {
                                                        console.error('Error marking interference:', err);
                                                        setCustomAlert({ message: 'Failed to mark interference.' });
                                                    }
                                                }}
                                                className="btn"
                                                disabled={isScoringLocked}
                                                style={{
                                                    background: 'var(--surface-light)',
                                                    border: '2px solid #ef4444',
                                                    padding: '14px 24px',
                                                    fontWeight: '900',
                                                    fontSize: '16px',
                                                    color: '#ef4444',
                                                    opacity: isScoringLocked ? 0.3 : 1,
                                                    cursor: isScoringLocked ? 'not-allowed' : 'pointer',
                                                    borderRadius: '14px',
                                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    flex: 1,
                                                    minWidth: '100px',
                                                    textAlign: 'center'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isScoringLocked) {
                                                        e.currentTarget.style.background = '#ef4444';
                                                        e.currentTarget.style.color = '#fff';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isScoringLocked) {
                                                        e.currentTarget.style.background = '#ffffff';
                                                        e.currentTarget.style.color = '#ef4444';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }
                                                }}
                                            >
                                                {pct}%
                                            </button>
                                        ))}

                                        <button
                                            onClick={async () => {
                                                setCustomConfirm({
                                                    message: 'Clear this interference alert without penalty?',
                                                    onConfirm: async () => {
                                                        setCustomConfirm(null);
                                                        try {
                                                            await axios.patch(`${API_BASE}/heats/${selectedHeat.id}/interference/mark`, {
                                                                surfer_id: selectedHeat.pending_interference_surfer_id,
                                                                percentage: 0,
                                                                judge_id: judge.id
                                                            });
                                                            fetchJudgeData(judge.id);
                                                        } catch (err) {
                                                            console.error('Error clearing interference:', err);
                                                        }
                                                    }
                                                });
                                            }}
                                            className="btn"
                                            disabled={isScoringLocked}
                                            style={{
                                                background: 'var(--surface-hover)',
                                                border: '1px solid rgba(15, 23, 42, 0.1)',
                                                padding: '14px 24px',
                                                fontWeight: '800',
                                                fontSize: '14px',
                                                color: '#1e293b',
                                                opacity: isScoringLocked ? 0.3 : 1,
                                                cursor: isScoringLocked ? 'not-allowed' : 'pointer',
                                                borderRadius: '14px',
                                                flex: 1,
                                                minWidth: '100px',
                                                textAlign: 'center',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isScoringLocked) {
                                                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isScoringLocked) {
                                                    e.currentTarget.style.background = 'var(--surface-hover)';
                                                }
                                            }}
                                        >
                                            No Penalty
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rescore Notifications */}
                        {!isSupEvent && rescoreAlerts.filter(a => a.heatId === selectedHeat?.id).map((alert) => (
                            <div key={alert.id} className="animate-fade-in" style={{
                                background: alert.pendingOpen ? 'rgba(234, 179, 8, 0.05)' : 'white',
                                border: `1.5px solid ${alert.pendingOpen ? '#eab308' : '#ef4444'}`,
                                borderRadius: '16px',
                                padding: '16px 20px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: alert.pendingOpen ? '0 4px 20px rgba(234, 179, 8, 0.12)' : '0 4px 20px rgba(239, 68, 68, 0.1)',
                                borderLeft: `6px solid ${alert.pendingOpen ? '#eab308' : '#ef4444'}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: alert.pendingOpen ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: alert.pendingOpen ? '#eab308' : '#ef4444'
                                    }}>
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                            Head Judge is asking you to rescore
                                            <span style={{
                                                display: 'inline-block',
                                                background: alert.jersey,
                                                width: '24px',
                                                height: '18px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                verticalAlign: 'middle',
                                                margin: '0 8px'
                                            }} />
                                            Wave {alert.waveNumber} <span style={{ marginLeft: '8px', opacity: 0.8 }}>old score : <strong>{alert.originalScore != null ? Number(alert.originalScore).toFixed(1) : '--'}</strong></span>
                                            {!!alert.is_interference && alert.interference_pct > 0 && (
                                                <span style={{
                                                    marginLeft: '8px',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    padding: '2px 7px',
                                                    borderRadius: '5px',
                                                    letterSpacing: '0.3px',
                                                    verticalAlign: 'middle'
                                                }}>INT {alert.interference_pct}%</span>
                                            )}
                                        </p>
                                        {alert.pendingOpen && (
                                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#b45309', fontWeight: '600' }}>
                                                ⏳ Waiting for your rescore — please submit a new score
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRescoreAlertOk(alert)}
                                    style={{
                                        background: alert.pendingOpen ? '#eab308' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '8px 24px',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {alert.pendingOpen ? 'Rescore' : 'Rescore'}
                                </button>
                            </div>
                        ))}

                        {/* Master Override Notifications */}
                        {!isSupEvent && overrideAlerts.filter(a => a.heatId === selectedHeat?.id).map((alert) => (
                            <div key={alert.id} className="animate-fade-in" style={{
                                background: 'var(--surface-light)',
                                border: '1.5px solid #3b82f6',
                                borderRadius: '16px',
                                padding: '16px 20px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.1)',
                                borderLeft: '6px solid #3b82f6'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#3b82f6'
                                    }}>
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                            Head Judge changed your score for
                                            <span style={{
                                                display: 'inline-block',
                                                background: alert.jersey,
                                                width: '24px',
                                                height: '18px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                verticalAlign: 'middle',
                                                margin: '0 8px'
                                            }} />
                                            Wave {alert.waveNumber} from <strong>{alert.oldScore?.toFixed(1)}</strong> into <strong>{alert.newScore?.toFixed(1)}</strong>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleOverrideAlertClose(alert.id)}
                                    style={{
                                        background: 'var(--surface-hover)',
                                        border: 'none',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}

                        {!isSupEvent ? (
                            <div className="card" style={{ padding: '24px', background: 'var(--bg-light)', border: '1px solid var(--border-dim)', boxShadow: 'inset 0 2px 4px rgba(29, 26, 26, 0.37)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <p style={{ fontSize: '18px', fontWeight: '700' }}>
                                        {selectedHeat?.round} - heat #{selectedHeat?.heat_number} - {formatDivisionName(selectedHeat?.division, events.find(e => e.id === selectedHeat?.event_id))}{selectedHeat?.sup_category ? <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: '800', background: '#10b981', color: 'white', borderRadius: '6px', padding: '2px 8px' }}>{selectedHeat.sup_category}</span> : ''}
                                    </p>
                                    <button
                                        onClick={handleManualRefresh}
                                        className="btn-secondary"
                                        style={{
                                            padding: '8px',
                                            borderRadius: '50%',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title="Refresh Scores"
                                    >
                                        <RotateCcw size={16} />
                                    </button>
                                </div>

                                <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '20px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--surface-hover)' }}>
                                                <th style={{ textAlign: 'left', padding: '16px 24px', background: 'var(--bg-light)', color: '#000000', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid var(--border-dim)', borderRight: '1px solid var(--border-dim)', width: '100px', position: 'sticky', left: 0, zIndex: 3 }}>Priority</th>
                                                {waves.map(w => {
                                                    const isActive = (selectedHeat?.active_wave_number === w);
                                                    return (
                                                        <th key={w} style={{
                                                            textAlign: 'center',
                                                            padding: '16px 8px',
                                                            color: isActive ? 'var(--accent-blue)' : '#000000',
                                                            fontSize: '12px',
                                                            fontWeight: '900',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '1px',
                                                            borderBottom: '2px solid var(--border-dim)',
                                                            background: isActive ? 'rgba(0, 71, 255, 0.03)' : 'transparent',
                                                            transition: 'all 0.3s ease'
                                                        }}>
                                                            W{w}
                                                        </th>
                                                    );
                                                })}
                                                <th style={{ textAlign: 'center', padding: '16px 24px', background: 'var(--bg-light)', color: '#000000', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid var(--border-dim)', borderLeft: '1px solid var(--border-dim)', width: '140px', position: 'sticky', right: 0, zIndex: 3, boxShadow: '-4px 0 8px -4px rgba(0,0,0,0.05)' }}>Total Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getStablySortedSurfers(selectedHeat?.surfers || []).map((surfer) => {
                                                const bestWavesCount = selectedHeat?.best_waves_count || 2;
                                                // Rejected scores count as 0 in total but still display in the cell
                                                const surferScores = waves.map(w => {
                                                    const isRejected = scoreStatuses[`${surfer.id}-${w}`]?.status === 'rejected';
                                                    if (isRejected) return 0;
                                                    return parseFloat(scores[`${surfer.id}-${w}`]) || 0;
                                                });
                                                const sortedScores = [...surferScores].sort((a, b) => b - a);

                                                const topScores = sortedScores.slice(0, bestWavesCount);

                                                // Apply interference penalty: Halve the Nth counting wave (dynamic)
                                                if (surfer.interference_1_pct) {
                                                    const penaltyIndex = bestWavesCount - 1;
                                                    if (topScores.length > penaltyIndex) {
                                                        topScores[penaltyIndex] = topScores[penaltyIndex] * (1 - surfer.interference_1_pct / 100);
                                                    }
                                                }
                                                if (surfer.interference_2_pct && surfer.is_eliminated) {
                                                    topScores.fill(0);
                                                }

                                                const total = topScores.reduce((sum, s) => sum + s, 0).toFixed(1);
                                                const isHeatCompleted = selectedHeat?.status === 'completed';
                                                const topIndices = [];
                                                if (isHeatCompleted) {
                                                    const scoreWithIndex = surferScores.map((score, idx) => ({ score, wave: idx + 1 }));
                                                    const sortedWithIndex = [...scoreWithIndex].sort((a, b) => b.score - a.score);

                                                    for (let i = 0; i < bestWavesCount; i++) {
                                                        if (sortedWithIndex[i]?.score > 0) topIndices.push(sortedWithIndex[i].wave);
                                                    }
                                                }

                                                const isOutOfBoundary = surfer.is_out_of_boundary === 1;

                                                return (
                                                    <tr key={surfer.id} style={{
                                                        transition: 'all 0.3s ease',
                                                        pointerEvents: isOutOfBoundary ? 'none' : 'auto',
                                                        borderBottom: '1px solid var(--border-dim)'
                                                    }}>
                                                        <td style={{
                                                            padding: 0,
                                                            background: surfer.color || 'var(--accent-blue)',
                                                            borderRight: '1px solid var(--border-dim)',
                                                            borderBottom: 'none',
                                                            textAlign: 'center',
                                                            width: '100px',
                                                            position: 'sticky',
                                                            left: 0,
                                                            zIndex: 2,
                                                            height: '100%',
                                                            boxShadow: '4px 0 8px -4px rgba(0,0,0,0.1)'
                                                        }}>
                                                            <div style={{
                                                                color: (surfer.color?.toLowerCase() === '#ffffff' || surfer.color === 'white' || surfer.color?.toLowerCase() === '#ffff00' || surfer.color === 'yellow') ? 'black' : 'white',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                height: '100%',
                                                                minHeight: '80px',
                                                                padding: '12px 0'
                                                            }}>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'capitalize', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                                                    {(() => {
                                                                        const c = surfer.color?.toUpperCase() || '';
                                                                        if (c === '#FF0000' || c === 'RED') return 'Red';
                                                                        if (c === '#FFFFFF' || c === 'WHITE') return 'White';
                                                                        if (c === '#FFFF00' || c === 'YELLOW') return 'Yellow';
                                                                        if (c === '#0000FF' || c === 'BLUE') return 'Blue';
                                                                        if (c === '#008000' || c === 'GREEN') return 'Green';
                                                                        if (c === '#000000' || c === 'BLACK') return 'Black';
                                                                        return surfer.color || '-';
                                                                    })()}
                                                                </div>
                                                                <div style={{ fontSize: '24px', fontWeight: '900', lineHeight: 1 }}>
                                                                    {surfer.priority === 1 ? 'P' : (surfer.priority && surfer.priority > 0 ? surfer.priority : '-')}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {(() => {
                                                            const maxScoredWave = waves.reduce((max, waveNum) => {
                                                                return (scores[`${surfer.id}-${waveNum}`] != null || scoreStatuses[`${surfer.id}-${waveNum}`] != null) ? Math.max(max, waveNum) : max;
                                                            }, 0);
                                                            const nextEmptyWave = maxScoredWave + 1;
                                                            const maxUnlocked = Math.max(10, surfer.waves_unlocked || 0, maxScoredWave);

                                                            return waves.map(w => {
                                                                const sessionForWave = activeSessions.find(s => s.surfer_id === surfer.id && s.wave_number === w);
                                                                const pendingIntScore = sessionForWave?.scores.find(s => !!s.is_interference && s.judge_id === judge?.id);
                                                                const isPendingInterference = !!pendingIntScore;
                                                                const hasAnyPendingInterference = sessionForWave?.scores.some(s => !!s.is_interference);

                                                                const scoreValue = scores[`${surfer.id}-${w}`];
                                                                const currentScoreStatus = scoreStatuses[`${surfer.id}-${w}`];
                                                                const isTopWave = topIndices.includes(w);
                                                                const isInterferenceWave = (surfer.interference_1_wave === w) || (surfer.interference_2_wave === w);
                                                                const isLocked = isScoringLocked || surfer.is_eliminated || surfer.is_out_of_boundary === 1 || currentScoreStatus?.status === 'approved' || w > maxUnlocked;
                                                                const isActiveWave = w <= maxUnlocked;
                                                                const isNextUnlockableWave = selectedHeat?.max_waves === 0 && w === maxUnlocked + 1;
                                                                const isEmpty = scoreValue == null;
                                                                const isUnlocked = !isLocked;
                                                                const showAsInterference = (isInterferenceWave && (!currentScoreStatus || currentScoreStatus.is_interference)) || isPendingInterference || hasAnyPendingInterference || !!currentScoreStatus?.is_interference;
                                                                const intPct = pendingIntScore?.interference_pct || currentScoreStatus?.interference_pct;

                                                                if (isNextUnlockableWave) {
                                                                    return (
                                                                        <td key={w} style={{
                                                                            padding: '8px',
                                                                            textAlign: 'center',
                                                                            background: 'var(--surface-light)',
                                                                            borderRight: '1px solid var(--border-dim)',
                                                                            borderBottom: '1px solid var(--border-dim)',
                                                                            position: 'relative'
                                                                        }}>
                                                                            <button
                                                                                onClick={() => handleUnlockWave(surfer, w)}
                                                                                disabled={isScoringLocked || surfer.is_eliminated || surfer.is_out_of_boundary === 1}
                                                                                style={{
                                                                                    width: '36px',
                                                                                    height: '36px',
                                                                                    margin: '0 auto',
                                                                                    background: surfer.color || '#10b981',
                                                                                    border: surfer.color && (surfer.color.toLowerCase() === '#ffffff' || surfer.color.toLowerCase() === 'white') ? '1px solid #ccc' : 'none',
                                                                                    borderRadius: '50%',
                                                                                    color: surfer.color && (surfer.color.toLowerCase() === '#ffffff' || surfer.color.toLowerCase() === 'white') ? 'black' : 'white',
                                                                                    fontSize: '20px',
                                                                                    fontWeight: '900',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    cursor: (isScoringLocked || surfer.is_eliminated || surfer.is_out_of_boundary === 1) ? 'not-allowed' : 'pointer',
                                                                                    boxShadow: `0 4px 10px ${surfer.color ? surfer.color + '4D' : 'rgba(16, 185, 129, 0.3)'}`,
                                                                                    transition: 'all 0.2s ease',
                                                                                    opacity: (isScoringLocked || surfer.is_eliminated || surfer.is_out_of_boundary === 1) ? 0.5 : 1
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                    if (!(isScoringLocked || surfer.is_eliminated || surfer.is_out_of_boundary === 1)) {
                                                                                        e.currentTarget.style.transform = 'scale(1.1)';
                                                                                        e.currentTarget.style.filter = 'brightness(0.9)';
                                                                                    }
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    if (!(isScoringLocked || surfer.is_eliminated || surfer.is_out_of_boundary === 1)) {
                                                                                        e.currentTarget.style.transform = 'scale(1)';
                                                                                        e.currentTarget.style.filter = 'brightness(1)';
                                                                                    }
                                                                                }}
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </td>
                                                                    );
                                                                }

                                                                return (
                                                                    <td key={w} style={{
                                                                        padding: '8px',
                                                                        textAlign: 'center',
                                                                        background: 'var(--surface-light)',
                                                                        borderRight: '1px solid var(--border-dim)',
                                                                        borderBottom: '1px solid var(--border-dim)',
                                                                        position: 'relative'
                                                                    }}>
                                                                        <div
                                                                            onClick={() => {
                                                                                if (isLocked) return;
                                                                                const otherJudgeInt = sessionForWave?.scores.find(s => !!s.is_interference && s.judge_id !== judge?.id);
                                                                                if (otherJudgeInt && !isPendingInterference && !currentScoreStatus?.is_interference) {
                                                                                    setCustomAlert({ message: "Another judge has marked Interference for this wave." });
                                                                                    setScoringModal({ surfer, waveNumber: w, currentScore: scoreValue, interferenceSelected: null, showInterference: true });
                                                                                } else {
                                                                                    // For rescore cells: pre-fill modal with the old (original) score so judge sees their previous entry
                                                                                    const isCellRescore = currentScoreStatus?.status === 'rescore';
                                                                                    const prefilledScore = (isCellRescore && currentScoreStatus?.original_score != null)
                                                                                        ? currentScoreStatus.original_score
                                                                                        : scoreValue;
                                                                                    setRescoreSameScoreWarning(false);
                                                                                    setScoringModal({
                                                                                        surfer,
                                                                                        waveNumber: w,
                                                                                        currentScore: prefilledScore,
                                                                                        selectedBase: prefilledScore != null ? Math.floor(prefilledScore) : undefined,
                                                                                        typedDigits: prefilledScore != null ? prefilledScore.toString().split('').filter(c => c !== '.').map(Number) : [],
                                                                                        selection: prefilledScore,
                                                                                        interferenceSelected: intPct,
                                                                                        isRescore: isCellRescore // ← required for same-score guard
                                                                                    });
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                width: '56px',
                                                                                height: '56px',
                                                                                margin: '0 auto',
                                                                                background: isTopWave
                                                                                    ? 'rgba(34, 197, 94, 0.15)'
                                                                                    : (currentScoreStatus?.status === 'rescore' ? '#fef08a' : (showAsInterference ? 'rgba(239, 68, 68, 0.1)' : (w === nextEmptyWave && isEmpty ? (surfer.color ? surfer.color + '26' : 'var(--surface-hover)') : (isLocked ? 'var(--border-dim)' : (isEmpty ? '#ffffff' : 'var(--surface-hover)'))))),
                                                                                border: isTopWave
                                                                                    ? '3px solid #22c55e'
                                                                                    : (showAsInterference ? '3px solid #ef4444' : (w === nextEmptyWave && isEmpty ? `2px solid ${surfer.color || 'var(--accent-blue)'}` : (w > nextEmptyWave && isEmpty ? '1.5px solid rgba(15,23,42,0.15)' : (isActiveWave ? '3px solid var(--text-dark)' : (isUnlocked && isEmpty ? '2px solid rgba(15,23,42,0.2)' : '1px solid var(--border-dim)'))))),
                                                                                borderRadius: '12px',
                                                                                color: (isEmpty && !isPendingInterference) ? '#000000' : 'var(--text-dark)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: '18px',
                                                                                lineHeight: 1.1,
                                                                                fontWeight: '900',
                                                                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                                position: 'relative',
                                                                                opacity: (isLocked && isEmpty && !showAsInterference) ? 0.4 : (w > nextEmptyWave && isEmpty ? 0.35 : (w === nextEmptyWave && isEmpty ? 1.0 : (isEmpty ? 0.6 : 1))),
                                                                                transform: 'scale(1)',
                                                                                boxShadow: (w > nextEmptyWave && isEmpty) ? 'none' : (isActiveWave ? '0 4px 16px rgba(15, 23, 42, 0.4)' : (isUnlocked && isEmpty ? '0 2px 8px rgba(0,0,0,0.08)' : 'none')),
                                                                                filter: isOutOfBoundary ? 'blur(4px)' : 'none'
                                                                            }}
                                                                        >
                                                                            {/* Cell content: score number + optional INT% overlay badge on border */}
                                                                            {scoreValue != null
                                                                                ? scoreValue.toFixed(1)
                                                                                : showAsInterference
                                                                                    ? <div style={{ color: "#ef4444", textAlign: "center", fontSize: "11px" }}>
                                                                                        <div>INT</div>
                                                                                        <div>{(pendingIntScore?.interference_pct || currentScoreStatus?.interference_pct || (surfer.interference_1_wave === w ? surfer.interference_1_pct : surfer.interference_2_pct))}%</div>
                                                                                    </div>
                                                                                    : (sessionForWave ? <div className="scoring-dots" style={{ color: '#000000', fontSize: '24px', lineHeight: '0.5', paddingBottom: '8px' }}><span>.</span><span>.</span><span>.</span></div> : "-")}
                                                                            {/* INT border badge — shows % when INT is marked (even alongside a score) */}
                                                                            {showAsInterference && (() => {
                                                                                const intPctDisplay = pendingIntScore?.interference_pct || currentScoreStatus?.interference_pct || (surfer.interference_1_wave === w ? surfer.interference_1_pct : surfer.interference_2_pct);
                                                                                return (
                                                                                    <div title="Interference" style={{
                                                                                        position: 'absolute',
                                                                                        top: '-10px',
                                                                                        left: '50%',
                                                                                        transform: 'translateX(-50%)',
                                                                                        background: '#ef4444',
                                                                                        color: 'white',
                                                                                        fontSize: '8px',
                                                                                        fontWeight: '900',
                                                                                        minWidth: '28px',
                                                                                        height: '16px',
                                                                                        padding: '0 4px',
                                                                                        borderRadius: '8px',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center',
                                                                                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)',
                                                                                        border: '1.5px solid white',
                                                                                        zIndex: 10,
                                                                                        letterSpacing: '0.3px',
                                                                                        whiteSpace: 'nowrap'
                                                                                    }}>
                                                                                        {intPctDisplay ? `${intPctDisplay}%` : 'INT'}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                            {scoreStatuses[`${surfer.id}-${w}`]?.status === 'approved' && (
                                                                                <CheckCircle
                                                                                    size={16}
                                                                                    style={{
                                                                                        position: 'absolute',
                                                                                        bottom: '4px',
                                                                                        right: '4px',
                                                                                        color: '#10b981'
                                                                                    }}
                                                                                />
                                                                            )}
                                                                            {scoreStatuses[`${surfer.id}-${w}`]?.status === 'rejected' && (
                                                                                <X
                                                                                    size={16}
                                                                                    style={{
                                                                                        position: 'absolute',
                                                                                        bottom: '4px',
                                                                                        right: '4px',
                                                                                        color: '#ef4444'
                                                                                    }}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        {
                                                                            isOutOfBoundary && w === 5 && (
                                                                                <div style={{
                                                                                    position: 'absolute',
                                                                                    top: '50%',
                                                                                    left: '50%',
                                                                                    transform: 'translate(-50%, -50%)',
                                                                                    zIndex: 20,
                                                                                    whiteSpace: 'nowrap',
                                                                                    pointerEvents: 'none'
                                                                                }}>
                                                                                    <div style={{
                                                                                        background: '#ef4444',
                                                                                        color: 'white',
                                                                                        padding: '12px 32px',
                                                                                        borderRadius: '16px',
                                                                                        fontSize: '15px',
                                                                                        fontWeight: '900',
                                                                                        textTransform: 'uppercase',
                                                                                        letterSpacing: '1px',
                                                                                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                                                                                        border: '2px solid rgba(255,255,255,0.2)'
                                                                                    }}>
                                                                                        THIS SURFER IS CURRENTLY OUT OF BOUNDARY
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        }
                                                                        {
                                                                            surfer.is_eliminated === 1 && w === 4 && (
                                                                                <div style={{
                                                                                    position: 'absolute',
                                                                                    top: '50%',
                                                                                    left: '50%',
                                                                                    transform: 'translate(-50%, -50%)',
                                                                                    zIndex: 20,
                                                                                    whiteSpace: 'nowrap',
                                                                                    pointerEvents: 'none'
                                                                                }}>
                                                                                    <div style={{
                                                                                        background: '#ef4444',
                                                                                        color: 'white',
                                                                                        padding: '12px 32px',
                                                                                        borderRadius: '16px',
                                                                                        fontSize: '15px',
                                                                                        fontWeight: '900',
                                                                                        textTransform: 'uppercase',
                                                                                        letterSpacing: '1px',
                                                                                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                                                                                        border: '2px solid rgba(255,255,255,0.2)'
                                                                                    }}>
                                                                                        This surfer is eliminated
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        }
                                                                    </td>
                                                                );
                                                            });
                                                        })()}
                                                        <td style={{
                                                            padding: '12px 24px',
                                                            textAlign: 'center',
                                                            background: 'var(--bg-light)',
                                                            borderLeft: '1px solid var(--border-dim)',
                                                            borderBottom: '1px solid var(--border-dim)',
                                                            width: '140px',
                                                            position: 'sticky',
                                                            right: 0,
                                                            zIndex: 2,
                                                            boxShadow: '-4px 0 8px -4px rgba(0,0,0,0.05)'
                                                        }}>

                                                            <div style={{
                                                                background: surfer.is_eliminated ? '#333' : (surfer.color || 'var(--accent-blue)'),
                                                                color: surfer.is_eliminated ? '#888' : (surfer.color?.toLowerCase() === '#ffff00' || surfer.color?.toLowerCase() === '#ffffff' || surfer.color === 'yellow' || surfer.color === 'white' ? 'black' : 'white'),
                                                                padding: '8px 0',
                                                                borderRadius: '12px',
                                                                fontSize: '22px',
                                                                fontWeight: '900',
                                                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                                                border: '2px solid rgba(255,255,255,0.2)'
                                                            }}>
                                                                {surfer.is_eliminated ? (0).toFixed(1) : total}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <p style={{ fontSize: '13px', color: '#000000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'transparent' }}>💡</span>
                                        Click on any wave cell to enter or update your score
                                    </p>
                                    <p style={{ fontSize: '13px', color: '#000000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'transparent' }}>💡</span>
                                        Best {selectedHeat?.best_waves_count || 2} wave(s) are highlighted for this heat in green once the heat is completed
                                    </p>
                                    <p style={{ fontSize: '13px', color: '#000000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'transparent' }}>💡</span>
                                        Dark highlighted wave cells are indicating the surfer have catched the wave and got rotated by the Tabulator.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* Gorgeous New SUP Stopwatch & Timekeeper Panel */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.5s ease', width: '100%' }}>
                                {supSubmitted && (
                                    <div className="animate-fade-in" style={{
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1.5px solid #10b981',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        color: '#047857',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)'
                                    }}>
                                        <CheckCircle size={18} />
                                        <span>SUP Heat results successfully recorded and submitted!</span>
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex',
                                    gap: '16px',
                                    flexWrap: 'wrap',
                                    width: '100%'
                                }}>
                                    {/* Left Column: Stopwatch */}
                                    <div className="card" style={{
                                        flex: '1 1 340px',
                                        padding: '20px',
                                        background: 'var(--bg-light)',
                                        border: '1px solid var(--border-dim)',
                                        borderRadius: '16px',
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative'
                                    }}>
                                        <h3 style={{
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            color: 'var(--text-dark)',
                                            marginBottom: '12px',
                                            letterSpacing: '-0.3px'
                                        }}>🕒 Stopwatch</h3>

                                        {/* Digital Timer with internal labels */}
                                        <div style={{
                                            fontFamily: '"Courier New", Courier, monospace',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#2563eb', /* Gorgeous Premium Blue */
                                            background: 'rgba(37, 99, 235, 0.05)',
                                            padding: '12px 24px',
                                            borderRadius: '16px',
                                            border: '2px solid rgba(37, 99, 235, 0.1)',
                                            boxShadow: 'inset 0 2px 8px rgba(37, 99, 235, 0.05)',
                                            width: '100%',
                                            maxWidth: '320px',
                                            marginBottom: '12px',
                                        }}>
                                            <span style={{
                                                fontSize: '44px',
                                                fontWeight: '900',
                                                letterSpacing: '1px',
                                                lineHeight: 1
                                            }}>
                                                {formatStopwatchTime(supStopwatchTime)}
                                            </span>
                                            <span style={{
                                                fontSize: '9px',
                                                color: 'rgba(37, 99, 235, 0.7)',
                                                fontWeight: '700',
                                                letterSpacing: '0.8px',
                                                textTransform: 'uppercase',
                                                marginTop: '6px'
                                            }}>
                                                Minutes : Seconds . Milliseconds
                                            </span>
                                        </div>

                                        {/* Stopwatch Action Buttons */}
                                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {/* Start / Pause Button */}
                                            <button
                                                onClick={() => {
                                                    const newRunning = !supStopwatchRunning;
                                                    let finalAccumulated = supAccumulatedTimeRef.current;
                                                    let newStartTime = null;
                                                    if (newRunning) {
                                                        supStartTimeRef.current = Date.now();
                                                        newStartTime = supStartTimeRef.current;
                                                    } else {
                                                        supAccumulatedTimeRef.current = supStopwatchTime;
                                                        finalAccumulated = supStopwatchTime;
                                                    }
                                                    setSupStopwatchRunning(newRunning);
                                                    if (selectedHeat?.id) {
                                                        localStorage.setItem(`sup_timer_${selectedHeat.id}`, JSON.stringify({
                                                            running: newRunning,
                                                            accumulated: finalAccumulated,
                                                            startTime: newStartTime
                                                        }));
                                                        updateDbSupTimer(newRunning, finalAccumulated, newStartTime);
                                                    }
                                                }}
                                                disabled={selectedHeat?.status !== 'in-progress' || isFullySubmitted}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    background: (selectedHeat?.status !== 'in-progress' || isFullySubmitted) ? '#e2e8f0' : (supStopwatchRunning ? '#ef4444' : '#10b981'),
                                                    color: (selectedHeat?.status !== 'in-progress' || isFullySubmitted) ? '#94a3b8' : 'white',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontSize: '15px',
                                                    fontWeight: '700',
                                                    cursor: (selectedHeat?.status !== 'in-progress' || isFullySubmitted) ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: (selectedHeat?.status !== 'in-progress' || isFullySubmitted) ? 'none' : (supStopwatchRunning ? '0 4px 10px rgba(239, 68, 68, 0.1)' : '0 4px 10px rgba(16, 185, 129, 0.1)'),
                                                    transform: 'scale(1)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (selectedHeat?.status === 'in-progress' && !isFullySubmitted) {
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                        e.currentTarget.style.filter = 'brightness(1.05)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (selectedHeat?.status === 'in-progress' && !isFullySubmitted) {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.filter = 'none';
                                                    }
                                                }}
                                            >
                                                {supStopwatchRunning ? (
                                                    <>
                                                        <Pause size={16} strokeWidth={2.5} />
                                                        <span>Pause</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play size={16} strokeWidth={2.5} />
                                                        <span>Start</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Reset & Record Finish Side-by-Side */}
                                            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                                <button
                                                    onClick={handleSupReset}
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px 16px',
                                                        background: '#475569',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        fontSize: '14px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    <RotateCcw size={16} />
                                                    <span>Reset</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        const surferCount = selectedHeat?.surfers?.length || 0;
                                                        // Fix #2: Don't allow more finishes than surfers
                                                        if (surferCount > 0 && supRecordedFinishes.length >= surferCount) return;
                                                        const nextPos = supRecordedFinishes.length + 1;
                                                        const newFinish = {
                                                            id: Date.now(),
                                                            position: nextPos,
                                                            time: supStopwatchTime,
                                                            competitorId: '',
                                                            penalty: 0
                                                        };
                                                        setSupRecordedFinishes(prev => {
                                                            const updated = [...prev, newFinish];
                                                            // Fix #4: Auto-stop timer when last surfer finishes
                                                            if (surferCount > 0 && updated.length >= surferCount) {
                                                                setSupStopwatchRunning(false);
                                                                if (selectedHeat?.id) {
                                                                    const finalTime = supAccumulatedTimeRef.current + (Date.now() - supStartTimeRef.current);
                                                                    localStorage.setItem(`sup_timer_${selectedHeat.id}`, JSON.stringify({
                                                                        running: false,
                                                                        accumulated: finalTime,
                                                                        startTime: null
                                                                    }));
                                                                    updateDbSupTimer(false, finalTime, null);
                                                                }
                                                            }
                                                            return updated;
                                                        });
                                                    }}
                                                    disabled={(!supStopwatchRunning && supStopwatchTime === 0) || (selectedHeat?.surfers?.length > 0 && supRecordedFinishes.length >= selectedHeat.surfers.length) || isFullySubmitted}
                                                    style={{
                                                        flex: 1.5,
                                                        padding: '12px 16px',
                                                        background: ((!supStopwatchRunning && supStopwatchTime === 0) || (selectedHeat?.surfers?.length > 0 && supRecordedFinishes.length >= selectedHeat.surfers.length) || isFullySubmitted) ? '#e2e8f0' : '#2563eb',
                                                        color: ((!supStopwatchRunning && supStopwatchTime === 0) || (selectedHeat?.surfers?.length > 0 && supRecordedFinishes.length >= selectedHeat.surfers.length) || isFullySubmitted) ? '#94a3b8' : 'white',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        fontSize: '14px',
                                                        fontWeight: '700',
                                                        cursor: ((!supStopwatchRunning && supStopwatchTime === 0) || (selectedHeat?.surfers?.length > 0 && supRecordedFinishes.length >= selectedHeat.surfers.length) || isFullySubmitted) ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: ((!supStopwatchRunning && supStopwatchTime === 0) || (selectedHeat?.surfers?.length > 0 && supRecordedFinishes.length >= selectedHeat.surfers.length) || isFullySubmitted) ? 'none' : '0 4px 10px rgba(37, 99, 235, 0.1)'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isFullySubmitted && (supStopwatchRunning || supStopwatchTime > 0)) {
                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isFullySubmitted && (supStopwatchRunning || supStopwatchTime > 0)) {
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }
                                                    }}
                                                >
                                                    <Flag size={16} />
                                                    <span>Record Finish</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Next Finish Position Display */}
                                        <div style={{
                                            marginTop: '16px',
                                            width: '100%',
                                            background: 'rgba(37, 99, 235, 0.05)',
                                            border: '1px solid rgba(37, 99, 235, 0.1)',
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            textAlign: 'center',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            color: '#1e3a8a'
                                        }}>
                                            {selectedHeat?.surfers?.length > 0 && supRecordedFinishes.length >= selectedHeat.surfers.length
                                                ? <span style={{ color: '#10b981', fontWeight: '900' }}>✓ All {selectedHeat.surfers.length} surfers recorded!</span>
                                                : <>Next finish: <span style={{ color: '#2563eb', fontWeight: '900' }}>{getOrdinalSuffix(supRecordedFinishes.length + 1)} Place</span></>}
                                        </div>

                                        {/* Alert if admin hasn't started heat */}
                                        {selectedHeat?.status !== 'in-progress' && (
                                            <div style={{
                                                marginTop: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: '#ef4444',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                background: 'rgba(239, 68, 68, 0.05)',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(239, 68, 68, 0.1)'
                                            }}>
                                                <AlertCircle size={14} />
                                                <span>Awaiting Admin to start heat.</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Recorded Finishes */}
                                    <div className="card" style={{
                                        flex: '1.2 1 400px',
                                        padding: '20px',
                                        background: 'var(--bg-light)',
                                        border: '1px solid var(--border-dim)',
                                        borderRadius: '16px',
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minHeight: '340px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{
                                                fontSize: '16px',
                                                fontWeight: '700',
                                                color: 'var(--text-dark)',
                                                letterSpacing: '-0.3px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span>🏆</span> Recorded Finishes
                                            </h3>
                                        </div>

                                        {/* Finishes List Container */}
                                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px', paddingRight: '4px', marginBottom: '16px' }}>
                                            {supRecordedFinishes.length === 0 ? (
                                                <div style={{
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '12px',
                                                    color: 'var(--text-gray)',
                                                    opacity: 0.6,
                                                    textAlign: 'center',
                                                    padding: '30px 10px'
                                                }}>
                                                    <Flag size={36} strokeWidth={1.5} />
                                                    <div>
                                                        <p style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 2px' }}>No finishes recorded yet</p>
                                                        <p style={{ fontSize: '12px', margin: 0 }}>Click "Record Finish" to capture times</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {supRecordedFinishes.map((finish) => {
                                                        const isFirst = finish.position === 1;
                                                        const isSecond = finish.position === 2;
                                                        const isThird = finish.position === 3;

                                                        let itemBg = 'rgba(239, 246, 255, 0.5)'; // Blue/light blue default
                                                        let itemBorder = '2px solid #93c5fd';
                                                        let itemColor = '#2563eb';

                                                        if (isFirst) {
                                                            itemBg = 'rgba(254, 243, 199, 0.5)';
                                                            itemBorder = '2px solid #fbbf24';
                                                            itemColor = '#d97706';
                                                        } else if (isSecond) {
                                                            itemBg = 'rgba(241, 245, 249, 0.5)';
                                                            itemBorder = '2px solid #cbd5e1';
                                                            itemColor = '#475569';
                                                        } else if (isThird) {
                                                            itemBg = 'rgba(255, 237, 213, 0.5)';
                                                            itemBorder = '2px solid #fdba74';
                                                            itemColor = '#c2410c';
                                                        }

                                                        const finalTimeMs = finish.time + (finish.penalty * 10000);

                                                        return (
                                                            <div
                                                                key={finish.id}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '12px',
                                                                    padding: '10px 14px',
                                                                    background: itemBg,
                                                                    borderRadius: '12px',
                                                                    border: itemBorder,
                                                                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                                                                    animation: 'slideUp 0.3s ease',
                                                                    position: 'relative'
                                                                }}
                                                            >
                                                                {/* Ordinal & Time (Compact Left) */}
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    minWidth: '100px'
                                                                }}>
                                                                    <span style={{ fontSize: '13px', fontWeight: '900', color: itemColor, textTransform: 'uppercase' }}>
                                                                        {getOrdinalSuffix(finish.position)}
                                                                    </span>
                                                                    <span style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--text-dark)' }}>
                                                                        {formatStopwatchTime(finalTimeMs)}
                                                                    </span>
                                                                    {!isFullySubmitted && (
                                                                        <button
                                                                            onClick={() => handleOpenEditFinish(finish)}
                                                                            title="Edit time"
                                                                            style={{
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                color: 'var(--text-muted)',
                                                                                cursor: 'pointer',
                                                                                padding: '4px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                borderRadius: '4px',
                                                                                transition: 'all 0.2s ease',
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.color = '#2563eb';
                                                                                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.color = 'var(--text-muted)';
                                                                                e.currentTarget.style.background = 'none';
                                                                            }}
                                                                        >
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Dropdown (Center) */}
                                                                <div style={{ flex: '1 1 auto', maxWidth: '200px' }}>
                                                                    <select
                                                                        disabled={isFullySubmitted}
                                                                        value={finish.competitorId}
                                                                        onChange={(e) => handleAssignCompetitor(finish.id, e.target.value)}
                                                                        className="form-control"
                                                                        style={{
                                                                            width: '100%',
                                                                            fontSize: '13px',
                                                                            fontWeight: '600',
                                                                            padding: '6px 10px',
                                                                            borderRadius: '8px',
                                                                            height: '32px',
                                                                            border: '1px solid var(--border-dim)',
                                                                            background: isFullySubmitted ? 'var(--surface-light)' : 'white',
                                                                            color: isFullySubmitted ? 'var(--text-muted)' : 'var(--text-dark)',
                                                                            cursor: isFullySubmitted ? 'not-allowed' : 'pointer'
                                                                        }}
                                                                    >
                                                                        <option value="">Select Competitor...</option>
                                                                        {selectedHeat?.surfers
                                                                            ?.filter(surfer => !supRecordedFinishes.some(f => f.competitorId == surfer.id && f.id !== finish.id))
                                                                            ?.map((surfer) => {
                                                                                const surferIndex = selectedHeat.surfers.findIndex(s => s.id === surfer.id) + 1;
                                                                                return (
                                                                                    <option key={surfer.id} value={surfer.id}>
                                                                                        [#{surfer.color || surferIndex}] {(() => {
                                                                                            const colorName = getFriendlyColorName(surfer.color);
                                                                                            return colorName ? `${colorName} Surfer` : `Surfer ${surferIndex}`;
                                                                                        })()}
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                    </select>
                                                                </div>

                                                                {/* Action Row (Right Side) */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    {/* Penalty Pill */}
                                                                    <button
                                                                        disabled={true}
                                                                        style={{
                                                                            padding: '5px 10px',
                                                                            background: 'var(--surface-light)',
                                                                            color: 'var(--text-muted)',
                                                                            border: '1px solid var(--border-dim)',
                                                                            borderRadius: '8px',
                                                                            fontSize: '11px',
                                                                            fontWeight: '700',
                                                                            cursor: 'not-allowed',
                                                                            opacity: 0.6,
                                                                            transition: 'all 0.2s ease',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                    >
                                                                        + Penalty
                                                                    </button>

                                                                    {/* Delete Icon */}
                                                                    {!isFullySubmitted && (
                                                                        <button
                                                                            onClick={() => handleDeleteFinish(finish.id)}
                                                                            style={{
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                color: 'var(--text-gray)',
                                                                                cursor: 'pointer',
                                                                                padding: '4px',
                                                                                borderRadius: '50%',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                transition: 'all 0.2s ease'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                                                e.currentTarget.style.color = '#ef4444';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.background = 'none';
                                                                                e.currentTarget.style.color = 'var(--text-gray)';
                                                                            }}
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Submit Finishes Button */}
                                        {supRecordedFinishes.length > 0 && (
                                            <button
                                                disabled={isFullySubmitted}
                                                onClick={async () => {
                                                    if (isFullySubmitted) return;
                                                    const unassigned = supRecordedFinishes.filter(f => !f.competitorId);
                                                    if (unassigned.length > 0) {
                                                        setCustomAlert({ message: "Please assign competitors for all recorded positions before submitting." });
                                                        return;
                                                    }
                                                    setCustomConfirm({
                                                        message: "Are you sure you want to submit heat results? Please check the competitors are correctly assigned before submitting.",
                                                        onConfirm: async () => {
                                                            setCustomConfirm(null);
                                                            try {
                                                                for (const finish of supRecordedFinishes) {
                                                                    const finalTimeMs = finish.time + (finish.penalty * 10000);
                                                                    await axios.post(`${API_BASE}/scores`, {
                                                                        heat_id: selectedHeat.id,
                                                                        surfer_id: finish.competitorId,
                                                                        judge_id: judge.id,
                                                                        wave_number: 1,
                                                                        score: finalTimeMs,
                                                                        is_interference: 0,
                                                                        interference_pct: 0
                                                                    });
                                                                }
                                                                setSupSubmitted(true);
                                                                supLoadedForHeatRef.current = null;
                                                                await fetchScores(selectedHeat.id, judge.id, selectedHeat.event_type);
                                                                setTimeout(() => setSupSubmitted(false), 8000);
                                                            } catch (err) {
                                                                console.error("Error submitting SUP results:", err);
                                                                setCustomAlert({ message: "Failed to submit SUP results: " + (err.response?.data?.error || err.message) });
                                                            }
                                                        }
                                                    });
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    background: isFullySubmitted ? '#6b7280' : '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontSize: '15px',
                                                    fontWeight: '700',
                                                    cursor: isFullySubmitted ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    boxShadow: isFullySubmitted ? 'none' : '0 4px 10px rgba(16, 185, 129, 0.1)',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    opacity: isFullySubmitted ? 0.75 : 1
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (isFullySubmitted) return;
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                    e.currentTarget.style.filter = 'brightness(1.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (isFullySubmitted) return;
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.filter = 'none';
                                                }}
                                            >
                                                <Check size={16} strokeWidth={3} />
                                                <span>{isFullySubmitted ? 'Heat results submitted' : 'Submit Heat Results'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Collapsible Workflow Guide */}
                                <div style={{ marginTop: '4px' }}>
                                    <button
                                        onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#2563eb',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <span>💡</span>
                                        <span>{showWorkflowGuide ? 'Hide Instructions & Workflow' : 'Show Timekeeper Workflow Guide '}</span>
                                    </button>

                                    {showWorkflowGuide && (
                                        <div className="animate-fade-in" style={{
                                            marginTop: '8px',
                                            padding: '16px',
                                            background: 'rgba(37, 99, 235, 0.02)',
                                            border: '1px solid rgba(37, 99, 235, 0.08)',
                                            borderRadius: '12px',
                                            boxShadow: 'inset 0 1px 3px rgba(37, 99, 235, 0.02)',
                                            animation: 'slideDown 0.3s ease'
                                        }}>
                                            <h4 style={{
                                                fontSize: '13px',
                                                fontWeight: '800',
                                                color: '#1e3a8a',
                                                marginBottom: '8px',
                                            }}>
                                                Timekeeper workflow steps:
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                                                {[
                                                    'Press "Start" when the race begins',
                                                    'Click "Record Finish" each time a competitor crosses the finish line (order determines ranking)',
                                                    'The first "Record Finish" click = 1st place, second click = 2nd place, etc.',
                                                    'After recording all finish times, assign competitors to each position using the dropdowns',
                                                    // 'Add penalties for rule violations - each penalty adds 10 seconds to the final time',
                                                    'Use "Reset" to clear all data and start a new race'
                                                ].map((step, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                        <div style={{
                                                            background: 'rgba(37, 99, 235, 0.1)',
                                                            color: '#2563eb',
                                                            width: '18px',
                                                            height: '18px',
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '10px',
                                                            fontWeight: '800',
                                                            flexShrink: 0
                                                        }}>
                                                            {idx + 1}
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-gray)', fontWeight: '500', lineHeight: '1.3' }}>
                                                            {step}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main >


            {/* Start Timer Overlay */}
            {
                (startTimer || (remainingTime && remainingTime.startsWith('-') && !remainingTime.includes('--'))) && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        backdropFilter: 'blur(8px)'
                    }}>
                        <Clock size={80} className="text-accent mb-6" style={{ color: 'var(--accent-blue)', marginBottom: '24px' }} title={remainingTime?.startsWith('-') && !remainingTime.includes('--') ? "Preparation Countdown" : "Pre-Start Timer"} />
                        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                            {remainingTime?.startsWith('-') && !remainingTime.includes('--') ? 'Preparation Countdown' : 'Heat Starting Soon'}
                        </h2>

                        <div style={{
                            fontSize: '6rem',
                            fontWeight: '900',
                            fontFamily: 'monospace',
                            color: 'white',
                            textShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
                            marginBottom: '24px'
                        }}>
                            {remainingTime?.startsWith('-') && !remainingTime.includes('--') ? remainingTime : (startTimer ? `${Math.floor(startTimer.remainingSeconds / 60)}:${(startTimer.remainingSeconds % 60).toString().padStart(2, '0')}` : '00:00')}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                                {startTimer?.heat ? startTimer.heat.round : selectedHeat?.round}
                            </p>
                            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                                Heat #{startTimer?.heat ? startTimer.heat.heat_number : selectedHeat?.heat_number}
                            </p>
                            <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                                {formatDivisionName(startTimer?.heat ? startTimer.heat.division : selectedHeat?.division, events.find(e => e.id === (startTimer?.heat ? startTimer.heat.event_id : selectedHeat?.event_id)))}
                            </p>
                        </div>

                        <p className="text-secondary mt-8" style={{ marginTop: '40px', fontSize: '14px', opacity: 0.6 }}>
                            {remainingTime?.startsWith('-') && !remainingTime.includes('--') ? 'Prepare for immediate start' : 'Please prepare for the upcoming heat'}
                        </p>
                    </div>
                )
            }
            {/* Scoring Modal */}
            {
                scoringModal && (
                    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setScoringModal(null)}
                        tabIndex={0}
                        ref={(el) => { if (el && !el.contains(document.activeElement)) el.focus(); }}
                        onKeyDown={(e) => {
                            // Handle keyboard scoring
                            if (scoringModal.showIntPanel) return;
                            const precision = selectedHeat?.score_decimals ?? 1;
                            const minScore = selectedHeat?.min_score ?? 0;
                            const maxScore = selectedHeat?.max_score ?? 10;

                            if (e.key >= '0' && e.key <= '9') {
                                e.preventDefault();
                                const digit = parseInt(e.key);
                                const currentDigits = scoringModal.typedDigits || [];

                                let newDigits;
                                if (currentDigits.length === 0) {
                                    newDigits = [digit];
                                } else if (currentDigits.length < precision + 1) {
                                    newDigits = [...currentDigits, digit];
                                } else {
                                    newDigits = [digit];
                                }

                                let newVal = newDigits[0];
                                if (newDigits.length > 1) {
                                    for (let i = 1; i < newDigits.length; i++) {
                                        newVal += newDigits[i] / Math.pow(10, i);
                                    }
                                }

                                if (newVal > maxScore) newVal = maxScore;
                                if (newVal < minScore) newVal = minScore;
                                // Keep precision
                                newVal = parseFloat(newVal.toFixed(precision));

                                setScoringModal(prev => ({
                                    ...prev,
                                    typedDigits: newDigits,
                                    selection: newVal,
                                    selectedBase: newDigits[0]
                                }));
                                setRescoreSameScoreWarning(false);
                            } else if (e.key === 'Backspace') {
                                e.preventDefault();
                                const currentDigits = scoringModal.typedDigits || [];
                                if (currentDigits.length > 0) {
                                    const newDigits = currentDigits.slice(0, -1);
                                    if (newDigits.length === 0) {
                                        setScoringModal(prev => ({ ...prev, typedDigits: [], selection: undefined, selectedBase: undefined }));
                                    } else {
                                        // Recalculate value from remaining digits
                                        let val;
                                        const precision = selectedHeat?.score_decimals ?? 1;
                                        if (precision === 0) {
                                            val = newDigits.length === 2 ? newDigits[0] * 10 + newDigits[1] : newDigits[0];
                                        } else {
                                            val = newDigits[0];
                                            for (let i = 1; i < newDigits.length; i++) {
                                                val += newDigits[i] / Math.pow(10, i);
                                            }
                                        }
                                        if (val > maxScore) val = maxScore;
                                        if (val < minScore) val = minScore;
                                        val = parseFloat(val.toFixed(precision));
                                        setScoringModal(prev => ({ ...prev, typedDigits: newDigits, selection: val, selectedBase: newDigits[0] }));
                                    }
                                }
                            } else if (e.key === 'Enter') {
                                e.preventDefault();
                                // Trigger confirm if we have a selection
                                const finalScore = scoringModal.selection !== undefined
                                    ? scoringModal.selection
                                    : (scoringModal.currentScore != null ? parseFloat(scoringModal.currentScore) : null);
                                if (finalScore !== null) {
                                    // Block rescore if judge submits the same score as original
                                    const isRescoreUnchanged = scoringModal.isRescore &&
                                        scoringModal.currentScore != null &&
                                        parseFloat(finalScore).toFixed(1) ===
                                        parseFloat(scoringModal.currentScore).toFixed(1);
                                    if (isRescoreUnchanged) {
                                        setRescoreSameScoreWarning(true);
                                        return;
                                    }
                                    setRescoreSameScoreWarning(false);
                                    handleScoreSubmit(scoringModal.surfer.id, scoringModal.waveNumber, finalScore).then(success => {
                                        if (success) setScoringModal(null);
                                    });
                                }
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setScoringModal(null);
                            }
                        }}
                        style={{ outline: 'none' }}
                    >
                        <div className="modal-content scoring-modal-inner" style={{ maxWidth: '650px', width: '95%', padding: '16px', maxHeight: '90vh', overflowY: 'auto', gap: '8px' }}>
                            <div className="modal-header" style={{ marginBottom: '0', padding: '4px 0' }}>
                                <div>
                                    <h3 style={{ fontSize: '24px', fontWeight: '800' }}>
                                        Score Wave {scoringModal.waveNumber}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: scoringModal.surfer.color || 'var(--accent-blue)',
                                            boxShadow: `0 0 12px ${scoringModal.surfer.color || 'var(--accent-blue)'}66`
                                        }} />
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: '700', fontSize: '14px' }}>
                                            Surfer
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setScoringModal(null)} className="modal-close" style={{ width: '32px', height: '32px' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-0" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {scoringModal.showInterference ? (
                                    /* --- INTERFERENCE SELECTION VIEW --- */
                                    <div className="animate-fade-in" style={{
                                        padding: '8px 0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '20px'
                                    }}>
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '10px 0',
                                            borderBottom: '1px solid var(--border-dim)',
                                            marginBottom: '10px'
                                        }}>
                                            <h3 style={{
                                                color: '#ef4444',
                                                fontWeight: '900',
                                                fontSize: '18px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '2px',
                                                margin: 0
                                            }}>
                                                Mark Interference
                                            </h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                                                Select the type of interference to apply
                                            </p>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
                                            {[
                                                { label: 'Non Priority', pct: 50, color: '#ef4444' },
                                                { label: 'Priority', pct: 100, color: '#b91c1c' }
                                            ].map(({ label, pct, color }) => (
                                                <button
                                                    key={pct}
                                                    onClick={() => {
                                                        setScoringModal(prev => ({
                                                            ...prev,
                                                            interferenceSelected: pct,
                                                            showInterference: false
                                                        }));
                                                    }}
                                                    style={{
                                                        height: '100px',
                                                        background: scoringModal.interferenceSelected === pct ? color : 'white',
                                                        border: `3px solid ${color}`,
                                                        borderRadius: '20px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px',
                                                        cursor: 'pointer',
                                                        color: scoringModal.interferenceSelected === pct ? 'white' : color,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8 }}>{label}</span>
                                                    <span style={{ fontSize: '32px', fontWeight: '900' }}>{pct}%</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                            <button
                                                onClick={() => setScoringModal(prev => ({ ...prev, showInterference: false }))}
                                                style={{
                                                    flex: 1,
                                                    height: '48px',
                                                    background: 'var(--surface-hover)',
                                                    border: '1px solid var(--border-dim)',
                                                    borderRadius: '12px',
                                                    color: 'var(--text-dark)',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>

                                            {scoringModal.interferenceSelected !== undefined && scoringModal.interferenceSelected !== null && (
                                                <button
                                                    onClick={() => {
                                                        // Signal that we want to clear/remove the penalty
                                                        setScoringModal(prev => ({ ...prev, interferenceSelected: 0, showInterference: false }));
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        height: '48px',
                                                        background: '#ef4444',
                                                        borderRadius: '12px',
                                                        color: 'white',
                                                        fontWeight: '800',
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Clear Penalty
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* --- SCORING VIEW --- */
                                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {/* Current Selection Display */}
                                        <div style={{
                                            background: 'var(--surface-hover)',
                                            borderRadius: '20px',
                                            padding: '20px',
                                            border: scoringModal.interferenceSelected ? '2px solid #ef4444' : '1px solid var(--border-dim)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '4px',
                                            transition: 'border-color 0.2s ease'
                                        }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                color: 'var(--text-muted)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1.5px'
                                            }}>
                                                Selected Score {scoringModal.interferenceSelected ? `(Int: ${scoringModal.interferenceSelected}%)` : ''}
                                            </span>

                                            {/* Rescore warning: shown when judge tries to submit old score unchanged */}
                                            {rescoreSameScoreWarning && (
                                                <div className="animate-fade-in" style={{
                                                    background: 'rgba(234, 179, 8, 0.1)',
                                                    border: '1.5px solid #eab308',
                                                    borderRadius: '10px',
                                                    padding: '8px 14px',
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                    color: '#92400e',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginTop: '4px'
                                                }}>
                                                    ⚠️ Please change the old score to a new one before confirming.
                                                </div>
                                            )}

                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="NA"
                                                value={scoringModal.selection != null ?
                                                    parseFloat(scoringModal.selection).toFixed(1)
                                                    : (scoringModal.currentScore != null ? parseFloat(scoringModal.currentScore).toFixed(1) : '')}
                                                onClick={(e) => e.target.select()}
                                                onChange={(e) => {
                                                    const precision = selectedHeat?.score_decimals ?? 1;
                                                    const minScore = selectedHeat?.min_score ?? 0;
                                                    const maxScore = selectedHeat?.max_score ?? 10;
                                                    let val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                                    if (val !== undefined) {
                                                        if (val > maxScore) val = maxScore;
                                                        if (val < minScore) val = minScore;
                                                        val = parseFloat(val.toFixed(precision));
                                                    }
                                                    setScoringModal(prev => ({ ...prev, selection: val, typedDigits: [], selectedBase: (val !== undefined ? Math.floor(val) : undefined) }));
                                                }}
                                                onKeyDown={(e) => {
                                                    // Let these keys bubble up to the modal handler
                                                    if ((e.key >= '0' && e.key <= '9') || e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Escape') {
                                                        return;
                                                    }
                                                    e.stopPropagation();
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.background = '#eff6ff';
                                                    e.target.style.borderColor = 'var(--accent-blue)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.background = '#ffffff';
                                                    e.target.style.borderColor = 'rgba(15, 23, 42, 0.1)';
                                                }}
                                                style={{
                                                    fontSize: '48px',
                                                    fontWeight: '900',
                                                    color: 'var(--text-primary)',
                                                    fontFamily: '"Outfit", sans-serif',
                                                    background: 'var(--surface-light)',
                                                    border: '2px solid rgba(15, 23, 42, 0.1)',
                                                    borderRadius: '16px',
                                                    width: '200px',
                                                    padding: '12px 0',
                                                    textAlign: 'center',
                                                    outline: 'none',
                                                    boxShadow: '0 4px 12px var(--surface-hover)',
                                                    transition: 'all 0.2s ease',
                                                    appearance: 'none',
                                                    WebkitAppearance: 'none',
                                                    MozAppearance: 'textfield',
                                                    cursor: 'text'
                                                }}
                                            />
                                        </div>
                                        <p style={{
                                            fontSize: '13px',
                                            color: '#000000',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: 'rgba(217, 247, 217, 0.78)',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(71, 250, 0, 1)',
                                            marginBottom: '4px',
                                            fontWeight: '600'
                                        }}>
                                            <span style={{ fontSize: '16px' }}>💡</span>
                                            Choose a score below or manually input a score above. Score range for this heat is: {selectedHeat?.min_score ?? 0} to {selectedHeat?.max_score ?? 10}.
                                        </p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {/* Step 1: Integer Buttons Row */}
                                            <div>
                                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                                                    {(selectedHeat?.score_decimals ?? 1) === 0 ? 'Select Score' : 'Step 1 — Select a number'}
                                                </p>
                                                <div className="scoring-modal-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(11, (selectedHeat?.max_score ?? 10) - (selectedHeat?.min_score ?? 0) + 1)}, 1fr)`, gap: '4px' }}>
                                                    {Array.from(
                                                        { length: (selectedHeat?.max_score ?? 10) - (selectedHeat?.min_score ?? 0) + 1 },
                                                        (_, i) => (selectedHeat?.min_score ?? 0) + i
                                                    ).map(val => {
                                                        const decimals = selectedHeat?.score_decimals ?? 1;
                                                        const isMax = val === (selectedHeat?.max_score ?? 10);
                                                        const isBaseSelected = scoringModal.selectedBase === val;
                                                        const isFinalScore = scoringModal.selection === val;
                                                        const isHighlighted = isBaseSelected || (decimals === 0 && isFinalScore);

                                                        return (
                                                            <button
                                                                key={val}
                                                                onClick={() => {
                                                                    const precision = selectedHeat?.score_decimals ?? 1;
                                                                    const maxScore = selectedHeat?.max_score ?? 10;
                                                                    const minScore = selectedHeat?.min_score ?? 0;
                                                                    const currentDigits = scoringModal.typedDigits || [];

                                                                    // Handle '10' button separately if precision > 0
                                                                    if (val === 10 && precision > 0) {
                                                                        setScoringModal(prev => ({ ...prev, selection: 10, selectedBase: 10, typedDigits: [1, 0] }));
                                                                        return;
                                                                    }

                                                                    let newDigits;
                                                                    if (precision === 0) {
                                                                        // Build integer normally
                                                                        if (currentDigits.length === 0) newDigits = [val];
                                                                        else if (currentDigits.length === 1) {
                                                                            const combine = currentDigits[0] * 10 + val;
                                                                            newDigits = combine <= maxScore ? [currentDigits[0], val] : [val];
                                                                        } else newDigits = [val];
                                                                    } else {
                                                                        // Digit-by-digit decimal entry
                                                                        if (currentDigits.length === 0) {
                                                                            newDigits = [val];
                                                                        } else if (currentDigits.length < precision + 1) {
                                                                            newDigits = [...currentDigits, val];
                                                                        } else {
                                                                            newDigits = [val];
                                                                        }
                                                                    }

                                                                    let newVal;
                                                                    if (precision === 0) {
                                                                        newVal = newDigits.length === 2 ? newDigits[0] * 10 + newDigits[1] : newDigits[0];
                                                                    } else {
                                                                        newVal = newDigits[0];
                                                                        for (let i = 1; i < newDigits.length; i++) {
                                                                            newVal += newDigits[i] / Math.pow(10, i);
                                                                        }
                                                                    }

                                                                    if (newVal > maxScore) newVal = maxScore;
                                                                    if (newVal < minScore) newVal = minScore;
                                                                    newVal = parseFloat(newVal.toFixed(precision));

                                                                    setScoringModal(prev => ({
                                                                        ...prev,
                                                                        selection: newVal,
                                                                        selectedBase: newDigits[0],
                                                                        typedDigits: newDigits
                                                                    }));
                                                                }}
                                                                style={{
                                                                    height: '42px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    background: isHighlighted ? 'var(--accent-blue)' : 'var(--surface-hover)',
                                                                    border: isHighlighted ? 'none' : '1px solid rgba(15, 23, 42, 0.1)',
                                                                    borderRadius: '10px',
                                                                    color: isHighlighted ? 'white' : 'var(--text-primary)',
                                                                    fontSize: '16px',
                                                                    fontWeight: '900',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease',
                                                                    boxShadow: isHighlighted ? '0 4px 12px rgba(0,71,255,0.25)' : 'none'
                                                                }}
                                                            >
                                                                {val}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Step 2: Decimal Sub-Buttons */}
                                            {scoringModal.selectedBase !== undefined && scoringModal.selectedBase !== (selectedHeat?.max_score ?? 10) && (selectedHeat?.score_decimals ?? 1) >= 1 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                                                    {/* .1 to .9 row */}
                                                    <div>
                                                        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                                                            Step 2 — Fine-tune {scoringModal.selectedBase}.x
                                                        </p>
                                                        <div className="scoring-modal-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${(selectedHeat?.score_decimals ?? 1) >= 2 ? 10 : 9}, 1fr)`, gap: '4px' }}>
                                                            {((selectedHeat?.score_decimals ?? 1) >= 2 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9]).map(d => {
                                                                const val = parseFloat((scoringModal.selectedBase + d / 10).toFixed(1));
                                                                const isActive = scoringModal.selection === val || (scoringModal.typedDigits?.length >= 2 && scoringModal.typedDigits[1] === d);
                                                                return (
                                                                    <button
                                                                        key={val}
                                                                        onClick={() => {
                                                                            const precision = selectedHeat?.score_decimals ?? 1;
                                                                            const decimalVal = d / 10;
                                                                            const newVal = parseFloat((scoringModal.selectedBase + decimalVal).toFixed(precision));
                                                                            setScoringModal(prev => ({
                                                                                ...prev,
                                                                                selection: newVal,
                                                                                typedDigits: [scoringModal.selectedBase, d]
                                                                            }));
                                                                        }}
                                                                        style={{
                                                                            height: '38px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            background: isActive ? '#10b981' : 'rgba(16,185,129,0.08)',
                                                                            border: isActive ? 'none' : '1px solid rgba(16,185,129,0.2)',
                                                                            borderRadius: '8px',
                                                                            color: isActive ? 'white' : '#059669',
                                                                            fontSize: '14px',
                                                                            fontWeight: '800',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                    >
                                                                        {val.toFixed(1)}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Step 3: Second Decimal Sub-Buttons */}
                                                    {scoringModal.typedDigits?.length >= 2 && (selectedHeat?.score_decimals ?? 1) >= 2 && (
                                                        <div style={{ marginTop: '4px' }}>
                                                            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                                                                Step 3 — Fine-tune {scoringModal.typedDigits[0]}.{scoringModal.typedDigits[1]}x
                                                            </p>
                                                            <div className="scoring-modal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
                                                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => {
                                                                    const val = parseFloat((scoringModal.typedDigits[0] + scoringModal.typedDigits[1] / 10 + d / 100).toFixed(2));
                                                                    const isActive = scoringModal.selection === val;
                                                                    return (
                                                                        <button
                                                                            key={val}
                                                                            onClick={() => {
                                                                                const precision = selectedHeat?.score_decimals ?? 1;
                                                                                const newVal = parseFloat((scoringModal.typedDigits[0] + scoringModal.typedDigits[1] / 10 + d / 100).toFixed(precision));
                                                                                setScoringModal(prev => ({
                                                                                    ...prev,
                                                                                    selection: newVal,
                                                                                    typedDigits: [scoringModal.typedDigits[0], scoringModal.typedDigits[1], d]
                                                                                }));
                                                                            }}
                                                                            style={{
                                                                                height: '38px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                background: isActive ? '#f59e0b' : 'rgba(245,158,11,0.08)',
                                                                                border: isActive ? 'none' : '1px solid rgba(245,158,11,0.2)',
                                                                                borderRadius: '8px',
                                                                                color: isActive ? 'white' : '#d97706',
                                                                                fontSize: '14px',
                                                                                fontWeight: '800',
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.15s ease'
                                                                            }}
                                                                        >
                                                                            {val.toFixed(2)}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>


                                        <div className="jd-modal-footer" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '10px' }}>
                                            {(scoringModal.currentScore != null || scoringModal.interferenceSelected != null) && (
                                                <button
                                                    onClick={handleScoreReset}
                                                    disabled={isResettingScore}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        padding: '0 12px',
                                                        height: '44px',
                                                        background: '#f59e0b',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        color: 'white',
                                                        cursor: isResettingScore ? 'not-allowed' : 'pointer',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase',
                                                        whiteSpace: 'nowrap',
                                                        opacity: isResettingScore ? 0.6 : 1
                                                    }}
                                                >
                                                    {isResettingScore ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                                    Reset
                                                </button>
                                            )}

                                            <button
                                                className="jd-btn-interference"
                                                onClick={() => setScoringModal(prev => ({ ...prev, showInterference: true }))}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    padding: '0 12px',
                                                    height: '44px',
                                                    background: '#ef4444',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <Flag size={14} fill={scoringModal.interferenceSelected ? "white" : "none"} />
                                                {scoringModal.interferenceSelected ? `INT: ${scoringModal.interferenceSelected}%` : 'Interference'}
                                            </button>

                                            <button
                                                className="jd-btn-cancel"
                                                onClick={() => setScoringModal(null)}
                                                style={{ flex: 1, height: '44px', padding: 0, borderRadius: '12px', fontWeight: '800', fontSize: '15px', background: 'var(--surface-hover)', border: '1px solid var(--border-dim)', color: 'var(--text-dark)' }}
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                className="jd-btn-confirm"
                                                onClick={async () => {
                                                    const finalScore = scoringModal.selection !== undefined
                                                        ? scoringModal.selection
                                                        : (scoringModal.currentScore != null ? parseFloat(scoringModal.currentScore) : null);

                                                    // Must have a score selected (regardless of INT selection)
                                                    if (finalScore === null) {
                                                        setCustomAlert({ message: "Please select or enter a score first." });
                                                        return;
                                                    }

                                                    // Block rescore if judge submits the same score as original
                                                    const isRescoreUnchanged = scoringModal.isRescore &&
                                                        scoringModal.currentScore != null &&
                                                        parseFloat(finalScore).toFixed(1) ===
                                                        parseFloat(scoringModal.currentScore).toFixed(1);
                                                    if (isRescoreUnchanged) {
                                                        setRescoreSameScoreWarning(true);
                                                        return;
                                                    }
                                                    setRescoreSameScoreWarning(false);

                                                    const success = await handleScoreSubmit(scoringModal.surfer.id, scoringModal.waveNumber, finalScore);
                                                    if (success) {
                                                        setScoringModal(null);
                                                    }
                                                }}
                                                disabled={
                                                    // Disabled if no score at all
                                                    (scoringModal.selection === undefined && scoringModal.currentScore == null)
                                                }
                                                style={{
                                                    flex: 1.5,
                                                    height: '44px',
                                                    padding: 0,
                                                    borderRadius: '12px',
                                                    fontWeight: '900',
                                                    fontSize: '15px',
                                                    textTransform: 'uppercase',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    background: 'var(--accent-blue)',
                                                    border: 'none',
                                                    color: 'white',
                                                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                                                    opacity: (scoringModal.selection === undefined && scoringModal.currentScore == null) ? 0.5 : 1,
                                                    cursor: (scoringModal.selection === undefined && scoringModal.currentScore == null) ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <Check size={18} strokeWidth={3} />
                                                Confirm Score
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Manual Edit Time Modal */}
            {editingFinish && (
                <div
                    className="modal-overlay"
                    onClick={(e) => e.target === e.currentTarget && setEditingFinish(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999,
                        background: 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                >
                    <div style={{
                        background: 'white',
                        width: '90%',
                        maxWidth: '380px',
                        borderRadius: '24px',
                        padding: '24px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        {/* Title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'rgba(37, 99, 235, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#2563eb'
                            }}>
                                <Clock size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                    Edit Finish Time
                                </h3>
                                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                                    Adjust minutes, seconds, and centiseconds
                                </p>
                            </div>
                        </div>

                        {/* Inputs Grid */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                            {/* Minutes */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Minutes
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={editingFinish.minutes}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                        if (val !== '' && parseInt(val) > 99) val = '99';
                                        setEditingFinish(prev => ({ ...prev, minutes: val }));
                                    }}
                                    placeholder="00"
                                    style={{
                                        width: '100%',
                                        height: '54px',
                                        borderRadius: '14px',
                                        border: '2px solid #e2e8f0',
                                        textAlign: 'center',
                                        fontSize: '22px',
                                        fontWeight: '800',
                                        color: '#0f172a',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        fontFamily: 'monospace'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            <span style={{ fontSize: '24px', fontWeight: '800', color: '#94a3b8', marginTop: '16px' }}>:</span>

                            {/* Seconds */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Seconds
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={editingFinish.seconds}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                        if (val !== '' && parseInt(val) > 59) val = '59';
                                        setEditingFinish(prev => ({ ...prev, seconds: val }));
                                    }}
                                    placeholder="00"
                                    style={{
                                        width: '100%',
                                        height: '54px',
                                        borderRadius: '14px',
                                        border: '2px solid #e2e8f0',
                                        textAlign: 'center',
                                        fontSize: '22px',
                                        fontWeight: '800',
                                        color: '#0f172a',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        fontFamily: 'monospace'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            <span style={{ fontSize: '24px', fontWeight: '800', color: '#94a3b8', marginTop: '16px' }}>.</span>

                            {/* Centiseconds */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Centisec
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={editingFinish.centiseconds}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                        if (val !== '' && parseInt(val) > 99) val = '99';
                                        setEditingFinish(prev => ({ ...prev, centiseconds: val }));
                                    }}
                                    placeholder="00"
                                    style={{
                                        width: '100%',
                                        height: '54px',
                                        borderRadius: '14px',
                                        border: '2px solid #e2e8f0',
                                        textAlign: 'center',
                                        fontSize: '22px',
                                        fontWeight: '800',
                                        color: '#0f172a',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        fontFamily: 'monospace'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setEditingFinish(null)}
                                style={{
                                    flex: 1,
                                    height: '46px',
                                    borderRadius: '12px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    color: '#475569',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEditedFinish}
                                style={{
                                    flex: 1,
                                    height: '46px',
                                    borderRadius: '12px',
                                    background: '#2563eb',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <Check size={16} strokeWidth={3} />
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Custom Alert Modal */}
            {customAlert && (
                <div
                    className="modal-overlay animate-fade-in"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 10000, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <div style={{
                        background: 'white', width: '90%', maxWidth: '400px', borderRadius: '24px', padding: '24px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)', textAlign: 'center',
                        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                        }}>
                            <AlertCircle size={32} strokeWidth={2.5} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px' }}>Aquaticxsports.com Says</h3>
                        <p style={{ fontSize: '15px', color: '#475569', margin: '0 0 24px', lineHeight: '1.5' }}>
                            {customAlert.message}
                        </p>
                        <button
                            onClick={() => {
                                if (customAlert.onClose) customAlert.onClose();
                                setCustomAlert(null);
                            }}
                            style={{
                                width: '100%', height: '48px', borderRadius: '12px', background: '#2563eb', color: 'white',
                                fontWeight: '700', fontSize: '16px', border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {customConfirm && (
                <div
                    className="modal-overlay animate-fade-in"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 10000, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <div style={{
                        background: 'white', width: '90%', maxWidth: '400px', borderRadius: '24px', padding: '24px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)', textAlign: 'center',
                        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                        }}>
                            <HelpCircle size={32} strokeWidth={2.5} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px' }}>Please Confirm</h3>
                        <p style={{ fontSize: '15px', color: '#475569', margin: '0 0 24px', lineHeight: '1.5' }}>
                            {customConfirm.message}
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    if (customConfirm.onCancel) customConfirm.onCancel();
                                    setCustomConfirm(null);
                                }}
                                style={{
                                    flex: 1, height: '48px', borderRadius: '12px', background: '#f1f5f9', color: '#475569',
                                    fontWeight: '700', fontSize: '16px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    customConfirm.onConfirm();
                                }}
                                style={{
                                    flex: 1, height: '48px', borderRadius: '12px', background: '#2563eb', color: 'white',
                                    fontWeight: '700', fontSize: '16px', border: 'none', cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes toast-slide-down {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }

                @media(max-width: 768px) {
                    .header { padding: 12px 16px !important; }
                    .jd-header-text h1 { font-size: 15px !important; }
                    .jd-user-info { display: none !important; }
                    .jd-main-content { padding: 24px 16px !important; }
                    .jd-title-section h2 { font-size: 24px !important; margin-bottom: 4px !important; }
                    .jd-title-section p { font-size: 14px !important; }
                    .jd-status-card { padding: 16px 20px !important; }
                    .jd-status-layout { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
                    .jd-status-divider-main { display: none !important; }
                    .jd-status-divider { display: none !important; }
                    .jd-status-text { font-size: 16px !important; }
                    .jd-timer-val { font-size: 16px !important; }
                    .jd-timer-section { text-align: right !important; }
                    .jd-timer-section > div { justify-content: flex-end !important; gap: 8px !important; }
                    .jd-clock-icon { width: 18px !important; height: 18px !important; }
                    .jd-main-content table th, .jd-main-content table td { padding: 12px 16px !important; }
                    
                    /* Scoring Modal Mobile Optimization */
                    .scoring-modal-inner { width: 95% !important; padding: 20px !important; }
                    .scoring-modal-grid { 
                        display: grid !important;
                        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)) !important; 
                        gap: 8px !important; 
                    }
                    .scoring-modal-grid button { height: 44px !important; font-size: 16px !important; width: 100% !important; }
                    .jd-modal-footer { flex-direction: column-reverse !important; gap: 10px !important; align-items: stretch !important; }
                    .jd-btn-interference, .jd-btn-cancel, .jd-btn-confirm { width: 100% !important; flex: none !important; margin: 0 !important; }
                    .jd-btn-confirm { height: 52px !important; font-size: 16px !important; }
                }

                @media(min-width: 769px) {
                    .jd-main-content { padding: 48px 32px !important; }
                    .jd-title-section h2 { font-size: 40px !important; }
                    .jd-timer-val { font-size: 32px !important; }
                    .scoring-modal-grid { 
                        display: grid !important;
                        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)) !important;
                        gap: 8px !important; 
                    }
                }
            `}</style>
        </div >
    );
};

export default JudgeDashboard;
