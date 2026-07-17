import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const VideoAnalysis = () => {
  const navigate = useNavigate();

  return (
    <div className="va-page">
      <Sidebar />
      <main className="va-main">
        {/* Header */}
        <header className="va-header">
          <div className="va-header-left">
            <button className="va-back-btn" onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <h1 className="va-title">AI Video Analysis — Chloe Kim — 12 Jun 2025</h1>
          </div>
          <button className="va-btn-export">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export PDF
          </button>
        </header>

        {/* Layout */}
        <div className="va-layout">
          
          {/* Left Column */}
          <div className="va-col-left">
            {/* Main Player */}
            <div className="va-player-container">
              <div className="va-player-overlay">
                <div className="va-player-controls-row">
                  {/* Progress Bar */}
                  <div className="va-progress-bar-container">
                    <div className="va-progress-bar-bg">
                      <div className="va-progress-marker" style={{ left: '15%', backgroundColor: '#F43F5E' }}></div>
                      <div className="va-progress-marker" style={{ left: '75%', backgroundColor: '#F59E0B' }}></div>
                      
                      <div className="va-progress-fill" style={{ width: '45%' }}></div>
                      <div className="va-progress-handle" style={{ left: '45%' }}></div>
                    </div>
                  </div>

                  {/* Controls & Time */}
                  <div className="va-playback-controls">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                    <span className="va-time-display">01:24 / 04:15</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clips Selector */}
            <div className="va-clips-row">
              <div className="va-clip-item va-clip-active">
                <div className="va-clip-badge">Clip 1</div>
              </div>
              <div className="va-clip-item">
                <div className="va-clip-badge">Clip 2</div>
              </div>
              <div className="va-clip-item">
                <div className="va-clip-badge">Clip 3</div>
              </div>
            </div>
          </div>

          {/* Right Column (Analytics) */}
          <div className="va-col-right">
            
            {/* Score */}
            <div className="va-section">
              <div className="va-section-title">PERFORMANCE SCORE</div>
              <div className="va-score-row">
                <span className="va-score-big">78</span>
                <span className="va-score-small">/ 100</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="va-section">
              <div className="va-section-title">SKILL BREAKDOWN</div>
              
              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Take-off</span>
                  <span className="va-skill-pct">82%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: '82%' }}></div>
                </div>
              </div>

              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Positioning</span>
                  <span className="va-skill-pct">71%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: '71%' }}></div>
                </div>
              </div>

              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Balance</span>
                  <span className="va-skill-pct">85%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className="va-skill-row">
                <div className="va-skill-header">
                  <span>Wave Reading</span>
                  <span className="va-skill-pct">68%</span>
                </div>
                <div className="va-skill-bar-bg">
                  <div className="va-skill-bar-fill" style={{ width: '68%' }}></div>
                </div>
              </div>
            </div>

            {/* Key Moments */}
            <div className="va-section" style={{ flex: 1 }}>
              <div className="va-section-title">DETECTED KEY MOMENTS</div>
              
              <div className="va-moments-list">
                <div className="va-moment-card">
                  <div className="va-moment-thumb" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=150')" }}></div>
                  <div className="va-moment-info">
                    <div className="va-moment-name">Late pop-up</div>
                    <div className="va-moment-time">Timestamp 0:34</div>
                  </div>
                  <div className="va-moment-dot" style={{ backgroundColor: '#F43F5E' }}></div>
                </div>

                <div className="va-moment-card">
                  <div className="va-moment-thumb" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&q=80&w=150')" }}></div>
                  <div className="va-moment-info">
                    <div className="va-moment-name">Weight shifting</div>
                    <div className="va-moment-time">Timestamp 1:12</div>
                  </div>
                  <div className="va-moment-dot" style={{ backgroundColor: '#F59E0B' }}></div>
                </div>

                <div className="va-moment-card">
                  <div className="va-moment-thumb" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518182170546-076616fd6738?auto=format&fit=crop&q=80&w=150')" }}></div>
                  <div className="va-moment-info">
                    <div className="va-moment-name">Perfect stance</div>
                    <div className="va-moment-time">Timestamp 2:45</div>
                  </div>
                  <div className="va-moment-dot" style={{ backgroundColor: '#0D9488' }}></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <style>{`
        .va-page { display: flex; min-height: 100vh; background: #050B1A; font-family: 'Instrument Sans', sans-serif; }
        .va-main { flex: 1; padding: 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; background: #050B1A; }

        /* Header */
        .va-header { display: flex; justify-content: space-between; align-items: center; }
        .va-header-left { display: flex; align-items: center; gap: 16px; }
        .va-back-btn {
          width: 44px; height: 44px; background: rgba(255,255,255,0.07); border-radius: 50%;
          border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .va-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #FFFFFF; margin: 0; }
        .va-btn-export {
          padding: 8px 16px; background: #F43F5E; border-radius: 8px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF;
          display: flex; align-items: center; gap: 8px; cursor: pointer;
        }

        /* Layout */
        .va-layout { display: flex; gap: 32px; align-items: stretch; }

        /* Left Column */
        .va-col-left { flex: 1; display: flex; flex-direction: column; gap: 16px; }
        
        .va-player-container {
          background-image: linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=1200');
          background-size: cover; background-position: center; border-radius: 24px;
          aspect-ratio: 16/9; position: relative; overflow: hidden;
        }
        .va-player-overlay {
          position: absolute; bottom: 0; left: 0; right: 0; height: 100px;
          display: flex; align-items: center; padding: 0 24px;
        }
        .va-player-controls-row {
          width: 100%; display: flex; align-items: center; gap: 20px;
        }
        
        /* Progress Bar */
        .va-progress-bar-container { flex: 1; position: relative; height: 4px; display: flex; align-items: center; }
        .va-progress-bar-bg { width: 100%; height: 4px; background: rgba(255,255,255,0.25); border-radius: 2px; position: relative; }
        .va-progress-fill { position: absolute; left: 0; top: 0; height: 100%; background: #0D9488; border-radius: 2px; }
        .va-progress-marker { position: absolute; top: -4px; width: 4px; height: 12px; border-radius: 2px; }
        .va-progress-handle {
          position: absolute; top: -6px; width: 16px; height: 16px; background: #FFFFFF; border: 3px solid #0D9488;
          border-radius: 50%; transform: translateX(-50%);
        }

        /* Controls */
        .va-playback-controls { display: flex; align-items: center; gap: 24px; }
        .va-time-display { font-size: 15px; font-weight: 700; color: #FFFFFF; margin-left: 8px; }

        /* Clips */
        .va-clips-row { display: flex; gap: 16px; height: 140px; }
        .va-clip-item {
          flex: 1; background-image: url('https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&q=80&w=400');
          background-size: cover; background-position: center; border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.2); position: relative; cursor: pointer;
        }
        .va-clip-active { border: 3px solid #0D9488; }
        .va-clip-badge {
          position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.5); border-radius: 4px;
          padding: 4px 6px; font-size: 10px; color: #FFFFFF;
        }

        /* Right Column (Analytics) */
        .va-col-right {
          width: 400px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(20px); border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 32px;
          flex-shrink: 0;
        }
        
        .va-section { display: flex; flex-direction: column; gap: 20px; }
        .va-section-title { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; margin: 0; }
        
        /* Score */
        .va-score-row { display: flex; align-items: baseline; gap: 8px; }
        .va-score-big { font-family: 'Outfit', sans-serif; font-size: 48px; font-weight: 800; color: #FFFFFF; line-height: 1; }
        .va-score-small { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.4); }

        /* Skill Breakdown */
        .va-skill-row { display: flex; flex-direction: column; gap: 8px; }
        .va-skill-header { display: flex; justify-content: space-between; font-size: 14px; color: #FFFFFF; }
        .va-skill-pct { font-weight: 700; color: #0D9488; }
        .va-skill-bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; }
        .va-skill-bar-fill { height: 100%; background: #0D9488; border-radius: 3px; }

        /* Key Moments */
        .va-moments-list { display: flex; flex-direction: column; gap: 16px; }
        .va-moment-card {
          background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px;
          display: flex; align-items: center; gap: 12px; cursor: pointer;
        }
        .va-moment-thumb { width: 60px; height: 40px; border-radius: 4px; background-size: cover; background-position: center; }
        .va-moment-info { flex: 1; display: flex; flex-direction: column; }
        .va-moment-name { font-size: 14px; font-weight: 700; color: #FFFFFF; }
        .va-moment-time { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 2px; }
        .va-moment-dot { width: 8px; height: 8px; border-radius: 4px; flex-shrink: 0; }
      `}</style>
    </div>
  );
};

export default VideoAnalysis;
