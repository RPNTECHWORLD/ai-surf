import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:8000';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock data based on Figma design
  const mockStudent = {
    id: id,
    name: 'Chloe Kim',
    level: 'Intermediate',
    instructor: 'Marcus Silva',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    nextSession: {
      time: 'Tomorrow, 08:30 AM',
      details: 'Waikiki Beach • Intro to Barrels'
    },
    sessionHistory: [
      { id: 1, date: 'Oct 24', title: 'Clean Swell Performance', coach: 'Coach Marcus' },
      { id: 2, date: 'Oct 18', title: 'Pop-up Speed Drill', coach: 'Coach Marcus' },
      { id: 3, date: 'Oct 12', title: 'Intro to Duck Diving', coach: 'Coach Marcus' }
    ],
    badges: [
      { id: 1, name: 'White Badge', date: 'Earned Jan 12', color: '#E2E8F0', textColor: '#0F172A' },
      { id: 2, name: 'Yellow Badge', date: 'Earned Apr 05', color: '#F59E0B', textColor: '#0F172A' }
    ],
    videos: [
      { id: 1, image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=300', status: 'Analyzed', statusColor: 'teal' },
      { id: 2, image: 'https://images.unsplash.com/photo-1537519646099-335112f03225?auto=format&fit=crop&q=80&w=300', status: 'Processing', statusColor: 'orange' },
      { id: 3, image: 'https://images.unsplash.com/photo-1517436073-3b3b276b1f23?auto=format&fit=crop&q=80&w=300', status: 'Analyzed', statusColor: 'teal' }
    ]
  };

  useEffect(() => {
    // Attempt fetch, fallback to mock
    fetch(`${API}/api/students/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => setStudent(data))
      .catch(() => setStudent(mockStudent))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="db-page"><Sidebar /><main className="db-main"><div className="db-loading"><div className="db-spinner" /></div></main></div>;
  if (!student) return <div className="db-page"><Sidebar /><main className="db-main">Student not found</main></div>;

  return (
    <div className="sp-page">
      <Sidebar />
      <main className="sp-main">
        {/* Hero Section */}
        <section className="sp-hero">
          <img src={student.image} alt={student.name} className="sp-avatar" />
          <div className="sp-hero-info">
            <h1 className="sp-name">{student.name}</h1>
            <div className="sp-hero-meta">
              <span className={`sp-level-badge level-${student.level.toLowerCase()}`}>{student.level}</span>
              <div className="sp-meta-dot" />
              <span className="sp-instructor-text">Instructor: {student.instructor}</span>
            </div>
          </div>
        </section>

        <div className="sp-content">
          {/* Left Column */}
          <div className="sp-col-left">
            {/* Next Session Card */}
            <div className="sp-next-session">
              <span className="sp-ns-label">NEXT SESSION</span>
              <div className="sp-ns-details">
                <div className="sp-ns-time">{student.nextSession.time}</div>
                <div className="sp-ns-loc">{student.nextSession.details}</div>
              </div>
            </div>

            {/* Session History */}
            <div className="sp-card">
              <h2 className="sp-card-title">Session History</h2>
              <div className="sp-history-list">
                {student.sessionHistory.map((session, index) => (
                  <div key={session.id} className="sp-history-item">
                    <div className="sp-timeline">
                      <div className="sp-timeline-dot" />
                      {index < student.sessionHistory.length - 1 && <div className="sp-timeline-line" />}
                    </div>
                    <div className="sp-history-content">
                      <span className="sp-history-date">{session.date}</span>
                      <h3 className="sp-history-title">{session.title}</h3>
                      <span className="sp-history-coach">{session.coach}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="sp-col-right">
            {/* Top Row: Skill Tracker & Badge History */}
            <div className="sp-row-top">
              {/* Skill Tracker */}
              <div className="sp-card sp-skill-card">
                <h2 className="sp-card-title">Skill Tracker</h2>
                <div className="sp-radar-container">
                  <div className="sp-radar-mock">
                    <div className="sp-radar-poly sp-poly-lg" />
                    <div className="sp-radar-poly sp-poly-md" />
                    <div className="sp-radar-poly sp-poly-sm" />
                    <div className="sp-radar-fill" />
                    <span className="sp-radar-label label-top">BALANCE</span>
                    <span className="sp-radar-label label-bottom">PADDLING</span>
                    <span className="sp-radar-label label-left">POP-UP</span>
                    <span className="sp-radar-label label-right">STAMINA</span>
                  </div>
                </div>
              </div>

              {/* Badge History */}
              <div className="sp-card sp-badge-card">
                <h2 className="sp-card-title">Badge History</h2>
                <div className="sp-badge-list">
                  {student.badges.map(badge => (
                    <div key={badge.id} className="sp-badge-item">
                      <div className="sp-badge-icon" style={{ backgroundColor: badge.color }} />
                      <div className="sp-badge-info">
                        <div className="sp-badge-name" style={{ color: badge.textColor }}>{badge.name}</div>
                        <div className="sp-badge-date">{badge.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Video Analysis */}
            <div className="sp-card">
              <h2 className="sp-card-title">Video Analysis</h2>
              <div className="sp-video-grid">
                {student.videos.map(video => (
                  <div key={video.id} className="sp-video-card" style={{ backgroundImage: `url(${video.image})` }}>
                    <div className="sp-video-overlay">
                      <div className={`sp-video-status status-${video.statusColor}`}>
                        {video.status}
                      </div>
                      <div className="sp-play-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .sp-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .sp-main { flex: 1; padding: 40px 80px; overflow-y: auto; display: flex; flex-direction: column; gap: 32px; }

        /* Hero */
        .sp-hero {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px;
          padding: 32px; display: flex; align-items: center; gap: 24px;
          box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.06);
        }
        .sp-avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; }
        .sp-hero-info { display: flex; flex-direction: column; gap: 8px; }
        .sp-name { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.2; }
        .sp-hero-meta { display: flex; align-items: center; gap: 12px; }
        
        .sp-level-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .level-beginner { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
        .level-intermediate { background: rgba(13, 148, 136, 0.12); color: #0D9488; }
        .level-advanced { background: rgba(124, 58, 237, 0.12); color: #7C3AED; }
        
        .sp-meta-dot { width: 6px; height: 6px; background: #E2E8F0; border-radius: 50%; }
        .sp-instructor-text { font-size: 13px; color: #64748B; font-weight: 500; }

        /* Two Column Layout */
        .sp-content { display: flex; gap: 32px; }
        .sp-col-left { display: flex; flex-direction: column; gap: 32px; width: 380px; flex-shrink: 0; }
        .sp-col-right { display: flex; flex-direction: column; gap: 32px; flex: 1; }

        /* Cards */
        .sp-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
        .sp-card-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0; }

        /* Next Session Card */
        .sp-next-session { background: #0D9488; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .sp-ns-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; }
        .sp-ns-details { display: flex; flex-direction: column; gap: 4px; }
        .sp-ns-time { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: #FFF; }
        .sp-ns-loc { font-size: 13px; color: rgba(255,255,255,0.8); }

        /* Session History Timeline */
        .sp-history-list { display: flex; flex-direction: column; gap: 0; }
        .sp-history-item { display: flex; gap: 16px; }
        .sp-timeline { display: flex; flex-direction: column; align-items: center; width: 12px; }
        .sp-timeline-dot { width: 12px; height: 12px; border-radius: 50%; background: #0D9488; flex-shrink: 0; }
        .sp-timeline-line { width: 2px; height: 100%; background: #E2E8F0; margin-top: 4px; margin-bottom: 4px; min-height: 40px; }
        .sp-history-content { display: flex; flex-direction: column; gap: 2px; padding-bottom: 24px; }
        .sp-history-date { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; }
        .sp-history-title { font-size: 14px; font-weight: 600; color: #0F172A; margin: 2px 0; }
        .sp-history-coach { font-size: 13px; color: #64748B; }
        .sp-history-item:last-child .sp-history-content { padding-bottom: 0; }

        /* Top Row (Radar & Badges) */
        .sp-row-top { display: flex; gap: 32px; }
        .sp-skill-card { flex: 1.5; }
        .sp-badge-card { flex: 1; }

        /* Radar Chart Mock */
        .sp-radar-container { display: flex; justify-content: center; align-items: center; padding: 20px 0; }
        .sp-radar-mock { position: relative; width: 180px; height: 180px; display: flex; justify-content: center; align-items: center; }
        .sp-radar-poly { position: absolute; border: 1px solid #E2E8F0; transform: rotate(45deg); }
        .sp-poly-lg { width: 180px; height: 180px; }
        .sp-poly-md { width: 120px; height: 120px; }
        .sp-poly-sm { width: 60px; height: 60px; }
        .sp-radar-fill { position: absolute; width: 140px; height: 130px; background: rgba(13, 148, 136, 0.3); border: 2px solid #0D9488; clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%); }
        .sp-radar-label { position: absolute; font-size: 10px; color: #64748B; font-weight: 600; letter-spacing: 0.5px; }
        .label-top { top: -20px; left: 50%; transform: translateX(-50%); }
        .label-bottom { bottom: -20px; left: 50%; transform: translateX(-50%); }
        .label-left { left: -30px; top: 50%; transform: translateY(-50%); }
        .label-right { right: -35px; top: 50%; transform: translateY(-50%); }

        /* Badge History */
        .sp-badge-list { display: flex; flex-direction: column; gap: 16px; }
        .sp-badge-item { display: flex; align-items: center; gap: 12px; }
        .sp-badge-icon { width: 40px; height: 40px; border-radius: 50%; }
        .sp-badge-info { display: flex; flex-direction: column; }
        .sp-badge-name { font-size: 13px; font-weight: 700; color: #0F172A; }
        .sp-badge-date { font-size: 12px; color: #64748B; margin-top: 2px; }

        /* Video Grid */
        .sp-video-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .sp-video-card { height: 160px; border-radius: 12px; background-size: cover; background-position: center; position: relative; overflow: hidden; }
        .sp-video-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.25); display: flex; justify-content: center; align-items: center;
        }
        .sp-video-status { position: absolute; top: 8px; left: 8px; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .status-teal { background: rgba(13, 148, 136, 0.9); color: #FFF; }
        .status-orange { background: rgba(245, 158, 11, 0.9); color: #FFF; }
        .sp-play-btn { width: 48px; height: 48px; border-radius: 50%; border: 2px solid #FFF; display: flex; align-items: center; justify-content: center; color: #FFF; background: rgba(255,255,255,0.2); cursor: pointer; transition: background 0.2s; }
        .sp-play-btn:hover { background: rgba(255,255,255,0.4); }
      `}</style>
    </div>
  );
};

export default StudentProfile;
