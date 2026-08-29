import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultSlots = [
  { id: 1, time: "08:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true },
  { id: 2, time: "10:30 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], active: true },
  { id: 3, time: "11:30 AM", duration: "60", maxStudents: 6, days: ["Mon", "Tue", "Wed"], active: true },
  { id: 4, time: "01:00 PM", duration: "120", maxStudents: 4, days: ["Tue", "Thu", "Sat", "Sun"], active: true },
  { id: 5, time: "03:30 PM", duration: "90", maxStudents: 4, days: ["Fri", "Sat", "Sun"], active: false },
];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { return (new Date(y, m, 1).getDay() + 6) % 7; }

const SessionConfigure = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('session_slots');
      return saved ? JSON.parse(saved) : defaultSlots;
    } catch(e) { return defaultSlots; }
  });
  const [settings, setSettings] = useState({ defaultDuration: "90", maxStudents: "4", breakBetween: "30", cancellationWindow: "24" });
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [blackoutDates, setBlackoutDates] = useState(new Set([`${today.getFullYear()}-${today.getMonth()}-19`]));
  const [saving, setSaving] = useState(false);

  const toggleDay = (sid, day) => setSlots(p => p.map(s => { if (s.id !== sid) return s; const h = s.days.includes(day); return { ...s, days: h ? s.days.filter(d => d !== day) : [...s.days, day] }; }));
  const updateSlot = (sid, f, v) => setSlots(p => p.map(s => s.id === sid ? { ...s, [f]: v } : s));
  const deleteSlot = (sid) => setSlots(p => p.filter(s => s.id !== sid));
  const addSlot = () => setSlots(p => [...p, { id: Date.now(), time: "09:00 AM", duration: "90", maxStudents: 4, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true }]);
  const toggleBlackout = (k) => setBlackoutDates(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDay(calYear, calMonth);
  const inp = { border: "1.5px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px", background: "#F8FAFC", outline: "none", boxSizing: "border-box", fontSize: "14px", fontWeight: 600, color: "#0F172A", width: "100%", fontFamily: "inherit" };

  return (
    <div className="sc-page-wrapper">
      <Sidebar />

      {/* Main Full-Screen Layout with generous top padding so nothing gets cut */}
      <main className="sc-main-content">
        {/* Header Bar */}
        <div className="sc-header-bar">
          <div>
            <h1 className="sc-title">
              Session Configuration
            </h1>
            <p className="sc-subtitle">
              Set up your school's available session time slots and manage scheduling preferences.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={() => navigate("/sessions")}
              className="sc-btn-back"
            >
              Back to Sessions
            </button>
            <button
              onClick={() => { 
                setSaving(true); 
                localStorage.setItem('session_slots', JSON.stringify(slots));
                setTimeout(() => { setSaving(false); alert("Session Configuration Saved Successfully!"); }, 500); 
              }}
              disabled={saving}
              className="sc-btn-save"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
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

            <div style={{ display: "grid", gridTemplateColumns: "130px 130px 120px 1fr 100px 48px", gap: "16px", paddingBottom: "12px", borderBottom: "1.5px solid #E2E8F0", marginBottom: "8px" }}>
              {["TIME", "DURATION", "MAX STUDENTS", "AVAILABLE DAYS", "STATUS", "DELETE"].map(h => (
                <span key={h} style={{ fontSize: "11px", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
              ))}
            </div>

            {slots.map(slot => (
              <div key={slot.id} style={{ display: "grid", gridTemplateColumns: "130px 130px 120px 1fr 100px 48px", gap: "16px", alignItems: "center", padding: "16px 0", borderBottom: "1px solid #F1F5F9" }}>
                <input type="text" value={slot.time} onChange={e => updateSlot(slot.id, "time", e.target.value)} style={{ ...inp, fontWeight: 700 }} />
                <select value={slot.duration} onChange={e => updateSlot(slot.id, "duration", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  {["30", "45", "60", "90", "120"].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
                <input type="number" min="1" max="20" value={slot.maxStudents} onChange={e => updateSlot(slot.id, "maxStudents", e.target.value)} style={{ ...inp, width: "70px", textAlign: "center" }} />
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {DAYS.map(day => {
                    const active = slot.days.includes(day);
                    return (
                      <button key={day} onClick={() => toggleDay(slot.id, day)} style={{ width: "40px", height: "30px", borderRadius: "6px", border: "none", background: active ? "#0D9488" : "#F1F5F9", color: active ? "#FFFFFF" : "#94A3B8", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>{day}</button>
                    );
                  })}
                </div>
                <button onClick={() => updateSlot(slot.id, "active", !slot.active)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", background: slot.active ? "rgba(13, 148, 136, 0.12)" : "rgba(148, 163, 184, 0.15)", color: slot.active ? "#0D9488" : "#94A3B8", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  {slot.active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => deleteSlot(slot.id)} style={{ width: "36px", height: "36px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            ))}
          </div>

          <div className="sc-bottom-grid">
            <div className="sc-panel">
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: "0 0 6px 0" }}>Default Session Settings</h2>
              <p style={{ fontSize: "12.5px", color: "#64748B", margin: "0 0 20px 0", lineHeight: 1.5 }}>Global timing constraints and booking policies applied across all lessons</p>
              {[
                { label: "Default Session Duration", key: "defaultDuration", type: "select", options: ["30", "45", "60", "90", "120"], suffix: "min" },
                { label: "Default Max Students per Session", key: "maxStudents", type: "number" },
                { label: "Break Between Sessions (min)", key: "breakBetween", type: "number" },
                { label: "Cancellation Window (hours)", key: "cancellationWindow", type: "number" },
              ].map(({ label, key, type, options, suffix }) => (
                <div key={key} style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>{label}</label>
                  {type === "select" ? (
                    <select value={settings[key]} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                      {options.map(o => <option key={o} value={o}>{o} {suffix}</option>)}
                    </select>
                  ) : (
                    <input type="number" value={settings[key]} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} style={inp} />
                  )}
                </div>
              ))}
            </div>

            <div className="sc-panel">
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: "0 0 6px 0" }}>Blackout Dates</h2>
              <p style={{ fontSize: "12.5px", color: "#64748B", margin: "0 0 16px 0", lineHeight: 1.5 }}>Select days where no public lesson bookings are permitted (holidays, ocean safety drills).</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{MONTH_NAMES[calMonth]} {calYear}</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: "6px", width: "28px", height: "28px", cursor: "pointer", color: "#64748B" }}>&#8249;</button>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: "6px", width: "28px", height: "28px", cursor: "pointer", color: "#64748B" }}>&#8250;</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "6px" }}>
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#94A3B8" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={"e" + i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const iso = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isBlocked = blackoutDates.has(iso);
                  return (
                    <button key={day} onClick={() => toggleBlackout(iso)} style={{ height: "36px", borderRadius: "8px", border: isBlocked ? "none" : "1px solid #F1F5F9", background: isBlocked ? "#EF4444" : "#F8FAFC", color: isBlocked ? "#FFFFFF" : "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>{day}</button>
                  );
                })}
              </div>
              {blackoutDates.size > 0 && (
                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>{blackoutDates.size} date{blackoutDates.size > 1 ? "s" : ""} blacked out</span>
                  <button onClick={() => setBlackoutDates(new Set())} style={{ background: "none", border: "none", color: "#EF4444", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Clear All</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .sc-page-container {
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
        .sc-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .sc-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; color: #0F172A; margin: 0; }
        .sc-subtitle { font-size: 14.5px; color: #64748B; margin: 4px 0 0 0; }
        .sc-btn-back { display: flex; align-items: center; gap: 6px; background: #FFFFFF; color: #0F172A; border: 1.5px solid #CBD5E1; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Outfit', sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: all 0.2s; }
        .sc-btn-back:hover { background: #F1F5F9; }
        .sc-btn-save { display: flex; align-items: center; gap: 8px; background: #F43F5E; color: #FFFFFF; border: none; border-radius: 10px; padding: 11px 24px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s; }
        .sc-btn-save:hover { background: #E11D48; }
        .sc-vertical-layout { display: flex; flex-direction: column; gap: 28px; width: 100%; box-sizing: border-box; }
        .sc-card-slots { width: 100%; box-sizing: border-box; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 28px 32px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03); }
        .sc-bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; width: 100%; box-sizing: border-box; }
        .sc-panel { background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 24px 28px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03); box-sizing: border-box; }
        .sc-btn-add-slot { display: flex; align-items: center; gap: 6px; background: #E6F9F5; color: #0D9488; border: 1.5px solid #0D9488; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s; }
        .sc-btn-add-slot:hover { background: #CCFBF1; }
        @media (max-width: 1000px) {
          .sc-bottom-grid { grid-template-columns: 1fr; }
          .sc-main-content { padding: 90px 20px 60px 20px; }
        }
      `}</style>
    </div>
  );
};

export default SessionConfigure;
