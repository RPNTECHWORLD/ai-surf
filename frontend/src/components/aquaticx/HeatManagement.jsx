import React, { useState, useEffect, useRef } from 'react';
import './aquaticx.css';
import { Plus, X, ChevronDown, Check, Loader2, Calendar, Users, User, MapPin, Clock, Edit, Trash2, Play, Shuffle, Eye, Award, Trophy, AlertCircle, HelpCircle, ChevronRight, Settings, ArrowLeftRight, Share2, Copy, Check as CheckIcon, Zap } from 'lucide-react';
import { useToast } from './ToastContext';
import { useConfirm } from './ConfirmContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import bgImage from '../../assets/bg.jpeg';
import { shareHeatCardAsImage } from './shareHeatCard';
import HeatScheduleView from './HeatScheduleView';

const API_BASE = 'http://54.84.243.251/api';

// Available jersey colors for surfers
const JERSEY_COLORS = [
    { name: 'Red', hex: '#FF0000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Green', hex: '#00FF00' },
    { name: 'Blank', hex: '#000000' }
];

// Helper: safely parse sup_categories stored as a JSON array string in the DB
// e.g. '["Sprint","Technical race"]'  →  ['Sprint', 'Technical race']
const parseSUPCategories = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim()) {
        try { return JSON.parse(val); } catch {}
        return val.split(',').map(c => c.trim()).filter(Boolean);
    }
    return [];
};

// Helper to get round weight (mirrors backend logic)
const getRoundWeightFE = (r) => {
    const lower = (r || '').toLowerCase().trim();
    if (lower === 'final') return 10000;
    if (lower === 'semi final' || lower === 'semifinal') return 9000;
    if (lower === 'quarter final' || lower === 'quarterfinal') return 8000;
    if (lower === 'eliminator') return 2001.5;
    const numMatch = lower.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : 0;
    if (lower.includes('qualifier')) return 1000 + num;
    if (lower.includes('round')) return 2000 + num;
    return 5000;
};

// Global cache for instant tab-switching (stale-while-revalidate pattern)
let globalHeatCache = {
    events: [],
    heats: [],
    surfers: [],
    activeJudges: [],
    hasLoaded: false
};

