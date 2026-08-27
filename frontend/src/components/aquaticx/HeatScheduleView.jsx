// HeatScheduleView.jsx — High-end Google Calendar-style drag-and-drop timeline scheduler
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, Sliders, X, CheckCircle2 } from 'lucide-react';
import { useConfirm } from './ConfirmContext';
import { useToast } from './ToastContext';

const SLOT_HEIGHT = 76;       // Spaced out row height for a highly readable UI, allowing surfer names, country codes, and status dots to fit perfectly
const START_HOUR = 0;         // Start time: 00:00 (12 AM)
const END_HOUR = 24;          // End time: 24:00 (12 AM next day)

// Vibrant modern color palettes for dynamic round/division color-coding
const PALETTES = {
    blue: { bg: 'rgba(59, 130, 246, 0.03)', border: '#3b82f6', text: '#1d4ed8', dot: '#3b82f6' },
    green: { bg: 'rgba(16, 185, 129, 0.03)', border: '#10b981', text: '#047857', dot: '#10b981' },
    purple: { bg: 'rgba(139, 92, 246, 0.03)', border: '#8b5cf6', text: '#6d28d9', dot: '#8b5cf6' },
    orange: { bg: 'rgba(245, 158, 11, 0.03)', border: '#f59e0b', text: '#b45309', dot: '#f59e0b' },
    red: { bg: 'rgba(239, 68, 68, 0.03)', border: '#ef4444', text: '#b91c1c', dot: '#ef4444' },
    pink: { bg: 'rgba(236, 72, 153, 0.03)', border: '#ec4899', text: '#be185d', dot: '#ec4899' },
    indigo: { bg: 'rgba(99, 102, 241, 0.03)', border: '#6366f1', text: '#4338ca', dot: '#6366f1' },
    teal: { bg: 'rgba(20, 184, 166, 0.03)', border: '#14b8a6', text: '#0f766e', dot: '#14b8a6' }
};

// Helper: parse HH:mm or YYYY-MM-DD HH:mm to minutes from midnight
const timeStrToMinutes = (t) => {
    if (!t) return null;
    const timePart = t.includes(' ') ? t.split(' ')[1] : t;
    if (!timePart || !timePart.includes(':')) return null;
    const [h, m] = timePart.split(':').map(Number);
    return isNaN(h) || isNaN(m) ? null : h * 60 + m;
};

