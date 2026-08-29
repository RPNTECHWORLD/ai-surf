import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, X, Trophy, Calendar, MapPin, Zap, ChevronLeft, ChevronRight, Eye, Waves, Share2, Copy, Check, User, Clock, Users } from 'lucide-react';
import axios from 'axios';
import bgImage from '../../assets/bg.jpeg';
import { shareHeatCardAsImage } from './shareHeatCard';
import HeatScheduleView from './HeatScheduleView';
const useAnalyticsTracker = () => {};
const useGoogleAnalytics = () => {};
const logo = '';

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
            // Ignore parse errors
        }
    }
    return name;
};

const ScheduleListView = ({ heats, event, selectedDivision, onSelectHeat }) => {
    const [selectedScheduleDate, setSelectedScheduleDate] = useState('');

    // A heat appears in schedule only if it has a scheduled start_time AND is not completed.
    // In-progress heats without a scheduled start_time appear using their actual_start_time.
    const getEffectiveDateTime = (h) => {
        // If scheduled time exists, use it
        if (h.start_time && h.start_time.includes(' ')) {
            return { dateStr: h.start_time.split(' ')[0], timeStr: h.start_time };
        }
        // Heat with no scheduled time — show using actual_start_time
        if (h.actual_start_time) {
            const dt = new Date(h.actual_start_time);
            const y = dt.getFullYear();
            const mo = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            const hh = String(dt.getHours()).padStart(2, '0');
            const mm = String(dt.getMinutes()).padStart(2, '0');
            const localDateStr = `${y}-${mo}-${d}`;
            const localTimeStr = `${localDateStr} ${hh}:${mm}`;
            return { dateStr: localDateStr, timeStr: localTimeStr };
        }
        return null;
    };

    const scheduledItems = useMemo(() => {
        return heats
            .map(h => {
                const eff = getEffectiveDateTime(h);
                if (!eff) return null;
                return { ...h, _effectiveDate: eff.dateStr, _effectiveTime: eff.timeStr };
            })
            .filter(Boolean);
    }, [heats]);

    const divisionFilteredItems = useMemo(() => {
        if (!selectedDivision || selectedDivision === 'all') {
            return scheduledItems;
        }
        return scheduledItems.filter(h => h.division === selectedDivision);
    }, [scheduledItems, selectedDivision]);

    const uniqueDates = useMemo(() => {
        const dates = [...new Set(divisionFilteredItems.map(h => h._effectiveDate))];
        return dates.sort((a, b) => a.localeCompare(b));
    }, [divisionFilteredItems]);

    useEffect(() => {
        if (uniqueDates.length > 0 && (!selectedScheduleDate || !uniqueDates.includes(selectedScheduleDate))) {
            setSelectedScheduleDate(uniqueDates[0]);
        }
    }, [uniqueDates, selectedScheduleDate]);

    const getCapsuleDateInfo = (dateStr) => {
        const parts = dateStr.split('-');
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return {
            dayOfWeek: days[d.getDay()],
            dayNum: d.getDate(),
            monthName: months[d.getMonth()]
        };
    };

    const formatTime12Hour = (timeStr) => {
        if (!timeStr) return '';
        const t = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
        const parts = t.split(':');
        let h = parseInt(parts[0], 10);
        const m = parts[1] || '00';
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m} ${ampm}`;
    };

    const itemsForSelectedDate = useMemo(() => {
        if (!selectedScheduleDate) return [];
        return divisionFilteredItems
            .filter(item => item._effectiveDate === selectedScheduleDate)
            .sort((a, b) => a._effectiveTime.localeCompare(b._effectiveTime));
    }, [divisionFilteredItems, selectedScheduleDate]);

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offsetMins = -new Date().getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMins) / 60);
    const offsetRest = Math.abs(offsetMins) % 60;
    const sign = offsetMins >= 0 ? '+' : '-';
    const offsetStr = `GMT${sign}${offsetHours}${offsetRest ? `:${offsetRest}` : ''}`;
    const timezoneDisplay = `In event's timezone ${userTimeZone} ${offsetStr}`;

    if (uniqueDates.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '64px 32px', color: 'var(--text-gray)', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-dim)' }}>
                No scheduled items available.
            </div>
        );
    }

    return (
        <div style={{ padding: '8px 0' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>
                Schedule
            </h2>

            {/* Date capsule selectors */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
                {uniqueDates.map(dateStr => {
                    const { dayOfWeek, dayNum, monthName } = getCapsuleDateInfo(dateStr);
                    const isActive = dateStr === selectedScheduleDate;
                    return (
                        <button
                            key={dateStr}
                            onClick={() => setSelectedScheduleDate(dateStr)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '74px',
                                height: '84px',
                                borderRadius: '12px',
                                border: isActive ? '2.5px solid #0f172a' : '1.5px solid #e2e8f0',
                                background: isActive ? '#f8fafc' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                padding: '8px',
                                flexShrink: 0,
                                outline: 'none'
                            }}
                        >
                            <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                                {dayOfWeek}
                            </span>
                            <span style={{ fontSize: '20px', fontWeight: '850', color: '#0f172a', lineHeight: '1.1', marginBottom: '4px' }}>
                                {dayNum}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b' }}>
                                {monthName}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Timelines list */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border-dim)', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px', fontWeight: '600' }}>
                    {timezoneDisplay}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {itemsForSelectedDate.map((item, idx) => {
                        const isItemBreak = item.division === 'Break' || (item.round || '').toLowerCase().includes('break');
                        const isLive = item.status === 'in-progress';
                        const isCompleted = item.status === 'completed' || item.status === 'finished';
                        return (
                            <div 
                                key={item.id} 
                                onClick={() => !isItemBreak && onSelectHeat && onSelectHeat(item)}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    padding: '16px 12px', 
                                    borderBottom: idx === itemsForSelectedDate.length - 1 ? 'none' : '1px solid #f1f5f9',
                                    cursor: (isItemBreak || !onSelectHeat) ? 'default' : 'pointer',
                                    borderRadius: '8px',
                                    transition: 'background 0.2s',
                                    backgroundColor: 'transparent'
                                }}
                                onMouseOver={(e) => {
                                    if (!isItemBreak && onSelectHeat) {
                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (!isItemBreak && onSelectHeat) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                {/* Time */}
                                <div style={{ width: '110px', fontSize: '14px', fontWeight: '750', color: '#0f172a' }}>
                                    {formatTime12Hour(item._effectiveTime)}
                                </div>
                                {/* Badge + Description */}
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
                                    {isItemBreak ? (
                                        <span style={{ background: '#fce7f3', color: '#db2777', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '850', textTransform: 'uppercase', marginRight: '12px', flexShrink: 0 }}>
                                            Break
                                        </span>
                                    ) : (
                                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '850', textTransform: 'uppercase', marginRight: '12px', flexShrink: 0 }}>
                                            {formatDivisionName(item.division, event)}
                                        </span>
                                    )}
                                    <div style={{ fontSize: '14px', fontWeight: '650', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {isItemBreak ? (item.round || 'Break') : `${item.round} : Heat ${item.heat_number}`}
                                    </div>
                                </div>
                                {/* Live badge or duration */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '12px' }}>
                                    {isLive ? (
                                        <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                                            ● Live
                                        </span>
                                    ) : isCompleted ? (
                                        <span style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.3px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Trophy size={10} />
                                            Completed
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
                                            {item.duration || 30} mins
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const truncateName = (name) => {
    if (!name) return "";
    return name.length > 10 ? name.substring(0, 10) + '...' : name;
};

/**
 * Safely parse a value that should be an array.
 * Handles: already-array, JSON string, double-stringified JSON, null/undefined.
 * Returns [] on any failure — prevents .map() crashes and silent null renders.
 */
const safeParseArray = (value) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
        let parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
};

// Determine heat status from backend data
const getHeatStatus = (heat) => {
    const status = heat.status || 'Scheduled';
    // Normalize "In-Progress" to "Live"
    if (status.toLowerCase() === 'in-progress' || status.toLowerCase() === 'progress') {
        return 'Live';
    }
    return status;
};

const HeatStatusBadge = ({ heat }) => {
    const status = getHeatStatus(heat);
    const statusLower = status.toLowerCase();

    if (statusLower === 'live') {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: '#fef2f2', color: '#ef4444',
                fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px',
                padding: '4px 10px', borderRadius: '20px',
                border: '1px solid #fecaca'
            }}>
                <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#ef4444', display: 'inline-block',
                    animation: 'livePulse 1.2s ease-in-out infinite'
                }} />
                LIVE
            </span>
        );
    } else if (statusLower === 'completed' || statusLower === 'finished') {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: '#f0fdf4', color: '#059669',
                fontSize: '10px', fontWeight: '800', letterSpacing: '1px',
                padding: '3px 9px', borderRadius: '20px',
                border: '1px solid #a7f3d0'
            }}>
                <Trophy size={9} color="#059669" />
                COMPLETED
            </span>
        );
    } else {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: '#fffbeb', color: '#b45309',
                fontSize: '10px', fontWeight: '800', letterSpacing: '1px',
                padding: '3px 9px', borderRadius: '20px',
                border: '1px solid #fde68a'
            }}>
                {status.toUpperCase()}
            </span>
        );
    }
};

const useServerTimeOffset = () => {
    const [offset, setOffset] = useState(0);
    useEffect(() => {
        axios.get(`${API_BASE}/health`).then(res => {
            if (res.data?.timestamp) {
                setOffset(new Date(res.data.timestamp).getTime() - Date.now());
            }
        }).catch(() => { });
    }, []);
    return offset;
};

