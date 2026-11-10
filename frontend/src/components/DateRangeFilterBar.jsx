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
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCustomStart(todayIso);
    setCustomEnd(todayIso);
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
  const isNotToday = activePreset !== 'today' || (startDate && startDate !== todayIso) || (endDate && endDate !== todayIso);

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
        boxSizing: 'border-box',
        height: '40px',
        fontFamily: "'Outfit', sans-serif",
        ...style
      }}
    >
      <style>{`
        .date-range-filter-container {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          box-sizing: border-box;
        }
        .drfb-presets-row {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }
        .drfb-divider {
          width: 1px;
          height: 22px;
          background: #CBD5E1;
          margin: 0 2px;
          flex-shrink: 0;
        }
        .drfb-custom-box {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 8px;
          padding: 0 8px;
          height: 32px;
          box-sizing: border-box;
          flex-shrink: 0;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .drfb-date-group {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-shrink: 0;
        }
        .drfb-custom-box input[type="date"] {
          border-radius: 6px;
          background: #FFFFFF;
          font-weight: 700;
          font-size: 11.5px;
          padding: 0 5px;
          width: 114px;
          height: 24px;
          box-sizing: border-box;
          cursor: pointer;
          outline: none;
          font-family: 'Outfit', sans-serif;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .date-range-filter-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            padding: 6px !important;
            gap: 6px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            border-radius: 10px !important;
          }
          .drfb-presets-row {
            display: flex !important;
            width: 100% !important;
            gap: 4px !important;
            box-sizing: border-box !important;
          }
          .drfb-presets-row > button {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            padding: 0 4px !important;
            font-size: 11px !important;
            height: 30px !important;
            justify-content: center !important;
            text-align: center !important;
            white-space: nowrap !important;
            box-sizing: border-box !important;
            border-radius: 6px !important;
          }
          .drfb-divider {
            display: none !important;
          }
          .drfb-separator {
            display: none !important;
          }
          .drfb-custom-box {
            width: 100% !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 6px !important;
            padding: 4px 8px !important;
            min-width: 0 !important;
            height: 34px !important;
            border-radius: 8px !important;
            box-sizing: border-box !important;
          }
          .drfb-date-group {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            flex: 1 1 0 !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .drfb-date-group span {
            font-size: 10.5px !important;
            font-weight: 700 !important;
            flex-shrink: 0 !important;
          }
          .drfb-custom-box input[type="date"] {
            width: 100% !important;
            min-width: 0 !important;
            font-size: 11px !important;
            padding: 0 4px !important;
            height: 24px !important;
            border-radius: 4px !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* Presets Row */}
      <div className="drfb-presets-row">
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

        {/* All Option on mobile shares the presets row */}
        {allowAll && (
          <button
            type="button"
            className="drfb-all-btn"
            style={btnStyle(activePreset === 'all')}
            onClick={() => handleSelectPreset('all')}
            title="Show all records without date restrictions"
          >
            All
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="drfb-divider" />

      {/* Custom Range: Clean From & To Calendar pickers with permanent fixed dimensions */}
      <div
        className="drfb-custom-box"
        style={{
          background: isCustomActive ? '#F0FDFA' : '#FFFFFF',
          border: isCustomActive ? '1.5px solid #0D9488' : '1.5px solid #CBD5E1',
          boxShadow: isCustomActive ? '0 0 0 2px rgba(13, 148, 136, 0.15)' : 'none'
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
        <div className="drfb-date-group">
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
              color: isCustomActive ? '#0F766E' : '#1E293B'
            }}
          />
        </div>

        <span className="drfb-separator" style={{ color: '#94A3B8', fontWeight: 700, fontSize: '11px', userSelect: 'none', flexShrink: 0 }}>to</span>

        {/* To Date Input with visible field */}
        <div className="drfb-date-group">
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
              color: isCustomActive ? '#0F766E' : '#1E293B'
            }}
          />
        </div>

        {/* Reset button */}
        <button
          type="button"
          onClick={isNotToday ? handleReset : undefined}
          disabled={!isNotToday}
          tabIndex={isNotToday ? 0 : -1}
          style={{
            background: isNotToday ? '#FEE2E2' : '#F1F5F9',
            border: isNotToday ? '1px solid #FCA5A5' : '1px solid #CBD5E1',
            borderRadius: '6px',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isNotToday ? 'pointer' : 'default',
            color: isNotToday ? '#DC2626' : '#64748B',
            fontSize: '11px',
            fontWeight: 800,
            marginLeft: '2px',
            boxSizing: 'border-box',
            flexShrink: 0,
            visibility: isNotToday ? 'visible' : 'hidden',
            opacity: isNotToday ? 1 : 0,
            transition: 'opacity 0.15s ease'
          }}
          title={isNotToday ? "Reset date filter back to Today" : ""}
          onMouseEnter={(e) => {
            if (isNotToday) {
              e.currentTarget.style.background = '#EF4444';
              e.currentTarget.style.color = '#FFFFFF';
            }
          }}
          onMouseLeave={(e) => {
            if (isNotToday) {
              e.currentTarget.style.background = '#FEE2E2';
              e.currentTarget.style.color = '#DC2626';
            }
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