const minutesToTimeStr = (totalMins) => {
    const h = Math.floor(((totalMins % 1440) + 1440) % 1440 / 60);
    const m = ((totalMins % 60) + 60) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getLocalDateString = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getDatesRangeList = (startDate, daysCount) => {
    const dates = [];
    const parts = startDate.split('-');
    const current = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    for (let i = 0; i < daysCount; i++) {
        dates.push(getLocalDateString(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

// Returns country flag emoji based on state/nationality abbreviation
const getSurferFlag = (stateName) => {
    const s = (stateName || '').toLowerCase().trim();
    if (s.includes('haw') || s.includes('hw')) return '🇺🇸'; 
    if (s.includes('qld') || s.includes('nsw') || s.includes('aus') || s.includes('wa')) return '🇦🇺'; 
    if (s.includes('ca') || s.includes('cal') || s.includes('usa') || s.includes('fl')) return '🇺🇸'; 
    if (s.includes('bra') || s.includes('br')) return '🇧🇷'; 
    if (s.includes('fra') || s.includes('fr')) return '🇫🇷'; 
    if (s.includes('za') || s.includes('rsa')) return '🇿🇦'; 
    if (s.includes('jp') || s.includes('jpn')) return '🇯🇵'; 
    if (s.includes('nz') || s.includes('nzd')) return '🇳🇿';
    return '🏄'; 
};

const getDynamicHeatColor = (heat) => {
    const division = (heat.division || '').toLowerCase();
    const round = (heat.round || '').toLowerCase();
    
    if (division === 'break' || round.includes('break')) {
        return PALETTES.pink;
    }
    
    if (division.includes('women') || division.includes('female') || division.includes('girl')) {
        return PALETTES.pink; 
    }
    if (division.includes('junior') || division.includes('boys') || division.includes('girls') || division.includes('under') || division.includes('u1')) {
        return PALETTES.teal; 
    }
    if (division.includes('master') || division.includes('grandmaster') || division.includes('senior') || division.includes('above')) {
        return PALETTES.indigo; 
    }
    if (round.includes('final')) {
        return PALETTES.red; 
    }
    if (round.includes('semi')) {
        return PALETTES.orange; 
    }
    if (round.includes('quarter')) {
        return PALETTES.purple; 
    }
    if (round.includes('round 1') || round.includes('qualifier')) {
        return PALETTES.blue; 
    }
    return PALETTES.green;
};

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

const HeatScheduleView = ({ heats, events, onReschedule, onAddBreak, onDeleteHeat, initialDivision, initialEventId, onSelectHeat, onFilterChange }) => {
    const { showToast } = useToast();
    const { showConfirm } = useConfirm();
    const [filterEventId, setFilterEventId] = useState(() => {
        if (initialEventId) return String(initialEventId);
        return events.length > 0 ? String(events[0].id) : 'all';
    });
    const [filterDivision, setFilterDivision] = useState(initialDivision || 'all');

    useEffect(() => {
        if (initialDivision) {
            setFilterDivision(initialDivision);
        } else {
            setFilterDivision('all');
        }
    }, [initialDivision]);

    useEffect(() => {
        if (initialEventId) {
            setFilterEventId(String(initialEventId));
        }
    }, [initialEventId]);

    const divisionsList = useMemo(() => {
        let list = heats;
        if (filterEventId !== 'all') {
            list = list.filter(h => String(h.event_id) === String(filterEventId));
        }
        return [...new Set(list.map(h => h.division).filter(d => d && d !== 'Break'))].sort();
    }, [heats, filterEventId]);

    // Mockup Capsule Filter States
    const [selectedRoundFilter, setSelectedRoundFilter] = useState('All');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

    const [slotInterval, setSlotInterval] = useState(5);
    const [daysToShow, setDaysToShow] = useState(3);
    const [viewStartDate, setViewStartDate] = useState(() => {
        const ev = events[0];
        return ev?.start_date ? ev.start_date.slice(0, 10) : getLocalDateString();
    });

    const [dragHeat, setDragHeat] = useState(null);
    const [dragOverSlot, setDragOverSlot] = useState(null);
    const [dragOverDate, setDragOverDate] = useState(null);
    const [savingId, setSavingId] = useState(null);

    const scrollContainerRef = useRef(null);
    const [hasScrolled, setHasScrolled] = useState(false);
    const [tooltip, setTooltip] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [selectedUnscheduledIds, setSelectedUnscheduledIds] = useState([]);
    const [selectedScheduledIds, setSelectedScheduledIds] = useState([]);

    const totalSlotsForRange = useMemo(() => {
        return ((END_HOUR - START_HOUR) * 60) / slotInterval;
    }, [slotInterval]);

    const slotToMinutes = useCallback((slotIndex) => {
        return (START_HOUR * 60) + slotIndex * slotInterval;
    }, [slotInterval]);

    const minutesToSlot = useCallback((totalMins) => {
        return (totalMins - START_HOUR * 60) / slotInterval;
    }, [slotInterval]);

    const handleEventChange = (e) => {
        const evId = e.target.value;
        setFilterEventId(evId);
        setFilterDivision('all');
        if (onFilterChange) onFilterChange(evId, 'all');
        if (evId !== 'all') {
            const ev = events.find(event => String(event.id) === String(evId));
            if (ev?.start_date) {
                setViewStartDate(ev.start_date.slice(0, 10));
            }
        }
    };

    const navigateDays = (direction) => {
        const parts = viewStartDate.split('-');
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        d.setDate(d.getDate() + direction * 1);
        setViewStartDate(getLocalDateString(d));
    };

    const [eventDaysToShow, setEventDaysToShow] = useState('all');
    const [eventDayStartIndex, setEventDayStartIndex] = useState(0);

    const eventDates = useMemo(() => {
        if (filterEventId !== 'all') {
            const ev = events.find(event => String(event.id) === String(filterEventId));
            if (ev && ev.start_date && ev.end_date) {
                const startStr = ev.start_date.slice(0, 10);
                const endStr = ev.end_date.slice(0, 10);
                
                const dates = [];
                const startParts = startStr.split('-');
                const endParts = endStr.split('-');
                let current = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));
                const endDate = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]));
                
                let safeGuard = 0;
                while (current <= endDate && safeGuard < 30) {
                    dates.push(getLocalDateString(current));
                    current.setDate(current.getDate() + 1);
                    safeGuard++;
                }
                
                return dates;
            }
        }
        return [];
    }, [filterEventId, events]);

    const calendarDates = useMemo(() => {
        if (filterEventId !== 'all' && eventDates.length > 0) {
            if (eventDaysToShow === 'all') {
                return eventDates;
            }
            const count = Number(eventDaysToShow);
            let start = Math.max(0, Math.min(eventDayStartIndex, eventDates.length - 1));
            return eventDates.slice(start, start + count);
        }
        return getDatesRangeList(viewStartDate, daysToShow);
    }, [filterEventId, eventDates, eventDaysToShow, eventDayStartIndex, viewStartDate, daysToShow]);

    // Apply filters matching WSL style capsules
    const filteredHeats = useMemo(() => {
        let list = heats;

        // Completed heats are now allowed to be shown on the calendar!

        if (filterEventId !== 'all') {
            list = list.filter(h => String(h.event_id) === String(filterEventId));
        }

        if (filterDivision !== 'all') {
            list = list.filter(h => h.division === filterDivision || h.division === 'Break');
        }

        // Round filter matching
        if (selectedRoundFilter !== 'All') {
            const cleanFilter = selectedRoundFilter.toLowerCase().replace(/\s+/g, '');
            list = list.filter(h => {
                const r = (h.round || '').toLowerCase().replace(/\s+/g, '');
                if (cleanFilter === 'quarterfinals') return r.includes('quarter');
                if (cleanFilter === 'semifinals') return r.includes('semi');
                if (cleanFilter === 'roundof32') return r.includes('32') || r.includes('thirtytwo');
                if (cleanFilter === 'roundof16') return r.includes('16') || r.includes('sixteen');
                return r.includes(cleanFilter);
            });
        }

        // Status filter matching
        if (selectedStatusFilter !== 'All') {
            list = list.filter(h => {
                if (selectedStatusFilter === 'Live') return h.status === 'in-progress';
                if (selectedStatusFilter === 'Upcoming') return h.status === 'scheduled' || h.status === 'upcoming' || !h.status;
                if (selectedStatusFilter === 'Completed') return h.status === 'completed' || h.status === 'finished';
                return true;
            });
        }

        return list;
    }, [heats, filterEventId, selectedRoundFilter, selectedStatusFilter]);

    const parsedHeats = useMemo(() => {
        return filteredHeats.map(h => {
            let date = null;
            let time = null;
            if (h.start_time) {
                if (h.start_time.includes(' ')) {
                    const parts = h.start_time.split(' ');
                    date = parts[0];
                    time = parts[1];
                } else {
                    date = null;
                    time = h.start_time;
                }
            }
            return { ...h, scheduledDate: date, timeOnly: time };
        });
    }, [filteredHeats, calendarDates]);

    const scheduledHeats = useMemo(() => parsedHeats.filter(h => h.scheduledDate && h.timeOnly), [parsedHeats]);
    const unscheduledHeats = useMemo(() => {
        const uHeats = parsedHeats.filter(h => !h.scheduledDate || !h.timeOnly);
        return uHeats.sort((a, b) => {
            const isBreakA = a.division === 'Break' || (a.round || '').toLowerCase().includes('break');
            const isBreakB = b.division === 'Break' || (b.round || '').toLowerCase().includes('break');
            if (isBreakA && !isBreakB) return -1;
            if (!isBreakA && isBreakB) return 1;
            return 0; // preserve original order otherwise
        });
    }, [parsedHeats]);

    useEffect(() => {
        if (!hasScrolled && scheduledHeats.length > 0 && scrollContainerRef.current) {
            let minMins = null;
            scheduledHeats.forEach(h => {
                const mins = timeStrToMinutes(h.timeOnly);
                if (mins !== null) {
                    if (minMins === null || mins < minMins) {
                        minMins = mins;
                    }
                }
            });
            
            if (minMins !== null) {
                const slotStart = Math.floor((minMins - START_HOUR * 60) / slotInterval);
                const targetPixel = slotStart * SLOT_HEIGHT;
                scrollContainerRef.current.scrollTop = Math.max(0, targetPixel - 40);
                setHasScrolled(true);
            }
        }
    }, [scheduledHeats, slotInterval, hasScrolled]);

    const handleDragStart = (e, heat) => {
        if (!onReschedule) {
            e.preventDefault();
            return;
        }
        if (heat.status === 'in-progress' || heat.status === 'completed') {
            e.preventDefault();
            return;
        }
        const startMins = timeStrToMinutes(heat.start_time);
        const slotIndex = startMins !== null ? Math.floor(minutesToSlot(startMins)) : 0;
        const rect = e.currentTarget.getBoundingClientRect();
        const yOffset = e.clientY - rect.top;
        const offsetSlot = Math.floor(yOffset / SLOT_HEIGHT);
        
        if (selectedUnscheduledIds.includes(heat.id) && !heat.start_time) {
            // Dragging multiple selected unscheduled heats
            const selectedHeats = unscheduledHeats.filter(h => selectedUnscheduledIds.includes(h.id));
            setDragHeat({
                heats: selectedHeats,
                sourceType: 'multiple_unscheduled',
                isMultiple: true
            });
        } else if (selectedScheduledIds.includes(heat.id) && heat.start_time) {
            // Dragging multiple selected scheduled heats
            const scheduledHeats = parsedHeats.filter(h => h.scheduledDate);
            const selectedHeats = scheduledHeats
                .filter(h => selectedScheduledIds.includes(h.id))
                .sort((a, b) => timeStrToMinutes(a.timeOnly) - timeStrToMinutes(b.timeOnly));
            setDragHeat({
                heats: selectedHeats,
                sourceType: 'multiple_scheduled',
                isMultiple: true
            });
        } else {
            // Dragging a single heat
            setDragHeat({
                ...heat,
                sourceType: heat.start_time ? 'calendar' : 'unscheduled',
                isMultiple: false,
                offsetSlot: offsetSlot || 0
            });
        }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', heat.id);
    };

    const handleColumnDragOver = (e, date) => {
        if (!onReschedule) return;
        e.preventDefault();
        const columnRect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - columnRect.top;
        const rawSlot = Math.floor(y / SLOT_HEIGHT);
        const slot = Math.max(0, Math.min(totalSlotsForRange - 1, rawSlot - (dragHeat?.offsetSlot || 0)));
        setDragOverSlot(slot);
        setDragOverDate(date);
    };

    const handleColumnDrop = async (e, date) => {
        if (!onReschedule) return;
        e.preventDefault();
        try {
            if (!dragHeat || dragOverSlot === null) {
                setDragHeat(null);
                setDragOverSlot(null);
                setDragOverDate(null);
                return;
            }

            console.log("=== DRAG DROP INITIATED ===");
            console.log("date:", date);
            console.log("dragOverSlot:", dragOverSlot);

            const newStartMins = slotToMinutes(dragOverSlot);
            const duration = Number(dragHeat.duration) || 30;
            const newEndMins = newStartMins + duration;

            const timeStart = minutesToTimeStr(newStartMins);
            const timeEnd = minutesToTimeStr(newEndMins);

            const newStart = `${date} ${timeStart}`;
            const newEnd = `${date} ${timeEnd}`;

            console.log("newStart:", newStart, "newEnd:", newEnd);

            if (!date || !timeEnd) {
                throw new Error("Date or End Time is missing.");
            }

            const dateParts = date.split('-');
            const timeParts = timeEnd.split(':');
            if (dateParts.length !== 3 || timeParts.length !== 2) {
                throw new Error(`Malformed date (${date}) or time (${timeEnd})`);
            }

            // Validate that we are not scheduling in the past using a robust local date constructor
            const [year, month, day] = dateParts.map(Number);
            const [hours, minutes] = timeParts.map(Number);

            if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
                throw new Error(`Invalid numeric parsing of date/time: ${year}-${month}-${day} ${hours}:${minutes}`);
            }

            const targetEndDateTime = new Date(year, month - 1, day, hours, minutes);
            const now = new Date();

            console.log("targetEndDateTime:", targetEndDateTime, "now:", now);
            console.log("Is past:", targetEndDateTime < now);

            if (targetEndDateTime < now) {
                setErrorMsg("Cannot schedule heats or breaks in the past. Please select a future date and time.");
                setDragHeat(null);
                setDragOverSlot(null);
                setDragOverDate(null);
                return;
            }

            // Handle multiple dragged heats
            if (dragHeat.isMultiple) {
                setSavingId('multiple');
                try {
                    // Schedule each selected heat sequentially
                    let currentSlotMins = dragOverSlot * slotInterval + START_HOUR * 60;
                    for (let i = 0; i < dragHeat.heats.length; i++) {
                        const currentHeat = dragHeat.heats[i];
                        const duration = Number(currentHeat.duration) || 30;
                        const timeStart = minutesToTimeStr(currentSlotMins);
                        const timeEnd = minutesToTimeStr(currentSlotMins + duration);
                        const hStart = `${date} ${timeStart}`;
                        const hEnd = `${date} ${timeEnd}`;
                        
                        const isLast = i === dragHeat.heats.length - 1;
                        const msg = isLast ? `${dragHeat.heats.length} heats scheduled successfully!` : null;
                        await onReschedule(currentHeat.id, hStart, hEnd, !isLast, msg);
                        currentSlotMins += duration;
                    }
                    if (dragHeat.sourceType === 'multiple_unscheduled') {
                        setSelectedUnscheduledIds([]);
                    } else {
                        setSelectedScheduledIds([]);
                    }
                } catch (err) {
                    console.error("Error scheduling multiple:", err);
                } finally {
                    setSavingId(null);
                }
                setDragHeat(null);
                setDragOverSlot(null);
                setDragOverDate(null);
                return;
            }

            // Handle single dragged heat with overlapping logic
            const dayHeats = scheduledHeats.filter(h => h.scheduledDate === date);
            const overlappingHeat = dayHeats.find(h => {
                const startMins = timeStrToMinutes(h.timeOnly);
                if (startMins === null) return false;
                const slotIndex = Math.floor(minutesToSlot(startMins));
                return slotIndex === dragOverSlot && h.id !== dragHeat.id;
            });

            const isBreak = dragHeat.division === 'Break' || (dragHeat.round || '').toLowerCase().includes('break');

            setSavingId(dragHeat.id);
            try {
                if (overlappingHeat) {
                    if (isBreak) {
                        const shiftDuration = Number(dragHeat.duration) || 30;
                        const overlappingStartMins = timeStrToMinutes(overlappingHeat.timeOnly);
                        
                        const heatsToShift = dayHeats
                            .filter(h => h.id !== dragHeat.id && timeStrToMinutes(h.timeOnly) >= overlappingStartMins)
                            .sort((a, b) => timeStrToMinutes(a.timeOnly) - timeStrToMinutes(b.timeOnly));
                            
                        for (let i = 0; i < heatsToShift.length; i++) {
                            const h = heatsToShift[i];
                            const hStartMins = timeStrToMinutes(h.timeOnly);
                            const hEndMins = hStartMins + (Number(h.duration) || 30);
                            const shiftedStartStr = `${date} ${minutesToTimeStr(hStartMins + shiftDuration)}`;
                            const shiftedEndStr = `${date} ${minutesToTimeStr(hEndMins + shiftDuration)}`;
                            await onReschedule(h.id, shiftedStartStr, shiftedEndStr, true);
                        }
                    } else {
                        if (dragHeat.start_time) {
                            await onReschedule(overlappingHeat.id, dragHeat.start_time, dragHeat.end_time, true);
                        } else {
                            await onReschedule(overlappingHeat.id, '', '', true);
                        }
                    }
                }
                await onReschedule(dragHeat.id, newStart, newEnd);
            } finally {
                setSavingId(null);
            }
        } catch (err) {
            console.error("Error in drag drop handler:", err);
            setErrorMsg(`Drag-and-drop error: ${err.message}`);
        } finally {
            setDragHeat(null);
            setDragOverSlot(null);
            setDragOverDate(null);
        }
    };

    const handleUnscheduledDrop = async (e) => {
        e.preventDefault();
        if (!dragHeat) return;
        if (dragHeat.start_time) {
            setSavingId(dragHeat.id);
            try {
                await onReschedule(dragHeat.id, '', '');
            } finally {
                setSavingId(null);
            }
        }
        setDragHeat(null);
        setDragOverSlot(null);
        setDragOverDate(null);
    };

    const handleUnschedule = async (e, heatId) => {
        e.stopPropagation();
        const confirmed = await showConfirm("Are you sure you want to unschedule this heat?");
        if (confirmed) {
            setSavingId(heatId);
            try {
                await onReschedule(heatId, '', '');
            } finally {
                setSavingId(null);
            }
        }
    };

    const handleUnscheduleAll = async () => {
        if (!onReschedule) return;
        const scheduledInView = filteredHeats.filter(h => h.start_time);
        if (scheduledInView.length === 0) {
            showToast("No scheduled heats in the current view.", 'error');
            return;
        }
        const confirmed = await showConfirm(`Are you sure you want to unschedule all ${scheduledInView.length} heats in this view?`);
        if (!confirmed) return;
        
        setSavingId('unschedule-all');
        try {
            for (let i = 0; i < scheduledInView.length; i++) {
                const heat = scheduledInView[i];
                const isLast = i === scheduledInView.length - 1;
                const msg = isLast ? `${scheduledInView.length} heats unscheduled successfully!` : null;
                await onReschedule(heat.id, '', '', !isLast, msg);
            }
        } catch (err) {
            console.error("Error unscheduling all:", err);
            setErrorMsg("Failed to unschedule some heats.");
        } finally {
            setSavingId(null);
        }
    };

    const activeEvent = useMemo(() => {
        return events.find(ev => String(ev.id) === String(filterEventId));
    }, [events, filterEventId]);

    const timeLabels = useMemo(() => {
        const labels = [];
        let currentMins = START_HOUR * 60;
        const endMins = END_HOUR * 60;
        while (currentMins < endMins) {
            const h = Math.floor(currentMins / 60);
            const m = currentMins % 60;
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHour = h === 12 ? 12 : h > 12 ? h - 12 : h;
            const label = `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`;
            labels.push({ label, mins: currentMins, isHour: m === 0 });
            currentMins += slotInterval;
        }
        return labels;
    }, [slotInterval]);

    const getHeatBlock = (heat) => {
        const startMins = timeStrToMinutes(heat.timeOnly);
        if (startMins === null) return null;
        const slotStart = minutesToSlot(startMins);
        if (slotStart < 0 || slotStart >= totalSlotsForRange) return null;
        const duration = heat.duration || 30;
        const slotHeight = Math.max(1, duration / slotInterval);
        return { top: slotStart * SLOT_HEIGHT, height: slotHeight * SLOT_HEIGHT };
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 220px)', minHeight: '750px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

            {/* ── WSL Brand & Filter Toolbar ────────────────────────────── */}
            <div style={{
                display: 'flex', flexDirection: 'column', gap: '16px',
                padding: '24px', background: 'var(--bg-main, #fff)',
                borderRadius: '16px', border: '1.5px solid var(--border-dim, #e2e8f0)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
            }}>
                {/* Top Toolbar Level */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    
                    {/* Selected Event Information */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>HEAT SCHEDULE</h2>
                            <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontWeight: '600', marginTop: '2px' }}>
                                {activeEvent ? `${activeEvent.name} • ${activeEvent.location || 'Cloudbreak, Fiji'} • ${activeEvent.date_range || 'Season 2024'}` : 'Cloudbreak, Fiji • Season 2024'}
                            </p>
                        </div>
                    </div>

                    {/* Capsule-Pill Status Filters */}
                    <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.04)', padding: '4px', borderRadius: '30px', border: '1px solid rgba(15,23,42,0.03)' }}>
                        {['All', 'Live', 'Upcoming', 'Completed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setSelectedStatusFilter(status)}
                                style={{
                                    border: 'none', borderRadius: '30px', padding: '8px 16px',
                                    fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                                    background: selectedStatusFilter === status ? '#0F172A' : 'transparent',
                                    color: selectedStatusFilter === status ? '#fff' : '#64748B',
                                    transition: 'all 0.15s ease',
                                    outline: 'none'
                                }}
                            >
                                {status === 'All' ? 'All Heats' : status === 'Live' ? 'Live Only' : status === 'Completed' ? 'Completed' : 'Upcoming Only'}
                            </button>
                        ))}
                    </div>

                    {/* Add Break action button */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {onReschedule && (
                            <button
                                onClick={handleUnscheduleAll}
                                style={{
                                    background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1',
                                    borderRadius: '12px', padding: '10px 16px', fontSize: '13px',
                                    fontWeight: '700', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', gap: '6px', transition: 'all 0.2s', outline: 'none'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
                            >
                                <X size={14} strokeWidth={2.5} /> UNSCHEDULE ALL
                            </button>
                        )}
                        {onAddBreak && (
                            <button
                                onClick={() => onAddBreak(filterEventId, filterDivision)}
                                style={{
                                    background: '#FF6B76', color: '#fff', border: 'none',
                                    borderRadius: '12px', padding: '10px 22px', fontSize: '13px',
                                    fontWeight: '900', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(255,107,118,0.25)',
                                    transition: 'all 0.2s', outline: 'none'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#ff5764'}
                                onMouseLeave={e => e.currentTarget.style.background = '#FF6B76'}
                            >
                                <span style={{ fontSize: '16px', fontWeight: '900', lineHeight: 1 }}>+</span> ADD BREAK
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-toolbar level: Events selection, Time slot step, Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderTop: '1.5px solid var(--border-dim, #e2e8f0)', paddingTop: '16px' }}>
                    
                    {/* Selectors Group */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        {/* Event Selector drop */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Sliders size={16} style={{ color: '#64748B' }} />
                            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.8px' }}>Select Event</span>
                            <select
                                value={filterEventId}
                                onChange={handleEventChange}
                                style={{
                                    border: '1.5px solid var(--border-dim, #e2e8f0)',
                                    borderRadius: '10px',
                                    padding: '6px 28px 6px 12px',
                                    fontSize: '13px', fontWeight: '700',
                                    background: 'var(--bg-main, #fff)', color: 'var(--text-dark, #0F172A)',
                                    cursor: 'pointer', outline: 'none'
                                }}
                            >
                                <option value="all">All Events</option>
                                {events.map(ev => (
                                    <option key={ev.id} value={String(ev.id)}>{ev.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Division Selector drop */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Sliders size={16} style={{ color: '#64748B' }} />
                            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.8px' }}>Division</span>
                            <select
                                value={filterDivision}
                                onChange={(e) => {
                                    setFilterDivision(e.target.value);
                                    if (onFilterChange) onFilterChange(filterEventId, e.target.value);
                                }}
                                style={{
                                    border: '1.5px solid var(--border-dim, #e2e8f0)',
                                    borderRadius: '10px',
                                    padding: '6px 28px 6px 12px',
                                    fontSize: '13px', fontWeight: '700',
                                    background: 'var(--bg-main, #fff)', color: 'var(--text-dark, #0F172A)',
                                    cursor: 'pointer', outline: 'none'
                                }}
                            >
                                <option value="all">All Divisions</option>
                                {divisionsList.map(div => (
                                    <option key={div} value={div}>{formatDivisionName(div, events.find(e => String(e.id) === String(filterEventId)))}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Customizable Step size & Day selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* View Days Configuration */}
                        {filterEventId !== 'all' && eventDates.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} style={{ color: '#64748B' }} />
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>View:</span>
                                
                                {/* Paginator */}
                                {eventDaysToShow !== 'all' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                                        <button 
                                            onClick={() => setEventDayStartIndex(Math.max(0, eventDayStartIndex - 1))}
                                            disabled={eventDayStartIndex === 0}
                                            style={{
                                                background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px',
                                                padding: '4px', cursor: eventDayStartIndex === 0 ? 'not-allowed' : 'pointer',
                                                opacity: eventDayStartIndex === 0 ? 0.5 : 1, color: '#475569', display: 'flex'
                                            }}
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <button 
                                            onClick={() => setEventDayStartIndex(Math.min(eventDates.length - 1, eventDayStartIndex + 1))}
                                            disabled={eventDayStartIndex + Number(eventDaysToShow) >= eventDates.length}
                                            style={{
                                                background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px',
                                                padding: '4px', cursor: (eventDayStartIndex + Number(eventDaysToShow) >= eventDates.length) ? 'not-allowed' : 'pointer',
                                                opacity: (eventDayStartIndex + Number(eventDaysToShow) >= eventDates.length) ? 0.5 : 1, color: '#475569', display: 'flex'
                                            }}
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                )}

                                <select
                                    value={eventDaysToShow}
                                    onChange={(e) => {
                                        setEventDaysToShow(e.target.value);
                                        const todayStr = getLocalDateString();
                                        const todayIdx = eventDates.findIndex(d => d === todayStr);
                                        setEventDayStartIndex(todayIdx !== -1 ? todayIdx : 0);
                                    }}
                                    style={{
                                        border: '1.5px solid var(--border-dim, #e2e8f0)',
                                        borderRadius: '10px',
                                        padding: '6px 28px 6px 12px',
                                        fontSize: '13px', fontWeight: '700',
                                        background: 'var(--bg-main, #fff)', color: 'var(--text-dark, #0F172A)',
                                        cursor: 'pointer', outline: 'none'
                                    }}
                                >
                                    <option value="all">All Days</option>
                                    <option value="1">1 Day</option>
                                    <option value="2">2 Days</option>
                                    <option value="3">3 Days</option>
                                    <option value="5">5 Days</option>
                                    <option value="7">7 Days</option>
                                </select>
                            </div>
                        )}

                        {/* Grid Step */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} style={{ color: '#64748B' }} />
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Grid Step:</span>
                        <select
                            value={slotInterval}
                            onChange={(e) => setSlotInterval(Number(e.target.value))}
                            style={{
                                border: '1.5px solid var(--border-dim, #e2e8f0)',
                                borderRadius: '10px',
                                padding: '6px 28px 6px 12px',
                                fontSize: '13px', fontWeight: '700',
                                background: 'var(--bg-main, #fff)', color: 'var(--text-dark, #0F172A)',
                                cursor: 'pointer', outline: 'none'
                            }}
                        >
                            <option value="5">5 Mins</option>
                            <option value="10">10 Mins</option>
                            <option value="15">15 Mins</option>
                            <option value="20">20 Mins</option>
                            <option value="30">30 Mins</option>
                            <option value="45">45 Mins</option>
                            <option value="60">60 Mins</option>
                        </select>
                    </div>
                    </div>
                    {/* Navigation buttons and Picker removed as dates are now inferred from the event */}
                </div>
            </div>

            {/* ── Main Timetable Layout ──────────────── */}
            <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
 
                {/* Left side sidebar for Unscheduled list */}
                {onReschedule && (
                <div
                    style={{
                        width: '270px', flexShrink: 0,
                        background: 'rgba(15, 23, 42, 0.01)',
                        border: dragHeat && !dragOverDate ? '2.5px dashed var(--accent-blue, #3b82f6)' : '1.5px dashed var(--border-dim, #e2e8f0)',
                        borderRadius: '16px', padding: '18px',
                        display: 'flex', flexDirection: 'column', gap: '12px',
                        transition: 'border 0.2s', overflowY: 'auto'
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOverDate(null); setDragOverSlot(null); }}
                    onDrop={handleUnscheduledDrop}
                >
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid var(--border-dim, #e2e8f0)', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={14} />
                            Unscheduled ({unscheduledHeats.length})
                        </div>
                        {unscheduledHeats.length > 0 && (
                            <button
                                onClick={() => {
                                    if (selectedUnscheduledIds.length === unscheduledHeats.length) {
                                        setSelectedUnscheduledIds([]); // deselect all
                                    } else {
                                        setSelectedUnscheduledIds(unscheduledHeats.map(h => h.id)); // select all
                                    }
                                }}
                                style={{
                                    background: selectedUnscheduledIds.length === unscheduledHeats.length ? '#0F172A' : '#F1F5F9',
                                    color: selectedUnscheduledIds.length === unscheduledHeats.length ? '#fff' : '#475569',
                                    border: '1px solid',
                                    borderColor: selectedUnscheduledIds.length === unscheduledHeats.length ? '#0F172A' : '#CBD5E1',
                                    borderRadius: '6px', padding: '4px 8px', fontSize: '10px',
                                    fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', outline: 'none'
                                }}
                            >
                                {selectedUnscheduledIds.length === unscheduledHeats.length ? 'DESELECT ALL' : 'SELECT ALL'}
                            </button>
                        )}
                    </div>
                    {unscheduledHeats.length === 0 && (
                        <div style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', padding: '40px 10px', opacity: 0.5 }}>
                            All heats are scheduled on the calendar!
                        </div>
                    )}
                    {unscheduledHeats.map(heat => {
                        const col = getDynamicHeatColor(heat);
                        return (
                            <div
                                key={heat.id}
                                draggable
                                onDragStart={e => handleDragStart(e, heat)}
                                onDragEnd={() => { setDragHeat(null); setDragOverSlot(null); setDragOverDate(null); }}
                                style={{
                                    padding: '14px 16px', borderRadius: '12px',
                                    background: selectedUnscheduledIds.includes(heat.id) ? '#F8FAFC' : '#FFFFFF',
                                    border: `2px solid ${col.border}`,
                                    cursor: 'grab', opacity: (savingId === heat.id || savingId === 'multiple') ? 0.5 : 1,
                                    boxShadow: selectedUnscheduledIds.includes(heat.id) ? '0 0 0 2px rgba(59,130,246,0.3)' : '0 3px 8px rgba(0,0,0,0.03)',
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                    position: 'relative'
                                }}
                                onClick={() => {
                                    if (selectedUnscheduledIds.includes(heat.id)) {
                                        setSelectedUnscheduledIds(selectedUnscheduledIds.filter(id => id !== heat.id));
                                    } else {
                                        setSelectedUnscheduledIds([...selectedUnscheduledIds, heat.id]);
                                    }
                                }}
                            >
                                {onDeleteHeat && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteHeat(heat.id);
                                        }}
                                        style={{
                                            position: 'absolute', top: '8px', right: selectedUnscheduledIds.includes(heat.id) ? '36px' : '10px',
                                            background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', zIndex: 10
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                {selectedUnscheduledIds.includes(heat.id) && (
                                    <div style={{ position: 'absolute', top: '8px', right: '10px', color: '#3B82F6' }}>
                                        <CheckCircle2 size={18} />
                                    </div>
                                )}
                                <div style={{ fontSize: '14px', fontWeight: '850', color: '#0F172A' }}>
                                    {savingId === heat.id && '⏳ '}
                                    {(heat.division === 'Break' || (heat.round || '').toLowerCase().includes('break')) 
                                        ? (heat.round || 'Break') 
                                        : `Heat #${heat.heat_number}`}
                                </div>
                                {!(heat.division === 'Break' || (heat.round || '').toLowerCase().includes('break')) && (
                                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', fontWeight: '750' }}>
                                        {formatDivisionName(heat.division, events.find(e => e.id === heat.event_id))}
                                    </div>
                                )}
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', fontWeight: '600' }}>
                                    {(heat.division === 'Break' || (heat.round || '').toLowerCase().includes('break')) 
                                        ? `${heat.duration} MIN BREAK` 
                                        : `${heat.round} · ${heat.duration}m block`}
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}

                {/* Calendar Timeline Grid Area */}
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    border: '1.5px solid var(--border-dim, #e2e8f0)', borderRadius: '16px',
                    overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.015)'
                }}>
                    
                    {/* Header: Clean WSL style DAY titles */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `100px repeat(${calendarDates.length}, 1fr)`,
                        borderBottom: '1.5px solid rgba(148, 163, 184, 0.25)',
                        background: 'rgba(15, 23, 42, 0.01)'
                    }}>
                        <div style={{ borderRight: '1px solid rgba(148, 163, 184, 0.25)' }} />
                        {calendarDates.map((date, index) => {
                            const dateObj = new Date(date + 'T00:00:00');
                            const isToday = getLocalDateString() === date;
                            const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                            const dayNum = dateObj.getDate();
                            
                            return (
                                <div key={date} style={{
                                    padding: '16px 10px', textAlign: 'center',
                                    borderRight: '1px solid rgba(148, 163, 184, 0.25)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative',
                                    background: isToday ? 'rgba(255, 107, 118, 0.01)' : 'transparent'
                                }}>
                                    {/* Red indicator bar on top if active/today */}
                                    {isToday && (
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, right: 0,
                                            height: '4px', background: '#FF6B76'
                                        }} />
                                    )}
                                    <span style={{ fontSize: '13px', fontWeight: '900', color: isToday ? '#FF6B76' : '#0F172A', letterSpacing: '1px' }}>
                                        DAY {index + 1} • {monthStr} {dayNum}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Timeline grid body */}
                    <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `100px repeat(${calendarDates.length}, 1fr)`,
                            position: 'relative',
                            marginTop: '12px',
                            marginBottom: '24px',
                            height: `${totalSlotsForRange * SLOT_HEIGHT}px`,
                        }}>
                            
                            {/* Left Time stamps */}
                            <div style={{ borderRight: '1.5px solid rgba(148, 163, 184, 0.3)', background: 'rgba(15, 23, 42, 0.01)', position: 'relative' }}>
                                {timeLabels.map((slot, i) => (
                                    <div key={i} style={{ position: 'absolute', top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px`, width: '100%' }}>
                                        <span style={{
                                            position: 'absolute', right: '16px', top: '-8px',
                                            fontSize: slot.isHour ? '13px' : '12px', fontWeight: slot.isHour ? '900' : '600',
                                            color: slot.isHour ? '#0F172A' : '#64748B',
                                            opacity: slot.isHour ? 1 : 0.8
                                        }}>
                                            {slot.label.replace(' AM', '').replace(' PM', '')}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Column grid lines and blocks */}
                            {calendarDates.map((date) => {
                                const dayHeats = scheduledHeats.filter(h => h.scheduledDate === date);
                                const isTargetColumn = dragOverDate === date;

                                return (
                                    <div
                                        key={date}
                                        onDragOver={e => handleColumnDragOver(e, date)}
                                        onDrop={e => handleColumnDrop(e, date)}
                                        style={{
                                            position: 'relative', height: '100%',
                                            borderRight: '1px solid rgba(148, 163, 184, 0.25)',
                                            background: isTargetColumn ? 'rgba(59,130,246,0.01)' : 'transparent',
                                            transition: 'background 0.15s'
                                        }}
                                    >
                                        {/* Grid lines horizontal */}
                                        {timeLabels.map((slot, i) => (
                                            <div key={i} style={{
                                                position: 'absolute', top: `${i * SLOT_HEIGHT}px`, left: 0, right: 0, height: `${SLOT_HEIGHT}px`,
                                                borderTop: slot.isHour ? '1.5px solid rgba(148, 163, 184, 0.35)' : '1px dashed rgba(148, 163, 184, 0.2)',
                                                pointerEvents: 'none'
                                            }} />
                                        ))}

                                        {/* Red dashed DROP GHOST matching mockup */}
                                        {dragHeat && isTargetColumn && dragOverSlot !== null && (
                                            <div style={{
                                                position: 'absolute',
                                                top: `${dragOverSlot * SLOT_HEIGHT}px`,
                                                left: '4px', right: '4px',
                                                height: `${Math.max(SLOT_HEIGHT, ((dragHeat.isMultiple ? dragHeat.heats[0].duration : dragHeat.duration) || slotInterval) / slotInterval * SLOT_HEIGHT) - 3}px`,
                                                borderRadius: '8px', background: 'rgba(255, 107, 118, 0.06)',
                                                border: '2px dashed #FF6B76', zIndex: 5,
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                                            }}>
                                                <span style={{ fontSize: '11px', fontWeight: '900', color: '#FF6B76', letterSpacing: '0.5px' }}>
                                                    DROP HEAT HERE
                                                </span>
                                                <span style={{ fontSize: '9px', fontWeight: '800', color: '#FF6B76', marginTop: '2px', opacity: 0.8 }}>
                                                    {minutesToTimeStr(slotToMinutes(dragOverSlot))} ({(dragHeat.isMultiple ? dragHeat.heats[0].duration : dragHeat.duration) || 30} MIN BLOCK)
                                                </span>
                                            </div>
                                        )}

                                        {/* Scheduled Heat Cards */}
                                        {dayHeats.map(heat => {
                                            const block = getHeatBlock(heat);
                                            if (!block) return null;
                                            const col = getDynamicHeatColor(heat);
                                            const isLive = heat.status === 'in-progress';
                                            const isDone = heat.status === 'completed' || heat.status === 'finished';
                                            const isDragging = dragHeat?.id === heat.id;
                                            const locked = isLive || isDone;

                                            const statusColor = isLive ? '#EF4444' : isDone ? '#10B981' : '#0EA5E9';
                                            const statusBg = isLive ? 'rgba(239, 68, 68, 0.08)' : isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(14, 165, 233, 0.08)';
                                            const statusText = isLive ? 'LIVE' : isDone ? 'COMPLETED' : 'UPCOMING';
                                            const surfersList = heat.surfers || [];
                                            const isCompact = block.height < 50;
                                                    return (
                                                <div
                                                    key={heat.id}
                                                    draggable={!locked && !!onReschedule}
                                                    onDragStart={e => handleDragStart(e, heat)}
                                                    onDragEnd={() => { setDragHeat(null); setDragOverSlot(null); setDragOverDate(null); }}
                                                    onClick={(e) => {
                                                        if (e.defaultPrevented) return;
                                                        if (onSelectHeat) onSelectHeat(heat);
                                                    }}
                                                    className="schedule-card-hover"
                                                    style={{
                                                        position: 'absolute',
                                                        top: `${block.top}px`, left: '8px', right: '8px',
                                                        height: `${block.height - 4}px`, borderRadius: '12px',
                                                        background: isLive ? 'rgba(239, 68, 68, 0.04)' : isDone ? 'rgba(16, 185, 129, 0.04)' : col.bg,
                                                        border: isLive 
                                                            ? '2px solid #EF4444' 
                                                            : isDone 
                                                                ? '1.5px solid rgba(16,185,129,0.3)' 
                                                                : `1.5px solid ${col.border || 'rgba(148,163,184,0.25)'}`,
                                                        boxShadow: isLive 
                                                            ? '0 0 0 2px rgba(239,68,68,0.1), 0 6px 16px rgba(239,68,68,0.1)' 
                                                            : selectedScheduledIds.includes(heat.id) 
                                                                ? '0 0 0 3px rgba(59,130,246,0.5)'
                                                                : '0 3px 10px rgba(0,0,0,0.03)',
                                                        cursor: (locked || !onReschedule) ? 'default' : 'grab',
                                                        padding: 0, zIndex: isLive ? 10 : isDragging ? 20 : 4,
                                                        opacity: isDragging ? 0.35 : savingId === heat.id ? 0.5 : 1,
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        overflow: 'hidden', display: 'flex', flexDirection: 'column'
                                                    }}
                                                >
                                                    {/* Selection Checkbox */}
                                                    {!locked && onReschedule && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (selectedScheduledIds.includes(heat.id)) {
                                                                    setSelectedScheduledIds(selectedScheduledIds.filter(id => id !== heat.id));
                                                                } else {
                                                                    setSelectedScheduledIds([...selectedScheduledIds, heat.id]);
                                                                }
                                                            }}
                                                            style={{
                                                                position: 'absolute', top: '6px', right: '30px',
                                                                background: selectedScheduledIds.includes(heat.id) ? '#3B82F6' : 'rgba(15, 23, 42, 0.06)',
                                                                border: 'none', borderRadius: '50%',
                                                                width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', color: selectedScheduledIds.includes(heat.id) ? '#fff' : '#64748B', outline: 'none', zIndex: 15
                                                            }}
                                                            title="Select Heat"
                                                        >
                                                            {selectedScheduledIds.includes(heat.id) ? <CheckCircle2 size={12} strokeWidth={3} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid #64748B' }} />}
                                                        </button>
                                                    )}

                                                    {/* Floating Close Action on Hover */}
                                                    {!locked && onReschedule && (
                                                        <button
                                                            onClick={(e) => handleUnschedule(e, heat.id)}
                                                            className="unschedule-btn"
                                                            style={{
                                                                position: 'absolute',
                                                                top: '6px',
                                                                right: '6px',
                                                                background: 'rgba(15, 23, 42, 0.06)',
                                                                border: 'none',
                                                                borderRadius: '50%',
                                                                width: '18px',
                                                                height: '18px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                color: '#64748B',
                                                                outline: 'none',
                                                                zIndex: 15,
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                            title="Unschedule Heat"
                                                        >
                                                            <X size={10} strokeWidth={3} />
                                                        </button>
                                                    )}

                                                    {/* Main Content Area */}
                                                    <div style={{
                                                        flex: 1,
                                                        padding: isCompact ? '6px 10px' : '6px 12px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: isCompact ? 'center' : 'flex-start',
                                                        minWidth: 0,
                                                        height: '100%',
                                                        position: 'relative'
                                                    }}>
                                                        {(heat.division === 'Break' || (heat.round || '').toLowerCase().includes('break')) ? (
                                                            <div style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                height: '100%',
                                                                width: '100%',
                                                                background: 'rgba(255,107,118,0.06)',
                                                                color: '#FF6B76',
                                                                borderRadius: '8px',
                                                                padding: '6px',
                                                                textAlign: 'center'
                                                            }}>
                                                                <div style={{ fontSize: isCompact ? '10px' : '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                    {heat.round || 'Break'}
                                                                </div>
                                                                {!isCompact && (
                                                                    <div style={{ fontSize: '8px', fontWeight: '800', marginTop: '3px', textTransform: 'uppercase', opacity: 0.8 }}>
                                                                        {heat.duration || 30} MIN BREAK
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : isCompact ? (
                                                            // Compact layout for short blocks (e.g. 5-15 mins)
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#0F172A', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                                                                        H{heat.heat_number} <span style={{ color: '#64748B', fontWeight: '750', fontSize: '8px', marginLeft: '2px' }}>{heat.round}</span>
                                                                    </div>
                                                                    {/* Status Badge (smaller) */}
                                                                    <div style={{
                                                                        background: statusBg,
                                                                        color: statusColor,
                                                                        padding: '1px 5px',
                                                                        borderRadius: '8px',
                                                                        fontSize: '7px',
                                                                        fontWeight: '900',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '2px',
                                                                        marginRight: !locked ? '54px' : '0px'
                                                                    }}>
                                                                        {statusText}
                                                                    </div>
                                                                </div>
                                                                {/* Inline surfers or division/break name */}
                                                                <div style={{ fontSize: '8px', color: '#475569', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {surfersList.map(s => s.name).join(' vs ') || formatDivisionName(heat.division, events.find(e => e.id === heat.event_id))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // Full layout
                                                            <>
                                                                {/* Card Header Level */}
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#0F172A', letterSpacing: '0.1px' }}>
                                                                            HEAT {heat.heat_number}
                                                                        </span>
                                                                        <span style={{ fontSize: '9px', color: '#64748B', fontWeight: '800', background: 'rgba(15,23,42,0.05)', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                                            {heat.round || 'ROUND 1'}
                                                                        </span>
                                                                    </div>
 
                                                                    {/* Status Badge */}
                                                                    <div style={{
                                                                        background: statusBg,
                                                                        color: statusColor,
                                                                        padding: '2px 7px',
                                                                        borderRadius: '20px',
                                                                        fontSize: '7.5px',
                                                                        fontWeight: '900',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '3px',
                                                                        letterSpacing: '0.5px',
                                                                        marginRight: (!locked && onReschedule) ? '54px' : '0px'
                                                                    }}>
                                                                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                                                                        {statusText}
                                                                    </div>
                                                                </div>

                                                                {/* Division Name Subtitle */}
                                                                <div style={{ fontSize: '9.5px', color: '#64748B', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {formatDivisionName(heat.division, events.find(e => e.id === heat.event_id))}
                                                                </div>
 
                                                                {/* Competitors List (colored jersey pills) */}
                                                                {surfersList.length > 0 ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', width: '100%', marginBottom: '2px' }}>
                                                                        {surfersList.map((s, idx) => (
                                                                            <div key={idx} style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px',
                                                                                fontSize: '9.5px',
                                                                                fontWeight: '800',
                                                                                color: '#334155',
                                                                                background: 'rgba(15, 23, 42, 0.03)',
                                                                                padding: '1.5px 6px',
                                                                                borderRadius: '6px',
                                                                                border: '1px solid rgba(148, 163, 184, 0.12)',
                                                                                maxWidth: '100%',
                                                                                whiteSpace: 'nowrap',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis'
                                                                            }}>
                                                                                <span style={{
                                                                                    width: '6px',
                                                                                    height: '6px',
                                                                                    borderRadius: '50%',
                                                                                    background: s.color || '#ccc',
                                                                                    border: '1px solid rgba(0,0,0,0.08)',
                                                                                    display: 'inline-block',
                                                                                    flexShrink: 0
                                                                                }} />
                                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: '750', fontStyle: 'italic', marginBottom: '4px' }}>
                                                                        No competitors seeded
                                                                    </div>
                                                                )}
 
                                                                {/* Progress Bar & Block details */}
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                                                    <span style={{ fontSize: '8.5px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                        {heat.duration || 30} MIN BLOCK
                                                                    </span>
                                                                    {isLive && (
                                                                        <div style={{ width: '40px', height: '3.5px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
                                                                            <div style={{ width: '50%', height: '100%', background: '#EF4444', borderRadius: '2px' }} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>


            {/* Past Date/Time Scheduling Alert Modal */}
            {errorMsg && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 99999
                }}>
                    <div style={{
                        background: '#FFFFFF', borderRadius: '16px', padding: '24px',
                        maxWidth: '400px', width: '90%', textAlign: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        border: '1px solid rgba(148,163,184,0.2)'
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px auto', fontSize: '24px'
                        }}>
                            ⚠️
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px 0' }}>
                            Scheduling Blocked
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                            {errorMsg}
                        </p>
                        <button
                            onClick={() => setErrorMsg(null)}
                            style={{
                                width: '100%', background: '#0F172A', color: '#FFFFFF',
                                border: 'none', borderRadius: '12px', padding: '12px 24px',
                                fontSize: '14px', fontWeight: '800', cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#1E293B'}
                            onMouseLeave={e => e.currentTarget.style.background = '#0F172A'}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .live-dot-pulse {
                    box-shadow: 0 0 0 2px rgba(34,197,94,0.3);
                    animation: pulse-indicator 1.5s infinite;
                }
                .schedule-card-hover {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .schedule-card-hover:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08) !important;
                }
                .unschedule-btn {
                    opacity: 0;
                    transition: opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease;
                }
                .schedule-card-hover:hover .unschedule-btn {
                    opacity: 1;
                }
                .unschedule-btn:hover {
                    background-color: #EF4444 !important;
                    color: #FFFFFF !important;
                }
                @keyframes pulse-indicator {
                    0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.3); }
                    50% { box-shadow: 0 0 0 4px rgba(34,197,94,0.15); }
                }
            `}</style>
        </div>
    );
};

export default HeatScheduleView;