const LiveTimer = ({ heat }) => {
    const serverTimeOffset = useServerTimeOffset();
    const [remaining, setRemaining] = useState('');

    const status = (heat?.status || '').toLowerCase();
    const isLive = status === 'in-progress';
    const isCompleted = status === 'completed' || status === 'finished';
    const durationMin = heat?.duration || heat?.duration_minutes || 20;

    useEffect(() => {
        const updateTimer = () => {
            if (isCompleted) {
                setRemaining('00:00');
                return;
            }

            if (!isLive || !heat?.actual_start_time) {
                // Scheduled — show full duration statically
                const mm = String(durationMin).padStart(2, '0');
                setRemaining(`${mm}:00`);
                return;
            }

            const startTime = new Date(heat.actual_start_time).getTime();
            const now = Date.now() + serverTimeOffset;

            if (now < startTime) {
                // In buffer before actual start — show full duration
                const mm = String(durationMin).padStart(2, '0');
                setRemaining(`${mm}:00`);
            } else {
                const durationMs = durationMin * 60 * 1000;
                const endTime = startTime + durationMs;
                const diff = endTime - now;

                if (diff <= 0) {
                    setRemaining('00:00');
                } else {
                    const minutes = Math.floor(diff / 60000);
                    const seconds = Math.floor((diff % 60000) / 1000);
                    setRemaining(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
                }
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [heat, isLive, isCompleted, durationMin, serverTimeOffset]);

    if (!remaining) return null;

    const isExpired = remaining === '00:00';
    const color = isCompleted
        ? 'var(--text-muted)'
        : isLive && isExpired
            ? '#ef4444'
            : isLive
                ? '#16a34a'
                : 'var(--text-muted)';

    const bg = isCompleted
        ? 'rgba(15,23,42,0.05)'
        : isLive && isExpired
            ? 'rgba(239,68,68,0.1)'
            : isLive
                ? 'rgba(22,163,74,0.08)'
                : 'rgba(15,23,42,0.05)';

    const border = isCompleted
        ? '1px solid rgba(15,23,42,0.1)'
        : isLive && isExpired
            ? '1px solid rgba(239,68,68,0.3)'
            : isLive
                ? '1px solid rgba(22,163,74,0.25)'
                : '1px solid rgba(15,23,42,0.1)';

    return (
        <span style={{
            fontSize: '12px',
            fontWeight: '800',
            color,
            background: bg,
            border,
            borderRadius: '6px',
            padding: '3px 9px',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.5px',
            animation: (isLive && isExpired) ? 'pulse 1.2s infinite' : 'none'
        }}>
            ⏱ {remaining}
        </span>
    );
};

const medalTextGradient = (rank, baseSize = '18px') => {
    const common = {
        display: 'inline-block',
        minWidth: '24px',
        textAlign: 'center',
        fontSize: baseSize,
        fontWeight: '900',
    };

    if (rank === 1) return {
        ...common,
        color: '#D4AF37', // Fallback Gold
        backgroundImage: 'linear-gradient(135deg, #FFD700, #B8860B)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
    };
    if (rank === 2) return {
        ...common,
        color: '#9CA3AF', // Fallback Silver/Gray
        backgroundImage: 'linear-gradient(135deg, #C0C0C0, #808080)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
    };
    if (rank === 3) return {
        ...common,
        color: '#A85707', // Fallback Bronze
        backgroundImage: 'linear-gradient(135deg, #CD7F32, #8B4513)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
    };
    return { ...common, color: 'var(--text-dark)' };
};

const SupStopwatchViewer = ({ heat }) => {
    const serverTimeOffset = useServerTimeOffset();
    const [elapsed, setElapsed] = useState(0);

    const dbRunning = heat?.sup_timer_running === 1;
    const dbAccumulated = heat?.sup_timer_accumulated || 0;
    const dbStartTime = heat?.sup_timer_start_time ? new Date(heat.sup_timer_start_time).getTime() : null;

    useEffect(() => {
        let interval = null;
        if (dbRunning && dbStartTime) {
            interval = setInterval(() => {
                const now = Date.now() + serverTimeOffset;
                const timePassed = now - dbStartTime;
                setElapsed(dbAccumulated + timePassed);
            }, 10);
        } else {
            setElapsed(dbAccumulated);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [dbRunning, dbAccumulated, dbStartTime, serverTimeOffset]);

    const formatStopwatchTime = (ms) => {
        const totalMs = Math.max(0, ms);
        const totalSeconds = Math.floor(totalMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((totalMs % 1000) / 10);

        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');
        const csStr = centiseconds.toString().padStart(2, '0');

        return `${mStr}:${sStr}.${csStr}`;
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '700',
            color: '#1e3a8a',
            background: 'rgba(37, 99, 235, 0.05)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(37, 99, 235, 0.1)',
            marginBottom: '16px',
            width: 'fit-content'
        }}>
            <span>SUP Timer: 🕒 <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{formatStopwatchTime(elapsed)}</span></span>
        </div>
    );
};

const HeatCard = ({ heat, allHeats, onSelect, onShare, event }) => {
    const hasSurfers = heat.surfers && heat.surfers.length > 0;
    const isFinal = heat.round?.toLowerCase() === 'final';
    const isSemiFinal = heat.round?.toLowerCase() === 'semi final';
    const isSupEvent = heat.event_type === 'SUP Event' || event?.event_type === 'SUP Event';

    const timeToMinutes = (timeStr) => {
        if (!timeStr || !timeStr.includes(':')) return null;
        const parts = timeStr.split(':');
        if (parts.length < 2 || parts[0] === '' || parts[1] === '') return null;
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
    };

    // Format milliseconds as 'mm:ss.cc' for SUP finish times
    // Example: 21490ms → '00:21.49'
    const formatSupTime = (ms) => {
        if (!ms || ms === 0) return '—';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((ms % 1000) / 10);
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');
        const csStr = centiseconds.toString().padStart(2, '0');
        return `${mStr}:${sStr}.${csStr}`;
    };

    return (
        <div
            style={{
                background: 'white',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '20px 20px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: '16px',
                minWidth: '280px',
                boxShadow: 'var(--shadow-sm)',
                position: 'relative',
                overflow: 'hidden',
                opacity: hasSurfers ? 1 : 0.85
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-blue-light)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-dark)' }}>
                    Heat {heat.heat_number}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isSupEvent && <LiveTimer heat={heat} />}
                    <HeatStatusBadge heat={heat} />
                </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '8px', fontWeight: '600' }}>
                {formatDivisionName(heat.division, event)}
            </div>

            {(heat.start_time || heat.end_time) && (
                <div style={{
                    fontSize: '12px',
                    color: 'var(--text-light-muted)',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '500'
                }}>
                    <Clock size={12} style={{ opacity: 0.7 }} />
                    <span>
                        {heat.start_time || '--:--'}
                        {heat.end_time ? ` - ${heat.end_time}` : ''}
                        {(() => {
                            if (isSupEvent && heat.start_time && heat.end_time) {
                                const startMins = timeToMinutes(heat.start_time);
                                const endMins = timeToMinutes(heat.end_time);
                                if (startMins !== null && endMins !== null) {
                                    const diff = (endMins - startMins + 1440) % 1440;
                                    return ` (${diff}m)`;
                                }
                            }
                            return '';
                        })()}
                    </span>
                </div>
            )}

            
            {(() => {
                const actualSurfers = heat.surfers || [];
                const actualCount = actualSurfers.length;
                const totalCount = heat.surfer_count || 4;
                
                const JERSEY_COLORS = ['#FF0000', '#FFFFFF', '#FFFF00', '#0000FF', '#00FF00', '#000000'];
                
                const getPlaceholderText = (slotIndex) => {
                        if (!allHeats || allHeats.length === 0) return 'TBD';

                        const divisionHeats = allHeats.filter(h => h.event_id === heat.event_id && h.division === heat.division);
                        const roundNames = [...new Set(divisionHeats.map(h => h.round))];

                        const getRoundWeight = (r) => {
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
                        roundNames.sort((a, b) => getRoundWeight(a) - getRoundWeight(b));

                        const currIdx = roundNames.indexOf(heat.round);
                        if (currIdx <= 0) return 'TBD';

                        const prevRound = roundNames[currIdx - 1];
                        const prevHeats = divisionHeats.filter(h => h.round === prevRound).sort((a, b) => a.heat_number - b.heat_number);
                        if (prevHeats.length === 0) return 'TBD';

                        const currentRoundHeats = divisionHeats.filter(h => h.round === heat.round).sort((a, b) => a.heat_number - b.heat_number);

                        const hasEliminator = roundNames.some(r => (r || '').toString().toLowerCase().trim() === 'eliminator');
                        const isRoundAfterEliminator = hasEliminator && currIdx >= 2 && (roundNames[currIdx - 1] || '').toString().toLowerCase().trim() === 'eliminator';
                        const isEliminator = (heat.round || '').toString().toLowerCase().trim() === 'eliminator';

                        const getRankStr = (r) => r === 1 ? '1st' : r === 2 ? '2nd' : r === 3 ? '3rd' : `${r}th`;

                        if (isEliminator) {
                            const round1Name = roundNames[currIdx - 1];
                            const round1Heats = divisionHeats.filter(h => h.round === round1Name).sort((a, b) => a.heat_number - b.heat_number);

                            let globalSlotIndex = 0;
                            for (const h of currentRoundHeats) {
                                if (h.id === heat.id) {
                                    globalSlotIndex += slotIndex;
                                    break;
                                }
                                globalSlotIndex += (h.surfer_count || 4);
                            }

                            let emitted = 0;
                            for (const r1h of round1Heats) {
                                const qCount = r1h.qualified_count || 2;
                                const unqCount = Math.max(0, (r1h.surfer_count || 4) - qCount);
                                if (globalSlotIndex >= emitted && globalSlotIndex < emitted + unqCount) {
                                    const rank = qCount + (globalSlotIndex - emitted) + 1;
                                    return `${getRankStr(rank)} from ${round1Name} Heat ${r1h.heat_number}`;
                                }
                                emitted += unqCount;
                            }
                            return 'TBD';
                        }

                        if (isRoundAfterEliminator) {
                            const round1Name = roundNames[currIdx - 2];
                            const round1Heats = divisionHeats.filter(h => h.round === round1Name).sort((a, b) => a.heat_number - b.heat_number);
                            const elimHeats = divisionHeats.filter(h => (h.round || '').toString().toLowerCase().trim() === 'eliminator').sort((a, b) => a.heat_number - b.heat_number);

                            const q1List = [];
                            for (const r1h of round1Heats) {
                                const qCount = r1h.qualified_count || 2;
                                for (let i = 0; i < qCount; i++) {
                                    q1List.push(`${getRankStr(i + 1)} from ${round1Name} Heat ${r1h.heat_number}`);
                                }
                            }

                            const q2List = [];
                            for (const eh of elimHeats) {
                                const qCount = eh.qualified_count || 2;
                                for (let i = 0; i < qCount; i++) {
                                    q2List.push(`${getRankStr(i + 1)} from Eliminator Heat ${eh.heat_number}`);
                                }
                            }

                            const totalSlots = currentRoundHeats.reduce((s, h) => s + (h.surfer_count || 4), 0);
                            const heatAllocs = currentRoundHeats.map(h => ({ id: h.id, q1: 0, q2: 0, total: h.surfer_count || 4 }));

                            let q1Rem = q1List.length;
                            let slotsRem = totalSlots;

                            for (const ha of heatAllocs) {
                                ha.q1 = Math.round((q1Rem / slotsRem) * ha.total) || 0;
                                ha.q2 = ha.total - ha.q1;
                                q1Rem -= ha.q1;
                                slotsRem -= ha.total;
                            }

                            let q1Idx = 0;
                            let q2Idx = 0;
                            for (const ha of heatAllocs) {
                                if (ha.id === heat.id) {
                                    if (slotIndex < ha.q1) {
                                        return q1List[q1Idx + slotIndex] || 'TBD';
                                    } else {
                                        return q2List[q2Idx + (slotIndex - ha.q1)] || 'TBD';
                                    }
                                }
                                q1Idx += ha.q1;
                                q2Idx += ha.q2;
                            }
                            return 'TBD';
                        }

                        // Standard logic for any other round
                        let globalSlotIndex = 0;
                        for (const h of currentRoundHeats) {
                            if (h.id === heat.id) {
                                globalSlotIndex += slotIndex;
                                break;
                            }
                            globalSlotIndex += (h.surfer_count || 4);
                        }

                        let emitted = 0;
                        for (const ph of prevHeats) {
                            const qCount = ph.qualified_count || 2;
                            if (globalSlotIndex >= emitted && globalSlotIndex < emitted + qCount) {
                                const rank = globalSlotIndex - emitted + 1;
                                return `${getRankStr(rank)} from ${prevRound} Heat ${ph.heat_number}`;
                            }
                            emitted += qCount;
                        }
                        return 'TBD';
                    };

                return (
                    <>
                        {isSupEvent && <SupStopwatchViewer heat={heat} />}
                        
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-light-muted)', marginBottom: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {isSupEvent ? "Rank • Athlete • Time (mm:ss:msec)" : "Rank • Athlete • Total"}
                            </div>
                            
                            {[...actualSurfers].sort((a, b) => {
                                const JERSEY_COLORS = ['#FF0000', '#FFFFFF', '#FFFF00', '#0000FF', '#00FF00', '#000000'];
                                const getJerseyIndex = (c) => {
                                    if (!c) return 999;
                                    const idx = JERSEY_COLORS.indexOf(c.toUpperCase());
                                    return idx !== -1 ? idx : 999;
                                };

                                if (isSupEvent) {
                                    const aScore = a.total_score || 0;
                                    const bScore = b.total_score || 0;
                                    if (aScore === 0 && bScore === 0) return getJerseyIndex(a.color) - getJerseyIndex(b.color);
                                    if (aScore === 0) return 1;
                                    if (bScore === 0) return -1;
                                    return aScore - bScore;
                                }
                                const totalDiff = (b.total_score || 0) - (a.total_score || 0);
                                if (totalDiff !== 0) return totalDiff;
                                const aSorted = [...(a.wave_scores || [])].sort((x, y) => y - x);
                                const bSorted = [...(b.wave_scores || [])].sort((x, y) => y - x);
                                const maxLen = Math.max(aSorted.length, bSorted.length);
                                for (let i = 0; i < maxLen; i++) {
                                    const scoreA = aSorted[i] || 0;
                                    const scoreB = bSorted[i] || 0;
                                    if (scoreB !== scoreA) return scoreB - scoreA;
                                }
                                return getJerseyIndex(a.color) - getJerseyIndex(b.color);
                            }).map((surfer, idx) => (
                                <div key={surfer.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 0',
                                    borderBottom: (idx < totalCount - 1) ? '1px solid var(--border-light)' : 'none'
                                }}>
                                    <span style={medalTextGradient(idx + 1, '16px')}>
                                        {idx + 1}
                                    </span>
                                    {isSupEvent ? (
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: '#E5E7EB',
                                            border: '2px solid #9CA3AF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '11px',
                                            fontWeight: '900',
                                            color: 'black',
                                            flexShrink: 0
                                        }}>
                                            {surfer.color}
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: surfer.color || '#eee',
                                            border: `2px solid ${surfer.color || 'var(--border-light)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '11px',
                                            fontWeight: '900',
                                            color: (surfer.color === '#FFFFFF' || surfer.color === 'white') ? 'black' : 'white',
                                            overflow: 'hidden',
                                            flexShrink: 0
                                        }}>
                                            {surfer.photo ? (
                                                <img
                                                    src={surfer.photo}
                                                    alt={surfer.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <User size={14} fill="currentColor" />
                                            )}
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)' }}>
                                            {surfer.name}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                                        {(() => {
                                            const heatStatus = getHeatStatus(heat).toLowerCase();
                                            const isLive = heatStatus === 'live';
                                            const isCompleted = heatStatus === 'completed' || heatStatus === 'finished';
                                            const hasAnyScore = surfer.total_score > 0;
                                            const isSupRacing = isSupEvent && isLive && !hasAnyScore;
                                            
                                            if (isSupRacing) {
                                                return (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0ea5e9', marginTop: '2px' }}>
                                                        <style>
                                                            {`
                                                                @keyframes surf-scale {
                                                                    0%, 100% { transform: scale(1); }
                                                                    50% { transform: scale(1.3); }
                                                                }
                                                                .surf-anim {
                                                                    animation: surf-scale 1.5s ease-in-out infinite;
                                                                    display: inline-block;
                                                                    font-size: 18px;
                                                                }
                                                            `}
                                                        </style>
                                                        <span className="surf-anim">🏄‍♂️</span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <>
                                                    <span style={{
                                                        fontSize: isSupEvent ? '13px' : '13.5px',
                                                        fontWeight: '800',
                                                        color: 'var(--text-dark)',
                                                        fontFamily: isSupEvent ? 'monospace' : 'inherit'
                                                    }}>
                                                        {isSupEvent
                                                            ? formatSupTime(surfer.total_score || 0)
                                                            : (surfer.total_score || 0).toFixed(2)
                                                        }
                                                    </span>
                                                    {(() => {
                                                        if (surfer.is_eliminated === 1) {
                                                            return <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '800' }}>ELIMINATED</span>;
                                                        }
                                                        if (isLive && !hasAnyScore) {
                                                            return <span style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: '700' }}>NA</span>;
                                                        }
                                                        if (isSupEvent) {
                                                            const sortedSurfers = [...actualSurfers].filter(s => s.total_score > 0).sort((a, b) => a.total_score - b.total_score);
                                                            const fastestTime = sortedSurfers[0]?.total_score || 0;
                                                            if (idx === 0) return <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '700' }}>Fastest</span>;
                                                            if (hasAnyScore && fastestTime > 0) {
                                                                const diffMs = (surfer.total_score || 0) - fastestTime;
                                                                return <span style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: '700' }}>+{formatSupTime(diffMs)} behind</span>;
                                                            }
                                                            return null;
                                                        }
                                                        const sortedBySurfers = [...actualSurfers].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
                                                        const firstPlaceTotal = sortedBySurfers[0]?.total_score || 0;
                                                        const maxWaveScore = Math.max(...(surfer.wave_scores || []), 0);
                                                        if (idx === 0) {
                                                            if (isLive) return <span style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: '700' }}>Leading</span>;
                                                            if (isCompleted) {
                                                                const margin = (firstPlaceTotal - (sortedBySurfers[1]?.total_score || 0)).toFixed(2);
                                                                return <span style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: '700' }}>Won by {margin}</span>;
                                                            }
                                                        } else {
                                                            const targetTotal = idx === 1 ? firstPlaceTotal : (sortedBySurfers[1]?.total_score || 0);
                                                            const diff = targetTotal - maxWaveScore;
                                                            const neededToWin = (Math.floor(diff / 0.5) * 0.5 + 0.5).toFixed(2);
                                                            if (isLive || isCompleted) return <span style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: '700' }}>Needed {neededToWin}</span>;
                                                        }
                                                        return null;
                                                    })()}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))}

                            {/* Render placeholders for remaining empty slots */}
                            {Array.from({ length: Math.max(0, totalCount - actualCount) }).map((_, i) => {
                                const slotIndex = actualCount + i;
                                const color = JERSEY_COLORS[slotIndex % JERSEY_COLORS.length];
                                return (
                                    <div key={`empty-${slotIndex}`} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 0',
                                        borderBottom: slotIndex < totalCount - 1 ? '1px solid var(--border-light)' : 'none'
                                    }}>
                                        <span style={medalTextGradient(slotIndex + 1, '16px')}>{slotIndex + 1}</span>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: color,
                                            border: color === '#FFFFFF' ? '2px solid #d1d5db' : `2px solid ${color}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, overflow: 'hidden',
                                            color: (color === '#FFFF00' || color === '#FFFFFF') ? '#000' : 'white'
                                        }}>
                                            <span style={{ fontSize: '14px', fontWeight: '900' }}>?</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', fontStyle: 'italic', letterSpacing: '0.3px' }}>
                                                {getPlaceholderText(slotIndex)}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1' }}>—</span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => onSelect(heat)}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    padding: '12px',
                                    background: '#e5f1fdff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#000000ff',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#e2e8f0';
                                    e.currentTarget.style.transform = 'scale(0.98)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#e5f1fdff';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <Eye size={18} />
                                View Details
                            </button>
                            <button
                                onClick={() => onShare && onShare(heat)}
                                title="Share this heat"
                                style={{
                                    flexShrink: 0,
                                    width: heat?.share_count !== undefined ? 'auto' : '42px',
                                    padding: heat?.share_count !== undefined ? '0 12px' : '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    background: '#e5f1fdff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#2563eb',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#dbeafe';
                                    e.currentTarget.style.transform = 'scale(0.97)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#e5f1fdff';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <Share2 size={16} />
                                <span style={{ fontSize: '13px', fontWeight: '700' }}>
                                    {heat?.share_count || 0}
                                </span>
                            </button>
                        </div>
                    </>
                );
            })()}
        </div>
    );
};

const HeatDetailModal = ({ heat, event, onClose }) => {
    const [activePopup, setActivePopup] = useState(null); // { surferId, waveIndex }

    if (!heat) return null;

    const isHeatCompleted = getHeatStatus(heat).toLowerCase() === 'completed';
    const isSupEvent = heat.event_type === 'SUP Event' || event?.event_type === 'SUP Event';

    const formatSupTime = (ms) => {
        if (!ms || ms === 0) return '—';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((ms % 1000) / 10);
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');
        const csStr = centiseconds.toString().padStart(2, '0');
        return `${mStr}:${sStr}.${csStr}`;
    };

    const handleCellClick = (surferId, waveIndex, score) => {
        if (!isHeatCompleted || score <= 0) return;
        const key = `${surferId}-${waveIndex + 1}`;
        if (activePopup === key) {
            setActivePopup(null);
        } else {
            setActivePopup(key);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="modal-overlay"
            onClick={(e) => {
                // Close popup if clicking outside a cell
                if (activePopup) {
                    setActivePopup(null);
                }
                handleOverlayClick(e);
            }}
            style={{ zIndex: 1000, background: 'rgba(0, 0, 0, 0.7)' }}
        >
            <div
                onClick={(e) => {
                    // Close popup when clicking inside the modal but outside a cell
                    if (activePopup && !e.target.closest('.wave-score-cell')) {
                        setActivePopup(null);
                    }
                }}
                style={{
                    background: 'white',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    maxWidth: '900px',
                    width: '100%',
                    padding: '32px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: 'var(--shadow-lg)'
                }}
            >
                <div style={{
                    padding: '0 0 24px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>
                                {(() => {
                                    const isBreak = heat.division === 'Break' || (heat.round || '').toLowerCase().includes('break');
                                    if (isBreak) return heat.round || 'Break';
                                    return `${heat.round} : Heat ${heat.heat_number}`;
                                })()}
                            </h3>
                            <HeatStatusBadge heat={heat} />
                            {!isSupEvent && <LiveTimer heat={heat} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
                            <p style={{ color: 'var(--text-gray)', margin: 0 }}>{formatDivisionName(heat.division, event)}</p>
                        </div>
                        {isSupEvent && <SupStopwatchViewer heat={heat} />}
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-gray)',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        transition: 'var(--transition-fast)'
                    }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Inline Rolling Sponsors Marquee */}
                {event?.sponsors && (() => {
                    const parsedSponsors = safeParseArray(event.sponsors);
                    if (parsedSponsors.length === 0) return null;

                    // We duplicate the array to create a seamless infinite loop
                    const scrollingSponsors = [...parsedSponsors, ...parsedSponsors, ...parsedSponsors];

                    return (
                        <div style={{
                            width: '100%',
                            background: '#ffffff',
                            borderRadius: '12px',
                            padding: '10px 0',
                            overflowX: 'clip',
                            overflowY: 'visible',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '24px',
                            border: '1px solid var(--border-light)',
                            containerType: 'inline-size'
                        }}>
                            {/* CSS for the marquee animation is already declared in the main page scope */}
                            {/* Left fading gradient */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '60px',
                                background: 'linear-gradient(to right, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0))',
                                zIndex: 2,
                                pointerEvents: 'none',
                                borderRadius: '12px 0 0 12px'
                            }} />

                            <div className="sponsor-marquee-container" style={{ width: 'max-content', animationDuration: '10s' }}>
                                <span style={{
                                    color: 'var(--text-gray)',
                                    textTransform: 'uppercase',
                                    fontWeight: '800',
                                    fontSize: '11px',
                                    letterSpacing: '1px',
                                    whiteSpace: 'nowrap',
                                    marginLeft: '16px'
                                }}>
                                    SPONSORED BY
                                </span>
                                {parsedSponsors.map((sponsor, idx) => (
                                    <div key={idx} className="sponsor-item-wrapper">
                                        <img
                                            src={sponsor.image}
                                            alt={sponsor.name}
                                            style={{
                                                height: '24px',
                                                width: 'auto',
                                                maxWidth: '80px',
                                                objectFit: 'contain'
                                            }}
                                        />
                                        <div className="sponsor-ttive">{sponsor.name}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Right fading gradient */}
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: '60px',
                                background: 'linear-gradient(to left, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0))',
                                zIndex: 2,
                                pointerEvents: 'none',
                                borderRadius: '0 12px 12px 0'
                            }} />
                        </div>
                    );
                })()}

                <div style={{ marginTop: '16px' }}>
                    {/* Full Rankings */}
                    <div style={{ marginBottom: '32px' }}>
                        <h4 style={{
                            fontSize: '14px',
                            fontWeight: '800',
                            marginBottom: '16px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: 'var(--text-dark)'
                        }}>
                            Final Results
                        </h4>
                        {[...(heat.surfers || [])].sort((a, b) => {
                            const JERSEY_COLORS = ['#FF0000', '#FFFFFF', '#FFFF00', '#0000FF', '#00FF00', '#000000'];
                            const getJerseyIndex = (c) => {
                                if (!c) return 999;
                                const idx = JERSEY_COLORS.indexOf(c.toUpperCase());
                                return idx !== -1 ? idx : 999;
                            };

                            if (isSupEvent) {
                                const aT = a.total_score || 0;
                                const bT = b.total_score || 0;
                                if (aT === 0 && bT === 0) return getJerseyIndex(a.color) - getJerseyIndex(b.color);
                                if (aT === 0) return 1;
                                if (bT === 0) return -1;
                                return aT - bT;
                            }
                            const totalDiff = (b.total_score || 0) - (a.total_score || 0);
                            if (totalDiff !== 0) return totalDiff;
                            const aSorted = [...(a.wave_scores || [])].sort((x, y) => y - x);
                            const bSorted = [...(b.wave_scores || [])].sort((x, y) => y - x);
                            const maxLen = Math.max(aSorted.length, bSorted.length);
                            for (let i = 0; i < maxLen; i++) {
                                const scoreA = aSorted[i] || 0;
                                const scoreB = bSorted[i] || 0;
                                if (scoreB !== scoreA) return scoreB - scoreA;
                            }
                            return getJerseyIndex(a.color) - getJerseyIndex(b.color);
                        }).map((surfer, idx, sortedSurfers) => (
                            <div key={surfer.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px',
                                background: surfer.is_eliminated === 1 ? 'rgba(239, 68, 68, 0.08)' : (idx === 0 ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-gray-50)'),
                                borderRadius: '12px',
                                marginBottom: '8px',
                                border: surfer.is_eliminated === 1 ? '1px solid rgba(239, 68, 68, 0.3)' : (idx === 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-light)')
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1
                                }}>
                                    <span style={medalTextGradient(idx + 1, '24px')}>
                                        {idx + 1}
                                    </span>
                                </div>
                                {isSupEvent ? (
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: '#E5E7EB',
                                        border: '2px solid #9CA3AF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px',
                                        fontWeight: '900',
                                        color: 'black',
                                        flexShrink: 0
                                    }}>
                                        {surfer.color}
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: surfer.color || '#eee',
                                        border: `2px solid ${surfer.color || 'var(--border-light)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px',
                                        fontWeight: '900',
                                        color: (surfer.color === '#FFFFFF' || surfer.color === 'white') ? 'black' : 'white',
                                        overflow: 'hidden',
                                        flexShrink: 0
                                    }}>
                                        {surfer.photo ? (
                                            <img
                                                src={surfer.photo}
                                                alt={surfer.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <User size={18} fill="currentColor" />
                                        )}
                                    </div>
                                )}
                                <span style={{ flex: 1, fontSize: '16px', fontWeight: '700', color: 'var(--text-dark)' }}>
                                    {surfer.name}
                                    {surfer.is_eliminated === 1 && (
                                        <span style={{ marginLeft: '8px', color: '#ef4444', fontSize: '12px', fontWeight: '800' }}>ELIMINATED</span>
                                    )}
                                </span>
                                {(() => {
                                    const heatStatus = getHeatStatus(heat).toLowerCase();
                                    const isLive = heatStatus === 'live';
                                    const hasAnyScore = surfer.total_score > 0;
                                    const isSupRacing = isSupEvent && isLive && !hasAnyScore;

                                    if (isSupRacing) {
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                <style>{`
                                                    @keyframes surf-scale-modal {
                                                        0%, 100% { transform: scale(1); }
                                                        50% { transform: scale(1.3); }
                                                    }
                                                    .surf-anim-modal {
                                                        animation: surf-scale-modal 1.5s ease-in-out infinite;
                                                        display: inline-block;
                                                        font-size: 22px;
                                                    }
                                                `}</style>
                                                <span className="surf-anim-modal">🏄‍♂️</span>
                                                <span style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: '700', letterSpacing: '0.05em' }}>RACING...</span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{
                                                fontSize: '24px',
                                                fontWeight: '900',
                                                color: idx === 0 ? '#10b981' : 'var(--text-dark)',
                                                fontFamily: isSupEvent ? 'monospace' : 'inherit',
                                                lineHeight: 1
                                            }}>
                                                {isSupEvent ? formatSupTime(surfer.total_score || 0) : surfer.total_score.toFixed(2)}
                                            </span>
                                            {!isSupEvent && idx > 0 && (
                                                (() => {
                                                    const qualifyCount = heat.qualified_count || 2;
                                                    const targetTotal = idx < qualifyCount 
                                                        ? (sortedSurfers[0]?.total_score || 0) 
                                                        : (sortedSurfers[qualifyCount - 1]?.total_score || 0);
                                                    
                                                    const maxWaveScore = Math.max(0, ...(surfer.wave_scores || []));
                                                    const diff = targetTotal - maxWaveScore;
                                                    const neededScore = (Math.floor(diff / 0.5) * 0.5 + 0.5).toFixed(2);
                                                    
                                                    return (
                                                        <span style={{ fontSize: '12px', color: idx < qualifyCount ? '#f59e0b' : '#ef4444', fontWeight: '800' }}>
                                                            Need {parseFloat(neededScore) > 10 ? 'Combo' : neededScore}
                                                        </span>
                                                    );
                                                })()
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>

                    {/* Full Wave Scores */}
                    {!isSupEvent && (
                        <div>
                            <h4 style={{
                                fontSize: '14px',
                                fontWeight: '800',
                                marginBottom: '16px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: 'var(--text-dark)'
                            }}>
                                Wave Scores
                            </h4>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{
                                                textAlign: 'left',
                                                padding: '12px',
                                                color: 'var(--text-light-muted)',
                                                fontSize: '12px',
                                                fontWeight: '700'
                                            }}>
                                                ATHLETE
                                            </th>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(w => (
                                                <th key={w} style={{
                                                    textAlign: 'center',
                                                    padding: '12px',
                                                    color: 'var(--text-light-muted)',
                                                    fontSize: '12px',
                                                    fontWeight: '700'
                                                }}>
                                                    {w}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...(heat.surfers || [])].sort((a, b) => {
                                            const JERSEY_COLORS = ['#FF0000', '#FFFFFF', '#FFFF00', '#0000FF', '#00FF00', '#000000'];
                                            const getJerseyIndex = (c) => {
                                                if (!c) return 999;
                                                const idx = JERSEY_COLORS.indexOf(c.toUpperCase());
                                                return idx !== -1 ? idx : 999;
                                            };
                                            const totalDiff = (b.total_score || 0) - (a.total_score || 0);
                                            if (totalDiff !== 0) return totalDiff;
                                            const aSorted = [...(a.wave_scores || [])].sort((x, y) => y - x);
                                            const bSorted = [...(b.wave_scores || [])].sort((x, y) => y - x);
                                            const maxLen = Math.max(aSorted.length, bSorted.length);
                                            for (let i = 0; i < maxLen; i++) {
                                                const scoreA = aSorted[i] || 0;
                                                const scoreB = bSorted[i] || 0;
                                                if (scoreB !== scoreA) return scoreB - scoreA;
                                            }
                                            return getJerseyIndex(a.color) - getJerseyIndex(b.color);
                                        }).map(surfer => (
                                            <tr key={surfer.id} style={{ background: 'var(--bg-gray-50)', position: 'relative' }}>
                                                <td style={{
                                                    padding: '12px',
                                                    fontSize: '14px',
                                                    fontWeight: '700',
                                                    borderTopLeftRadius: '8px',
                                                    borderBottomLeftRadius: '8px',
                                                    color: 'var(--text-dark)'
                                                }}>
                                                    {surfer.name}
                                                </td>
                                                {surfer.wave_scores.map((score, sIdx) => {
                                                    const w = sIdx + 1;
                                                    const isInterferenceWave = (surfer.interference_1_wave === w) || (surfer.interference_2_wave === w);
                                                    const interferencePct = surfer.interference_1_wave === w ? surfer.interference_1_pct : (surfer.interference_2_wave === w ? surfer.interference_2_pct : null);

                                                    let isTop2 = false;
                                                    if (isHeatCompleted && score > 0) {
                                                        const scoresWithIdx = surfer.wave_scores.map((s, i) => ({ s, i }));
                                                        scoresWithIdx.sort((a, b) => b.s - a.s);
                                                        const top2Idx = scoresWithIdx.slice(0, 2).map(item => item.i);
                                                        isTop2 = top2Idx.includes(sIdx);
                                                    }

                                                    const popupKey = `${surfer.id}-${w}`;
                                                    const isPopupOpen = activePopup === popupKey;
                                                    const judgeScoresForWave = heat.judge_scores?.[popupKey] || [];
                                                    const isClickable = isHeatCompleted && score > 0;

                                                    return (
                                                        <td key={sIdx} style={{
                                                            textAlign: 'center',
                                                            padding: '4px',
                                                            fontSize: '14px',
                                                            fontWeight: '800',
                                                            color: isInterferenceWave ? '#ef4444' : 'var(--text-dark)',
                                                            position: 'relative'
                                                        }}>
                                                            <div
                                                                className="wave-score-cell"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCellClick(surfer.id, sIdx, score);
                                                                }}
                                                                style={{
                                                                    background: isTop2 ? 'rgba(16, 185, 129, 0.2)' : (isInterferenceWave ? 'rgba(239, 68, 68, 0.1)' : 'transparent'),
                                                                    border: isInterferenceWave ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                                                                    borderRadius: '8px',
                                                                    padding: '8px 0',
                                                                    margin: '0 2px',
                                                                    cursor: isClickable ? 'pointer' : 'default',
                                                                    transition: 'all 0.15s ease',
                                                                    userSelect: 'none',
                                                                    ...(isClickable ? {
                                                                        ':hover': { opacity: 0.8 }
                                                                    } : {})
                                                                }}
                                                                onMouseOver={(e) => {
                                                                    if (isClickable) {
                                                                        e.currentTarget.style.opacity = '0.7';
                                                                        e.currentTarget.style.transform = 'scale(1.05)';
                                                                    }
                                                                }}
                                                                onMouseOut={(e) => {
                                                                    if (isClickable) {
                                                                        e.currentTarget.style.opacity = '1';
                                                                        e.currentTarget.style.transform = 'scale(1)';
                                                                    }
                                                                }}
                                                            >
                                                                {isInterferenceWave ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                        <div style={{ fontSize: '13px', color: '#ef4444' }}>{score > 0 ? score.toFixed(2) : '-'}</div>
                                                                        <div style={{
                                                                            fontSize: '9px',
                                                                            background: '#ef4444',
                                                                            color: 'white',
                                                                            padding: '1px 4px',
                                                                            borderRadius: '4px',
                                                                            fontWeight: '900'
                                                                        }}>
                                                                            INT {interferencePct}%
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    score > 0 ? score.toFixed(2) : '-'
                                                                )}
                                                            </div>

                                                            {/* Judge Scores Dropdown */}
                                                            {isPopupOpen && judgeScoresForWave.length > 0 && (
                                                                <div
                                                                    className="wave-score-cell"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: '100%',
                                                                        left: '50%',
                                                                        transform: 'translateX(-50%)',
                                                                        zIndex: 100,
                                                                        background: 'white',
                                                                        border: '1px solid var(--border-light)',
                                                                        borderRadius: '10px',
                                                                        padding: '10px 14px',
                                                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                                                                        minWidth: '120px',
                                                                        whiteSpace: 'nowrap',
                                                                        userSelect: 'none'
                                                                    }}
                                                                >
                                                                    {/* Small arrow */}
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: '-6px',
                                                                        left: '50%',
                                                                        transform: 'translateX(-50%) rotate(45deg)',
                                                                        width: '12px',
                                                                        height: '12px',
                                                                        background: 'white',
                                                                        border: '1px solid var(--border-light)',
                                                                        borderBottom: 'none',
                                                                        borderRight: 'none'
                                                                    }} />
                                                                    {judgeScoresForWave.map((js, jIdx) => (
                                                                        <div key={jIdx} style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            gap: '12px',
                                                                            padding: '4px 0',
                                                                            borderBottom: jIdx < judgeScoresForWave.length - 1 ? '1px solid #f1f5f9' : 'none'
                                                                        }}>
                                                                            <span style={{
                                                                                fontSize: '12px',
                                                                                fontWeight: '700',
                                                                                color: 'var(--text-gray)'
                                                                            }}>
                                                                                J{js.judge_number || (jIdx + 1)}
                                                                            </span>
                                                                            <span style={{
                                                                                fontSize: '13px',
                                                                                fontWeight: '800',
                                                                                color: js.is_interference ? '#ef4444' : 'var(--text-dark)'
                                                                            }}>
                                                                                {js.score.toFixed(1)}
                                                                                {js.is_interference && (
                                                                                    <span style={{ fontSize: '10px', marginLeft: '4px', background: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '3px' }}>
                                                                                        INT {js.interference_pct}%
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {surfer.is_eliminated === 1 && sIdx === 3 && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: '50%',
                                                                    left: '50%',
                                                                    transform: 'translate(-50%, -50%)',
                                                                    zIndex: 20,
                                                                    whiteSpace: 'nowrap',
                                                                    pointerEvents: 'none',
                                                                    background: '#ef4444',
                                                                    color: 'white',
                                                                    padding: '4px 12px',
                                                                    borderRadius: '8px',
                                                                    fontSize: '11px',
                                                                    fontWeight: '900',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.5px',
                                                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                                                }}>
                                                                    ELIMINATED
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                {/* Eliminating the previous absolute overlay to avoid double text */}
                                                {surfer.is_eliminated === 1 && (
                                                    <td colSpan="11" style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        bottom: 0,
                                                        background: 'rgba(239, 68, 68, 0.05)',
                                                        zIndex: 10,
                                                        pointerEvents: 'none'
                                                    }} />
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Share Heat Modal (Viewer-side) — matches admin ShareLiveHeatModal design ─
const ShareHeatViewerModal = ({ heat, eventSlug, selectedDivision, event, onClose }) => {
    const [copied, setCopied] = useState(false);
    const [sharing, setSharing] = useState(false);
    const heatCardRef = useRef(null);
    const division = selectedDivision || heat?.division || '';
    const displayDivision = formatDivisionName(division, event);
    const baseUrl = window.location.origin;

    const isSupEvent = event?.event_type === 'SUP Event' || heat?.event_type === 'SUP Event';
    const supCat = heat?.sup_category || '';
    const supCatParam = isSupEvent && supCat ? `&supCat=${encodeURIComponent(supCat)}` : '';

    const viewerLink = `${baseUrl}/viewer/${eventSlug}/${encodeURIComponent(division)}?liveHeat=${encodeURIComponent(heat?.id || '')}${supCatParam}`;

    const ogShareLink = `${baseUrl}/api/watch/${eventSlug}?division=${encodeURIComponent(division)}&heat=${heat?.heat_number || ''}&heatId=${encodeURIComponent(heat?.id || '')}${supCatParam}`;

    const incrementShareCount = async () => {
        if (!heat?.id) return;
        try {
            await axios.post(`${API_BASE}/heats/${heat.id}/share`);
        } catch (err) {
            console.error('Failed to increment share count', err);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(ogShareLink).then(() => {
            setCopied(true);
            incrementShareCount();
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const shareMessage = `🏄 Watch LIVE! ${event?.name || 'Surf Event'} — Heat #${heat?.heat_number} (${displayDivision}) is live now!\n${ogShareLink}`;

    const handleWhatsApp = async () => {
        if (sharing) return;
        setSharing(true);
        try {
            await shareHeatCardAsImage(heatCardRef.current, {
                filename: `heat-${heat?.heat_number || 'live'}.png`,
                text: shareMessage,
                title: `Heat #${heat?.heat_number} — ${displayDivision}`,
            });
        } catch (err) {
            console.error('Share failed:', err);
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
        } finally {
            incrementShareCount();
            setSharing(false);
        }
    };
    const handleFacebook = async () => {
        if (sharing) return;
        setSharing(true);
        try {
            await shareHeatCardAsImage(heatCardRef.current, {
                filename: `heat-${heat?.heat_number || 'live'}.png`,
                text: shareMessage,
                title: `Heat #${heat?.heat_number} — ${displayDivision}`,
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
            incrementShareCount();
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
                filename: `heat-${heat?.heat_number || 'live'}.png`,
                text: shareMessage,
                title: `Heat #${heat?.heat_number} — ${displayDivision}`,
                fallbackUrl: 'https://www.instagram.com/',
            });
        } catch (err) {
            console.error('Instagram share failed:', err);
            navigator.clipboard.writeText(ogShareLink).catch(() => { });
            window.open('https://www.instagram.com/', '_blank');
        } finally {
            incrementShareCount();
            setSharing(false);
        }
    };

    const surfers = heat?.surfers || [];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
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
                            margin: 0, fontSize: '17px', fontWeight: '800',
                            color: '#0d1b2a', letterSpacing: '-0.3px',
                            fontFamily: "'Inter', sans-serif"
                        }}>Share Heat</h3>
                        <p style={{
                            margin: '3px 0 0', fontSize: '12px', color: '#7a8fa6',
                            fontWeight: '500', fontFamily: "'Inter', sans-serif"
                        }}>
                            {displayDivision} — {heat?.division === 'Break' || (heat?.round || '').toLowerCase().includes('break') ? (heat?.round || 'Break') : `Heat #${heat?.heat_number}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--border-dim)', border: 'none', cursor: 'pointer',
                            color: 'var(--text-secondary)', width: '30px', height: '30px',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Heat Preview Card ── */}
                <div style={{ padding: '16px 20px 0' }}>
                    <div id="heat-card" ref={heatCardRef} style={{
                        borderRadius: '16px', overflow: 'hidden', position: 'relative',
                        minHeight: '190px', backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover', backgroundPosition: 'center'
                    }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(135deg, rgba(4,30,66,0.82) 0%, rgba(2,20,50,0.65) 60%, rgba(0,10,30,0.55) 100%)'
                        }} />
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
                                                const cat = heat?.sup_category || (typeof selectedSupCategory !== 'undefined' ? selectedSupCategory : '') || 'Sprint';
                                                const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
                                                return `SUP - ${formattedCat}`;
                                            })()
                                            : 'Surfing'
                                        }
                                    </div>

                                    {!(heat?.round && heat.round.toLowerCase() === 'final') && (
                                        <div style={{
                                            fontSize: '14px', fontWeight: '800', textTransform: 'uppercase',
                                            letterSpacing: '1.2px', color: '#00eccdff', marginBottom: '2px',
                                            fontFamily: "'Inter', sans-serif"
                                        }}>{heat?.round}</div>
                                    )}
                                    <div style={{
                                        fontSize: heat?.round && heat.round.toLowerCase() === 'final' ? '48px' : '40px',
                                        fontWeight: '900', lineHeight: 1, marginBottom: '2px',
                                        color: '#ffffff', fontFamily: "'Bebas Neue', 'Impact', 'Arial Black', sans-serif",
                                        letterSpacing: '1px', textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                    }}>
                                        {(() => {
                                            const isBreak = heat?.division === 'Break' || (heat?.round || '').toLowerCase().includes('break');
                                            if (isBreak) return 'BREAK';
                                            if (heat?.round && heat.round.toLowerCase() === 'final') return 'FINAL';
                                            return `Heat ${heat?.heat_number}`;
                                        })()}
                                    </div>
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
                                                            width: '20px', height: '20px', borderRadius: '50%',
                                                            background: s.color || 'var(--text-muted)',
                                                            border: `2px solid ${s.color || 'rgba(0,0,0,0.12)'}`,
                                                            flexShrink: 0,
                                                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            overflow: 'hidden',
                                                            color: (s.color === '#FFFFFF' || s.color === 'white') ? 'black' : 'white'
                                                        }}>
                                                            {s.photo ? (
                                                                <img
                                                                    src={s.photo}
                                                                    alt={s.name}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                />
                                                            ) : (
                                                                <User size={10} fill="currentColor" />
                                                            )}
                                                        </div>
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
                                                                return `${mStr}:${sStr}.${csStr}`;
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
                        <div style={{
                            position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.45)',
                            padding: '8px 16px', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', marginTop: '16px'
                        }}>
                            <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.2px', fontFamily: "'Inter', sans-serif" }}>AQUATIC X SPORTS | The Ultimate Surf Competition</span>
                            <span style={{
                                background: 'linear-gradient(90deg, #0ea5e9, #0284c7)', color: 'white',
                                fontSize: '9px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px',
                                textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap'
                            }}>Watch Live Scores</span>
                        </div>
                    </div>
                </div>

                {/* ── Viewer Link ── */}
                <div style={{ padding: '16px 20px 0' }}>
                    <label style={{
                        fontSize: '12px', fontWeight: '700', color: '#374151',
                        display: 'block', marginBottom: '8px', letterSpacing: '0.2px',
                        fontFamily: "'Inter', sans-serif"
                    }}>Viewer Link</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            readOnly
                            value={ogShareLink}
                            style={{
                                flex: 1, padding: '9px 12px', fontSize: '12px',
                                border: '1.5px solid var(--border-dim)', borderRadius: '10px',
                                color: 'var(--text-gray)', background: 'var(--bg-light)',
                                outline: 'none', overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', fontFamily: "'Inter', monospace", fontWeight: '500'
                            }}
                        />
                        <button
                            onClick={handleCopy}
                            style={{
                                padding: '9px 16px',
                                background: copied ? '#22c55e' : '#0d1b2a',
                                color: 'white', border: 'none', borderRadius: '10px',
                                fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'background 0.2s', whiteSpace: 'nowrap',
                                fontFamily: "'Inter', sans-serif", letterSpacing: '0.2px'
                            }}
                        >
                            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                        </button>
                    </div>
                </div>

                {/* ── Social Share ── */}
                <div style={{ padding: '16px 20px 22px', textAlign: 'center' }}>
                    <p style={{
                        margin: '0 0 14px', fontSize: '12px', fontWeight: '600',
                        color: '#7a8fa6', fontFamily: "'Inter', sans-serif", letterSpacing: '0.3px'
                    }}>Or Share Directly Via</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        {/* WhatsApp */}
                        <button onClick={handleWhatsApp} disabled={sharing} title="Share heat card image on WhatsApp"
                            style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#25D366', border: 'none', cursor: sharing ? 'wait' : 'pointer', opacity: sharing ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(37,211,102,0.4)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onMouseEnter={e => { if (!sharing) { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,211,102,0.55)'; } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,211,102,0.4)'; }}
                        >
                            {sharing ? (
                                <Loader2 size={22} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            )}
                        </button>
                        {/* Facebook */}
                        <button onClick={handleFacebook} title="Share on Facebook"
                            style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#1877F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(24,119,242,0.4)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(24,119,242,0.55)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(24,119,242,0.4)'; }}
                        >
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                        </button>
                        {/* Instagram */}
                        <button onClick={handleInstagram} title="Share on Instagram"
                            style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(220,39,67,0.4)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(220,39,67,0.55)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(220,39,67,0.4)'; }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EventDetailViewer = () => {
    const { eventSlug, divisionSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [event, setEvent] = useState(null);
    const [heats, setHeats] = useState([]);
    const [seriesHeats, setSeriesHeats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedHeat, setSelectedHeat] = useState(null);
    const [shareHeat, setShareHeat] = useState(null);
    const scrollContainerRef = useRef(null);
    const heatCardRefs = useRef({});
    const hasAutoScrolledLiveRef = useRef(false);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [divisionView, setDivisionView] = useState('heats');
    const [events, setEvents] = useState([]);
    const [eventView, setEventView] = useState('divisions');
    // Track whether the very first fetch has completed (avoids using heats.length in useCallback deps)
    const hasLoadedOnce = useRef(false);

    useEffect(() => {
        setEventView('divisions');
    }, [eventSlug]);

    useEffect(() => {
        setDivisionView('heats');
    }, [divisionSlug]);

    // Derived selectedDivision from URL param
    const selectedDivision = divisionSlug ? decodeURIComponent(divisionSlug) : null;
    const selectedSupCategory = new URLSearchParams(location.search).get('supCat') || null;
    const isSupEvent = event?.event_type === 'SUP Event';

    // Track analytics
    useAnalyticsTracker('event_detail', eventSlug);
    useGoogleAnalytics(`/event/${eventSlug}`);

    const fetchEventAndHeats = React.useCallback(async (isAutoPoll = false) => {
        try {
            // Only show loading spinner on the very first load
            if (!hasLoadedOnce.current && !isAutoPoll) {
                setIsLoading(true);
            }

            // First get the event by slug
            const eventRes = await axios.get(`${API_BASE}/events/${eventSlug}`);
            const eventData = eventRes.data;
            setEvent(eventData);

            // Update page title + OG meta tags dynamically
            if (eventData?.name) {
                document.title = `${eventData.name} — AquaticX Sports`;
                const setMeta = (sel, attr, val) => {
                    let el = document.querySelector(sel);
                    if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
                    el.setAttribute(attr, val);
                };
                const desc = `🏄 Watch live heat scores & athlete rankings — ${eventData.name}. AquaticX Sports.`;
                setMeta('meta[property="og:title"]', 'content', `${eventData.name} | AquaticX Sports`);
                setMeta('meta[property="og:description"]', 'content', desc);
                setMeta('meta[property="og:url"]', 'content', window.location.href);
                setMeta('meta[name="twitter:title"]', 'content', `${eventData.name} | AquaticX Sports`);
                setMeta('meta[name="twitter:description"]', 'content', desc);
                setMeta('meta[name="description"]', 'content', desc);
            }

            // Then get heats using the event ID
            const heatsRes = await axios.get(`${API_BASE}/events/${eventData.id}/heats`);
            console.log(`📡 Polled data at ${new Date().toLocaleTimeString()}: ${heatsRes.data.length} heats found.`);
            setHeats(heatsRes.data);

            // Fetch all events for the schedule view & series event processing
            let allEvents = [];
            try {
                const allEventsRes = await axios.get(`${API_BASE}/events`);
                allEvents = allEventsRes.data;
                setEvents(allEvents);
            } catch (e) {
                console.error('Failed to fetch all events list:', e);
                allEvents = eventData ? [eventData] : [];
                setEvents(allEvents);
            }

            // Fetch series events/heats if this event is a series event
            if (eventData.is_series === 1 && allEvents.length > 0) {
                try {
                    // Trace root parent in the series
                    let rootId = eventData.id;
                    let visited = new Set();
                    let current = eventData;
                    while (current && current.series_parent_id && !visited.has(current.series_parent_id)) {
                        visited.add(current.id);
                        const parent = allEvents.find(e => e.id === current.series_parent_id);
                        if (parent) {
                            rootId = parent.id;
                            current = parent;
                        } else {
                            break;
                        }
                    }

                    // Trace all events belonging to this root
                    const getRootIdOf = (ev) => {
                        let curr = ev;
                        let v = new Set();
                        while (curr && curr.series_parent_id && !v.has(curr.series_parent_id)) {
                            v.add(curr.id);
                            const parent = allEvents.find(e => e.id === curr.series_parent_id);
                            if (parent) {
                                curr = parent;
                            } else {
                                break;
                            }
                        }
                        return curr.id;
                    };

                    const seriesEvents = allEvents.filter(ev => getRootIdOf(ev) === rootId);
                    
                    // Fetch heats of all events in this series
                    const heatsPromises = seriesEvents.map(ev => 
                        axios.get(`${API_BASE}/events/${ev.id}/heats`).catch(() => ({ data: [] }))
                    );
                    const heatsResponses = await Promise.all(heatsPromises);
                    const accumulatedHeats = heatsResponses.flatMap(res => res.data);
                    setSeriesHeats(accumulatedHeats);
                } catch (seriesErr) {
                    console.error('Error fetching series data:', seriesErr);
                }
            } else {
                setSeriesHeats([]);
            }
            hasLoadedOnce.current = true;
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            if (!isAutoPoll) setIsLoading(false);
        }
    }, [eventSlug]); // ✅ heats.length removed — was causing the interval to reset on every fetch

    // Universal auto-refresh setup (5s)
    useEffect(() => {
        fetchEventAndHeats(); // Initial fetch
        const pollInterval = setInterval(() => fetchEventAndHeats(true), 5000);
        return () => clearInterval(pollInterval);
    }, [fetchEventAndHeats]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [eventSlug]);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            console.log('Scroll check:', { scrollLeft, scrollWidth, clientWidth, hasOverflow: scrollWidth > clientWidth });
            setShowLeftArrow(scrollLeft > 10);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };


    const handleScroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 400;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const liveHeat = heats.find(h => String(h.status || '').toLowerCase() === 'in-progress');
    const liveHeatIdFromQuery = new URLSearchParams(location.search).get('liveHeat');
    const autoLive = new URLSearchParams(location.search).get('autoLive') === 'true';
    const hasAutoLiveNavigatedRef = useRef(false);

    const handleGoLiveHeat = () => {
        if (!liveHeat || !liveHeat.division) return;
        let path = `/viewer/${eventSlug}/${encodeURIComponent(liveHeat.division)}?liveHeat=${encodeURIComponent(liveHeat.id)}`;
        if (isSupEvent && liveHeat.sup_category) {
            path += `&supCat=${encodeURIComponent(liveHeat.sup_category)}`;
        }
        navigate(path);
    };

    // Auto-navigate to live heat when ?autoLive=true (triggered from ViewerPage "n Live Now" button)
    useEffect(() => {
        if (!autoLive || hasAutoLiveNavigatedRef.current) return;
        if (!liveHeat || !liveHeat.division) return;
        hasAutoLiveNavigatedRef.current = true;
        let path = `/viewer/${eventSlug}/${encodeURIComponent(liveHeat.division)}?liveHeat=${encodeURIComponent(liveHeat.id)}`;
        if (isSupEvent && liveHeat.sup_category) {
            path += `&supCat=${encodeURIComponent(liveHeat.sup_category)}`;
        }
        navigate(path, { replace: true });
    }, [autoLive, liveHeat, eventSlug, navigate, isSupEvent]);

    useEffect(() => {
        hasAutoScrolledLiveRef.current = false;
    }, [eventSlug, divisionSlug, location.search]);

    useEffect(() => {
        if (!selectedDivision || hasAutoScrolledLiveRef.current) return;

        const targetHeatId = liveHeatIdFromQuery;
        if (!targetHeatId) return;

        const targetEl = heatCardRefs.current[targetHeatId];
        if (!targetEl) return;

        requestAnimationFrame(() => {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            hasAutoScrolledLiveRef.current = true;
        });
    }, [selectedDivision, liveHeatIdFromQuery, heats]);

    // Helper to generate URL-safe slug from division name
    const slugify = (text) => {
        if (!text) return '';
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };


    // Get unique divisions from heats
    const divisions = [...new Set(heats.map(heat => heat.division))].filter(d => d && d !== 'Break');

    // Filter heats by selected division (and sup_category for SUP events)
    // null means no division in URL → show all heats (direct link / hard refresh case)
    const filteredHeats = (selectedDivision === 'all' || selectedDivision === null)
        ? heats
        : heats.filter(heat => {
            if (heat.division !== selectedDivision) return false;
            // For SUP events, also filter by sup_category if one is selected
            if (isSupEvent && selectedSupCategory && heat.sup_category !== selectedSupCategory) return false;
            return true;
        });

    // Group heats by round
    const heatsByRound = filteredHeats.reduce((acc, heat) => {
        // Do not include break items in the round-by-round bracket view
        if (heat.division === 'Break' || (heat.round || '').toLowerCase().includes('break')) {
            return acc;
        }

        if (!acc[heat.round]) {
            acc[heat.round] = [];
        }
        acc[heat.round].push(heat);
        return acc;
    }, {});

    // Sort rounds by tournament progression order (Round 1 → Eliminator → Round 2 → Semi Final → Final)
    const rounds = Object.keys(heatsByRound).sort((a, b) => {
        const getWeight = (r) => {
            const lower = r.toLowerCase().trim();
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
        return getWeight(a) - getWeight(b);
    });

    const getPointsForRank = (rank) => {
        const pointsTable = {
            1: 1000, 2: 860, 3: 730, 4: 670, 5: 610, 6: 570, 7: 540, 8: 510,
            9: 480, 10: 450, 11: 420, 12: 390, 13: 360, 14: 330, 15: 300, 16: 270,
            17: 250, 18: 230, 19: 210, 20: 190, 21: 180, 22: 170, 23: 160, 24: 150,
            25: 140, 26: 135, 27: 130, 28: 125, 29: 120, 30: 115, 31: 110, 32: 105,
            33: 100, 34: 96, 35: 92, 36: 88, 37: 84, 38: 80, 39: 76, 40: 72,
            41: 68, 42: 64, 43: 60, 44: 56, 45: 52, 46: 50, 47: 48, 48: 46,
            49: 44, 50: 42, 51: 40, 52: 39, 53: 38, 54: 37, 55: 36, 56: 35,
            57: 34, 58: 33, 59: 32, 60: 31, 61: 30, 62: 29, 63: 28, 64: 27,
            65: 26, 66: 25, 67: 24, 68: 23, 69: 22, 70: 21, 71: 20, 72: 19,
            73: 18, 74: 17, 75: 16, 76: 15, 77: 14, 78: 13, 79: 12, 80: 11,
            81: 10, 82: 9, 83: 8, 84: 7, 85: 6, 86: 5, 87: 5, 88: 5,
            89: 4, 90: 4, 91: 4, 92: 3, 93: 3, 94: 3
        };
        if (rank in pointsTable) return pointsTable[rank];
        return 2;
    };

    const athleteRankings = useMemo(() => {
        if (filteredHeats.length === 0) return [];

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

        if (event?.is_series === 1 && seriesHeats.length > 0) {
            // Calculate cumulative points across all events in the series
            const heatsByEvent = {};
            seriesHeats.forEach(h => {
                if (h.division !== selectedDivision) return;
                if (!heatsByEvent[h.event_id]) {
                    heatsByEvent[h.event_id] = [];
                }
                heatsByEvent[h.event_id].push(h);
            });

            const athleteCumulative = {};

            Object.entries(heatsByEvent).forEach(([eventId, eventHeats]) => {
                const surferMap = {};
                eventHeats.forEach(h => {
                    const roundName = h.round || '';
                    const roundWeight = getRoundWeight(roundName);
                    if (Array.isArray(h.surfers)) {
                        h.surfers.forEach(s => {
                            if (!s || !s.name) return;
                            const key = s.name.trim().toLowerCase();
                            const existing = surferMap[key];
                            if (!existing || roundWeight > existing.roundWeight) {
                                surferMap[key] = {
                                    name: s.name,
                                    school_name: s.school_name,
                                    state: s.state,
                                    gender: s.gender,
                                    heatRank: s.rank || 4,
                                    totalScore: s.total_score || 0,
                                    roundWeight: roundWeight,
                                };
                            }
                        });
                    }
                });

                // Sort surfers in this event to determine their rank and points
                const sortedSurfers = Object.values(surferMap).sort((a, b) => {
                    if (b.roundWeight !== a.roundWeight) {
                        return b.roundWeight - a.roundWeight;
                    }
                    if (a.heatRank !== b.heatRank) {
                        return a.heatRank - b.heatRank;
                    }
                    return b.totalScore - a.totalScore;
                });

                sortedSurfers.forEach((surfer, index) => {
                    const rank = index + 1;
                    const pts = getPointsForRank(rank);
                    const key = surfer.name.trim().toLowerCase();
                    if (!athleteCumulative[key]) {
                        athleteCumulative[key] = {
                            id: key,
                            name: surfer.name,
                            school_name: surfer.school_name,
                            state: surfer.state,
                            gender: surfer.gender,
                            points: 0
                        };
                    }
                    athleteCumulative[key].points += pts;
                });
            });

            const rankings = Object.values(athleteCumulative).sort((a, b) => b.points - a.points);
            let currentRank = 1;
            let lastAthlete = null;
            return rankings.map((athlete, index) => {
                if (lastAthlete === null) {
                    athlete.finalRank = 1;
                } else {
                    if (athlete.points !== lastAthlete.points) {
                        currentRank = index + 1;
                    }
                    athlete.finalRank = currentRank;
                }
                lastAthlete = athlete;
                return athlete;
            });
        }

        const surferMap = {};

        // 1. Gather all surfers and their highest round reached
        filteredHeats.forEach(h => {
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
                            school_name: s.school_name,
                            state: s.state,
                            gender: s.gender,
                            heatRank: s.rank || 4,
                            totalScore: s.total_score || 0,
                            waveScores: s.wave_scores || [],
                            roundName: roundName,
                            roundWeight: roundWeight,
                            heatNumber: h.heat_number,
                            heatStatus: h.status
                        };
                    }
                });
            }
        });

        // 2. Sort them to determine Ranks
        const sorted = Object.values(surferMap).sort((a, b) => {
            if (b.roundWeight !== a.roundWeight) {
                return b.roundWeight - a.roundWeight;
            }
            if (a.heatRank !== b.heatRank) {
                return a.heatRank - b.heatRank;
            }
            return b.totalScore - a.totalScore;
        });

        // 3. Assign Heat Order (Seeding Heat) from the earliest round in the division
        let earliestRound = '';
        let minWeight = Infinity;
        filteredHeats.forEach(h => {
            const roundName = h.round || '';
            const w = getRoundWeight(roundName);
            if (w < minWeight) {
                minWeight = w;
                earliestRound = roundName;
            }
        });

        sorted.forEach(surfer => {
            const earliestHeat = filteredHeats.find(h => 
                (h.round || '') === earliestRound && 
                Array.isArray(h.surfers) && 
                h.surfers.some(s => s && s.id === surfer.id)
            );
            if (earliestHeat) {
                surfer.earliestHeatNumber = earliestHeat.heat_number;
            } else {
                surfer.earliestHeatNumber = null;
            }
        });

        const rankings = sorted;

        let currentRank = 1;
        let lastAthlete = null;
        
        return rankings.map((athlete, index) => {
            if (lastAthlete === null) {
                athlete.finalRank = 1;
            } else {
                let isTied = false;
                if (event?.is_series === 1) {
                    isTied = athlete.points === lastAthlete.points;
                } else {
                    isTied = athlete.roundWeight === lastAthlete.roundWeight &&
                             athlete.heatRank === lastAthlete.heatRank &&
                             athlete.totalScore === lastAthlete.totalScore;
                }
                
                if (!isTied) {
                    currentRank = index + 1;
                }
                athlete.finalRank = currentRank;
            }
            lastAthlete = athlete;
            return athlete;
        });
    }, [filteredHeats, event, seriesHeats, selectedDivision]);


    // Check scroll on heats change and after rendering
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container && (heats.length > 0 || filteredHeats.length > 0)) {
            // Check immediately
            checkScroll();

            // Check after a delay to ensure content is rendered
            const timeout1 = setTimeout(checkScroll, 100);
            const timeout2 = setTimeout(checkScroll, 500);
            const timeout3 = setTimeout(checkScroll, 1000);

            container.addEventListener('scroll', checkScroll);
            window.addEventListener('resize', checkScroll);

            return () => {
                container.removeEventListener('scroll', checkScroll);
                window.removeEventListener('resize', checkScroll);
                clearTimeout(timeout1);
                clearTimeout(timeout2);
                clearTimeout(timeout3);
            };
        }
    }, [heats, selectedDivision, filteredHeats]);


    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #ffffffff, #ffffff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-blue)' }} />
                    <p style={{ color: 'var(--text-gray)' }}>Loading heats...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="lvp-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Hero Header */}
            <div className="lvp-hero" style={{ backgroundImage: `url(${bgImage})`, backgroundPosition: 'center 30%', backgroundSize: 'cover', height: '64px', minHeight: 'unset', padding: 0, position: 'relative' }}>
                <div className="lvp-hero-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.72), rgba(15,23,42,0.45))', zIndex: 1 }} />
                <nav className="lvp-nav" style={{ position: 'relative', zIndex: 2, background: 'transparent', backdropFilter: 'none', boxShadow: 'none', borderBottom: 'none' }}>
                    <div className="lvp-nav-brand" onClick={() => navigate('/viewer')} style={{ cursor: 'pointer' }}>
                        <div className="lvp-brand-logo">
                            <img src={logo} alt="Logo" style={{ height: '40px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
                        </div>
                    </div>
                    {/* <div className="lvp-nav-right">
                        <button className="lvp-nav-login" onClick={() => navigate('/login')}>
                            Login
                        </button>
                    </div> */}
                </nav>
            </div>

            {/* Rolling Sponsors Marquee — below nav (heat cards page only) */}
            {selectedDivision && event?.sponsors && (() => {
                const parsedSponsors = safeParseArray(event.sponsors);
                if (parsedSponsors.length === 0) return null;
                return (
                    <div style={{
                        width: '100%',
                        background: 'white',
                        borderTop: '1px solid var(--border-dim)',
                        borderBottom: '1px solid var(--border-dim)',
                        padding: '12px 0',
                        overflowX: 'clip',
                        overflowY: 'visible',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        containerType: 'inline-size'
                    }}>
                        <style>{`
                            @keyframes marquee {
                                0% { transform: translateX(100cqi); }
                                100% { transform: translateX(-100%); }
                            }
                            .sponsor-marquee-container {
                                display: flex;
                                align-items: center;
                                gap: 60px;
                                animation: marquee 20s linear infinite;
                            }
                            .sponsor-marquee-container:hover { animation-play-state: paused; }
                            .sponsor-item-wrapper {
                                position: relative;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                            }
                            .sponsor-ttive {
                                position: absolute;
                                top: calc(100% + 12px);
                                left: 50%;
                                transform: translateX(-50%);
                                background: #0f172a;
                                color: white;
                                padding: 6px 12px;
                                border-radius: 6px;
                                font-size: 13px;
                                font-weight: 700;
                                white-space: nowrap;
                                opacity: 0;
                                visibility: hidden;
                                transition: opacity 0.2s, visibility 0.2s;
                                z-index: 9999;
                                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                pointer-events: none;
                            }
                            .sponsor-ttive::after {
                                content: '';
                                position: absolute;
                                bottom: 100%;
                                left: 50%;
                                transform: translateX(-50%);
                                border: 6px solid transparent;
                                border-bottom-color: #0f172a;
                            }
                            .sponsor-item-wrapper:hover .sponsor-ttive { opacity: 1; visibility: visible; }
                        `}</style>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px', background: 'linear-gradient(to right, rgba(255,255,255,1), rgba(255,255,255,0))', zIndex: 2, pointerEvents: 'none' }} />
                        <div className="sponsor-marquee-container" style={{ width: 'max-content' }}>
                            <span style={{ color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: '800', fontSize: '14px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>EVENT SPONSORS</span>
                            {parsedSponsors.map((sponsor, idx) => (
                                <div key={idx} className="sponsor-item-wrapper">
                                    <img src={sponsor.image} alt={sponsor.name} style={{ height: '38px', width: 'auto', maxWidth: '120px', objectFit: 'contain' }} />
                                    <div className="sponsor-ttive">{sponsor.name}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '100px', background: 'linear-gradient(to left, rgba(255,255,255,1), rgba(255,255,255,0))', zIndex: 2, pointerEvents: 'none' }} />
                    </div>
                );
            })()}

            <div className="edv-body" style={{ padding: '32px 20px 48px', flex: 1 }}>
                <div className="container-max">
                    {/* ── Back button ── */}
                    <button
                        onClick={() => {
                            if (selectedDivision) {
                                if (isSupEvent && selectedSupCategory) {
                                    navigate(`/viewer/${eventSlug}?supCat=${encodeURIComponent(selectedSupCategory)}`);
                                } else {
                                    navigate(`/viewer/${eventSlug}`);
                                }
                            } else if (isSupEvent && selectedSupCategory) {
                                navigate(`/viewer/${eventSlug}`);
                            } else {
                                navigate('/viewer');
                            }
                        }}
                        style={{
                            marginBottom: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: 'none',
                            padding: '6px 0',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            letterSpacing: '0.2px',
                            opacity: 0.75
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                        onMouseOut={e => e.currentTarget.style.opacity = '0.75'}
                    >
                        <ArrowLeft size={14} />
                        {selectedDivision ? 'Back to Divisions' : (isSupEvent && selectedSupCategory ? 'Back to Categories' : 'Back to Events')}
                    </button>

                    {/* ── Event Header (liveheats style) ── */}
                    <div style={{ marginBottom: '36px' }}>
                        <style>{`@keyframes edv-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

                        {event?.banner_image ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                background: '#fffcf7',
                                borderRadius: '16px',
                                padding: '24px',
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                gap: '24px'
                            }}>
                                {/* Left: Banner */}
                                <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img
                                        src={event.banner_image}
                                        alt="Event Banner"
                                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                                    />
                                </div>

                                {/* Right: Info Grid */}
                                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                                    <h1 style={{
                                        fontSize: 'clamp(22px, 3vw, 28px)',
                                        fontWeight: '800',
                                        letterSpacing: '-0.5px',
                                        color: '#0f172a',
                                        margin: '0',
                                        lineHeight: '1.2'
                                    }}>
                                        {event?.name}
                                    </h1>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {/* Date */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Calendar size={16} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px' }}>DATE</div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                                                    {formatDate(event?.start_date)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Clock size={16} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px', marginBottom: '4px' }}>STATUS</div>
                                                {['Active', 'Active - Live'].includes(event?.status) ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef2f2', color: '#ef4444', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px' }}>
                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'edv-pulse 1.2s ease-in-out infinite' }} />
                                                        LIVE
                                                    </span>
                                                ) : ['Finished', 'Finished - Result Published'].includes(event?.status) ? (
                                                    <span style={{ background: '#f0fdf4', color: '#059669', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px' }}>FINISHED</span>
                                                ) : (
                                                    <span style={{ background: '#fef9c3', color: '#ca8a04', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px' }}>UPCOMING</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Category */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Waves size={16} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px' }}>EVENT TYPE</div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                                                    {(event?.event_type || 'Surfing Event').replace(' Event', '')}
                                                    {(event?.event_type || 'Surfing Event') === 'SUP Event' && selectedSupCategory && (
                                                        <span style={{ marginLeft: '6px', color: '#059669' }}>{selectedSupCategory}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <MapPin size={16} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px' }}>LOCATION</div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                                                    {event?.location || 'TBD'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Division / Live Button Row */}
                                    {(selectedDivision || (liveHeat && !selectedDivision)) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                                            {selectedDivision && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <Users size={16} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                    <div>
                                                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px', marginBottom: '4px' }}>DIVISION</div>
                                                        <span style={{ background: '#ccfbf1', color: '#0f766e', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '16px', display: 'inline-block' }}>
                                                            {formatDivisionName(selectedDivision, event)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {liveHeat && !selectedDivision && (
                                                <button
                                                    type="button"
                                                    onClick={handleGoLiveHeat}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                        color: 'white', border: 'none', borderRadius: '24px',
                                                        padding: '5px 12px', fontSize: '11.5px', fontWeight: '800',
                                                        cursor: 'pointer', letterSpacing: '0.2px',
                                                        boxShadow: '0 4px 14px rgba(239,68,68,0.35)', transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(239,68,68,0.45)'; }}
                                                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,0.35)'; }}
                                                >
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'edv-pulse 1.2s ease-in-out infinite' }} />
                                                    Go to Live
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="5" y1="19" x2="19" y2="5" /><polyline points="5 5 19 5 19 19" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                {/* Row 1: date range + status badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    {(event?.start_date || event?.end_date) && (
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#4b5563' }}>
                                            {formatDate(event?.start_date)}{event?.end_date && event.end_date !== event.start_date ? ` – ${formatDate(event?.end_date)}` : ''}
                                        </span>
                                    )}
                                    {event && (
                                        ['Active', 'Active - Live'].includes(event.status) ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                background: '#fef2f2', color: '#ef4444',
                                                fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px',
                                                padding: '4px 10px', borderRadius: '20px',
                                                border: '1px solid #fecaca'
                                            }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'edv-pulse 1.2s ease-in-out infinite' }} />
                                                LIVE
                                            </span>
                                        ) : ['Finished', 'Finished - Result Published'].includes(event.status) ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                background: '#f0fdf4', color: '#059669',
                                                fontSize: '10px', fontWeight: '800', letterSpacing: '1px',
                                                padding: '3px 9px', borderRadius: '20px',
                                                border: '1px solid #a7f3d0'
                                            }}>
                                                <Trophy size={9} color="#059669" />
                                                FINISHED
                                            </span>
                                        ) : (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                background: '#fffbeb', color: '#b45309',
                                                fontSize: '10px', fontWeight: '800', letterSpacing: '1px',
                                                padding: '3px 9px', borderRadius: '20px',
                                                border: '1px solid #fde68a'
                                            }}>
                                                UPCOMING
                                            </span>
                                        )
                                    )}
                                </div>

                                {/* Row 2: Event title */}
                                <h1 style={{
                                    fontSize: 'clamp(22px, 4vw, 34px)',
                                    fontWeight: '700',
                                    letterSpacing: '-0.5px',
                                    color: '#0f172a',
                                    margin: '0 0 4px',
                                    lineHeight: '1.2'
                                }}>
                                    {event?.name}
                                </h1>
                                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        fontSize: '12px',
                                        background: (event?.event_type || 'Surfing Event') === 'SUP Event' ? '#f0fdf4' : '#eff6ff',
                                        color: (event?.event_type || 'Surfing Event') === 'SUP Event' ? '#10b981' : '#2563eb',
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontWeight: '800',
                                        border: '1px solid',
                                        borderColor: (event?.event_type || 'Surfing Event') === 'SUP Event' ? '#bbf7d0' : '#bfdbfe',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        display: 'inline-block'
                                    }}>
                                        {(event?.event_type || 'Surfing Event').replace(' Event', '')}
                                    </span>
                                    {/* SUP Category badge — shown when a division is selected */}
                                    {(event?.event_type || 'Surfing Event') === 'SUP Event' && selectedSupCategory && (
                                        <span style={{
                                            fontSize: '12px',
                                            background: '#065f46',
                                            color: 'white',
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            fontWeight: '800',
                                            letterSpacing: '0.5px',
                                            display: 'inline-block'
                                        }}>
                                            {selectedSupCategory}
                                        </span>
                                    )}
                                </div>

                                {/* Row 3: Location + Go Live Heat */}
                                {(event?.location || liveHeat) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        {event?.location && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0ea5e9', fontSize: '14px', fontWeight: '600', cursor: 'default' }}>
                                                <MapPin size={14} />
                                                {event.location}
                                            </div>
                                        )}
                                        {liveHeat && !selectedDivision && (
                                            <button
                                                type="button"
                                                onClick={handleGoLiveHeat}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '24px',
                                                    padding: '5px 10px',
                                                    fontSize: '11.5px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    letterSpacing: '0.2px',
                                                    boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseOver={e => {
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(239,68,68,0.45)';
                                                }}
                                                onMouseOut={e => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,0.35)';
                                                }}
                                            >
                                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'edv-pulse 1.2s ease-in-out infinite' }} />
                                                Go to Live
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="5" y1="19" x2="19" y2="5" />
                                                    <polyline points="5 5 19 5 19 19" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                    {/* ── Event-level View Switcher Tabs (shown when no division is selected) ── */}
                    {!selectedDivision && heats.length > 0 && (
                        <div className="event-level-tabs" style={{ display: 'flex', borderBottom: '1.5px solid var(--border-light)', marginBottom: '28px', gap: '16px' }}>
                            <button
                                onClick={() => setEventView('divisions')}
                                style={{
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    color: eventView === 'divisions' ? 'var(--accent-blue)' : 'var(--text-gray)',
                                    border: 'none',
                                    borderBottom: eventView === 'divisions' ? '3px solid var(--accent-blue)' : '3px solid transparent',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    marginBottom: '-1.5px',
                                    outline: 'none'
                                }}
                            >
                                {isSupEvent ? 'SUP Categories' : 'Divisions'}
                            </button>

                            {event?.live_stream_url && (
                                <button
                                    onClick={() => setEventView('live')}
                                    style={{
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: eventView === 'live' ? '#ef4444' : 'var(--text-gray)',
                                        border: 'none',
                                        borderBottom: eventView === 'live' ? '3px solid #ef4444' : '3px solid transparent',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        marginBottom: '-1.5px',
                                        outline: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
                                    Watch Live
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Event-level View Content ── */}
                    {/* Hide tabs completely if there's only 'divisions' and no 'live' stream */}
                    {!selectedDivision && heats.length > 0 && !event?.live_stream_url && (
                         <style>{`.event-level-tabs { display: none !important; }`}</style>
                    )}

                    {/* ── SUP Category Selection (shown first for SUP events) ── */}
                    {!selectedDivision && eventView === 'divisions' && !selectedSupCategory && isSupEvent && (() => {
                        const availableCategories = [...new Set(heats.map(h => h.sup_category).filter(Boolean))];
                        if (availableCategories.length === 0) return null;
                        const categoryColors = { 'Sprint': '#10b981', 'Technical race': '#3b82f6', 'Distance': '#f59e0b' };
                        return (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ width: '4px', height: '22px', borderRadius: '2px', background: '#10b981' }} />
                                    <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-dark)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                        Select SUP Category
                                    </h2>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                                    {availableCategories.map((cat, cIdx) => {
                                        const catHeats = heats.filter(h => h.sup_category === cat);
                                        const liveCount = catHeats.filter(h => h.status === 'in-progress').length;
                                        const completedCount = catHeats.filter(h => h.status === 'completed' || h.status === 'finished').length;
                                        const accent = categoryColors[cat] || ['#06b6d4', '#8b5cf6', '#ef4444'][cIdx % 3];
                                        return (
                                            <div
                                                key={cat}
                                                onClick={() => navigate(`/viewer/${eventSlug}?supCat=${encodeURIComponent(cat)}`)}
                                                style={{
                                                    background: 'white',
                                                    border: `1.5px solid var(--border-light)`,
                                                    borderRadius: '16px',
                                                    padding: '24px 24px 20px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.22s ease',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                                onMouseOver={e => {
                                                    e.currentTarget.style.borderColor = accent;
                                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                                    e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.1)`;
                                                }}
                                                onMouseOut={e => {
                                                    e.currentTarget.style.borderColor = 'var(--border-light)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                                }}
                                            >
                                                {/* top accent bar */}
                                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accent, borderRadius: '16px 16px 0 0' }} />

                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: '4px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '11px', fontWeight: '800', color: accent, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>SUP</div>
                                                        <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)', margin: 0, lineHeight: 1.2 }}>{cat}</h3>
                                                    </div>
                                                    {liveCount > 0 && (
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                            background: '#fef2f2', color: '#ef4444',
                                                            border: '1px solid #fecaca',
                                                            borderRadius: '20px', padding: '3px 9px',
                                                            fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap'
                                                        }}>
                                                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', animation: 'livePulse 1.2s ease-in-out infinite', display: 'inline-block' }} />
                                                            LIVE
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <div style={{ textAlign: 'left' }}>
                                                        <div style={{ fontSize: '24px', fontWeight: '900', color: accent, lineHeight: 1 }}>{catHeats.length}</div>
                                                        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Heats</div>
                                                    </div>
                                                    {completedCount > 0 && (
                                                        <div style={{ textAlign: 'left' }}>
                                                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#6b7280', lineHeight: 1 }}>{completedCount}</div>
                                                            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Done</div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    paddingTop: '10px', borderTop: '1px solid var(--border-light)'
                                                }}>
                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>View heats →</span>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Zap size={14} style={{ color: accent }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Division Selection ── */}
                    {!selectedDivision && eventView === 'divisions' && (!isSupEvent || selectedSupCategory) && divisions.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ width: '4px', height: '22px', borderRadius: '2px', background: '#06b6d4' }} />
                                <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-dark)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    Select Section
                                </h2>
                            </div>
                            <div className="edv-divisions-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                gap: '16px'
                            }}>
                                {divisions.map((division, dIdx) => {
                                    const divisionHeats = heats.filter(h => h.division === division && (!isSupEvent || h.sup_category === selectedSupCategory));
                                    const liveCount = divisionHeats.filter(h => h.status === 'in-progress').length;
                                    const completedCount = divisionHeats.filter(h => h.status === 'completed' || h.status === 'finished').length;
                                    const accentColors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
                                    const accent = accentColors[dIdx % accentColors.length];
                                    return (
                                        <div
                                            key={division}
                                            onClick={() => navigate(`/viewer/${eventSlug}/${encodeURIComponent(division)}${isSupEvent ? `?supCat=${encodeURIComponent(selectedSupCategory)}` : ''}`)}
                                            style={{
                                                background: 'white',
                                                border: '1.5px solid var(--border-light)',
                                                borderRadius: '16px',
                                                padding: '24px 24px 20px',
                                                cursor: 'pointer',
                                                transition: 'all 0.22s ease',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.borderColor = accent;
                                                e.currentTarget.style.transform = 'translateY(-3px)';
                                                e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.1)`;
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--border-light)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                            }}
                                        >
                                            {/* top accent bar */}
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accent, borderRadius: '16px 16px 0 0' }} />

                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: '4px' }}>
                                                <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-dark)', margin: 0, lineHeight: 1.2, flex: 1, paddingRight: '8px' }}>
                                                    {formatDivisionName(division, event)}
                                                </h3>
                                                {liveCount > 0 && (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                        background: '#fef2f2', color: '#ef4444',
                                                        border: '1px solid #fecaca',
                                                        borderRadius: '20px', padding: '3px 9px',
                                                        fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap'
                                                    }}>
                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', animation: 'livePulse 1.2s ease-in-out infinite', display: 'inline-block' }} />
                                                        LIVE
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontSize: '20px', fontWeight: '900', color: accent, lineHeight: 1 }}>{divisionHeats.length}</div>
                                                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Heats</div>
                                                </div>
                                                {completedCount > 0 && (
                                                    <div style={{ textAlign: 'left' }}>
                                                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#6b7280', lineHeight: 1 }}>{completedCount}</div>
                                                        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Done</div>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                paddingTop: '10px', borderTop: '1px solid var(--border-light)'
                                            }}>
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>View heats →</span>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Zap size={14} style={{ color: accent }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}



                    {/* ── Event-level Live Stream View ── */}
                    {!selectedDivision && eventView === 'live' && event?.live_stream_url && (() => {
                        const getYouTubeEmbedUrl = (url) => {
                            try {
                                // If they pasted an entire iframe tag, try to extract the src URL
                                let cleanUrl = url;
                                if (cleanUrl.includes('<iframe')) {
                                    const match = cleanUrl.match(/src="([^"]+)"/);
                                    if (match) cleanUrl = match[1];
                                }

                                const urlObj = new URL(cleanUrl);
                                let videoId = '';
                                if (urlObj.hostname.includes('youtube.com')) {
                                    if (urlObj.pathname.startsWith('/shorts/')) {
                                        videoId = urlObj.pathname.split('/')[2];
                                    } else if (urlObj.pathname.startsWith('/embed/')) {
                                        videoId = urlObj.pathname.split('/')[2];
                                    } else {
                                        videoId = urlObj.searchParams.get('v');
                                    }
                                } else if (urlObj.hostname.includes('youtu.be')) {
                                    videoId = urlObj.pathname.slice(1);
                                }
                                return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
                            } catch (e) {
                                return null;
                            }
                        };
                        const embedUrl = getYouTubeEmbedUrl(event.live_stream_url);
                        
                        return embedUrl ? (
                            <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#000', aspectRatio: '16/9', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={embedUrl}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', color: '#64748b', marginBottom: '32px' }}>
                                Invalid YouTube URL provided.
                            </div>
                        );
                    })()}

                    {/* Heat View */}
                    {selectedDivision && (!isSupEvent || selectedSupCategory) && (
                        <div>
                            {/* Division Title (hide if banner exists, as it's duplicated in the banner info) */}
                            {!event?.banner_image && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        background: '#f0fdfa', color: '#0d9488',
                                        border: '1.5px solid #99f6e4',
                                        borderRadius: '10px', padding: '5px 14px',
                                        fontSize: '13px', fontWeight: '700', letterSpacing: '0.2px'
                                    }}>
                                        {formatDivisionName(selectedDivision, event)}
                                    </span>
                                </div>
                            )}

                            {/* View Switcher Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border-light)', marginBottom: '28px', gap: '16px' }}>
                                <button
                                    onClick={() => setDivisionView('heats')}
                                    style={{
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: divisionView === 'heats' ? 'var(--accent-blue)' : 'var(--text-gray)',
                                        border: 'none',
                                        borderBottom: divisionView === 'heats' ? '3px solid var(--accent-blue)' : '3px solid transparent',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        marginBottom: '-1.5px',
                                        outline: 'none'
                                    }}
                                >
                                    Heats Draw
                                </button>
                                <button
                                    onClick={() => setDivisionView('rankings')}
                                    style={{
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: divisionView === 'rankings' ? 'var(--accent-blue)' : 'var(--text-gray)',
                                        border: 'none',
                                        borderBottom: divisionView === 'rankings' ? '3px solid var(--accent-blue)' : '3px solid transparent',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        marginBottom: '-1.5px',
                                        outline: 'none'
                                    }}
                                >
                                    Athlete List / Rankings
                                </button>
                                <button
                                    onClick={() => setDivisionView('schedule')}
                                    style={{
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: divisionView === 'schedule' ? 'var(--accent-blue)' : 'var(--text-gray)',
                                        border: 'none',
                                        borderBottom: divisionView === 'schedule' ? '3px solid var(--accent-blue)' : '3px solid transparent',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        marginBottom: '-1.5px',
                                        outline: 'none'
                                    }}
                                >
                                    View Schedule
                                </button>
                            </div>

                            {divisionView === 'heats' && (
                                <>
                                    {/* Horizontally Scrollable Round Table with Navigation Buttons */}
                                    <div style={{ position: 'relative' }}>
                                        {/* Left Arrow */}
                                        {showLeftArrow && (
                                            <button
                                                onClick={() => handleScroll('left')}
                                                style={{
                                                    position: 'absolute',
                                                    left: 10,
                                                    top: '50px',
                                                    zIndex: 20,
                                                    background: 'linear-gradient(135deg, #fffb00ff 0%, #ff8c00 100%)',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    width: '48px',
                                                    height: '48px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 16px rgba(241, 161, 41, 0.4)',
                                                    color: 'white'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.1)';
                                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(241, 161, 41, 0.6)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(241, 161, 41, 0.4)';
                                                }}
                                            >
                                                <ChevronLeft size={28} strokeWidth={3} />
                                            </button>
                                        )}

                                        {/* Right Arrow */}
                                        {showRightArrow && (
                                            <button
                                                onClick={() => handleScroll('right')}
                                                style={{
                                                    position: 'absolute',
                                                    right: 10,
                                                    top: '50px',
                                                    zIndex: 20,
                                                    background: 'linear-gradient(135deg, #fce300ff 0%, #ff8c00 100%)',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    width: '48px',
                                                    height: '48px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 16px rgba(241, 161, 41, 0.4)',
                                                    color: 'white'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.1)';
                                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(241, 161, 41, 0.6)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(241, 161, 41, 0.4)';
                                                }}
                                            >
                                                <ChevronRight size={28} strokeWidth={3} />
                                            </button>
                                        )}

                                        <div
                                            ref={scrollContainerRef}
                                            style={{
                                                overflowX: 'auto',
                                                paddingBottom: '20px',
                                                msOverflowStyle: 'none',
                                                scrollbarWidth: 'none',
                                                scrollBehavior: 'smooth'
                                            }}
                                        >
                                            <div style={{ display: 'flex', gap: '20px', minWidth: 'max-content', padding: '10px 0' }}>
                                                {rounds.map(round => (
                                                    <div key={round} style={{ minWidth: '300px' }}>
                                                        <h3 style={{
                                                            fontSize: '18px',
                                                            fontWeight: '800',
                                                            marginBottom: '16px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '1px',
                                                            color: 'var(--accent-blue)',
                                                            position: 'sticky',
                                                            top: 0,
                                                            background: 'none',
                                                            paddingBottom: '8px',
                                                            zIndex: 10
                                                        }}>
                                                            {round}
                                                        </h3>
                                                        <div>
                                                            {heatsByRound[round].map(heat => (
                                                                <div
                                                                    key={heat.id}
                                                                    ref={(el) => {
                                                                        if (el) heatCardRefs.current[heat.id] = el;
                                                                        else delete heatCardRefs.current[heat.id];
                                                                    }}
                                                                >
                                                                    <HeatCard heat={heat} allHeats={filteredHeats} onSelect={setSelectedHeat} onShare={setShareHeat} event={event} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {filteredHeats.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-gray)' }}>
                                            No heats found for this division.
                                        </div>
                                    )}
                                </>
                            )}

                            {divisionView === 'rankings' && (
                                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', maxWidth: '600px', margin: '0 auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-dark)' }}>
                                            Athlete Rankings
                                        </h3>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2.5px solid var(--border-light)' }}>
                                                    {(!selectedDivision || selectedDivision.toLowerCase() !== 'all events') && (
                                                        <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '80px' }}>Rank</th>
                                                    )}
                                                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Athlete</th>
                                                    {(!selectedDivision || selectedDivision.toLowerCase() !== 'all events') && (
                                                        <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Points</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {athleteRankings.map((athlete) => {
                                                    const finalRank = athlete.finalRank;
                                                    const pts = event?.is_series === 1 ? (athlete.points || 0) : getPointsForRank(finalRank);
                                                    const hideRankAndPoints = selectedDivision && selectedDivision.toLowerCase() === 'all events';

                                                    return (
                                                        <tr key={athlete.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                            {!hideRankAndPoints && (
                                                                <td style={{ padding: '16px', fontWeight: '800', color: finalRank === 1 ? '#eab308' : finalRank === 2 ? '#94a3b8' : finalRank === 3 ? '#b45309' : '#0f172a', fontSize: '15px' }}>
                                                                    {finalRank}
                                                                </td>
                                                            )}
                                                            <td style={{ padding: '16px' }}>
                                                                <div style={{ fontWeight: '700', color: '#0f172a' }}>{athlete.name}</div>
                                                                {athlete.school_name && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{athlete.school_name}</div>}
                                                            </td>
                                                            {!hideRankAndPoints && (
                                                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                                                    <span style={{ background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                                                                        {pts} pts
                                                                    </span>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {athleteRankings.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-gray)' }}>
                                            No competitor rankings available for this division yet.
                                        </div>
                                    )}
                                </div>
                            )}

                            {divisionView === 'schedule' && (
                                <ScheduleListView
                                    heats={event?.is_series === 1 ? seriesHeats : heats}
                                    event={event}
                                    selectedDivision={selectedDivision}
                                    onSelectHeat={setSelectedHeat}
                                />
                            )}
                        </div>
                    )}

                    {heats.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '100px 40px',
                            background: 'white',
                            border: '2px dashed var(--border-light)',
                            borderRadius: '24px'
                        }}>
                            <Trophy size={56} style={{ color: 'var(--text-light-muted)', margin: '0 auto 24px' }} />
                            <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px' }}>
                                No heats available
                            </h3>
                            <p style={{ color: 'var(--text-gray)', fontSize: '16px' }}>
                                Heats will appear here once they are created.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Heat Detail Modal */}
            {selectedHeat && (
                <HeatDetailModal
                    heat={heats.find(h => h.id === (typeof selectedHeat === 'object' ? selectedHeat.id : selectedHeat))}
                    event={event}
                    onClose={() => setSelectedHeat(null)}
                />
            )}

            {/* Share Heat Modal */}
            {shareHeat && (
                <ShareHeatViewerModal
                    heat={shareHeat}
                    eventSlug={eventSlug}
                    selectedDivision={selectedDivision}
                    event={event}
                    onClose={() => setShareHeat(null)}
                />
            )}

            {/* Rolling Sponsors Marquee — above footer (division selection page only) */}
            {!selectedDivision && event?.sponsors && (() => {
                const parsedSponsors = safeParseArray(event.sponsors);
                if (parsedSponsors.length === 0) return null;
                return (
                    <div style={{
                        width: '100%',
                        background: 'white',
                        borderTop: '1px solid var(--border-dim)',
                        borderBottom: '1px solid var(--border-dim)',
                        padding: '14px 0',
                        overflowX: 'clip',
                        overflowY: 'visible',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        containerType: 'inline-size'
                    }}>
                        <style>{`
                            @keyframes marquee {
                                0% { transform: translateX(100cqi); }
                                100% { transform: translateX(-100%); }
                            }
                            .sponsor-marquee-container {
                                display: flex;
                                align-items: center;
                                gap: 60px;
                                animation: marquee 20s linear infinite;
                            }
                            .sponsor-marquee-container:hover { animation-play-state: paused; }
                            .sponsor-item-wrapper {
                                position: relative;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                            }
                            .sponsor-ttive {
                                position: absolute;
                                top: calc(100% + 12px);
                                left: 50%;
                                transform: translateX(-50%);
                                background: #0f172a;
                                color: white;
                                padding: 6px 12px;
                                border-radius: 6px;
                                font-size: 13px;
                                font-weight: 700;
                                white-space: nowrap;
                                opacity: 0;
                                visibility: hidden;
                                transition: opacity 0.2s, visibility 0.2s;
                                z-index: 9999;
                                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                pointer-events: none;
                            }
                            .sponsor-ttive::after {
                                content: '';
                                position: absolute;
                                bottom: 100%;
                                left: 50%;
                                transform: translateX(-50%);
                                border: 6px solid transparent;
                                border-bottom-color: #0f172a;
                            }
                            .sponsor-item-wrapper:hover .sponsor-ttive { opacity: 1; visibility: visible; }
                        `}</style>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px', background: 'linear-gradient(to right, rgba(255,255,255,1), rgba(255,255,255,0))', zIndex: 2, pointerEvents: 'none' }} />
                        <div className="sponsor-marquee-container" style={{ width: 'max-content' }}>
                            <span style={{ color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: '800', fontSize: '14px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>EVENT SPONSORS</span>
                            {parsedSponsors.map((sponsor, idx) => (
                                <div key={idx} className="sponsor-item-wrapper">
                                    <img src={sponsor.image} alt={sponsor.name} style={{ height: '40px', width: 'auto', maxWidth: '120px', objectFit: 'contain' }} />
                                    <div className="sponsor-ttive">{sponsor.name}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '100px', background: 'linear-gradient(to left, rgba(255,255,255,1), rgba(255,255,255,0))', zIndex: 2, pointerEvents: 'none' }} />
                    </div>
                );
            })()}

            {/* Footer */}
            <footer className="lvp-footer">
                <div className="lvp-footer-brand">
                    <img src={logo} alt="Logo" style={{ height: '36px', width: 'auto' }} />
                </div>
                <div className="lvp-footer-copy">
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, fontWeight: '500', position: 'relative' }}>
                        © {new Date().getFullYear()} Aquatic X Sports. All Rights Reserved · Developed by{' '}
                        <a href="https://rpntechworld.com" style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: '700' }}>RPN Tech World</a>
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default EventDetailViewer;
