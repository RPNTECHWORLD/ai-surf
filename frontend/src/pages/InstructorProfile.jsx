import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = 'http://54.242.160.238:8000';

const InstructorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth states
  const [currentUser, setCurrentUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    experience: '',
    fitness_level: 'Elite',
    rates: '',
    location: '',
    specializations: [],
    certifications: ''
  });

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

  const fetchInstructor = () => {
    fetch(`${API}/api/instructors/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        if (!data.specializations) data.specializations = [];
        if (!data.certifications) data.certifications = [];
        if (!data.reviews) data.reviews = [];
        setInstructor(data);
      })
      .catch(() => {
        // Mock data based on design
        setInstructor({
          id: parseInt(id),
          name: 'Kai Lenny',
          age: 30,
          gender: 'Male',
          fitness_level: 'Elite',
          experience: '12 Years',
          certifications: ['ISA Level 2', 'CPR'],
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
          bio: 'Professional surfer with a passion for teaching the next generation of chargers. Specialized in big wave performance and competitive strategy.',
          specializations: ['S&C', 'Video Analysis', 'Big Wave'],
          rates: '$150 / hr',
          location: 'Maui, Hawaii',
          reviews: [
            { student: 'Emma Watson', rating: 5, comment: 'Kai is an incredible coach! He breaks down paddling technique so clearly.' }
          ]
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {}
    }
    fetchInstructor();
  }, [id]);

  const handleEditClick = () => {
    setEditForm({
      name: instructor.name || '',
      bio: instructor.bio || '',
      experience: instructor.experience || '',
      fitness_level: instructor.fitness_level || 'Elite',
      rates: instructor.rates || '$75 / hr',
      location: instructor.location || '',
      specializations: instructor.specializations || [],
      certifications: (instructor.certifications || []).join('\n')
    });
    setShowEditModal(true);
  };

  const handleCheckboxChange = (spec) => {
    const specs = [...editForm.specializations];
    if (specs.includes(spec)) {
      setEditForm({ ...editForm, specializations: specs.filter(s => s !== spec) });
    } else {
      setEditForm({ ...editForm, specializations: [...specs, spec] });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/instructors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editForm.name,
          bio: editForm.bio,
          experience: editForm.experience,
          fitness_level: editForm.fitness_level,
          specializations: editForm.specializations,
          rates: editForm.rates,
          location: editForm.location,
          certifications: editForm.certifications.split('\n').filter(c => c.trim() !== '')
        })
      });

      if (res.ok) {
        if (currentUser && currentUser.instructor_id === parseInt(id) && editForm.name !== currentUser.name) {
          const updatedUser = { ...currentUser, name: editForm.name };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        setShowEditModal(false);
        fetchInstructor();
      } else {
        alert('Failed to save profile changes.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to the server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="db-page"><Sidebar /><main className="db-main"><div className="db-loading"><div className="db-spinner" /></div></main></div>;
  if (!instructor) return <div className="db-page"><Sidebar /><main className="db-main">Instructor not found</main></div>;

  const isOwnProfile = currentUser && (
    (currentUser.role === 'coach' && currentUser.instructor_id === parseInt(id)) ||
    (currentUser.role === 'admin')
  );

  return (
    <div className="ip-page">
      <Sidebar />
      <main className="ip-main">
        {/* Hero */}
        <section className="ip-hero">
          <img src={instructor.image} alt={instructor.name} className="ip-hero-avatar" />
          <div className="ip-hero-info">
            <h1 className="ip-hero-name">{instructor.name}</h1>
            <p className="ip-hero-sub">Age {instructor.age || 30} • {instructor.location || 'Gold Coast, AUS'}</p>
            <div className="ip-hero-badges">
              <span className="ip-badge-primary">ISA CERTIFIED</span>
              <span className="ip-badge-active">ACTIVE</span>
            </div>
          </div>
          {isOwnProfile && (
            <button className="btn-secondary edit-profile-btn" onClick={handleEditClick} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Profile
            </button>
          )}
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
                  <span className="ip-detail-label">Hourly Rate</span>
                  <span className="ip-detail-value">{instructor.rates || '$50 / hr'}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Location</span>
                  <span className="ip-detail-value">{instructor.location || 'Gold Coast, AUS'}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Specializations</span>
                  <span className="ip-detail-value" style={{ maxWidth: '180px', textAlign: 'right', whiteSpace: 'normal' }}>
                    {(instructor.specializations || []).join(', ') || 'General Surf'}
                  </span>
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
                {instructor.certifications && instructor.certifications.map(cert => (
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

            {/* Student Reviews */}
            {instructor.reviews && instructor.reviews.length > 0 && (
              <div className="ip-card">
                <h3 className="ip-card-title">Student Reviews</h3>
                <div className="ip-reviews-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {instructor.reviews.map((r, idx) => (
                    <div key={idx} className="ip-review-item" style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '13px', color: '#0F172A' }}>{r.student}</strong>
                        <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 700 }}>{'★'.repeat(r.rating || 5)}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.4 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

        {/* EDIT PROFILE MODAL */}
        {showEditModal && (
          <div className="sp-modal-overlay">
            <div className="sp-modal glass">
              <div className="sp-modal-header">
                <h3>Edit Coach Profile</h3>
                <button className="sp-modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="sp-modal-body">
                  <div className="sp-form-field">
                    <label>Full Name</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label>Experience</label>
                      <input type="text" value={editForm.experience} onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })} placeholder="e.g. 8 Years" />
                    </div>
                    <div className="sp-form-field">
                      <label>Fitness Level</label>
                      <select value={editForm.fitness_level} onChange={(e) => setEditForm({ ...editForm, fitness_level: e.target.value })}>
                        <option value="Elite">Elite</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Beginner">Beginner</option>
                      </select>
                    </div>
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label>Hourly Rate</label>
                      <input type="text" value={editForm.rates} onChange={(e) => setEditForm({ ...editForm, rates: e.target.value })} placeholder="e.g. $100 / hr" />
                    </div>
                    <div className="sp-form-field">
                      <label>Location / Region</label>
                      <input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="e.g. Maui, Hawaii" />
                    </div>
                  </div>

                  <div className="sp-form-field">
                    <label>Bio</label>
                    <textarea rows="3" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Write your coaching bio..."></textarea>
                  </div>

                  <div className="sp-form-field">
                    <label>Coaching Specializations</label>
                    <div className="specializations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '6px' }}>
                      {['S&C', 'Nutrition', 'Video Analysis', 'Competition Strategy', 'Water Safety', 'Big Wave'].map(spec => (
                        <label key={spec} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={editForm.specializations.includes(spec)} onChange={() => handleCheckboxChange(spec)} />
                          <span>{spec}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="sp-form-field">
                    <label>Certifications (one certification per line)</label>
                    <textarea rows="3" value={editForm.certifications} onChange={(e) => setEditForm({ ...editForm, certifications: e.target.value })} placeholder="e.g. ISA Level 2 Coach"></textarea>
                  </div>
                </div>
                <div className="sp-modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .ip-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .ip-main { flex: 1; padding: 40px 80px; overflow-y: auto; display: flex; flex-direction: column; gap: 32px; position: relative; }
        
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
        .ip-detail-label { font-size: 13px; color: #64748B; font-weight: 500; }
        .ip-detail-value { font-size: 13px; font-weight: 700; color: #0F172A; }
        .ip-divider { height: 1px; background: #E2E8F0; width: 100%; margin: 8px 0; }
        .ip-bio { display: flex; flex-direction: column; gap: 8px; }
        .ip-bio-label { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
        .ip-bio-text { font-size: 14px; color: #334155; line-height: 1.5; margin: 0; }
        
        .ip-cert-list { display: flex; flex-direction: column; gap: 12px; list-style: none; padding: 0; margin: 0; }
        .ip-cert-item { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 500; color: #0F172A; }
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
        .ip-student-name { font-size: 13px; font-weight: 700; color: #0F172A; }
        .ip-student-time { font-size: 12px; color: #64748B; margin-top: 2px; }
        
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
        .ip-activity-title { font-size: 13px; font-weight: 500; color: #0F172A; }
        .ip-activity-sub { font-size: 12px; color: #64748B; margin-top: 4px; }

        /* Modal styling */
        .sp-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(5, 11, 26, 0.5); display: flex; justify-content: center;
          align-items: center; z-index: 1000; backdrop-filter: blur(4px);
        }
        .sp-modal {
          width: 100%; max-width: 540px; border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column;
          background: #FFFFFF; box-shadow: 0px 20px 40px rgba(0, 0, 0, 0.2); color: #0F172A;
          overflow: hidden;
        }
        .sp-modal-header {
          padding: 20px 24px; border-bottom: 1px solid #E2E8F0;
          display: flex; justify-content: space-between; align-items: center;
        }
        .sp-modal-header h3 { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; margin: 0; }
        .sp-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748B; }
        .sp-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; max-height: 70vh; overflow-y: auto; }
        .sp-form-field { display: flex; flex-direction: column; gap: 8px; }
        .sp-form-field label { font-size: 13px; font-weight: 600; color: #475569; }
        .sp-form-field input,
        .sp-form-field select,
        .sp-form-field textarea {
          padding: 12px; border: 1.5px solid #CBD5E1; border-radius: 10px;
          font-size: 14px; outline: none; transition: border-color 0.2s;
          font-family: inherit;
        }
        .sp-form-field input:focus,
        .sp-form-field select:focus,
        .sp-form-field textarea:focus { border-color: #0D9488; }
        .sp-form-row { display: flex; gap: 16px; }
        .sp-form-row .sp-form-field { flex: 1; }
        .sp-modal-footer {
          padding: 16px 24px; border-top: 1px solid #E2E8F0;
          display: flex; justify-content: flex-end; gap: 12px;
        }
      `}</style>
    </div>
  );
};

export default InstructorProfile;
