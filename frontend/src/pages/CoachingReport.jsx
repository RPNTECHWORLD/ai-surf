import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const CoachingReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentName = searchParams.get('student') || 'Chloe Kim';
  const sessionDate = searchParams.get('date') || '12 Jun 2025';

  const [shareSuccess, setShareSuccess] = useState(false);

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const reportId = `WC-992-${getInitials(studentName)}`;

  const handleShare = () => {
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  return (
    <div className="cr-page">
      <Sidebar />
      <main className="cr-main">
        {/* Toast Notification */}
        {shareSuccess && (
          <div className="cr-toast">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Report shared with student successfully!
          </div>
        )}

        {/* Header Section */}
        <header className="cr-header-row">
          <div className="cr-header-left">
            <h1 className="cr-title">Coaching Report — {studentName}</h1>
            <p className="cr-subtitle">Session Date: {sessionDate} • Report ID: {reportId}</p>
          </div>
          <div className="cr-header-actions">
            <button className="cr-btn-secondary" onClick={() => window.print()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print Report
            </button>
            <button className="cr-btn-primary" onClick={handleShare}>
              Share with Student
            </button>
          </div>
        </header>

        {/* Grid: Overview vs Summary */}
        <div className="cr-grid-overview">
          {/* Performance Overview */}
          <div className="cr-card cr-overview-card">
            <h2 className="cr-card-title">Performance Overview</h2>
            <p className="cr-overview-text">
              {studentName} showed significant improvement in wave reading today, identifying three high-potential peaks early in the set. However, a slight delay in the initial pop-up on the steeper faces led to unbalanced footing. Stance stability remains high once engaged, but focus is needed on the transition from prone to standing.
            </p>
            <div className="cr-strengths-grid">
              <div>
                <h3 className="cr-section-label cr-color-success">CORE STRENGTHS</h3>
                <ul className="cr-list">
                  <li>+ Stance width consistency</li>
                  <li>+ Visual peak tracking</li>
                </ul>
              </div>
              <div>
                <h3 className="cr-section-label cr-color-danger">AREAS TO FOCUS</h3>
                <ul className="cr-list">
                  <li>- Explosive pop-up speed</li>
                  <li>- Back-foot pressure in turns</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Session Summary */}
          <div className="cr-card cr-summary-card">
            <h2 className="cr-card-title">Session Summary</h2>
            <div className="cr-summary-list">
              <div className="cr-summary-item">
                <div className="cr-summary-icon cr-bg-teal">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <div className="cr-summary-details">
                  <span className="cr-summary-label">LOCATION</span>
                  <span className="cr-summary-value">Pipeline, Oahu</span>
                </div>
              </div>

              <div className="cr-summary-item">
                <div className="cr-summary-icon cr-bg-teal">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div className="cr-summary-details">
                  <span className="cr-summary-label">INSTRUCTOR</span>
                  <span className="cr-summary-value">Kai Lenny</span>
                </div>
              </div>

              <div className="cr-summary-item">
                <div className="cr-summary-icon cr-bg-teal">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                </div>
                <div className="cr-summary-details">
                  <span className="cr-summary-label">WAVES CAUGHT</span>
                  <span className="cr-summary-value">14 Waves</span>
                </div>
              </div>

              <div className="cr-summary-item">
                <div className="cr-summary-icon cr-bg-teal">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                </div>
                <div className="cr-summary-details">
                  <span className="cr-summary-label">BEST WAVE</span>
                  <span className="cr-summary-value">8.4 Seconds</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Identified Improvements Section */}
        <section className="cr-improvements-section">
          <h2 className="cr-section-title">Identified Improvements</h2>
          <div className="cr-improvements-grid">
            <div className="cr-improvement-card">
              <div 
                className="cr-improvement-img" 
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=400')` }}
              ></div>
              <div className="cr-improvement-body">
                <div className="cr-improvement-header">
                  <span className="cr-improvement-name">Late Pop-up</span>
                  <span className="cr-badge cr-badge-danger">MAJOR</span>
                </div>
                <p className="cr-improvement-desc">Hands placed too far forward.</p>
              </div>
            </div>

            <div className="cr-improvement-card">
              <div 
                className="cr-improvement-img" 
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&q=80&w=400')` }}
              ></div>
              <div className="cr-improvement-body">
                <div className="cr-improvement-header">
                  <span className="cr-improvement-name">Positioning</span>
                  <span className="cr-badge cr-badge-warning">MINOR</span>
                </div>
                <p className="cr-improvement-desc">Too deep in the impact zone.</p>
              </div>
            </div>

            <div className="cr-improvement-card">
              <div 
                className="cr-improvement-img" 
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1518182170546-076616fd6738?auto=format&fit=crop&q=80&w=400')` }}
              ></div>
              <div className="cr-improvement-body">
                <div className="cr-improvement-header">
                  <span className="cr-improvement-name">Shoulder Rotation</span>
                  <span className="cr-badge cr-badge-warning">MINOR</span>
                </div>
                <p className="cr-improvement-desc">Looking down instead of down-line.</p>
              </div>
            </div>

            <div className="cr-improvement-card">
              <div 
                className="cr-improvement-img" 
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400')` }}
              ></div>
              <div className="cr-improvement-body">
                <div className="cr-improvement-header">
                  <span className="cr-improvement-name">Knee Stance</span>
                  <span className="cr-badge cr-badge-danger">MAJOR</span>
                </div>
                <p className="cr-improvement-desc">Front knee collapsing inward.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Training Drills Widget */}
        <section className="cr-drills-widget">
          <div className="cr-drills-header">
            <h2 className="cr-drills-title">Training Drills</h2>
            <span className="cr-drills-badge">READY FOR GREEN BADGE</span>
          </div>
          <div className="cr-drills-grid">
            <div className="cr-drill-card">
              <div className="cr-drill-header">
                <span className="cr-drill-name">Dry Land Pop-ups</span>
                <span className="cr-drill-icon-container">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D1B2" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                </span>
              </div>
              <p className="cr-drill-description">10 sets of 5 explosive reps on the sand.</p>
              <div className="cr-drill-target-badge">TAKE-OFF TARGET</div>
            </div>

            <div className="cr-drill-card">
              <div className="cr-drill-header">
                <span className="cr-drill-name">The Horizon Gaze</span>
                <span className="cr-drill-icon-container">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D1B2" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                </span>
              </div>
              <p className="cr-drill-description">Keep eyes 45 degrees ahead during bottom turn.</p>
              <div className="cr-drill-target-badge">STANCE TARGET</div>
            </div>

            <div className="cr-drill-card">
              <div className="cr-drill-header">
                <span className="cr-drill-name">Duck Dive Reflex</span>
                <span className="cr-drill-icon-container">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D1B2" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                </span>
              </div>
              <p className="cr-drill-description">Practice timing against 3ft whitewater.</p>
              <div className="cr-drill-target-badge">POSITIONING TARGET</div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .cr-page { display: flex; min-height: 100vh; font-family: 'Instrument Sans', sans-serif; }
        .cr-main { flex: 1; padding: 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; box-sizing: border-box; }

        /* Toast notification */
        .cr-toast {
          position: fixed;
          top: 88px;
          right: 40px;
          background: #0D9488;
          color: #FFFFFF;
          padding: 12px 24px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease-out;
          z-index: 1100;
        }

        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Header block */
        .cr-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .cr-header-left { display: flex; flex-direction: column; gap: 6px; }
        .cr-title { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 800; color: #050B1A; margin: 0; }
        .cr-subtitle { font-size: 14px; color: #64748B; font-weight: 600; margin: 0; }

        .cr-header-actions { display: flex; gap: 12px; }
        .cr-btn-primary {
          padding: 10px 20px; background: #F43F5E; border: none; border-radius: 10px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF;
          cursor: pointer; transition: background 0.2s, transform 0.1s;
        }
        .cr-btn-primary:hover { background: #E11D48; transform: translateY(-1px); }
        .cr-btn-secondary {
          padding: 10px 20px; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 10px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #050B1A;
          display: flex; align-items: center; gap: 8px; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .cr-btn-secondary:hover { background: #F8FAFC; border-color: #CBD5E1; }

        /* Grid */
        .cr-grid-overview { display: grid; grid-template-columns: 2.2fr 1fr; gap: 24px; }
        .cr-card { background: #FFFFFF; border-radius: 20px; padding: 32px; border: 1.5px solid #E2E8F0; }
        .cr-card-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #050B1A; margin: 0 0 16px 0; }

        /* Overview Content */
        .cr-overview-text { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0; font-weight: 500; }
        .cr-strengths-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .cr-section-label { font-size: 12px; font-weight: 800; letter-spacing: 1px; margin: 0 0 12px 0; }
        .cr-color-success { color: #0D9488; }
        .cr-color-danger { color: #F43F5E; }
        .cr-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .cr-list li { font-size: 14px; font-weight: 700; color: #1E293B; }

        /* Summary Panel */
        .cr-summary-list { display: flex; flex-direction: column; gap: 16px; }
        .cr-summary-item { display: flex; align-items: center; gap: 16px; }
        .cr-summary-icon {
          width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center;
          justify-content: center; color: #0D9488; background: rgba(13, 148, 136, 0.08); flex-shrink: 0;
        }
        .cr-summary-details { display: flex; flex-direction: column; gap: 2px; }
        .cr-summary-label { font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; }
        .cr-summary-value { font-size: 15px; font-weight: 800; color: #050B1A; }

        /* Improvements Section */
        .cr-improvements-section { display: flex; flex-direction: column; gap: 20px; }
        .cr-section-title { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #050B1A; margin: 0; }
        .cr-improvements-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        
        .cr-improvement-card {
          background: #FFFFFF; border-radius: 16px; border: 1.5px solid #E2E8F0;
          overflow: hidden; display: flex; flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cr-improvement-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
        }
        .cr-improvement-img { height: 160px; background-size: cover; background-position: center; }
        .cr-improvement-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .cr-improvement-header { display: flex; justify-content: space-between; align-items: center; }
        .cr-improvement-name { font-size: 14.5px; font-weight: 800; color: #050B1A; }
        
        /* Badges */
        .cr-badge { padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; letter-spacing: 0.5px; }
        .cr-badge-danger { background: rgba(244, 63, 94, 0.08); color: #F43F5E; }
        .cr-badge-warning { background: rgba(245, 158, 11, 0.08); color: #F59E0B; }

        .cr-improvement-desc { font-size: 12.5px; color: #64748B; margin: 0; font-weight: 500; }

        /* Drills Widget */
        .cr-drills-widget {
          background: #050B1A; border-radius: 24px; padding: 32px;
          display: flex; flex-direction: column; gap: 24px;
        }
        .cr-drills-header { display: flex; justify-content: space-between; align-items: center; }
        .cr-drills-title { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #FFFFFF; margin: 0; }
        .cr-drills-badge {
          background: rgba(0, 209, 178, 0.08); border: 1.5px solid #00D1B2;
          color: #00D1B2; font-size: 10px; font-weight: 800; letter-spacing: 1px;
          padding: 6px 12px; border-radius: 8px;
        }
        .cr-drills-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .cr-drill-card {
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 12px;
          transition: border-color 0.2s;
        }
        .cr-drill-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }
        .cr-drill-header { display: flex; justify-content: space-between; align-items: center; }
        .cr-drill-name { font-size: 16px; font-weight: 800; color: #FFFFFF; }
        .cr-drill-icon-container {
          width: 32px; height: 32px; background: rgba(0, 209, 178, 0.08);
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
        }
        .cr-drill-description { font-size: 13.5px; color: rgba(255, 255, 255, 0.6); margin: 0; line-height: 1.5; font-weight: 500; }
        .cr-drill-target-badge {
          align-self: flex-start; background: transparent; border: 1.5px solid rgba(0, 209, 178, 0.25);
          color: #00D1B2; font-size: 9.5px; font-weight: 800; letter-spacing: 0.5px;
          padding: 4px 10px; border-radius: 6px; margin-top: 4px;
        }

        /* Responsive Layout Media Queries */
        @media (max-width: 1024px) {
          .cr-grid-overview { grid-template-columns: 1fr; }
          .cr-improvements-grid { grid-template-columns: repeat(2, 1fr); }
          .cr-drills-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .cr-header-row { flex-direction: column; gap: 16px; align-items: flex-start; }
          .cr-header-actions { width: 100%; }
          .cr-btn-primary, .cr-btn-secondary { flex: 1; justify-content: center; }
          .cr-improvements-grid { grid-template-columns: 1fr; }
        }

        /* Print Override Styles */
        @media print {
          .db-top-header, .db-mobile-menu, .cr-toast, .cr-header-actions { display: none !important; }
          .cr-page { display: block; background: #FFFFFF; }
          .cr-main { padding: 0; }
          .cr-card { border: none; padding: 16px 0; }
          .cr-grid-overview { grid-template-columns: 1fr; gap: 0; }
          .cr-drills-widget { background: #000000; color: #FFFFFF; }
          .cr-drill-card { border: 1px solid rgba(255,255,255,0.2); }
        }
      `}</style>
    </div>
  );
};

export default CoachingReport;
