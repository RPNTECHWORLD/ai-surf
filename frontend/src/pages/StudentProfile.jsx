import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';


const calculateAge = (dobString) => {
  if (!dobString) return '';
  try {
    const today = new Date();
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  } catch (e) {
    return '';
  }
};

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mockHeats, setMockHeats] = useState([]);
  const [expandedHeatId, setExpandedHeatId] = useState(null);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    age: '',
    division: '',
    stance: 'regular',
    waves_ridden: 0,
    max_speed: '0 mph',
    avg_session_mins: 0,
    performance_logs: '',
    whatsapp_number: '',
    guests_count: 1,
    course_duration: '3 Days Course',
    start_date: '',
    end_date: '',
    session_time: 'Morning 6:00 AM',
    staying_at_school: 'Yes',
    reminder_preference: 'WhatsApp Text',
    guests_details: []
  });

  // Dynamic fallback for registered surfer (never hardcoded Chloe Kim)
  const getFallbackStudent = () => {
    const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    return {
      id: id,
      name: savedUser.name || 'Registered Surfer',
      email: savedUser.email || '',
      level: 'Beginner',
      instructor: 'Aquatic Indica Surf Coach',
      image: savedUser.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
      bio: 'Registered athlete at Aquatic Indica Surf School.',
      age: 24,
      division: "Men's Open",
      stance: 'regular',
      surf_stats: { waves_ridden: 0, max_speed: '0 mph', avg_session_mins: 0 },
      performance_logs: [],
      whatsapp_number: '',
      guests_count: 1,
      course_duration: '3 Days Course',
      session_time: 'Morning 6:00 AM',
      staying_at_school: 'Yes',
      reminder_preference: 'WhatsApp Text',
      guests_details: [],
      badges: [
        { id: 1, name: 'White Badge (Student Registered)', date: 'Earned Today', color: '#00F2FE', textColor: '#0F172A' }
      ]
    };
  };

  const fetchStudent = () => {
    fetch(`${API}/api/students/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        const cleanStudent = {
          ...data,
          surf_stats: data.surf_stats && Object.keys(data.surf_stats).length > 0
            ? data.surf_stats
            : { waves_ridden: 0, max_speed: '0 mph', avg_session_mins: 0 },
          performance_logs: data.performance_logs || [],
          instructor: data.instructor || 'Aquatic Indica Surf Coach',
          bio: data.bio || 'Registered athlete at Aquatic Indica Surf School.',
          division: data.division || (data.gender === 'Female' ? "Women's Open" : "Men's Open"),
          badges: (data.badges && data.badges.length > 0)
            ? data.badges.map((b, bIdx) => ({
                id: bIdx + 1,
                name: `${b} Badge`,
                date: 'Earned',
                color: b === 'YELLOW' ? '#F59E0B' : b === 'GREEN' ? '#10B981' : b === 'BLUE' ? '#3B82F6' : b === 'RED' ? '#EF4444' : '#E2E8F0',
                textColor: b === 'WHITE' ? '#0F172A' : '#FFFFFF'
              }))
            : [
                { id: 1, name: 'White Badge (Student Registered)', date: 'Earned Today', color: '#00F2FE', textColor: '#0F172A' }
              ]
        };
        setStudent(cleanStudent);
      })
      .catch(() => setStudent(getFallbackStudent()))
      .finally(() => setLoading(false));
  };

  const fetchMockHeats = () => {
    fetch(`${API}/api/students/${id}/mock-heats`)
      .then(res => res.json())
      .then(setMockHeats)
      .catch(() => {});
  };

  useEffect(() => {
    // Get auth user
    const saved = sessionStorage.getItem('user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {}
    }
    fetchStudent();
    fetchMockHeats();
  }, [id]);

  const toggleHeatExpand = (heatId) => {
    setExpandedHeatId(expandedHeatId === heatId ? null : heatId);
  };

  const handleEditClick = () => {
    setEditForm({
      name: student.name || '',
      bio: student.bio || '',
      dob: student.dob || '',
      age: student.age || '',
      division: student.division || "Men's Open",
      stance: student.stance || 'regular',
      waves_ridden: student.surf_stats?.waves_ridden || 0,
      max_speed: student.surf_stats?.max_speed || '0 mph',
      avg_session_mins: student.surf_stats?.avg_session_mins || 0,
      performance_logs: (student.performance_logs || []).join('\n'),
      whatsapp_number: student.whatsapp_number || '',
      guests_count: student.guests_count || 1,
      course_duration: student.course_duration || '3 Days Course',
      start_date: student.start_date || '',
      end_date: student.end_date || '',
      session_time: student.session_time || 'Morning 6:00 AM',
      staying_at_school: student.staying_at_school || 'Yes',
      reminder_preference: student.reminder_preference || 'WhatsApp Text',
      guests_details: student.guests_details || []
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API}/api/students/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editForm.name,
          bio: editForm.bio,
          dob: editForm.dob || '',
          age: editForm.dob ? calculateAge(editForm.dob) : (editForm.age ? parseInt(editForm.age) : null),
          division: editForm.division,
          stance: editForm.stance,
          surf_stats: {
            waves_ridden: parseInt(editForm.waves_ridden) || 0,
            max_speed: editForm.max_speed,
            avg_session_mins: parseInt(editForm.avg_session_mins) || 0
          },
          performance_logs: editForm.performance_logs.split('\n').filter(l => l.trim() !== ''),
          whatsapp_number: editForm.whatsapp_number,
          guests_count: parseInt(editForm.guests_count) || 1,
          course_duration: editForm.course_duration,
          start_date: editForm.start_date,
          end_date: editForm.end_date,
          session_time: editForm.session_time,
          staying_at_school: editForm.staying_at_school,
          reminder_preference: editForm.reminder_preference,
          guests_details: editForm.guests_details || []
        })
      });

      if (res.ok) {
        // Update user storage if name changed
        if (currentUser && currentUser.student_id === parseInt(id) && editForm.name !== currentUser.name) {
          const updatedUser = { ...currentUser, name: editForm.name };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        setShowEditModal(false);
        fetchStudent();
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
  if (!student) return <div className="db-page"><Sidebar /><main className="db-main">Student not found</main></div>;

  const isOwnProfile = currentUser && (
    (currentUser.role === 'athlete' && currentUser.student_id === parseInt(id)) ||
    (currentUser.role === 'admin')
  );

  const isPendingApproval = currentUser && currentUser.role === 'athlete' && (
    currentUser.approval_status === 'pending' || 
    (() => {
      try {
        const reqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
        const req = reqs.find(r => r.student_email?.toLowerCase() === currentUser.email?.toLowerCase());
        return req && req.status !== 'approved';
      } catch (e) { return false; }
    })()
  );

  return (
    <div className="sp-page">
      <Sidebar />
      <main className="sp-main">
        {/* Pending Approval Warning Banner */}
        {isPendingApproval && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(245,158,11,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '26px' }}>⏳</span>
              <div>
                <h3 style={{ margin: 0, color: '#92400E', fontSize: '15px', fontWeight: 800 }}>Join Request Pending Approval</h3>
                <p style={{ margin: '2px 0 0 0', color: '#B45309', fontSize: '13px' }}>
                  Your join request to <strong>{student?.school || 'your selected Surf School'}</strong> is waiting for School Admin approval.
                </p>
              </div>
            </div>
            <span style={{ background: '#FEF3C7', color: '#D97706', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, border: '1px solid #FDE68A' }}>
              PENDING APPROVAL
            </span>
          </div>
        )}

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
          {isOwnProfile && (
            <button className="btn-secondary edit-profile-btn" onClick={handleEditClick} style={{ marginLeft: 'auto' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Profile
            </button>
          )}
        </section>

        <div className="sp-content">
          {/* Left Column */}
          <div className="sp-col-left">
            {/* Aquatic Indica Active Course Progress Card */}
            <div className="sp-card" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFFFFF', border: '1px solid rgba(0, 242, 254, 0.25)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(0,242,254,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#00F2FE' }}>
                  🏄 Aquatic Indica Surf Course
                </span>
                <span style={{ 
                  background: 'rgba(0, 242, 254, 0.12)', color: '#00F2FE', 
                  border: '1px solid rgba(0, 242, 254, 0.3)', padding: '4px 10px', 
                  borderRadius: '20px', fontSize: '12px', fontWeight: 700 
                }}>
                  {student.course_duration || '3 Days Course'}
                </span>
              </div>

              {/* Course Progress Visualizer */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>
                    Day {student.which_day || 1} of {student.total_days || 3}
                  </span>
                  <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>
                    {student.remaining_days !== undefined ? `${student.remaining_days} Day(s) Left` : 'Active'}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.max(10, ((student.which_day || 1) / (student.total_days || 3)) * 100))}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #00F2FE 0%, #4FACFE 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '18px' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>SESSION TIME</span>
                  <strong style={{ color: '#F1F5F9' }}>⏰ {student.session_time || 'Morning 6:00 AM'}</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>GROUP SIZE</span>
                  <strong style={{ color: '#F1F5F9' }}>
                    👥 {student.guests_details && student.guests_details.length > 0 
                        ? `${student.guests_details.length + 1} Surfers (Primary + ${student.guests_details.length} Guest${student.guests_details.length > 1 ? 's' : ''})`
                        : (student.guests_count > 0 ? `${student.guests_count + 1} Surfers` : '1 Surfer (Solo)')}
                  </strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>STAYING AT SCHOOL</span>
                  <strong style={{ color: student.staying_at_school === 'Yes' ? '#10B981' : '#F59E0B' }}>
                    {student.staying_at_school === 'Yes' ? '🏨 Yes (On-site Lodge)' : '🚗 No (Off-site)'}
                  </strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>REMINDER PREF</span>
                  <strong style={{ color: '#F1F5F9' }}>💬 {student.reminder_preference || 'WhatsApp Text'}</strong>
                </div>
              </div>

              {/* 1-Click WhatsApp Quick Action */}
              {student.wa_link ? (
                <a 
                  href={student.wa_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: '#25D366', color: '#FFFFFF', padding: '12px 16px', borderRadius: '12px',
                    textDecoration: 'none', fontWeight: 700, fontSize: '14px',
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)', transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>1-Click WhatsApp Reminder</span>
                </a>
              ) : (
                <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
                  Add WhatsApp number to enable 1-click reminders
                </div>
              )}
            </div>

            {/* Student Profile Card */}
            <div className="sp-card">
              <h2 className="sp-card-title">Student Profile</h2>
              <div className="sp-details-list">
                <div className="sp-detail-row">
                  <span className="sp-detail-label">Age</span>
                  <span className="sp-detail-value">
                    {student.age ? `${student.age} Years` : 'N/A'} {student.dob ? `(DOB: ${student.dob})` : ''}
                  </span>
                </div>
                <div className="sp-detail-row">
                  <span className="sp-detail-label">Stance</span>
                  <span className="sp-detail-value" style={{ textTransform: 'capitalize' }}>{student.stance || 'Regular'}</span>
                </div>
                <div className="sp-detail-row">
                  <span className="sp-detail-label">Division</span>
                  <span className="sp-detail-value">{student.division || 'N/A'}</span>
                </div>
                <div className="sp-detail-row">
                  <span className="sp-detail-label">Waves Ridden</span>
                  <span className="sp-detail-value">{student.surf_stats?.waves_ridden || 0}</span>
                </div>
                <div className="sp-detail-row">
                  <span className="sp-detail-label">Max Speed</span>
                  <span className="sp-detail-value">{student.surf_stats?.max_speed || '0 mph'}</span>
                </div>
                <div className="sp-detail-row">
                  <span className="sp-detail-label">Avg Session</span>
                  <span className="sp-detail-value">{student.surf_stats?.avg_session_mins || 0} mins</span>
                </div>
              </div>
              <div className="sp-divider" />
              <div className="sp-bio">
                <span className="sp-bio-label">Bio</span>
                <p className="sp-bio-text">{student.bio || 'No bio written yet.'}</p>
              </div>
              {student.performance_logs && student.performance_logs.length > 0 && (
                <>
                  <div className="sp-divider" />
                  <div className="sp-bio">
                    <span className="sp-bio-label">Performance Logs</span>
                    <ul className="sp-logs-list">
                      {student.performance_logs.map((log, index) => (
                        <li key={index} className="sp-log-item">{log}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Accompanying Guests Card (When group size > 1) */}
            {student.guests_details && student.guests_details.length > 0 && (
              <div className="sp-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                  <h2 className="sp-card-title" style={{ margin: 0 }}>👥 Accompanying Guests ({student.guests_details.length})</h2>
                  <span style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0D9488', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                    {student.guests_details.length} Registered Guest(s)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {student.guests_details.map((g, idx) => (
                    <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '15px', color: '#0F172A' }}>Guest #{idx + 1}: {g.name || 'Unnamed Guest'}</strong>
                        <span style={{ 
                          fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', 
                          padding: '3px 8px', borderRadius: '4px',
                          background: 'rgba(13, 148, 136, 0.12)', color: '#0D9488'
                        }}>
                          {g.stance || 'Regular'} Stance
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#475569' }}>
                        <div>📱 Phone: <strong>{g.whatsapp_number || 'N/A'}</strong></div>
                        <div>✉️ Email: <strong>{g.email || 'N/A'}</strong></div>
                        <div>🎂 DOB / Age: <strong>{g.dob ? `${g.dob} (${calculateAge(g.dob)} yrs)` : (g.age ? `${g.age} yrs` : 'N/A')}</strong></div>
                        <div>👤 Gender: <strong style={{ textTransform: 'capitalize' }}>{g.gender || 'N/A'}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Session Card */}
            {student.nextSession && (
              <div className="sp-next-session">
                <span className="sp-ns-label">NEXT SESSION</span>
                <div className="sp-ns-details">
                  <div className="sp-ns-time">{student.nextSession.time}</div>
                  <div className="sp-ns-loc">{student.nextSession.details}</div>
                </div>
              </div>
            )}

            {/* Session History */}
            <div className="sp-card">
              <h2 className="sp-card-title">Session History</h2>
              <div className="sp-history-list">
                {student.sessionHistory && student.sessionHistory.map((session, index) => (
                  <div key={session.id} className="sp-history-item">
                    <div className="sp-timeline">
                      <div className="sp-timeline-dot" />
                      {student.sessionHistory && index < student.sessionHistory.length - 1 && <div className="sp-timeline-line" />}
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
                  {student.badges && student.badges.map(badge => (
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
                {student.videos && student.videos.map(video => (
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

            {/* Mock Heats History */}
            <div className="sp-card" style={{ marginTop: '32px' }}>
              <h2 className="sp-card-title">🏆 Mock Heats & Tactical History</h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 16px 0' }}>Log of simulated heats, scores, strategy compliance, and AI tactical insights.</p>
              
              <div className="sp-mock-heats-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {mockHeats.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, padding: '20px 0', textAlign: 'center' }}>No mock heats simulated yet. Initiate one in the Competitions Hub!</p>
                ) : (
                  mockHeats.map((heat) => {
                    const isExpanded = expandedHeatId === heat.id;
                    
                    return (
                      <div 
                        key={heat.id} 
                        className="sp-heat-history-item"
                        style={{
                          border: '1px solid #E2E8F0',
                          borderRadius: '16px',
                          background: isExpanded ? '#F8FAFC' : '#FFF',
                          transition: 'all 0.3s ease',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Expandable Header */}
                        <div 
                          onClick={() => toggleHeatExpand(heat.id)}
                          style={{
                            padding: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>{heat.date} • {heat.duration_mins} mins</span>
                            <span style={{ fontSize: '14px', color: '#0F172A', fontWeight: 700 }}>Focus: {heat.strategy_focus || 'Open strategy'}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block' }}>TOTAL SCORE</span>
                              <strong style={{ fontSize: '18px', color: '#0D9488', fontFamily: 'Outfit, sans-serif' }}>{heat.heat_total.toFixed(2)}</strong>
                            </div>
                            <span style={{ fontSize: '20px', color: '#94A3B8', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                          </div>
                        </div>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                          <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                            {/* Waves List */}
                            <div style={{ marginTop: '12px' }}>
                              <h4 style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px 0' }}>🌊 Wave Score Progression</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {heat.waves.length === 0 ? (
                                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>No wave rides recorded during this heat.</p>
                                ) : (
                                  heat.waves.map((w, idx) => (
                                    <div 
                                      key={idx} 
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: '#FFF',
                                        border: '1.5px solid #E2E8F0',
                                        padding: '10px 14px',
                                        borderRadius: '10px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>Wave {w.wave_number}</span>
                                        {w.notes && <span style={{ fontSize: '12px', color: '#64748B' }}>"{w.notes}"</span>}
                                      </div>
                                      <span style={{ fontSize: '14px', color: '#0D9488', fontWeight: 800 }}>{w.score.toFixed(1)}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Coach reflections */}
                            {heat.strategy_execution && (
                              <div style={{ background: '#FFF', border: '1.5px solid #E2E8F0', padding: '16px', borderRadius: '12px' }}>
                                <h4 style={{ fontSize: '13px', color: '#475569', margin: '0 0 6px 0' }}>📋 Strategy Execution (Coach Review)</h4>
                                <p style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: 1.5 }}>{heat.strategy_execution}</p>
                              </div>
                            )}

                            {/* AI Analysis section */}
                            {heat.tactical_strengths?.length > 0 && (
                              <div style={{ background: 'rgba(124, 58, 237, 0.04)', border: '1px solid rgba(124, 58, 237, 0.15)', padding: '18px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 800, letterSpacing: '0.5px' }}>🤖 AI TACTICAL DIAGNOSTICS</span>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                  <div>
                                    <h5 style={{ fontSize: '12px', color: '#0D9488', margin: '0 0 6px 0' }}>Strengths</h5>
                                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {heat.tactical_strengths.map((str, sIdx) => <li key={sIdx}>{str}</li>)}
                                    </ul>
                                  </div>
                                  <div>
                                    <h5 style={{ fontSize: '12px', color: '#EF4444', margin: '0 0 6px 0' }}>Weaknesses</h5>
                                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {heat.tactical_weaknesses.map((weak, wIdx) => <li key={wIdx}>{weak}</li>)}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* EDIT PROFILE MODAL */}
        {showEditModal && (
          <div className="sp-modal-overlay">
            <div className="sp-modal glass">
              <div className="sp-modal-header">
                <h3>Edit Student Profile</h3>
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
                      <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Date of Birth (DOB)</span>
                        {editForm.dob && (
                          <span style={{ color: '#0D9488', fontSize: '11px', fontWeight: 700 }}>
                            Age: {calculateAge(editForm.dob)} yrs
                          </span>
                        )}
                      </label>
                      <input 
                        type="date" 
                        value={editForm.dob || ''} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const cAge = calculateAge(val);
                          setEditForm({ ...editForm, dob: val, age: cAge });
                        }} 
                        max={new Date().toISOString().split('T')[0]} 
                      />
                    </div>
                    <div className="sp-form-field">
                      <label>Surf Stance</label>
                      <select value={editForm.stance} onChange={(e) => setEditForm({ ...editForm, stance: e.target.value })}>
                        <option value="regular">Regular</option>
                        <option value="goofy">Goofy</option>
                      </select>
                    </div>
                  </div>

                  <div className="sp-form-field">
                    <label>Competition Division</label>
                    <select value={editForm.division} onChange={(e) => setEditForm({ ...editForm, division: e.target.value })}>
                      <option value="Juniors">Juniors</option>
                      <option value="Men's Open">Men's Open</option>
                      <option value="Women's Open">Women's Open</option>
                      <option value="Men's Amateur">Men's Amateur</option>
                      <option value="Women's Amateur">Women's Amateur</option>
                    </select>
                  </div>

                  <div className="sp-form-field">
                    <label>Bio</label>
                    <textarea rows="3" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Describe your surfing style, goals, etc."></textarea>
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label>Waves Ridden</label>
                      <input type="number" value={editForm.waves_ridden} onChange={(e) => setEditForm({ ...editForm, waves_ridden: e.target.value })} />
                    </div>
                    <div className="sp-form-field">
                      <label>Max Speed</label>
                      <input type="text" value={editForm.max_speed} onChange={(e) => setEditForm({ ...editForm, max_speed: e.target.value })} />
                    </div>
                    <div className="sp-form-field">
                      <label>Avg Session (mins)</label>
                      <input type="number" value={editForm.avg_session_mins} onChange={(e) => setEditForm({ ...editForm, avg_session_mins: e.target.value })} />
                    </div>
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label>WhatsApp Number</label>
                      <input type="text" value={editForm.whatsapp_number} onChange={(e) => setEditForm({ ...editForm, whatsapp_number: e.target.value })} placeholder="9876543210" />
                    </div>
                    <div className="sp-form-field">
                      <label>Group Size / Guests</label>
                      <input type="number" min="1" max="13" value={editForm.guests_count} onChange={(e) => setEditForm({ ...editForm, guests_count: e.target.value })} />
                    </div>
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label>Course Duration</label>
                      <select value={editForm.course_duration} onChange={(e) => setEditForm({ ...editForm, course_duration: e.target.value })}>
                        <option value="3 Days Course">3 Days Course</option>
                        <option value="5 Days Course">5 Days Course</option>
                        <option value="7 Days Course">7 Days Course</option>
                        <option value="10 Days Course">10 Days Course</option>
                        <option value="1 Day Crash Course">1 Day Crash Course</option>
                      </select>
                    </div>
                    <div className="sp-form-field">
                      <label>Session Time Slot</label>
                      <select value={editForm.session_time} onChange={(e) => setEditForm({ ...editForm, session_time: e.target.value })}>
                        <option value="Morning 6:00 AM">Morning 6:00 AM</option>
                        <option value="Morning 8:00 AM">Morning 8:00 AM</option>
                        <option value="Evening 4:00 PM">Evening 4:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-field">
                      <label>Start Date</label>
                      <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} />
                    </div>
                    <div className="sp-form-field">
                      <label>Staying at School?</label>
                      <select value={editForm.staying_at_school} onChange={(e) => setEditForm({ ...editForm, staying_at_school: e.target.value })}>
                        <option value="Yes">Yes (On-site)</option>
                        <option value="No">No (Off-site)</option>
                      </select>
                    </div>
                  </div>

                  {/* Edit Accompanying Guests */}
                  {(parseInt(editForm.guests_count || 0) > 0 || (editForm.guests_details && editForm.guests_details.length > 0)) && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', margin: '8px 0' }}>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                        Accompanying Guests Profiles ({Math.max(parseInt(editForm.guests_count || 0), editForm.guests_details?.length || 0)})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Array.from({ length: Math.max(parseInt(editForm.guests_count || 0), editForm.guests_details?.length || 0) }).map((_, gIdx) => {
                          const g = (editForm.guests_details && editForm.guests_details[gIdx]) || {};
                          return (
                            <div key={gIdx} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '6px' }}>Guest #{gIdx + 1} Profile</span>
                              <div className="sp-guest-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                                <input 
                                  type="text" 
                                  placeholder="Guest Name" 
                                  value={g.name || ''} 
                                  onChange={(e) => {
                                    const updated = [...(editForm.guests_details || [])];
                                    if (!updated[gIdx]) updated[gIdx] = { name: '', whatsapp_number: '', email: '', age: '', stance: 'regular', level: 'Beginner' };
                                    updated[gIdx].name = e.target.value;
                                    setEditForm({ ...editForm, guests_details: updated });
                                  }} 
                                />
                                <input 
                                  type="tel" 
                                  placeholder="WhatsApp / Phone" 
                                  value={g.whatsapp_number || ''} 
                                  onChange={(e) => {
                                    const updated = [...(editForm.guests_details || [])];
                                    if (!updated[gIdx]) updated[gIdx] = { name: '', whatsapp_number: '', email: '', age: '', stance: 'regular', level: 'Beginner' };
                                    updated[gIdx].whatsapp_number = e.target.value;
                                    setEditForm({ ...editForm, guests_details: updated });
                                  }} 
                                />
                                <input 
                                  type="email" 
                                  placeholder="Email Address" 
                                  value={g.email || ''} 
                                  onChange={(e) => {
                                    const updated = [...(editForm.guests_details || [])];
                                    if (!updated[gIdx]) updated[gIdx] = { name: '', whatsapp_number: '', email: '', age: '', stance: 'regular', level: 'Beginner' };
                                    updated[gIdx].email = e.target.value;
                                    setEditForm({ ...editForm, guests_details: updated });
                                  }} 
                                />
                                <input 
                                  type="date" 
                                  title="Guest Date of Birth (DOB)"
                                  value={g.dob || ''} 
                                  max={new Date().toISOString().split('T')[0]}
                                  onChange={(e) => {
                                    const updated = [...(editForm.guests_details || [])];
                                    const dobVal = e.target.value;
                                    const computedAge = calculateAge(dobVal);
                                    if (!updated[gIdx]) updated[gIdx] = { name: '', whatsapp_number: '', email: '', dob: '', age: '', stance: 'regular', level: 'Beginner' };
                                    updated[gIdx] = { ...updated[gIdx], dob: dobVal, age: computedAge };
                                    setEditForm({ ...editForm, guests_details: updated });
                                  }} 
                                />
                                <select 
                                  value={g.stance || 'regular'} 
                                  onChange={(e) => {
                                    const updated = [...(editForm.guests_details || [])];
                                    if (!updated[gIdx]) updated[gIdx] = { name: '', whatsapp_number: '', email: '', age: '', stance: 'regular', level: 'Beginner' };
                                    updated[gIdx].stance = e.target.value;
                                    setEditForm({ ...editForm, guests_details: updated });
                                  }}
                                >
                                  <option value="regular">Regular</option>
                                  <option value="goofy">Goofy</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="sp-form-field">
                    <label>Performance Logs (one log per line)</label>
                    <textarea rows="3" value={editForm.performance_logs} onChange={(e) => setEditForm({ ...editForm, performance_logs: e.target.value })} placeholder="Pipeline clean swell - pop-up speed fast."></textarea>
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
        .sp-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .sp-main { flex: 1; padding: 40px 80px; overflow-y: auto; display: flex; flex-direction: column; gap: 32px; position: relative; }
 
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
        .level-master { background: rgba(239, 68, 68, 0.12); color: #EF4444; }
        
        .sp-meta-dot { width: 6px; height: 6px; background: #E2E8F0; border-radius: 50%; }
        .sp-instructor-text { font-size: 13px; color: #64748B; font-weight: 500; }

        /* Two Column Layout */
        .sp-content { display: flex; gap: 32px; }
        .sp-col-left { display: flex; flex-direction: column; gap: 32px; width: 380px; flex-shrink: 0; }
        .sp-col-right { display: flex; flex-direction: column; gap: 32px; flex: 1; }

        /* Cards */
        .sp-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .sp-card-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0; }

        /* Next Session Card */
        .sp-next-session { background: #0D9488; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .sp-ns-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; }
        .sp-ns-details { display: flex; flex-direction: column; gap: 4px; }
        .sp-ns-time { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: #FFF; }
        .sp-ns-loc { font-size: 13px; color: rgba(255,255,255,0.8); }

        /* Details list */
        .sp-details-list { display: flex; flex-direction: column; gap: 12px; }
        .sp-detail-row { display: flex; justify-content: space-between; font-size: 14px; }
        .sp-detail-label { color: #64748B; font-weight: 500; }
        .sp-detail-value { color: #0F172A; font-weight: 600; }
        .sp-divider { height: 1px; background: #E2E8F0; width: 100%; margin: 4px 0; }
        .sp-bio { display: flex; flex-direction: column; gap: 8px; }
        .sp-bio-label { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
        .sp-bio-text { font-size: 14px; color: #334155; line-height: 1.5; margin: 0; }

        /* Performance logs list */
        .sp-logs-list { display: flex; flex-direction: column; gap: 8px; padding-left: 16px; margin: 0; }
        .sp-log-item { font-size: 13px; color: #475569; line-height: 1.4; }

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

        @media (max-width: 768px) {
          .sp-main { padding: 20px 14px !important; }
          .sp-hero { flex-direction: column !important; text-align: center !important; padding: 20px !important; }
          .sp-hero-meta { justify-content: center !important; }
          .sp-content { flex-direction: column !important; }
          .sp-col-left { width: 100% !important; }
          .sp-modal { width: 95% !important; margin: 10px !important; max-height: 90vh !important; }
          .sp-form-row { flex-direction: column !important; gap: 10px !important; }
          .sp-guest-grid { grid-template-columns: 1fr !important; }
          .sp-video-grid { grid-template-columns: 1fr !important; }
          .sp-row-top { flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
};

export default StudentProfile;
