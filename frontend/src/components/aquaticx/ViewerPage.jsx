import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Calendar, MapPin, Trophy, Clock, Search, Radio,
    RefreshCw, Waves, ArrowRight, Zap, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import b1Image from '../assets/b1.jpeg';
import b2Image from '../assets/b2.jpeg';
import b3Image from '../assets/b3.jpeg';
import b4Image from '../assets/b4.jpeg';
import b5Image from '../assets/b5.jpeg';
import b6Image from '../assets/b6.jpeg';
import logo from '../assets/logo.png';
import useAnalyticsTracker from '../hooks/useAnalyticsTracker';
import useGoogleAnalytics from '../hooks/useGoogleAnalytics';

/* ── Slide config ── */
const SLIDES = [
    {
        // b1 — young surf team posing with boards on the beach
        bg: b1Image,
        parts: [
            { text: 'Born to ', accent: false },
            { text: 'Surf', accent: true, color: '#06b6d4' },
            { text: ', Built to ', accent: false },
            { text: 'Win', accent: true, color: '#06b6d4' },
        ],
        sub: 'The next generation of Indian surf legends is already here.',
    },
    {
        // b2 — dramatic black & white water-level shot
        bg: b2Image,
        parts: [
            { text: 'Where ', accent: false },
            { text: 'Ocean', accent: true, color: '#e2e8f0' },
            { text: ' Meets ', accent: false },
            { text: 'Courage', accent: true, color: '#e2e8f0' },
        ],
        sub: 'Every wave is a battle won — witness the raw power of the surf.',
    },
    {
        // b3 — young grom ripping a wave
        bg: b3Image,
        parts: [
            { text: 'The ', accent: false },
            { text: 'Grom', accent: true, color: '#38bdf8' },
            { text: ' Who ', accent: false },
            { text: 'Dares', accent: true, color: '#38bdf8' },
        ],
        sub: 'Age is just a number when the wave is calling your name.',
    },
    {
        // b4 — pro surfer carving a perfect green wave
        bg: b4Image,
        parts: [
            { text: 'Ride the ', accent: false },
            { text: 'Perfect', accent: true, color: '#06b6d4' },
            { text: ' ', accent: false },
            { text: 'Wave', accent: true, color: '#06b6d4' },
        ],
        sub: 'Follow every heat, every carve, every moment — live.',
    },
    {
        // b5 — three surfers celebrating joyfully on the beach
        bg: b5Image,
        parts: [
            { text: 'Ride Together, ', accent: false },
            { text: 'Rise', accent: true, color: '#fbbf24' },
            { text: ' ', accent: false },
            { text: 'Together', accent: true, color: '#fbbf24' },
        ],
        sub: 'Surf is more than a sport — it\'s a community, a family, a way of life.',
    },
    {
        // b6 — sixth surf photo
        bg: b6Image,
        parts: [
            { text: 'Chasing ', accent: false },
            { text: 'Waves', accent: true, color: '#06b6d4' },
            { text: ', Creating ', accent: false },
            { text: 'Legends', accent: true, color: '#06b6d4' },
        ],
        sub: 'India\'s aquatic sports story is written one wave at a time.',
    },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ── Countdown ── */
const useCountdown = (targetDate) => {
    const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });
    useEffect(() => {
        const compute = () => {
            const diff = new Date(targetDate) - Date.now();
            if (diff <= 0) return setT({ d: 0, h: 0, m: 0, s: 0, expired: true });
            setT({
                d: Math.floor(diff / 86400000),
                h: Math.floor((diff % 86400000) / 3600000),
                m: Math.floor((diff % 3600000) / 60000),
                s: Math.floor((diff % 60000) / 1000),
                expired: false,
            });
        };
        compute();
        const id = setInterval(compute, 1000);
        return () => clearInterval(id);
    }, [targetDate]);
    return t;
};