const HeatManagement = ({ currentUser }) => {
    const { showToast } = useToast();
    const { showConfirm } = useConfirm();
    const [events, setEvents] = useState(globalHeatCache.events);
    const [heats, setHeats] = useState(globalHeatCache.heats);
    const [allSurfers, setAllSurfers] = useState(globalHeatCache.surfers);
    const [isLoading, setIsLoading] = useState(!globalHeatCache.hasLoaded);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customAlert, setCustomAlert] = useState(null);
    const [customConfirm, setCustomConfirm] = useState(null);
    const [viewHeat, setViewHeat] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'schedule'
    const vhEvent = viewHeat ? events.find(e => e.id === viewHeat.event_id) : null;
    const isVhSup = vhEvent?.event_type === 'SUP Event';
    const isVhBreak = viewHeat?.division === 'Break' || (viewHeat?.round || '').toLowerCase().includes('break');
    const [selectedEventFilter, setSelectedEventFilter] = useState(() => {
        return localStorage.getItem('heat_management_event_filter') || 'all';
    });
    const [selectedDivisionFilter, setSelectedDivisionFilter] = useState(() => {
        return localStorage.getItem('heat_management_division_filter') || 'all';
    });
    const [selectedRoundFilter, setSelectedRoundFilter] = useState(() => {
        return localStorage.getItem('heat_management_round_filter') || 'all';
    });
    const [selectedSupCategoryFilter, setSelectedSupCategoryFilter] = useState(() => {
        return localStorage.getItem('heat_management_sup_category_filter') || 'all';
    });
    const [timerModal, setTimerModal] = useState({ isOpen: false, heat: null, duration: 2 });
    const [shareModal, setShareModal] = useState({ isOpen: false, heat: null });
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [serverTimeOffset, setServerTimeOffset] = useState(0);

    // User context & role detection
    const savedUser = currentUser || JSON.parse(sessionStorage.getItem('user') || '{}');
    const isStudent = savedUser.role === 'athlete' || savedUser.role === 'student';
    const studentName = (savedUser.name || '').toLowerCase().trim();
    const studentEmail = (savedUser.email || '').toLowerCase().trim();
    const studentId = savedUser.student_id || savedUser.id;

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editHeatId, setEditHeatId] = useState(null);

    // Tournament progression state
    const [tournamentProgressionData, setTournamentProgressionData] = useState(null);

    // Auto-generate rounds state
    const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState(false);
    const [autoGenPreview, setAutoGenPreview] = useState(null); // { base_round, details[], eliminator? }
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [eliminatorEnabled, setEliminatorEnabled] = useState(false);
    const [isEliminatorPromptOpen, setIsEliminatorPromptOpen] = useState(false);
    const [isProgressionLoading, setIsProgressionLoading] = useState(false);

    // Judge assignment state
    const [activeJudges, setActiveJudges] = useState(globalHeatCache.activeJudges);
    const [selectedJudgeIds, setSelectedJudgeIds] = useState([]);
    const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
    const [isAssigningJudges, setIsAssigningJudges] = useState(false);

    // Swap Surfers wizard state
    const [swapWizard, setSwapWizard] = useState({
        isOpen: false,
        step: 1, // 1=pick surfer A, 2=pick target heat, 3=pick surfer B, 4=confirm
        surferA: null,    // { id, name, color }
        targetHeat: null, // heat object
        surferB: null,    // { id, name, color }
        isSwapping: false
    });

    // Jersey color assignment state
    const [surferColors, setSurferColors] = useState({}); // { surfer_id: color_hex }

    // Imported surfers for the currently selected event (from event_surfers)
    const [eventImportedSurferIds, setEventImportedSurferIds] = useState(null); // null = no import filter

    // Parent event heats for series-event seeding
    const [parentEventHeats, setParentEventHeats] = useState([]); // heats from series_parent_id event
    const [parentSeedingDivision, setParentSeedingDivision] = useState(''); // which parent division to seed from

    // Current time effect for live timer feedback
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now() + serverTimeOffset);
        }, 1000);
        return () => clearInterval(interval);
    }, [serverTimeOffset]);

    // Persist event filter
    useEffect(() => {
        localStorage.setItem('heat_management_event_filter', selectedEventFilter);
    }, [selectedEventFilter]);

    // Persist division filter
    useEffect(() => {
        localStorage.setItem('heat_management_division_filter', selectedDivisionFilter);
    }, [selectedDivisionFilter]);

    // Persist round filter
    useEffect(() => {
        localStorage.setItem('heat_management_round_filter', selectedRoundFilter);
    }, [selectedRoundFilter]);

    // Persist SUP category filter
    useEffect(() => {
        localStorage.setItem('heat_management_sup_category_filter', selectedSupCategoryFilter);
    }, [selectedSupCategoryFilter]);

    const isTimerActive = (h) => {
        if (!h?.timer_start_time || !h?.timer_duration) return false;
        const startTime = new Date(h.timer_start_time).getTime();
        const durationMs = h.timer_duration * 60 * 1000;
        // Timer is active if we have started the countdown and the heat is still scheduled
        // and the current time is within the duration.
        return currentTime >= startTime && currentTime < startTime + durationMs && (h.status === 'scheduled' || !h.status);
    };

    const isTimerSet = (h) => {
        return !!(h?.timer_start_time && h?.timer_duration);
    };

    const SummaryItem = ({ label, value, icon, highlight }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                {label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: highlight ? '#22c55e' : 'var(--text-secondary)' }}>{icon}</div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: highlight ? '#16a34a' : 'var(--text-dark)' }}>
                    {value}
                </span>
            </div>
        </div>
    );

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase() || 'scheduled';
        let bg = 'var(--text-secondary)'; // darkened scheduled (slate-500) for better white contrast
        if (s === 'in-progress') bg = '#16a34a'; // slightly darker green
        if (s === 'completed') bg = '#2563eb'; // slightly darker blue
        if (s === 'unscheduled') bg = '#94a3b8'; // greyish slate-400 for unscheduled

        return {
            backgroundColor: bg,
            color: '#FFFFFF', // Changed to white for better contrast
            fontWeight: '800', // Made even bolder
            padding: '4px 12px', // Increased padding
            borderRadius: '12px', // More modern rounded corners (less pill-like)
            fontSize: '13px', // Increased font size from 11px
            display: 'inline-block',
            textTransform: 'uppercase', // Changed from lowercase for better clarity
            letterSpacing: '0.05em', // Added letter spacing
            border: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' // Added subtle shadow
        };
    };

    // Form state
    const [formData, setFormData] = useState({
        event_id: '',
        division: '',
        sup_category: '',
        round: 'Round 1',
        heat_number: 1,
        surfer_count: 4,
        qualified_count: 2,
        duration: 30,
        start_time: '',
        end_time: '',
        auto_scoring_mode: false
    });
    const [selectedSurferIds, setSelectedSurferIds] = useState([]);
    const [calculatedHeatNumber, setCalculatedHeatNumber] = useState(1);
    const [lastSyncedKey, setLastSyncedKey] = useState('');
    const [modalSurferGenderFilter, setModalSurferGenderFilter] = useState('All');

    const isBreak = formData.division === 'Break' || (formData.round || '').toLowerCase().includes('break');

    // Auto-calculate next heat number and sync surfer count based on Event, Division, and Round
    useEffect(() => {
        if (isProgressionLoading) return;
        if (!isEditing && formData.event_id && formData.division && formData.round) {
            const currentKey = `${formData.event_id}-${formData.division}-${formData.round}`;

            const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
            const isSup = currentEvent?.event_type === 'SUP Event';

            const filteredHeats = heats.filter(h =>
                String(h.event_id) === String(formData.event_id) &&
                h.division?.toLowerCase().trim() === formData.division?.toLowerCase().trim() &&
                h.round?.toLowerCase().trim() === formData.round?.toLowerCase().trim() &&
                (!isSup || h.sup_category === formData.sup_category)
            );

            const lastHeat = filteredHeats.reduce((max, h) => Math.max(max, h.heat_number || 0), 0);
            const nextHeat = lastHeat + 1;
            setCalculatedHeatNumber(nextHeat);

            // Sync surfer count and heat number
            const available = getAvailableSurfers();
            const availableCount = available.filter(s => !s.is_sub).length;
            const assignedCount = filteredHeats.reduce((sum, h) => sum + (h.surfers ? h.surfers.length : (h.surfer_ids ? h.surfer_ids.length : 0)), 0);

            let expectedSurferCount = 4;
            let expectedQualifiedCount = 2;

            if (availableCount > 0) {
                const total = availableCount + assignedCount;
                const numHeats = Math.ceil(total / 4);
                const heatsRemaining = Math.max(1, numHeats - filteredHeats.length);
                expectedSurferCount = Math.ceil(availableCount / heatsRemaining);

                if (expectedSurferCount > 4) expectedSurferCount = 4;
                if (expectedSurferCount < 1) expectedSurferCount = 1;
            }

            setFormData(prev => {
                let shouldUpdate = false;
                const newData = { ...prev };
                const isNextHeat = prev.heat_number !== nextHeat;

                if (isNextHeat) {
                    newData.heat_number = nextHeat;
                    shouldUpdate = true;
                }

                // Auto-fill surfer count and qualified count if we just switched to this Round/Division,
                // OR if we just advanced to the next heat number (so the remaining heats adjust accordingly).
                const isNewSelection = currentKey !== lastSyncedKey;
                if (isNewSelection || isNextHeat) {
                    if (prev.surfer_count !== expectedSurferCount || prev.qualified_count !== expectedQualifiedCount) {
                        newData.surfer_count = expectedSurferCount;
                        newData.qualified_count = expectedQualifiedCount;
                        shouldUpdate = true;
                    }
                }

                return shouldUpdate ? newData : prev;
            });

            if (currentKey !== lastSyncedKey) {
                setLastSyncedKey(currentKey);
            }
        }
    }, [formData.event_id, formData.division, formData.round, heats, allSurfers, lastSyncedKey, isEditing, eventImportedSurferIds, tournamentProgressionData]);

    // Auto-rename round to "Semi Final" when exactly 2 heats are needed —
    // but ONLY if this is a fresh round with zero heats created yet.
    useEffect(() => {
        if (isEditing || !formData.event_id || !formData.division || !formData.round) return;

        const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
        const isSup = currentEvent?.event_type === 'SUP Event';

        // Don't rename if heats already exist for this round
        const heatsForThisRound = heats.filter(h =>
            String(h.event_id) === String(formData.event_id) &&
            h.division?.toLowerCase().trim() === formData.division?.toLowerCase().trim() &&
            h.round?.toLowerCase().trim() === formData.round?.toLowerCase().trim() &&
            (!isSup || h.sup_category === formData.sup_category)
        );
        if (heatsForThisRound.length > 0) return; // round already in progress — never rename

        const available = getAvailableSurfers();
        const availableCount = available.filter(s => !s.is_sub).length;
        if (availableCount < 2) return;

        const numHeats = Math.ceil(availableCount / 4);
        const isSemiFinal = numHeats === 2;

        // Only auto-rename if the current round name looks like a generic "Round N"
        const isGenericRoundName = /^round\s*\d+$/i.test(formData.round.trim());

        if (isSemiFinal && isGenericRoundName) {
            setFormData(prev => ({ ...prev, round: 'Semi Final' }));
        }
    }, [formData.event_id, formData.division, formData.round, tournamentProgressionData, eventImportedSurferIds, heats, allSurfers, isEditing]);

    // Helper functions for time calculations
    const formatTimeOnly = (t) => {
        if (!t) return '';
        return t.includes(' ') ? t.split(' ')[1] : t;
    };

    const timeToMinutes = (timeStr) => {
        if (!timeStr) return null;
        const timePart = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
        if (!timePart || !timePart.includes(':')) return null;
        const parts = timePart.split(':');
        // type="time" normally provides HH:mm, but let's be safe
        if (parts.length < 2 || parts[0] === '' || parts[1] === '') return null;
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
    };

    const minutesToTime = (totalMinutes) => {
        if (totalMinutes === null || isNaN(totalMinutes)) return '';
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const getHeatTimingDisplay = (h) => {
        const displayStart = formatTimeOnly(h.start_time);
        const displayEnd = formatTimeOnly(h.end_time);
        if (h.event_type === 'SUP Event') {
            if (h.start_time && h.end_time) {
                const startMins = timeToMinutes(h.start_time);
                const endMins = timeToMinutes(h.end_time);
                if (startMins !== null && endMins !== null) {
                    const diff = (endMins - startMins + 1440) % 1440;
                    return `${displayStart} - ${displayEnd} (${diff}m)`;
                }
            }
            if (h.start_time) {
                return displayStart;
            }
            return '--:--';
        }
        return `${displayStart || '--:--'} - ${displayEnd || '--:--'} (${h.duration}m)`;
    };

    // Independent update handlers to allow the 2-of-3 logic to work without loops
    const handleTimeFieldChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Extract date part from start_time or end_time if it exists
            let datePart = '';
            if (prev.start_time && prev.start_time.includes(' ')) {
                datePart = prev.start_time.split(' ')[0];
            } else if (prev.end_time && prev.end_time.includes(' ')) {
                datePart = prev.end_time.split(' ')[0];
            }

            const startMins = timeToMinutes(field === 'start_time' ? value : prev.start_time);
            const endMins = timeToMinutes(field === 'end_time' ? value : prev.end_time);
            const durationMins = field === 'duration' ? (value === '' ? null : Number(value)) : (prev.duration === '' ? null : Number(prev.duration));

            if (field === 'start_time') {
                if (startMins !== null && durationMins !== null) {
                    newData.end_time = minutesToTime(startMins + durationMins);
                } else if (startMins !== null && endMins !== null) {
                    let diff = endMins - startMins;
                    if (diff < 0) diff += 1440;
                    newData.duration = diff;
                }
            }
            else if (field === 'duration') {
                if (durationMins !== null && startMins !== null) {
                    newData.end_time = minutesToTime(startMins + durationMins);
                } else if (durationMins !== null && endMins !== null) {
                    const calculatedStart = (endMins - durationMins + 1440) % 1440;
                    newData.start_time = minutesToTime(calculatedStart);
                }
            }
            else if (field === 'end_time') {
                if (endMins !== null && startMins !== null) {
                    let diff = endMins - startMins;
                    if (diff < 0) diff += 1440;
                    newData.duration = diff;
                } else if (endMins !== null && durationMins !== null) {
                    const calculatedStart = (endMins - durationMins + 1440) % 1440;
                    newData.start_time = minutesToTime(calculatedStart);
                }
            }

            // Restore datePart to start_time & end_time if they were overwritten as pure HH:mm
            if (datePart) {
                if (newData.start_time && !newData.start_time.includes(' ')) {
                    newData.start_time = `${datePart} ${newData.start_time}`;
                }
                if (newData.end_time && !newData.end_time.includes(' ')) {
                    newData.end_time = `${datePart} ${newData.end_time}`;
                }
            }

            return newData;
        });
    };

    useEffect(() => {
        // If we already have cached data, fetch silently to prevent the loading spinner
        fetchInitialData(globalHeatCache.hasLoaded);

        // Polling for real-time updates (every 3 seconds)
        const interval = setInterval(() => {
            fetchInitialData(true);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // Fetch tournament progression data when event/division/round changes
    const fetchTournamentProgression = async () => {
        if (formData.event_id && formData.division && formData.round) {
            console.log('🔄 Fetching tournament progression for:', formData.round);
            setIsProgressionLoading(true);
            try {
                const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
                const adminId = adminInfo.adminId || 'admin';
                const response = await axios.get(`${API_BASE}/heats/available-surfers`, {
                    params: {
                        event_id: formData.event_id,
                        division: formData.division,
                        round: formData.round,
                        admin_id: adminId,
                        sup_category: formData.sup_category || undefined
                    }
                });
                console.log('🏆 Tournament Progression Data Received:', response.data);
                setTournamentProgressionData(response.data);
            } catch (err) {
                console.error('Error fetching tournament progression:', err);
                setTournamentProgressionData(null);
            } finally {
                setIsProgressionLoading(false);
            }
        } else {
            setTournamentProgressionData(null);
        }
    };

    useEffect(() => {
        fetchTournamentProgression();
    }, [formData.event_id, formData.division, formData.round, formData.sup_category, isModalOpen]);

    // Fetch imported surfers for selected event
    useEffect(() => {
        setEventImportedSurferIds(null);
    }, [formData.event_id]);

    // Fetch parent event heats when a series event is selected
    useEffect(() => {
        const fetchParentEventHeats = async () => {
            const selectedEvent = events.find(e => String(e.id) === String(formData.event_id));
            if (!selectedEvent || !selectedEvent.is_series || !selectedEvent.series_parent_id) {
                setParentEventHeats([]);
                setParentSeedingDivision('');
                return;
            }

            try {
                const res = await axios.get(`${API_BASE}/heats`, { params: { event_id: selectedEvent.series_parent_id } });
                const heatsData = res.data || [];
                setParentEventHeats(heatsData);

                // Auto-select the best matching division from parent event heats
                const parentDivisions = [...new Set(heatsData.map(h => h.division).filter(Boolean))];
                const formDivNorm = (formData.division || '').trim().toLowerCase();
                const exactMatch = parentDivisions.find(d => d.trim().toLowerCase() === formDivNorm);
                setParentSeedingDivision(exactMatch || parentDivisions[0] || '');
            } catch (err) {
                console.error('Error fetching parent event heats for seeding:', err);
                setParentEventHeats([]);
                setParentSeedingDivision('');
            }
        };
        fetchParentEventHeats();
    }, [formData.event_id, events]);

    // Auto-sync parent seeding division when the main division changes
    useEffect(() => {
        if (parentEventHeats.length > 0 && formData.division) {
            const parentDivisions = [...new Set(parentEventHeats.map(h => h.division).filter(Boolean))];
            const formDivNorm = formData.division.trim().toLowerCase();
            const exactMatch = parentDivisions.find(d => d.trim().toLowerCase() === formDivNorm);
            if (exactMatch) {
                setParentSeedingDivision(exactMatch);
            }
        }
    }, [formData.division, parentEventHeats]);

    const fetchInitialData = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';

            const [eventsRes, surfersRes, heatsRes, judgesRes, healthRes] = await Promise.all([
                axios.get(`${API_BASE}/events`, { params: { admin_id: adminId } }),
                axios.get(`${API_BASE}/surfers`),
                axios.get(`${API_BASE}/heats`, { params: { admin_id: adminId } }),
                axios.get(`${API_BASE}/judges`, { params: { admin_id: adminId } }),
                axios.get(`${API_BASE}/health`)
            ]);

            // Sync clock
            if (healthRes.data.timestamp) {
                const serverTime = new Date(healthRes.data.timestamp).getTime();
                const localTime = Date.now();
                setServerTimeOffset(serverTime - localTime);
            }
            // Fetch SuperAdmin instructors (Ironman etc.) — ONLY SuperAdmin instructors are valid judges
            const SURF_API = import.meta.env.VITE_API_URL || 'http://54.242.160.238:8000';
            let superAdminInstructors = [];
            try {
                const instRes = await fetch(`${SURF_API}/api/instructors`);
                if (instRes.ok) {
                    superAdminInstructors = await instRes.json();
                }
            } catch (e) {}

            const uniqueActiveJudges = [];
            const seenJudgeKeys = new Set();
            (superAdminInstructors || []).forEach((inst, index) => {
                if (!inst || !inst.name) return;
                const nameLower = inst.name.toLowerCase().trim();
                const emailLower = (inst.email || '').toLowerCase().trim();
                const key = `${nameLower}_${emailLower}`;
                if (!seenJudgeKeys.has(key)) {
                    seenJudgeKeys.add(key);
                    // Match with existing backend judge id if present
                    const matched = (judgesRes.data || []).find(
                        j => (j.email && j.email.toLowerCase().trim() === emailLower) ||
                             (j.name && j.name.toLowerCase().trim() === nameLower)
                    );
                    uniqueActiveJudges.push({
                        id: matched?.id || (inst.id ? String(inst.id) : `inst-${index + 1}`),
                        name: inst.name,
                        email: inst.email || '',
                        role: matched?.role || 'scoring',
                        status: 'Active',
                        judge_number: index + 1
                    });
                }
            });

            // If no SuperAdmin instructors, fallback to verified judges
            if (uniqueActiveJudges.length === 0) {
                (judgesRes.data || []).filter(j => j.status === 'Active').forEach(j => {
                    if (!j || !j.name) return;
                    const nameLower = j.name.toLowerCase().trim();
                    const emailLower = (j.email || '').toLowerCase().trim();
                    if (['ddf', 'summa', 'test', 'testing', 's2', 'p', 'ss', 'suman'].includes(nameLower)) return;
                    const key = `${nameLower}_${emailLower}`;
                    if (!seenJudgeKeys.has(key)) {
                        seenJudgeKeys.add(key);
                        uniqueActiveJudges.push({
                            ...j,
                            judge_number: uniqueActiveJudges.length + 1
                        });
                    }
                });
            }

            const activeJ = uniqueActiveJudges;
            
            // Fetch registered students from SuperAdmin to filter out un-registered / dummy surfers
            let registeredStudents = [];
            try {
                const stRes = await fetch(`${SURF_API}/api/students`);
                if (stRes.ok) {
                    const data = await stRes.json();
                    if (Array.isArray(data)) {
                        registeredStudents = data;
                    }
                }
            } catch (e) {}

            // Read deleted lists from localStorage to persist user deletions
            const deletedEmails = new Set(
                (JSON.parse(localStorage.getItem('deleted_student_emails') || '[]')).map(e => String(e).toLowerCase().trim())
            );
            const deletedNames = new Set(
                (JSON.parse(localStorage.getItem('deleted_surfer_names') || '[]')).map(n => String(n).toLowerCase().trim())
            );
            const deletedIds = new Set(
                (JSON.parse(localStorage.getItem('deleted_surfer_ids') || '[]')).map(i => String(i))
            );

            // Auto-clean approved students from deleted lists so they are never hidden if active
            if (registeredStudents && registeredStudents.length > 0) {
                let deletedEmailsList = Array.from(deletedEmails);
                let deletedNamesList = Array.from(deletedNames);
                const approvedEmails = new Set(registeredStudents.map(s => (s.email || '').toLowerCase().trim()).filter(Boolean));
                const approvedNames = new Set(registeredStudents.map(s => (s.name || '').toLowerCase().trim()).filter(Boolean));

                deletedEmailsList = deletedEmailsList.filter(e => !approvedEmails.has(e));
                deletedNamesList = deletedNamesList.filter(n => !approvedNames.has(n));

                localStorage.setItem('deleted_student_emails', JSON.stringify(deletedEmailsList));
                localStorage.setItem('deleted_surfer_names', JSON.stringify(deletedNamesList));
            }

            const regEmails = new Set((registeredStudents || []).map(s => (s.email || '').toLowerCase().trim()).filter(Boolean));
            const regNames = new Set((registeredStudents || []).map(s => (s.name || '').toLowerCase().trim()).filter(Boolean));

            // Deduplicate surfers list to ONLY include SuperAdmin registered students
            const uniqueSurfers = [];
            const seenSurferKeys = new Set();

            // First include verified SuperAdmin students
            (registeredStudents || []).forEach(st => {
                if (!st) return;
                const nameLower = (st.name || '').toLowerCase().trim();
                const emailLower = (st.email || '').toLowerCase().trim();
                if (!nameLower) return;
                if (deletedNames.has(nameLower) || (emailLower && deletedEmails.has(emailLower))) return;
                
                const key = `${nameLower}_${emailLower}`;
                if (!seenSurferKeys.has(key)) {
                    seenSurferKeys.add(key);
                    uniqueSurfers.push({
                        id: st.id || Date.now(),
                        name: st.name,
                        email: st.email || '',
                        gender: st.gender || 'Male',
                        age: st.age || 20,
                        school_name: st.school || st.school_name || 'Aquatic Indica Surf School',
                        state: st.state || 'Tamil Nadu'
                    });
                }
            });

            // If backend surfers have extra details for SuperAdmin students, match them
            (surfersRes.data || []).forEach(s => {
                if (!s) return;
                const nameLower = (s.name || '').toLowerCase().trim();
                const emailLower = (s.email || '').toLowerCase().trim();

                if (!nameLower) return;
                if (deletedNames.has(nameLower) || deletedIds.has(String(s.id))) return;
                if (emailLower && deletedEmails.has(emailLower)) return;

                // STRICT: Filter out dummy / non-SuperAdmin surfers - both name and email must match approved student
                if (registeredStudents && registeredStudents.length > 0) {
                    const matchedStudent = registeredStudents.find(st => {
                        const cleanStName = (st.name || '').toLowerCase().trim();
                        const cleanStEmail = (st.email || '').toLowerCase().trim();
                        
                        const nameMatches = nameLower === cleanStName;
                        const emailMatches = (emailLower && cleanStEmail) ? (emailLower === cleanStEmail) : true;
                        
                        return nameMatches && emailMatches;
                    });
                    if (!matchedStudent) return; // Skip if no student matches name and email
                }

                const key = `${nameLower}_${emailLower}`;
                if (!seenSurferKeys.has(key)) {
                    seenSurferKeys.add(key);
                    uniqueSurfers.push(s);
                }
            });

            // 2. Fetch scheduled sessions virtual events
            let virtualEvents = [];
            try {
                const sessionsRes = await fetch(`${SURF_API}/api/sessions`);
                if (sessionsRes.ok) {
                    const sessionsData = await sessionsRes.json();
                    let sessions = Array.isArray(sessionsData) ? sessionsData : [];

                    // Group sessions by date and slot time
                    const grouped = {};
                    sessions.forEach(session => {
                        let eventDate = session.date;
                        try {
                            const parsed = new Date(session.date);
                            if (!isNaN(parsed.getTime())) {
                                const year = parsed.getFullYear();
                                const month = String(parsed.getMonth() + 1).padStart(2, '0');
                                const day = String(parsed.getDate()).padStart(2, '0');
                                eventDate = `${year}-${month}-${day}`;
                            }
                        } catch (e) {}

                        const slotTime = session.time || 'Morning';
                        const groupKey = `${eventDate}_${slotTime}`;

                        if (!grouped[groupKey]) {
                            grouped[groupKey] = {
                                date: eventDate,
                                time: slotTime,
                                sessions: [],
                                duration_mins: session.duration_mins || 90
                            };
                        }
                        grouped[groupKey].sessions.push(session);
                    });

                    // Format date helper
                    const formatDateNice = (dateStr) => {
                        if (!dateStr) return '';
                        try {
                            const parts = dateStr.split('-');
                            if (parts.length === 3) {
                                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                if (!isNaN(d.getTime())) {
                                    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                                }
                            }
                            const parsed = new Date(dateStr);
                            if (!isNaN(parsed.getTime())) {
                                return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                            }
                        } catch(e) {}
                        return dateStr;
                    };

                    virtualEvents = Object.values(grouped).map((group, idx) => {
                        const studentIds = group.sessions.map(s => s.student_id).filter(Boolean);
                        const studentNames = group.sessions.map(s => s.student_name || s.student).filter(Boolean);
                        return {
                            id: `session-slot-${group.date}-${group.time.replace(/[^a-zA-Z0-9]/g, '')}-${idx}`,
                            isSessionEvent: true,
                            name: `Session Slot: ${formatDateNice(group.date)} @ ${group.time}`,
                            event_type: 'Scheduled Session',
                            status: 'Active',
                            location: 'Indica Surf School',
                            start_date: group.date,
                            end_date: group.date,
                            divisions: JSON.stringify([group.time]),
                            sponsors: JSON.stringify([]),
                            title_sponsors: JSON.stringify([]),
                            created_at: group.sessions[0]?.created_at || group.date,
                            session_slot: group.time.includes('min slot') ? group.time : `${group.time} (${group.duration_mins} min slot)`,
                            student_ids: studentIds,
                            student_names: studentNames
                        };
                    });
                }
            } catch(e) {
                console.warn('Could not fetch sessions for competitor events list:', e);
            }

            // Attach student_ids and student_names to the matching real session events from virtual sessions data
            const combinedDbEvents = eventsRes.data.map(event => {
                if (event.event_type === 'Scheduled Session') {
                    const match = virtualEvents.find(ve => ve.name === event.name);
                    if (match) {
                        return {
                            ...event,
                            student_ids: match.student_ids,
                            student_names: match.student_names
                        };
                    }
                }
                return event;
            });

            // Filter out virtual events that have already been created in the database
            const dbEventNames = new Set(eventsRes.data.map(e => e.name));
            const filteredVirtualEvents = virtualEvents.filter(ve => !dbEventNames.has(ve.name));

            const combinedEvents = [...combinedDbEvents, ...filteredVirtualEvents].sort((a, b) => {
                return new Date(a.created_at) - new Date(b.created_at);
            });

            setEvents(combinedEvents);
            setAllSurfers(uniqueSurfers);
            setHeats(heatsRes.data);
            setActiveJudges(activeJ);

            // Update global cache so next time tab opens, it's instant
            globalHeatCache = {
                events: combinedEvents,
                heats: heatsRes.data,
                surfers: uniqueSurfers,
                activeJudges: activeJ,
                hasLoaded: true
            };

            // ── Sync viewHeat from fresh data so the detail panel never shows stale info ──
            // This prevents the "No scoring judges" flash that appears when the polling
            // interval fires right after an optimistic judge assignment update.
            setViewHeat(prev => {
                if (!prev) return prev;
                const freshHeat = heatsRes.data.find(h => h.id === prev.id);
                if (!freshHeat) return prev;
                // Keep optimistic judges if the fresh data still has none (backend may not have saved yet)
                const freshJudges = freshHeat.judges && freshHeat.judges.length > 0
                    ? freshHeat.judges
                    : prev.judges;
                return { ...freshHeat, judges: freshJudges };
            });
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleOpenEditModal = (heat) => {
        if (heat.status === 'completed' || heat.status === 'finished') {
            setCustomAlert({ message: 'Heat is already completed' });
            return;
        }
        if (heat.status === 'in-progress') {
            setCustomAlert({ message: 'This heat is currently in progress' });
            return;
        }
        setIsEditing(true);
        setEditHeatId(heat.id);
        setFormData({
            event_id: heat.event_id || '',
            division: heat.division || '',
            sup_category: heat.sup_category || '',
            round: heat.round || 'Round 1',
            heat_number: heat.heat_number || 1,
            surfer_count: heat.surfer_count || 4,
            qualified_count: heat.qualified_count || 2,
            duration: heat.duration || 30,
            start_time: heat.start_time || '',
            end_time: heat.end_time || '',
            auto_scoring_mode: !!heat.auto_scoring_mode
        });
        setSelectedSurferIds(heat.surfers ? heat.surfers.map(s => s.id) : []);

        // Populate surfer colors from existing heat data
        const colors = {};
        if (heat.surfers) {
            heat.surfers.forEach(s => {
                if (s.color) {
                    colors[s.id] = s.color;
                }
            });
        }
        setSurferColors(colors);

        setIsModalOpen(true);
    };

    const handleNextRound = () => {
        if (!formData.event_id || !formData.division) {
            showToast('Please select event and division first.', 'error');
            return;
        }

        const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
        const isSupEvent = currentEvent?.event_type === 'SUP Event';

        // Filter heats for the selected event, division AND sup_category so
        // Sprint / Technical / etc. round progressions are fully independent.
        const activeCat = selectedSupCategoryFilter !== 'all' ? selectedSupCategoryFilter : (formData.sup_category || null);
        const divHeats = heats.filter(h =>
            String(h.event_id) === String(formData.event_id) &&
            h.division?.toLowerCase().trim() === formData.division?.toLowerCase().trim() &&
            (activeCat ? (h.sup_category || null) === activeCat : !h.sup_category)
        );

        if (divHeats.length === 0) {
            showToast('There is no previous rounds for this selected division', 'error');
            return;
        }

        // Check if all existing heats in this division+category are completed
        const incompleteHeat = divHeats.find(h => (h.status?.toLowerCase() || 'scheduled') !== 'completed');
        if (incompleteHeat) {
            showToast(`Still ${incompleteHeat.round} is not completed yet, Please complete this round and create next round`, 'error');
            return;
        }

        // Unique round names present in the system for this division
        const roundNames = Array.from(new Set(divHeats.map(h => h.round?.trim()))).filter(Boolean);

        // Helper to extract number
        const getNum = (s, pattern) => {
            const match = s.match(new RegExp(`${pattern}\\s*(\\d+)`, 'i'));
            return match ? parseInt(match[1], 10) : null;
        };

        let nextRoundName = "";
        let hasEliminator = false;
        let maxRound = 0;
        let foundAnyQualifier = false;
        let maxQualifier = 0;

        const hasSemiFinal = roundNames.some(r => r.toLowerCase() === 'semi final' || r.toLowerCase() === 'semifinal');

        roundNames.forEach(r => {
            if (r.toLowerCase().trim() === 'eliminator') hasEliminator = true;
            if (r.toLowerCase().includes('qualifier')) {
                foundAnyQualifier = true;
                const num = getNum(r, 'Qualifier');
                if (num !== null && num > maxQualifier) maxQualifier = num;
                else if (maxQualifier === 0) maxQualifier = 1;
            }
            const num = getNum(r, 'Round');
            if (num !== null && num > maxRound) maxRound = num;
        });

        if (hasSemiFinal) {
            nextRoundName = "Final";
        } else if (maxRound === 1 && !hasEliminator && !foundAnyQualifier && !isSupEvent) {
            // ONLY Round 1 exists, ask for Eliminator
            setIsEliminatorPromptOpen(true);
            return;
        } else if (isSupEvent && maxRound === 1 && !foundAnyQualifier) {
            nextRoundName = "Round 2";
        } else if (foundAnyQualifier) {
            nextRoundName = `Qualifier ${maxQualifier + 1}`;
        } else if (maxRound > 0) {
            nextRoundName = `Round ${maxRound + 1}`;
        } else {
            // Fallback suggestion: use the last round name plus increment if it ends in digit
            const lastRound = roundNames[roundNames.length - 1];
            const digitMatch = lastRound.match(/(\d+)$/);
            if (digitMatch) {
                const num = parseInt(digitMatch[1], 10);
                nextRoundName = lastRound.replace(/\d+$/, num + 1);
            } else {
                nextRoundName = lastRound + " 2";
            }
        }

        showToast(`The next round is "${nextRoundName}" (You can manually edit round name also)`, 'error');

        setFormData(prev => ({
            ...prev,
            round: nextRoundName
        }));
    };

    const handleCreateHeat = async (e) => {
        e.preventDefault();
        if (!isBreak && (!formData.event_id || formData.event_id === 'all' || !formData.division)) {
            showToast('Please select event and division', 'error');
            return;
        }
        
        let targetEventId = formData.event_id;
        if (isBreak && (!targetEventId || targetEventId === 'all')) {
            targetEventId = events.length > 0 ? events[0].id : '';
        }

        const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
        const isSup = currentEvent?.event_type === 'SUP Event';

        if (!isBreak) {
            // Validate that all selected surfers have a color/number assigned
            const assignedColorCount = Object.keys(surferColors).length;
            if (assignedColorCount < selectedSurferIds.length) {
                showToast(isSup ? 'Assign a number for all surfers' : 'Select the jersey color for all surfers', 'error');
                return;
            }

            // Validate unique colors/numbers
            const colors = Object.values(surferColors);
            const uniqueColors = new Set(colors);
            if (colors.length !== uniqueColors.size) {
                alert(isSup 
                    ? 'Each surfer must have a unique number. Please ensure no two surfers have the same number.' 
                    : 'Each surfer must have a unique jersey color. Please ensure no two surfers have the same color.'
                );
                return;
            }
        }

        try {
            setIsSubmitting(true);
            
            if (!isBreak && targetEventId && targetEventId.startsWith('session-slot-')) {
                // This is a virtual session event. We must persist it to the database first!
                const eventPayload = {
                    name: currentEvent.name,
                    location: currentEvent.location || 'Indica Surf School',
                    start_date: currentEvent.start_date,
                    end_date: currentEvent.end_date,
                    divisions: currentEvent.divisions,
                    status: 'Active',
                    event_type: 'Scheduled Session',
                    session_slot: currentEvent.session_slot,
                    min_score: 0,
                    max_score: 10,
                    score_decimals: 1,
                    judge_count: 3,
                    drop_high_low: 0,
                    best_waves_count: 2,
                    max_waves: 10,
                    sponsors: JSON.stringify([]),
                    title_sponsors: JSON.stringify([]),
                    admin_id: adminId
                };
                const newEventRes = await axios.post(`${API_BASE}/events`, eventPayload);
                targetEventId = newEventRes.data.id;
            }

            const dataToSubmit = {
                ...formData,
                event_id: targetEventId,
                surfer_count: isBreak ? null : formData.surfer_count,
                heat_number: isEditing ? formData.heat_number : calculatedHeatNumber,
                status: isEditing ? formData.status : 'Scheduled',
                qualified_count: isBreak ? null : formData.qualified_count,
                surfer_ids: selectedSurferIds,
                surfer_colors: surferColors
            };

            if (isEditing) {
                await axios.put(`${API_BASE}/heats/${editHeatId}`, dataToSubmit);
                showToast(isBreak ? 'Break updated successfully!' : 'Heat updated successfully!', 'success');
            } else {
                await axios.post(`${API_BASE}/heats`, dataToSubmit);
                showToast(isBreak ? 'Break card added to unscheduled' : 'Heat created successfully!', 'success');
            }

            setIsModalOpen(false);
            setIsEditing(false);
            setEditHeatId(null);
            setSelectedSurferIds([]);
            setSurferColors({});
            fetchInitialData(true);
        } catch (err) {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} heat:`, err);
            const message = err?.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} heat.`;
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const autoGenerateRound1Heats = async () => {
        if (!formData.event_id || formData.event_id === 'all' || !formData.division) {
            showToast('Please select event and division', 'error');
            return;
        }

        const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
        const isSup = currentEvent?.event_type === 'SUP Event';

        const availablePool = getAvailableSurfers().filter(s => !s.is_sub);
        if (availablePool.length === 0) {
            showToast('No available competitors to generate heats.', 'error');
            return;
        }

        const count = formData.surfer_count || 4;
        const estimatedHeats = Math.ceil(availablePool.length / count);
        
        if (estimatedHeats <= 0) return;

        const confirmed = await showConfirm(`This will automatically create ${estimatedHeats} heats and assign all ${availablePool.length} competitors based on seed rankings. Continue?`);
        if (!confirmed) {
            return;
        }

        setIsSubmitting(true);

        try {
            const getRoundWeight = (r) => {
                if (!r) return 0;
                const lower = r.toString().toLowerCase().trim();
                if (lower === 'final') return 10000;
                if (lower === 'semi final' || lower === 'semifinal') return 9000;
                if (lower === 'quarter final' || lower === 'quarterfinal') return 8000;
                if (lower === 'eliminator') return 2001.5;
                const numMatch = lower.match(/\d+/);
                const num = numMatch ? parseInt(numMatch[0], 10) : 0;
                if (lower.includes('qualifier')) return 1000 + num;
                if (lower.includes('round')) return 2000 + num;
                return 5000;
            };

            let fullRanked;
            const seedDivNorm = (parentSeedingDivision || formData.division || '').trim().toLowerCase();
            const divisionParentHeats = parentEventHeats.filter(h =>
                (h.division || '').trim().toLowerCase() === seedDivNorm
            );
            
            if (currentEvent?.is_series && currentEvent?.series_parent_id && divisionParentHeats.length > 0) {
                const parentRanks = {};
                let surferIndex = 0;
                divisionParentHeats.forEach(h => {
                    const rw = getRoundWeight(h.round || '');
                    (h.surfers || []).forEach(s => {
                        if (!s || !s.name) return;
                        const key = s.name.trim().toLowerCase();
                        const existing = parentRanks[key];
                        if (!existing || rw > existing.roundWeight) {
                            parentRanks[key] = { 
                                name: s.name, 
                                heatRank: s.rank || 4, 
                                totalScore: s.total_score || 0, 
                                roundWeight: rw,
                                waveScores: [...(s.wave_scores || [])].sort((x, y) => y - x),
                                originalOrder: surferIndex++
                            };
                        }
                    });
                });
                
                const parentSortedKeys = Object.keys(parentRanks).sort((aKey, bKey) => {
                    const aD = parentRanks[aKey]; const bD = parentRanks[bKey];
                    if (bD.roundWeight !== aD.roundWeight) return bD.roundWeight - aD.roundWeight;
                    if (aD.heatRank !== bD.heatRank) return aD.heatRank - bD.heatRank;
                    if (bD.totalScore !== aD.totalScore) return bD.totalScore - aD.totalScore;
                    const aWaves = aD.waveScores || [];
                    const bWaves = bD.waveScores || [];
                    const maxLen = Math.max(aWaves.length, bWaves.length);
                    for (let i = 0; i < maxLen; i++) {
                        const sA = aWaves[i] || 0;
                        const sB = bWaves[i] || 0;
                        if (sB !== sA) return sB - sA;
                    }
                    if (aD.originalOrder !== undefined && bD.originalOrder !== undefined) {
                        return aD.originalOrder - bD.originalOrder;
                    }
                    return 0;
                });

                const getPointsForRank = (rank) => {
                    const pointsTable = {
                        1: 1000, 2: 860, 3: 730, 4: 670, 5: 610, 6: 583, 7: 555, 8: 528,
                        9: 500, 10: 488, 11: 475, 12: 462, 13: 450, 14: 438, 15: 425, 16: 413,
                        17: 400, 18: 395, 19: 390, 20: 385, 21: 380, 22: 375, 23: 370, 24: 365,
                        25: 360, 26: 355, 27: 350, 28: 345, 29: 340, 30: 335, 31: 330, 32: 325,
                        33: 320, 34: 315, 35: 310, 36: 305, 37: 300, 38: 295, 39: 290, 40: 285,
                        41: 280, 42: 275, 43: 270, 44: 265, 45: 260, 46: 255, 47: 250, 48: 245,
                        49: 240, 50: 235, 51: 230, 52: 225, 53: 220, 54: 215, 55: 210, 56: 205,
                        57: 200, 58: 195, 59: 190, 60: 185, 61: 180, 62: 175, 63: 170, 64: 165,
                        65: 160, 66: 155, 67: 150, 68: 145, 69: 140, 70: 135, 71: 130, 72: 125,
                        73: 120
                    };
                    return pointsTable[rank] || 0;
                };

                const parentPointsMap = {};
                parentSortedKeys.forEach((key, index) => {
                    parentPointsMap[key] = getPointsForRank(index + 1);
                });

                fullRanked = [...availablePool].sort((a, b) => {
                    const aKey = a.name.trim().toLowerCase(); const bKey = b.name.trim().toLowerCase();
                    const aPts = Math.max(parentPointsMap[aKey] || 0, a.manual_seed_points || 0);
                    const bPts = Math.max(parentPointsMap[bKey] || 0, b.manual_seed_points || 0);

                    if (bPts !== aPts) return bPts - aPts; // Highest points first
                    
                    const aIndex = parentSortedKeys.indexOf(aKey);
                    const bIndex = parentSortedKeys.indexOf(bKey);
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;

                    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                });
            } else {
                fullRanked = [...availablePool].sort((a, b) => {
                    const aPts = a.manual_seed_points || 0;
                    const bPts = b.manual_seed_points || 0;
                    if (bPts !== aPts) return bPts - aPts;
                    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                });
            }

            const availableIds = new Set(availablePool.map(s => s.id));
            const usedInSelected = new Set();
            const H = estimatedHeats;
            const totalCompetitors = fullRanked.length;
            const baseCount = Math.floor(totalCompetitors / H);
            const extraHeatsCount = totalCompetitors % H;

            for (let h = 1; h <= H; h++) {
                const allowedCount = h <= extraHeatsCount ? baseCount + 1 : baseCount;
                const desiredPositions = getRanksForHeat(h, H, totalCompetitors);
                
                const selectedIds = [];
                // First pass
                desiredPositions.forEach(rank => {
                    const idx = rank - 1;
                    if (idx >= 0 && idx < fullRanked.length && availableIds.has(fullRanked[idx].id) && !usedInSelected.has(fullRanked[idx].id)) {
                        selectedIds.push(fullRanked[idx].id);
                        usedInSelected.add(fullRanked[idx].id);
                    }
                });
                // Second pass
                if (selectedIds.length < allowedCount) {
                    for (let i = 0; i < fullRanked.length && selectedIds.length < allowedCount; i++) {
                        const s = fullRanked[i];
                        if (availableIds.has(s.id) && !usedInSelected.has(s.id)) {
                            selectedIds.push(s.id);
                            usedInSelected.add(s.id);
                        }
                    }
                }

                const newColors = {};
                if (isSup) {
                    const usedNumbers = new Set();
                    const availableNumbers = [];
                    for (let n = 1; n <= 100; n++) {
                        const str = String(n);
                        if (!usedNumbers.has(str)) availableNumbers.push(str);
                    }
                    selectedIds.forEach((id, idx) => {
                        if (idx < availableNumbers.length) {
                            newColors[id] = availableNumbers[idx];
                            usedNumbers.add(availableNumbers[idx]);
                        }
                    });
                } else {
                    selectedIds.forEach((id, idx) => {
                        if (idx < JERSEY_COLORS.length) newColors[id] = JERSEY_COLORS[idx].hex;
                    });
                }

                const dataToSubmit = {
                    ...formData,
                    event_id: currentEvent.id,
                    heat_number: h,
                    surfer_count: allowedCount,
                    status: 'Scheduled',
                    surfer_ids: selectedIds,
                    surfer_colors: newColors,
                };

                await axios.post(`${API_BASE}/heats`, dataToSubmit);
            }

            showToast(`Successfully generated ${H} heats for Round 1!`, 'success');
            setIsModalOpen(false);
            fetchInitialData(true);

        } catch (err) {
            console.error('Error auto-generating heats:', err);
            const message = err?.response?.data?.error || 'Failed to auto-generate heats.';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReschedule = async (heatId, newStartTime, newEndTime, skipRefresh = false, customMessage = null) => {
        try {
            const existingHeat = heats.find(h => h.id === heatId);
            if (!existingHeat) return;

            const isBreak = existingHeat.division === 'Break' || (existingHeat.round || '').toLowerCase().includes('break');

            if (newStartTime && !isBreak) {
                const currentWeight = getRoundWeightFE(existingHeat.round);
                const siblingHeats = heats.filter(h => 
                    h.event_id === existingHeat.event_id && 
                    h.division === existingHeat.division && 
                    h.id !== existingHeat.id &&
                    h.division !== 'Break' &&
                    !(h.round || '').toLowerCase().includes('break')
                );

                const previousRoundHeats = siblingHeats.filter(h => getRoundWeightFE(h.round) < currentWeight);
                
                if (previousRoundHeats.length > 0) {
                    const unscheduledPrevious = previousRoundHeats.filter(h => !h.start_time && h.status !== 'completed' && h.status !== 'finished');
                    if (unscheduledPrevious.length > 0) {
                        showToast(`Cannot schedule ${existingHeat.round}. Please schedule all previous rounds first.`, 'error');
                        return;
                    }

                    let maxPrevEndTime = null;
                    previousRoundHeats.forEach(h => {
                        if (h.end_time) {
                            const prevEnd = new Date(h.end_time).getTime();
                            if (!maxPrevEndTime || prevEnd > maxPrevEndTime) {
                                maxPrevEndTime = prevEnd;
                            }
                        }
                    });

                    if (maxPrevEndTime) {
                        const newStart = new Date(newStartTime).getTime();
                        if (newStart < maxPrevEndTime) {
                            showToast(`Cannot schedule ${existingHeat.round} before previous rounds.`, 'error');
                            return;
                        }
                    }
                }
            }

            const dataToSubmit = {
                ...existingHeat,
                start_time: newStartTime,
                end_time: newEndTime,
            };

            await axios.put(`${API_BASE}/heats/${heatId}`, dataToSubmit);
            if (!skipRefresh) {
                showToast(customMessage || 'Heat schedule updated successfully!', 'success');
                fetchInitialData(true);
            }
        } catch (err) {
            console.error('Error rescheduling heat:', err);
            const message = err?.response?.data?.error || 'Failed to reschedule heat.';
            showToast(message, 'error');
        }
    };

    const toggleSurfer = (id) => {
        const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
        const isSup = currentEvent?.event_type === 'SUP Event';

        if (selectedSurferIds.includes(id)) {
            // Remove surfer and their color
            setSelectedSurferIds(selectedSurferIds.filter(sid => sid !== id));
            setSurferColors(prev => {
                const newColors = { ...prev };
                delete newColors[id];
                return newColors;
            });
        } else {
            if (selectedSurferIds.length >= formData.surfer_count) {
                showToast(`Maximum ${formData.surfer_count} surfers allowed for this heat.`, 'error');
                return;
            }
            // Add surfer
            setSelectedSurferIds([...selectedSurferIds, id]);

            if (isSup) {
                // Randomly assign a unique number between 1 and 100
                const usedNumbers = Object.values(surferColors);
                let randNum = Math.floor(Math.random() * 100) + 1;
                while (usedNumbers.includes(String(randNum))) {
                    randNum = Math.floor(Math.random() * 100) + 1;
                }
                setSurferColors(prev => ({ ...prev, [id]: String(randNum) }));
            } else {
                // Assign next available jersey color from JERSEY_COLORS in order
                setSurferColors(prev => {
                    const usedHexes = Object.values(prev);
                    const nextColor = JERSEY_COLORS.find(c => !usedHexes.includes(c.hex));
                    if (nextColor) {
                        return { ...prev, [id]: nextColor.hex };
                    }
                    return prev;
                });
            }
        }
    };

    const filterAndDeduplicateSurfers = (surfersList) => {
        if (!surfersList || surfersList.length === 0) return [];

        const deletedEmails = new Set(
            (JSON.parse(localStorage.getItem('deleted_student_emails') || '[]')).map(e => String(e).toLowerCase().trim())
        );
        const deletedNames = new Set(
            (JSON.parse(localStorage.getItem('deleted_surfer_names') || '[]')).map(n => String(n).toLowerCase().trim())
        );
        const deletedIds = new Set(
            (JSON.parse(localStorage.getItem('deleted_surfer_ids') || '[]')).map(i => String(i))
        );

        // Allowed names and emails from SuperAdmin registered students (allSurfers)
        const allowedNames = new Set(allSurfers.map(s => (s.name || '').toLowerCase().trim()).filter(Boolean));
        const allowedEmails = new Set(allSurfers.map(s => (s.email || '').toLowerCase().trim()).filter(Boolean));

        const uniqueSurfers = [];
        const seenKeys = new Set();

        surfersList.forEach(s => {
            if (!s || s.is_active === 0) return;
            const nameLower = (s.name || '').toLowerCase().trim();
            const emailLower = (s.email || '').toLowerCase().trim();
            if (!nameLower) return;

            if (deletedNames.has(nameLower) || deletedIds.has(String(s.id))) return;
            if (emailLower && deletedEmails.has(emailLower)) return;

            if (allowedNames.size > 0 || allowedEmails.size > 0) {
                const isRegistered = (emailLower && allowedEmails.has(emailLower)) || allowedNames.has(nameLower);
                if (!isRegistered) return;
            }

            const key = `${nameLower}_${emailLower || (s.school_name || '').toLowerCase().trim()}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueSurfers.push(s);
            }
        });

        return uniqueSurfers;
    };

    const getAvailableSurfers = () => {
        // If no event selected yet, no surfers are available
        if (!formData.event_id) return [];

        const selectedEvent = events.find(e => String(e.id) === String(formData.event_id));

        // If it is a virtual session event - load and filter booked students locally
        if (selectedEvent && selectedEvent.isSessionEvent) {
            let surfers = filterAndDeduplicateSurfers(allSurfers);
            const sIds = selectedEvent.student_ids || [];
            const sNames = (selectedEvent.student_names || []).map(n => n.toLowerCase().trim());
            surfers = surfers.filter(s => {
                const idMatch = sIds.includes(s.id) || sIds.includes(Number(s.id)) || sIds.includes(String(s.id));
                const nameMatch = s.name && sNames.includes(s.name.toLowerCase().trim());
                return idMatch || nameMatch;
            });
            
            // Still apply division rules (gender & age) as additional filter if division is selected
            if (formData.division) {
                const div = formData.division.toLowerCase();
                if (div.includes('women') || div.includes('female') || div.includes('girl')) {
                    surfers = surfers.filter(s => s.gender === 'Female');
                } else if (div.includes('men') || div.includes('male') || div.includes('boy')) {
                    surfers = surfers.filter(s => s.gender === 'Male');
                }
            }

            return surfers.map(s => ({ ...s, is_sub: false }));
        }

        console.log('📊 getAvailableSurfers called');
        console.log('  - tournamentProgressionData:', tournamentProgressionData);
        console.log('  - eventImportedSurferIds:', eventImportedSurferIds);

        // If we have tournament progression data from the backend, use it
        if (tournamentProgressionData && tournamentProgressionData.surfers) {
            console.log('  ✅ Using tournament progression data');
            console.log('  - Surfers from backend:', tournamentProgressionData.surfers.length);
            let surfers = filterAndDeduplicateSurfers(tournamentProgressionData.surfers);

            // Still apply division rules (gender & age) as additional filter
            if (formData.division) {
                const div = formData.division.toLowerCase();

                // Gender Filter
                if (div.includes('women') || div.includes('female') || div.includes('girl')) {
                    surfers = surfers.filter(s => s.gender === 'Female');
                } else if (div.includes('men') || div.includes('male') || div.includes('boy')) {
                    surfers = surfers.filter(s => s.gender === 'Male');
                }

                // Age Filter
                const underMatch = div.match(/(?:u|under)\s*(\d{1,2})/i);
                const aboveMatch = div.match(/(?:a|above)\s*(\d{1,2})/i);

                if (underMatch && underMatch[1]) {
                    const maxAge = parseInt(underMatch[1]);
                    surfers = surfers.filter(s => s.age && parseInt(s.age) <= maxAge);
                } else if (aboveMatch && aboveMatch[1]) {
                    const minAge = parseInt(aboveMatch[1]);
                    surfers = surfers.filter(s => s.age && parseInt(s.age) > minAge);
                }
            }

            // Filter by occupied status (same round/heat)
            if (formData.event_id && formData.division && formData.round) {
                const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
                const isSup = currentEvent?.event_type === 'SUP Event';

                const occupiedSurferIds = heats
                    .filter(h =>
                        String(h.event_id) === String(formData.event_id) &&
                        h.division === formData.division &&
                        h.round === formData.round &&
                        (!isSup || !formData.sup_category || h.sup_category === formData.sup_category) &&
                        (!isEditing || h.id !== editHeatId)
                    )
                    .flatMap(h => h.surfers ? h.surfers.map(s => s.id) : (h.surfer_ids || []));

                surfers = surfers.filter(s => !occupiedSurferIds.includes(s.id));
            }

            // Mark subs
            if (tournamentProgressionData) {
                const prevSet = new Set(tournamentProgressionData.previous_surfer_ids || []);
                const lateSet = new Set(tournamentProgressionData.late_import_surfer_ids || []);

                if (tournamentProgressionData.previous_round || (tournamentProgressionData.previous_surfer_ids && tournamentProgressionData.previous_surfer_ids.length > 0)) {
                    // If it's Round 2+, you must have participated in the previous round
                    surfers = surfers.map(s => ({ ...s, is_sub: !prevSet.has(s.id) }));
                } else if (lateSet.size > 0) {
                    // If it's Round 1, you are a sub if you were imported AFTER Round 1 started
                    surfers = surfers.map(s => ({ ...s, is_sub: lateSet.has(s.id) }));
                } else {
                    surfers = surfers.map(s => ({ ...s, is_sub: false }));
                }
            } else {
                surfers = surfers.map(s => ({ ...s, is_sub: false }));
            }

            // ⭐ RESTRICT TO QUALIFIED SURFERS ONLY (for Round 2+)
            if (tournamentProgressionData && tournamentProgressionData.previous_round && tournamentProgressionData.current_qualifier_ids) {
                const qualSet = new Set(tournamentProgressionData.current_qualifier_ids);
                surfers = surfers.filter(s => qualSet.has(s.id));
            }

            // ⭐ Filter by SUP category (only for SUP events with a specific category chosen)
            if (formData.sup_category) {
                surfers = surfers.filter(s => parseSUPCategories(s.sup_categories).includes(formData.sup_category));
            }

            console.log('  - Final filtered surfers:', surfers.length);
            return surfers;
        }

        // Fallback: use allSurfers
        let surfers = filterAndDeduplicateSurfers(allSurfers);

        // Filter by Division Rules (Gender & Age)
        if (formData.division) {
            const div = formData.division.toLowerCase();

            // Gender Filter
            if (div.includes('women') || div.includes('female') || div.includes('girl')) {
                surfers = surfers.filter(s => s.gender === 'Female');
            } else if (div.includes('men') || div.includes('male') || div.includes('boy')) {
                surfers = surfers.filter(s => s.gender === 'Male');
            }

            // Age Filter
            const underMatch = div.match(/(?:u|under)\s*(\d{1,2})/i);
            const aboveMatch = div.match(/(?:a|above)\s*(\d{1,2})/i);

            if (underMatch && underMatch[1]) {
                const maxAge = parseInt(underMatch[1]);
                surfers = surfers.filter(s => s.age && parseInt(s.age) <= maxAge);
            } else if (aboveMatch && aboveMatch[1]) {
                const minAge = parseInt(aboveMatch[1]);
                surfers = surfers.filter(s => s.age && parseInt(s.age) > minAge);
            }
        }

        // Filter by Occupied Status (same round/heat)
        if (formData.event_id && formData.division && formData.round) {
            const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
            const isSup = currentEvent?.event_type === 'SUP Event';

            const occupiedSurferIds = heats
                .filter(h =>
                    String(h.event_id) === String(formData.event_id) &&
                    h.division === formData.division &&
                    h.round === formData.round &&
                    (!isSup || !formData.sup_category || h.sup_category === formData.sup_category) &&
                    (!isEditing || h.id !== editHeatId)
                )
                .flatMap(h => h.surfers ? h.surfers.map(s => s.id) : (h.surfer_ids || []));

            surfers = surfers.filter(s => !occupiedSurferIds.includes(s.id));
        }

        // Mark subs
        if (tournamentProgressionData) {
            const prevSet = new Set(tournamentProgressionData.previous_surfer_ids || []);
            const lateSet = new Set(tournamentProgressionData.late_import_surfer_ids || []);

            if (tournamentProgressionData.previous_round || (tournamentProgressionData.previous_surfer_ids && tournamentProgressionData.previous_surfer_ids.length > 0)) {
                surfers = surfers.map(s => ({ ...s, is_sub: !prevSet.has(s.id) }));
            } else if (lateSet.size > 0) {
                surfers = surfers.map(s => ({ ...s, is_sub: lateSet.has(s.id) }));
            } else {
                surfers = surfers.map(s => ({ ...s, is_sub: false }));
            }
        } else {
            surfers = surfers.map(s => ({ ...s, is_sub: false }));
        }

        // ⭐ Filter by SUP category (only for SUP events with a specific category chosen)
        if (formData.sup_category) {
            surfers = surfers.filter(s => parseSUPCategories(s.sup_categories).includes(formData.sup_category));
        }

        return surfers;
    };

    const getTotalQualifiedSurfersCount = () => {
        if (tournamentProgressionData) {
            // Use real-time qualifiers from backend if available
            if (tournamentProgressionData.current_qualifier_ids && tournamentProgressionData.previous_round) {
                return tournamentProgressionData.current_qualifier_ids.length;
            }
            // Fallback to expected count
            if (tournamentProgressionData.expected_advancing_count !== undefined && tournamentProgressionData.previous_round) {
                return tournamentProgressionData.expected_advancing_count;
            }
        }

        let baseSurfers = filterAndDeduplicateSurfers(tournamentProgressionData?.surfers ?? allSurfers);
        if (eventImportedSurferIds !== null) {
            if (eventImportedSurferIds.size === 0) return 0;
            baseSurfers = baseSurfers.filter(s => eventImportedSurferIds.has(s.id));
        }

        const div = formData.division?.toLowerCase() || '';
        if (div.includes('women') || div.includes('female') || div.includes('girl')) {
            baseSurfers = baseSurfers.filter(s => s.gender === 'Female');
        } else if (div.includes('men') || div.includes('male') || div.includes('boy')) {
            baseSurfers = baseSurfers.filter(s => s.gender === 'Male');
        }
        const underMatch = div.match(/(?:u|under)\s*(\d{1,2})/i);
        const aboveMatch = div.match(/(?:a|above)\s*(\d{1,2})/i);
        if (underMatch?.[1]) {
            baseSurfers = baseSurfers.filter(s => s.age && parseInt(s.age) <= parseInt(underMatch[1]));
        } else if (aboveMatch?.[1]) {
            baseSurfers = baseSurfers.filter(s => s.age && parseInt(s.age) > parseInt(aboveMatch[1]));
        }

        if (tournamentProgressionData) {
            if (tournamentProgressionData.previous_surfer_ids?.length > 0) {
                const prevSet = new Set(tournamentProgressionData.previous_surfer_ids);
                baseSurfers = baseSurfers.filter(s => prevSet.has(s.id));
            } else if (tournamentProgressionData.late_import_surfer_ids?.length > 0) {
                const lateSet = new Set(tournamentProgressionData.late_import_surfer_ids);
                baseSurfers = baseSurfers.filter(s => !lateSet.has(s.id));
            }
        }

        return baseSurfers.length;
    };

    const getCurrentRoundSupHeatAssignments = (excludeHeatId = null) => {
        const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
        const isSup = currentEvent?.event_type === 'SUP Event';
        if (!isSup || !formData.event_id || !formData.division || !formData.round) return [];

        return heats.filter(h =>
            String(h.event_id) === String(formData.event_id) &&
            h.division === formData.division &&
            h.round === formData.round &&
            (!formData.sup_category || h.sup_category === formData.sup_category) &&
            (!excludeHeatId || h.id !== excludeHeatId)
        );
    };

    const findSupNumberConflict = (number, excludeHeatId = null) => {
        const roundHeats = getCurrentRoundSupHeatAssignments(excludeHeatId);
        const normalized = String(number);
        for (const heat of roundHeats) {
            const surfer = (heat.surfers || []).find(s => String(s.color) === normalized);
            if (surfer) {
                return {
                    name: surfer.name || 'Unknown',
                    heat_number: heat.heat_number,
                    number: normalized
                };
            }
        }
        return null;
    };

    const getUsedSupNumbersInRound = (excludeHeatId = null) => {
        const roundHeats = getCurrentRoundSupHeatAssignments(excludeHeatId);
        return new Set(roundHeats.flatMap(h => (h.surfers || []).map(s => String(s.color)).filter(Boolean)));
    };

    const selectRandomSurfers = () => {
        const count = formData.surfer_count;
        if (count <= 0) return;

        const available = getAvailableSurfers().filter(s => !s.is_sub);
        // Shuffle array
        const shuffled = [...available].sort(() => 0.5 - Math.random());

        // Take first N items
        const selected = shuffled.slice(0, count).map(s => s.id);

        setSelectedSurferIds(selected);

        const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
        const isSup = currentEvent?.event_type === 'SUP Event';

        // Assign jerseys/numbers orderly/randomly
        const newColors = {};
        if (isSup) {
            const usedNumbers = getUsedSupNumbersInRound(editHeatId);
            const availableNumbers = [];
            for (let n = 1; n <= 100; n++) {
                const str = String(n);
                if (!usedNumbers.has(str)) {
                    availableNumbers.push(str);
                }
            }

            if (availableNumbers.length < selected.length) {
                showToast('Not enough unused SUP numbers available for this round. Please assign numbers manually.', 'error');
                return;
            }

            const shuffledNumbers = [...availableNumbers].sort(() => 0.5 - Math.random()).slice(0, selected.length);
            selected.forEach((id, index) => {
                newColors[id] = shuffledNumbers[index];
            });
        } else {
            selected.forEach((id, index) => {
                if (index < JERSEY_COLORS.length) {
                    newColors[id] = JERSEY_COLORS[index].hex;
                }
            });
        }
        setSurferColors(newColors);
    };

    const getRanksForHeat = (heatNum, numHeats, totalCompetitors) => {
        // Calculate capacity for each heat
        const capacities = [];
        const baseCount = Math.floor(totalCompetitors / numHeats);
        const extraHeatsCount = totalCompetitors % numHeats;
        for (let i = 1; i <= numHeats; i++) {
            capacities[i] = i <= extraHeatsCount ? baseCount + 1 : baseCount;
        }

        // Initialize assignments
        let currentRank = numHeats + 1;
        const assignments = {};
        for (let i = 1; i <= numHeats; i++) {
            assignments[i] = [];
            if (i <= totalCompetitors) {
                assignments[i].push(i);
            }
        }

        // Fill remaining slots from the last heat (numHeats) down to 1
        for (let h = numHeats; h >= 1; h--) {
            const remainingCount = capacities[h] - assignments[h].length;
            for (let r = 0; r < remainingCount; r++) {
                if (currentRank <= totalCompetitors) {
                    assignments[h].push(currentRank);
                    currentRank++;
                }
            }
        }

        return assignments[heatNum] || [];
    };

    const getRankedAvailableSurfers = () => {
        const available = getAvailableSurfers().filter(s => !s.is_sub);
        if (available.length === 0) return [];

        const getRoundWeight = (r) => {
            if (!r) return 0;
            const lower = r.toString().toLowerCase().trim();
            if (lower === 'final') return 10000;
            if (lower === 'semi final' || lower === 'semifinal') return 9000;
            if (lower === 'quarter final' || lower === 'quarterfinal') return 8000;
            if (lower === 'eliminator') return 2001.5;
            const numMatch = lower.match(/\d+/);
            const num = numMatch ? parseInt(numMatch[0], 10) : 0;
            if (lower.includes('qualifier')) return 1000 + num;
            if (lower.includes('round')) return 2000 + num;
            return 5000;
        };

        const currentEventHeats = heats.filter(h =>
            String(h.event_id) === String(formData.event_id) &&
            h.division === formData.division
        );

        const requestedRoundWeight = getRoundWeight(formData.round);
        const previousHeats = currentEventHeats.filter(h => getRoundWeight(h.round) < requestedRoundWeight);

        if (previousHeats.length > 0) {
            // Current event has previous round heats → use them for ranking
            const surferMap = {};
            previousHeats.forEach(h => {
                const roundName = h.round || '';
                const roundWeight = getRoundWeight(roundName);
                if (Array.isArray(h.surfers)) {
                    h.surfers.forEach(s => {
                        if (!s || !s.id) return;
                        const existing = surferMap[s.id];
                        if (!existing || roundWeight > existing.roundWeight) {
                            surferMap[s.id] = {
                                id: s.id,
                                name: s.name,
                                heatRank: s.rank || 4,
                                totalScore: s.total_score || 0,
                                roundWeight: roundWeight
                            };
                        }
                    });
                }
            });

            return [...available].sort((a, b) => {
                const aRankData = surferMap[a.id];
                const bRankData = surferMap[b.id];
                if (!aRankData && !bRankData) return a.name.localeCompare(b.name);
                if (!aRankData) return 1;
                if (!bRankData) return -1;

                if (bRankData.roundWeight !== aRankData.roundWeight) {
                    return bRankData.roundWeight - aRankData.roundWeight;
                }
                if (aRankData.heatRank !== bRankData.heatRank) {
                    return aRankData.heatRank - bRankData.heatRank;
                }
                return bRankData.totalScore - aRankData.totalScore;
            });
        }

        // No previous heats in current event — check if this is a series event with parent heats
        const selectedEvent = events.find(e => String(e.id) === String(formData.event_id));
        const formDivNorm = (formData.division || '').trim().toLowerCase();
        // Use parentSeedingDivision (admin-selected) or fall back to current division name
        const seedDivNorm = (parentSeedingDivision || formData.division || '').trim().toLowerCase();
        const divisionParentHeats = parentEventHeats.filter(h =>
            (h.division || '').trim().toLowerCase() === seedDivNorm
        );
        if (selectedEvent?.is_series && selectedEvent?.series_parent_id && divisionParentHeats.length > 0) {
            // Build ranking from parent event's heats for this division
            // Match surfers by name (case-insensitive) since they may have different IDs across events
            const parentSurferRanks = {};
            divisionParentHeats.forEach(h => {
                const roundName = h.round || '';
                const roundWeight = getRoundWeight(roundName);
                if (Array.isArray(h.surfers)) {
                    h.surfers.forEach(s => {
                        if (!s || !s.name) return;
                        const key = s.name.trim().toLowerCase();
                        const existing = parentSurferRanks[key];
                        if (!existing || roundWeight > existing.roundWeight) {
                            parentSurferRanks[key] = {
                                name: s.name,
                                heatRank: s.rank || 4,
                                totalScore: s.total_score || 0,
                                roundWeight: roundWeight
                            };
                        }
                    });
                }
            });

            return [...available].sort((a, b) => {
                const aKey = a.name.trim().toLowerCase();
                const bKey = b.name.trim().toLowerCase();
                const aRankData = parentSurferRanks[aKey];
                const bRankData = parentSurferRanks[bKey];
                if (!aRankData && !bRankData) return a.name.localeCompare(b.name);
                if (!aRankData) return 1; // unknown athletes go to the end
                if (!bRankData) return -1;

                if (bRankData.roundWeight !== aRankData.roundWeight) {
                    return bRankData.roundWeight - aRankData.roundWeight;
                }
                if (aRankData.heatRank !== bRankData.heatRank) {
                    return aRankData.heatRank - bRankData.heatRank;
                }
                return bRankData.totalScore - aRankData.totalScore;
            });
        }

        return [...available].sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
    };

    // Helper: is seeding currently being sourced from a parent event?
    const getParentSeedingInfo = () => {
        const selectedEvent = events.find(e => String(e.id) === String(formData.event_id));
        if (!selectedEvent?.is_series || !selectedEvent?.series_parent_id) return null;
        const currentEventHasHeats = heats.some(h =>
            String(h.event_id) === String(formData.event_id) &&
            (h.division || '').trim().toLowerCase() === (formData.division || '').trim().toLowerCase()
        );
        if (currentEventHasHeats) return null; // using current event heats
        if (parentEventHeats.length === 0) return null;
        const parentEvent = events.find(e => String(e.id) === String(selectedEvent.series_parent_id));
        const parentDivisions = [...new Set(parentEventHeats.map(h => h.division).filter(Boolean))];
        const parentAliases = parentEvent && parentEvent.division_aliases ? JSON.parse(parentEvent.division_aliases) : {};
        return { eventName: parentEvent?.name || 'Previous Event', parentDivisions, parentAliases };
    };

    // Legacy helper used elsewhere
    const getParentSeedingEventName = () => {
        const info = getParentSeedingInfo();
        return info ? info.eventName : null;
    };

    const selectRankWiseSurfers = () => {
        const count = formData.surfer_count || 4;
        if (count <= 0) return;

        const isSup = events.find(e => String(e.id) === String(formData.event_id))?.event_type === 'SUP Event';
        const roundHeats = heats.filter(h =>
            String(h.event_id) === String(formData.event_id) &&
            h.division === formData.division &&
            h.round === formData.round &&
            (!isSup || !formData.sup_category || h.sup_category === formData.sup_category)
        );

        // Build the available pool (not yet assigned to any heat in this round)
        const availablePool = getAvailableSurfers().filter(s => !s.is_sub);
        const availableIds = new Set(availablePool.map(s => s.id));

        // Build the already-assigned pool (athletes in earlier heats of this same round)
        const seenIds = new Set(availablePool.map(s => s.id));
        const assignedPool = [];
        roundHeats.forEach(h => {
            (h.surfers || []).forEach(s => {
                if (s && s.id && !seenIds.has(s.id)) {
                    seenIds.add(s.id);
                    // Try to get full surfer data; fall back to heat surfer data
                    const full = allSurfers.find(a => a.id === s.id) || { id: s.id, name: s.name || '' };
                    assignedPool.push(full);
                }
            });
        });

        // Full pool = available + already assigned → used for global rank ordering
        const fullPool = [...availablePool, ...assignedPool];
        if (fullPool.length === 0) return;

        // ── Rank the FULL pool using same logic as getRankedAvailableSurfers ──
        const getRoundWeight = (r) => {
            if (!r) return 0;
            const lower = r.toString().toLowerCase().trim();
            if (lower === 'final') return 10000;
            if (lower === 'semi final' || lower === 'semifinal') return 9000;
            if (lower === 'quarter final' || lower === 'quarterfinal') return 8000;
            if (lower === 'eliminator') return 2001.5;
            const numMatch = lower.match(/\d+/);
            const num = numMatch ? parseInt(numMatch[0], 10) : 0;
            if (lower.includes('qualifier')) return 1000 + num;
            if (lower.includes('round')) return 2000 + num;
            return 5000;
        };

        let fullRanked;
        const currentEventHeats = heats.filter(h =>
            String(h.event_id) === String(formData.event_id) &&
            h.division === formData.division
        );
        const requestedRoundWeight = getRoundWeight(formData.round);
        const previousHeats = currentEventHeats.filter(h => getRoundWeight(h.round) < requestedRoundWeight);

        if (previousHeats.length > 0) {
            // Rank by performance in previous rounds of current event
            const surferMap = {};
            previousHeats.forEach(h => {
                const rw = getRoundWeight(h.round || '');
                (h.surfers || []).forEach(s => {
                    if (!s || !s.id) return;
                    const existing = surferMap[s.id];
                    if (!existing || rw > existing.roundWeight) {
                        surferMap[s.id] = { id: s.id, name: s.name, heatRank: s.rank || 4, totalScore: s.total_score || 0, roundWeight: rw };
                    }
                });
            });
            fullRanked = [...fullPool].sort((a, b) => {
                const aD = surferMap[a.id]; const bD = surferMap[b.id];
                if (!aD && !bD) {
                    const aPts = a.manual_seed_points || 0;
                    const bPts = b.manual_seed_points || 0;
                    if (bPts !== aPts) return bPts - aPts;
                    return a.name.localeCompare(b.name);
                }
                if (!aD) return 1; if (!bD) return -1;
                if (bD.roundWeight !== aD.roundWeight) return bD.roundWeight - aD.roundWeight;
                if (aD.heatRank !== bD.heatRank) return aD.heatRank - bD.heatRank;
                if (bD.totalScore !== aD.totalScore) return bD.totalScore - aD.totalScore;
                
                // Fallback to manual points
                const aPts = a.manual_seed_points || 0;
                const bPts = b.manual_seed_points || 0;
                if (bPts !== aPts) return bPts - aPts;
                
                return a.name.localeCompare(b.name);
            });
        } else {
            // Rank by parent event (series seeding)
            const selectedEvent = events.find(e => String(e.id) === String(formData.event_id));
            const seedDivNorm = (parentSeedingDivision || formData.division || '').trim().toLowerCase();
            const divisionParentHeats = parentEventHeats.filter(h =>
                (h.division || '').trim().toLowerCase() === seedDivNorm
            );
            if (selectedEvent?.is_series && selectedEvent?.series_parent_id && divisionParentHeats.length > 0) {
                const parentRanks = {};
                let surferIndex = 0;
                divisionParentHeats.forEach(h => {
                    const rw = getRoundWeight(h.round || '');
                    (h.surfers || []).forEach(s => {
                        if (!s || !s.name) return;
                        const key = s.name.trim().toLowerCase();
                        const existing = parentRanks[key];
                        if (!existing || rw > existing.roundWeight) {
                            parentRanks[key] = { 
                                name: s.name, 
                                heatRank: s.rank || 4, 
                                totalScore: s.total_score || 0, 
                                roundWeight: rw,
                                waveScores: [...(s.wave_scores || [])].sort((x, y) => y - x),
                                originalOrder: surferIndex++
                            };
                        }
                    });
                });
                
                const parentSortedKeys = Object.keys(parentRanks).sort((aKey, bKey) => {
                    const aD = parentRanks[aKey]; const bD = parentRanks[bKey];
                    if (bD.roundWeight !== aD.roundWeight) return bD.roundWeight - aD.roundWeight;
                    if (aD.heatRank !== bD.heatRank) return aD.heatRank - bD.heatRank;
                    if (bD.totalScore !== aD.totalScore) return bD.totalScore - aD.totalScore;
                    const aWaves = aD.waveScores || [];
                    const bWaves = bD.waveScores || [];
                    const maxLen = Math.max(aWaves.length, bWaves.length);
                    for (let i = 0; i < maxLen; i++) {
                        const sA = aWaves[i] || 0;
                        const sB = bWaves[i] || 0;
                        if (sB !== sA) return sB - sA;
                    }
                    if (aD.originalOrder !== undefined && bD.originalOrder !== undefined) {
                        return aD.originalOrder - bD.originalOrder;
                    }
                    return 0;
                });

                const getPointsForRank = (rank) => {
                    const pointsTable = {
                        1: 1000, 2: 860, 3: 730, 4: 670, 5: 610, 6: 583, 7: 555, 8: 528,
                        9: 500, 10: 488, 11: 475, 12: 462, 13: 450, 14: 438, 15: 425, 16: 413,
                        17: 400, 18: 395, 19: 390, 20: 385, 21: 380, 22: 375, 23: 370, 24: 365,
                        25: 360, 26: 355, 27: 350, 28: 345, 29: 340, 30: 335, 31: 330, 32: 325,
                        33: 320, 34: 315, 35: 310, 36: 305, 37: 300, 38: 295, 39: 290, 40: 285,
                        41: 280, 42: 275, 43: 270, 44: 265, 45: 260, 46: 255, 47: 250, 48: 245,
                        49: 240, 50: 235, 51: 230, 52: 225, 53: 220, 54: 215, 55: 210, 56: 205,
                        57: 200, 58: 195, 59: 190, 60: 185, 61: 180, 62: 175, 63: 170, 64: 165,
                        65: 160, 66: 155, 67: 150, 68: 145, 69: 140, 70: 135, 71: 130, 72: 125,
                        73: 120
                    };
                    return pointsTable[rank] || 0;
                };

                const parentPointsMap = {};
                parentSortedKeys.forEach((key, index) => {
                    parentPointsMap[key] = getPointsForRank(index + 1);
                });

                fullRanked = [...fullPool].sort((a, b) => {
                    const aKey = a.name.trim().toLowerCase(); const bKey = b.name.trim().toLowerCase();
                    const aPts = Math.max(parentPointsMap[aKey] || 0, a.manual_seed_points || 0);
                    const bPts = Math.max(parentPointsMap[bKey] || 0, b.manual_seed_points || 0);

                    if (bPts !== aPts) return bPts - aPts; // Highest points first
                    
                    // Fallback to parent ordering if points are exactly tied
                    const aIndex = parentSortedKeys.indexOf(aKey);
                    const bIndex = parentSortedKeys.indexOf(bKey);
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;

                    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                });
            } else {
                fullRanked = [...fullPool].sort((a, b) => {
                    const aPts = a.manual_seed_points || 0;
                    const bPts = b.manual_seed_points || 0;
                    if (bPts !== aPts) return bPts - aPts;
                    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                });
            }
        }

        // ── Bracket / Snake seeding: Heat h → Rank h, and remaining slots from the bottom ──
        console.log('🔮 selectRankWiseSurfers triggered');
        const currentHeatNum = parseInt(formData.heat_number || 1, 10);
        const heatNumbers = roundHeats
            .map(h => parseInt(h.heat_number, 10))
            .filter(num => !isNaN(num));
        const estimatedHeats = Math.ceil(fullRanked.length / (formData.surfer_count || 4));
        const H = Math.max(
            ...heatNumbers,
            roundHeats.length,
            currentHeatNum,
            estimatedHeats
        );
        console.log('  - H (total heats):', H);
        console.log('  - currentHeatNum:', currentHeatNum);
        console.log('  - estimatedHeats:', estimatedHeats);
        console.log('  - fullRanked length:', fullRanked.length);

        // Calculate balanced capacity for the current heat
        const totalCompetitors = fullRanked.length;
        const baseCount = Math.floor(totalCompetitors / H);
        const extraHeatsCount = totalCompetitors % H;
        const allowedCount = currentHeatNum <= extraHeatsCount ? baseCount + 1 : baseCount;

        // Update the form's surfer count to match the balanced count
        setFormData(prev => ({ ...prev, surfer_count: allowedCount }));

        const desiredPositions = getRanksForHeat(currentHeatNum, H, totalCompetitors);
        console.log('  - desiredPositions (ranks wanted):', desiredPositions);

        const selectedIds = [];
        const usedInSelected = new Set();

        // First pass: pick from preferred rank positions
        desiredPositions.forEach(rank => {
            const idx = rank - 1;
            if (idx >= 0 && idx < fullRanked.length && availableIds.has(fullRanked[idx].id) && !usedInSelected.has(fullRanked[idx].id)) {
                selectedIds.push(fullRanked[idx].id);
                usedInSelected.add(fullRanked[idx].id);
            }
        });
        console.log('  - after first pass (desired ranks), selectedIds:', selectedIds);

        // Second pass: if any desired slot was already taken by another heat or is unavailable,
        // fill with the next highest-ranked available athletes (top-down)
        if (selectedIds.length < allowedCount) {
            for (let i = 0; i < fullRanked.length && selectedIds.length < allowedCount; i++) {
                const s = fullRanked[i];
                if (availableIds.has(s.id) && !usedInSelected.has(s.id)) {
                    selectedIds.push(s.id);
                    usedInSelected.add(s.id);
                }
            }
        }
        console.log('  - final selectedIds:', selectedIds);

        setSelectedSurferIds(selectedIds);

        const currentEvent = events.find(e => String(e.id) === String(formData.event_id));
        const isSupEvent = currentEvent?.event_type === 'SUP Event';

        const newColors = {};
        if (isSupEvent) {
            const usedNumbers = getUsedSupNumbersInRound(editHeatId);
            const availableNumbers = [];
            for (let n = 1; n <= 100; n++) {
                const str = String(n);
                if (!usedNumbers.has(str)) availableNumbers.push(str);
            }
            selectedIds.forEach((id, idx) => {
                if (idx < availableNumbers.length) newColors[id] = availableNumbers[idx];
            });
        } else {
            selectedIds.forEach((id, idx) => {
                if (idx < JERSEY_COLORS.length) newColors[id] = JERSEY_COLORS[idx].hex;
            });
        }
        setSurferColors(newColors);
    };

    const handleUpdateStatus = async (id, newStatus) => {
        const performUpdate = async () => {
            // Optimistic update for instant UI feedback
            setHeats(prev => prev.map(h => h.id === id ? { ...h, status: newStatus } : h));
            if (viewHeat && viewHeat.id === id) {
                if (newStatus === 'in-progress') {
                    setViewHeat(null);
                } else {
                    setViewHeat(prev => prev ? { ...prev, status: newStatus } : null);
                }
            }
            try {
                await axios.patch(`${API_BASE}/heats/${id}/status`, {
                    status: newStatus,
                    mode: newStatus === 'in-progress' ? 'manual' : undefined
                });
                fetchInitialData(true); // Sync silently
            } catch (err) {
                console.error('Error updating status:', err);
                fetchInitialData(true); // Revert optimistic update
                const errorMsg = err.response?.data?.error || 'Failed to update heat status.';
                setCustomAlert({ message: errorMsg });
            }
        };

        if (newStatus === 'in-progress') {
            // Safety check: Prevent multiple heats from being in-progress simultaneously
            const activeHeat = heats.find(h => h.status === 'in-progress' && h.id !== id);
            if (activeHeat) {
                setCustomAlert({ message: `Another heat (${activeHeat.round} Heat #${activeHeat.heat_number}) is already in progress. Please finish it before starting a new one.` });
                return;
            }

            const heat = heats.find(h => h.id === id);
            if (heat) {
                const event = events.find(e => e.id === heat.event_id);
                const isSup = heat.event_type === 'SUP Event' || event?.event_type === 'SUP Event';

                // Filter for scoring judges only
                const scoringJudgesCount = heat.judges
                    ? heat.judges.filter(j => j.role === 'scoring').length
                    : 0;

                if (isSup) {
                    if (scoringJudgesCount < 1) {
                        setCustomAlert({ message: "No judges assigned , kindly assign Judge/Timekeeper for this SUP heat" });
                        return;
                    }
                    setCustomConfirm({
                        message: 'Are you sure you want to start this heat?',
                        onConfirm: () => {
                            setCustomConfirm(null);
                            performUpdate();
                        }
                    });
                    return;
                } else {
                    const expectedJudgeCount = heat.judge_count || 3;

                    if (scoringJudgesCount !== expectedJudgeCount) {
                        setCustomConfirm({
                            message: `This heat requires ${expectedJudgeCount} scoring judges, but only ${scoringJudgesCount} are assigned.\n\nTo change it, go to Settings > Scoring Configuration.\n\nDo you want to proceed anyway?`,
                            onConfirm: () => {
                                setCustomConfirm(null);
                                performUpdate();
                            }
                        });
                        return;
                    } else {
                        setCustomConfirm({
                            message: 'Are you sure you want to start this heat?',
                            onConfirm: () => {
                                setCustomConfirm(null);
                                performUpdate();
                            }
                        });
                        return;
                    }
                }
            }
        }

        // If not 'in-progress', update immediately (finish heat confirmation is handled at the button level)
        performUpdate();
    };

    // ── Auto-generate remaining rounds ──────────────────────────────────────
    const handleOpenAutoGenModal = async () => {
        if (selectedEventFilter === 'all' || selectedDivisionFilter === 'all') {
            showToast('Please select an Event and Division first.', 'error');
            return;
        }

        // Use the currently selected round as the base round for generation
        const baseRound = formData.round;
        if (!baseRound) {
            showToast('Please select a round first.', 'error');
            return;
        }

        // Filter heats by event + division + sup_category so each SUP category
        // has its own completely independent round progression.
        const activeCat = selectedSupCategoryFilter !== 'all' ? selectedSupCategoryFilter : null;
        const divHeats = heats.filter(h =>
            String(h.event_id) === String(selectedEventFilter) &&
            h.division === selectedDivisionFilter &&
            (activeCat ? (h.sup_category || null) === activeCat : !h.sup_category)
        );
        if (divHeats.length === 0) {
            showToast('No heats found for this event, division and SUP category. Create heats first.', 'error');
            return;
        }

        // Build sorted rounds list for deduplication
        const roundGroups = {};
        divHeats.forEach(h => {
            if (!roundGroups[h.round]) roundGroups[h.round] = h.created_at;
            else if (h.created_at < roundGroups[h.round]) roundGroups[h.round] = h.created_at;
        });
        const sortedRounds = Object.entries(roundGroups).sort((a, b) => a[1].localeCompare(b[1]));

        // Call backend for a DRY-RUN style preview (we'll compute it client-side)
        // Compute preview locally based on round 1 qualified counts
        const baseRoundHeats = divHeats.filter(h => h.round === baseRound);
        const totalQualified = baseRoundHeats.reduce((sum, h) => sum + (h.qualified_count || 0), 0);

        if (totalQualified < 3) {
            showToast(`Only ${totalQualified} surfers qualify from "${baseRound}". Need at least 3 to generate rounds.`, 'error');
            return;
        }

        // Build existing round names set (for deduplication inside buildPreview)
        const existingRounds = new Set(sortedRounds.map(r => r[0].toLowerCase().trim()));
        const eliminatorExists = existingRounds.has('eliminator');

        // Build preview of rounds (called dynamically when toggle changes)
        const buildPreview = (includeElim) => {
            const preview = [];
            let currentQualified = totalQualified;
            let prevRound = baseRound;

            // Eliminator card (optional): unqualified from base round
            const totalSurfersInBase = baseRoundHeats.reduce((sum, h) => sum + (h.surfer_count || 0), 0);
            const totalUnqualified = Math.max(0, totalSurfersInBase - totalQualified);

            if (includeElim && totalUnqualified >= 2 && !existingRounds.has('eliminator')) {
                // ≤5 unqualified → fit into 1 heat; ≥6 → split into multiple heats (max 4 per heat)
                const elimNumHeats = totalUnqualified <= 5 ? 1 : Math.ceil(totalUnqualified / 4);
                const elimQualPerHeat = Math.min(2, Math.floor(totalUnqualified / elimNumHeats));
                const elimDistMap = {};
                let remS = totalUnqualified; let remH = elimNumHeats;
                for (let j = 0; j < elimNumHeats; j++) {
                    const cnt = Math.ceil(remS / remH); elimDistMap[cnt] = (elimDistMap[cnt] || 0) + 1;
                    remS -= cnt; remH--;
                }
                const elimDist = Object.entries(elimDistMap)
                    .map(([c, h]) => ({ count: parseInt(c), heats: h }))
                    .sort((a, b) => b.count - a.count);
                preview.push({
                    round: 'Eliminator',
                    heats: elimNumHeats,
                    surfersPerHeat: Math.ceil(totalUnqualified / elimNumHeats),
                    qualifiedPerHeat: elimQualPerHeat,
                    distribution: elimDist,
                    isEliminator: true
                });

                // Add Eliminator qualifiers to the total qualified pool for the next round (Round 2)
                currentQualified += elimNumHeats * elimQualPerHeat;
            }

            for (let i = 0; i < 20; i++) {
                let roundName, numHeats, surfersPerHeat, qualifiedPerHeat;

                if (currentQualified <= 4 && currentQualified >= 3) {
                    roundName = 'Final'; numHeats = 1;
                    surfersPerHeat = currentQualified; qualifiedPerHeat = currentQualified;
                } else if (currentQualified <= 8 && currentQualified >= 5) {
                    roundName = 'Semi Final'; numHeats = 2;
                    surfersPerHeat = Math.ceil(currentQualified / 2); qualifiedPerHeat = 2;
                } else if (currentQualified === 4) {
                    roundName = 'Final'; numHeats = 1; surfersPerHeat = 4; qualifiedPerHeat = 4;
                } else {
                    const lowerPrev = prevRound.toLowerCase().trim();
                    const sfMatch = lowerPrev === 'semi final' || lowerPrev === 'semifinal';
                    const rndMatch = lowerPrev.match(/^round\s*(\d+)$/i);
                    if (sfMatch) roundName = 'Final';
                    else if (rndMatch) roundName = `Round ${parseInt(rndMatch[1], 10) + 1}`;
                    else roundName = prevRound + ' 2';
                    numHeats = Math.ceil(currentQualified / 4);
                    surfersPerHeat = Math.min(4, Math.ceil(currentQualified / numHeats));
                    qualifiedPerHeat = 2;
                }

                if (!existingRounds.has(roundName.toLowerCase().trim())) {
                    const distMap = {};
                    let remSurfers = currentQualified; let remHeats = numHeats;
                    for (let j = 0; j < numHeats; j++) {
                        const count = Math.ceil(remSurfers / remHeats);
                        distMap[count] = (distMap[count] || 0) + 1;
                        remSurfers -= count; remHeats--;
                    }
                    const distribution = Object.entries(distMap)
                        .map(([c, h]) => ({ count: parseInt(c), heats: h }))
                        .sort((a, b) => b.count - a.count);
                    preview.push({ round: roundName, heats: numHeats, surfersPerHeat, qualifiedPerHeat, distribution });
                }

                currentQualified = numHeats * qualifiedPerHeat;
                prevRound = roundName;
                if (roundName === 'Final') break;
            }
            return preview;
        };

        const baseWeight = getRoundWeightFE(baseRound);
        const futureRoundsExist = sortedRounds.some(([rName]) => getRoundWeightFE(rName) > baseWeight);
        // Eliminator option only makes sense from Round 1, AND only when there are
        // enough unqualified surfers (need at least 2 to run any heat).
        const totalSurfersInBaseForElim = baseRoundHeats.reduce((sum, h) => sum + (h.surfer_count || 0), 0);
        const totalUnqualifiedForElim = Math.max(0, totalSurfersInBaseForElim - totalQualified);
        const eliminatorAllowed = baseRound.toLowerCase().trim() === 'round 1' && totalUnqualifiedForElim >= 2;

        // Check if the base round is already fully completed (all heats done)
        // (baseRoundHeats was already computed above — reuse it here)
        const baseRoundCompleted = baseRoundHeats.length > 0 && baseRoundHeats.every(h => h.status === 'completed');

        setAutoGenPreview({
            base_round: baseRound,
            total_qualified: totalQualified,
            buildPreview,
            eliminatorExists,
            eliminatorAllowed,
            futureRoundsExist,
            baseRoundCompleted
        });
        setEliminatorEnabled(false);

        setIsAutoGenModalOpen(true);
    };

    const handleDeleteFutureRounds = async () => {
        if (!autoGenPreview) return;
        setCustomConfirm({
            message: 'Are you sure you want to delete ALL future rounds for this division? This action cannot be undone.',
            onConfirm: async () => {
                setCustomConfirm(null);
                try {
                    setIsAutoGenerating(true);
                    await axios.delete(`${API_BASE}/heats/future-rounds`, {
                        params: {
                            event_id: selectedEventFilter,
                            division: selectedDivisionFilter,
                            base_round: autoGenPreview.base_round,
                            sup_category: selectedSupCategoryFilter !== 'all' ? selectedSupCategoryFilter : undefined
                        }
                    });
                    showToast('All future rounds deleted successfully.', 'success');
                    setIsAutoGenModalOpen(false);
                    setAutoGenPreview(null);
                    fetchInitialData(true);
                } catch (err) {
                    const msg = err.response?.data?.error || 'Failed to delete future rounds.';
                    showToast(msg, 'error');
                } finally {
                    setIsAutoGenerating(false);
                }
            }
        });
    };

    const handleTriggerAdvance = async () => {
        if (!autoGenPreview) return;
        try {
            setIsAutoGenerating(true);
            const res = await axios.post(`${API_BASE}/heats/trigger-advance`, {
                event_id: selectedEventFilter,
                division: selectedDivisionFilter,
                round: autoGenPreview.base_round,
                sup_category: selectedSupCategoryFilter !== 'all' ? selectedSupCategoryFilter : null
            });
            showToast(res.data.message || 'Surfers assigned successfully!', 'success');
            setIsAutoGenModalOpen(false);
            setAutoGenPreview(null);
            setEliminatorEnabled(false);
            fetchInitialData(true);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to assign surfers.';
            showToast(msg, 'error');
        } finally {
            setIsAutoGenerating(false);
        }
    };

    const handleAutoGenerateRounds = async () => {
        if (!autoGenPreview) return;
        try {
            setIsAutoGenerating(true);
            const res = await axios.post(`${API_BASE}/heats/auto-generate-rounds`, {
                event_id: selectedEventFilter,
                division: selectedDivisionFilter,
                base_round: autoGenPreview.base_round,
                include_eliminator: eliminatorEnabled,
                sup_category: selectedSupCategoryFilter !== 'all' ? selectedSupCategoryFilter : null
            });
            showToast(res.data.message || 'Rounds generated successfully!', 'success');
            setIsAutoGenModalOpen(false);
            setAutoGenPreview(null);
            setEliminatorEnabled(false);
            setIsModalOpen(false);
            setIsEditing(false);
            setEditHeatId(null);
            setSelectedSurferIds([]);
            setSurferColors({});
            fetchInitialData(true);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to auto-generate rounds.';
            showToast(msg, 'error');
        } finally {
            setIsAutoGenerating(false);
        }
    };

    const handleDeleteHeat = (id) => {
        setCustomConfirm({
            message: 'Are you sure you want to delete this heat?',
            onConfirm: async () => {
                setCustomConfirm(null);
                // Optimistic UI update
                setHeats(prev => prev.filter(h => h.id !== id));
                if (viewHeat && viewHeat.id === id) {
                    setViewHeat(null);
                }
                try {
                    await axios.delete(`${API_BASE}/heats/${id}`);
                    showToast('Heat deleted successfully!', 'success');
                    fetchInitialData(true); // Silent sync
                } catch (err) {
                    console.error('Error deleting heat:', err);
                    fetchInitialData(true); // Revert on error
                    showToast('Failed to delete heat.', 'error');
                }
            }
        });
    };

    const handleTimerStart = async (e) => {
        e.preventDefault();
        
        const heatId = timerModal.heat.id;
        const duration = timerModal.duration;
        
        // Optimistically close modal and show success toast immediately
        setTimerModal({ ...timerModal, isOpen: false });
        showToast('Timer started! Judges will see the countdown.', 'success');

        try {
            // Background API call
            await axios.post(`${API_BASE}/heats/${heatId}/timer`, {
                duration_minutes: duration
            });
            // Silent refresh in the background
            fetchInitialData(true);
        } catch (err) {
            console.error('Error starting timer:', err);
            showToast('Failed to start timer.', 'error');
        }
    };

    // Auto-start trigger for pre-start timers
    useEffect(() => {
        const checkAutoStarts = () => {
            const now = Date.now() + serverTimeOffset;
            heats.forEach(h => {
                if ((h.status === 'scheduled' || !h.status) && h.timer_start_time && h.timer_duration) {
                    const startTime = new Date(h.timer_start_time).getTime();
                    const durationMs = h.timer_duration * 60 * 1000;
                    const remaining = Math.max(0, Math.ceil((startTime + durationMs - now) / 1000));

                    if (remaining === 0) {
                        // Trigger Auto Start
                        axios.patch(`${API_BASE}/heats/${h.id}/status`, {
                            status: 'in-progress',
                            mode: 'auto-timer'
                        }).catch(err => console.error('Auto-start failed for heat', h.id, err));
                    }
                }
            });
        };

        const interval = setInterval(checkAutoStarts, 2000);
        return () => clearInterval(interval);
    }, [heats, serverTimeOffset]);

    const handleOpenJudgeAssignment = (heat) => {
        // Pre-select judges already assigned to this heat, filtering to only include scoring judges
        const existingJudgeIds = heat.judges
            ? heat.judges.filter(j => j.role === 'scoring').map(j => j.id)
            : [];
        setSelectedJudgeIds(existingJudgeIds);
        setIsJudgeModalOpen(true);
    };

    const toggleJudgeSelection = (id) => {
        setSelectedJudgeIds(prev =>
            prev.includes(id) ? prev.filter(jid => jid !== id) : [...prev, id]
        );
    };

    const handleBatchAssignJudges = async () => {
        if (!viewHeat) return;
        try {
            // Optimistically update the UI for immediate feedback
            const selectedJudgesDetails = activeJudges.filter(j => selectedJudgeIds.includes(j.id));

            // Update the main heats list
            setHeats(prev => prev.map(h =>
                h.id === viewHeat.id ? { ...h, judges: selectedJudgesDetails } : h
            ));

            // Update the currently viewed heat detail
            setViewHeat(prev => ({ ...prev, judges: selectedJudgesDetails }));

            // Close modal immediately
            setIsJudgeModalOpen(false);

            setIsAssigningJudges(true);
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';

            await axios.patch(`${API_BASE}/judges/batch/assign-heat`, {
                assigned_heat_id: viewHeat.id,
                judge_ids: selectedJudgeIds,
                admin_id: adminId
            });

            // Silent refresh in the background to ensure data consistency
            fetchInitialData(true);
            showToast('Judges assigned successfully!', 'success');
        } catch (err) {
            console.error('Error assigning judges:', err);
            showToast('Failed to assign judges.', 'error');
        } finally {
            setIsAssigningJudges(false);
        }
    };

    // Swap surfers between heats
    const handleSwapSurfers = async () => {
        if (!viewHeat || !swapWizard.surferA || !swapWizard.targetHeat || !swapWizard.surferB) return;
        try {
            setSwapWizard(prev => ({ ...prev, isSwapping: true }));
            await axios.post(`${API_BASE}/heats/swap-surfers`, {
                heat_a_id: viewHeat.id,
                surfer_a_id: swapWizard.surferA.id,
                heat_b_id: swapWizard.targetHeat.id,
                surfer_b_id: swapWizard.surferB.id
            });
            await fetchInitialData(true);
            setSwapWizard({ isOpen: false, step: 1, surferA: null, targetHeat: null, surferB: null, isSwapping: false });
            showToast(`Swapped ${swapWizard.surferA.name} ↔ ${swapWizard.surferB.name} successfully!`, 'success');
        } catch (err) {
            console.error('Error swapping surfers:', err);
            showToast(err.response?.data?.error || 'Failed to swap surfers.', 'error');
        } finally {
            setSwapWizard(prev => ({ ...prev, isSwapping: false }));
        }
    };

    const selectedEvent = events.find(e => e.id === formData.event_id);
    const divisions = selectedEvent ? (() => {
        try {
            return JSON.parse(selectedEvent.divisions || '[]');
        } catch (e) {
            console.error('Error parsing divisions:', e);
            return [];
        }
    })() : [];

    // Rounds available for selected event + division (for the table-only round filter)
    const filteredRoundsForTable = [...new Set(
        heats
            .filter(h =>
                (selectedEventFilter === 'all' || String(h.event_id) === String(selectedEventFilter)) &&
                (selectedDivisionFilter === 'all' || h.division === selectedDivisionFilter) &&
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
    });

    // SUP Event detection helper
    const selectedFilterEvent = events.find(e => String(e.id) === String(selectedEventFilter));
    const isSupEventSelected = (selectedFilterEvent?.event_type || 'Surfing Event') === 'SUP Event';
    const SUP_CATEGORIES = ['Sprint', 'Technical race', 'Distance'];

    // Filtered heats for the table
    const filteredHeats = heats.filter(h => {
        if (selectedEventFilter !== 'all' && String(h.event_id) !== String(selectedEventFilter)) return false;
        if (selectedDivisionFilter !== 'all' && h.division !== selectedDivisionFilter) return false;
        if (selectedRoundFilter !== 'all' && h.round !== selectedRoundFilter) return false;
        // SUP category filter: match heat's saved sup_category column directly
        if (isSupEventSelected && selectedSupCategoryFilter !== 'all') {
            if (h.sup_category !== selectedSupCategoryFilter) return false;
        }

        // Student/Athlete role restriction: only show heats where this student is assigned!
        if (isStudent && (studentName || studentEmail || studentId)) {
            const surfers = h.surfers || [];
            const isAssigned = surfers.some(s => {
                if (!s) return false;
                const sName = (s.name || '').toLowerCase().trim();
                const sEmail = (s.email || '').toLowerCase().trim();
                const matchName = studentName && (sName === studentName || sName.includes(studentName) || studentName.includes(sName));
                const matchEmail = studentEmail && sEmail === studentEmail;
                const matchId = studentId && (String(s.id) === String(studentId) || String(s.student_id) === String(studentId));
                return matchName || matchEmail || matchId;
            });
            if (!isAssigned) return false;
        }

        return true;
    });

    useEffect(() => {
        if (viewHeat) {
            const updated = heats.find(h => h.id === viewHeat.id);
            if (updated) {
                setViewHeat(updated);
            }
        }
    }, [heats]);

    const handleOpenCreateHeatModal = () => {
        setIsEditing(false);
        setEditHeatId(null);
        setSelectedSurferIds([]);
        setSurferColors({});

        // Pre-fill event, division & sup_category from filters
        const eventId = selectedEventFilter !== 'all' ? selectedEventFilter : '';
        const division = selectedDivisionFilter !== 'all' ? selectedDivisionFilter : '';
        const supCategory = selectedSupCategoryFilter !== 'all' ? selectedSupCategoryFilter : '';

        // Find the appropriate initial round to display in the modal
        let initialRound = 'Round 1';
        if (selectedRoundFilter !== 'all' && selectedRoundFilter) {
            initialRound = selectedRoundFilter;
        } else if (eventId && division) {
            // Filter by sup_category as well if it's set in the filters
            const activeCat = supCategory !== 'all' ? supCategory : null;
            const divHeats = heats.filter(h =>
                String(h.event_id) === String(eventId) &&
                h.division?.toLowerCase().trim() === division.toLowerCase().trim() &&
                (activeCat ? (h.sup_category || null) === activeCat : !h.sup_category)
            );

            if (divHeats.length > 0) {
                // Find the highest round currently in this division
                const sortedRounds = Array.from(new Set(divHeats.map(h => h.round?.trim() || 'Round 1'))).sort((a, b) => getRoundWeightFE(b) - getRoundWeightFE(a));
                const highestRound = sortedRounds[0];

                // Check if highest round is fully completed
                const highestRoundHeats = divHeats.filter(h => h.round?.trim() === highestRound);
                const isHighestCompleted = highestRoundHeats.every(h => (h.status?.toLowerCase() || 'scheduled') === 'completed');

                if (isHighestCompleted) {
                    // Calculate total active surfers for this division/category to check if round is fully created
                    let baseSurfers = filterAndDeduplicateSurfers(tournamentProgressionData?.surfers ?? allSurfers);
                    const div = division.toLowerCase();
                    if (div.includes('women') || div.includes('female') || div.includes('girl')) {
                        baseSurfers = baseSurfers.filter(s => s.gender === 'Female');
                    } else if (div.includes('men') || div.includes('male') || div.includes('boy')) {
                        baseSurfers = baseSurfers.filter(s => s.gender === 'Male');
                    }
                    const underMatch = div.match(/(?:u|under)\s*(\d{1,2})/i);
                    const aboveMatch = div.match(/(?:a|above)\s*(\d{1,2})/i);
                    if (underMatch?.[1]) {
                        baseSurfers = baseSurfers.filter(s => s.age && parseInt(s.age) <= parseInt(underMatch[1]));
                    } else if (aboveMatch?.[1]) {
                        baseSurfers = baseSurfers.filter(s => s.age && parseInt(s.age) > parseInt(aboveMatch[1]));
                    }
                    if (supCategory) {
                        baseSurfers = baseSurfers.filter(s => parseSUPCategories(s.sup_categories).includes(supCategory));
                    }

                    const totalSurfers = baseSurfers.length;
                    const expectedHeats = Math.ceil(totalSurfers / 4);

                    // If we haven't even created all expected heats for the highest round, keep it as highestRound
                    if (highestRoundHeats.length < expectedHeats) {
                        initialRound = highestRound;
                    } else {
                        // Intelligently predict next round
                        let hasEliminator = false;
                        let maxRound = 0;
                        let foundAnyQualifier = false;
                        let maxQualifier = 0;

                        const hasSemiFinal = sortedRounds.some(r => r.toLowerCase() === 'semi final' || r.toLowerCase() === 'semifinal');

                        sortedRounds.forEach(r => {
                            if (r.toLowerCase() === 'eliminator') hasEliminator = true;
                            if (r.toLowerCase().includes('qualifier')) {
                                foundAnyQualifier = true;
                                const match = r.match(/qualifier\s*(\d+)/i);
                                if (match) maxQualifier = Math.max(maxQualifier, parseInt(match[1], 10));
                                else if (maxQualifier === 0) maxQualifier = 1;
                            }
                            const match = r.match(/round\s*(\d+)/i);
                            if (match) maxRound = Math.max(maxRound, parseInt(match[1], 10));
                        });

                        const currentEventObj = events.find(e => String(e.id) === String(eventId));
                        const isSupEvent = currentEventObj?.event_type === 'SUP Event';

                        if (hasSemiFinal) {
                            initialRound = "Final";
                        } else if (maxRound === 1 && !hasEliminator && !foundAnyQualifier && !isSupEvent) {
                            initialRound = "Eliminator";
                        } else if (isSupEvent && maxRound === 1 && !foundAnyQualifier) {
                            initialRound = "Round 2";
                        } else if (foundAnyQualifier) {
                            initialRound = `Qualifier ${maxQualifier + 1}`;
                        } else if (maxRound > 0) {
                            initialRound = `Round ${maxRound + 1}`;
                        } else {
                            const digitMatch = highestRound.match(/(\d+)$/);
                            if (digitMatch) {
                                initialRound = highestRound.replace(/\d+$/, parseInt(digitMatch[1], 10) + 1);
                            } else {
                                initialRound = highestRound + " 2";
                            }
                        }
                    }
                } else {
                    initialRound = highestRound;
                }
            }
        }

        setFormData(prev => ({
            ...prev,
            event_id: eventId,
            division: division,
            sup_category: supCategory,
            round: initialRound
        }));
        setIsModalOpen(true);
    };

    const handleOpenCreateBreakModal = (scheduleEventId = '', scheduleDivision = '') => {
        setIsEditing(false);
        setEditHeatId(null);
        setSelectedSurferIds([]);
        setSurferColors({});

        let eventId = '';
        if (scheduleEventId && scheduleEventId !== 'all') {
            eventId = scheduleEventId;
        } else {
            eventId = selectedEventFilter !== 'all' ? selectedEventFilter : '';
        }

        let divisionId = 'Break';

        setFormData(prev => ({
            ...prev,
            event_id: eventId,
            division: divisionId,
            round: 'Lunch Break',
            sup_category: '',
            duration: 30,
            start_time: '',
            end_time: '',
            auto_scoring_mode: false
        }));
        setIsModalOpen(true);
    };

    return (
        <>
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
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 style={{ fontSize: '30px', fontWeight: '700', letterSpacing: '-0.5px' }}>Heat Management</h2>
                        <p className="text-secondary" style={{ marginTop: '4px' }}>Schedule and manage competition heats</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* View Mode Toggle Switch */}
                        <div style={{
                            display: 'flex',
                            background: 'rgba(15, 23, 42, 0.05)',
                            padding: '4px',
                            borderRadius: '12px',
                            border: '1.5px solid var(--border-dim)'
                        }}>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: viewMode === 'list' ? 'var(--bg-main, #fff)' : 'transparent',
                                    color: viewMode === 'list' ? 'var(--text-dark)' : 'var(--text-muted)',
                                    boxShadow: viewMode === 'list' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                List View
                            </button>
                            <button
                                onClick={() => setViewMode('schedule')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: viewMode === 'schedule' ? 'var(--bg-main, #fff)' : 'transparent',
                                    color: viewMode === 'schedule' ? 'var(--text-dark)' : 'var(--text-muted)',
                                    boxShadow: viewMode === 'schedule' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Schedule View
                            </button>
                        </div>
                        {!isStudent && (
                            <button onClick={handleOpenCreateHeatModal} style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '4px 10px', borderRadius: '8px', fontSize: '12px',
                                fontWeight: '700', border: 'none', cursor: 'pointer',
                                background: '#0F172A', color: '#fff',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.12)', transition: 'all 0.2s',
                                lineHeight: '1.4'
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            >
                                <Plus size={12} />
                                Create Heat
                            </button>
                        )}
                    </div>
                </div>

                {viewMode === 'schedule' ? (
                    <HeatScheduleView
                        heats={heats}
                        events={events}
                        onReschedule={handleReschedule}
                        onAddBreak={handleOpenCreateBreakModal}
                        onDeleteHeat={handleDeleteHeat}
                        onSelectHeat={setViewHeat}
                        initialEventId={selectedEventFilter}
                        initialDivision={selectedDivisionFilter}
                        onFilterChange={(eventId, division) => {
                            if (eventId) setSelectedEventFilter(eventId);
                            if (division) setSelectedDivisionFilter(division);
                        }}
                    />
                ) : (
                    <>
                        <div className="hm-filter-row" style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="hm-filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Select Event
                            {/* Event type badge — shown inline next to the label when an event is selected */}
                            {selectedEventFilter !== 'all' && selectedFilterEvent && (() => {
                                const isSup = (selectedFilterEvent.event_type || 'Surfing Event') === 'SUP Event';
                                return (
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2px 10px',
                                        borderRadius: '20px',
                                        letterSpacing: '0.5px',
                                        background: isSup
                                            ? 'linear-gradient(135deg,#10b981,#059669)'
                                            : 'linear-gradient(135deg,#3b82f6,#2563eb)',
                                        color: '#fff',
                                        boxShadow: isSup
                                            ? '0 2px 6px rgba(16,185,129,0.3)'
                                            : '0 2px 6px rgba(59,130,246,0.3)'
                                    }}>
                                        {isSup ? 'SUP' : 'Surfing'}
                                    </span>
                                );
                            })()}
                        </label>
                        <select
                            className="form-control"
                            style={{ padding: '8px 16px' }}
                            value={selectedEventFilter}
                            onChange={(e) => {
                                setSelectedEventFilter(e.target.value);
                                setSelectedDivisionFilter('all');
                                setSelectedRoundFilter('all');
                                setSelectedSupCategoryFilter('all');
                            }}
                        >
                            <option value="all">All Events</option>
                            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div className="hm-filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Select Sections</label>
                        <select
                            className="form-control"
                            style={{ padding: '8px 16px' }}
                            value={selectedDivisionFilter}
                            onChange={(e) => { setSelectedDivisionFilter(e.target.value); setSelectedRoundFilter('all'); }}
                            disabled={selectedEventFilter === 'all'}
                        >
                            <option value="all">All Sections</option>
                            {selectedEventFilter !== 'all' && (() => {
                                const filterEvent = events.find(e => String(e.id) === String(selectedEventFilter));
                                const divs = filterEvent ? (() => { try { return JSON.parse(filterEvent.divisions || '[]'); } catch { return []; } })() : [];
                                return divs.map((d, i) => <option key={i} value={d}>{formatDivisionName(d, filterEvent)}</option>);
                            })()}
                        </select>
                    </div>
                    {/* SUP Category filter — only visible when the selected event is a SUP Event */}
                    {isSupEventSelected && (
                        <div className="hm-filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {/* <span style={{ fontSize: '11px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>SUP</span> */}
                                    Select SUP Category
                                </span>
                            </label>
                            <select
                                className="form-control"
                                style={{ padding: '8px 16px' }}
                                value={selectedSupCategoryFilter}
                                onChange={(e) => setSelectedSupCategoryFilter(e.target.value)}
                            >
                                <option value="all">All Categories</option>
                                {SUP_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="hm-filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Select Round</label>
                        <select
                            className="form-control"
                            style={{ padding: '8px 16px' }}
                            value={selectedRoundFilter}
                            disabled={selectedDivisionFilter === 'all'}
                            onChange={(e) => setSelectedRoundFilter(e.target.value)}
                        >
                            <option value="all">All Rounds</option>
                            {filteredRoundsForTable.map((r, i) => <option key={i} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>



                {isLoading ? (
                    <div className="card" style={{ padding: '80px 32px', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-blue)' }} />
                        <p className="text-secondary">Loading heats data...</p>
                    </div>
                ) : filteredHeats.length > 0 ? (
                    <div className="card hm-table-wrap" style={{ overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>Heat</th>
                                    <th>Round</th>
                                    <th>Section</th>
                                    <th>Time & duration</th>
                                    <th>Surfers</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHeats
                                    .map((heat) => {
                                        const timerSet = isTimerSet(heat) && (heat.status === 'scheduled' || !heat.status);
                                        const isInManualCountdown = heat.status === 'in-progress' && heat.actual_start_time && new Date(heat.actual_start_time).getTime() > Date.now() + serverTimeOffset;
                                        const showYetToStart = timerSet || isInManualCountdown;

                                        // We don't blur the cells directly anymore; the overlay uses backdrop-filter
                                        const blurStyle = {};

                                        return (
                                            <tr key={heat.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-dim)', position: 'relative' }}>
                                                <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: '600', position: 'relative' }}>
                                                    {showYetToStart && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '80vw', // Use viewport width to span the table visually, slightly less than 100 to avoid scrollbar
                                                            height: '100%',
                                                            zIndex: 50,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            pointerEvents: 'none',
                                                            transform: 'translateX(0)', // Ensure no shift
                                                            marginLeft: '20px' // Offset a bit for the first column padding if needed, or just let centering handle it
                                                        }}>
                                                            <div style={{
                                                                padding: '8px 24px',
                                                                background: isInManualCountdown ? '#eab308' : '#22c55e', // Yellow for countdown, Green for pre-start
                                                                border: '2px solid rgba(255,255,255,0.2)',
                                                                borderRadius: '30px',
                                                                color: 'white',
                                                                fontSize: '13px',
                                                                fontWeight: '900',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '1px',
                                                                boxShadow: isInManualCountdown ? '0 4px 20px rgba(234, 179, 8, 0.4)' : '0 4px 20px rgba(34, 197, 94, 0.4)',
                                                                pointerEvents: 'auto',
                                                                whiteSpace: 'nowrap',
                                                                backdropFilter: 'none'
                                                            }}>
                                                                {isInManualCountdown ? 'Heat starts in 10s...' : 'THIS HEAT IS YET TO BE STARTED'}
                                                            </div>
                                                        </div>
                                                    )}
                                                    #{heat.heat_number}
                                                </td>
                                                <td style={{ padding: '20px 24px', fontSize: '14px', ...blurStyle }}>{heat.round}</td>
                                                <td style={{ padding: '20px 24px', fontSize: '14px', color: 'var(--text-secondary)', ...blurStyle }}>{formatDivisionName(heat.division, events.find(e => e.id === heat.event_id))}</td>
                                                <td className="hm-time-cell" style={{ padding: '20px 24px', fontSize: '14px', ...blurStyle }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                                                        {getHeatTimingDisplay(heat)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px 24px', fontSize: '14px', ...blurStyle }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                                                        {heat.surfers ? heat.surfers.length : 0}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px 24px', ...blurStyle }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={getStatusStyle((!heat.start_time && (!heat.status || heat.status.toLowerCase() === 'scheduled')) ? 'unscheduled' : heat.status)}>
                                                            {(!heat.start_time && (!heat.status || heat.status.toLowerCase() === 'scheduled')) ? 'unscheduled' : (heat.status === 'in-progress' ? 'progress' : (heat.status || 'scheduled'))}
                                                        </span>
                                                        {heat.status === 'in-progress' && heat.event_type !== 'SUP Event' && (
                                                            <LiveHeatTimer heat={heat} serverTimeOffset={serverTimeOffset} />
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px 24px', textAlign: 'right', ...blurStyle }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                                                        {/* Share button — only shown for live (in-progress) heats */}
                                                        {heat.status === 'in-progress' && (
                                                            <button
                                                                onClick={() => setShareModal({ isOpen: true, heat })}
                                                                className="text-secondary transition-all"
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    padding: 0,
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#6366f1'
                                                                }}
                                                                title="Share Live Heat"
                                                            >
                                                                <Share2 size={20} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setViewHeat(heat)}
                                                            className="btn"
                                                            style={{
                                                                padding: '6px 14px',
                                                                fontSize: '13px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                background: '#66ec6dff',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                fontWeight: '600',
                                                                transition: 'all 0.2s ease',
                                                                boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                                                            }}
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                            Open
                                                        </button>
                                                        {!isStudent && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleOpenEditModal(heat)}
                                                                    className="text-secondary transition-all"
                                                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                                                                    title="Edit Heat"
                                                                >
                                                                    <Edit size={20} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteHeat(heat.id)}
                                                                    className="text-secondary transition-all"
                                                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                                                                    title="Delete Heat"
                                                                >
                                                                    <Trash2 size={20} />
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
                ) : (
                    <div className="card" style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', textAlign: 'center', gap: '16px' }}>
                        <p className="text-secondary" style={{ fontWeight: '500' }}>
                            {heats.length === 0
                                ? (events.length === 0 ? 'Please create an event first before adding heats' : 'No heats scheduled yet')
                                : 'No heats found for the selected filters'}
                        </p>
                        {heats.length === 0 && events.length > 0 && (
                            <button onClick={() => {
                                setSelectedSurferIds([]);
                                setSurferColors({});
                                setIsModalOpen(true);
                            }} className="btn btn-primary">
                                <Plus size={20} />
                                Schedule First Heat
                            </button>
                        )}
                    </div>
                )}
                </>
            )}
            </div>

            {/* ── Auto-Generate Rounds Confirmation Modal ── */}
            {isAutoGenModalOpen && autoGenPreview && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.72)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        zIndex: 10000, backdropFilter: 'blur(8px)', padding: '20px'
                    }}
                >
                    <div style={{
                        background: '#ffffff', borderRadius: '20px', maxWidth: '520px',
                        width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                        border: '1px solid #e2e8f0', overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '24px 28px',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
                                }}>
                                    <Trophy size={20} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Auto-Generate Remaining Rounds</h3>
                                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                        Based on <strong style={{ color: '#334155' }}>{autoGenPreview.base_round}</strong> — {autoGenPreview.total_qualified} qualified surfers
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsAutoGenModalOpen(false); setAutoGenPreview(null); setEliminatorEnabled(false); }}
                                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '50%', cursor: 'pointer', color: '#64748b', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px 28px', background: '#ffffff', maxHeight: '70vh', overflowY: 'auto' }}>
                            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
                                The following rounds will be created with <strong style={{ color: '#0f172a' }}>empty placeholder heats</strong>.
                                The surfers are auto assigned after each round last heat completes.
                            </p>

                            {/* ── Eliminator Toggle (only if base is Round 1 and it doesn't exist yet) ── */}
                            {autoGenPreview.eliminatorAllowed && !autoGenPreview.eliminatorExists && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '14px 16px', marginBottom: '16px',
                                    background: eliminatorEnabled ? '#fff7ed' : '#f8fafc',
                                    border: `1px solid ${eliminatorEnabled ? '#fb923c' : '#e2e8f0'}`,
                                    borderRadius: '12px',
                                    transition: 'all 0.25s ease'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: eliminatorEnabled ? 'linear-gradient(135deg, #f97316, #fb923c)' : '#e2e8f0',
                                            boxShadow: eliminatorEnabled ? '0 4px 12px rgba(249,115,22,0.3)' : 'none',
                                            fontSize: '16px',
                                            transition: 'all 0.25s ease'
                                        }}>
                                            ⚡
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Eliminator Round</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                Unqualified surfers from {autoGenPreview.base_round} compete for a second chance
                                            </div>
                                        </div>
                                    </div>
                                    {/* Toggle switch */}
                                    <button
                                        onClick={() => setEliminatorEnabled(prev => !prev)}
                                        style={{
                                            width: '48px', height: '26px', borderRadius: '13px',
                                            background: eliminatorEnabled ? '#f97316' : '#cbd5e1',
                                            border: 'none', cursor: 'pointer', padding: '3px',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: eliminatorEnabled ? 'flex-end' : 'flex-start',
                                            flexShrink: 0,
                                            transition: 'background 0.25s ease',
                                            outline: 'none'
                                        }}
                                        title={eliminatorEnabled ? 'Disable Eliminator round' : 'Enable Eliminator round'}
                                    >
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            background: 'white',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                                        }} />
                                    </button>
                                </div>
                            )}

                            {/* ── Round Preview Cards ── */}
                            {(() => {
                                const details = autoGenPreview.buildPreview(eliminatorEnabled);
                                if (details.length === 0) {
                                    return (
                                        <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                                            All required rounds already exist.
                                        </div>
                                    );
                                }
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                        {details.map((d) => {
                                            const isFinal = d.round === 'Final';
                                            const isSemi = d.round === 'Semi Final';
                                            const isElim = d.round === 'Eliminator';
                                            return (
                                                <div key={d.round} style={{
                                                    display: 'flex', alignItems: 'center',
                                                    gap: '14px', padding: '14px 16px',
                                                    background: isElim ? '#fff7ed' : isFinal ? '#fffbeb' : isSemi ? '#eef2ff' : '#f8fafc',
                                                    border: `1px solid ${isElim ? '#fed7aa' : isFinal ? '#fcd34d' : isSemi ? '#c7d2fe' : '#e2e8f0'}`,
                                                    borderRadius: '12px'
                                                }}>
                                                    <div style={{
                                                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: isElim ? 'linear-gradient(135deg,#f97316,#fb923c)' : isFinal ? '#f59e0b' : isSemi ? '#6366f1' : '#e2e8f0',
                                                        fontSize: '14px', fontWeight: '800'
                                                    }}>
                                                        {isElim ? '⚡' : isFinal ? '🏆' : '🌊'}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>
                                                            {d.round}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
                                                            {d.distribution && d.distribution.length > 0 ? (
                                                                d.distribution.map((dist, idx) => (
                                                                    <span key={idx}>
                                                                        {dist.count} surfer{dist.count > 1 ? 's' : ''} ({dist.heats} heat{dist.heats > 1 ? 's' : ''})
                                                                        {idx < d.distribution.length - 1 ? ', ' : ''}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                `${d.surfersPerHeat} Surfers (${d.heats} heat${d.heats > 1 ? 's' : ''})`
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        padding: '4px 12px', borderRadius: '20px',
                                                        fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px',
                                                        background: isElim ? '#ffedd5' : isFinal ? '#fef3c7' : isSemi ? '#e0e7ff' : '#f1f5f9',
                                                        color: isElim ? '#c2410c' : isFinal ? '#d97706' : isSemi ? '#4f46e5' : '#64748b'
                                                    }}>
                                                        {isElim ? 'ELIMINATOR' : isFinal ? 'FINAL' : isSemi ? 'SEMI FINAL' : 'NEXT ROUND'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            <div style={{
                                padding: '12px 16px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '13px',
                                color: '#475569',
                                marginBottom: '24px'
                            }}>
                                💡 <strong style={{ color: '#0f172a' }}>Note:</strong> Heats are created as empty placeholders.
                                Surfers will be assigned <strong>after only all heats have been completed in previous round</strong>
                                {eliminatorEnabled && <span>. <strong style={{ color: '#c2410c' }}>Eliminator qualifiers</strong> will advance to the next round.</span>}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => { setIsAutoGenModalOpen(false); setAutoGenPreview(null); setEliminatorEnabled(false); }}
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                                        disabled={isAutoGenerating}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAutoGenerateRounds}
                                        className="btn"
                                        disabled={isAutoGenerating || autoGenPreview.buildPreview(eliminatorEnabled).length === 0}
                                        style={{
                                            flex: 2,
                                            background: (isAutoGenerating || autoGenPreview.buildPreview(eliminatorEnabled).length === 0) ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            color: (isAutoGenerating || autoGenPreview.buildPreview(eliminatorEnabled).length === 0) ? '#94a3b8' : 'white',
                                            border: 'none',
                                            fontWeight: '700', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            cursor: (isAutoGenerating || autoGenPreview.buildPreview(eliminatorEnabled).length === 0) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {isAutoGenerating ? (
                                            <><Loader2 size={16} className="animate-spin" /> Generating...</>
                                        ) : (
                                            <><Trophy size={16} /> Generate {autoGenPreview.buildPreview(eliminatorEnabled).length} Round{autoGenPreview.buildPreview(eliminatorEnabled).length !== 1 ? 's' : ''}</>
                                        )}
                                    </button>
                                </div>

                                {/* Assign Surfers Now — shown when base round is done but next rounds are empty */}
                                {autoGenPreview.futureRoundsExist && autoGenPreview.baseRoundCompleted && (
                                    <button
                                        onClick={handleTriggerAdvance}
                                        disabled={isAutoGenerating}
                                        style={{
                                            width: '100%', padding: '13px', borderRadius: '8px',
                                            background: isAutoGenerating ? '#e2e8f0' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                            color: isAutoGenerating ? '#94a3b8' : 'white',
                                            border: 'none', fontWeight: '700', fontSize: '13px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            cursor: isAutoGenerating ? 'not-allowed' : 'pointer',
                                            boxShadow: isAutoGenerating ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {isAutoGenerating
                                            ? <><Loader2 size={15} className="animate-spin" /> Assigning...</>
                                            : <><Trophy size={15} /> Assign Surfers to Next Round Now</>}
                                    </button>
                                )}

                                {/* Delete all future rounds button (only if they exist) */}
                                {autoGenPreview.futureRoundsExist && (
                                    <button
                                        onClick={handleDeleteFutureRounds}
                                        disabled={isAutoGenerating}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '8px',
                                            background: '#fee2e2', border: '1px solid #fecaca',
                                            color: '#b91c1c', fontWeight: '700', fontSize: '13px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            cursor: isAutoGenerating ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => { if (!isAutoGenerating) e.currentTarget.style.background = '#fecaca'; }}
                                        onMouseOut={(e) => { if (!isAutoGenerating) e.currentTarget.style.background = '#fee2e2'; }}
                                    >
                                        <Trash2 size={16} /> Delete all future rounds
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Eliminator Prompt Modal */}
            {isEliminatorPromptOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10000, backdropFilter: 'blur(10px)'
                    }}
                >
                    <div style={{
                        background: '#fff', borderRadius: '16px', padding: '32px',
                        maxWidth: '450px', width: '90%', textAlign: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: '#fef3c7', color: '#d97706',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px', margin: '0 auto 20px'
                        }}>
                            ⚡
                        </div>
                        <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                            Eliminator Round?
                        </h3>
                        <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
                            Do you want to give a 2nd chance for unqualified surfers from Round 1? Creating an <strong>Eliminator</strong> round will pull in only the eliminated surfers.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, round: 'Eliminator' }));
                                    setIsEliminatorPromptOpen(false);
                                }}
                                style={{
                                    padding: '14px', background: '#f59e0b', color: '#fff',
                                    border: 'none', borderRadius: '8px', fontWeight: '700',
                                    fontSize: '15px', cursor: 'pointer', transition: 'background 0.2s'
                                }}
                            >
                                Yes, create Eliminator Round
                            </button>
                            <button
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, round: 'Round 2' }));
                                    setIsEliminatorPromptOpen(false);
                                }}
                                style={{
                                    padding: '14px', background: '#3b82f6', color: '#fff',
                                    border: 'none', borderRadius: '8px', fontWeight: '700',
                                    fontSize: '15px', cursor: 'pointer', transition: 'background 0.2s'
                                }}
                            >
                                No, move on to Round 2
                            </button>
                            <button
                                onClick={() => setIsEliminatorPromptOpen(false)}
                                style={{
                                    padding: '12px', background: 'transparent', color: '#64748b',
                                    border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600',
                                    fontSize: '14px', cursor: 'pointer', marginTop: '4px'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Heat Modal */}
            {isModalOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        backdropFilter: 'blur(8px)',
                        padding: '20px'
                    }}
                >
                    <form onSubmit={handleCreateHeat} className="modal-content" style={{ maxWidth: '600px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>
                                    {isEditing ? (isBreak ? 'Edit Break' : 'Edit Heat') : (isBreak ? 'Create New Break' : 'Create New Heat')}
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {isEditing ? `Modifying ${formData.round} ${isBreak ? 'Break block' : `Heat #${formData.heat_number}`}` : (isBreak ? 'Configure a new schedule break block' : 'Configure a new competition heat')}
                                </p>
                            </div>
                            <button type="button" onClick={() => {
                                setIsModalOpen(false);
                                setIsEditing(false);
                                setEditHeatId(null);
                                setSelectedSurferIds([]);
                                setSurferColors({});
                            }} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-row">
                                <div className="form-group" style={{ display: isBreak ? 'none' : 'block' }}>
                                    <label className="form-label">Event <span>*</span></label>
                                    <select
                                        className="form-control"
                                        required={!isBreak}
                                        value={formData.event_id}
                                        onChange={(e) => {
                                            const isBreakSelect = formData.division === 'Break' || (formData.round || '').toLowerCase().includes('break');
                                            setFormData({ 
                                                ...formData, 
                                                event_id: e.target.value, 
                                                division: isBreakSelect ? (formData.division || 'Break') : '', 
                                                sup_category: '' 
                                            });
                                        }}
                                    >
                                        <option value="">Select event</option>
                                        {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ display: isBreak ? 'none' : 'block' }}>
                                    <label className="form-label">Division <span>*</span></label>
                                    <select
                                        className="form-control"
                                        required={!isBreak}
                                        disabled={!formData.event_id && !isBreak}
                                        value={formData.division}
                                        onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                    >
                                        <option value="">Select division</option>
                                        {isBreak && <option value="Break">Break</option>}
                                        {divisions.map((d, i) => <option key={i} value={d}>{formatDivisionName(d, events.find(e => String(e.id) === String(formData.event_id)))}</option>)}
                                    </select>
                                </div>
                                {/* SUP Category select — only shown when the selected event is a SUP Event */}
                                {(() => {
                                    const modalSelectedEvent = events.find(e => String(e.id) === String(formData.event_id));
                                    const isModalSUP = (modalSelectedEvent?.event_type || '') === 'SUP Event';
                                    if (!isModalSUP || !formData.event_id) return null;
                                    return (
                                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>SUP</span>
                                                SUP Category
                                            </label>
                                            <select
                                                className="form-control"
                                                value={formData.sup_category}
                                                onChange={(e) => setFormData({ ...formData, sup_category: e.target.value })}
                                            >
                                                <option value="">Select SUP Category</option>
                                                {SUP_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '500' }}>
                                                Filter surfer selection to those registered under a specific SUP category.
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>{isBreak ? 'Break Name' : 'Round'} <span>*</span></label>
                                    </div>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        placeholder={isBreak ? "e.g., Lunch Break" : "e.g., Round 1"}
                                        value={formData.round}
                                        onChange={(e) => setFormData({ ...formData, round: e.target.value })}
                                    />
                                </div>
                                {!isBreak && (
                                    <div className="form-group">
                                        <label className="form-label">Heat Number</label>
                                        <div className="form-control" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                                            Heat #{isEditing ? formData.heat_number : calculatedHeatNumber}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isBreak && (
                                <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Number of Surfers</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={formData.surfer_count}
                                        onKeyDown={(e) => ["ArrowUp", "ArrowDown"].includes(e.key) && e.preventDefault()}
                                        onWheel={(e) => e.target.blur()}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setFormData({ ...formData, surfer_count: '', qualified_count: '' });
                                                return;
                                            }
                                            const count = parseInt(val);
                                            setFormData({
                                                ...formData,
                                                surfer_count: isNaN(count) ? '' : count,
                                                qualified_count: isNaN(count) ? '' : count
                                            });
                                        }}
                                    />
                                </div>

                            </div>
                            )}

                            {(() => {
                                const modalSelectedEvent = events.find(e => String(e.id) === String(formData.event_id));
                                const isModalSUP = (modalSelectedEvent?.event_type || '') === 'SUP Event';
                                if (isModalSUP) return null;
                                return (
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Duration (min) <span>*</span></label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                required={!isModalSUP}
                                                value={formData.duration}
                                                onKeyDown={(e) => ["ArrowUp", "ArrowDown"].includes(e.key) && e.preventDefault()}
                                                onWheel={(e) => e.target.blur()}
                                                onChange={(e) => handleTimeFieldChange('duration', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Start Time</label>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.start_time}
                                        onChange={(e) => handleTimeFieldChange('start_time', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Time</label>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.end_time}
                                        onChange={(e) => handleTimeFieldChange('end_time', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/*} ── Automated Scoring Mode Toggle ──
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                background: formData.auto_scoring_mode
                                    ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))'
                                    : 'rgba(248,250,252,1)',
                                border: formData.auto_scoring_mode
                                    ? '1.5px solid rgba(99,102,241,0.35)'
                                    : '1.5px solid var(--border-dim)',
                                borderRadius: '14px',
                                padding: '14px 16px',
                                marginBottom: '18px',
                                transition: 'all 0.25s ease',
                                cursor: 'pointer'
                            }}
                                onClick={() => setFormData({ ...formData, auto_scoring_mode: !formData.auto_scoring_mode })}
                            >
                                
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: formData.auto_scoring_mode
                                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                        : 'var(--border-dim)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'background 0.25s ease'
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                                        <path d="M12 6v6l4 2" />
                                    </svg>
                                </div>

                                
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: formData.auto_scoring_mode ? '#6366f1' : '#1e293b',
                                        marginBottom: '2px',
                                        transition: 'color 0.2s'
                                    }}>Automated Scoring Mode</div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: formData.auto_scoring_mode ? '#8b5cf6' : 'var(--text-muted)',
                                        fontWeight: '500',
                                        transition: 'color 0.2s'
                                    }}>
                                        {formData.auto_scoring_mode
                                            ? 'Active — Scores auto-approved when all judges submit'
                                            : 'No Head Judge/Tabulator required. Judge scores are auto-approved.'}
                                    </div>
                                </div>

                               
                                <div
                                    style={{
                                        width: '46px',
                                        height: '26px',
                                        borderRadius: '13px',
                                        background: formData.auto_scoring_mode
                                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                            : 'var(--border-hover)',
                                        position: 'relative',
                                        flexShrink: 0,
                                        transition: 'background 0.25s ease',
                                        boxShadow: formData.auto_scoring_mode
                                            ? '0 0 0 3px rgba(99,102,241,0.2)'
                                            : 'none'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: formData.auto_scoring_mode ? '23px' : '3px',
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: 'var(--surface-light)',
                                        transition: 'left 0.25s ease',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                            </div> 

                            {/* Surfer List */}
                            {!isBreak && (
                            <>
                            <div className="form-group">
                                {/* Tournament Progression Info */}
                                {tournamentProgressionData && (tournamentProgressionData.previous_round || tournamentProgressionData.eliminated_count > 0) && (
                                    <div style={{
                                        padding: '12px 16px',
                                        backgroundColor: formData.round?.toLowerCase().trim() === 'eliminator' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                        border: `1px solid ${formData.round?.toLowerCase().trim() === 'eliminator' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                                        borderRadius: '8px',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: '700', color: formData.round?.toLowerCase().trim() === 'eliminator' ? '#ef4444' : '#22c55e', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {formData.round?.toLowerCase().trim() === 'eliminator' ? '⚡ ELIMINATOR ROUND' : '🏆 Event in progress'} - {tournamentProgressionData.event_name || formData.event_id} ({formData.division})
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                                            {formData.round?.toLowerCase().trim() === 'eliminator' ? (
                                                <div style={{ color: '#ef4444', fontWeight: '500' }}>
                                                    <strong>{getTotalQualifiedSurfersCount()}</strong> unqualified surfers from Round 1 are getting a 2nd chance
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ marginBottom: '4px' }}>
                                                        <strong>{getTotalQualifiedSurfersCount()}</strong> surfers qualified from previous round
                                                    </div>
                                                    {tournamentProgressionData.eliminated_count > 0 && (
                                                        <div style={{ color: '#ef4444', fontWeight: '500' }}>
                                                            <strong>{tournamentProgressionData.eliminated_count}</strong> surfers eliminated so far ({(tournamentProgressionData.eliminated_surfers || []).join(', ')})
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <label className="form-label" style={{ marginBottom: 0 }}>Available Competitors ({getAvailableSurfers().filter(s => !s.is_sub).length})</label>
                                        </div>
                                        <div className="hm-surfer-select-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {formData.round === 'Round 1' &&
                                            heats.filter(h => String(h.event_id) === String(formData.event_id) && h.division === formData.division && h.round === 'Round 1').length === 0 &&
                                            events.find(e => String(e.id) === String(formData.event_id))?.is_series && (
                                            <button
                                                type="button"
                                                onClick={autoGenerateRound1Heats}
                                                className="btn"
                                                style={{
                                                    padding: '8px 16px',
                                                    fontSize: '13px',
                                                    background: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: '600',
                                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                                                }}
                                            >
                                                <Zap size={16} />
                                                Auto-Generate Round 1
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={selectRandomSurfers}
                                            className="btn"
                                            style={{
                                                padding: '8px 16px',
                                                fontSize: '13px',
                                                background: '#2563eb',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontWeight: '600',
                                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                            }}
                                        >
                                            <Shuffle size={16} />
                                            Select Random
                                        </button>
                                    </div>
                                </div>
                                {false ? (
                                    <div style={{
                                        padding: '20px 16px',
                                        borderRadius: '12px',
                                        border: '1.5px dashed #fbbf24',
                                        background: 'rgba(251, 191, 36, 0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: 'rgba(251, 191, 36, 0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#92400e' }}>No competitors imported for this event</p>
                                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#b45309', lineHeight: 1.4 }}>
                                                Please import competitors to this event from <strong>Competitor Management</strong> first.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {/* Gender filter pills inside Create Heat modal */}
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>Gender Filter:</span>
                                            {[
                                                { id: 'All', label: 'All' },
                                                { id: 'Male', label: '♂️ Male' },
                                                { id: 'Female', label: '♀️ Female' }
                                            ].map(gf => (
                                                <button
                                                    key={gf.id}
                                                    type="button"
                                                    onClick={() => setModalSurferGenderFilter(gf.id)}
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '6px',
                                                        border: modalSurferGenderFilter === gf.id ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                                                        background: modalSurferGenderFilter === gf.id ? '#0F172A' : '#F8FAFC',
                                                        color: modalSurferGenderFilter === gf.id ? '#00F2FE' : '#475569',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {gf.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="card hm-surfer-checklist" style={{ padding: '12px', maxHeight: '200px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            {getAvailableSurfers().filter(s => {
                                                if (modalSurferGenderFilter === 'All') return true;
                                                const sGender = (s.gender || '').toLowerCase();
                                                if (modalSurferGenderFilter === 'Male') return sGender === 'male' || sGender === 'men' || sGender === 'boy';
                                                if (modalSurferGenderFilter === 'Female') return sGender === 'female' || sGender === 'women' || sGender === 'girl';
                                                return true;
                                            }).map((s) => (
                                                <label key={s.id} className="flex items-center gap-2" style={{ cursor: s.is_sub ? 'not-allowed' : 'pointer', padding: '4px', opacity: s.is_sub ? 0.6 : 1 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSurferIds.includes(s.id)}
                                                        onChange={() => !s.is_sub && toggleSurfer(s.id)}
                                                        disabled={s.is_sub}
                                                    />
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: s.is_sub ? '#854d0e' : 'inherit' }}>
                                                            {s.name} {s.gender && <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '500' }}>({s.gender})</span>} {s.is_sub && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 4px', borderRadius: '4px', background: '#fef08a', color: '#854d0e', marginLeft: '4px' }}>Not Participating</span>}
                                                        </span>
                                                        {s.session_time && (
                                                            <span style={{ fontSize: '10px', color: '#0D9488', fontWeight: '700' }}>
                                                                ⏰ {s.session_time}
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Select Surfers Section */}
                            <div className="form-group">
                                <label className="form-label">Select Competitors <span>*</span> ({selectedSurferIds.length}/{formData.surfer_count} selected)</label>
                                <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface-hover)' }}>
                                    {(() => {
                                        const modalSelectedEvent = events.find(e => String(e.id) === String(formData.event_id));
                                        const isModalSUP = (modalSelectedEvent?.event_type || '') === 'SUP Event';

                                        return selectedSurferIds.map((id) => {
                                            const surfer = allSurfers.find(s => s.id === id);
                                            const currentColor = surferColors[id];

                                            // Get all colors already assigned to other surfers
                                            const usedColors = Object.entries(surferColors)
                                                .filter(([surferId, color]) => surferId !== id)
                                                .map(([surferId, color]) => color);

                                            return (
                                                <div key={id} className="hm-surfer-color-row" style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '12px',
                                                    background: 'var(--surface-light)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-dim)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                                            {surfer?.name || id}
                                                        </span>
                                                    </div>

                                                    <div className="hm-color-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {isModalSUP ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Number (1-100):</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="100"
                                                                    className="form-control"
                                                                    value={currentColor || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 100)) {
                                                                            setSurferColors(prev => ({ ...prev, [id]: val }));
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        width: '70px',
                                                                        padding: '6px',
                                                                        fontSize: '13px',
                                                                        fontWeight: '800',
                                                                        textAlign: 'center',
                                                                        borderRadius: '6px',
                                                                        border: '1.5px solid var(--border-dim)',
                                                                        background: 'white',
                                                                        color: 'black'
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            /* Color Selector */
                                                            <div className="hm-color-swatches" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                <span className="hm-jersey-label" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '4px' }}>Select Jersey:</span>
                                                                {JERSEY_COLORS.map((color) => {
                                                                    const isUsed = usedColors.includes(color.hex);
                                                                    const isSelected = currentColor === color.hex;

                                                                    return (
                                                                        <div
                                                                            key={color.hex}
                                                                            onClick={() => {
                                                                                if (isSelected) {
                                                                                    // Deselect if already selected
                                                                                    setSurferColors(prev => {
                                                                                        const next = { ...prev };
                                                                                        delete next[id];
                                                                                        return next;
                                                                                    });
                                                                                } else if (!isUsed) {
                                                                                    // Select if not used by others
                                                                                    setSurferColors(prev => ({ ...prev, [id]: color.hex }));
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                width: '32px',
                                                                                height: '32px',
                                                                                borderRadius: '6px',
                                                                                background: color.hex,
                                                                                border: isSelected ? '3px solid var(--accent-blue)' : '2px solid var(--border-dim)',
                                                                                cursor: isUsed ? 'not-allowed' : 'pointer',
                                                                                transition: 'all 0.2s ease',
                                                                                boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                                                                                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                                                                opacity: isUsed ? 0.3 : 1,
                                                                                position: 'relative'
                                                                            }}
                                                                            title={isUsed ? `${color.name} (Already assigned)` : color.name}
                                                                        >
                                                                            {isUsed && (
                                                                                <div style={{
                                                                                    position: 'absolute',
                                                                                    top: '50%',
                                                                                    left: '50%',
                                                                                    transform: 'translate(-50%, -50%)',
                                                                                    fontSize: '18px',
                                                                                    fontWeight: 'bold',
                                                                                    color: color.hex === '#FFFFFF' || color.hex === '#FFFF00' ? '#000' : '#fff'
                                                                                }}>X</div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* Remove button */}
                                                        <X
                                                            size={18}
                                                            style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                                                            onClick={() => toggleSurfer(id)}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                    {selectedSurferIds.length === 0 && <span className="text-muted" style={{ fontSize: '13px', padding: '8px' }}>No competitors selected</span>}
                                </div>
                            </div>
                            </>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={() => {
                                setIsModalOpen(false);
                                setIsEditing(false);
                                setEditHeatId(null);
                            }} className="btn btn-secondary">Cancel</button>
                            <button type="submit" disabled={isSubmitting || (!isBreak && selectedSurferIds.length === 0)} className="btn btn-primary" style={{ padding: '10px 32px' }}>
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? (isBreak ? 'Update Break' : 'Update Heat') : (isBreak ? 'Create Break' : 'Create Heat'))}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Timer Modal */}
            {timerModal.isOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        backdropFilter: 'blur(8px)',
                        padding: '20px'
                    }}
                >
                    <form onSubmit={handleTimerStart} className="modal-content" style={{ maxWidth: '400px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)' }}>Set Start Timer</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Notify judges that {timerModal.heat?.round} Heat #{timerModal.heat?.heat_number} is starting.
                                </p>
                            </div>
                            <button type="button" onClick={() => setTimerModal({ ...timerModal, isOpen: false })} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="form-group">
                                <label className="form-label">Timer Duration (minutes)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    min="1"
                                    max="10"
                                    value={timerModal.duration}
                                    onChange={(e) => setTimerModal({ ...timerModal, duration: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" onClick={() => setTimerModal({ ...timerModal, isOpen: false })} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary">
                                <Clock size={16} />
                                Start Timer
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* View Heat Details Modal */}
            {viewHeat && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        backdropFilter: 'blur(8px)',
                        padding: '20px'
                    }}
                >
                    <div className="modal-content" style={{ maxWidth: '700px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-dark)' }}>{isVhBreak ? 'Break Details' : 'Heat Details'}</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {isVhBreak ? 'Details of the scheduled event break block' : 'Comprehensive view of the heat and assigned surfers'}
                                </p>
                            </div>
                            <button type="button" onClick={() => setViewHeat(null)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Heat Info Grid */}
                            <div className="hm-details-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                <div className="card" style={{ padding: '20px', background: 'var(--surface-hover)' }}>
                                    <div className="text-secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Event</div>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>{events.find(e => e.id === viewHeat.event_id)?.name || 'Unknown Event'}</div>
                                </div>
                                <div className="card" style={{ padding: '20px', background: 'var(--surface-hover)' }}>
                                    <div className="text-secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{isVhBreak ? 'Round / Break Name' : 'Round & Heat'}</div>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>{isVhBreak ? viewHeat.round : `${viewHeat.round} - Heat #${viewHeat.heat_number}`}</div>
                                </div>
                                <div className="card" style={{ padding: '20px', background: 'var(--surface-hover)' }}>
                                    <div className="text-secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Division</div>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>{formatDivisionName(viewHeat.division, events.find(e => e.id === viewHeat.event_id))}</div>
                                </div>
                                {/* SUP Category card — only for SUP events */}
                                {isVhSup && viewHeat.sup_category && !isVhBreak && (
                                    <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.25)' }}>
                                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', color: '#059669', fontWeight: '700' }}>SUP Category</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', background: '#10b981', color: 'white', borderRadius: '6px', padding: '3px 9px', letterSpacing: '0.5px' }}>SUP</span>
                                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#065f46' }}>{viewHeat.sup_category}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="card" style={{ padding: '20px', background: 'var(--surface-hover)' }}>
                                    <div className="text-secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Timing</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                        <Clock size={16} className="text-muted" />
                                        {getHeatTimingDisplay(viewHeat)}
                                    </div>
                                </div>
                                {!isVhBreak && (
                                    <div className="card hm-judges-card" style={{ padding: '20px', background: 'var(--surface-hover)', gridColumn: 'span 2' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <div className="text-secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Judges</div>
                                            {!isStudent && (
                                                <button
                                                    onClick={() => handleOpenJudgeAssignment(viewHeat)}
                                                    className="btn btn-primary"
                                                    style={{
                                                        padding: '6px 14px',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <Users size={14} />
                                                    {viewHeat.judges && viewHeat.judges.length > 0 ? 'Edit Assignments' : 'Assign Judge'}
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {viewHeat.judges && viewHeat.judges.filter(j => j.role === 'scoring').length > 0 ? (
                                                viewHeat.judges
                                                    .filter(j => j.role === 'scoring')
                                                    .map(j => (
                                                        <span key={j.id} className="badge badge-info" style={{ padding: '6px 12px' }}>
                                                            Judge #{j.judge_number}: {j.name}
                                                        </span>
                                                    ))
                                            ) : (
                                                <div className="text-muted" style={{ fontSize: '14px' }}>No scoring judges assigned to this heat</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Assigned Surfers */}
                            {!isVhBreak && (
                                <div>
                                    <h4 style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        marginBottom: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Users size={18} className="text-secondary" />
                                            <span style={{ color: 'var(--text-dark)' }}>Assigned Surfers ({viewHeat.surfers ? viewHeat.surfers.length : 0})</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {/* Swap Surfers Button */}
                                            {viewHeat.surfers && viewHeat.surfers.length > 0 && (
                                                <button
                                                    onClick={() => setSwapWizard({ isOpen: true, step: 1, surferA: null, targetHeat: null, surferB: null, isSwapping: false })}
                                                    disabled={viewHeat.status !== 'scheduled'}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '5px 12px',
                                                        background: viewHeat.status !== 'scheduled'
                                                            ? 'var(--border-dim)'
                                                            : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                                        color: viewHeat.status !== 'scheduled' ? 'var(--text-muted)' : 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        cursor: viewHeat.status !== 'scheduled' ? 'not-allowed' : 'pointer',
                                                        boxShadow: viewHeat.status !== 'scheduled' ? 'none' : '0 2px 6px rgba(124,58,237,0.35)',
                                                        letterSpacing: '0.01em',
                                                        opacity: viewHeat.status !== 'scheduled' ? 0.7 : 1
                                                    }}
                                                >
                                                    <ArrowLeftRight size={13} />
                                                    Swap Surfers
                                                </button>
                                            )}
                                            {viewHeat.round?.toLowerCase() === 'final' || viewHeat.round?.toLowerCase() === 'finals' ? (
                                                viewHeat.status === 'completed' && viewHeat.surfers && viewHeat.surfers.length > 0 && (
                                                    <div style={{
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: '#16a34a',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        background: 'rgba(22, 163, 74, 0.05)',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(22, 163, 74, 0.1)'
                                                    }}>
                                                        <Trophy size={16} />
                                                        Won by: {(() => {
                                                            const sorted = [...viewHeat.surfers].sort((a, b) => (a.rank || 99) - (b.rank || 99));
                                                            return sorted[0]?.name || 'N/A';
                                                        })()}
                                                    </div>
                                                )
                                            ) : (null)}
                                        </div>
                                    </h4>
                                    <div className="card hm-details-table-wrap" style={{ overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-dim)' }}>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{isVhSup ? 'Number' : 'Jersey'}</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>Name</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>Age</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>School</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>State</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {viewHeat.surfers && viewHeat.surfers.length > 0 ? (
                                                    viewHeat.surfers.map((surfer) => (
                                                        <tr key={surfer.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                                            <td style={{ padding: '12px 16px' }}>
                                                                {surfer.color ? (
                                                                    isVhSup ? (
                                                                        <div style={{
                                                                            width: '32px',
                                                                            height: '24px',
                                                                            borderRadius: '4px',
                                                                            background: '#E5E7EB',
                                                                            color: 'black',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontWeight: '800',
                                                                            fontSize: '13px',
                                                                            border: '1.5px solid #9CA3AF'
                                                                        }}>
                                                                            {surfer.color}
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{
                                                                            width: '24px',
                                                                            height: '24px',
                                                                            borderRadius: '4px',
                                                                            background: surfer.color,
                                                                            border: '1px solid var(--border-dim)',
                                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                                                        }} title={JERSEY_COLORS.find(c => c.hex === surfer.color)?.name || surfer.color} />
                                                                    )
                                                                ) : (
                                                                    <span className="text-muted" style={{ fontSize: '12px' }}>None</span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '50%',
                                                                    overflow: 'hidden',
                                                                    flexShrink: 0,
                                                                    border: '1.5px solid var(--border-dim)',
                                                                    background: 'var(--surface-hover)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}>
                                                                    {surfer.photo ? (
                                                                        <img src={surfer.photo} alt={surfer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        <User size={16} className="text-muted" />
                                                                    )}
                                                                </div>
                                                                <span style={{ color: 'var(--text-dark)' }}>{surfer.name}</span>
                                                            </div></td>
                                                            <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{surfer.age || '-'}</td>
                                                            <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{surfer.school_name || '-'}</td>
                                                            <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{surfer.state || '-'}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No surfers assigned</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Heat Configuration Summary */}
                            {events.find(e => e.id === viewHeat.event_id)?.event_type !== 'SUP Event' && !isVhBreak && (
                                <div className="card" style={{
                                    padding: '20px',
                                    background: 'var(--bg-light)',
                                    border: '1px solid var(--border-dim)',
                                    borderRadius: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                        <Settings size={16} />
                                        <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Heat Configuration Summary
                                        </h4>
                                    </div>

                                    {(() => {
                                        const event = events.find(e => e.id === viewHeat.event_id);
                                        const config = {
                                            min_score: viewHeat.min_score ?? event?.min_score ?? 0,
                                            max_score: viewHeat.max_score ?? event?.max_score ?? 10,
                                            score_decimals: viewHeat.score_decimals ?? event?.score_decimals ?? 1,
                                            judge_count: viewHeat.judge_count ?? event?.judge_count ?? 3,
                                            drop_high_low: viewHeat.drop_high_low !== null && viewHeat.drop_high_low !== undefined
                                                ? !!viewHeat.drop_high_low
                                                : (!!event?.drop_high_low),
                                            best_waves_count: viewHeat.best_waves_count ?? event?.best_waves_count ?? 2,
                                            max_waves: viewHeat.max_waves ?? event?.max_waves ?? 10
                                        };

                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px' }}>
                                                <SummaryItem
                                                    label="Score Range"
                                                    value={`${config.min_score} - ${config.max_score}`}
                                                    icon={<Trophy size={14} />}
                                                />
                                                <SummaryItem
                                                    label="Score Precision"
                                                    value={`${config.score_decimals} Dec.`}
                                                    icon={<ChevronRight size={14} />}
                                                />
                                                <SummaryItem
                                                    label="Judges Required"
                                                    value={config.judge_count}
                                                    icon={<AlertCircle size={14} />}
                                                />
                                                <SummaryItem
                                                    label="Drop Low & Highest"
                                                    value={config.drop_high_low ? 'Drop H/L' : 'Avg All'}
                                                    highlight={config.drop_high_low}
                                                    icon={<AlertCircle size={14} />}
                                                />
                                                <SummaryItem
                                                    label="Best & Total Waves"
                                                    value={`Best ${config.best_waves_count} of ${config.max_waves}`}
                                                    icon={<ChevronRight size={14} />}
                                                />
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer hm-details-footer" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {viewHeat.status === 'completed' && viewHeat.surfers && viewHeat.surfers.length > 0 && !isVhBreak && (
                                    <div className="hm-details-qualified" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        color: '#16a34a',
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(34, 197, 94, 0.2)',
                                        fontSize: '14px',
                                        fontWeight: '700'
                                    }}>
                                        {viewHeat.round?.toLowerCase() === 'final' || viewHeat.round?.toLowerCase() === 'finals' ? (
                                            <>
                                                <Trophy size={18} />
                                                <span>Winner: {(() => {
                                                    const sorted = [...viewHeat.surfers].sort((a, b) => (a.rank || 99) - (b.rank || 99));
                                                    return sorted[0]?.name || 'N/A';
                                                })()}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Award size={18} />
                                                <span>Qualified: {viewHeat.surfers.filter(s => !s.is_auto_eliminated).map(s => s.name).join(', ')}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="text-secondary" style={{ fontSize: '13px' }}>Status:</span>
                                    <span style={getStatusStyle((!viewHeat.start_time && (!viewHeat.status || viewHeat.status.toLowerCase() === 'scheduled')) ? 'unscheduled' : viewHeat.status)}>
                                        {(!viewHeat.start_time && (!viewHeat.status || viewHeat.status.toLowerCase() === 'scheduled')) ? 'unscheduled' : (viewHeat.status || 'Scheduled')}
                                    </span>
                                    {viewHeat.status === 'in-progress' && viewHeat.event_type !== 'SUP Event' && !isVhBreak && (
                                        <LiveHeatTimer heat={viewHeat} />
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={() => setViewHeat(null)} className="btn btn-secondary">Close</button>
                                    {!isStudent && (viewHeat.status === 'scheduled' || !viewHeat.status) && !isVhBreak && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    // Prevent opening modal if timer is already active
                                                    if (isTimerActive(viewHeat)) return;

                                                    // Check actual assigned judges (scoring role)
                                                    const assignedScoringJudges = viewHeat.judges ? viewHeat.judges.filter(j => j.role === 'scoring').length : 0;
                                                    if (assignedScoringJudges === 0) {
                                                        setCustomAlert({ message: 'Please assign judges to this heat first.' });
                                                        return;
                                                    }
                                                    setTimerModal({ isOpen: true, heat: viewHeat, duration: 2 });
                                                    setViewHeat(null);
                                                }}
                                                className={`btn ${isTimerActive(viewHeat) ? 'btn-timer-active' : 'btn-secondary'}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: isTimerActive(viewHeat) ? 'default' : 'pointer'
                                                }}
                                            >
                                                <Clock size={16} />
                                                {isTimerActive(viewHeat) ? 'Timer Active' : 'Set Timer'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleUpdateStatus(viewHeat.id, 'in-progress');
                                                }}
                                                className="btn btn-primary"
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                <Play size={16} fill="currentColor" />
                                                Start Heat
                                            </button>
                                        </>
                                    )}
                                    {!isStudent && viewHeat.status === 'in-progress' && !isVhBreak && (
                                        <button
                                            onClick={() => {
                                                setCustomConfirm({
                                                    message: "The heat is still in progress. Do you want to end the heat now?",
                                                    onConfirm: () => {
                                                        handleUpdateStatus(viewHeat.id, 'completed');
                                                        setViewHeat(null);
                                                        setCustomConfirm(null);
                                                    }
                                                });
                                            }}
                                            className="btn btn-primary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            <Check size={16} />
                                            Finish Heat
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div >
            )}

            {/* Swap Surfers Wizard Modal */}
            {swapWizard.isOpen && viewHeat && (() => {
                // Heats in the same round + division + event (excluding current heat)
                // Filter: Only show scheduled heats (not completed or live)
                const siblingHeats = heats.filter(h =>
                    h.id !== viewHeat.id &&
                    h.event_id === viewHeat.event_id &&
                    h.round === viewHeat.round &&
                    h.division === viewHeat.division &&
                    h.surfers && h.surfers.length > 0 &&
                    (h.status === 'scheduled' || !h.status)
                );

                const targetHeatSurfers = swapWizard.targetHeat
                    ? (heats.find(h => h.id === swapWizard.targetHeat.id)?.surfers || [])
                    : [];

                const stepLabels = ['Pick Surfer', 'Target Heat', 'Pick Swap Partner', 'Confirm'];

                const closeWizard = () => setSwapWizard({ isOpen: false, step: 1, surferA: null, targetHeat: null, surferB: null, isSwapping: false });
                const goBack = () => setSwapWizard(prev => ({ ...prev, step: prev.step - 1 }));

                return (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.92)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10001, backdropFilter: 'blur(10px)', padding: '20px'
                    }}>
                        <div className="modal-content" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
                            {/* Header */}
                            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-dim)', paddingBottom: '16px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ArrowLeftRight size={16} color="white" />
                                        </div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)' }}>Swap Surfers</h3>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {viewHeat.round} · Heat #{viewHeat.heat_number} · {formatDivisionName(viewHeat.division, events.find(e => e.id === viewHeat.event_id))}
                                    </p>
                                </div>
                                <button type="button" onClick={closeWizard} className="modal-close"><X size={20} /></button>
                            </div>

                            {/* Step Indicators */}
                            <div style={{ display: 'flex', gap: '4px', padding: '16px 24px 0' }}>
                                {stepLabels.map((label, idx) => {
                                    const stepNum = idx + 1;
                                    const isActive = swapWizard.step === stepNum;
                                    const isDone = swapWizard.step > stepNum;
                                    return (
                                        <div key={stepNum} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <div style={{
                                                width: '26px', height: '26px', borderRadius: '50%',
                                                background: isDone ? '#7c3aed' : isActive ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#e5e7eb',
                                                color: isDone || isActive ? 'white' : '#9ca3af',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '11px', fontWeight: '700', transition: 'all 0.2s'
                                            }}>
                                                {isDone ? <Check size={12} strokeWidth={3} /> : stepNum}
                                            </div>
                                            <span style={{ fontSize: '9px', fontWeight: '600', color: isActive ? '#7c3aed' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'center' }}>
                                                {label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Step Content */}
                            <div className="p-8" style={{ minHeight: '200px' }}>

                                {/* Step 1: Pick surfer from current heat */}
                                {swapWizard.step === 1 && (
                                    <div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                            Select which surfer from <strong>{viewHeat.round} Heat #{viewHeat.heat_number}</strong> you want to swap:
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {viewHeat.surfers.map(s => (
                                                <div key={s.id}
                                                    onClick={() => setSwapWizard(prev => ({ ...prev, surferA: { id: s.id, name: s.name, color: s.color }, step: 2 }))}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '12px',
                                                        padding: '12px 14px', borderRadius: '10px',
                                                        border: swapWizard.surferA?.id === s.id ? '2px solid #7c3aed' : '1px solid var(--border-dim)',
                                                        background: swapWizard.surferA?.id === s.id ? 'rgba(124,58,237,0.06)' : 'var(--surface-hover)',
                                                        cursor: 'pointer', transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {isVhSup ? (
                                                        <div style={{
                                                            width: '32px',
                                                            height: '22px',
                                                            borderRadius: '4px',
                                                            background: '#E5E7EB',
                                                            color: 'black',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: '800',
                                                            fontSize: '12px',
                                                            border: '1.5px solid #9CA3AF',
                                                            flexShrink: 0
                                                        }}>
                                                            {s.color}
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: s.color || 'var(--border-hover)', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                                                    )}
                                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)' }}>{s.name}</span>
                                                    {s.age && <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>Age {s.age}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Pick target heat */}
                                {swapWizard.step === 2 && (
                                    <div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                            Swapping <strong style={{ color: '#7c3aed' }}>{swapWizard.surferA?.name}</strong>. Select the target heat:
                                        </p>
                                        {siblingHeats.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                                No other heats in the same round &amp; division.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {siblingHeats.map(h => (
                                                    <div key={h.id}
                                                        onClick={() => setSwapWizard(prev => ({ ...prev, targetHeat: h, surferB: null, step: 3 }))}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            padding: '12px 14px', borderRadius: '10px',
                                                            border: swapWizard.targetHeat?.id === h.id ? '2px solid #7c3aed' : '1px solid var(--border-dim)',
                                                            background: swapWizard.targetHeat?.id === h.id ? 'rgba(124,58,237,0.06)' : 'var(--surface-hover)',
                                                            cursor: 'pointer', transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                                                Heat #{h.heat_number}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                                {h.surfers?.length} surfers · {h.status || 'scheduled'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Step 3: Pick surfer from target heat */}
                                {swapWizard.step === 3 && (
                                    <div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                            Select which surfer from <strong>Heat #{swapWizard.targetHeat?.heat_number}</strong> will come to take {swapWizard.surferA?.name}'s spot:
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {targetHeatSurfers.map(s => (
                                                <div key={s.id}
                                                    onClick={() => setSwapWizard(prev => ({ ...prev, surferB: { id: s.id, name: s.name, color: s.color }, step: 4 }))}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '12px',
                                                        padding: '12px 14px', borderRadius: '10px',
                                                        border: swapWizard.surferB?.id === s.id ? '2px solid #7c3aed' : '1px solid var(--border-dim)',
                                                        background: swapWizard.surferB?.id === s.id ? 'rgba(124,58,237,0.06)' : 'var(--surface-hover)',
                                                        cursor: 'pointer', transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {isVhSup ? (
                                                        <div style={{
                                                            width: '32px',
                                                            height: '22px',
                                                            borderRadius: '4px',
                                                            background: '#E5E7EB',
                                                            color: 'black',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: '800',
                                                            fontSize: '12px',
                                                            border: '1.5px solid #9CA3AF',
                                                            flexShrink: 0
                                                        }}>
                                                            {s.color}
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: s.color || 'var(--border-hover)', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                                                    )}
                                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)' }}>{s.name}</span>
                                                    {s.age && <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>Age {s.age}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Confirm */}
                                {swapWizard.step === 4 && swapWizard.surferA && swapWizard.surferB && (
                                    <div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', textAlign: 'center' }}>
                                            Review and confirm the surfer swap:
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                                            {/* Surfer A */}
                                            <div style={{ flex: 1, textAlign: 'center', padding: '16px', background: 'rgba(124,58,237,0.05)', borderRadius: '12px', border: '1px solid rgba(124,58,237,0.15)' }}>
                                                <div style={{ position: 'relative', width: '36px', height: '36px', margin: '0 auto 8px' }}>
                                                    {isVhSup ? (
                                                        <div style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '8px',
                                                            background: '#E5E7EB',
                                                            color: 'black',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: '900',
                                                            fontSize: '14px',
                                                            border: '1.5px solid #9CA3AF'
                                                        }}>
                                                            {swapWizard.surferA.color}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: swapWizard.surferA.color || 'var(--border-hover)', border: '1px solid rgba(0,0,0,0.1)', opacity: 0.3 }} />
                                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-dark)' }}>
                                                                <ArrowLeftRight size={14} />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)' }}>{swapWizard.surferA.name}</div>
                                                <p style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600', marginTop: '2px' }}>Moving to Heat #{swapWizard.targetHeat?.heat_number}</p>
                                            </div>

                                            {/* Arrow */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#7c3aed' }}>
                                                <ArrowLeftRight size={22} />
                                            </div>

                                            {/* Surfer B */}
                                            <div style={{ flex: 1, textAlign: 'center', padding: '16px', background: 'rgba(124,58,237,0.05)', borderRadius: '12px', border: '1px solid rgba(124,58,237,0.15)' }}>
                                                <div style={{ position: 'relative', width: '36px', height: '36px', margin: '0 auto 8px' }}>
                                                    {isVhSup ? (
                                                        <div style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '8px',
                                                            background: '#E5E7EB',
                                                            color: 'black',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: '900',
                                                            fontSize: '14px',
                                                            border: '1.5px solid #9CA3AF'
                                                        }}>
                                                            {swapWizard.surferB.color}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: swapWizard.surferB.color || 'var(--border-hover)', border: '1px solid rgba(0,0,0,0.1)', opacity: 0.3 }} />
                                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-dark)' }}>
                                                                <ArrowLeftRight size={14} />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)' }}>{swapWizard.surferB.name}</div>
                                                <p style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600', marginTop: '2px' }}>Moving to Heat #{viewHeat.heat_number}</p>
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '14px' }}>
                                            Only the surfers will be swapped. Jersey/numbers stay with their original heat slots.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer actions */}
                            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" onClick={closeWizard} className="btn btn-secondary">Cancel</button>
                                    {swapWizard.step > 1 && (
                                        <button type="button" onClick={goBack} className="btn btn-secondary">← Back</button>
                                    )}
                                </div>
                                {swapWizard.step === 4 && (
                                    <button
                                        type="button"
                                        onClick={handleSwapSurfers}
                                        disabled={swapWizard.isSwapping}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '10px 24px',
                                            background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                                            color: 'white', border: 'none', borderRadius: '10px',
                                            fontSize: '14px', fontWeight: '700', cursor: swapWizard.isSwapping ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 2px 8px rgba(124,58,237,0.4)'
                                        }}
                                    >
                                        {swapWizard.isSwapping ? <Loader2 className="animate-spin" size={18} /> : <ArrowLeftRight size={18} />}
                                        {swapWizard.isSwapping ? 'Swapping...' : 'Confirm Swap'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Judge Assignment Modal */}
            {
                isJudgeModalOpen && (
                    <div className="modal-overlay" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000, // Higher than other modals
                        backdropFilter: 'blur(8px)',
                        padding: '20px'
                    }}>
                        <div className="modal-content" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
                            <div className="modal-header">
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>Assign Judges</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Assigning judges to {viewHeat?.round} - Heat #{viewHeat?.heat_number}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setIsJudgeModalOpen(false)} className="modal-close">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <p className="text-muted" style={{ marginBottom: '8px', fontSize: '13px' }}>
                                    {viewHeat?.event_type === 'SUP Event'
                                        ? 'Choose which judges will score this SUP heat. Head Judge and Priority Judge are not required or assigned for SUP heats.'
                                        : 'Choose which judges will score this heat. Head Judge and Priority Judge are auto assigned for all heats.'}
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', marginBottom: '24px', padding: '4px' }}>
                                    {activeJudges
                                        .filter(j => j.role === 'scoring')
                                        .map(j => (
                                            <div
                                                key={j.id}
                                                onClick={() => toggleJudgeSelection(j.id)}
                                                style={{
                                                    padding: '16px',
                                                    borderRadius: '12px',
                                                    background: selectedJudgeIds.includes(j.id) ? 'var(--surface-hover)' : 'var(--surface-hover)',
                                                    border: selectedJudgeIds.includes(j.id) ? '2px solid var(--accent-blue)' : '1px solid var(--border-dim)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'between',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '8px',
                                                        background: 'var(--surface-hover)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <User size={20} style={{ color: selectedJudgeIds.includes(j.id) ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-dark)' }}>{j.name}</p>
                                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                            Judge #{j.judge_number}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '6px',
                                                    border: '2px solid',
                                                    borderColor: selectedJudgeIds.includes(j.id) ? 'var(--accent-blue)' : 'var(--border-dim)',
                                                    background: selectedJudgeIds.includes(j.id) ? 'var(--accent-blue)' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {selectedJudgeIds.includes(j.id) && <Check size={16} strokeWidth={3} style={{ color: 'white' }} />}
                                                </div>
                                            </div>
                                        ))}
                                    {activeJudges.filter(j => j.role === 'scoring').length === 0 && (
                                        <p className="text-muted" style={{ padding: '20px', textAlign: 'center' }}>No active scoring judges found.</p>
                                    )}
                                </div>

                                <div className="modal-footer" style={{ padding: 0, marginTop: '12px' }}>
                                    <button type="button" onClick={() => setIsJudgeModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                    <button
                                        type="button"
                                        onClick={handleBatchAssignJudges}
                                        className="btn btn-primary"
                                        disabled={isAssigningJudges}
                                        style={{ flex: 1, padding: '12px' }}
                                    >
                                        {isAssigningJudges ? <Loader2 className="animate-spin" size={20} /> : 'Confirm Assignment'}                                 </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Share Live Heat Modal */}
            {shareModal.isOpen && shareModal.heat && (
                <ShareLiveHeatModal
                    heat={shareModal.heat}
                    events={events}
                    onClose={() => setShareModal({ isOpen: false, heat: null })}
                />
            )}
        </>
    );
};

// ─── Share Live Heat Modal ───────────────────────────────────────────────────
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

const truncateName = (name) => {
    if (!name) return "";
    return name.length > 10 ? name.substring(0, 10) + '...' : name;
};

const ShareLiveHeatModal = ({ heat, events, onClose }) => {
    const [copied, setCopied] = React.useState(false);
    const [sharing, setSharing] = React.useState(false);
    const heatCardRef = useRef(null);

    const event = events.find(e => String(e.id) === String(heat.event_id));
    const eventSlug = event?.slug || event?.id || '';
    const baseUrl = window.location.origin;

    const displayDivision = formatDivisionName(heat.division, event);

    const isSupEvent = heat.event_type === 'SUP Event' || event?.event_type === 'SUP Event';
    const supCatParam = isSupEvent && heat.sup_category ? `&supCat=${encodeURIComponent(heat.sup_category)}` : '';

    // Direct viewer link (for internal use)
    const viewerLink = `${baseUrl}/viewer/${eventSlug}/${encodeURIComponent(heat.division || '')}?liveHeat=${encodeURIComponent(heat.id || '')}${supCatParam}`;

    // OG share link — routes through /api/watch/ so WhatsApp/Facebook show the dynamic heat card image
    const ogShareLink = `${baseUrl}/api/watch/${eventSlug}?division=${encodeURIComponent(heat.division || '')}&heat=${heat.heat_number || ''}&heatId=${encodeURIComponent(heat.id || '')}${supCatParam}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(ogShareLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const shareMessage = `🏄 Watch LIVE! ${event?.name || 'Surf Event'} — Heat #${heat.heat_number} (${displayDivision}) is live now!\n${ogShareLink}`;

    const handleWhatsApp = async () => {
        if (sharing) return;
        setSharing(true);
        try {
            await shareHeatCardAsImage(heatCardRef.current, {
                filename: `heat-${heat.heat_number || 'live'}.png`,
                text: shareMessage,
                title: `Heat #${heat.heat_number} — ${displayDivision}`,
            });
        } catch (err) {
            console.error('Share failed:', err);
            // Last-resort fallback: open WhatsApp with text only.
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
        } finally {
            setSharing(false);
        }
    };
    const handleFacebook = async () => {
        if (sharing) return;
        setSharing(true);
        try {
            await shareHeatCardAsImage(heatCardRef.current, {
                filename: `heat-${heat.heat_number || 'live'}.png`,
                text: shareMessage,
                title: `Heat #${heat.heat_number} — ${displayDivision}`,
                fallbackUrl: 'https://www.facebook.com/',
            });
        } catch (err) {
            console.error('Facebook share failed:', err);
            window.open(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ogShareLink)}`,
                'facebook-share-dialog',
                'width=580,height=450,left=200,top=100'
            );
        } finally {
            setSharing(false);
        }
    };
    const handleInstagram = async () => {
        if (sharing) return;
        setSharing(true);
        try {
            // Copy link to clipboard so user can paste it as an Instagram Link Sticker
            await navigator.clipboard.writeText(ogShareLink).catch(() => { });
            await shareHeatCardAsImage(heatCardRef.current, {
                filename: `heat-${heat.heat_number || 'live'}.png`,
                text: shareMessage,
                title: `Heat #${heat.heat_number} — ${displayDivision}`,
                fallbackUrl: 'https://www.instagram.com/',
            });
        } catch (err) {
            console.error('Instagram share failed:', err);
            navigator.clipboard.writeText(ogShareLink).catch(() => { });
            window.open('https://www.instagram.com/', '_blank');
        } finally {
            setSharing(false);
        }
    };

    const surfers = heat.surfers || [];

    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        // Inject Google Fonts if not already present
        if (!document.getElementById('share-modal-fonts')) {
            const link = document.createElement('link');
            link.id = 'share-modal-fonts';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&display=swap';
            document.head.appendChild(link);
        }
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(10,20,40,0.88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10000, backdropFilter: 'blur(10px)', padding: '20px'
            }}
        >
            <div style={{
                background: 'var(--surface-light)',
                borderRadius: '22px',
                width: '100%',
                maxWidth: '460px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
                overflow: 'hidden',
                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
            }}>
                {/* ── Header ── */}
                <div style={{
                    padding: '18px 22px 15px',
                    borderBottom: '1px solid #f0f4f8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        <h3 style={{
                            margin: 0,
                            fontSize: '17px',
                            fontWeight: '800',
                            color: '#0d1b2a',
                            letterSpacing: '-0.3px',
                            fontFamily: "'Inter', sans-serif"
                        }}>Share Live Heat</h3>
                        <p style={{
                            margin: '3px 0 0',
                            fontSize: '12px',
                            color: '#7a8fa6',
                            fontWeight: '500',
                            fontFamily: "'Inter', sans-serif"
                        }}>{displayDivision} — Heat #{heat.heat_number}</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--border-dim)',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Heat Preview Card ── */}
                <div style={{ padding: '16px 20px 0' }}>
                    <div id="heat-card" ref={heatCardRef} style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        position: 'relative',
                        minHeight: '190px',
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}>
                        {/* Dark overlay for readability */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, rgba(4,30,66,0.82) 0%, rgba(2,20,50,0.65) 60%, rgba(0,10,30,0.55) 100%)'
                        }} />

                        {/* Card content */}
                        <div style={{ position: 'relative', zIndex: 1, padding: '16px 16px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            {/* ── Banner (Always Top Left) ── */}
                            {event?.banner_image && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', maxHeight: '48px', marginBottom: '8px' }}>
                                    <img src={event.banner_image} alt="Event banner" style={{ maxHeight: '48px', maxWidth: '100%', width: 'auto', objectFit: 'contain', display: 'block' }} />
                                </div>
                            )}

                            {/* ── Main Content Row (Side-by-Side) ── */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', marginTop: event?.banner_image ? 'auto' : '0', paddingBottom: '12px' }}>
                                {/* Left: Event & Heat Details */}
                                <div style={{ flex: 1, color: 'white', minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '12px', fontWeight: '800', textTransform: 'uppercase',
                                        letterSpacing: '0.6px', color: '#7dd3fc', fontFamily: "'Inter', sans-serif",
                                        maxWidth: '220px', lineHeight: '1.3', textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                        marginBottom: '10px'
                                    }}>{event?.name || 'Surf Event'}</div>

                                    {/* Event Type Badge */}
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        background: isSupEvent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(14, 165, 233, 0.2)',
                                        color: isSupEvent ? '#34d399' : '#38bdf8',
                                        border: isSupEvent ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(14, 165, 233, 0.3)',
                                        padding: '4px 10px',
                                        borderRadius: '30px',
                                        fontSize: '10.5px',
                                        fontWeight: '800',
                                        letterSpacing: '0.5px',
                                        textTransform: 'uppercase',
                                        marginBottom: '10px',
                                        fontFamily: "'Inter', sans-serif",
                                        width: 'fit-content',
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        {isSupEvent
                                            ? (() => {
                                                const cat = heat?.sup_category || 'Sprint';
                                                const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
                                                return `SUP - ${formattedCat}`;
                                              })()
                                            : 'Surfing'
                                        }
                                    </div>

                                    {!(heat.round && heat.round.toLowerCase() === 'final') && (
                                        <div style={{
                                            fontSize: '14px', fontWeight: '800', textTransform: 'uppercase',
                                            letterSpacing: '1.2px', color: '#00eccdff', marginBottom: '2px',
                                            fontFamily: "'Inter', sans-serif"
                                        }}>{heat.round}</div>
                                    )}
                                    <div style={{
                                        fontSize: heat.round && heat.round.toLowerCase() === 'final' ? '48px' : '40px',
                                        fontWeight: '900', lineHeight: 1, marginBottom: '2px',
                                        color: '#ffffff', fontFamily: "'Bebas Neue', 'Impact', 'Arial Black', sans-serif",
                                        letterSpacing: '1px', textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                    }}>{heat.round && heat.round.toLowerCase() === 'final' ? 'FINAL' : `Heat ${heat.heat_number}`}</div>
                                    <div style={{
                                        fontSize: '13px', fontWeight: '600', color: '#7dd3fc',
                                        fontFamily: "'Inter', sans-serif", letterSpacing: '0.1px'
                                    }}>{displayDivision}</div>
                                </div>

                                {/* Right: Score Card */}
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.97)', borderRadius: '12px',
                                        padding: '10px 12px', minWidth: '200px', maxWidth: '215px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', paddingBottom: '5px', borderBottom: '1px solid #e8f0fb' }}>
                                            <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Inter', sans-serif" }}>Rank · Athlete</span>
                                            <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Inter', sans-serif" }}>{isSupEvent ? "Time(MM:Sec)" : "Total"}</span>
                                        </div>
                                        {surfers.length === 0 ? (
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0', fontFamily: "'Inter', sans-serif" }}>No surfers</div>
                                        ) : (
                                            surfers.slice(0, 5).map((s, i) => (
                                                <div key={s.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 0',
                                                    borderBottom: i < surfers.slice(0, 5).length - 1 ? '1px solid var(--bg-light)' : 'none'
                                                }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#334155', minWidth: '12px', fontFamily: "'Inter', sans-serif" }}>{i + 1}</span>
                                                    {isSupEvent ? (
                                                        <div style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '50%',
                                                            background: '#E5E7EB',
                                                            color: 'black',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: '800',
                                                            fontSize: '10px',
                                                            border: '1px solid #9CA3AF',
                                                            flexShrink: 0
                                                        }}>
                                                            {s.color}
                                                        </div>
                                                    ) : (
                                                        <div style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            borderRadius: '50%',
                                                            background: s.color || 'var(--text-muted)',
                                                            border: '2px solid rgba(0,0,0,0.12)',
                                                            flexShrink: 0,
                                                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                                                        }} />
                                                    )}
                                                    <span style={{
                                                        fontSize: '11px', fontWeight: '600', color: 'var(--text-dark)',
                                                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif"
                                                    }}>{truncateName(s.name)}</span>
                                                    <span style={{
                                                        fontSize: isSupEvent ? '10px' : '11px',
                                                        fontWeight: '700',
                                                        color: 'var(--text-dark)',
                                                        fontFamily: isSupEvent ? 'monospace' : "'Inter', sans-serif",
                                                        letterSpacing: isSupEvent ? '-0.2px' : 'normal'
                                                    }}>
                                                        {isSupEvent
                                                            ? (() => {
                                                                const ms = s.total_score || 0;
                                                                if (!ms) return '—';
                                                                const tot = Math.floor(ms / 1000);
                                                                const m = Math.floor(tot / 60);
                                                                const sec = tot % 60;
                                                                const cs = Math.floor((ms % 1000) / 10);
                                                                const mStr = String(m).padStart(2, '0');
                                                                const sStr = String(sec).padStart(2, '0');
                                                                const csStr = String(cs).padStart(2, '0');
                                                                return `${mStr}:${sStr}.${csStr} sec`;
                                                              })()
                                                            : (s.total_score || 0).toFixed(2)
                                                        }
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    
                                    {/* Title Sponsors Below Score Card */}
                                    {event?.title_sponsors && (() => {
                                        let ts = [];
                                        try { ts = typeof event.title_sponsors === 'string' ? JSON.parse(event.title_sponsors) : event.title_sponsors; } catch (e) {}
                                        if (!Array.isArray(ts) || ts.length === 0) return null;
                                        return (
                                            <div style={{
                                                marginTop: '8px',
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                gap: '8px',
                                                flexWrap: 'wrap'
                                            }}>
                                                {ts.map((sponsor, idx) => (
                                                    sponsor.image ? (
                                                        <img key={idx} src={sponsor.image} alt={sponsor.name} title={sponsor.name} style={{ height: '24px', width: 'auto', maxWidth: '60px', objectFit: 'contain', borderRadius: '4px', background: 'rgba(255,255,255,0.9)', padding: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                                                    ) : null
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Footer bar */}
                        <div style={{
                            position: 'relative',
                            zIndex: 1,
                            background: 'rgba(0,0,0,0.45)',
                            padding: '8px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '16px'
                        }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.88)',
                                fontSize: '9.5px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '1.2px',
                                fontFamily: "'Inter', sans-serif"
                            }}>AQUATIC X SPORTS | The Ultimate Surf Competition</span>
                            <span style={{
                                background: 'linear-gradient(90deg, #0ea5e9, #0284c7)',
                                color: 'white',
                                fontSize: '9px',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.6px',
                                fontFamily: "'Inter', sans-serif",
                                whiteSpace: 'nowrap'
                            }}>Watch Live Scores</span>
                        </div>
                    </div>
                </div>

                {/* ── Viewer Link ── */}
                <div style={{ padding: '16px 20px 0' }}>
                    <label style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#374151',
                        display: 'block',
                        marginBottom: '8px',
                        letterSpacing: '0.2px',
                        fontFamily: "'Inter', sans-serif"
                    }}>Viewer Link</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            readOnly
                            value={ogShareLink}
                            style={{
                                flex: 1,
                                padding: '9px 12px',
                                fontSize: '12px',
                                border: '1.5px solid var(--border-dim)',
                                borderRadius: '10px',
                                color: 'var(--text-gray)',
                                background: 'var(--bg-light)',
                                outline: 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Inter', monospace",
                                fontWeight: '500'
                            }}
                        />
                        <button
                            onClick={handleCopy}
                            style={{
                                padding: '9px 16px',
                                background: copied ? '#22c55e' : '#0d1b2a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'background 0.2s',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Inter', sans-serif",
                                letterSpacing: '0.2px'
                            }}
                        >
                            {copied ? <><CheckIcon size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                        </button>
                    </div>
                </div>

                {/* ── Social Share ── */}
                <div style={{ padding: '16px 20px 22px', textAlign: 'center' }}>
                    <p style={{
                        margin: '0 0 14px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#7a8fa6',
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: '0.3px'
                    }}>Or Share Directly Via</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        {/* WhatsApp */}
                        <button
                            onClick={handleWhatsApp}
                            disabled={sharing}
                            title="Share heat card image on WhatsApp"
                            style={{
                                width: '52px', height: '52px', borderRadius: '50%',
                                background: '#25D366', border: 'none',
                                cursor: sharing ? 'wait' : 'pointer',
                                opacity: sharing ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 14px rgba(37,211,102,0.4)',
                                transition: 'transform 0.15s, box-shadow 0.15s'
                            }}
                            onMouseEnter={e => { if (!sharing) { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,211,102,0.55)'; } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,211,102,0.4)'; }}
                        >
                            {sharing ? (
                                <Loader2 size={22} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            )}
                        </button>
                        {/* Facebook */}
                        <button
                            onClick={handleFacebook}
                            title="Share on Facebook"
                            style={{
                                width: '52px', height: '52px', borderRadius: '50%',
                                background: '#1877F2', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 14px rgba(24,119,242,0.4)',
                                transition: 'transform 0.15s, box-shadow 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(24,119,242,0.55)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(24,119,242,0.4)'; }}
                        >
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </button>
                        {/* Instagram */}
                        <button
                            onClick={handleInstagram}
                            title="Share on Instagram"
                            style={{
                                width: '52px', height: '52px', borderRadius: '50%',
                                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 14px rgba(220,39,67,0.4)',
                                transition: 'transform 0.15s, box-shadow 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(220,39,67,0.55)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(220,39,67,0.4)'; }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper component for live timer
const LiveHeatTimer = ({ heat, serverTimeOffset }) => {
    const [remaining, setRemaining] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            if (heat.status === 'completed') {
                setRemaining('00:00');
                setIsExpired(true);
                return;
            }
            if (!heat.actual_start_time) {
                setRemaining(`${(heat.duration || 30).toString().padStart(2, '0')}:00`);
                setIsExpired(false);
                return;
            }
            const startTime = new Date(heat.actual_start_time).getTime();
            const now = Date.now() + (serverTimeOffset || 0);

            if (now < startTime) {
                // Negative countdown phase
                const diff = Math.ceil((startTime - now) / 1000);
                setRemaining(`-0:${diff.toString().padStart(2, '0')}`);
                setIsExpired(false);
            } else {
                const durationMs = (heat.duration || 30) * 60 * 1000;
                const endTime = startTime + durationMs;
                const diff = endTime - now;

                if (diff <= 0) {
                    setRemaining('00:00');
                    setIsExpired(true);
                } else {
                    const minutes = Math.floor(diff / 60000);
                    const seconds = Math.floor((diff % 60000) / 1000);
                    setRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                    setIsExpired(false);
                }
            }
        };

        const interval = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(interval);
    }, [heat, serverTimeOffset]);

    return (
        <span style={{
            marginLeft: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: '800',
            color: isExpired ? '#ef4444' : '#000000ff', // Red if expired, Blue if active
            background: isExpired ? 'rgba(239, 68, 68, 0.08)' : 'rgba(22, 93, 245, 0.21)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.2)' : 'rgba(9, 107, 255, 1)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            {remaining}
        </span>
    );
};

export default HeatManagement;
