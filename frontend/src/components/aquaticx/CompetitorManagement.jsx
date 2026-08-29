import React, { useState, useEffect, useRef } from 'react';
import './aquaticx.css';
import { Plus, Search, User, X, Loader2, AlertCircle, Trash2, Edit, FileText, ChevronDown, Upload, ArrowRightLeft, ClipboardCopy, Link2, CheckCheck, HelpCircle, Download } from 'lucide-react';
import { useToast } from './ToastContext';
import * as XLSX from 'xlsx';
import axios from 'axios';

const API_BASE = 'http://54.84.243.251/api';

const POINTS_TABLE = {
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

const getPointsForRank = (rank) => {
    if (rank in POINTS_TABLE) return POINTS_TABLE[rank];
    return 2;
};

const getRankForPoints = (points) => {
    if (!points) return '';
    const entry = Object.entries(POINTS_TABLE).find(([r, p]) => p === points);
    return entry ? entry[0] : '';
};

// Global cache for instant tab-switching
let globalCompetitorCache = {
    surfers: [],
    events: [],
    hasLoaded: false
};

const formatDivisionName = (name, eventOrEvents = null) => {
    if (!name) return name;
    
    if (Array.isArray(eventOrEvents)) {
        for (const ev of eventOrEvents) {
            if (ev && ev.division_aliases) {
                try {
                    const aliases = typeof ev.division_aliases === 'string' ? JSON.parse(ev.division_aliases) : ev.division_aliases;
                    if (aliases && aliases[name] && aliases[name].trim() !== '') {
                        return aliases[name];
                    }
                } catch (e) {}
            }
        }
        return name;
    }

    const event = eventOrEvents;
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

const CompetitorManagement = () => {
    const { showToast } = useToast();
    const [surfers, setSurfers] = useState(globalCompetitorCache.surfers);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(!globalCompetitorCache.hasLoaded);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSurfer, setEditingSurfer] = useState(null);
    const [genderFilter, setGenderFilter] = useState('All');
    const [ageFilter, setAgeFilter] = useState('All');
    const [schoolFilter, setSchoolFilter] = useState('All');
    const [divisionFilter, setDivisionFilter] = useState('All');
    const [selectedSurferIds, setSelectedSurferIds] = useState(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);
    const dropdownRef = useRef(null);

    // Slot & Date Filters for Competitors
    const [slotFilter, setSlotFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [isSchoolSyncModalOpen, setIsSchoolSyncModalOpen] = useState(false);
    const [schoolStudents, setSchoolStudents] = useState([]);
    const [isLoadingSchoolStudents, setIsLoadingSchoolStudents] = useState(false);
    const [selectedSchoolStudentIds, setSelectedSchoolStudentIds] = useState(new Set());
    const [syncSlotFilter, setSyncSlotFilter] = useState('All');
    const [syncDateFilter, setSyncDateFilter] = useState('All');
    const [isSyncingToEvent, setIsSyncingToEvent] = useState(false);

    // Event filter
    const [events, setEvents] = useState(globalCompetitorCache.events);
    const [eventFilter, setEventFilter] = useState('All');
    const [eventSurferIds, setEventSurferIds] = useState(null); // null = not filtered
    // Stores { [surferId]: surferDataFromEventEndpoint } so we get event-scoped is_assigned
    const [eventSurfersMap, setEventSurfersMap] = useState({});

    // Extract unique schools for filtering
    const schools = [...new Set(surfers.map(s => s.school_name).filter(Boolean))].sort();

    // Extract unique divisions for filtering
    const divisionsList = React.useMemo(() => {
        if (eventFilter !== 'All') {
            const selectedEvent = events.find(e => String(e.id) === String(eventFilter));
            if (selectedEvent && selectedEvent.divisions) {
                try {
                    const parsed = typeof selectedEvent.divisions === 'string' ? JSON.parse(selectedEvent.divisions) : selectedEvent.divisions;
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed.sort();
                } catch(e) {}
            }
        }
        
        const baseSurfers = eventSurferIds === null ? surfers : surfers.filter(s => eventSurferIds.has(s.id));
        return [...new Set(baseSurfers.flatMap(s => {
            try { return typeof s.divisions === 'string' ? JSON.parse(s.divisions) : (Array.isArray(s.divisions) ? s.divisions : []); }
            catch(e) { return []; }
        }).filter(Boolean))].sort();
    }, [eventFilter, events, surfers, eventSurferIds]);

    // Extract unique available dates configured across competitors / students
    const availableDates = React.useMemo(() => {
        const dates = new Set();
        surfers.forEach(s => {
            if (s.start_date && s.start_date.trim()) dates.add(s.start_date.trim());
        });
        return Array.from(dates).sort();
    }, [surfers]);

    // Extract unique available session slots for the selected date (or all dates)
    const availableSlots = React.useMemo(() => {
        const slots = new Set();
        surfers.forEach(s => {
            if (dateFilter === 'All' || s.start_date === dateFilter) {
                if (s.session_time && s.session_time.trim()) {
                    slots.add(s.session_time.trim());
                }
            }
        });
        return Array.from(slots).sort();
    }, [surfers, dateFilter]);

    const getSlotIcon = (slot) => {
        const s = (slot || '').toLowerCase();
        if (s.includes('dawn') || s.includes('6:') || s.includes('06:')) return '🌅';
        if (s.includes('morning') || s.includes('8:') || s.includes('9:') || s.includes('08:') || s.includes('09:')) return '☀️';
        if (s.includes('sunset') || s.includes('4:') || s.includes('04:') || s.includes('5:') || s.includes('evening') || s.includes('pm')) return '🌇';
        return '⏰';
    };

    // Import states
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const cancelImportRef = useRef(false);
    const fileInputRef = useRef(null);

    // Import from event states
    const [isImportEventModalOpen, setIsImportEventModalOpen] = useState(false);
    const [importFromEventId, setImportFromEventId] = useState('');
    const [importToEventId, setImportToEventId] = useState('');
    const [isImportingFromEvent, setIsImportingFromEvent] = useState(false);

    // Import Options Modal state
    const [isImportSettingsModalOpen, setIsImportSettingsModalOpen] = useState(false);

    // Registration Form Modal state
    const [isRegFormModalOpen, setIsRegFormModalOpen] = useState(false);
    const [regFormEventId, setRegFormEventId] = useState('');
    const [isRegLinkModalOpen, setIsRegLinkModalOpen] = useState(false);
    const [customConfirm, setCustomConfirm] = useState(null);
    const [regFormLink, setRegFormLink] = useState('');
    const [regLinkCopied, setRegLinkCopied] = useState(false);
    const [regFormIsExisting, setRegFormIsExisting] = useState(false);

    // Registered Surfers (pending queue) modal
    const [isRegSurfersModalOpen, setIsRegSurfersModalOpen] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [regSurfersLoading, setRegSurfersLoading] = useState(false);
    const [regActionLoading, setRegActionLoading] = useState(''); // regId being processed
    const [isClosingForm, setIsClosingForm] = useState(false);

    // Persist created reg forms and tokens in localStorage (per admin)
    const getCreatedRegForms = () => {
        const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
        const key = `reg_forms_${adminInfo.adminId || 'admin'}`;
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(data)) return {}; // ignore legacy arrays
            return data || {};
        } catch { return {}; }
    };
    const [createdRegForms, setCreatedRegForms] = useState(() => getCreatedRegForms());
    const saveCreatedRegForm = (eventId, token) => {
        const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
        const key = `reg_forms_${adminInfo.adminId || 'admin'}`;
        const updated = { ...createdRegForms, [String(eventId)]: token };
        localStorage.setItem(key, JSON.stringify(updated));
        setCreatedRegForms(updated);
    };
    const removeCreatedRegForm = (eventId) => {
        const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
        const key = `reg_forms_${adminInfo.adminId || 'admin'}`;
        const updated = { ...createdRegForms };
        delete updated[String(eventId)];
        localStorage.setItem(key, JSON.stringify(updated));
        setCreatedRegForms(updated);
    };

    const [eventPointsMap, setEventPointsMap] = useState({});

    // Upcoming (Draft) or Heat Drawn events for registration form
    const upcomingEvents = events.filter(ev => ['Draft', 'Heat Drawn'].includes(ev.status));

    // Manual Import states
    const [isManualImportModalOpen, setIsManualImportModalOpen] = useState(false);
    const [manualImportEventId, setManualImportEventId] = useState('');
    const [manualImportSelectedSurferIds, setManualImportSelectedSurferIds] = useState(new Set());
    const [isManualImporting, setIsManualImporting] = useState(false);
    const [manualImportedSurferIdsForSelectedEvent, setManualImportedSurferIdsForSelectedEvent] = useState(new Set());
    const [manualImportGenderFilter, setManualImportGenderFilter] = useState('All');

    // Reset gender filter when manual import modal is closed
    useEffect(() => {
        if (!isManualImportModalOpen) {
            setManualImportGenderFilter('All');
        }
    }, [isManualImportModalOpen]);

    // Form state
    const [formData, setFormData] = useState({
        name: '', school_name: '', age: '', dob: '', gender: '', state: '', email: '', phone: '', sup_categories: [], manual_seed_points: 0, manual_seed_rank: '', photo: null
    });

    useEffect(() => {
        fetchSurfers(globalCompetitorCache.hasLoaded);
        fetchEvents(globalCompetitorCache.hasLoaded);

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsSchoolDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch already imported surfers when manual import event changes
    useEffect(() => {
        const fetchManualImportEventSurfers = async () => {
            if (!manualImportEventId) {
                setManualImportedSurferIdsForSelectedEvent(new Set());
                return;
            }
            try {
                const res = await axios.get(`${API_BASE}/events/${manualImportEventId}/surfers`);
                if (res.data) {
                    setManualImportedSurferIdsForSelectedEvent(new Set(res.data.map(s => s.id)));
                } else {
                    setManualImportedSurferIdsForSelectedEvent(new Set());
                }
            } catch (err) {
                setManualImportedSurferIdsForSelectedEvent(new Set());
            }
        };
        fetchManualImportEventSurfers();
        setManualImportSelectedSurferIds(new Set()); // Reset selections on event change
    }, [manualImportEventId]);

    const fetchSurfers = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';
            const response = await axios.get(`${API_BASE}/surfers`, { params: { admin_id: adminId } });
            setSurfers(response.data);
            
            globalCompetitorCache.surfers = response.data;
            globalCompetitorCache.hasLoaded = true;
            
            setError(null);
        } catch (err) {
            console.error('Error fetching surfers:', err);
            setError('Failed to load surfers.');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleOpenSchoolSyncModal = async () => {
        setIsSchoolSyncModalOpen(true);
        setIsLoadingSchoolStudents(true);
        try {
            const SURF_API = import.meta.env.VITE_API_URL || 'http://54.242.160.238:8000';
            const res = await fetch(`${SURF_API}/api/students`);
            if (res.ok) {
                const data = await res.json();
                const studentList = Array.isArray(data) ? data : [];
                setSchoolStudents(studentList);
                setSelectedSchoolStudentIds(new Set(studentList.map(s => s.id)));
            }
        } catch (err) {
            console.error('Error fetching school students', err);
            showToast('Failed to load booked students', 'error');
        } finally {
            setIsLoadingSchoolStudents(false);
        }
    };

    const handleImportSchoolStudentsSubmit = async () => {
        if (selectedSchoolStudentIds.size === 0) {
            showToast('Please select at least one student', 'warning');
            return;
        }
        setIsSyncingToEvent(true);
        try {
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';
            const chosen = schoolStudents.filter(s => selectedSchoolStudentIds.has(s.id));
            let importedCount = 0;
            for (const st of chosen) {
                const payload = {
                    name: st.name,
                    school_name: st.school || 'Aquatic Indica Surf School',
                    age: st.age || 20,
                    gender: st.gender || 'Male',
                    state: 'Tamil Nadu',
                    email: st.email || '',
                    phone: st.whatsapp_number || '',
                    session_time: st.session_time || 'Morning 6:30 AM',
                    start_date: st.start_date || new Date().toISOString().split('T')[0],
                    admin_id: adminId
                };
                try {
                    const res = await axios.post(`${API_BASE}/surfers`, payload);
                    if (res.data && eventFilter !== 'All') {
                        await axios.post(`${API_BASE}/events/${eventFilter}/manual-import`, {
                            surfer_ids: [res.data.id]
                        }).catch(() => {});
                    }
                    importedCount++;
                } catch(e) {}
            }
            showToast(`Successfully imported ${importedCount} booked students into Competitors!`, 'success');
            setIsSchoolSyncModalOpen(false);
            fetchSurfers();
            if (eventFilter !== 'All') handleEventFilterChange(eventFilter);
        } catch (err) {
            showToast('Failed to import students', 'error');
        } finally {
            setIsSyncingToEvent(false);
        }
    };

    const handleManualImportSubmit = async () => {
        if (!manualImportEventId || manualImportSelectedSurferIds.size === 0) return;
        try {
            setIsManualImporting(true);
            const response = await axios.post(`${API_BASE}/events/${manualImportEventId}/manual-import`, {
                surfer_ids: Array.from(manualImportSelectedSurferIds)
            });
            showToast(`Successfully imported ${response.data.count} competitors!`, 'success');
            setIsManualImportModalOpen(false);
            await handleEventFilterChange(manualImportEventId);
            setEventFilter(manualImportEventId);
        } catch (err) {
            console.error('Manual import error:', err);
            showToast('Failed to manual import competitors.', 'error');
        } finally {
            setIsManualImporting(false);
        }
    };

    const toggleManualImportSelection = (surferId) => {
        const next = new Set(manualImportSelectedSurferIds);
        if (next.has(surferId)) {
            next.delete(surferId);
        } else {
            next.add(surferId);
        }
        setManualImportSelectedSurferIds(next);
    };

    const fetchEvents = async (silent = false) => {
        try {
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';
            const response = await axios.get(`${API_BASE}/events`, { params: { admin_id: adminId } });
            setEvents(response.data);
            
            globalCompetitorCache.events = response.data;

            // Sync registration forms state from backend
            const syncedForms = {};
            response.data.forEach(ev => {
                if (ev.registration_open === 1 && ev.registration_token) {
                    syncedForms[String(ev.id)] = ev.registration_token;
                }
            });
            const key = `reg_forms_${adminId}`;
            localStorage.setItem(key, JSON.stringify(syncedForms));
            setCreatedRegForms(syncedForms);
        } catch (err) {
            console.error('Error fetching events:', err);
        }
    };

    const handleEventFilterChange = async (selectedEventId) => {
        setEventFilter(selectedEventId);
        if (selectedEventId === 'All') {
            setEventSurferIds(null);
            setEventSurfersMap({});
            setEventPointsMap({});
            return;
        }
        try {
            // Get surfers from event_surfers table (event-scoped is_assigned)
            const importedRes = await axios.get(`${API_BASE}/events/${selectedEventId}/surfers`);
            let ids = new Set();
            let map = {};
            
            if (importedRes.data && importedRes.data.length > 0) {
                ids = new Set(importedRes.data.map(s => s.id));
                importedRes.data.forEach(s => { map[s.id] = s; });
            }

            // Always fetch heats for the selected event to compute points
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';
            const response = await axios.get(`${API_BASE}/heats`, { params: { event_id: selectedEventId, admin_id: adminId } });
            const heats = response.data || [];

            // If importedRes was empty, use fallback from heats
            if (ids.size === 0) {
                heats.forEach(heat => {
                    if (heat.surfers && Array.isArray(heat.surfers)) {
                        heat.surfers.forEach(s => {
                            ids.add(s.id);
                            map[s.id] = { ...s, is_assigned: 1 };
                        });
                    }
                });
            }

            setEventSurferIds(ids);
            setEventSurfersMap(map);

            // Compute event points
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

            // Uses global getPointsForRank helper

            const selectedEvent = events.find(e => String(e.id) === String(selectedEventId));
            const pointsMap = {};

            if (selectedEvent?.is_series === 1 && events.length > 0) {
                // Trace root parent
                let rootId = selectedEvent.id;
                let visited = new Set();
                let current = selectedEvent;
                while (current && current.series_parent_id && !visited.has(current.series_parent_id)) {
                    visited.add(current.id);
                    const parent = events.find(e => e.id === current.series_parent_id);
                    if (parent) {
                        rootId = parent.id;
                        current = parent;
                    } else break;
                }

                // Get all events in this series
                const getRootIdOf = (ev) => {
                    let curr = ev;
                    let v = new Set();
                    while (curr && curr.series_parent_id && !v.has(curr.series_parent_id)) {
                        v.add(curr.id);
                        const parent = events.find(e => e.id === curr.series_parent_id);
                        if (parent) curr = parent;
                        else break;
                    }
                    return curr.id;
                };

                const seriesEvents = events.filter(ev => getRootIdOf(ev) === rootId);
                
                // Fetch heats for all events in series
                const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
                const adminId = adminInfo.adminId || 'admin';
                const heatsPromises = seriesEvents.map(ev => 
                    axios.get(`${API_BASE}/heats`, { params: { event_id: ev.id, admin_id: adminId } })
                        .catch(() => ({ data: [] }))
                );
                const heatsResponses = await Promise.all(heatsPromises);
                
                // Group heats by event
                const heatsByEvent = {};
                seriesEvents.forEach((ev, i) => {
                    heatsByEvent[ev.id] = heatsResponses[i].data || [];
                });

                Object.entries(heatsByEvent).forEach(([eventId, eventHeats]) => {
                    const surferEventRanks = {};
                    eventHeats.forEach(h => {
                        const roundWeight = getRoundWeight(h.round || '');
                        if (Array.isArray(h.surfers)) {
                            h.surfers.forEach(s => {
                                if (!s || !s.id) return;
                                const existing = surferEventRanks[s.id];
                                if (!existing || roundWeight > existing.roundWeight) {
                                    surferEventRanks[s.id] = {
                                        id: s.id,
                                        heatRank: s.rank || 4,
                                        totalScore: s.total_score || 0,
                                        roundWeight: roundWeight
                                    };
                                }
                            });
                        }
                    });

                    const sorted = Object.values(surferEventRanks).sort((a, b) => {
                        if (b.roundWeight !== a.roundWeight) return b.roundWeight - a.roundWeight;
                        if (a.heatRank !== b.heatRank) return a.heatRank - b.heatRank;
                        return b.totalScore - a.totalScore;
                    });

                    let currentRank = 1;
                    let lastAthlete = null;
                    sorted.forEach((athlete, index) => {
                        if (lastAthlete === null) {
                            athlete.finalRank = 1;
                        } else {
                            let isTied = athlete.roundWeight === lastAthlete.roundWeight &&
                                         athlete.heatRank === lastAthlete.heatRank &&
                                         athlete.totalScore === lastAthlete.totalScore;
                            if (!isTied) currentRank = index + 1;
                            athlete.finalRank = currentRank;
                        }
                        lastAthlete = athlete;
                        
                        const pts = getPointsForRank(athlete.finalRank);
                        pointsMap[athlete.id] = (pointsMap[athlete.id] || 0) + pts;
                    });
                });
            } else {
                // Not a series, just use current event's heats
                const surferEventRanks = {};
                
                // Fetch heats for the selected event to compute points
                const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
                const adminId = adminInfo.adminId || 'admin';
                const response = await axios.get(`${API_BASE}/heats`, { params: { event_id: selectedEventId, admin_id: adminId } });
                const currentHeats = response.data || [];

                currentHeats.forEach(h => {
                    const roundWeight = getRoundWeight(h.round || '');
                    if (Array.isArray(h.surfers)) {
                        h.surfers.forEach(s => {
                            if (!s || !s.id) return;
                            const existing = surferEventRanks[s.id];
                            if (!existing || roundWeight > existing.roundWeight) {
                                surferEventRanks[s.id] = {
                                    id: s.id,
                                    heatRank: s.rank || 4,
                                    totalScore: s.total_score || 0,
                                    roundWeight: roundWeight
                                };
                            }
                        });
                    }
                });

                const sorted = Object.values(surferEventRanks).sort((a, b) => {
                    if (b.roundWeight !== a.roundWeight) return b.roundWeight - a.roundWeight;
                    if (a.heatRank !== b.heatRank) return a.heatRank - b.heatRank;
                    return b.totalScore - a.totalScore;
                });

                let currentRank = 1;
                let lastAthlete = null;
                sorted.forEach((athlete, index) => {
                    if (lastAthlete === null) {
                        athlete.finalRank = 1;
                    } else {
                        let isTied = athlete.roundWeight === lastAthlete.roundWeight &&
                                     athlete.heatRank === lastAthlete.heatRank &&
                                     athlete.totalScore === lastAthlete.totalScore;
                        if (!isTied) currentRank = index + 1;
                        athlete.finalRank = currentRank;
                    }
                    lastAthlete = athlete;
                    pointsMap[athlete.id] = getPointsForRank(athlete.finalRank);
                });
            }

            setEventPointsMap(pointsMap);

        } catch (err) {
            console.error('Error fetching heats for event filter:', err);
            setEventSurferIds(new Set());
            setEventSurfersMap({});
            setEventPointsMap({});
        }
    };

    const handleOpenModal = (surfer = null) => {
        if (surfer) {
            setEditingSurfer(surfer);

            // parse sup categories safely if stringified
            let parsedCategories = surfer.sup_categories || [];
            if (typeof parsedCategories === 'string') {
                try {
                    parsedCategories = JSON.parse(parsedCategories);
                } catch(e) { parsedCategories = [surfer.sup_categories]; }
            }
            if (!Array.isArray(parsedCategories)) parsedCategories = [parsedCategories].filter(Boolean);

            setFormData({
                name: surfer.name || '',
                school_name: surfer.school_name || '',
                age: surfer.age || '',
                dob: surfer.dob || '',
                gender: surfer.gender || '',
                state: surfer.state || '',
                email: surfer.email || '',
                phone: surfer.phone || '',
                sup_categories: parsedCategories,
                manual_seed_points: surfer.manual_seed_points || 0,
                manual_seed_rank: surfer.manual_seed_points ? getRankForPoints(surfer.manual_seed_points) : '',
                photo: surfer.photo || null
            });
        } else {
            setEditingSurfer(null);
            setFormData({ name: '', school_name: '', age: '', dob: '', gender: '', state: '', email: '', phone: '', sup_categories: [], manual_seed_points: 0, manual_seed_rank: '', photo: null });
        }
        setIsModalOpen(true);
    };

    const handleInlineManualPointsChange = async (surferId, newValue) => {
        const val = parseInt(newValue, 10);
        if (isNaN(val) || val < 0) return;
        try {
            setSurfers(prev => prev.map(s => s.id === surferId ? { ...s, manual_seed_points: val } : s));
            const surferToUpdate = surfers.find(s => s.id === surferId);
            if (surferToUpdate) {
                await axios.put(`${API_BASE}/surfers/${surferId}`, { ...surferToUpdate, manual_seed_points: val });
            }
        } catch (err) {
            console.error('Failed to update inline points', err);
            showToast('Failed to update points', 'error');
        }
    };

    const handleAddSurfer = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);

            // Check for duplicate name
            const isDuplicate = surfers.some(s =>
                s.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
                (!editingSurfer || s.id !== editingSurfer.id)
            );

            if (isDuplicate) {
                showToast(`Already ${formData.name} is registered`, 'error');
                setIsSubmitting(false);
                return;
            }

            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const adminId = adminInfo.adminId || 'admin';
            const { manual_seed_rank, ...cleanFormData } = formData;
            const payload = { ...cleanFormData, admin_id: adminId };

            if (editingSurfer) {
                // Optimistic update
                setSurfers(prev => prev.map(s => s.id === editingSurfer.id ? { ...s, ...payload } : s));
                await axios.put(`${API_BASE}/surfers/${editingSurfer.id}`, payload);
                showToast('Competitor updated successfully', 'success');
            } else {
                const res = await axios.post(`${API_BASE}/surfers`, payload);
                const newSurferId = res.data?.id;

                // Optimistic add
                if (res.data) {
                    setSurfers(prev => [...prev, res.data]);
                }

                // If an event is selected in the filter, auto-link the new surfer to that event
                if (eventFilter !== 'All' && newSurferId) {
                    try {
                        await axios.post(`${API_BASE}/events/${eventFilter}/manual-import`, {
                            surfer_ids: [newSurferId]
                        });
                        showToast(`Competitor added and linked to the selected event!`, 'success');
                    } catch (linkErr) {
                        console.error('Failed to link competitor to event:', linkErr);
                        showToast('Competitor created but failed to link to event.', 'warning');
                    }
                } else {
                    showToast('Competitor created successfully', 'success');
                }
            }

            setIsModalOpen(false);
            setFormData({ name: '', school_name: '', age: '', dob: '', gender: '', state: '', email: '', phone: '', sup_categories: [], manual_seed_points: 0, manual_seed_rank: '', photo: null });
            setEditingSurfer(null);
            
            // Sync silently
            fetchSurfers(true);

            // Refresh the event filter view so the new surfer appears immediately
            if (eventFilter !== 'All') {
                await handleEventFilterChange(eventFilter);
            }
        } catch (err) {
            console.error('Error saving surfer:', err);
            fetchSurfers(true); // Revert optimistic changes
            showToast(`Failed to ${editingSurfer ? 'update' : 'add'} surfer.`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate type
        const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.type)) {
            showToast('Only .jpg, .jpeg, or .png files are allowed.', 'error');
            e.target.value = '';
            return;
        }
        // Validate size (5 MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Photo must be under 5 MB.', 'error');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result }));
        reader.readAsDataURL(file);
    };

    const handleDeleteSurfer = async (id) => {
        if (eventFilter !== 'All') {
            // Event filter is active: remove surfer from event roster only (not from DB)
            setCustomConfirm({
                message: 'Remove this competitor from the selected event? The competitor will remain in the global database.',
                onConfirm: async () => {
                    setCustomConfirm(null);
                    try {
                        await axios.delete(`${API_BASE}/events/${eventFilter}/surfers/${id}`);
                        showToast('Competitor removed from event', 'success');
                        fetchSurfers(true); // Silent sync
                        await handleEventFilterChange(eventFilter);
                    } catch (err) {
                        const msg = err.response?.data?.error || 'Failed to remove competitor from event.';
                        showToast(msg, 'error');
                    }
                }
            });
        } else {
            // No event filter: delete from global DB
            setCustomConfirm({
                message: 'Are you sure you want to permanently delete this competitor?',
                onConfirm: async () => {
                    setCustomConfirm(null);
                    // Optimistic delete
                    setSurfers(prev => prev.filter(s => s.id !== id));
                    
                    try {
                        await axios.delete(`${API_BASE}/surfers/${id}`);
                        showToast('Competitor deleted successfully', 'success');
                        fetchSurfers(true); // Silent sync
                    } catch (err) {
                        console.error('Error deleting surfer:', err);
                        fetchSurfers(true); // Revert
                        showToast('Failed to delete surfer.', 'error');
                    }
                }
            });
        }
    };

    const handleToggleActive = async (surfer) => {
        // Optimistically update local state for instant feedback
        setSurfers(prev => prev.map(s =>
            s.id === surfer.id ? { ...s, is_active: s.is_active === 1 ? 0 : 1 } : s
        ));
        try {
            await axios.patch(`${API_BASE}/surfers/${surfer.id}/toggle-active`);
        } catch (err) {
            console.error('Error toggling competitor status:', err);
            showToast('Failed to update competitor status.', 'error');
            // Revert on error
            setSurfers(prev => prev.map(s =>
                s.id === surfer.id ? { ...s, is_active: surfer.is_active } : s
            ));
        }
    };

    // Sort the surfers to preserve original backend order but still apply filters
    const filteredSurfers = [...surfers].filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.school_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesGender = genderFilter === 'All' || s.gender === genderFilter;
        const matchesSchool = schoolFilter === 'All' || s.school_name === schoolFilter;
        const matchesDivision = divisionFilter === 'All' || ( (() => {
            try {
                const divs = typeof s.divisions === 'string' ? JSON.parse(s.divisions) : s.divisions;
                return Array.isArray(divs) && divs.includes(divisionFilter);
            } catch(e) { return false; }
        })() );

        // Event filter
        const matchesEvent = eventFilter === 'All' || (s.event_id && String(s.event_id) === String(eventFilter));

        // Age filtering logic
        let matchesAge = true;
        if (ageFilter === 'Under 14') {
            matchesAge = s.age <= 14;
        } else if (ageFilter === 'Under 18') {
            matchesAge = s.age <= 18;
        }

        // Slot filter (configured session slots)
        let matchesSlot = true;
        if (slotFilter !== 'All') {
            const sSlot = (s.session_time || '').trim().toLowerCase();
            const fSlot = slotFilter.trim().toLowerCase();
            matchesSlot = sSlot === fSlot || sSlot.includes(fSlot) || fSlot.includes(sSlot);
        }

        // Date filter (configured start dates)
        let matchesDate = true;
        if (dateFilter !== 'All') {
            matchesDate = s.start_date === dateFilter;
        }

        return matchesSearch && matchesGender && matchesSchool && matchesAge && matchesEvent && matchesDivision && matchesSlot && matchesDate;
    }).sort((a, b) => {
        const aPts = (a.manual_seed_points && a.manual_seed_points > 0) ? a.manual_seed_points : ((eventFilter !== 'All' ? eventPointsMap[a.id] : null) ?? 0);
        const bPts = (b.manual_seed_points && b.manual_seed_points > 0) ? b.manual_seed_points : ((eventFilter !== 'All' ? eventPointsMap[b.id] : null) ?? 0);
        if (bPts !== aPts) return bPts - aPts; // Highest points first
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    let currentRank = 1;
    let currentPoints = null;
    const surfersWithRanks = filteredSurfers.map((s, index) => {
        const pts = (s.manual_seed_points && s.manual_seed_points > 0) ? s.manual_seed_points : ((eventFilter !== 'All' ? eventPointsMap[s.id] : null) ?? 0);
        if (currentPoints === null) {
            currentPoints = pts;
        } else if (pts < currentPoints) {
            currentRank = index + 1;
            currentPoints = pts;
        }
        return { ...s, displayRank: currentRank, displayPoints: pts };
    });

    const handleToggleSurferSelection = (id) => {
        const next = new Set(selectedSurferIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedSurferIds(next);
    };

    const handleToggleAllSurfers = () => {
        if (selectedSurferIds.size === surfersWithRanks.length && surfersWithRanks.length > 0) {
            setSelectedSurferIds(new Set());
        } else {
            setSelectedSurferIds(new Set(surfersWithRanks.map(s => s.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedSurferIds.size === 0) return;
        
        if (eventFilter !== 'All') {
            setCustomConfirm({
                message: `Remove ${selectedSurferIds.size} competitors from the selected event? They will remain in the global database.`,
                onConfirm: async () => {
                    setCustomConfirm(null);
                    setIsDeletingBulk(true);
                    try {
                        const promises = Array.from(selectedSurferIds).map(id => 
                            axios.delete(`${API_BASE}/events/${eventFilter}/surfers/${id}`)
                        );
                        await Promise.all(promises);
                        showToast(`Removed ${selectedSurferIds.size} competitors from event`, 'success');
                        setSelectedSurferIds(new Set());
                        fetchSurfers(true);
                        await handleEventFilterChange(eventFilter);
                    } catch (err) {
                        showToast('Failed to remove some competitors from event.', 'error');
                    } finally {
                        setIsDeletingBulk(false);
                    }
                }
            });
        } else {
            setCustomConfirm({
                message: `Are you sure you want to permanently delete ${selectedSurferIds.size} competitors?`,
                onConfirm: async () => {
                    setCustomConfirm(null);
                    setIsDeletingBulk(true);
                    
                    // Optimistic delete
                    setSurfers(prev => prev.filter(s => !selectedSurferIds.has(s.id)));
                    
                    try {
                        const promises = Array.from(selectedSurferIds).map(id => 
                            axios.delete(`${API_BASE}/surfers/${id}`)
                        );
                        await Promise.all(promises);
                        showToast(`Deleted ${selectedSurferIds.size} competitors successfully`, 'success');
                        setSelectedSurferIds(new Set());
                        fetchSurfers(true);
                    } catch (err) {
                        console.error('Error deleting bulk surfers:', err);
                        fetchSurfers(true); // Revert
                        showToast('Failed to delete some competitors.', 'error');
                    } finally {
                        setIsDeletingBulk(false);
                    }
                }
            });
        }
    };

    const handleImportClick = () => {
        setIsImportModalOpen(true);
        // Reset file input if valid
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            // Map columns gracefully (case-insensitive search)
            const mappedData = data.map(row => {
                const keys = Object.keys(row);
                // Helper to find the matching key, handle undefined safely
                const findKey = (...searches) => {
                    for (let s of searches) {
                        const found = keys.find(k => k.toLowerCase().includes(s));
                        if (found !== undefined) return found;
                    }
                    return null;
                };

                const nameKey = findKey('name', 'surfer');
                const schoolKey = findKey('school', 'team', 'club');
                const ageKey = findKey('age', 'years');
                const genderKey = findKey('gender', 'sex', 'category');
                const stateKey = findKey('state', 'region', 'prov');

                return {
                    name: nameKey ? row[nameKey] : '',
                    school_name: schoolKey ? row[schoolKey] : '',
                    age: ageKey ? row[ageKey] : '',
                    gender: genderKey ? row[genderKey] : '',
                    state: stateKey ? row[stateKey] : ''
                };
            }).filter(item => item.name && String(item.name).trim() !== '');

            if (mappedData.length === 0) {
                showToast('No valid data found in file. Ensure the Excel has a "Name" column.', 'error');
                return;
            }

            startImport(mappedData);
        };
        reader.readAsBinaryString(file);
    };

    const startImport = async (dataToImport) => {
        setIsImporting(true);
        cancelImportRef.current = false;
        setImportProgress({ current: 0, total: dataToImport.length });

        let successCount = 0;
        const newSurferIds = [];
        const existingNames = new Set(surfers.map(s => s.name?.toLowerCase().trim()));

        for (let i = 0; i < dataToImport.length; i++) {
            if (cancelImportRef.current) {
                showToast('Import cancelled by user.', 'info');
                break;
            }

            const surfer = dataToImport[i];
            const nameKey = String(surfer.name).toLowerCase().trim();

            try {
                if (!existingNames.has(nameKey)) {
                    const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
                    const adminId = adminInfo.adminId || 'admin';
                    const res = await axios.post(`${API_BASE}/surfers`, { ...surfer, admin_id: adminId });
                    existingNames.add(nameKey);
                    successCount++;
                    if (res.data?.id) newSurferIds.push(res.data.id);
                } else {
                    // Surfer already exists — still collect their ID to link to the event
                    const existing = surfers.find(s => s.name?.toLowerCase().trim() === nameKey);
                    if (existing?.id) newSurferIds.push(existing.id);
                }
            } catch (err) {
                console.error('Failed to import surfer:', surfer.name, err);
            }

            // Update progress
            setImportProgress({ current: i + 1, total: dataToImport.length });
        }

        // If an event is selected in the filter, link all new surfers to that event
        if (eventFilter !== 'All' && newSurferIds.length > 0) {
            try {
                await axios.post(`${API_BASE}/events/${eventFilter}/manual-import`, { surfer_ids: newSurferIds });
            } catch (err) {
                console.error('Failed to link imported surfers to event:', err);
            }
        }

        setIsImporting(false);
        setIsImportModalOpen(false);

        if (successCount > 0) {
            showToast(`Successfully imported ${successCount} new competitors.`, 'success');
        } else if (!cancelImportRef.current && newSurferIds.length > 0) {
            showToast(`${newSurferIds.length} competitors linked to the event.`, 'success');
        } else if (!cancelImportRef.current) {
            showToast('No competitors found to import.', 'info');
        }

        await fetchSurfers();
        // Refresh event filter so newly imported surfers appear immediately
        if (eventFilter !== 'All') {
            await handleEventFilterChange(eventFilter);
        }
    };

    const handleOpenImportEventModal = () => {
        setImportFromEventId('');
        setImportToEventId('');
        setIsImportEventModalOpen(true);
    };

    const handleImportFromEvent = async () => {
        if (!importFromEventId || !importToEventId) {
            showToast('Please select both From Event and To Event.', 'error');
            return;
        }
        if (importFromEventId === importToEventId) {
            showToast('Source and destination events must be different.', 'error');
            return;
        }
        try {
            setIsImportingFromEvent(true);
            const response = await axios.post(`${API_BASE}/events/${importToEventId}/import-surfers`, {
                from_event_id: importFromEventId
            });
            showToast(`Successfully imported ${response.data.count} competitors to the destination event!`, 'success');
            setIsImportEventModalOpen(false);
            // Auto-apply filter to the destination event
            await handleEventFilterChange(importToEventId);
            setEventFilter(importToEventId);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to import competitors from event.';
            showToast(msg, 'error');
        } finally {
            setIsImportingFromEvent(false);
        }
    };

    const fetchRegistrations = async (eventId) => {
        if (!eventId || eventId === 'All') { setRegistrations([]); return; }
        try {
            setRegSurfersLoading(true);
            const res = await axios.get(`${API_BASE}/events/${eventId}/registrations`);
            setRegistrations(res.data);
        } catch { setRegistrations([]); }
        finally { setRegSurfersLoading(false); }
    };
    const selectedEventObj = events.find(e => String(e.id) === String(eventFilter));
    const isSUPEvent = selectedEventObj?.event_type === 'SUP Event';

    return (
        <>
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
                <div className="cm-page-header flex items-center justify-between">
                    <div className="cm-page-title">
                        <h2 style={{ fontSize: '30px', fontWeight: '700', letterSpacing: '-0.5px' }}>Competitor Management</h2>
                        <p className="text-secondary" style={{ marginTop: '4px' }}>Manage competitor profiles and assignments</p>
                    </div>
                    <div className="cm-action-buttons flex items-center gap-3">
                        <button
                            onClick={handleOpenSchoolSyncModal}
                            className="btn btn-secondary"
                            style={{ background: 'linear-gradient(135deg, rgba(0,242,254,0.12) 0%, rgba(14,165,233,0.08) 100%)', borderColor: 'rgba(0,242,254,0.4)', color: '#0284C7', fontWeight: '700' }}
                        >
                            <span>🏄 Import Booked Students</span>
                        </button>
                        <button
                            onClick={() => setIsImportSettingsModalOpen(true)}
                            className="btn btn-secondary"
                        >
                            <ArrowRightLeft size={20} />
                            Import Competitors
                        </button>
                        <button
                            onClick={() => { setRegFormEventId(''); setIsRegFormModalOpen(true); }}
                            className="btn btn-secondary"
                            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.08) 100%)', borderColor: 'rgba(139,92,246,0.35)', color: 'var(--text-dark)' }}
                        >
                            <Link2 size={20} />
                            Create Reg Forms
                        </button>
                        <button onClick={() => handleOpenModal()} className="btn btn-primary">
                            <Plus size={20} />
                            Add Competitor
                        </button>
                    </div>
                </div>

                {/* Event Filter Dropdown and Actions */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Select Event</label>
                        <select
                            className="form-control"
                            style={{ padding: '8px 16px' }}
                            value={eventFilter}
                            onChange={(e) => {
                                handleEventFilterChange(e.target.value);
                                fetchRegistrations(e.target.value);
                            }}
                        >
                            <option value="All">All Events</option>
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {eventFilter !== 'All' && (
                            <button
                                type="button"
                                onClick={() => { fetchRegistrations(eventFilter); setIsRegSurfersModalOpen(true); }}
                                className="btn"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 16px', borderRadius: '10px', border: 'none',
                                    background: 'rgba(99,102,241,0.12)',
                                    color: '#6366f1',
                                    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                View Registered Surfers
                                {registrations.filter(r => r.status === 'pending').length > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-6px',
                                        right: '-6px',
                                        background: '#ef4444',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        height: '20px',
                                        minWidth: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '10px',
                                        padding: '0 5px',
                                        boxShadow: '0 2px 4px rgba(239,68,68,0.4)',
                                        border: '2px solid #fff'
                                    }}>
                                        {registrations.filter(r => r.status === 'pending').length}
                                    </span>
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                fetchEvents();
                                fetchSurfers();
                                if (eventFilter !== 'All') fetchRegistrations(eventFilter);
                            }}
                            className="btn btn-secondary"
                            title="Refresh Data"
                            style={{ padding: '10px' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        </button>
                    </div>
                </div>

                {/* Session Slot & Date Quick Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginRight: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session Slots</span>
                        <button
                            type="button"
                            onClick={() => setSlotFilter('All')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                border: slotFilter === 'All' ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                                background: slotFilter === 'All' ? '#0D9488' : '#F8FAFC',
                                color: slotFilter === 'All' ? '#FFFFFF' : '#64748B',
                                fontSize: '12px',
                                fontWeight: slotFilter === 'All' ? '700' : '600',
                                cursor: 'pointer',
                                boxShadow: slotFilter === 'All' ? '0 2px 8px rgba(13,148,136,0.2)' : 'none',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span>🌊</span>
                            <span>All Slots</span>
                        </button>
                        {availableSlots.map(slot => {
                            const isSelected = slotFilter === slot;
                            return (
                                <button
                                    key={slot}
                                    type="button"
                                    onClick={() => setSlotFilter(slot)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                                        background: isSelected ? '#0D9488' : '#F8FAFC',
                                        color: isSelected ? '#FFFFFF' : '#64748B',
                                        fontSize: '12px',
                                        fontWeight: isSelected ? '700' : '600',
                                        cursor: 'pointer',
                                        boxShadow: isSelected ? '0 2px 8px rgba(13,148,136,0.2)' : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <span>{getSlotIcon(slot)}</span>
                                    <span>{slot}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Date:</span>
                        <select
                            style={{ height: '32px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', padding: '0 10px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', outline: 'none', cursor: 'pointer' }}
                            value={dateFilter}
                            onChange={e => {
                                setDateFilter(e.target.value);
                                setSlotFilter('All');
                            }}
                        >
                            <option value="All">All Dates</option>
                            {availableDates.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="card">
                    <div className="cm-card-header card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                        <div className="cm-search-wrap" style={{ position: 'relative', flex: 1 }}>
                            <Search
                                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                                size={18}
                            />
                            <input
                                type="text"
                                placeholder="Search by Name, School, State..."
                                className="input-search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="cm-filters-row" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <select
                                className="form-control cm-gender-select"
                                style={{
                                    height: '45px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}
                                value={genderFilter}
                                onChange={(e) => setGenderFilter(e.target.value)}
                            >
                                <option value="All">All Genders</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>



                            <select
                                className="form-control cm-division-select"
                                style={{
                                    height: '45px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}
                                value={divisionFilter}
                                onChange={(e) => setDivisionFilter(e.target.value)}
                            >
                                <option value="All">All Sections</option>
                                {divisionsList.map(div => (
                                    <option key={div} value={div}>
                                        {formatDivisionName(div, eventFilter !== 'All' ? events.find(e => String(e.id) === String(eventFilter)) : events)}
                                    </option>
                                ))}
                            </select>

                            {!isSelectionMode ? (
                                <button
                                    onClick={() => setIsSelectionMode(true)}
                                    className="btn btn-secondary"
                                    style={{ height: '45px' }}
                                >
                                    <CheckCheck size={20} />
                                    Select
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsSelectionMode(false);
                                        setSelectedSurferIds(new Set());
                                    }}
                                    className="btn btn-secondary"
                                    style={{ height: '45px' }}
                                >
                                    <X size={20} />
                                    Cancel
                                </button>
                            )}
                            {isSelectionMode && selectedSurferIds.size > 0 && (
                                <button 
                                    onClick={handleBulkDelete} 
                                    className="btn" 
                                    style={{ background: '#ef4444', color: 'white', border: 'none', height: '45px' }}
                                    disabled={isDeletingBulk}
                                >
                                    {isDeletingBulk ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                    Delete ({selectedSurferIds.size})
                                </button>
                            )}

                            <span className="text-muted cm-surfer-count" style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                {surfersWithRanks.length} competitors
                            </span>

                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-blue)' }} />
                            <p className="text-secondary">Loading competitors...</p>
                        </div>
                    ) : surfersWithRanks.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {isSelectionMode && (
                                            <th style={{ width: '40px', textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={surfersWithRanks.length > 0 && selectedSurferIds.size === surfersWithRanks.length}
                                                    onChange={handleToggleAllSurfers}
                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                />
                                            </th>
                                        )}
                                        <th>Name</th>
                                        {eventFilter !== 'All' && <th>PTS</th>}
                                        {eventFilter === 'All' && <th>Event Imported</th>}
                                        <th>School</th>
                                        <th>Session Slot</th>
                                        <th>Booking Date</th>
                                        <th>Age</th>
                                        <th>Gender</th>
                                        <th>Sections</th>
                                        {isSUPEvent && <th>SUP Category</th>}
                                        <th>State</th>
                                        <th style={{ textAlign: 'center', width: '180px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {surfersWithRanks.map((s, index) => (
                                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-dim)', background: selectedSurferIds.has(s.id) ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                                            {isSelectionMode && (
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedSurferIds.has(s.id)}
                                                        onChange={() => handleToggleSurferSelection(s.id)}
                                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                    />
                                                </td>
                                            )}
                                            <td style={{ padding: '12px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    {/* Avatar circle */}
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '50%',
                                                        overflow: 'hidden', flexShrink: 0,
                                                        border: '2px solid var(--border-dim)',
                                                        background: 'var(--surface-hover)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {s.photo
                                                            ? <img src={s.photo} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                                                        }
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{s.name}</span>
                                                        {eventFilter !== 'All' && (
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>
                                                                    <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700', paddingLeft: '2px' }}>#</span>
                                                                    <input
                                                                        type="number"
                                                                        key={s.id + '-rank-' + (s.manual_seed_points || 0)}
                                                                        defaultValue={getRankForPoints(s.manual_seed_points || 0) || s.displayRank}
                                                                        onBlur={(e) => {
                                                                            const rVal = e.target.value ? parseInt(e.target.value, 10) : '';
                                                                            const pVal = rVal ? getPointsForRank(rVal) : 0;
                                                                            if (pVal !== (s.manual_seed_points || 0)) {
                                                                                handleInlineManualPointsChange(s.id, pVal);
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            outline: 'none',
                                                                            color: '#3b82f6',
                                                                            fontSize: '11px',
                                                                            fontWeight: '700',
                                                                            width: '24px',
                                                                            padding: '0',
                                                                            margin: '0',
                                                                            textAlign: 'left',
                                                                            cursor: 'text',
                                                                        }}
                                                                        onFocus={e => e.target.select()}
                                                                        min="1"
                                                                    />
                                                                    <Edit size={10} style={{ color: '#3b82f6', opacity: 0.7, marginLeft: '2px', cursor: 'pointer' }} />
                                                                </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {eventFilter !== 'All' && (
                                                <td style={{ padding: '16px 24px' }}>
                                                    {(eventPointsMap[s.id] !== undefined) ? (
                                                        <span style={{ color: 'var(--text-dark)', fontWeight: '600' }}>{s.displayPoints}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-dark)', fontWeight: '600' }}>{s.manual_seed_points || 0}</span>
                                                    )}
                                                </td>
                                            )}
                                            {eventFilter === 'All' && (
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {s.imported_event_types ? (
                                                            s.imported_event_types.split(',').map(type => (
                                                                <span key={type} style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: type === 'SUP Event' ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)', color: type === 'SUP Event' ? '#10b981' : '#8b5cf6', whiteSpace: 'nowrap' }}>
                                                                    {type === 'SUP Event' ? 'SUP' : 'Surfing'}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Not imported</span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{s.school_name}</td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', background: 'rgba(13,148,136,0.12)', color: '#0D9488', whiteSpace: 'nowrap' }}>
                                                    ⏰ {s.session_time || 'Morning 6:30 AM'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', fontSize: '13px', color: '#64748B', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                📅 {s.start_date || '2026-08-28'}
                                            </td>
                                            <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{s.age}</td>
                                            <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{s.gender}</td>
                                            <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                                                {s.divisions ? (() => {
                                                    try {
                                                        const divs = typeof s.divisions === 'string' ? JSON.parse(s.divisions) : s.divisions;
                                                        return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {Array.isArray(divs) ? divs.map(d => (
                                                                <span key={d} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap', fontWeight: '600' }}>
                                                                    {formatDivisionName(d, eventFilter !== 'All' ? events.find(e => String(e.id) === String(eventFilter)) : events)}
                                                                </span>
                                                            )) : formatDivisionName(s.divisions, eventFilter !== 'All' ? events.find(e => String(e.id) === String(eventFilter)) : events)}
                                                        </div>;
                                                    } catch(e) { return s.divisions; }
                                                })() : '—'}
                                            </td>
                                            {isSUPEvent && (
                                                <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                                                    {s.sup_categories ? (() => {
                                                        try {
                                                            const cats = typeof s.sup_categories === 'string' ? JSON.parse(s.sup_categories) : s.sup_categories;
                                                            return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {Array.isArray(cats) ? cats.map(cat => (
                                                                    <span key={cat} style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>{cat}</span>
                                                                )) : s.sup_categories}
                                                            </div>;
                                                        } catch(e) { return s.sup_categories; }
                                                    })() : '—'}
                                                </td>
                                            )}
                                            <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{s.state}</td>
                                            <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                                                {(() => {
                                                    // When event filter is active, use event-scoped is_assigned
                                                    // (only locked if in a heat of THIS event)
                                                    // When 'All Events', use global is_assigned from surfers list
                                                    const isEventFiltered = eventFilter !== 'All';
                                                    const eventSurfer = isEventFiltered ? eventSurfersMap[s.id] : null;
                                                    const isLocked = isEventFiltered
                                                        ? !!(eventSurfer?.is_assigned)
                                                        : !!s.is_assigned;

                                                    const editTitle = isLocked
                                                        ? 'Cannot edit: competitor is assigned to a heat in this event'
                                                        : 'Edit Competitor';
                                                    const deleteTitle = isLocked
                                                        ? 'Cannot remove: competitor is assigned to a heat in this event'
                                                        : isEventFiltered
                                                            ? 'Remove competitor from this event'
                                                            : 'Delete Surfer';

                                                    return (
                                                        <div className="flex justify-center gap-3" style={{ alignItems: 'center' }}>
                                                            {/* Active Toggle Switch */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', userSelect: 'none' }}>
                                                                {/* Track */}
                                                                <div
                                                                    onClick={() => handleToggleActive(s)}
                                                                    title={s.is_active !== 0 ? 'Click to deactivate' : 'Click to activate'}
                                                                    style={{
                                                                        width: '32px',
                                                                        height: '18px',
                                                                        borderRadius: '9px',
                                                                        background: s.is_active !== 0 ? 'var(--accent-green)' : 'var(--border-hover)',
                                                                        position: 'relative',
                                                                        transition: 'background 0.22s ease',
                                                                        flexShrink: 0,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {/* Thumb */}
                                                                    <div style={{
                                                                        width: '14px',
                                                                        height: '14px',
                                                                        borderRadius: '50%',
                                                                        background: '#fff',
                                                                        position: 'absolute',
                                                                        top: '2px',
                                                                        left: s.is_active !== 0 ? '16px' : '2px',
                                                                        transition: 'left 0.22s ease',
                                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                                                    }} />
                                                                </div>
                                                                {/* Label */}
                                                                <span style={{
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    color: s.is_active !== 0 ? 'var(--accent-green)' : 'var(--text-muted)'
                                                                }}>
                                                                    {s.is_active !== 0 ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleOpenModal(s)}
                                                                disabled={isLocked}
                                                                title={editTitle}
                                                                style={{
                                                                    color: 'var(--text-secondary)',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    padding: 0,
                                                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    opacity: isLocked ? 0.4 : 1
                                                                }}
                                                            >
                                                                <Edit size={20} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSurfer(s.id)}
                                                                disabled={isLocked}
                                                                title={deleteTitle}
                                                                style={{
                                                                    color: '#ef4444',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    padding: 0,
                                                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    opacity: isLocked ? 0.4 : 1
                                                                }}
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ height: '350px' }}>
                            <div className="icon-box">
                                <User size={32} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <p className="text-secondary" style={{ fontSize: '18px', fontWeight: '500' }}>
                                {searchTerm
                                    ? 'No matches found'
                                    : eventFilter !== 'All'
                                        ? 'No competitors imported for this event yet'
                                        : 'No surfers added yet'}
                            </p>
                            {eventFilter !== 'All' && !searchTerm ? (
                                <button onClick={() => setIsImportSettingsModalOpen(true)} className="btn btn-secondary" style={{ marginTop: '16px' }}>
                                    <ArrowRightLeft size={18} />
                                    Import Surfers
                                </button>
                            ) : (
                                <button onClick={() => handleOpenModal()} className="btn btn-primary" style={{ marginTop: '16px' }}>
                                    <Plus size={20} />
                                    Add Surfer
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add New Surfer Modal */}
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
                    <form onSubmit={handleAddSurfer} className="modal-content" style={{ maxWidth: '540px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>{editingSurfer ? 'Edit Competitor' : 'Add New Competitor'}</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {editingSurfer ? 'Update the details for this competitor' : 'Enter the details for the new competitor'}
                                </p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Event context banner — shown only when adding (not editing) with an event filter */}
                        {!editingSurfer && eventFilter !== 'All' && (() => {
                            const selectedEvent = events.find(ev => String(ev.id) === String(eventFilter));
                            if (!selectedEvent) return null;
                            return (
                                <div style={{
                                    margin: '0 28px',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
                                    border: '1.5px solid rgba(14, 165, 233, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', fontWeight: '600', color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>
                                            Adding to Event
                                        </p>
                                        <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)', margin: 0 }}>
                                            {selectedEvent.name}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="p-8">
                            <div className="form-group">
                                <label className="form-label">Full Name <span>*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="e.g., John Smith"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-row form-group">
                                <div>
                                    <label className="form-label">Represent School Name <span>*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        placeholder="e.g., Surf Academy"
                                        value={formData.school_name}
                                        onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Date of Birth <span>*</span></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        required
                                        value={formData.dob}
                                        max={new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                    />
                                    {formData.dob && <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', display: 'block' }}>Current Age: {(() => {
                                        const birthDate = new Date(formData.dob);
                                        const today = new Date();
                                        let a = today.getFullYear() - birthDate.getFullYear();
                                        const m = today.getMonth() - birthDate.getMonth();
                                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
                                        return a;
                                    })()}</span>}
                                </div>
                            </div>

                            <div className="form-row form-group">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label className="form-label">Gender <span>*</span></label>
                                    <select
                                        className="form-control"
                                        required
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label className="form-label">State <span>*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        placeholder="e.g., California"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row form-group" style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        placeholder="e.g., john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label className="form-label">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        placeholder="e.g., +1 234 567 8900"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row form-group" style={{ marginTop: '12px' }}>
                                <div>
                                    <label className="form-label">Manual Seed Rank (Optional)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={formData.manual_seed_rank || ''}
                                        onChange={(e) => {
                                            const rVal = e.target.value ? parseInt(e.target.value, 10) : '';
                                            const pVal = rVal ? getPointsForRank(rVal) : 0;
                                            setFormData({
                                                ...formData,
                                                manual_seed_rank: rVal,
                                                manual_seed_points: pVal
                                            });
                                        }}
                                        placeholder="e.g., 1"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Manual Seed Points (Optional)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={formData.manual_seed_points}
                                        onChange={(e) => {
                                            const pVal = parseInt(e.target.value, 10) || 0;
                                            const rVal = getRankForPoints(pVal);
                                            setFormData({
                                                ...formData,
                                                manual_seed_points: pVal,
                                                manual_seed_rank: rVal
                                            });
                                        }}
                                        placeholder="e.g., 1000"
                                    />
                                </div>
                            </div>

                            {isSUPEvent && (
                                <div className="form-group" style={{ marginTop: '12px' }}>
                                    <label className="form-label">SUP Category</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                        {['Sprint', 'Technical race', 'Distance'].map(category => (
                                            <label key={category} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-dark)' }}>
                                                <input
                                                    type="checkbox"
                                                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-blue)' }}
                                                    checked={(formData.sup_categories || []).includes(category)}
                                                    onChange={(e) => {
                                                        const current = formData.sup_categories || [];
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, sup_categories: [...current, category] });
                                                        } else {
                                                            setFormData({ ...formData, sup_categories: current.filter(c => c !== category) });
                                                        }
                                                    }}
                                                />
                                                {category}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-group" style={{ marginTop: '12px' }}>
                                <label className="form-label">Surfer's Headshot <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '400' }}>(optional · max 5 MB)</span></label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--border-dim)' }}>
                                    {/* Preview circle */}
                                    <div style={{
                                        width: '64px', height: '64px', borderRadius: '50%',
                                        overflow: 'hidden', flexShrink: 0,
                                        border: '2px solid var(--border-dim)',
                                        background: 'var(--bg-light)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {formData.photo
                                            ? <img src={formData.photo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                                        }
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="form-control"
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                        />
                                        {formData.photo && (
                                            <button type="button" onClick={() => setFormData({ ...formData, photo: null })}
                                                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                                            >✕ Remove photo</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '10px 32px' }}>
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (editingSurfer ? 'Save Changes' : 'Add Competitor')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Import CSV Modal */}
            {isImportModalOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                        backdropFilter: 'blur(8px)', padding: '20px'
                    }}
                >
                    <div className="modal-content" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>Import Competitors</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Upload an Excel or CSV file to auto-save competitors.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { if (!isImporting) setIsImportModalOpen(false); }}
                                className="modal-close"
                                disabled={isImporting}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            {!isImporting ? (
                                <div style={{ border: '2px dashed var(--border-dim)', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', background: 'var(--bg-light)' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <Upload size={24} />
                                    </div>
                                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Select an Excel/CSV file</h4>
                                    <p className="text-secondary" style={{ fontSize: '13px', marginBottom: '24px' }}>File should contain columns like Name, School, Age, Gender, State.</p>
                                    <input
                                        type="file"
                                        id="importFileInput"
                                        accept=".xls,.xlsx,.csv"
                                        onChange={handleFileUpload}
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="importFileInput" className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                                        Browse Files
                                    </label>
                                </div>
                            ) : (
                                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} style={{ color: '#10b981', margin: '0 auto 16px' }} />
                                    <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Importing Competitors...</h4>
                                    <p className="text-secondary" style={{ fontSize: '14px', marginBottom: '20px' }}>
                                        Processing {importProgress.current} out of {importProgress.total} records
                                    </p>

                                    <div style={{ width: '100%', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', height: '16px', overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                                                background: '#10b981',
                                                height: '100%',
                                                transition: 'width 0.2s ease-out'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-dim)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
                            {!isImporting ? (
                                <button type="button" onClick={() => setIsImportModalOpen(false)} className="btn btn-secondary">Close</button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => { cancelImportRef.current = true; }}
                                    className="btn btn-secondary"
                                    style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                >
                                    Cancel Import
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Import from Existing Event Modal */}
            {isImportEventModalOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.92)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                        backdropFilter: 'blur(10px)', padding: '20px'
                    }}
                >
                    <div className="modal-content" style={{ maxWidth: '520px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <ArrowRightLeft size={20} style={{ color: 'var(--accent-blue)' }} />
                                    Import from Existing Event
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Copy all surfers from one event to another. Duplicate entries are skipped automatically.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { if (!isImportingFromEvent) setIsImportEventModalOpen(false); }}
                                className="modal-close"
                                disabled={isImportingFromEvent}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            {/* From Event */}
                            <div className="form-group">
                                <label className="form-label">
                                    From Event <span>*</span>
                                </label>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    Source event whose surfer list will be copied
                                </p>
                                <select
                                    className="form-control"
                                    value={importFromEventId}
                                    onChange={(e) => setImportFromEventId(e.target.value)}
                                    disabled={isImportingFromEvent}
                                >
                                    <option value="">Select source event...</option>
                                    {events.map(ev => (
                                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Arrow indicator */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0', gap: '12px' }}>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)' }} />
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--accent-blue)'
                                }}>
                                    <ArrowRightLeft size={16} />
                                </div>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)' }} />
                            </div>

                            {/* To Event */}
                            <div className="form-group">
                                <label className="form-label">
                                    To Event <span>*</span>
                                </label>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    Destination event that will receive the surfers
                                </p>
                                <select
                                    className="form-control"
                                    value={importToEventId}
                                    onChange={(e) => setImportToEventId(e.target.value)}
                                    disabled={isImportingFromEvent}
                                >
                                    <option value="">Select destination event...</option>
                                    {events.filter(ev => ev.id !== importFromEventId).map(ev => (
                                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Info note */}
                            {importFromEventId && importToEventId && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: '10px',
                                    background: 'rgba(59, 130, 246, 0.08)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    fontSize: '13px', color: 'var(--text-secondary)',
                                    marginTop: '4px'
                                }}>
                                    <strong style={{ color: 'var(--accent-blue)' }}>ℹ️ Note: </strong>
                                    All competitors from the selected source event will be imported. After import, the table will automatically filter to show only the imported competitors. When creating heats for the destination event, only these competitors will appear in the available competitors list.
                                </div>
                            )}
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-dim)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setIsImportEventModalOpen(false)}
                                className="btn btn-secondary"
                                disabled={isImportingFromEvent}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleImportFromEvent}
                                className="btn btn-primary"
                                disabled={isImportingFromEvent || !importFromEventId || !importToEventId}
                                style={{ padding: '10px 28px' }}
                            >
                                {isImportingFromEvent ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRightLeft size={18} />
                                        Import Competitors
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Manually Import Surfers to Event Modal */}
            {isManualImportModalOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.92)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                        backdropFilter: 'blur(10px)', padding: '20px'
                    }}
                >
                    <div className="modal-content" style={{ maxWidth: '600px', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div className="modal-header" style={{ flexShrink: 0 }}>
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <User size={20} style={{ color: 'var(--accent-blue)' }} />
                                    Manually Import Competitors to Event
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Select an event and pick multiple active competitors to import to it.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { if (!isManualImporting) setIsManualImportModalOpen(false); }}
                                className="modal-close"
                                disabled={isManualImporting}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8" style={{ overflowY: 'auto', flexGrow: 1 }}>
                            {/* To Event — hide selector when pre-populated from event filter */}
                            {eventFilter !== 'All' ? (
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label">Importing into Event</label>
                                    <div style={{ padding: '10px 14px', background: 'var(--bg-light)', border: '1px solid var(--border-dim)', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                        {events.find(ev => String(ev.id) === String(eventFilter))?.name || 'Selected Event'}
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label">
                                        Select Event <span>*</span>
                                    </label>
                                    <select
                                        className="form-control"
                                        value={manualImportEventId}
                                        onChange={(e) => setManualImportEventId(e.target.value)}
                                        disabled={isManualImporting}
                                    >
                                        <option value="">Select destination event...</option>
                                        {events.map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}


                            {/* Gender Filter */}
                            {manualImportEventId && (
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label">Filter by Gender</label>
                                    <select
                                        className="form-control"
                                        value={manualImportGenderFilter}
                                        onChange={(e) => {
                                            setManualImportGenderFilter(e.target.value);
                                            setManualImportSelectedSurferIds(new Set()); // Reset selections on filter change
                                        }}
                                        disabled={isManualImporting}
                                        style={{ fontSize: '13px', fontWeight: '600' }}
                                    >
                                        <option value="All">All Genders</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            )}

                            {/* Surfer checkboxes */}
                            {manualImportEventId && (() => {
                                const availableSurfers = surfers.filter(s =>
                                    s.is_active !== 0 && 
                                    !manualImportedSurferIdsForSelectedEvent.has(s.id) &&
                                    (manualImportGenderFilter === 'All' || s.gender === manualImportGenderFilter)
                                );

                                return (
                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Select Competitors ({availableSurfers.length} available)</span>
                                            {availableSurfers.length > 0 && (
                                                <button
                                                    type="button"
                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                                                    onClick={() => {
                                                        if (manualImportSelectedSurferIds.size === availableSurfers.length) {
                                                            setManualImportSelectedSurferIds(new Set());
                                                        } else {
                                                            setManualImportSelectedSurferIds(new Set(availableSurfers.map(s => s.id)));
                                                        }
                                                    }}
                                                >
                                                    {manualImportSelectedSurferIds.size === availableSurfers.length ? 'Deselect All' : 'Select All'}
                                                </button>
                                            )}
                                        </label>
                                        <div style={{
                                            border: '1px solid var(--border-dim)', borderRadius: '8px',
                                            maxHeight: '300px', overflowY: 'auto', padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.5)'
                                        }}>
                                            {availableSurfers.length === 0 ? (
                                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                                    All active competitors are already imported into this event.
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                                    {availableSurfers.map(surfer => (
                                                        <label key={surfer.id} style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            padding: '8px', borderRadius: '6px',
                                                            background: manualImportSelectedSurferIds.has(surfer.id) ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                                            border: manualImportSelectedSurferIds.has(surfer.id) ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                                                            cursor: 'pointer', transition: 'all 0.2s',
                                                            fontSize: '13px'
                                                        }} className="table-row-hover">
                                                            <input
                                                                type="checkbox"
                                                                checked={manualImportSelectedSurferIds.has(surfer.id)}
                                                                onChange={() => toggleManualImportSelection(surfer.id)}
                                                                disabled={isManualImporting}
                                                                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                                                            />
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontWeight: manualImportSelectedSurferIds.has(surfer.id) ? '600' : '400', color: 'var(--text-dark)' }}>{surfer.name}</span>
                                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{surfer.division || (surfer.age ? `${surfer.gender} ${surfer.age}` : surfer.gender)}</span>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'flex-end' }}>
                                            Selected: <strong style={{ color: 'var(--accent-blue)', marginLeft: '4px' }}>{manualImportSelectedSurferIds.size}</strong>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-dim)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={() => setIsManualImportModalOpen(false)}
                                className="btn btn-secondary"
                                disabled={isManualImporting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleManualImportSubmit}
                                className="btn btn-primary"
                                disabled={isManualImporting || !manualImportEventId || manualImportSelectedSurferIds.size === 0}
                                style={{ padding: '10px 28px' }}
                            >
                                {isManualImporting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Import Selected
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Settings Modal */}
            {isImportSettingsModalOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.92)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                        backdropFilter: 'blur(10px)', padding: '20px'
                    }}
                >
                    <div className="modal-content" style={{ maxWidth: '450px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <ArrowRightLeft size={20} style={{ color: 'var(--accent-blue)' }} />
                                    Select Import Method
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Choose how you would like to import competitors into the system.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsImportSettingsModalOpen(false)}
                                className="modal-close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <style>
                            {`
                            .import-option-btn {
                                display: flex;
                                align-items: center;
                                gap: 16px;
                                width: 100%;
                                padding: 20px;
                                text-align: left;
                                background: var(--bg-card);
                                border: 1px solid var(--border-dim);
                                border-radius: 12px;
                                cursor: pointer;
                                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                            }
                            .import-option-btn:hover {
                                border-color: var(--accent-blue);
                                background: rgba(59, 130, 246, 0.04);
                                transform: translateY(-2px);
                                box-shadow: 0 8px 16px rgba(59, 130, 246, 0.06);
                            }
                            .import-option-icon {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 44px;
                                height: 44px;
                                border-radius: 10px;
                                background: rgba(59, 130, 246, 0.1);
                                color: var(--accent-blue);
                                flex-shrink: 0;
                            }
                            `}
                        </style>

                        <div className="p-8" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <button
                                className="import-option-btn"
                                onClick={() => { setIsImportSettingsModalOpen(false); handleOpenImportEventModal(); }}
                            >
                                <div className="import-option-icon">
                                    <ArrowRightLeft size={22} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>Import from Existing Event</h4>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Copy assignments from a past competition</p>
                                </div>
                            </button>

                            <button
                                className="import-option-btn"
                                onClick={() => { setIsImportSettingsModalOpen(false); handleImportClick(); }}
                            >
                                <div className="import-option-icon">
                                    <FileText size={22} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>Import CSV</h4>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Upload a spreadsheet of competitor data</p>
                                </div>
                            </button>

                            <button
                                className="import-option-btn"
                                onClick={() => { setIsImportSettingsModalOpen(false); if (eventFilter !== 'All') setManualImportEventId(eventFilter); setIsManualImportModalOpen(true); }}
                            >
                                <div className="import-option-icon">
                                    <User size={22} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>Manually Import to Event</h4>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Handpick active competitors from the database</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === Create Registration Form Modal (Step 1: Select Event) === */}
            {isRegFormModalOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.92)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                        backdropFilter: 'blur(10px)', padding: '20px'
                    }}
                >
                    <div className="modal-content" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Link2 size={20} style={{ color: '#8b5cf6' }} />
                                    Create Registration Form
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Generate a public registration link for an event.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRegFormModalOpen(false)}
                                className="modal-close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="form-group">
                                <label className="form-label">Select Event <span>*</span></label>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    Only upcoming (Draft) or Heat Drawn events are shown.
                                </p>
                                {upcomingEvents.length === 0 ? (
                                    <div style={{
                                        padding: '16px', borderRadius: '12px', textAlign: 'center',
                                        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
                                        color: 'var(--text-secondary)', fontSize: '13px'
                                    }}>
                                        No upcoming or Heat Drawn events found. Events must be in <strong>Draft</strong> or <strong>Heat Drawn</strong> status to create a registration form.
                                    </div>
                                ) : (
                                    <select
                                        className="form-control"
                                        value={regFormEventId}
                                        onChange={(e) => setRegFormEventId(e.target.value)}
                                    >
                                        <option value="">Select an event...</option>
                                        {upcomingEvents.map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {regFormEventId && (() => {
                                const ev = upcomingEvents.find(e => String(e.id) === String(regFormEventId));
                                if (!ev) return null;
                                const slug = ev.slug || ev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                                const alreadyCreated = !!createdRegForms[String(regFormEventId)];
                                return (
                                    <div style={{ marginTop: '16px' }}>
                                        {/* Already created banner */}
                                        {alreadyCreated && (
                                            <div style={{
                                                padding: '12px 16px', borderRadius: '12px',
                                                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.07) 100%)',
                                                border: '1.5px solid rgba(16,185,129,0.3)',
                                                display: 'flex', alignItems: 'center', gap: '10px'
                                            }}>
                                                <CheckCheck size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#10b981' }}>Form already created!</p>
                                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>A registration form was previously generated for this event.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-dim)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setIsRegFormModalOpen(false)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!regFormEventId || regActionLoading === 'creating'}
                                onClick={async () => {
                                    const ev = upcomingEvents.find(e => String(e.id) === String(regFormEventId));
                                    if (!ev) return;
                                    const slug = ev.slug || ev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

                                    const isExisting = !!createdRegForms[String(regFormEventId)];
                                    let token = createdRegForms[String(regFormEventId)];

                                    try {
                                        if (!isExisting) {
                                            setRegActionLoading('creating');
                                            const res = await axios.post(`${API_BASE}/events/${ev.id}/create-registration`);
                                            token = res.data.token;
                                            saveCreatedRegForm(regFormEventId, token);
                                        }

                                        const link = `${window.location.origin}/${slug}/registration?t=${token}`;
                                        setRegFormLink(link);
                                        setRegFormIsExisting(isExisting);
                                        setRegLinkCopied(false);
                                        setIsRegFormModalOpen(false);
                                        setIsRegLinkModalOpen(true);
                                    } catch {
                                        showToast('Failed to create form. Please try again.', 'error');
                                    } finally {
                                        setRegActionLoading('');
                                    }
                                }}
                                className="btn btn-primary"
                                style={{
                                    padding: '10px 28px',
                                    background: !regFormEventId ? undefined
                                        : createdRegForms[String(regFormEventId)]
                                            ? 'linear-gradient(135deg, #10b981, #059669)'
                                            : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                    boxShadow: !regFormEventId ? undefined
                                        : createdRegForms[String(regFormEventId)]
                                            ? '0 4px 12px rgba(16,185,129,0.35)'
                                            : '0 4px 12px rgba(139,92,246,0.35)'
                                }}
                            >
                                {regActionLoading === 'creating'
                                    ? <><Loader2 size={18} className="animate-spin" /> Creating...</>
                                    : createdRegForms[String(regFormEventId)]
                                        ? <><CheckCheck size={18} /> View Link</>
                                        : <><Link2 size={18} /> Create Form</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === Registration Link Modal (Step 2: Show Link) === */}
            {isRegLinkModalOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.92)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                        backdropFilter: 'blur(10px)', padding: '20px'
                    }}
                >
                    <div className="modal-content" style={{ maxWidth: '520px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CheckCheck size={22} style={{ color: '#10b981' }} />
                                    {regFormIsExisting ? 'Registration Form Link' : 'Registration Form Created!'}
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Share this link with participants to let them register.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRegLinkModalOpen(false)}
                                className="modal-close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            {/* Success / existing banner */}
                            <div style={{
                                padding: '16px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.07) 100%)',
                                border: '1.5px solid rgba(16,185,129,0.3)',
                                display: 'flex', alignItems: 'center', gap: '12px',
                                marginBottom: '24px'
                            }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    background: 'rgba(16,185,129,0.15)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <CheckCheck size={20} style={{ color: '#10b981' }} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: 'var(--text-dark)' }}>
                                        {regFormIsExisting ? 'Form already exists!' : 'Form link is ready!'}
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {regFormIsExisting
                                            ? 'This event already has a registration form. Use the link below to share it.'
                                            : 'The registration page is live and accessible via the link below.'}
                                    </p>
                                </div>
                            </div>

                            {/* Link box */}
                            <label className="form-label">Registration Form URL</label>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                background: 'var(--bg-light)',
                                border: '1.5px solid var(--border-dim)',
                                marginBottom: '20px'
                            }}>
                                <Link2 size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                                <span style={{
                                    flex: 1, fontSize: '13px', fontWeight: '500',
                                    color: 'var(--text-dark)', wordBreak: 'break-all',
                                    fontFamily: 'monospace'
                                }}>{regFormLink}</span>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ flex: 1, justifyContent: 'center' }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(regFormLink).then(() => {
                                            setRegLinkCopied(true);
                                            setTimeout(() => setRegLinkCopied(false), 2500);
                                        });
                                    }}
                                >
                                    {regLinkCopied ? <CheckCheck size={18} style={{ color: '#10b981' }} /> : <ClipboardCopy size={18} />}
                                    {regLinkCopied ? 'Copied!' : 'Copy Link'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{
                                        flex: 1, justifyContent: 'center',
                                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                        boxShadow: '0 4px 12px rgba(139,92,246,0.35)'
                                    }}
                                    onClick={() => window.open(regFormLink, '_blank')}
                                >
                                    <Link2 size={18} />
                                    Open Form
                                </button>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-dim)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {/* Close Form (delete) button on the left */}
                            <button
                                type="button"
                                disabled={isClosingForm}
                                onClick={() => {
                                    setCustomConfirm({
                                        message: 'Close this registration form?',
                                        onConfirm: async () => {
                                            setCustomConfirm(null);
                                            try {
                                                setIsClosingForm(true);
                                                // Extract event slug from the URL — ignore query params
                                                const slug = new URL(regFormLink).pathname.split('/').slice(-2, -1)[0];
                                                await axios.post(`${API_BASE}/events/${slug}/close-registration`);
                                                // Remove from localStorage so Create Reg Form resets
                                                const linkedEventId = Object.keys(createdRegForms).find(id => {
                                                    const ev = events.find(e => String(e.id) === String(id));
                                                    return ev && (ev.slug === slug || String(ev.id) === slug);
                                                });
                                                if (linkedEventId) removeCreatedRegForm(linkedEventId);
                                                showToast('Registration form closed successfully.', 'success');
                                                setIsRegLinkModalOpen(false);
                                            } catch {
                                                showToast('Failed to close the form. Please try again.', 'error');
                                            } finally {
                                                setIsClosingForm(false);
                                            }
                                        }
                                    });
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
                                    background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                                    fontSize: '13px', fontWeight: '600', cursor: isClosingForm ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isClosingForm
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                                {isClosingForm ? 'Closing...' : 'Close Form'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsRegLinkModalOpen(false)}
                                className="btn btn-secondary"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === View Registered Surfers Modal === */}
            {isRegSurfersModalOpen && (() => {
                const pending = registrations.filter(r => r.status === 'pending');
                const rejected = registrations.filter(r => r.status === 'rejected');

                const handleImport = async (regId) => {
                    try {
                        setRegActionLoading(regId);
                        await axios.post(`${API_BASE}/events/registrations/${regId}/import`);
                        showToast('Surfer imported successfully!', 'success');
                        // Refresh both the registrations list AND the competitor table
                        await Promise.all([
                            fetchRegistrations(eventFilter),
                            fetchSurfers(),
                            handleEventFilterChange(eventFilter),
                        ]);
                    } catch (err) {
                        showToast(err.response?.data?.error || 'Import failed', 'error');
                    } finally { setRegActionLoading(''); }
                };
                const handleReject = async (regId) => {
                    try {
                        setRegActionLoading(regId + '_reject');
                        await axios.post(`${API_BASE}/events/registrations/${regId}/reject`);
                        await fetchRegistrations(eventFilter);
                    } catch { showToast('Action failed', 'error'); }
                    finally { setRegActionLoading(''); }
                };
                const handleUndo = async (regId) => {
                    try {
                        setRegActionLoading(regId + '_undo');
                        await axios.post(`${API_BASE}/events/registrations/${regId}/undo`);
                        await fetchRegistrations(eventFilter);
                    } catch { showToast('Action failed', 'error'); }
                    finally { setRegActionLoading(''); }
                };
                const handleImportAll = async () => {
                    if (pending.length === 0) return;
                    try {
                        setRegActionLoading('import_all');
                        await axios.post(`${API_BASE}/events/${eventFilter}/registrations/import-all`);
                        showToast(`Successfully imported ${pending.length} surfers!`, 'success');
                        await Promise.all([
                            fetchRegistrations(eventFilter),
                            fetchSurfers(),
                            handleEventFilterChange(eventFilter),
                        ]);
                    } catch (err) {
                        showToast(err.response?.data?.error || 'Import All failed', 'error');
                    } finally { setRegActionLoading(''); }
                };
                const handleDelete = async (regId) => {
                    try {
                        setRegActionLoading(regId + '_del');
                        await axios.delete(`${API_BASE}/events/registrations/${regId}`);
                        await fetchRegistrations(eventFilter);
                    } catch { showToast('Delete failed', 'error'); }
                    finally { setRegActionLoading(''); }
                };

                const handleExportCSV = () => {
                    if (registrations.length === 0) {
                        showToast('No registrations to export', 'info');
                        return;
                    }
                    const headers = [
                        'Name',
                        ...(!isSUPEvent ? ['Type'] : []),
                        'School',
                        'Age',
                        'Gender',
                        'State',
                        'Divisions',
                        ...(isSUPEvent ? ['SUP Categories'] : []),
                        'Status',
                        'Registration Date'
                    ];
                    const rows = registrations.map(r => {
                        let parsedDivisions = '';
                        try {
                            const divs = typeof r.divisions === 'string' ? JSON.parse(r.divisions) : r.divisions;
                            parsedDivisions = Array.isArray(divs) ? divs.join('; ') : String(divs || '');
                        } catch {
                            parsedDivisions = String(r.divisions || '');
                        }

                        let parsedSUP = '';
                        if (isSUPEvent) {
                            try {
                                const cats = typeof r.sup_categories === 'string' ? JSON.parse(r.sup_categories) : r.sup_categories;
                                parsedSUP = Array.isArray(cats) ? cats.join('; ') : String(cats || '');
                            } catch {
                                parsedSUP = String(r.sup_categories || '');
                            }
                        }

                        return [
                            r.name || '',
                            ...(!isSUPEvent ? [r.surfer_type === 'existing' ? 'Existing' : 'New'] : []),
                            r.school_name || '',
                            r.age || '',
                            r.gender || '',
                            r.state || '',
                            parsedDivisions,
                            ...(isSUPEvent ? [parsedSUP] : []),
                            r.status || 'pending',
                            r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : ''
                        ];
                    });

                    const csvContent = [
                        headers.join(','),
                        ...rows.map(row => row.map(val => {
                            const stringVal = String(val);
                            if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                                return `"${stringVal.replace(/"/g, '""')}"`;
                            }
                            return stringVal;
                        }).join(','))
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${(selectedEventObj?.name || 'event').replace(/\s+/g, '_')}_registrations.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                };

                const thS = { padding: '10px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'left' };
                const tdS = { padding: '14px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #f1f5f9' };
                const tdM = { ...tdS, color: '#64748b' };

                return (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)', padding: '20px' }}>
                        <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '960px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0' }}>
                            {/* Header */}
                            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                        Registration Submissions
                                        {selectedEventObj && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '600', padding: '4px 12px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                    {selectedEventObj.name}
                                                </span>
                                                <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px', background: selectedEventObj.event_type === 'SUP Event' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)', color: selectedEventObj.event_type === 'SUP Event' ? '#10b981' : '#7c3aed', border: `1px solid ${selectedEventObj.event_type === 'SUP Event' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)'}` }}>
                                                    {selectedEventObj.event_type}
                                                </span>
                                            </div>
                                        )}
                                    </h3>
                                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                                        Review surfers who registered via the form.{' '}
                                        <strong style={{ color: '#f59e0b' }}>{pending.length} pending</strong>, {rejected.length} rejected.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button
                                        onClick={handleExportCSV}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#ffffff',
                                            color: '#334155',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    >
                                        <Download size={15} />
                                        Export CSV
                                    </button>
                                    <button onClick={() => setIsRegSurfersModalOpen(false)} className="modal-close"><X size={20} /></button>
                                </div>
                            </div>

                            {/* Scrollable body */}
                            <div style={{ overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Pending */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                                                Pending Review <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '13px' }}>({pending.length})</span>
                                            </h4>
                                        </div>
                                        {pending.length > 0 && (
                                            <button onClick={handleImportAll} disabled={!!regActionLoading}
                                                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: regActionLoading === 'import_all' ? 'not-allowed' : 'pointer', opacity: regActionLoading === 'import_all' ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                {regActionLoading === 'import_all' ? <Loader2 size={12} className="animate-spin" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>}
                                                Import All
                                            </button>
                                        )}
                                    </div>
                                    {regSurfersLoading ? (
                                        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}><Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} /><p style={{ fontSize: '13px' }}>Loading...</p></div>
                                    ) : pending.length === 0 ? (
                                        <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                                            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>No pending registrations for this event.</p>
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead><tr>
                                                    <th style={thS}>Name</th>
                                                    {!isSUPEvent && <th style={thS}>Type</th>}
                                                    <th style={thS}>School</th>
                                                    <th style={thS}>Age</th>
                                                    <th style={thS}>Gender</th>
                                                    <th style={thS}>State</th>
                                                    <th style={thS}>Divisions</th>
                                                    {isSUPEvent && <th style={thS}>SUP Categories</th>}
                                                    <th style={{ ...thS, textAlign: 'center', width: '180px' }}>Actions</th>
                                                </tr></thead>
                                                <tbody>
                                                    {pending.map(reg => (
                                                        <tr key={reg.id}>
                                                            <td style={{ ...tdS, padding: '10px 16px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{
                                                                        width: '32px', height: '32px', borderRadius: '50%',
                                                                        overflow: 'hidden', flexShrink: 0,
                                                                        border: '1.5px solid #e2e8f0',
                                                                        background: '#f8fafc',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                    }}>
                                                                        {reg.photo
                                                                            ? <img src={reg.photo} alt={reg.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                                                                        }
                                                                    </div>
                                                                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{reg.name || '—'}</span>
                                                                </div>
                                                            </td>
                                                            {!isSUPEvent && (
                                                                <td style={tdM}>
                                                                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: reg.surfer_type === 'existing' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)', color: reg.surfer_type === 'existing' ? '#6366f1' : '#10b981' }}>
                                                                        {reg.surfer_type === 'existing' ? 'Existing' : 'New'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            <td style={tdM}>{reg.school_name || '—'}</td>
                                                            <td style={tdM}>{reg.age || '—'}</td>
                                                            <td style={tdM}>{reg.gender || '—'}</td>
                                                            <td style={tdM}>{reg.state || '—'}</td>
                                                            <td style={tdM}>
                                                                {reg.divisions ? (() => {
                                                                    try {
                                                                        const divs = typeof reg.divisions === 'string' ? JSON.parse(reg.divisions) : reg.divisions;
                                                                        return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                            {Array.isArray(divs) ? divs.map(d => (
                                                                                <span key={d} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap', fontWeight: '600' }}>
                                                                                    {formatDivisionName(d, events.find(e => String(e.id) === String(regFormEventId)))}
                                                                                </span>
                                                                            )) : formatDivisionName(reg.divisions, events.find(e => String(e.id) === String(regFormEventId)))}
                                                                        </div>;
                                                                    } catch(e) { return reg.divisions; }
                                                                })() : '—'}
                                                            </td>
                                                            {isSUPEvent && (
                                                                <td style={tdM}>
                                                                    {reg.sup_categories ? (() => {
                                                                        try {
                                                                            const cats = typeof reg.sup_categories === 'string' ? JSON.parse(reg.sup_categories) : reg.sup_categories;
                                                                            return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                                {Array.isArray(cats) ? cats.map(cat => (
                                                                                    <span key={cat} style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>{cat}</span>
                                                                                )) : reg.sup_categories}
                                                                            </div>;
                                                                        } catch(e) { return reg.sup_categories; }
                                                                    })() : '—'}
                                                                </td>
                                                            )}
                                                            <td style={{ ...tdS, textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                    <button onClick={() => handleImport(reg.id)} disabled={!!regActionLoading}
                                                                        style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: regActionLoading === reg.id ? 'not-allowed' : 'pointer', opacity: regActionLoading === reg.id ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                        {regActionLoading === reg.id ? <Loader2 size={12} className="animate-spin" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>}
                                                                        Import
                                                                    </button>
                                                                    <button onClick={() => handleReject(reg.id)} disabled={!!regActionLoading}
                                                                        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: regActionLoading === (reg.id + '_reject') ? 'not-allowed' : 'pointer', opacity: regActionLoading === (reg.id + '_reject') ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                        {regActionLoading === (reg.id + '_reject') ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Rejected */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                                            Rejected <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '13px' }}>({rejected.length})</span>
                                        </h4>
                                    </div>
                                    {rejected.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                                            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No rejected registrations.</p>
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead><tr>
                                                    <th style={{ ...thS, background: 'rgba(239,68,68,0.05)' }}>Name</th>
                                                    {!isSUPEvent && <th style={{ ...thS, background: 'rgba(239,68,68,0.05)' }}>Type</th>}
                                                    <th style={{ ...thS, background: 'rgba(239,68,68,0.05)' }}>School</th>
                                                    <th style={{ ...thS, background: 'rgba(239,68,68,0.05)' }}>Age</th>
                                                    <th style={{ ...thS, background: 'rgba(239,68,68,0.05)' }}>Gender</th>
                                                    <th style={{ ...thS, background: 'rgba(239,68,68,0.05)' }}>State</th>
                                                    <th style={{ ...thS, background: 'rgba(239,68,68,0.05)' }}>Divisions</th>
                                                    {isSUPEvent && <th style={{ ...thS, background: 'rgba(239,68,68,0.05)' }}>SUP Categories</th>}
                                                    <th style={{ ...thS, textAlign: 'center', width: '160px', background: 'rgba(239,68,68,0.05)' }}>Actions</th>
                                                </tr></thead>
                                                <tbody>
                                                    {rejected.map(reg => (
                                                        <tr key={reg.id} style={{ opacity: 0.75 }}>
                                                            <td style={{ ...tdS, padding: '10px 16px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{
                                                                        width: '32px', height: '32px', borderRadius: '50%',
                                                                        overflow: 'hidden', flexShrink: 0,
                                                                        border: '1.5px solid #e2e8f0',
                                                                        background: '#f8fafc',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        opacity: 0.6
                                                                    }}>
                                                                        {reg.photo
                                                                            ? <img src={reg.photo} alt={reg.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                                                                        }
                                                                    </div>
                                                                    <span style={{ fontWeight: '600', textDecoration: 'line-through', color: '#94a3b8' }}>{reg.name || '—'}</span>
                                                                </div>
                                                            </td>
                                                            {!isSUPEvent && (
                                                                <td style={tdM}>
                                                                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: reg.surfer_type === 'existing' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)', color: reg.surfer_type === 'existing' ? '#6366f1' : '#10b981' }}>
                                                                        {reg.surfer_type === 'existing' ? 'Existing' : 'New'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            <td style={tdM}>{reg.school_name || '—'}</td>
                                                            <td style={tdM}>{reg.age || '—'}</td>
                                                            <td style={tdM}>{reg.gender || '—'}</td>
                                                            <td style={tdM}>{reg.state || '—'}</td>
                                                            <td style={tdM}>
                                                                {reg.divisions ? (() => {
                                                                    try {
                                                                        const divs = typeof reg.divisions === 'string' ? JSON.parse(reg.divisions) : reg.divisions;
                                                                        return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', opacity: 0.7 }}>
                                                                            {Array.isArray(divs) ? divs.map(d => (
                                                                                <span key={d} style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                                                                    {formatDivisionName(d, events.find(e => String(e.id) === String(regFormEventId)))}
                                                                                </span>
                                                                            )) : formatDivisionName(reg.divisions, events.find(e => String(e.id) === String(regFormEventId)))}
                                                                        </div>;
                                                                    } catch(e) { return reg.divisions; }
                                                                })() : '—'}
                                                            </td>
                                                            {isSUPEvent && (
                                                                <td style={tdM}>
                                                                    {reg.sup_categories ? (() => {
                                                                        try {
                                                                            const cats = typeof reg.sup_categories === 'string' ? JSON.parse(reg.sup_categories) : reg.sup_categories;
                                                                            return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', opacity: 0.7 }}>
                                                                                {Array.isArray(cats) ? cats.map(cat => (
                                                                                    <span key={cat} style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>{cat}</span>
                                                                                )) : reg.sup_categories}
                                                                            </div>;
                                                                        } catch(e) { return reg.sup_categories; }
                                                                    })() : '—'}
                                                                </td>
                                                            )}
                                                            <td style={{ ...tdS, textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                    <button onClick={() => handleUndo(reg.id)} disabled={!!regActionLoading}
                                                                        style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(99,102,241,0.12)', color: '#6366f1', fontSize: '12px', fontWeight: '700', cursor: regActionLoading === (reg.id + '_undo') ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        {regActionLoading === (reg.id + '_undo') ? <Loader2 size={12} className="animate-spin" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>}
                                                                        Undo
                                                                    </button>
                                                                    <button onClick={() => handleDelete(reg.id)} disabled={!!regActionLoading}
                                                                        style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: regActionLoading === (reg.id + '_del') ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        {regActionLoading === (reg.id + '_del') ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                                <button onClick={() => setIsRegSurfersModalOpen(false)} className="btn btn-secondary">Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Import Booked Students Modal */}
            {isSchoolSyncModalOpen && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.92)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                        backdropFilter: 'blur(10px)', padding: '20px'
                    }}
                >
                    <div className="modal-content" style={{ maxWidth: '640px', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '90vh', background: '#FFFFFF', borderRadius: '20px', overflow: 'hidden' }}>
                        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                    🏄 Import Booked Students to Competitors
                                </h3>
                                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                                    Sync registered students from your Surf School database who booked specific session slots.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSchoolSyncModalOpen(false)}
                                className="modal-close"
                                disabled={isSyncingToEvent}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                            {/* Date & Slot Filters Inside Modal */}
                            {(() => {
                                const availableDates = [...new Set(schoolStudents.map(st => st.start_date).filter(Boolean))].sort();
                                const activeStudentsForDate = schoolStudents.filter(st => {
                                    if (syncDateFilter === 'All') return true;
                                    return st.start_date === syncDateFilter;
                                });
                                const uniqueSlots = [...new Set(activeStudentsForDate.map(st => st.session_time).filter(Boolean))].sort();
                                const availableSlots = ['All', ...uniqueSlots];

                                return (
                                    <>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>📆 Filter by Date:</label>
                                            <select
                                                value={syncDateFilter}
                                                onChange={(e) => {
                                                    setSyncDateFilter(e.target.value);
                                                    setSyncSlotFilter('All');
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #CBD5E1',
                                                    background: '#FFFFFF',
                                                    fontSize: '13px',
                                                    color: '#0F172A',
                                                    outline: 'none',
                                                    minWidth: '150px'
                                                }}
                                            >
                                                <option value="All">All Dates</option>
                                                {availableDates.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Slot Filter Inside Modal */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                            {availableSlots.map(slot => (
                                                <button
                                                    key={slot}
                                                    type="button"
                                                    onClick={() => setSyncSlotFilter(slot)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '8px',
                                                        border: syncSlotFilter === slot ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                                                        background: syncSlotFilter === slot ? '#0F172A' : '#F8FAFC',
                                                        color: syncSlotFilter === slot ? '#00F2FE' : '#475569',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {slot === 'All' ? 'All Slots' : slot}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}

                            {isLoadingSchoolStudents ? (
                                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={36} style={{ color: '#0284C7', margin: '0 auto 12px' }} />
                                    <p style={{ fontSize: '14px', color: '#64748B' }}>Loading booked students from Surf School database...</p>
                                </div>
                            ) : (() => {
                                const displayed = schoolStudents.filter(st => {
                                    // 1. Date Filter
                                    if (syncDateFilter !== 'All' && st.start_date !== syncDateFilter) return false;
                                    
                                    // 2. Slot Filter
                                    if (syncSlotFilter !== 'All' && st.session_time !== syncSlotFilter) return false;
                                    
                                    return true;
                                });

                                if (displayed.length === 0) {
                                    return (
                                        <div style={{ padding: '30px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                                            <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>No students found for this slot.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Available Students ({displayed.length})</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (selectedSchoolStudentIds.size === displayed.length) {
                                                        setSelectedSchoolStudentIds(new Set());
                                                    } else {
                                                        setSelectedSchoolStudentIds(new Set(displayed.map(d => d.id)));
                                                    }
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#0284C7', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                                            >
                                                {selectedSchoolStudentIds.size === displayed.length ? 'Deselect All' : 'Select All'}
                                            </button>
                                        </div>

                                        <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', maxHeight: '320px', overflowY: 'auto', padding: '8px' }}>
                                            {displayed.map(st => {
                                                const isChecked = selectedSchoolStudentIds.has(st.id);
                                                return (
                                                    <label
                                                        key={st.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '10px 14px',
                                                            borderRadius: '10px',
                                                            background: isChecked ? 'rgba(0,242,254,0.06)' : 'transparent',
                                                            border: isChecked ? '1px solid rgba(0,242,254,0.3)' : '1px solid transparent',
                                                            cursor: 'pointer',
                                                            marginBottom: '6px',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                const nxt = new Set(selectedSchoolStudentIds);
                                                                if (nxt.has(st.id)) nxt.delete(st.id);
                                                                else nxt.add(st.id);
                                                                setSelectedSchoolStudentIds(nxt);
                                                            }}
                                                            style={{ width: '18px', height: '18px', accentColor: '#0284C7', cursor: 'pointer' }}
                                                        />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A' }}>{st.name}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                                                <span style={{ color: '#0D9488', fontWeight: '700' }}>⏰ {st.session_time || 'Morning 6:30 AM'}</span>
                                                                <span>•</span>
                                                                <span>📅 {st.start_date || '2026-08-28'}</span>
                                                                <span>•</span>
                                                                <span>🏄 {st.level || 'Beginner'}</span>
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#F8FAFC' }}>
                            <button
                                type="button"
                                onClick={() => setIsSchoolSyncModalOpen(false)}
                                className="btn btn-secondary"
                                disabled={isSyncingToEvent}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleImportSchoolStudentsSubmit}
                                className="btn btn-primary"
                                disabled={isSyncingToEvent || selectedSchoolStudentIds.size === 0}
                                style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)' }}
                            >
                                {isSyncingToEvent ? <><Loader2 className="animate-spin" size={16} /> Importing...</> : `Import ${selectedSchoolStudentIds.size} Competitors →`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CompetitorManagement;