const Countdown = ({ startDate }) => {
    const t = useCountdown(startDate);
    if (t.expired) return <span style={{ color: '#0ea5e9', fontWeight: 700, fontSize: '12px' }}>Starting soon</span>;
    return (
        <div style={{ display: 'flex', gap: '6px' }}>
            {[{ v: t.d, l: 'D' }, { v: t.h, l: 'H' }, { v: t.m, l: 'M' }, { v: t.s, l: 'S' }].map(({ v, l }) => (
                <div key={l} style={{ textAlign: 'center', minWidth: '36px', background: '#f1f5f9', borderRadius: '8px', padding: '5px 4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{String(v).padStart(2, '0')}</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginTop: '2px' }}>{l}</div>
                </div>
            ))}
        </div>
    );
};

/* ── Skeleton ── */
const SkeletonCard = ({ tall }) => (
    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', height: tall ? '280px' : '220px', animation: 'pulse 1.5s ease-in-out infinite' }}>
        {[70, 40, 60, 30].map((w, i) => (
            <div key={i} style={{ height: i === 0 ? '16px' : '12px', width: `${w}%`, background: '#f1f5f9', borderRadius: '6px', marginBottom: '14px' }} />
        ))}
    </div>
);

/* ── LIVE EVENT CARD — white + red accent ── */
const LiveCard = ({ event, navigate }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={() => navigate(`/viewer/${event.slug || event.id}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'white',
                borderRadius: '20px',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: hovered
                    ? '0 14px 34px rgba(239,68,68,0.16)'
                    : '0 2px 14px rgba(0,0,0,0.07)',
                border: '1.5px solid',
                borderColor: hovered ? '#ef4444' : '#f1f5f9',
                transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                width: '290px',
                flexShrink: 0,
                position: 'relative',
            }}
        >
            {/* Arrow top-right */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', width: '28px', height: '28px', borderRadius: '50%', background: hovered ? '#ef4444' : '#f1f5f9', border: '1px solid', borderColor: hovered ? '#ef4444' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <ArrowRight size={14} color={hovered ? 'white' : '#64748b'} />
            </div>

            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {/* Live badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '36px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: event.status === 'On Hold' ? '#fffbeb' : '#fef2f2', color: event.status === 'On Hold' ? '#d97706' : '#ef4444', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', padding: '4px 10px', borderRadius: '20px', border: `1px solid ${event.status === 'On Hold' ? '#fde68a' : '#fecaca'}` }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: event.status === 'On Hold' ? '#d97706' : '#ef4444', display: 'inline-block', animation: event.status === 'On Hold' ? 'none' : 'livePulse 1.2s ease-in-out infinite' }} />
                        {event.status === 'On Hold' ? 'On Hold' : 'LIVE'}
                    </span>
                </div>

                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0, lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                        {event.name}
                    </h3>
                    <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                        <span style={{
                            fontSize: '9.5px',
                            background: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#f0fdf4' : '#eff6ff',
                            color: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#10b981' : '#2563eb',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: '800',
                            border: '1px solid',
                            borderColor: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#bbf7d0' : '#bfdbfe',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'inline-block'
                        }}>
                            {(event.event_type || 'Surfing Event').replace(' Event', '')}
                        </span>
                    </div>
                    {event.school_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#0ea5e9', fontSize: '12px', fontWeight: '700' }}>
                            <Waves size={11} color="#0ea5e9" />
                            {event.school_name}
                        </div>
                    )}
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                        <MapPin size={13} color="#94a3b8" />
                        {event.location || 'TBD'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                        <Calendar size={13} color="#94a3b8" />
                        {formatDate(event.start_date)}
                    </div>
                </div>

                {/* Watch live */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12.5px', fontWeight: '700' }}>
                    <Radio size={13} color="#ef4444" />
                    Watch live scores
                </div>
            </div>
        </div>
    );
};

/* ── UPCOMING EVENT CARD — white + blue accent ── */
const UpcomingCard = ({ event, navigate }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={() => navigate(`/viewer/${event.slug || event.id}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'white',
                borderRadius: '20px',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: hovered
                    ? '0 14px 34px rgba(14,165,233,0.16)'
                    : '0 2px 14px rgba(0,0,0,0.07)',
                border: '1.5px solid',
                borderColor: hovered ? '#0ea5e9' : '#f1f5f9',
                transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                width: '270px',
                flexShrink: 0,
                position: 'relative',
            }}
        >
            {/* Arrow top-right */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', width: '28px', height: '28px', borderRadius: '50%', background: hovered ? '#0ea5e9' : '#f0f9ff', border: '1px solid', borderColor: hovered ? '#0ea5e9' : '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <ArrowRight size={14} color={hovered ? 'white' : '#0369a1'} />
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '11px', flex: 1 }}>
                <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '5px', background: event.status === 'Register form opening' ? '#f0fdf4' : '#f0f9ff', color: event.status === 'Register form opening' ? '#16a34a' : '#0369a1', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', padding: '4px 10px', borderRadius: '20px', border: event.status === 'Register form opening' ? '1px solid #bbf7d0' : '1px solid #bae6fd' }}>
                    <Clock size={10} color={event.status === 'Register form opening' ? '#16a34a' : '#0369a1'} /> {event.status === 'Register form opening' ? 'REGISTRATION OPEN' : 'UPCOMING'}
                </span>

                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: 1.3, paddingRight: '36px' }}>
                        {event.name}
                    </h3>
                    <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                        <span style={{
                            fontSize: '9.5px',
                            background: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#f0fdf4' : '#eff6ff',
                            color: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#10b981' : '#2563eb',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: '800',
                            border: '1px solid',
                            borderColor: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#bbf7d0' : '#bfdbfe',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'inline-block'
                        }}>
                            {(event.event_type || 'Surfing Event').replace(' Event', '')}
                        </span>
                    </div>
                    {event.school_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', color: '#0369a1', fontSize: '11.5px', fontWeight: '700' }}>
                            <Waves size={10} color="#0369a1" />{event.school_name}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12.5px' }}>
                        <MapPin size={12} color="#94a3b8" />{event.location || 'TBD'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12.5px' }}>
                        <Calendar size={12} color="#94a3b8" />{formatDate(event.start_date)}
                    </div>
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0369a1', background: '#f0f9ff', padding: '5px 10px', borderRadius: '8px', border: '1px solid #bae6fd', alignSelf: 'flex-start' }}>
                    <Zap size={11} color="#0369a1" />
                    Starts in{' '}
                    <span style={{ fontWeight: '900', color: '#0c4a6e' }}>
                        {Math.max(0, Math.ceil((new Date(event.start_date) - new Date()) / 86400000))}
                    </span>
                    {' '}days
                </div>
            </div>
        </div>
    );
};

