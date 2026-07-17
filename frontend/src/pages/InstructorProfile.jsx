import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:8000';

const InstructorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock data for students and sessions based on design
  const assignedStudents = [
    { id: 1, name: 'Chloe Kim', level: 'Intermediate', active: 'Yesterday', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100' },
    { id: 2, name: 'John Miller', level: 'Beginner', active: 'Today', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
    { id: 3, name: 'Emma Watson', level: 'Intermediate', active: '2 days ago', image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100' },
    { id: 4, name: 'Rick Grimes', level: 'Advanced', active: '3 days ago', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' },
  ];

  const recentSessions = [
    { id: 1, student: 'John Miller', details: 'Manly Beach • 4-6ft Swell', type: '6 Wave Analysis' },
    { id: 2, student: 'Chloe Kim', details: 'Manly Beach • 4-6ft Swell', type: '6 Wave Analysis' },
  ];

  useEffect(() => {
    // We try to fetch, if it fails, we mock
    fetch(`${API}/api/instructors`)
      .then(r => r.json())
      .then(data => {
        const found = data.find(i => i.id === parseInt(id));
        if (found) setInstructor(found);
      })
      .catch(() => {
        // Mock data based on design
        setInstructor({
          id: 1,
          name: 'Marcus Silva',
          age: 32,
          gender: 'Male',
          fitness_level: 'Elite',
          experience: '8 Years',
          languages: 'English, Portuguese',
          location: 'Gold Coast, AUS',
          bio: 'Professional surfer with a passion for teaching the next generation of chargers. Specialized in big wave performance and competitive strategy.',
          certifications: ['ISA Level 2 Coach', 'WSL Competition Judge', 'Advanced First Aid & Rescue'],
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="db-page"><Sidebar /><main className="db-main"><div className="db-loading"><div className="db-spinner" /></div></main></div>;
  if (!instructor) return <div className="db-page"><Sidebar /><main className="db-main">Instructor not found</main></div>;

  return (
    <div className="ip-page">
      <Sidebar />
      <main className="ip-main">
        {/* Hero */}
        <section className="ip-hero">
          <img src={instructor.image} alt={instructor.name} className="ip-hero-avatar" />
          <div className="ip-hero-info">
            <h1 className="ip-hero-name">{instructor.name}</h1>
            <p className="ip-hero-sub">Age {instructor.age} • {instructor.location || 'Gold Coast, AUS'}</p>
            <div className="ip-hero-badges">
              <span className="ip-badge-primary">ISA CERTIFIED</span>
              <span className="ip-badge-active">ACTIVE</span>
            </div>
          </div>
        </section>

        <div className="ip-grid">
          {/* Left Column */}
          <div className="ip-col-left">
            {/* Personal Details */}
            <div className="ip-card">
              <h3 className="ip-card-title">Personal Details</h3>
              <div className="ip-details-list">
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Fitness Level</span>
                  <span className="ip-detail-value">{instructor.fitness_level}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Experience</span>
                  <span className="ip-detail-value">{instructor.experience}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Languages</span>
                  <span className="ip-detail-value">{instructor.languages || 'English'}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Location</span>
                  <span className="ip-detail-value">{instructor.location || 'Gold Coast, AUS'}</span>
                </div>
              </div>
              <div className="ip-divider" />
              <div className="ip-bio">
                <span className="ip-bio-label">Bio</span>
                <p className="ip-bio-text">{instructor.bio || 'Passionate surf coach.'}</p>
              </div>
            </div>

            {/* Certifications */}
            <div className="ip-card">
              <h3 className="ip-card-title">Certifications</h3>
              <ul className="ip-cert-list">
                {instructor.certifications.map(cert => (
                  <li key={cert} className="ip-cert-item">
                    <div className="ip-cert-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <span>{cert}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column */}
          <div className="ip-col-right">
            {/* Stats Row */}
            <div className="ip-stats-row">
              <div className="ip-card ip-stat-card">
                <span className="ip-stat-label">SESSIONS / MONTH</span>
                <div className="ip-chart">
                  {[12, 27, 18, 48, 39, 54, 45, 60].map((h, i) => (
                    <div key={i} className="ip-bar" style={{ height: `${h}px` }} />
                  ))}
                </div>
              </div>
              <div className="ip-card ip-stat-card">
                <span className="ip-stat-label">SUCCESS RATE</span>
                <div className="ip-stat-big">
                  <span className="ip-stat-number">94%</span>
                  <span className="ip-stat-trend">↑ 4% vs last period</span>
                </div>
              </div>
            </div>

            {/* Assigned Students */}
            <div className="ip-card">
              <h3 className="ip-card-title">Assigned Students ({assignedStudents.length})</h3>
              <div className="ip-student-list">
                {assignedStudents.map((s, i) => (
                  <div key={s.id} className="ip-student-row" style={{ borderBottom: i === assignedStudents.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                    <div className="ip-student-info">
                      <img src={s.image} alt={s.name} className="ip-student-avatar" />
                      <div>
                        <div className="ip-student-name">{s.name}</div>
                        <div className="ip-student-time">{s.active}</div>
                      </div>
                    </div>
                    <span className={`ip-level-badge level-${s.level.toLowerCase()}`}>{s.level}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Session Activity */}
            <div className="ip-card">
              <h3 className="ip-card-title">Recent Session Activity</h3>
              <div className="ip-activity-list">
                {recentSessions.map((session, index) => (
                  <div key={session.id} className="ip-activity-row">
                    <div className="ip-activity-icon" />
                    <div className="ip-activity-info">
                      <div className="ip-activity-title">Session with {session.student}</div>
                      <div className="ip-activity-sub">{session.details}</div>
                    </div>
                    <span className="ip-badge-primary">{session.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .ip-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .ip-main { flex: 1; padding: 40px 80px; overflow-y: auto; display: flex; flex-direction: column; gap: 32px; }
        
        /* Hero */
        .ip-hero {
          display: flex; align-items: center; gap: 24px; padding: 32px;
          background: #050B1A; border-radius: 24px;
        }
        .ip-hero-avatar { width: 120px; height: 120px; border-radius: 60px; object-fit: cover; }
        .ip-hero-info { display: flex; flex-direction: column; gap: 12px; }
        .ip-hero-name { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 800; color: #FFF; margin: 0; line-height: 1; }
        .ip-hero-sub { font-size: 18px; color: rgba(255,255,255,0.6); margin: 0; }
        .ip-hero-badges { display: flex; gap: 8px; }
        .ip-badge-primary {
          background: rgba(13, 148, 136, 0.12); color: #0D9488;
          padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;
        }
        .ip-badge-active {
          background: rgba(255, 255, 255, 0.25); color: #FFF;
          padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;
        }

        /* Grid */
        .ip-grid { display: flex; gap: 32px; }
        .ip-col-left { display: flex; flex-direction: column; gap: 32px; width: 400px; flex-shrink: 0; }
        .ip-col-right { display: flex; flex-direction: column; gap: 32px; flex: 1; }

        /* Card common */
        .ip-card {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .ip-card-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0; }

        /* Left Column Details */
        .ip-details-list { display: flex; flex-direction: column; gap: 16px; }
        .ip-detail-row { display: flex; justify-content: space-between; }
        .ip-detail-label { font-size: 12px; color: #64748B; }
        .ip-detail-value { font-size: 12px; font-weight: 700; color: #0F172A; }
        .ip-divider { height: 1px; background: #E2E8F0; width: 100%; margin: 8px 0; }
        .ip-bio { display: flex; flex-direction: column; gap: 8px; }
        .ip-bio-label { font-size: 12px; font-weight: 700; color: #0F172A; }
        .ip-bio-text { font-size: 14px; color: #64748B; line-height: 1.5; margin: 0; }
        
        .ip-cert-list { display: flex; flex-direction: column; gap: 12px; list-style: none; padding: 0; margin: 0; }
        .ip-cert-item { display: flex; align-items: center; gap: 12px; font-size: 12px; font-weight: 500; color: #0F172A; }
        .ip-cert-icon {
          width: 24px; height: 24px; background: rgba(13, 148, 136, 0.12); border-radius: 12px;
          display: flex; align-items: center; justify-content: center; color: #0D9488;
        }

        /* Right Column */
        .ip-stats-row { display: flex; gap: 16px; }
        .ip-stat-card { flex: 1; gap: 16px; justify-content: space-between; }
        .ip-stat-label { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; }
        .ip-chart { display: flex; align-items: flex-end; gap: 8px; height: 60px; }
        .ip-bar { width: 39px; background: #0D9488; border-radius: 2px; }
        .ip-stat-big { display: flex; flex-direction: column; }
        .ip-stat-number { font-family: 'Outfit', sans-serif; font-size: 40px; font-weight: 700; color: #0D9488; line-height: 1.2; }
        .ip-stat-trend { font-size: 12px; color: #0D9488; }

        /* Students */
        .ip-student-list { display: flex; flex-direction: column; }
        .ip-student-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
        .ip-student-row:first-child { padding-top: 0; }
        .ip-student-row:last-child { padding-bottom: 0; }
        .ip-student-info { display: flex; align-items: center; gap: 16px; }
        .ip-student-avatar { width: 40px; height: 40px; border-radius: 20px; object-fit: cover; }
        .ip-student-name { font-size: 12px; font-weight: 700; color: #0F172A; }
        .ip-student-time { font-size: 13px; color: #64748B; margin-top: 2px; }
        
        .ip-level-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .level-beginner { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
        .level-intermediate { background: rgba(13, 148, 136, 0.12); color: #0D9488; }
        .level-advanced { background: rgba(124, 58, 237, 0.12); color: #7C3AED; }

        /* Activity */
        .ip-activity-list { display: flex; flex-direction: column; gap: 12px; }
        .ip-activity-row {
          display: flex; align-items: center; padding: 16px; gap: 16px;
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px;
        }
        .ip-activity-icon { width: 12px; height: 12px; border-radius: 6px; background: #0D9488; flex-shrink: 0; }
        .ip-activity-info { flex: 1; }
        .ip-activity-title { font-size: 12px; font-weight: 500; color: #0F172A; }
        .ip-activity-sub { font-size: 13px; color: #64748B; margin-top: 4px; }
      `}</style>
    </div>
  );
};

export default InstructorProfile;
