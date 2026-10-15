import React, { useState, useEffect } from 'react';

// Helper functions for ISO date calculations (YYYY-MM-DD)
export const getIsoDate = (offset = 0) => {
  const d = new Date();
  if (offset !== 0) d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Modern, cohesive Date Range Filter Bar:
 * - Quick Presets: Yesterday, Today, Tomorrow
 * - Custom Date Range: From & To inputs with distinct, clear fields and calendar pickers
 * - All option
 * - STRICT zero-layout-shift: Dimensions never change when switching presets or dates
 */
export default function DateRangeFilterBar({
  startDate = '',
  endDate = '',
  preset = 'today', // 'yesterday' | 'today' | 'tomorrow' | 'custom' | 'all'
  onChange,
  allowAll = true,
  label = 'Date Filter',
  style = {}
}) {
  const yestIso = getIsoDate(-1);
  const todayIso = getIsoDate(0);
  const tomIso = getIsoDate(1);

  // Internal state for custom From/To inputs
  const [customStart, setCustomStart] = useState(startDate || todayIso);
  const [customEnd, setCustomEnd] = useState(endDate || todayIso);

  useEffect(() => {
    if (startDate) setCustomStart(startDate);
    if (endDate) setCustomEnd(endDate);
  }, [startDate, endDate]);

  const activePreset = preset || (() => {
    if (!startDate && !endDate) return 'all';
    if (startDate === yestIso && endDate === yestIso) return 'yesterday';
    if (startDate === todayIso && endDate === todayIso) return 'today';
    if (startDate === tomIso && endDate === tomIso) return 'tomorrow';
    return 'custom';
  })();

  const handleSelectPreset = (p) => {
    if (p === 'yesterday') {
      onChange({ startDate: yestIso, endDate: yestIso, preset: 'yesterday' });
    } else if (p === 'today') {
      onChange({ startDate: todayIso, endDate: todayIso, preset: 'today' });
    } else if (p === 'tomorrow') {
      onChange({ startDate: tomIso, endDate: tomIso, preset: 'tomorrow' });
    } else if (p === 'all') {
      onChange({ startDate: '', endDate: '', preset: 'all' });
    }
  };

  const handleCustomStartChange = (val) => {
    setCustomStart(val);
    const end = customEnd && customEnd >= val ? customEnd : val;
    setCustomEnd(end);
    onChange({ startDate: val, endDate: end, preset: 'custom' });
  };

  const handleCustomEndChange = (val) => {
    setCustomEnd(val);
    const start = customStart && customStart <= val ? customStart : val;
    setCustomStart(start);
    onChange({ startDate: start, endDate: val, preset: 'custom' });
  };

  const handleReset = (e) => {
    e.stopPropagation();
    onChange({ startDate: todayIso, endDate: todayIso, preset: 'today' });
  };

  // Fixed button styling: constant 1.5px border thickness & exact 32px height to avoid layout shifts
  const btnStyle = (isActive) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '32px',
    padding: '0 14px',
    borderRadius: '8px',
    border: isActive ? '1.5px solid #0D9488' : '1.5px solid transparent',
    background: isActive ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' : '#FFFFFF',
    color: isActive ? '#FFFFFF' : '#334155',
    fontWeight: 700,
    fontSize: '12px',
    fontFamily: "'Outfit', sans-serif",
    cursor: 'pointer',
    boxShadow: isActive ? '0 2px 8px rgba(13, 148, 136, 0.35)' : '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    boxSizing: 'border-box',
    flexShrink: 0
  });

  const isCustomActive = activePreset === 'custom';

  return (
    <div
      className="date-range-filter-container"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#F8FAFC',
        border: '1.5px solid #CBD5E1',
        borderRadius: '12px',
        padding: '3px 4px',
        gap: '5px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        flexWrap: 'nowrap',
        boxSizing: 'border-box',
        height: '40px',
        fontFamily: "'Outfit', sans-serif",
        ...style
      }}
    >
      {/* Yesterday */}
      <button
        type="button"
        style={btnStyle(activePreset === 'yesterday')}
        onClick={() => handleSelectPreset('yesterday')}
        title="Filter by yesterday"
      >
        Yesterday
      </button>

      {/* Today */}
      <button
        type="button"
        style={btnStyle(activePreset === 'today')}
        onClick={() => handleSelectPreset('today')}
        title="Filter by today"
      >
        Today
      </button>

      {/* Tomorrow */}
      <button
        type="button"
        style={btnStyle(activePreset === 'tomorrow')}
        onClick={() => handleSelectPreset('tomorrow')}
        title="Filter by tomorrow"
      >
        Tomorrow
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '22px', background: '#CBD5E1', margin: '0 2px', flexShrink: 0 }} />

      {/* Custom Range: Clean From & To Calendar pickers with permanent fixed dimensions */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: isCustomActive ? '#F0FDFA' : '#FFFFFF',
          border: isCustomActive ? '1.5px solid #0D9488' : '1.5px solid #CBD5E1',
          borderRadius: '8px',
          padding: '0 8px',
          height: '32px',
          boxSizing: 'border-box',
          boxShadow: isCustomActive ? '0 0 0 2px rgba(13, 148, 136, 0.15)' : 'none',
          transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
          flexShrink: 0
        }}
        title="Select custom Start Date and End Date"
      >
        {/* Calendar Icon */}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isCustomActive ? '#0D9488' : '#64748B'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>

        {/* From Date Input with visible field */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: isCustomActive ? '#0D9488' : '#64748B', fontWeight: 700, userSelect: 'none' }}>
            From:
          </span>
          <input
            type="date"
            value={startDate || ''}
            min="2020-01-01"
            max="2035-12-31"
            onChange={(e) => handleCustomStartChange(e.target.value)}
            onClick={(e) => {
              try { e.target.showPicker?.(); } catch (err) {}
            }}
            style={{
              border: isCustomActive ? '1px solid #99F6E4' : '1px solid #E2E8F0',
              borderRadius: '6px',
              background: '#FFFFFF',
              color: isCustomActive ? '#0F766E' : '#1E293B',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '0 5px',
              width: '118px',
              height: '24px',
              boxSizing: 'border-box',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: "'Outfit', sans-serif",
              flexShrink: 0
            }}
          />
        </div>

        <span style={{ color: '#94A3B8', fontWeight: 700, fontSize: '11px', userSelect: 'none', flexShrink: 0 }}>to</span>

        {/* To Date Input with visible field */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: isCustomActive ? '#0D9488' : '#64748B', fontWeight: 700, userSelect: 'none' }}>
            To:
          </span>
          <input
            type="date"
            value={endDate || ''}
            min="2020-01-01"
            max="2035-12-31"
            onChange={(e) => handleCustomEndChange(e.target.value)}
            onClick={(e) => {
              try { e.target.showPicker?.(); } catch (err) {}
            }}
            style={{
              border: isCustomActive ? '1px solid #99F6E4' : '1px solid #E2E8F0',
              borderRadius: '6px',
              background: '#FFFFFF',
              color: isCustomActive ? '#0F766E' : '#1E293B',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '0 5px',
              width: '118px',
              height: '24px',
              boxSizing: 'border-box',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: "'Outfit', sans-serif",
              flexShrink: 0
            }}
          />
        </div>

        {/* Reset button: ALWAYS occupies fixed 20px slot so the container width NEVER shifts */}
        <button
          type="button"
          onClick={isCustomActive ? handleReset : undefined}
          disabled={!isCustomActive}
          tabIndex={isCustomActive ? 0 : -1}
          style={{
            background: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isCustomActive ? 'pointer' : 'default',
            color: '#64748B',
            fontSize: '11px',
            fontWeight: 800,
            marginLeft: '2px',
            boxSizing: 'border-box',
            flexShrink: 0,
            visibility: isCustomActive ? 'visible' : 'hidden',
            opacity: isCustomActive ? 1 : 0,
            transition: 'opacity 0.15s ease'
          }}
          title={isCustomActive ? "Reset date filter back to Today" : ""}
          onMouseEnter={(e) => {
            if (isCustomActive) {
              e.currentTarget.style.background = '#FEE2E2';
              e.currentTarget.style.color = '#EF4444';
            }
          }}
          onMouseLeave={(e) => {
            if (isCustomActive) {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.color = '#64748B';
            }
          }}
        >
          ✕
        </button>
      </div>

      {/* Divider */}
      {allowAll && <div style={{ width: '1px', height: '22px', background: '#CBD5E1', margin: '0 2px', flexShrink: 0 }} />}

      {/* All Option */}
      {allowAll && (
        <button
          type="button"
          style={btnStyle(activePreset === 'all')}
          onClick={() => handleSelectPreset('all')}
          title="Show all records without date restrictions"
        >
          All
        </button>
      )}
    </div>
  );
}