/* ── COMPLETED EVENT CARD — white + green accent ── */
const CompletedCard = ({ event, navigate }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={() => navigate(`/viewer/${event.slug || event.id}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: hovered
                    ? '0 13px 30px rgba(16,185,129,0.16)'
                    : '0 2px 14px rgba(0,0,0,0.07)',
                border: '1.5px solid',
                borderColor: hovered ? '#10b981' : '#f1f5f9',
                transition: 'border-color 0.22s ease, box-shadow 0.22s ease',
                display: 'flex',
                flexDirection: 'column',
                width: '280px',
                flexShrink: 0,
                position: 'relative',
            }}
        >
            {/* Arrow top-right */}
            <div style={{ position: 'absolute', top: '14px', right: '14px', width: '26px', height: '26px', borderRadius: '50%', background: hovered ? '#10b981' : '#f0fdf4', border: '1px solid', borderColor: hovered ? '#10b981' : '#a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <ArrowRight size={13} color={hovered ? 'white' : '#059669'} />
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#059669', fontSize: '10px', fontWeight: '800', letterSpacing: '1px', padding: '3px 9px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
                    <Trophy size={9} color="#059669" /> COMPLETED
                </span>
                <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: 1.3, paddingRight: '32px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {event.name}
                    </h3>
                    <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                        <span style={{
                            fontSize: '9px',
                            background: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#f0fdf4' : '#eff6ff',
                            color: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#10b981' : '#2563eb',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: '800',
                            border: '1px solid',
                            borderColor: (event.event_type || 'Surfing Event') === 'SUP Event' ? '#bbf7d0' : '#bfdbfe',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'inline-block'
                        }}>
                            {(event.event_type || 'Surfing Event').replace(' Event', '')}
                        </span>
                    </div>
                    {event.school_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', color: '#0891b2', fontSize: '11px', fontWeight: '700' }}>
                            <Waves size={10} color="#0891b2" />{event.school_name}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '12px' }}>
                        <MapPin size={11} color="#94a3b8" />{event.location || 'TBD'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '12px' }}>
                        <Calendar size={11} color="#94a3b8" />{formatDate(event.start_date)}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── SECTION HEADER with scroll nav ── */
const SectionHeader = ({ icon: Icon, label, count, color, scrollRef }) => {
    const [canScroll, setCanScroll] = useState(false);

    useEffect(() => {
        const check = () => {
            if (scrollRef?.current) {
                setCanScroll(scrollRef.current.scrollWidth > scrollRef.current.clientWidth + 2);
            }
        };
        const t = setTimeout(check, 80);
        window.addEventListener('resize', check);
        return () => { clearTimeout(t); window.removeEventListener('resize', check); };
    }, [scrollRef, count]);

    const scroll = (dir) => {
        if (scrollRef?.current) scrollRef.current.scrollBy({ left: dir * 310, behavior: 'smooth' });
    };
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={color} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>{label}</h2>
                {count > 0 && (
                    <span style={{ background: `${color}15`, color, fontSize: '12px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${color}30` }}>
                        {count}
                    </span>
                )}
            </div>
            {canScroll && (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => scroll(-1)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <ChevronLeft size={16} color="#475569" />
                    </button>
                    <button onClick={() => scroll(1)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <ChevronRight size={16} color="#475569" />
                    </button>
                </div>
            )}
        </div>
    );
};

