import React, { useState, useEffect } from 'react';
import './aquaticx.css';
import { Plus, Calendar as CalendarIcon, X, Check, Loader2, AlertCircle, MapPin, Edit, Trash2, Copy, Clock } from 'lucide-react';
import { useToast } from './ToastContext';
import { useConfirm } from './ConfirmContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://54.84.243.251/api';

/**
 * Safely parse a value that should be an array.
 * Handles: already-array, JSON string, double-stringified JSON, null/undefined.
 * Returns [] on any failure — prevents .map() crashes.
 */
const safeParseArray = (value) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
        let parsed = typeof value === 'string' ? JSON.parse(value) : value;
        // Handle double-stringification (parse returned another string)
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

// Global cache for instant tab-switching
let globalEventCache = {
    events: [],
    hasLoaded: false
};

const DAYS_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const defaultSessionSlots = [
    { id: 1, time: "08:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
    { id: 2, time: "10:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
    { id: 3, time: "11:30 AM", duration: "60", maxStudents: 6, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
    { id: 4, time: "01:00 PM", duration: "120", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
    { id: 5, time: "03:30 PM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
];

const getConfiguredSlotsForDate = (dateStr) => {
    let saved = null;
    try {
        const raw = localStorage.getItem('session_slots');
        if (raw) saved = JSON.parse(raw);
    } catch (e) {}
    const allSlots = (Array.isArray(saved) && saved.length > 0) ? saved : defaultSessionSlots;

    let dayName = DAYS_MAP[new Date().getDay()];
    if (dateStr) {
        try {
            const parts = String(dateStr).split('-');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                dayName = DAYS_MAP[d.getDay()];
            } else {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    dayName = DAYS_MAP[d.getDay()];
                }
            }
        } catch (e) {}
    }

    const activeSlots = allSlots.filter(s => s.active !== false);
    const daySlots = activeSlots.filter(s => (!s.days || s.days.length === 0 || s.days.includes(dayName)));
    return daySlots.length > 0 ? daySlots : activeSlots;
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

const EventManagement = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { showConfirm } = useConfirm();
    const [events, setEvents] = useState(globalEventCache.events);
    const [isLoading, setIsLoading] = useState(!globalEventCache.hasLoaded);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Get current user / admin context
    const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
    const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isStudent = savedUser.role === 'athlete' || savedUser.role === 'student' || adminInfo.role === 'athlete';
    const adminId = adminInfo.adminId || 'admin';
    const canConductEvents = !isStudent && (adminInfo.role === 'admin' || adminInfo.conductEvents === true || savedUser.role === 'school' || savedUser.role === 'admin');
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        start_date: '',
        end_date: '',
        status: 'Draft',
        event_type: 'Surfing Event',
        is_series: 0,
        series_parent_id: '',
        live_stream_url: ''
    });
    const [divisions, setDivisions] = useState([]);
    const [divisionAliases, setDivisionAliases] = useState({});
    const [divisionGender, setDivisionGender] = useState('Men');
    const [divisionType, setDivisionType] = useState('Under');
    const [divisionAge, setDivisionAge] = useState('14');
    const [sponsors, setSponsors] = useState([]);
    const [titleSponsors, setTitleSponsors] = useState([]);
    const [newSponsorName, setNewSponsorName] = useState('');
    const [newSponsorImage, setNewSponsorImage] = useState('');
    const [newTitleSponsorName, setNewTitleSponsorName] = useState('');
    const [newTitleSponsorImage, setNewTitleSponsorImage] = useState('');
    const [bannerImage, setBannerImage] = useState(null); // base64 string or null
    const fileInputRef = React.useRef(null);
    const titleFileInputRef = React.useRef(null);
    const bannerInputRef = React.useRef(null);

    useEffect(() => {
        fetchEvents(globalEventCache.hasLoaded);
    }, []);

    const fetchEvents = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            
            // 1. Fetch real events
            const response = await axios.get(`${API_BASE}/events`, {
                params: { admin_id: adminId }
            });
            const realEvents = Array.isArray(response.data) ? response.data : [];
            const savedEventSlots = JSON.parse(localStorage.getItem('event_session_slots') || '{}');
            const hydratedRealEvents = realEvents.map(ev => ({
                ...ev,
                session_slot: ev.session_slot || savedEventSlots[ev.id] || savedEventSlots[ev.slug] || savedEventSlots[ev.name] || ''
            }));

            // 2. Fetch scheduled sessions
            let virtualEvents = [];
            try {
                const sessionsRes = await axios.get('/api/sessions');
                const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
                virtualEvents = sessions.map(session => {
                    let eventDate = session.date;
                    try {
                        const parsed = new Date(session.date);
                        if (!isNaN(parsed.getTime())) {
                            eventDate = parsed.toISOString().split('T')[0];
                        }
                    } catch (e) {}

                    return {
                        id: `session-${session.id}`,
                        isSessionEvent: true, // flag to identify virtual session event
                        name: `Session: ${session.student_name || session.student || 'Student'}`,
                        event_type: 'Scheduled Session',
                        status: 'Active',
                        location: session.instructor_name || session.instructor ? `Instructor: ${session.instructor_name || session.instructor}` : 'Indica Surf School',
                        start_date: eventDate,
                        end_date: eventDate,
                        divisions: JSON.stringify([session.time || 'Morning']),
                        sponsors: JSON.stringify([]),
                        title_sponsors: JSON.stringify([]),
                        created_at: session.created_at || eventDate
                    };
                });
            } catch (err) {
                console.warn('Could not fetch sessions for event list:', err);
            }

            // 3. Combine and sort
            const combinedEvents = [...hydratedRealEvents, ...virtualEvents].sort((a, b) => {
                return new Date(a.created_at) - new Date(b.created_at);
            });

            setEvents(combinedEvents);
            globalEventCache.events = combinedEvents;
            globalEventCache.hasLoaded = true;
            setError(null);
        } catch (err) {
            console.error('Error fetching events:', err);
            setError('Failed to load events. Please ensure the backend is running.');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const MAX_EVENTS = 3;

    const handleOpenModal = (event = null) => {
        // Block creating new events beyond the limit (editing existing is always allowed)
        const actualEventsCount = events.filter(e => !e.isSessionEvent).length;
        if (!event && actualEventsCount >= MAX_EVENTS) {
            showToast(`Maximum of ${MAX_EVENTS} events allowed. Delete an event to create a new one.`, 'error');
            return;
        }
        if (event) {
            const savedSlots = JSON.parse(localStorage.getItem('event_session_slots') || '{}');
            const resolvedSlot = event.session_slot || savedSlots[event.id] || savedSlots[event.slug] || savedSlots[event.name] || '';
            const todaySlots = getConfiguredSlotsForDate(event.start_date);
            const defaultFallback = todaySlots[0] ? `${todaySlots[0].time} (${todaySlots[0].duration} min slot)` : '10:30 AM (90 min slot)';

            setEditingEvent(event);
            setFormData({
                name: event.name,
                location: event.location,
                start_date: event.start_date,
                end_date: event.end_date,
                status: event.status,
                event_type: event.event_type || 'Surfing Event',
                session_slot: resolvedSlot || defaultFallback,
                is_series: 0,
                series_parent_id: '',
                live_stream_url: ''
            });
            setDivisions(safeParseArray(event.divisions));
            setDivisionAliases(event.division_aliases ? JSON.parse(event.division_aliases) : {});
            setSponsors(safeParseArray(event.sponsors));
            setTitleSponsors(safeParseArray(event.title_sponsors));
        } else {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayDisp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const todaySlots = getConfiguredSlotsForDate(todayStr);
            const defaultSlotVal = todaySlots[0] ? `${todaySlots[0].time} (${todaySlots[0].duration} min slot)` : '10:30 AM (90 min slot)';

            setEditingEvent(null);
            setFormData({
                name: `Surf Event - ${todayDisp}`,
                location: 'Kovalam Beach Point',
                start_date: todayStr,
                end_date: todayStr,
                status: 'Active - Live',
                event_type: 'Surfing Event',
                session_slot: defaultSlotVal,
                is_series: 0,
                series_parent_id: '',
                live_stream_url: ''
            });
            setDivisions(["Men's Open", "Women's Open"]);
            setDivisionAliases({});
            setSponsors([]);
            setTitleSponsors([]);
        }
        setDivisionGender('Men');
        setDivisionType('Under');
        setDivisionAge('14');
        setNewSponsorName('');
        setNewSponsorImage('');
        setNewTitleSponsorName('');
        setNewTitleSponsorImage('');
        setBannerImage(event?.banner_image || null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (titleFileInputRef.current) titleFileInputRef.current.value = '';
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        setIsModalOpen(true);
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        // Extra guard: don't allow creating beyond the cap
        const actualEventsCount = events.filter(e => !e.isSessionEvent).length;
        if (!editingEvent && actualEventsCount >= MAX_EVENTS) {
            showToast(`Maximum of ${MAX_EVENTS} events allowed.`, 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            let finalDivisions = [...divisions];
            const todayStr = new Date().toISOString().split('T')[0];

            const dataToSubmit = {
                ...formData,
                name: (formData.name || 'Surf Event').trim(),
                location: (formData.location || 'Kovalam Beach Point').trim(),
                start_date: formData.start_date || todayStr,
                end_date: formData.end_date || todayStr,
                status: formData.status || 'Draft',
                event_type: formData.event_type || 'Surfing Event',
                session_slot: formData.session_slot,
                is_series: 0,
                series_parent_id: null,
                divisions: JSON.stringify(finalDivisions.length > 0 ? finalDivisions : ["Men's Open", "Women's Open"]),
                division_aliases: divisionAliases || {},
                sponsors: Array.isArray(sponsors) ? sponsors : safeParseArray(sponsors),
                title_sponsors: Array.isArray(titleSponsors) ? titleSponsors : safeParseArray(titleSponsors),
                admin_id: adminId || 'admin',
                banner_image: bannerImage || null
            };

            if (editingEvent) {
                // Optimistic UI
                setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? { ...ev, ...dataToSubmit, session_slot: formData.session_slot } : ev));
                const savedSlots = JSON.parse(localStorage.getItem('event_session_slots') || '{}');
                savedSlots[editingEvent.id] = formData.session_slot;
                if (editingEvent.slug) savedSlots[editingEvent.slug] = formData.session_slot;
                if (editingEvent.name) savedSlots[editingEvent.name] = formData.session_slot;
                localStorage.setItem('event_session_slots', JSON.stringify(savedSlots));

                await axios.put(`${API_BASE}/events/${editingEvent.id}`, dataToSubmit);
                showToast('Event updated successfully', 'success');
            } else {
                const res = await axios.post(`${API_BASE}/events`, dataToSubmit);
                const created = res.data ? { ...res.data, session_slot: formData.session_slot } : null;
                if (created) {
                    const savedSlots = JSON.parse(localStorage.getItem('event_session_slots') || '{}');
                    savedSlots[created.id] = formData.session_slot;
                    if (created.slug) savedSlots[created.slug] = formData.session_slot;
                    if (created.name) savedSlots[created.name] = formData.session_slot;
                    localStorage.setItem('event_session_slots', JSON.stringify(savedSlots));
                    setEvents(prev => [...prev, created]);
                }
                showToast('Event created successfully', 'success');
            }

            setIsModalOpen(false);
            setFormData({ name: '', location: '', start_date: '', end_date: '', status: 'Draft', event_type: 'Surfing Event', is_series: 0, series_parent_id: '', live_stream_url: '' });
            setEditingEvent(null);
            fetchEvents(true); // Silent sync
        } catch (err) {
            console.error('Error saving event:', err);
            fetchEvents(true); // Revert
            const errorMessage = err.response?.data?.error || `Failed to ${editingEvent ? 'update' : 'create'} event. Please try again.`;
            showToast(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const buildDivisionLabel = (gender, type, age) => {
        const genderLabel = gender === 'Men' ? "Men's" : "Women's";
        let ageLabel;
        if (age === 'Open') {
            ageLabel = 'Open';
        } else {
            ageLabel = `${type} ${age}`;
        }
        return `${genderLabel} ${ageLabel}`;
    };

    const addDivision = () => {
        const label = buildDivisionLabel(divisionGender, divisionType, divisionAge);
        if (!divisions.includes(label)) {
            setDivisions([...divisions, label]);
        }
    };

    const removeDivision = (index) => {
        const divName = divisions[index];
        setDivisions(divisions.filter((_, i) => i !== index));
        
        if (divisionAliases[divName]) {
            const newAliases = { ...divisionAliases };
            delete newAliases[divName];
            setDivisionAliases(newAliases);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewSponsorImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTitleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewTitleSponsorImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBannerUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast('Banner image must be under 2MB. Please choose a smaller file.', 'error');
            if (bannerInputRef.current) bannerInputRef.current.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setBannerImage(reader.result);
        reader.readAsDataURL(file);
    };

    const addSponsor = () => {
        if (newSponsorName.trim() && newSponsorImage) {
            setSponsors([...sponsors, { name: newSponsorName.trim(), image: newSponsorImage }]);
            setNewSponsorName('');
            setNewSponsorImage('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
            showToast('Please provide both a sponsor name and an image.', 'error');
        }
    };

    const removeSponsor = (index) => {
        setSponsors(sponsors.filter((_, i) => i !== index));
    };

    const addTitleSponsor = () => {
        if (newTitleSponsorName.trim() && newTitleSponsorImage) {
            setTitleSponsors([...titleSponsors, { name: newTitleSponsorName.trim(), image: newTitleSponsorImage }]);
            setNewTitleSponsorName('');
            setNewTitleSponsorImage('');
            if (titleFileInputRef.current) titleFileInputRef.current.value = '';
        } else {
            showToast('Please provide both a title sponsor name and an image.', 'error');
        }
    };

    const removeTitleSponsor = (index) => {
        setTitleSponsors(titleSponsors.filter((_, i) => i !== index));
    };

    const handleDeleteEvent = async (id) => {
        let confirmed = false;
        try {
            if (showConfirm) {
                confirmed = await showConfirm('Are you sure you want to delete this event?');
            } else {
                confirmed = window.confirm('Are you sure you want to delete this event?');
            }
        } catch (e) {
            confirmed = window.confirm('Are you sure you want to delete this event?');
        }
        if (!confirmed) return;
        setEvents(prev => prev.filter(ev => ev.id !== id)); // Optimistic UI
        globalEventCache.events = globalEventCache.events.filter(ev => ev.id !== id);
        try {
            await axios.delete(`${API_BASE}/events/${id}`);
            fetchEvents(true); // Silent sync
            showToast('Event deleted successfully!', 'success');
        } catch (err) {
            console.error('Error deleting event:', err);
            fetchEvents(true); // Revert
            showToast('Failed to delete event.', 'error');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    };

    const actualEventsCount = events.filter(ev => !ev.isSessionEvent).length;

    return (
        <>
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 style={{ fontSize: '30px', fontWeight: '700', letterSpacing: '-0.5px' }}>Event Management</h2>
                        <p className="text-secondary" style={{ marginTop: '4px' }}>Create and manage surfing competition events</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {actualEventsCount >= MAX_EVENTS && (
                            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '700', background: '#fef3c7', padding: '4px 10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                {MAX_EVENTS}/{MAX_EVENTS} events — limit reached
                            </span>
                        )}
                        {!isStudent && (
                            <button
                                onClick={() => handleOpenModal()}
                                className="btn btn-primary"
                                disabled={actualEventsCount >= MAX_EVENTS || !canConductEvents}
                                title={!canConductEvents ? 'Event creation disabled by super admin' : actualEventsCount >= MAX_EVENTS ? `Maximum ${MAX_EVENTS} events allowed` : 'Create a new event'}
                                style={(actualEventsCount >= MAX_EVENTS || !canConductEvents) ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                            >
                                <Plus size={20} />
                                Create Event
                            </button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="card" style={{ padding: '80px 32px', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-blue)' }} />
                        <p className="text-secondary">Loading events...</p>
                    </div>
                ) : error ? (
                    <div className="card" style={{ padding: '48px 32px', textAlign: 'center', borderColor: 'rgba(255, 100, 100, 0.2)' }}>
                        <AlertCircle size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-red)' }} />
                        <p className="text-secondary">{error}</p>
                        <button onClick={fetchEvents} className="btn btn-secondary" style={{ marginTop: '16px' }}>Retry</button>
                    </div>
                ) : events.length > 0 ? (
                    <div className="em-events-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                        {events.map((event) => (
                            <div key={event.id} className="card animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0, lineHeight: 1.2 }}>{event.name}</h3>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                background: (event.event_type || 'Surfing Event') === 'SUP Event' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                color: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#10b981' : '#2563eb',
                                                border: `1px solid ${(event.event_type || 'Surfing Event') === 'SUP Event' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                                                fontWeight: '700',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {event.event_type || 'Surfing Event'}
                                            </span>
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        background: ['Active', 'Active - Live'].includes(event.status) ? '#22c55e' : ['Finished', 'Finished - Result Published'].includes(event.status) ? '#94a3b8' : event.status === 'Heat Drawn' ? '#3b82f6' : event.status === 'On Hold' ? '#ef4444' : '#f59e0b',
                                        color: 'white',
                                        textTransform: 'capitalize',
                                        fontWeight: '700',
                                        letterSpacing: '0.5px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0
                                    }}>
                                        {event.status === 'Active - Live' ? 'Live' : event.status === 'On Hold' ? 'On Hold' : event.status === 'Finished - Result Published' ? 'Finished' : event.status}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div className="flex items-center gap-2 text-secondary" style={{ fontSize: '14px' }}>
                                        <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                                        {event.location}
                                    </div>
                                    <div className="flex items-center gap-2 text-secondary" style={{ fontSize: '14px' }}>
                                        <CalendarIcon size={16} style={{ color: 'var(--text-muted)' }} />
                                        {formatDate(event.start_date)} - {formatDate(event.end_date)}
                                    </div>
                                    <div className="flex items-center gap-2" style={{ fontSize: '13px', fontWeight: '700', color: '#0d9488', background: 'rgba(13, 148, 136, 0.08)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(13, 148, 136, 0.2)', width: 'fit-content', marginTop: '2px' }}>
                                        <Clock size={15} style={{ color: '#0d9488' }} />
                                        <span>{(() => {
                                            const savedSlots = JSON.parse(localStorage.getItem('event_session_slots') || '{}');
                                            const found = event.session_slot || savedSlots[event.id] || savedSlots[event.slug] || savedSlots[event.name];
                                            if (found) return found;
                                            const todaySlots = getConfiguredSlotsForDate(event.start_date);
                                            return todaySlots[0] ? `${todaySlots[0].time} (${todaySlots[0].duration} min slot)` : '10:30 AM (90 min slot)';
                                        })()}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {safeParseArray(event.divisions).map((div, i) => (
                                        <span key={i} style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-dim)' }}>
                                            {formatDivisionName(div, event)}
                                        </span>
                                    ))}
                                </div>




                                {!isStudent && (
                                    <div className="flex gap-3" style={{ marginTop: 'auto', paddingTop: '8px' }}>
                                        {event.isSessionEvent ? (
                                            <button
                                                onClick={() => navigate('/sessions')}
                                                className="btn btn-secondary"
                                                style={{
                                                    flex: 1,
                                                    justifyContent: 'center',
                                                    padding: '10px',
                                                    fontSize: '14px',
                                                    background: 'var(--surface-hover)',
                                                    borderColor: 'var(--border-dim)',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                Manage Session
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleOpenModal(event)}
                                                    className="btn btn-secondary"
                                                    style={{
                                                        flex: 1,
                                                        justifyContent: 'center',
                                                        padding: '10px',
                                                        fontSize: '14px',
                                                        background: 'var(--surface-hover)',
                                                        borderColor: 'var(--border-dim)',
                                                        borderRadius: '8px'
                                                    }}
                                                >
                                                    <Edit size={16} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/broadcast/${event.id}`;
                                                        navigator.clipboard.writeText(link);
                                                        showToast('OBS Broadcast link copied to clipboard!', 'success');
                                                    }}
                                                    className="btn btn-secondary"
                                                    title="Copy OBS Broadcast Link"
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        padding: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: 'var(--surface-hover)',
                                                        borderColor: 'var(--border-dim)',
                                                        borderRadius: '8px'
                                                    }}
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                    className="btn btn-danger"
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        padding: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                        borderRadius: '8px'
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card empty-state">
                        <div className="icon-box">
                            <CalendarIcon size={32} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className="text-secondary" style={{ fontSize: '18px', fontWeight: '500' }}>No events created yet</p>
                        <button onClick={() => handleOpenModal()} className="btn btn-primary" disabled={!canConductEvents} style={{ marginTop: '16px', ...(!canConductEvents ? { opacity: 0.45, cursor: 'not-allowed' } : {}) }}>
                            <Plus size={20} />
                            Create Your First Event
                        </button>
                    </div>
                )}
            </div>

            {/* Create Event Modal */}
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
                    <form onSubmit={handleCreateEvent} className="modal-content" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {editingEvent ? 'Update the details for this competition event' : 'Enter the details for your new surfing competition event'}
                                </p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>                        <div className="p-8">
                            {/* Interactive Event Date Selector */}
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Event Date <span>*</span></span>
                                    <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: 800 }}>
                                        {(() => {
                                            try {
                                                const parts = (formData.start_date || '').split('-');
                                                if (parts.length === 3) {
                                                    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                                    return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
                                                }
                                            } catch(e) {}
                                            return formData.start_date;
                                        })()}
                                    </span>
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    required
                                    style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A', background: '#F8FAFC' }}
                                    value={formData.start_date}
                                    onChange={(e) => {
                                        const newDate = e.target.value;
                                        let newName = formData.name;
                                        try {
                                            const parts = newDate.split('-');
                                            if (parts.length === 3) {
                                                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                                const disp = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                                                if (!editingEvent || !formData.name || formData.name.startsWith('Surf Event')) {
                                                    newName = `Surf Event - ${disp}`;
                                                }
                                            }
                                        } catch(err) {}

                                        const slotsForNewDate = getConfiguredSlotsForDate(newDate);
                                        const defaultSlot = slotsForNewDate[0] ? `${slotsForNewDate[0].time} (${slotsForNewDate[0].duration} min slot)` : '';
                                        const exists = slotsForNewDate.some(s => `${s.time} (${s.duration} min slot)` === formData.session_slot);
                                        
                                        setFormData({
                                            ...formData,
                                            start_date: newDate,
                                            end_date: newDate,
                                            name: newName,
                                            session_slot: exists ? formData.session_slot : (defaultSlot || formData.session_slot)
                                        });
                                    }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Event Name <span>*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="e.g., Aquatic Indica Surf Event"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Location / Surf Spot <span>*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="e.g., Kovalam Beach Point"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Configured Time Slot & Duration <span>*</span></span>
                                    <span style={{ fontSize: '11.5px', color: '#0D9488', fontWeight: '700' }}>
                                        {getConfiguredSlotsForDate(formData.start_date).length} slots configured for this day
                                    </span>
                                </label>
                                <select
                                    className="form-control"
                                    value={formData.session_slot}
                                    onChange={(e) => setFormData({ ...formData, session_slot: e.target.value })}
                                >
                                    {getConfiguredSlotsForDate(formData.start_date).map((slot) => (
                                        <option key={slot.id || slot.time} value={`${slot.time} (${slot.duration} min slot)`}>
                                            {slot.time} ({slot.duration} min slot • Max {slot.maxStudents || 4} Surfers)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-control"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="Active - Live">Live - In Progress</option>
                                    <option value="Heat Drawn">Heat Drawn</option>
                                    <option value="Finished - Result Published">Finished & Published</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '10px 32px' }}>
                                {isSubmitting ? (<><Loader2 className="animate-spin" size={16} style={{ marginRight: '6px' }} />Saving...</>) : (editingEvent ? 'Save Changes' : 'Create Event')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default EventManagement;
