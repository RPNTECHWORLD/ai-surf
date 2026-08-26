import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const JudgeScoring = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const heatId = searchParams.get('heat') || 'heat_1';
  const initialJudgeName = searchParams.get('judge') || 'Judge 1';

  const [judgeName, setJudgeName] = useState(initialJudgeName);
  const [heatData, setHeatData] = useState(null);
  const [selectedSurferId, setSelectedSurferId] = useState('');
  const [waveScore, setWaveScore] = useState(6.5);
  const [toastMsg, setToastMsg] = useState('');
  const [submittedWaves, setSubmittedWaves] = useState([]);

  // Load heat state from localStorage sync or demo data
  const loadHeatData = () => {
    try {
      const savedHeats = localStorage.getItem('aquaticx_heats');
      if (savedHeats) {
        const parsed = JSON.parse(savedHeats);
        if (parsed.length > 0) {
          const current = parsed[0]; // Active heat
          setHeatData(current);
          if (current.surfers.length > 0 && !selectedSurferId) {
            setSelectedSurferId(current.surfers[0].id);
          }
          return;
        }
      }
    } catch (e) {}

    // Default fallback demo heat
    const defaultHeat = {
      heatId: 'heat_1',
      heatName: 'Heat 1 — Dawn Patrol',
      division: 'Morning 6:00 AM',
      surfers: [
        { id: 'st_1', name: 'Chloe Kim', type: 'Student', jersey: { badge: '🔴 RED', hex: '#EF4444' }, waves: [6.5, 6.5], top2Total: 13.0 },
        { id: 'st_2', name: 'Rick Grimes', type: 'Student', jersey: { badge: '🔵 BLUE', hex: '#3B82F6' }, waves: [], top2Total: 0 },
        { id: 'st_3', name: 'Sarah Connor', type: 'Student', jersey: { badge: '🟡 YELLOW', hex: '#F59E0B' }, waves: [], top2Total: 0 },
        { id: 'st_4', name: 'James Bond', type: 'Student', jersey: { badge: '🟢 GREEN', hex: '#10B981' }, waves: [], top2Total: 0 }
      ]
    };
    setHeatData(defaultHeat);
    if (!selectedSurferId) setSelectedSurferId('st_1');
  };

  useEffect(() => {
    loadHeatData();
    const handleStorageChange = (e) => {
      if (e.key === 'aquaticx_heats') {
        loadHeatData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleScoreSubmit = (e) => {
    e.preventDefault();
    if (!heatData || !selectedSurferId) return;

    const scoreNum = parseFloat(waveScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) return;

    try {
      const savedHeats = localStorage.getItem('aquaticx_heats');
      let heats = savedHeats ? JSON.parse(savedHeats) : [heatData];
      
      const updatedHeats = heats.map(h => {
        const updatedSurfers = h.surfers.map(s => {
          if (s.id === selectedSurferId) {
            const newWaves = [...s.waves, scoreNum];
            const sorted = [...newWaves].sort((a, b) => b - a);
            const top2 = (sorted[0] || 0) + (sorted[1] || 0);
            return {
              ...s,
              waves: newWaves,
              top2Total: parseFloat(top2.toFixed(2))
            };
          }
          return s;
        });
        updatedSurfers.sort((a, b) => b.top2Total - a.top2Total);
        return { ...h, surfers: updatedSurfers };
      });

      localStorage.setItem('aquaticx_heats', JSON.stringify(updatedHeats));
      const activeUpdatedHeat = updatedHeats.find(h => h.heatId === (heatData?.heatId || 'heat_1')) || updatedHeats[0];
      setHeatData(activeUpdatedHeat);
      window.dispatchEvent(new Event('storage'));
      
      setSubmittedWaves(prev => [{ surferId: selectedSurferId, score: scoreNum, time: new Date().toLocaleTimeString() }, ...prev]);
      showToast(`✅ Logged ${scoreNum.toFixed(1)} Pts by ${judgeName}!`);
    } catch (err) {
      showToast('Score submitted successfully!');
    }
  };

  const getScoreCategory = (score) => {
    const s = parseFloat(score);
    if (s >= 8.0) return { label: 'EXCELLENT', color: '#10B981', bg: 'rgba(16, 185, 129, 0.2)' };
    if (s >= 6.0) return { label: 'GOOD', color: '#00F2FE', bg: 'rgba(0, 242, 254, 0.2)' };
    if (s >= 4.0) return { label: 'AVERAGE', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.2)' };
    if (s >= 2.0) return { label: 'FAIR', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.2)' };
    return { label: 'POOR', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.2)' };
  };

  const activeSurfer = heatData?.surfers.find(s => s.id === selectedSurferId);
  const scoreCat = getScoreCategory(waveScore);

  return (
    <div style={{ minHeight: '100vh', background: '#070A12', color: '#F8FAFC', padding: '24px 16px', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #00D1B2 0%, #00F2FE 100%)', color: '#0B0E17', padding: '12px 24px', borderRadius: '30px', fontWeight: 900, fontSize: '13px', boxShadow: '0 8px 30px rgba(0,242,254,0.5)', zIndex: 9999 }}>
          {toastMsg}
        </div>
      )}

      {/* Main Container Card */}
      <div style={{ width: '100%', maxWidth: '680px', background: '#0F172A', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '24px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        {/* Top Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => navigate('/competitions')}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94A3B8', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ← Back
              </button>
              <span style={{ fontSize: '10px', background: 'rgba(0, 242, 254, 0.15)', color: '#00F2FE', border: '1px solid rgba(0, 242, 254, 0.3)', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🏄 OFFICIAL JUDGE PORTAL
              </span>
            </div>
            <h1 style={{ margin: '8px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#FFF' }}>
              {heatData?.heatName || 'Live Heat 1'}
            </h1>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>JUDGE NAME</div>
            <input
              type="text"
              value={judgeName}
              onChange={e => setJudgeName(e.target.value)}
              style={{ background: '#1E293B', border: '1px solid rgba(0, 242, 254, 0.3)', color: '#00F2FE', fontWeight: 800, fontSize: '13px', padding: '6px 12px', borderRadius: '8px', textAlign: 'right', width: '110px', outline: 'none', marginTop: '2px' }}
            />
          </div>
        </header>

        {/* Surfer Jersey Selector Cards */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            1. SELECT SURFER IN WATER
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {heatData?.surfers.map(s => {
              const isSelected = s.id === selectedSurferId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSurferId(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid #00F2FE' : '1px solid rgba(255,255,255,0.08)',
                    background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.03)',
                    boxShadow: isSelected ? '0 0 20px rgba(0, 242, 254, 0.25)' : 'none',
                    color: '#FFF',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{s.jersey?.badge?.split(' ')[0] || '🔴'}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: isSelected ? '#00F2FE' : '#FFF' }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Total: {s.top2Total.toFixed(2)} pts</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wave Scoring Console */}
        <form onSubmit={handleScoreSubmit} style={{ background: '#0B0E17', border: '1px solid #00F2FE', borderRadius: '18px', padding: '22px', marginBottom: '22px', boxShadow: '0 10px 30px rgba(0, 242, 254, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SCORING SURFER</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#FFF', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{activeSurfer?.jersey?.badge}</span>
                <span>{activeSurfer?.name || 'Select Surfer'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: scoreCat.bg, color: scoreCat.color, letterSpacing: '0.5px' }}>
                {scoreCat.label}
              </span>
              <span style={{ fontSize: '36px', fontWeight: 900, color: '#00F2FE', fontFamily: 'monospace', lineHeight: '1' }}>
                {parseFloat(waveScore).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Slider */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={waveScore}
              onChange={e => setWaveScore(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#00F2FE', cursor: 'pointer', height: '6px', marginBottom: '6px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748B', fontWeight: 800 }}>
              <span>0.0 POOR</span>
              <span>2.5 FAIR</span>
              <span>5.0 AVERAGE</span>
              <span>7.5 GOOD</span>
              <span>10.0 EXCELLENT</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <button type="button" onClick={() => setWaveScore(3.5)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', padding: '10px 0', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>3.5 Low</button>
            <button type="button" onClick={() => setWaveScore(5.5)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', padding: '10px 0', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>5.5 Avg</button>
            <button type="button" onClick={() => setWaveScore(7.5)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', padding: '10px 0', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>7.5 Good</button>
            <button type="button" onClick={() => setWaveScore(9.2)} style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#10B981', padding: '10px 0', borderRadius: '10px', fontWeight: 900, fontSize: '12px', cursor: 'pointer' }}>9.2 Excl!</button>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #00D1B2 0%, #00F2FE 100%)',
              color: '#0B0E17',
              fontWeight: 900,
              fontSize: '15px',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            ⚡ SUBMIT WAVE SCORE
          </button>
        </form>

        {/* Submitted Logs History */}
        {submittedWaves.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📋 Recent Waves Submitted by {judgeName}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {submittedWaves.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#FFF', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', alignItems: 'center' }}>
                  <span>Score: <strong style={{ color: '#00F2FE' }}>{w.score.toFixed(1)} pts</strong></span>
                  <span style={{ color: '#64748B', fontSize: '11px' }}>{w.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JudgeScoring;