/* ── MAIN PAGE ── */
const ViewerPage = () => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [debugError, setDebugError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceTimeout = useRef(null);
    const [lastRefreshed, setLastRefreshed] = useState('just now');
    const [activeFilter, setActiveFilter] = useState('all');
    const [isScrolled, setIsScrolled] = useState(false);
    const [slideIndex, setSlideIndex] = useState(0);
    const navigate = useNavigate();
    const liveRef = useRef(null);
    const liveSectionRef = useRef(null);  // for scrolling the whole section into view
    const upcomingRef = useRef(null);
    const completedRef = useRef(null);

    // Smart Live Now handler:
    // n=1 → navigate directly to event detail page with ?autoLive=true
    // n>1 → scroll down to the live events section
    const handleLiveNowClick = () => {
        const allLive = events.filter(e => e.status === 'Active' || e.status === 'Active - Live' || e.status === 'On Hold');
        if (allLive.length === 1) {
            const ev = allLive[0];
            navigate(`/viewer/${ev.slug || ev.id}?autoLive=true`);
        } else if (allLive.length > 1) {
            setActiveFilter('live');
            setTimeout(() => {
                liveSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setSlideIndex(i => (i + 1) % SLIDES.length);
        }, 7000);
        return () => clearInterval(timer);
    }, []);

    useAnalyticsTracker('viewer_landing');
    useGoogleAnalytics('/viewer');

    const fetchEvents = useCallback(async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            else setIsRefreshing(true);
            const res = await axios.get(`${API_BASE}/events`);
            setEvents(res.data);
            const now = new Date();
            setLastRefreshed(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
            setDebugError('');
        } catch (err) {
            console.error('ViewerPage fetch error', err);
            setDebugError(err.message || String(err));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchEvents(false);
        const poll = setInterval(() => fetchEvents(true), 8000);
        const onScroll = () => setIsScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll);
        return () => { clearInterval(poll); window.removeEventListener('scroll', onScroll); };
    }, [fetchEvents]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        if (val.trim().length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        debounceTimeout.current = setTimeout(async () => {
            try {
                // Fetch from Nominatim API (Free OpenStreetMap Geocoding)
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'AquaticXSports/1.0'
                    }
                });
                const data = await res.json();
                if (data && Array.isArray(data)) {
                    setSuggestions(data);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error("Error fetching map suggestions:", err);
            }
        }, 500); // 500ms debounce
    };

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return events.filter(e => e.name?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q));
    }, [events, searchQuery]);

    const liveEvents = useMemo(() => filtered.filter(e => {
        const s = (e.status || '').toLowerCase();
        return s === 'active' || s === 'active - live' || s === 'on hold';
    }), [filtered]);

    const scheduledEvents = useMemo(() => {
        return filtered
            .filter(e => {
                const s = (e.status || '').toLowerCase();
                return s === 'scheduled' || s === 'heat drawn' || s === 'register form opening';
            })
            .sort((a, b) => {
                const dateA = a.start_date ? new Date(a.start_date) : new Date(8640000000000000);
                const dateB = b.start_date ? new Date(b.start_date) : new Date(8640000000000000);
                return dateA - dateB;
            });
    }, [filtered]);

    const completedEvents = useMemo(() => {
        return filtered
            .filter(e => {
                const s = (e.status || '').toLowerCase();
                return s === 'finished' || s === 'finished - result published';
            })
            .sort((a, b) => {
                const dateA = a.start_date ? new Date(a.start_date) : new Date(0);
                const dateB = b.start_date ? new Date(b.start_date) : new Date(0);
                return dateB - dateA;
            });
    }, [filtered]);
    const totalLive = liveEvents.length;

    const showLive = (activeFilter === 'all' || activeFilter === 'live') && liveEvents.length > 0;
    const showUpcoming = (activeFilter === 'all' || activeFilter === 'upcoming') && scheduledEvents.length > 0;
    const showCompleted = (activeFilter === 'all' || activeFilter === 'completed') && completedEvents.length > 0;

    const filters = [
        { key: 'all', label: 'All Events' },
        { key: 'live', label: `Live`, count: liveEvents.length },
        { key: 'upcoming', label: `Upcoming`, count: scheduledEvents.length },
        { key: 'completed', label: `Completed`, count: completedEvents.length },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

            {/* ── INJECT KEYFRAMES ── */}
            <style>{`
                @keyframes livePulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
                @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.5} }
                @keyframes spin       { to{transform:rotate(360deg)} }
                @keyframes heroTextIn { 0%{opacity:0;transform:translateX(-22px)} 100%{opacity:1;transform:translateX(0)} }
                @keyframes heroSubIn  { 0%{opacity:0;transform:translateX(-14px)} 100%{opacity:1;transform:translateX(0)} }
                .hide-scroll { scrollbar-width: none; -ms-overflow-style: none; }
                .hide-scroll::-webkit-scrollbar { display: none; }

                /* ── Mobile navbar tweaks ── */
                @media (max-width: 768px) {
                    .vp-navbar {
                        padding: 0 16px !important;
                        height: 56px !important;
                    }
                    .vp-brand-sub { display: none !important; }
                    .vp-live-badge {
                        padding: 4px 9px !important;
                        font-size: 10.5px !important;
                        gap: 4px !important;
                        border-radius: 14px !important;
                    }
                    .vp-live-dot {
                        width: 5px !important;
                        height: 5px !important;
                    }
                }
            `}</style>


            {/* ── STICKY NAVBAR ── */}
            <nav className="vp-navbar" style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                background: isScrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
                backdropFilter: isScrolled ? 'blur(12px)' : 'none',
                boxShadow: isScrolled ? '0 1px 20px rgba(0,0,0,0.08)' : 'none',
                borderBottom: isScrolled ? '1px solid #f1f5f9' : 'none',
                transition: 'all 0.3s ease',
                padding: '0 40px',
                height: '68px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                {/* Brand */}
                <div onClick={() => navigate('/viewer')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <img
                        src={logo}
                        alt="Aquatic X Sports Logo"
                        style={{
                            height: '48px',
                            width: 'auto',
                            transition: 'all 0.3s'
                        }}
                    />
                </div>

                {/* Right side — Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {totalLive > 0 && (
                        <div
                            className="vp-live-badge"
                            onClick={handleLiveNowClick}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef2f2', color: '#dc2626', padding: '6px 14px', borderRadius: '20px', fontSize: '12.5px', fontWeight: '800', border: '1px solid #fecaca', cursor: 'pointer', userSelect: 'none' }}
                        >
                            <span className="vp-live-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'livePulse 1.2s infinite' }} />
                            {totalLive} Live
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/viewer/deepsea-secret?tab=login')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: isScrolled ? '#0f172a' : 'white',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            transition: 'color 0.3s'
                        }}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => navigate('/viewer/deepsea-secret?tab=register')}
                        style={{
                            background: '#06b6d4',
                            border: 'none',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: '8px 18px',
                            borderRadius: '20px',
                            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Register
                    </button>
                </div>
            </nav>

            {/* ── HERO ── */}
            <div style={{ position: 'relative', height: '560px', display: 'flex', alignItems: 'flex-end' }}>

                {/* Background image layers — crossfade */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
                    {SLIDES.map((slide, i) => (
                        <div key={i} style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: `url(${slide.bg})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center 30%',
                            opacity: i === slideIndex ? 1 : 0,
                            transition: 'opacity 2.2s ease-in-out',
                            transform: i === slideIndex ? 'scale(1)' : 'scale(1.03)',
                            transitionProperty: 'opacity, transform',
                            transitionDuration: '2.2s',
                            transitionTimingFunction: 'ease-in-out',
                        }} />
                    ))}

                    {/* Gradient overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.05) 55%, rgba(248, 250, 252, 1) 100%)', zIndex: 1 }} />
                </div>


                <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 40px 60px' }}>

                    {/* Animated Headline — key forces remount on slide change */}
                    <div key={slideIndex}>
                        {totalLive > 0 && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#ef4444', color: 'white', padding: '5px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', letterSpacing: '1px', marginBottom: '14px', animation: 'heroTextIn 0.7s ease forwards' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'livePulse 1.2s infinite' }} />
                                {totalLive} EVENT{totalLive > 1 ? 'S' : ''} LIVE
                            </div>
                        )}
                        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '900', color: 'white', margin: 0, lineHeight: 1.2, letterSpacing: '-1.5px', textShadow: '0 2px 20px rgba(0,0,0,0.3)', animation: 'heroTextIn 0.7s ease forwards' }}>
                            {SLIDES[slideIndex].parts.map((part, pi) => (
                                <span key={pi} style={part.accent ? { color: part.color } : {}}>{part.text}</span>
                            ))}
                        </h1>
                        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', margin: '12px 0 0', fontWeight: '500', textShadow: '0 1px 8px rgba(0,0,0,0.2)', animation: 'heroSubIn 0.9s 0.1s ease both' }}>
                            {SLIDES[slideIndex].sub}
                        </p>
                    </div>

                    {/* Search — inline under subtitle, never wraps */}
                    <div style={{ position: 'relative', width: 'clamp(260px, 40%, 400px)', marginTop: '24px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder="Search events, locations..."
                            style={{ width: '100%', height: '48px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', paddingLeft: '44px', paddingRight: searchQuery ? '40px' : '16px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#0f172a', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                        />
                        {searchQuery && (
                            <button onClick={() => {
                                setSearchQuery('');
                                setSuggestions([]);
                                setShowSuggestions(false);
                            }} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1 }}>✕</button>
                        )}
                        {showSuggestions && suggestions.length > 0 && (
                            <ul style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', listStyle: 'none', padding: '8px 0', margin: '8px 0 0 0', zIndex: 100, maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(226, 232, 240, 0.8)'
                            }}>
                                {suggestions.map((s, idx) => (
                                    <li key={idx} onClick={() => { setSearchQuery(s.name || s.display_name.split(',')[0]); setShowSuggestions(false); }} style={{ padding: '10px 16px', cursor: 'pointer', color: '#0f172a', fontSize: '14px', borderBottom: idx < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <MapPin size={14} color="#3b82f6" style={{ flexShrink: 0 }} />
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>
                                            <div style={{ fontWeight: '600' }}>{s.name || s.display_name.split(',')[0]}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{s.display_name}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* ── CONTENT AREA ── */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px 80px' }}>

                {/* Filter bar + refresh */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '28px 0 32px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {filters.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setActiveFilter(f.key)}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '30px',
                                    border: '1.5px solid',
                                    borderColor: activeFilter === f.key ? '#0891b2' : '#ffffff',
                                    background: activeFilter === f.key ? 'linear-gradient(135deg, #0891b2 0%, #06b6d4 60%, #22d3ee 100%)' : '#ecfeff',
                                    color: activeFilter === f.key ? 'white' : '#0e7490',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center',
                                }}
                            >
                                {f.label}
                                {f.count !== undefined && (
                                    <span style={{
                                        background: activeFilter === f.key ? 'rgba(255,255,255,0.25)' : '#bae6fd',
                                        color: activeFilter === f.key ? '#ffffff' : '#0369a1',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        marginLeft: '8px',
                                        fontWeight: '800'
                                    }}>
                                        {f.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>
                        <RefreshCw size={12} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : {}} />
                        {isRefreshing ? 'Refreshing…' : `Updated ${lastRefreshed}`}
                    </div>
                </div>

                {/* Loading */}
                {isLoading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} tall={i <= 2} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Waves size={32} color="#94a3b8" />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
                            {searchQuery ? `No results for "${searchQuery}"` : 'No events yet'}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                            {searchQuery ? 'Try a different search term.' : 'Check back soon for upcoming competitions.'}
                        </p>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#0f172a', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

                        {/* LIVE SECTION */}
                        {showLive && (
                            <section ref={liveSectionRef}>
                                <SectionHeader icon={Radio} label="Live" count={liveEvents.length} color="#ef4444" scrollRef={liveRef} />
                                <div ref={liveRef} className="hide-scroll" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    {liveEvents.map(ev => <LiveCard key={ev.id} event={ev} navigate={navigate} />)}
                                </div>
                            </section>
                        )}

                        {/* UPCOMING SECTION */}
                        {showUpcoming && (
                            <section>
                                <SectionHeader icon={Zap} label="Upcoming Events" count={scheduledEvents.length} color="#0ea5e9" scrollRef={upcomingRef} />
                                <div ref={upcomingRef} className="hide-scroll" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    {scheduledEvents.map(ev => <UpcomingCard key={ev.id} event={ev} navigate={navigate} />)}
                                </div>
                            </section>
                        )}

                        {/* COMPLETED SECTION */}
                        {showCompleted && (
                            <section>
                                <SectionHeader icon={Trophy} label="Completed Events" count={completedEvents.length} color="#10b981" scrollRef={completedRef} />
                                <div ref={completedRef} className="hide-scroll" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    {completedEvents.map(ev => <CompletedCard key={ev.id} event={ev} navigate={navigate} />)}
                                </div>
                            </section>
                        )}

                        {!showLive && !showUpcoming && !showCompleted && (
                            <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '500' }}>No events in this category right now.</p>
                                <button onClick={() => setActiveFilter('all')} style={{ marginTop: '14px', padding: '10px 24px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#0f172a', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                                    Show All
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── FOOTER ── */}
            <footer style={{
                background: '#e2f2f3de',
                padding: '32px 40px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
                borderTop: '1px solid rgba(255,255,255,0.15)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* silver shimmer overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.07) 50%, transparent 65%)', pointerEvents: 'none' }} />
                <div className="lvp-brand-logo" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }} onClick={() => navigate('/viewer')}>
                    <img src={logo} alt="Logo" style={{ height: '40px', width: 'auto' }} />
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, fontWeight: '500', position: 'relative' }}>
                    © {new Date().getFullYear()} Aquatic X Sports. All Rights Reserved · Developed by{' '}
                    <a href="https://rpntechworld.com" style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: '700' }}>RPN Tech World</a>
                </p>
            </footer>
            <div style={{ position: 'fixed', bottom: 10, right: 10, background: 'rgba(0,0,0,0.85)', color: 'white', padding: '12px 18px', borderRadius: '8px', zIndex: 99999, fontSize: '12px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
                <div style={{ fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>🛠️ AGENT DEBUG INFO</div>
                <div>API: {API_BASE}</div>
                <div style={{ color: debugError ? '#ef4444' : '#6b7280', marginTop: '4px' }}>Error: {debugError || 'None'}</div>
            </div>
        </div>
    );
};

export default ViewerPage;
