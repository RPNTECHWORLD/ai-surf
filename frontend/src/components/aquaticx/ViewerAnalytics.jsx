import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Loader2, Signal, Activity, Monitor, Globe, TrendingUp, Wifi } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Global cache for instant tab-switching
let globalAnalyticsCache = {
    realtime: { total_viewers: 0, viewer_page: 0, event_page: 0 },
    history: [],
    daily: { today: 0, yesterday: 0, peak: 0, yesterday_peak: 0, locations: [] },
    hasLoaded: false
};

const ViewerAnalytics = () => {
    const [realtime, setRealtime] = useState(globalAnalyticsCache.realtime);
    const [history, setHistory] = useState(globalAnalyticsCache.history);
    const [daily, setDaily] = useState(globalAnalyticsCache.daily);
    const [loading, setLoading] = useState(!globalAnalyticsCache.hasLoaded);
    const [fetchingHistory, setFetchingHistory] = useState(false);
    const [tooltip, setTooltip] = useState(null);
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const filter = selectedDate === todayStr ? 'last_hour' : 'custom_date';

    const fetchHistory = React.useCallback(async () => {
        setFetchingHistory(true);
        try {
            const res = await axios.get(`${API_BASE}/analytics/history?filter=${filter}&date=${selectedDate}`);
            setHistory(res.data || []);
            globalAnalyticsCache.history = res.data || [];
        } catch (err) {
        } finally {
            setFetchingHistory(false);
        }
    }, [filter, selectedDate]);

    const fetchDaily = React.useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/analytics/daily?date=${selectedDate}`);
            setDaily(res.data);
            globalAnalyticsCache.daily = res.data;
        } catch (err) { }
    }, [selectedDate]);

    useEffect(() => {
        axios.get(`${API_BASE}/analytics/realtime`).then(r => {
            setRealtime(r.data);
            globalAnalyticsCache.realtime = r.data;
            globalAnalyticsCache.hasLoaded = true;
            setLoading(false);
        }).catch(() => setLoading(false));

        fetchHistory();
        fetchDaily();

        // SSE: instant push from server
        const es = new EventSource(`${API_BASE}/analytics/stream`);
        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                setRealtime(prev => {
                    globalAnalyticsCache.realtime = data;
                    // Auto-refresh graph if the live count actually changed
                    if (prev.total_viewers !== data.total_viewers) {
                        fetchHistory();
                    }
                    return data;
                });
                if (data.daily) {
                    setDaily(prev => {
                        const newDaily = selectedDate === todayStr ? data.daily : prev;
                        globalAnalyticsCache.daily = newDaily;
                        return newDaily;
                    });
                }
            } catch (_) { }
        };
        es.onerror = () => { };

        const histInterval = setInterval(fetchHistory, 60000);
        const dailyInterval = setInterval(fetchDaily, 30000);
        return () => { es.close(); clearInterval(histInterval); clearInterval(dailyInterval); };
    }, [fetchHistory, fetchDaily, selectedDate, todayStr]);

    // For today, rolling 60-minute window with live reading appended.
    // For past dates, show full day history.
    const extendedHistory = React.useMemo(() => {
        if (!history || history.length === 0) return [];

        const isToday = selectedDate === todayStr;

        if (!isToday) {
            // For past dates, just return the data (it's already 24-hours grouped by minute)
            return history;
        }

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Filter history to the rolling last-hour window
        const withinHour = history.filter(h => {
            const ts = h.timestamp || '';
            const d = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
            return d >= oneHourAgo;
        });

        // Always append the current live reading as the rightmost point
        return [...withinHour, {
            id: 'live-now',
            timestamp: now.toISOString(),
            total_count: realtime?.total_viewers || 0,
            viewer_page_count: realtime?.viewer_page || 0,
            event_page_count: realtime?.event_page || 0
        }];
    }, [history, realtime, selectedDate, todayStr]);

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: '#3b82f6' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: '600' }}>Loading Analytics...</p>
            </div>
        );
    }

    // Graph calculations

    const graphHeight = 160;
    // Use a fixed large viewBox width so SVG coords are stable; displayed at 100% via preserveAspectRatio
    const SVG_WIDTH = 1000;

    const maxRaw = Math.max(...extendedHistory.map(h => h.total_count || 0), 0);
    const maxCount = maxRaw <= 4 ? 4 : maxRaw;
    const yLabels = [maxCount, maxCount * 0.75, maxCount * 0.5, maxCount * 0.25, 0].map(v => Math.round(v));

    const getY = (val) => {
        if (maxCount === 0) return graphHeight;
        return graphHeight - (val / maxCount) * graphHeight;
    };

    const getX = (i, len) => {
        if (len <= 1) return SVG_WIDTH / 2;
        const pad = 8;
        return pad + ((SVG_WIDTH - pad * 2) * i) / (len - 1);
    };

    const getPathData = (key) => {
        if (extendedHistory.length === 0) return '';
        const pts = extendedHistory.map((h, i) => [getX(i, extendedHistory.length), getY(h[key] || 0)]);
        let d = `M ${pts[0][0]} ${pts[0][1]}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const curr = pts[i];
            const next = pts[i + 1];
            const cp1x = curr[0] + (next[0] - curr[0]) / 2;
            const cp2x = curr[0] + (next[0] - curr[0]) / 2;
            d += ` C ${cp1x} ${curr[1]}, ${cp2x} ${next[1]}, ${next[0]} ${next[1]}`;
        }
        return d;
    };

    const dViewer = getPathData('viewer_page_count');
    const dEvent = getPathData('event_page_count');

    const areaViewer = dViewer ? `${dViewer} L ${getX(extendedHistory.length - 1, extendedHistory.length)} ${graphHeight} L ${getX(0, extendedHistory.length)} ${graphHeight} Z` : '';
    const areaEvent = dEvent ? `${dEvent} L ${getX(extendedHistory.length - 1, extendedHistory.length)} ${graphHeight} L ${getX(0, extendedHistory.length)} Z` : '';

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-dark)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                        Viewer Analytics
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Real-time insights on platform engagement and viewer distribution.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>Select Date:</span>
                    <input
                        type="date"
                        value={selectedDate}
                        max={todayStr}
                        min={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{
                            fontSize: '14px', padding: '8px 16px', borderRadius: '10px',
                            border: '1px solid var(--border-dim)', background: 'var(--surface-light)',
                            color: 'var(--text-dark)', outline: 'none', cursor: 'pointer',
                            fontWeight: '700', fontFamily: 'inherit', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    />
                </div>
            </div>

            {/* Live Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Total */}
                <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '16px 20px', borderRadius: '16px', color: 'white', boxShadow: '0 8px 32px rgba(59,130,246,0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>
                            <Wifi size={18} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', opacity: 0.85 }}>Live Viewers</span>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: '900', lineHeight: 1 }}>{realtime.total_viewers}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '11px', fontWeight: '700', opacity: 0.9 }}>
                        <Activity size={12} className="animate-pulse" />
                        Real-time Tracking Active
                    </div>
                </div>

                {/* Viewer Page */}
                <div style={{ background: 'var(--surface-light)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border-dim)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ background: '#f0fdf4', color: '#10b981', padding: '8px', borderRadius: '10px' }}>
                            <Monitor size={18} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Viewer Page</span>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-dark)', lineHeight: 1 }}>{realtime.viewer_page || 0}</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px', fontWeight: '600' }}>Users on the results landing page</p>
                </div>

                {/* Event Detail */}
                <div style={{ background: 'var(--surface-light)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border-dim)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ background: '#faf5ff', color: '#8b5cf6', padding: '8px', borderRadius: '10px' }}>
                            <Globe size={18} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Heat Scoring Page</span>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-dark)', lineHeight: 1 }}>{realtime.event_page || 0}</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px', fontWeight: '600' }}>Users viewing specific event pages</p>
                </div>
            </div>

            {/* Engagement Graph */}
            <div style={{ background: 'var(--surface-light)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-dim)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '24px', position: 'relative' }}>
                <style>{`
                    @keyframes drawLine {
                        from { stroke-dashoffset: 30000; }
                        to { stroke-dashoffset: 0; }
                    }
                    @keyframes revealArea {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes revealNode {
                        from { opacity: 0; transform: scale(0); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes revealFromLeft {
                        from { width: 0; }
                        to { width: ${SVG_WIDTH}px; }
                    }
                `}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '4px' }}>{selectedDate === todayStr ? 'Live Analytics' : 'Historical Analytics'}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{selectedDate === todayStr ? 'Filtered traffic snapshots.' : 'Full day traffic curve.'}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {selectedDate === todayStr && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                                <Signal size={14} style={{ color: '#3b82f6' }} />
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e40af', letterSpacing: '0.3px' }}>Live Activity (Last Hour)</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-light)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                            <TrendingUp size={14} style={{ color: 'var(--text-secondary)' }} />
                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-dark)' }}>
                                Peak: {maxCount}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    {fetchingHistory && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 100,
                            background: 'rgba(255,255,255,0.7)',
                            backdropFilter: 'blur(3px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <Loader2 size={32} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e40af', letterSpacing: '0.5px' }}>FETCHING DATA...</span>
                            </div>
                        </div>
                    )}

                    {history.length > 0 ? (
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                            {/* Y Axis */}
                            <div style={{ position: 'relative', height: `${graphHeight}px`, width: '24px', flexShrink: 0 }}>
                                {yLabels.map((v, i) => {
                                    const yPos = i * (graphHeight / (yLabels.length - 1));
                                    return (
                                        <span key={i} style={{
                                            position: 'absolute',
                                            top: `${yPos}px`,
                                            right: 0,
                                            transform: 'translateY(-50%)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            color: 'var(--text-muted)',
                                            textAlign: 'right',
                                            lineHeight: 1
                                        }}>{v}</span>
                                    );
                                })}
                            </div>

                            {/* Scrollable graph area */}
                            <div style={{ flex: 1, position: 'relative', paddingBottom: '48px' }}>
                                <div style={{ width: '100%', height: '190px', position: 'relative' }}>
                                    {/* Background Grid Lines */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${graphHeight}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0', pointerEvents: 'none' }}>
                                        {yLabels.map((_, i) => (
                                            <div key={i} style={{ borderTop: i === yLabels.length - 1 ? '1.5px solid var(--border-hover)' : '1px dashed var(--border-dim)', width: '100%' }} />
                                        ))}
                                    </div>

                                    {/* SVG Paths */}
                                    <svg
                                        key={`${filter}-${history.length}`}
                                        width="100%"
                                        height={graphHeight}
                                        viewBox={`0 0 ${SVG_WIDTH} ${graphHeight}`}
                                        preserveAspectRatio="none"
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            overflow: 'visible',
                                            zIndex: 5
                                        }}
                                    >
                                        <defs>
                                            <linearGradient id="fillEvent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                                            </linearGradient>
                                            <linearGradient id="fillViewer" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                                            </linearGradient>
                                            <clipPath id="syncClip">
                                                <rect x="0" y="0" width="0" height={graphHeight} style={{ animation: 'revealFromLeft 1s linear forwards' }} />
                                            </clipPath>
                                        </defs>

                                        {/* Area Shadow Fills - Synchronized reveal */}
                                        <path
                                            d={areaEvent}
                                            fill="url(#fillEvent)"
                                            clipPath="url(#syncClip)"
                                        />
                                        <path
                                            d={areaViewer}
                                            fill="url(#fillViewer)"
                                            clipPath="url(#syncClip)"
                                        />

                                        <path
                                            d={dEvent}
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth="2.5"
                                            vectorEffect="non-scaling-stroke"
                                            strokeLinejoin="round"
                                            clipPath="url(#syncClip)"
                                        />
                                        {/* Viewer Page Line (Red) - Synchronized reveal */}
                                        <path
                                            d={dViewer}
                                            fill="none"
                                            stroke="#ef4444"
                                            strokeWidth="2.5"
                                            vectorEffect="non-scaling-stroke"
                                            strokeLinejoin="round"
                                            clipPath="url(#syncClip)"
                                        />
                                    </svg>

                                    {/* Interaction + Dot Layer */}
                                    <div
                                        key={`interaction-${history.length}`}
                                        style={{
                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        {extendedHistory.map((h, i) => {
                                            const x = getX(i, extendedHistory.length);

                                            // Format timestamp for tooltip
                                            const rawTs = h.timestamp || '';
                                            const dateObj = new Date(
                                                rawTs.includes('T') ? rawTs : rawTs.replace(' ', 'T') + 'Z'
                                            );
                                            const tOpt = filter === 'last_7_days'
                                                ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }
                                                : { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' };
                                            const time = dateObj.toLocaleString('en-US', tOpt);

                                            // Hover hit-area width in %
                                            const binWidth = extendedHistory.length > 1
                                                ? (getX(1, extendedHistory.length) - getX(0, extendedHistory.length))
                                                : SVG_WIDTH;
                                            const xPct = (x / SVG_WIDTH) * 100;

                                            // Show a dot whenever a count changed vs previous snapshot, or at first/last
                                            const prevH = i > 0 ? extendedHistory[i - 1] : null;
                                            const isFirst = i === 0;
                                            const isLast = i === extendedHistory.length - 1;
                                            const changed = prevH
                                                ? (h.viewer_page_count !== prevH.viewer_page_count ||
                                                    h.event_page_count !== prevH.event_page_count)
                                                : false;
                                            const showDot = isFirst || isLast || changed;

                                            return (
                                                <div
                                                    key={h.id || i}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${xPct}%`,
                                                        transform: 'translateX(-50%)',
                                                        width: `${(binWidth / SVG_WIDTH) * 100}%`,
                                                        height: '100%',
                                                        cursor: showDot ? 'crosshair' : 'default',
                                                        // All dots are hoverable; non-dot zones are still transparent
                                                        pointerEvents: showDot ? 'auto' : 'none',
                                                        zIndex: 10
                                                    }}
                                                    onMouseEnter={() => setTooltip({ h, time, i })}
                                                    onMouseLeave={() => setTooltip(null)}
                                                >
                                                    {/* Persistent dot at every change / boundary point */}
                                                    {showDot && (
                                                        <>
                                                            <div style={{
                                                                position: 'absolute', left: '50%',
                                                                top: getY(h.event_page_count || 0),
                                                                width: tooltip?.i === i ? '10px' : '6px',
                                                                height: tooltip?.i === i ? '10px' : '6px',
                                                                borderRadius: '50%', background: '#3b82f6',
                                                                border: tooltip?.i === i ? '2px solid white' : '1.5px solid white',
                                                                transform: 'translate(-50%, -50%)',
                                                                pointerEvents: 'none',
                                                                boxShadow: tooltip?.i === i ? '0 1px 4px rgba(59,130,246,0.5)' : '0 1px 2px rgba(0,0,0,0.2)',
                                                                transition: 'width 0.15s, height 0.15s',
                                                                zIndex: 6
                                                            }} />
                                                            <div style={{
                                                                position: 'absolute', left: '50%',
                                                                top: getY(h.viewer_page_count || 0),
                                                                width: tooltip?.i === i ? '10px' : '6px',
                                                                height: tooltip?.i === i ? '10px' : '6px',
                                                                borderRadius: '50%', background: '#ef4444',
                                                                border: tooltip?.i === i ? '2px solid white' : '1.5px solid white',
                                                                transform: 'translate(-50%, -50%)',
                                                                pointerEvents: 'none',
                                                                boxShadow: tooltip?.i === i ? '0 1px 4px rgba(239,68,68,0.5)' : '0 1px 2px rgba(0,0,0,0.2)',
                                                                transition: 'width 0.15s, height 0.15s',
                                                                zIndex: 6
                                                            }} />
                                                        </>
                                                    )}

                                                    {/* Tooltip shown on hover */}
                                                    {tooltip?.i === i && (
                                                        <>
                                                            {/* Vertical guideline */}
                                                            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', borderLeft: '1px dashed var(--text-muted)', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 1 }} />

                                                            {/* Tooltip card — positioned so it never overflows left or right */}
                                                            <div style={{
                                                                position: 'absolute',
                                                                bottom: 'calc(100% + 8px)',
                                                                left: '50%',
                                                                // Shift left/center/right depending on position along the graph
                                                                transform: i === 0
                                                                    ? 'translateX(-8px)'          // leftmost: anchor to left of dot
                                                                    : i === extendedHistory.length - 1
                                                                        ? 'translateX(calc(-100% + 8px))' // rightmost: anchor to right of dot
                                                                        : 'translateX(-50%)',            // middle: centered on dot
                                                                background: 'var(--surface-light)',
                                                                border: '1px solid var(--border-dim)',
                                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08)',
                                                                borderRadius: '10px',
                                                                padding: '14px 16px',
                                                                width: '220px',
                                                                zIndex: 9999,
                                                                pointerEvents: 'none',
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border-dim)' }}>
                                                                    <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: '800', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>🕐 {time}</span>
                                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Total <span style={{ color: 'var(--text-dark)', fontWeight: '800' }}>{h.total_count || 0}</span></span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                                                                    <div style={{ width: '10px', height: '4px', borderRadius: '2px', background: '#ef4444', flexShrink: 0 }} />
                                                                    <span style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: '600', flex: 1 }}>Viewer Page</span>
                                                                    <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: '800' }}>{h.viewer_page_count || 0}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ width: '10px', height: '4px', borderRadius: '2px', background: '#3b82f6', flexShrink: 0 }} />
                                                                    <span style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: '600', flex: 1 }}>Heat Scoring</span>
                                                                    <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: '800' }}>{h.event_page_count || 0}</span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: `${graphHeight}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-light)', borderRadius: '16px', gap: '12px' }}>
                            {fetchingHistory ? null : (
                                <>
                                    <Signal size={36} style={{ color: 'var(--border-hover)' }} />
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>
                                        Waiting for traffic data — snapshots are recorded every minute.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-dim)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '4px', borderRadius: '2px', background: '#ef4444' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700' }}>Viewer Page</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '4px', borderRadius: '2px', background: '#3b82f6' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700' }}>Heat Scoring Page</span>
                    </div>
                </div>
            </div>

            {/* 2-column: Daily Visitors + Location Pie */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>

                {/* Peak Viewers Today */}
                <div style={{ background: 'var(--surface-light)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-dim)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    {(() => {
                        const isToday = selectedDate === todayStr;
                        const currentPeak = isToday ? Math.max(daily.peak || 0, realtime.total_viewers || 0) : daily.peak || 0;
                        return (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '8px', borderRadius: '10px' }}>
                                            <Users size={18} />
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>Peak Simultaneous Viewers</span>
                                    </div>
                                    {/* The date picker was moved to the top header */}
                                </div>
                                <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-dark)', lineHeight: 1 }}>{currentPeak}</div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Total Daily Visitors</span>
                                    <span style={{ fontSize: '11px', background: 'var(--bg-light)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)', border: '1px solid var(--border-dim)', fontWeight: '600' }}>
                                        {daily.today} unique
                                    </span>
                                </div>

                                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {typeof daily.yesterday_peak === 'number' ? (
                                        <>
                                            <span style={{
                                                background: currentPeak >= daily.yesterday_peak ? '#f0fdf4' : '#fef2f2',
                                                color: currentPeak >= daily.yesterday_peak ? '#15803d' : '#dc2626',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '13px',
                                                fontWeight: '800'
                                            }}>
                                                {currentPeak >= daily.yesterday_peak ? '▲' : '▼'}
                                                {' '}{daily.yesterday_peak === 0 ? (currentPeak > 0 ? 100 : 0) : Math.abs(Math.round(((currentPeak - daily.yesterday_peak) / daily.yesterday_peak) * 100))}%
                                            </span>
                                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>vs yesterday ({daily.yesterday_peak})</span>
                                        </>
                                    ) : null}
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-dim)', marginTop: '20px', paddingTop: '16px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                    Shows the highest number of simultaneous viewers recorded today, compared to yesterday's peak.
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* Visitors by Location — SVG Donut Pie Chart */}
                <div style={{ background: 'var(--surface-light)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-dim)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ background: '#faf5ff', color: '#8b5cf6', padding: '8px', borderRadius: '10px' }}>
                            <Globe size={18} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                            {selectedDate === todayStr && realtime.live_locations?.length > 0 ? 'Live Viewers by Location' : 'Daily Visitors by Location'}
                        </span>
                    </div>
                    {((selectedDate === todayStr && realtime.live_locations?.length > 0) || daily.locations.length > 0) ? (() => {
                        const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
                        const cx = 60, cy = 60, r = 50, inner = 30;

                        // Prioritize live locations for today, fallback to daily if necessary
                        const isLive = selectedDate === todayStr && realtime.live_locations?.length > 0;
                        const displayLocs = isLive ? realtime.live_locations : daily.locations;
                        const totalCount = isLive ? realtime.total_viewers : daily.locations.reduce((s, l) => s + l.count, 0);
                        const isSingle = displayLocs.length === 1;

                        let cumAngle = -Math.PI / 2;
                        const slices = displayLocs.map((loc, i) => {
                            const color = PIE_COLORS[i % PIE_COLORS.length];
                            if (isSingle) {
                                // Draw full donut ring for single entry
                                return { color, loc, full: true };
                            }
                            const angle = (loc.pct / 100) * 2 * Math.PI;
                            const startAngle = cumAngle;
                            cumAngle += angle;
                            const endAngle = cumAngle;
                            const x1 = cx + r * Math.cos(startAngle);
                            const y1 = cy + r * Math.sin(startAngle);
                            const x2 = cx + r * Math.cos(endAngle);
                            const y2 = cy + r * Math.sin(endAngle);
                            const xi1 = cx + inner * Math.cos(startAngle);
                            const yi1 = cy + inner * Math.sin(startAngle);
                            const xi2 = cx + inner * Math.cos(endAngle);
                            const yi2 = cy + inner * Math.sin(endAngle);
                            const large = angle > Math.PI ? 1 : 0;
                            const d = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`;
                            return { d, color, loc, full: false };
                        });

                        return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                {/* Donut SVG */}
                                <svg width="120" height="120" style={{ flexShrink: 0, display: 'block' }}>
                                    {isSingle ? (
                                        <>
                                            {/* Outer circle */}
                                            <circle cx={cx} cy={cy} r={r} fill={slices[0].color} />
                                            {/* Inner hole */}
                                            <circle cx={cx} cy={cy} r={inner} fill="var(--surface-light)" />
                                        </>
                                    ) : (
                                        slices.map((s, i) => (
                                            <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="3">
                                                <title>{s.loc.label}: {s.loc.pct}%</title>
                                            </path>
                                        ))
                                    )}
                                    {/* Center label */}
                                    <text x={cx} y={cy - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-muted)">TOTAL</text>
                                    <text x={cx} y={cy + 10} textAnchor="middle" fontSize="18" fontWeight="900" fill="var(--text-dark)">{totalCount}</text>
                                </svg>

                                {/* Legend */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' }}>
                                    {displayLocs.map((loc, i) => (
                                        <div key={loc.city + loc.country_code} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '16px', height: '16px', borderRadius: '5px', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0, boxShadow: `0 2px 6px ${PIE_COLORS[i % PIE_COLORS.length]}55` }} />
                                            <span style={{ flex: 1, fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{loc.label}</span>
                                            <span style={{ fontSize: '13px', fontWeight: '800', color: PIE_COLORS[i % PIE_COLORS.length], background: PIE_COLORS[i % PIE_COLORS.length] + '18', padding: '2px 9px', borderRadius: '20px' }}>
                                                {loc.pct}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })() : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                            <Globe size={40} style={{ opacity: 0.25, margin: '0 auto 14px', display: 'block' }} />
                            <p style={{ fontSize: '14px', fontWeight: '600' }}>Location data will appear once viewers open the site.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewerAnalytics;
