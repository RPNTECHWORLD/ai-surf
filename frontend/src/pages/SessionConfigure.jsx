import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export const normalizeTimeString = (timeStr) => {
  if (!timeStr) return '';
  const clean = String(timeStr).trim();
  const startPart = clean.includes(' - ') ? clean.split(' - ')[0].trim() : clean;
  const match = startPart.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return startPart.toLowerCase();

  let [_, hStr, mStr, meridiem] = match;
  let hours = parseInt(hStr, 10);
  let minutes = parseInt(mStr, 10);

  if (isNaN(hours) || isNaN(minutes)) return startPart.toLowerCase();

  if (meridiem) {
    const med = meridiem.toUpperCase();
    if (med === 'PM' && hours < 12) hours += 12;
    if (med === 'AM' && hours === 12) hours = 0;
  }

  const h24 = String(hours).padStart(2, '0');
  const m24 = String(minutes).padStart(2, '0');
  return `${h24}:${m24}`;
};

export const time24To12 = (time24Str) => {
  if (!time24Str) return '';
  const clean = String(time24Str).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return clean;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(h12).padStart(2, '0')}:${minutes} ${meridiem}`;
};

export const time12To24 = (time12Str) => {
  if (!time12Str) return '08:30';
  const norm = normalizeTimeString(time12Str);
  if (norm && /^\d{2}:\d{2}$/.test(norm)) {
    return norm;
  }
  return '08:30';
};

export const getNextAvailableSlotTime = (currentSlots) => {
  const existingNormalized = new Set(
    (currentSlots || []).map(s => normalizeTimeString(s.time)).filter(Boolean)
  );

  const candidateTimes = [
    "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
    "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
    "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM",
    "07:00 PM"
  ];

  for (const time of candidateTimes) {
    if (!existingNormalized.has(normalizeTimeString(time))) {
      return time;
    }
  }

  let totalMin = 8 * 60;
  while (totalMin < 22 * 60) {
    const h24 = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const med = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const timeStr = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${med}`;
    if (!existingNormalized.has(normalizeTimeString(timeStr))) {
      return timeStr;
    }
    totalMin += 15;
  }
  return "06:00 PM";
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultSlots = [
  { id: 1, time: "08:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true },
  { id: 2, time: "10:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], active: true },
  { id: 3, time: "11:30 AM", duration: "60", maxStudents: 6, days: ["Mon", "Tue", "Wed"], active: true },
  { id: 4, time: "01:00 PM", duration: "120", maxStudents: 4, days: ["Tue", "Thu", "Sat", "Sun"], active: true },
  { id: 5, time: "03:30 PM", duration: "90", maxStudents: 4, days: ["Fri", "Sat", "Sun"], active: false },
  { id: 6, time: "04:00 PM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], active: true },
];
const SessionConfigure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSource = searchParams.get('from');

  const [slots, setSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('session_slots');
      return saved ? JSON.parse(saved) : defaultSlots;
    } catch (e) { return defaultSlots; }
  });
  const [settings, setSettings] = useState({ defaultDuration: "90", maxStudents: "4", breakBetween: "30", cancellationWindow: "24" });
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const toggleDay = (sid, day) => setSlots(p => p.map(s => { if (s.id !== sid) return s; const h = s.days.includes(day); return { ...s, days: h ? s.days.filter(d => d !== day) : [...s.days, day] }; }));
  const updateSlot = (sid, f, v) => setSlots(p => p.map(s => s.id === sid ? { ...s, [f]: v } : s));
  const deleteSlot = (sid) => setSlots(p => p.filter(s => s.id !== sid));
  const addSlot = () => setSlots(p => [...p, { id: Date.now(), time: "09:00 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true }]);

  const inp = { border: "1.5px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px", background: "#F8FAFC", outline: "none", boxSizing: "border-box", fontSize: "14px", fontWeight: 600, color: "#0F172A", width: "100%", fontFamily: "inherit" };

  const handleSaveConfiguration = () => {
    setSaving(true);
    localStorage.setItem('session_slots', JSON.stringify(slots));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('session_slots_updated', { detail: slots }));
    setTimeout(() => {
      setSaving(false);
      setShowSuccessModal(true);
    }, 350);
  };

  return (
    <div className="sc-page-wrapper">
      <Sidebar />

      {/* Main Full-Screen Layout with generous top padding so nothing gets cut */}
      <main className="sc-main-content">
        {/* Header Bar */}
        <div className="sc-header-bar">
          <h1 className="sc-title">
            Session Configuration
          </h1>
          <p className="sc-subtitle">
            Set up your school's available session time slots and manage scheduling preferences.
          </p>
        </div>

        <div className="sc-vertical-layout">
          <div className="sc-card-slots">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                  Session Time Slots
                </h2>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "3px 0 0 0" }}>
                  Configure daily surf lesson schedules, max athlete capacity & operational weekdays
                </p>
              </div>
              <button onClick={addSlot} className="sc-btn-add-slot">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Time Slot
              </button>
            </div>

            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%", paddingBottom: "8px" }}>
              <div style={{ minWidth: "640px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 130px 120px 1fr 100px 48px", gap: "16px", paddingBottom: "12px", borderBottom: "1.5px solid #E2E8F0", marginBottom: "8px" }}>
                  {["TIME", "DURATION", "MAX STUDENTS", "AVAILABLE DAYS", "STATUS", "DELETE"].map(h => (
                    <span key={h} style={{ fontSize: "11px", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
                  ))}
                </div>

                {slots.map(slot => (
                  <div key={slot.id} style={{ display: "grid", gridTemplateColumns: "140px 130px 120px 1fr 100px 48px", gap: "16px", alignItems: "center", padding: "16px 0", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
                      <input
                        type="time"
                        value={time12To24(slot.time)}
                        onChange={e => {
                          if (e.target.value) {
                            updateSlot(slot.id, "time", time24To12(e.target.value));
                          }
                        }}
                        onClick={e => {
                          try {
                            if (typeof e.target.showPicker === 'function') {
                              e.target.showPicker();
                            }
                          } catch (err) { }
                        }}
                        style={{
                          ...inp,
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: "8px 10px",
                          fontSize: "14px",
                          color: "#0F172A",
                          backgroundColor: "#FFFFFF"
                        }}
                        title="Click to open clock picker"
                      />
                    </div>
                    <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
                      <input
                        type="number"
                        min="1"
                        max="600"
                        step="5"
                        list="sc-duration-presets"
                        value={slot.duration}
                        onChange={e => updateSlot(slot.id, "duration", e.target.value)}
                        style={{ ...inp, paddingRight: "34px", fontWeight: 700 }}
                        placeholder="90"
                      />
                      <span style={{ position: "absolute", right: "10px", fontSize: "11px", fontWeight: 700, color: "#64748B", pointerEvents: "none" }}>
                        min
                      </span>
                      <datalist id="sc-duration-presets">
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                        <option value="75">75 min</option>
                        <option value="90">90 min</option>
                        <option value="105">105 min</option>
                        <option value="120">120 min</option>
                        <option value="150">150 min</option>
                        <option value="180">180 min</option>
                      </datalist>
                    </div>
                    <input type="number" min="1" max="20" value={slot.maxStudents} onChange={e => updateSlot(slot.id, "maxStudents", e.target.value)} style={{ ...inp, width: "70px", textAlign: "center" }} />
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {DAYS.map(day => {
                        const active = slot.days.includes(day);
                        return (
                          <button key={day} onClick={() => toggleDay(slot.id, day)} style={{ width: "40px", height: "30px", borderRadius: "6px", border: "none", background: active ? "#0D9488" : "#F1F5F9", color: active ? "#FFFFFF" : "#94A3B8", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>{day}</button>
                        );
                      })}
                    </div>
                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", width: "94px" }}>
                      <select
                        value={slot.active !== false ? "active" : "inactive"}
                        onChange={e => updateSlot(slot.id, "active", e.target.value === "active")}
                        style={{
                          width: "100%",
                          padding: "6px 22px 6px 10px",
                          borderRadius: "8px",
                          border: slot.active !== false ? "1.5px solid #0D9488" : "1.5px solid #CBD5E1",
                          backgroundColor: slot.active !== false ? "#F0FDFA" : "#F8FAFC",
                          color: slot.active !== false ? "#0D9488" : "#64748B",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          outline: "none",
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={slot.active !== false ? "#0D9488" : "#64748B"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          position: "absolute",
                          right: "8px",
                          pointerEvents: "none"
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    <button onClick={() => deleteSlot(slot.id)} style={{ width: "36px", height: "36px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Floating Bottom Action Bar matching Photo 1 */}
          <div className="sc-sticky-bar">
            <div className="sc-sb-left">
              <span className="sc-sb-badge">
                SESSION SETUP
              </span>
              <span className="sc-sb-info">
                ⏰ {slots.filter(s => s.active !== false).length} Active Slot{slots.filter(s => s.active !== false).length === 1 ? '' : 's'} &bull; 🎯 Total Capacity: {slots.filter(s => s.active !== false).reduce((sum, s) => sum + (parseInt(s.maxStudents, 10) || 4), 0)} Students
              </span>
            </div>

            <div className="sc-sb-right">
              <button
                type="button"
                onClick={() => {
                  if (fromSource === 'new_session' || fromSource === 'schedule') {
                    navigate("/sessions?action=new_session");
                  } else {
                    navigate("/sessions");
                  }
                }}
                className="sc-sb-btn-back"
              >
                {fromSource === 'new_session' ? '← Back to Schedule Session' : 'Back to Sessions'}
              </button>
              <button
                type="button"
                onClick={handleSaveConfiguration}
                disabled={saving}
                className="sc-sb-btn-save"
              >
                <span>{saving ? "Saving..." : "Save Configuration"}</span>
                <span style={{ fontSize: '15px', fontWeight: 900 }}>&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Custom In-App Success Modal (Replaces Native Browser Alert) */}
      {showSuccessModal && (
        <div
          onClick={() => setShowSuccessModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
            animation: 'scFadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px 28px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1.5px solid #E2E8F0',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'scScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box'
            }}
          >
            {/* Animated Checkmark Circle */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #CCFBF1 100%)',
              border: '2px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: '#059669',
              marginBottom: '18px',
              boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.3)'
            }}>
              ✓
            </div>

            <h3 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '20px',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 8px 0'
            }}>
              Configuration Saved!
            </h3>

            <p style={{
              fontSize: '14px',
              color: '#64748B',
              lineHeight: '1.5',
              margin: '0 0 24px 0'
            }}>
              Session Configuration Saved Successfully! All slot timings and capacity settings are now live across your school.
            </p>

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (fromSource === 'new_session' || fromSource === 'schedule') {
                    navigate('/sessions?action=new_session');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                }}
              >
                {fromSource === 'new_session' || fromSource === 'schedule' ? 'Continue Scheduling →' : 'OK'}
              </button>

              {!(fromSource === 'new_session' || fromSource === 'schedule') && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/sessions');
                  }}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    color: '#475569',
                    border: '1.5px solid #CBD5E1',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                    whiteSpace: 'nowrap'
                  }}
                >
                  View Sessions →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scScaleUp { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }

        .sc-page-wrapper, .sc-page-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          background: #F8FAFC;
          font-family: 'Instrument Sans', sans-serif;
          box-sizing: border-box;
        }
        .sc-main-content {
          flex: 1;
          padding: 104px 40px 100px 40px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          box-sizing: border-box;
          width: 100%;
        }
        .sc-header-bar, .sc-header-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left !important;
          width: 100%;
        }
        .sc-title {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          text-align: left !important;
          line-height: 1.2;
        }
        .sc-subtitle {
          font-size: 14.5px;
          color: #64748B;
          margin: 6px 0 0 0;
          text-align: left !important;
          line-height: 1.4;
        }
        .sc-btn-back { display: flex; align-items: center; gap: 6px; background: #FFFFFF; color: #0F172A; border: 1.5px solid #CBD5E1; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Outfit', sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: all 0.2s; }
        .sc-btn-back:hover { background: #F1F5F9; }
        .sc-btn-save { display: flex; align-items: center; gap: 8px; background: #F43F5E; color: #FFFFFF; border: none; border-radius: 10px; padding: 11px 24px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s; }
        .sc-btn-save:hover { background: #E11D48; }
        .sc-vertical-layout { display: flex; flex-direction: column; gap: 28px; width: 100%; box-sizing: border-box; }
        .sc-card-slots { width: 100%; box-sizing: border-box; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 28px 32px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03); }
        .sc-bottom-grid { display: block; width: 100%; box-sizing: border-box; }
        .sc-panel { background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 24px 28px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03); box-sizing: border-box; }
        .sc-btn-add-slot { display: flex; align-items: center; gap: 6px; background: #E6F9F5; color: #0D9488; border: 1.5px solid #0D9488; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s; }
        .sc-btn-add-slot:hover { background: #CCFBF1; }

        /* Floating Sticky Action Bar (Photo 1 Style) */
        .sc-sticky-bar {
          position: sticky;
          bottom: 16px;
          left: 0;
          right: 0;
          width: 100%;
          box-sizing: border-box;
          background-color: #0A0F1D;
          color: #FFFFFF;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 99;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          margin-top: 24px;
          transition: all 0.2s ease;
        }
        .sc-sb-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .sc-sb-badge {
          background: #0D9488;
          color: #FFFFFF;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .sc-sb-info {
          font-size: 13px;
          font-weight: 600;
          color: #E2E8F0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Outfit', sans-serif;
        }
        .sc-sb-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sc-sb-btn-back {
          background: rgba(255, 255, 255, 0.08);
          color: #F1F5F9;
          border: 1px solid rgba(255, 255, 255, 0.16);
          padding: 11px 20px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sc-sb-btn-back:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #FFFFFF;
        }
        .sc-sb-btn-save {
          background: #00D2B4;
          color: #0F172A;
          border: none;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 800;
          border-radius: 10px;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          box-shadow: 0 4px 14px rgba(0, 210, 180, 0.4);
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sc-sb-btn-save:hover:not(:disabled) {
          background: #00BAA0;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0, 210, 180, 0.5);
        }
        .sc-sb-btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 900px) {
          .sc-bottom-grid { grid-template-columns: 1fr; }
          .sc-main-content { padding: 76px 16px 60px 16px !important; gap: 20px !important; }
          .sc-title { font-size: 22px !important; text-align: left !important; }
          .sc-subtitle { font-size: 13px !important; text-align: left !important; }
          .sc-card-slots { padding: 18px 16px !important; border-radius: 14px !important; }
          .sc-sticky-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            padding: 16px 20px;
            bottom: 10px;
          }
          .sc-sb-right {
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default SessionConfigure;
