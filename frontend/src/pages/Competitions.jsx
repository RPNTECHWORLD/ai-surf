import React from 'react';
import Sidebar from '../components/Sidebar';

const Competitions = () => {
  const upcomingEvents = [1, 2, 3, 4].map((id) => ({
    id,
    name: 'Pipeline Pro Junior',
    locationDate: 'North Shore, Oahu • June 15',
    badges: [
      { text: 'Reef Break', color: '#F59E0B' },
      { text: 'Advanced', color: '#F43F5E' }
    ]
  }));

  const heatCompetitors = [
    { name: 'Chloe Kim', rank: '2nd', seed: '4', highlight: true },
    { name: 'Sierra Kerr', rank: '1st', seed: '1', highlight: false },
    { name: 'Caitlin Simmers', rank: '3rd', seed: '7', highlight: false },
    { name: 'Erin Brooks', rank: '4th', seed: '12', highlight: false }
  ];

  const pastResults = [
    { event: 'Quiksilver Young Guns', placement: '1st', score: '16.42', highlightPlace: true },
    { event: 'Trestles Junior Open', placement: '3rd', score: '14.10', highlightPlace: false },
    { event: 'Rip Curl GromSearch', placement: 'SF', score: '12.50', highlightPlace: false }
  ];

  return (
    <div className="cmp-page">
      <Sidebar />
      <main className="cmp-main">
        {/* Header */}
        <header className="cmp-header">
          <h1 className="cmp-title">Competitions</h1>
        </header>

        {/* Layout */}
        <div className="cmp-layout">
          {/* Left Column: Upcoming Events */}
          <div className="cmp-col-left">
            <h2 className="cmp-section-title">Upcoming Events</h2>
            
            <div className="cmp-events-list">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="cmp-event-card">
                  <div className="cmp-event-info">
                    <div className="cmp-event-name">{event.name}</div>
                    <div className="cmp-event-loc">{event.locationDate}</div>
                    
                    <div className="cmp-badges">
                      {event.badges.map((badge, index) => (
                        <span 
                          key={index} 
                          className="cmp-badge"
                          style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                        >
                          {badge.text}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="cmp-btn-register">Register Now</button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Live & History */}
          <div className="cmp-col-right">
            
            {/* Live Competition Card */}
            <div className="cmp-live-card">
              
              <div className="cmp-live-header-row">
                <div className="cmp-live-titles">
                  <span className="cmp-live-badge">LIVE COMPETITION</span>
                  <h1 className="cmp-live-main-title">Gold Coast Junior Open 2025</h1>
                  <p className="cmp-live-sub">Snapper Rocks, QLD • Australia</p>
                </div>
                
                <div className="cmp-live-countdown">
                  <span className="cmp-countdown-label">HEAT COUNTDOWN</span>
                  <div className="cmp-countdown-time">04:12:00</div>
                </div>
              </div>

              <div className="cmp-heat-section">
                <h3 className="cmp-heat-title">Chloe's Heat: Round 2, Heat 4</h3>
                
                <div className="cmp-heat-table-wrapper">
                  <table className="cmp-heat-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Competitor</th>
                        <th style={{ textAlign: 'right' }}>Rank</th>
                        <th style={{ textAlign: 'right' }}>Seed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heatCompetitors.map((comp, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: 'left', color: '#FFF' }}>{comp.name}</td>
                          <td style={{ textAlign: 'right', color: comp.highlight ? '#0D9488' : '#FFF' }}>{comp.rank}</td>
                          <td style={{ textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>{comp.seed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Competition History */}
            <div className="cmp-history-card">
              <h2 className="cmp-section-title">Competition History</h2>
              
              <div className="cmp-history-table-wrapper">
                <table className="cmp-history-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>EVENT</th>
                      <th style={{ textAlign: 'right' }}>PLACEMENT</th>
                      <th style={{ textAlign: 'right' }}>SCORE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastResults.map((result, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'left', color: '#000' }}>{result.event}</td>
                        <td style={{ textAlign: 'right', color: result.highlightPlace ? '#F59E0B' : '#0F172A', fontWeight: '700' }}>{result.placement}</td>
                        <td style={{ textAlign: 'right', color: '#64748B' }}>{result.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>

      <style>{`
        .cmp-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .cmp-main { flex: 1; padding: 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }

        /* Header */
        .cmp-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #050B1A; margin: 0; line-height: 1.2; }

        /* Layout */
        .cmp-layout { display: flex; gap: 32px; align-items: flex-start; }

        /* Left Column */
        .cmp-col-left { display: flex; flex-direction: column; gap: 20px; width: 340px; flex-shrink: 0; }
        .cmp-section-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #000; margin: 0; }
        
        .cmp-events-list { display: flex; flex-direction: column; gap: 16px; }
        .cmp-event-card {
          background: #FFFFFF; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0px 4px 16px rgba(5, 11, 26, 0.02);
          border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 16px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cmp-event-card:hover {
          transform: translateY(-4px);
          box-shadow: 0px 12px 32px rgba(5, 11, 26, 0.06);
          border-color: rgba(5, 11, 26, 0.08);
        }
        .cmp-event-info { display: flex; flex-direction: column; gap: 4px; }
        .cmp-event-name { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #000; }
        .cmp-event-loc { font-size: 12px; color: #64748B; }
        .cmp-badges { display: flex; gap: 8px; margin-top: 4px; }
        .cmp-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .cmp-btn-register {
          width: 100%; padding: 12px 0; background: #0D9488; border-radius: 10px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #FFF; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
        }
        .cmp-btn-register:hover {
          background: #0B7A70;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.4);
        }

        /* Right Column */
        .cmp-col-right { flex: 1; display: flex; flex-direction: column; gap: 24px; }

        /* Live Competition Card */
        .cmp-live-card {
          background: #050B1A; border: 1px solid rgba(226, 232, 240, 0.1); 
          box-shadow: 0px 24px 48px rgba(5, 11, 26, 0.15), inset 0 1px 1px rgba(255,255,255,0.05);
          border-radius: 24px; padding: 48px; display: flex; flex-direction: column; gap: 32px;
          position: relative; overflow: hidden;
        }
        .cmp-live-card::before {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, transparent 60%);
          pointer-events: none;
        }
        .cmp-live-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .cmp-live-titles { display: flex; flex-direction: column; gap: 8px; }
        .cmp-live-badge {
          display: inline-flex; align-items: center; justify-content: center; padding: 4px 8px; width: fit-content;
          background: rgba(13, 148, 136, 0.12); border-radius: 4px; color: #0D9488;
          font-size: 12px; font-weight: 700; text-transform: uppercase;
        }
        .cmp-live-main-title { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 700; color: #FFF; margin: 0; }
        .cmp-live-sub { font-size: 16px; color: rgba(255,255,255,0.6); margin: 0; }

        .cmp-live-countdown { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .cmp-countdown-label { font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase; }
        .cmp-countdown-time { font-family: 'Outfit', sans-serif; font-size: 40px; font-weight: 800; color: #F59E0B; line-height: 1; }

        .cmp-heat-section { display: flex; flex-direction: column; gap: 16px; }
        .cmp-heat-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #FFF; margin: 0; }
        
        .cmp-heat-table-wrapper { background: rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; }
        .cmp-heat-table { width: 100%; border-collapse: collapse; }
        .cmp-heat-table th {
          padding: 12px 16px; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.02);
        }
        .cmp-heat-table td {
          padding: 16px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.07);
          transition: background 0.2s ease;
        }
        .cmp-heat-table tr:hover td { background: rgba(255,255,255,0.03); }
        .cmp-heat-table tr:last-child td { border-bottom: none; }

        /* Competition History */
        .cmp-history-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; box-shadow: 0px 8px 24px rgba(0,0,0,0.03);
          border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 20px;
        }
        .cmp-history-table-wrapper { border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; }
        .cmp-history-table { width: 100%; border-collapse: collapse; }
        .cmp-history-table th {
          padding: 16px; font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase;
          background: #F8F6F2; border-bottom: 1px solid #E2E8F0;
        }
        .cmp-history-table td {
          padding: 16px; font-size: 14px; border-bottom: 1px solid #E2E8F0;
          transition: background 0.2s ease;
        }
        .cmp-history-table tr:hover td { background: rgba(248, 250, 252, 0.5); }
        .cmp-history-table tr:last-child td { border-bottom: none; }
      `}</style>
    </div>
  );
};

export default Competitions;
