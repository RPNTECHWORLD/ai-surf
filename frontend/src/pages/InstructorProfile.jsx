import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const InstructorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth states
  const [currentUser, setCurrentUser] = useState(null);
  const [schoolsList, setSchoolsList] = useState(['Aquatic Indica Surf School']);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    bio: '',
    experience: '',
    fitness_level: 'Elite',
    rates: '',
    location: '',
    school: 'Individual / Freelance Coach',
    image: '',
    specializations: [],
    certifications: ''
  });

  // Password & Credentials State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [coachEmail, setCoachEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showPassInDetails, setShowPassInDetails] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Dynamic data states for students and sessions
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [instructorSessions, setInstructorSessions] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/schools`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map(s => s.name).filter(Boolean);
          setSchoolsList(prev => Array.from(new Set([...names, ...prev])));
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (newPass.length < 6) {
      setPassError('Password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Passwords do not match.');
      return;
    }

    setIsSavingPass(true);
    try {
      const res = await fetch(`${API}/api/instructors/${id}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: coachEmail, password: newPass })
      });

      const data = await res.json();
      if (res.ok && (data.success || data.message)) {
        setPassSuccess(`Credentials updated successfully! You can now log in anytime with email: ${data.email || coachEmail}`);
        setInstructor(prev => ({ ...prev, email: data.email || coachEmail, password_plain: data.password_plain || newPass, has_password: true }));
        if (currentUser) {
          const updatedUser = { ...currentUser, email: data.email || coachEmail };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        setTimeout(() => {
          setShowPasswordModal(false);
          setPassSuccess('');
          setNewPass('');
          setConfirmPass('');
          setShowNewPass(false);
          setShowConfirmPass(false);
        }, 2200);
      } else {
        setPassError(data.detail || data.message || 'Failed to update password.');
      }
    } catch (err) {
      setPassError('Network error. Please try again.');
    } finally {
      setIsSavingPass(false);
    }
  };

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
        if (data.email) setCoachEmail(data.email);
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

  const fetchDynamicData = () => {
    // Fetch assigned students
    fetch(`${API}/api/students`)
      .then(r => r.json())
      .then(data => {
        const filtered = data.filter(s => s.instructor_id === parseInt(id));
        setAssignedStudents(filtered);
      })
      .catch(err => console.error("Error fetching students:", err));

    // Fetch sessions
    fetch(`${API}/api/sessions`)
      .then(r => r.json())
      .then(data => {
        const filtered = data.filter(s => s.instructor_id === parseInt(id));
        setInstructorSessions(filtered);
      })
      .catch(err => console.error("Error fetching sessions:", err));
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {}
    }
    fetchInstructor();
    fetchDynamicData();
  }, [id]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setUploadingPhoto(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/upload-image`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const uploadedUrl = data.image_url || data.url;
        if (uploadedUrl) {
          setEditForm(prev => ({ ...prev, image: uploadedUrl }));
        }
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEditClick = () => {
    setEditForm({
      name: instructor.name || '',
      bio: instructor.bio || '',
      experience: instructor.experience || '',
      fitness_level: instructor.fitness_level || 'Elite',
      rates: instructor.rates || '',
      location: instructor.location || '',
      school: instructor.school || 'Individual / Freelance Coach',
      image: (instructor.image && !instructor.image.startsWith('blob:')) ? instructor.image : '',
      specializations: instructor.specializations || [],
      certifications: (instructor.certifications || []).join('\n')
    });
    setPhotoPreview('');
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
    if (uploadingPhoto) return;
    setSaving(true);
    try {
      const token = sessionStorage.getItem('token');
      const safeImage = (editForm.image && !editForm.image.startsWith('blob:')) ? editForm.image : '';
      const payload = {
        name: editForm.name,
        bio: editForm.bio,
        experience: editForm.experience,
        fitness_level: editForm.fitness_level,
        specializations: editForm.specializations,
        rates: editForm.rates,
        location: editForm.location,
        school: editForm.school || 'Individual / Freelance Coach',
        certifications: editForm.certifications.split('\n').filter(c => c.trim() !== '')
      };
      if (safeImage) {
        payload.image = safeImage;
      }

      const res = await fetch(`${API}/api/instructors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (currentUser && currentUser.instructor_id === parseInt(id)) {
          const updatedUser = { ...currentUser, name: editForm.name, image: safeImage || currentUser.image };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        setShowEditModal(false);
        setPhotoPreview('');
        fetchInstructor();
        fetchDynamicData();
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

  // Group sessions by month (last 8 months) for chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const monthlyStats = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyStats.push({
      month: d.getMonth(),
      year: d.getFullYear(),
      label: months[d.getMonth()],
      count: 0
    });
  }

  instructorSessions.forEach(s => {
    if (!s.date) return;
    try {
      let dateObj = null;
      if (s.date.includes('-')) {
        dateObj = new Date(s.date);
      } else {
        const parts = s.date.split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const monthStr = parts[1].slice(0, 3).toLowerCase();
          const year = parseInt(parts[2]);
          const monthIndex = months.findIndex(m => m.toLowerCase().startsWith(monthStr));
          if (monthIndex !== -1) {
            dateObj = new Date(year, monthIndex, day);
          }
        }
      }
      if (dateObj && !isNaN(dateObj.getTime())) {
        const mIdx = dateObj.getMonth();
        const y = dateObj.getFullYear();
        const match = monthlyStats.find(m => m.month === mIdx && m.year === y);
        if (match) {
          match.count++;
        }
      }
    } catch (e) {
      console.error("Error parsing date:", s.date, e);
    }
  });

  const maxCount = Math.max(...monthlyStats.map(m => m.count), 1);
  const completedSessionsCount = instructorSessions.filter(s => s.status && s.status.toLowerCase() === 'completed').length;
  const totalSessionsCount = instructorSessions.length;
  const successRate = totalSessionsCount > 0 ? Math.round((completedSessionsCount / totalSessionsCount) * 100) : 94;

  return (
    <div className="ip-page">
      <Sidebar />
      <main className="ip-main">
        {/* Hero */}
        <section className="ip-hero">
          <img src={instructor.image} alt={instructor.name} className="ip-hero-avatar" />
          <div className="ip-hero-info">
            <h1 className="ip-hero-name">{instructor.name}</h1>
            <p className="ip-hero-sub">Age {instructor.age || '—'} • {instructor.location || 'Not Specified'}</p>
            <div className="ip-hero-badges">
              <span className="ip-badge-primary">ISA CERTIFIED</span>
              <span className="ip-badge-active">ACTIVE</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
            {(!instructor.has_password && !instructor.user_id && !instructor.password_plain) && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setCoachEmail(instructor.email || '');
                  setShowPasswordModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(2, 132, 199, 0.25) 100%)',
                  color: '#2DD4BF',
                  border: '1px solid rgba(45, 212, 191, 0.4)',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.15)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>🔑 Set Password / Login ID</span>
              </button>
            )}

            <button className="btn-secondary edit-profile-btn" onClick={handleEditClick} style={{ background: 'rgba(255,255,255,0.1)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Profile
            </button>
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
                  <span className="ip-detail-label">Email (Login ID)</span>
                  <span className="ip-detail-value" style={{ fontWeight: 700, color: instructor.email ? '#0F172A' : '#94A3B8' }}>
                    {instructor.email || 'No email set'}
                  </span>
                </div>
                <div className="ip-detail-row" style={{ alignItems: 'center' }}>
                  <span className="ip-detail-label">Password</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ip-detail-value" style={{ fontFamily: showPassInDetails && instructor.password_plain ? 'monospace' : 'inherit', fontSize: '13px', color: '#0F172A', fontWeight: 700 }}>
                      {instructor.password_plain
                        ? (showPassInDetails ? instructor.password_plain : '••••••••')
                        : (instructor.has_password ? '••••••••' : 'Not set')}
                    </span>
                    {instructor.password_plain ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowPassInDetails(!showPassInDetails)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: '#64748B', display: 'inline-flex', alignItems: 'center' }}
                          title={showPassInDetails ? 'Hide Password' : 'Show Password'}
                        >
                          {showPassInDetails ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(instructor.password_plain);
                              setCopiedPass(true);
                              setTimeout(() => setCopiedPass(false), 2000);
                            }
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: copiedPass ? '#10B981' : '#64748B', display: 'inline-flex', alignItems: 'center' }}
                          title="Copy Password"
                        >
                          {copiedPass ? (
                            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>Copied!</span>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCoachEmail(instructor.email || '');
                            setShowPasswordModal(true);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: '#64748B', display: 'inline-flex', alignItems: 'center' }}
                          title="Change Password"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCoachEmail(instructor.email || '');
                          setShowPasswordModal(true);
                        }}
                        style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        + Set Password
                      </button>
                    )}
                  </div>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Affiliation / School</span>
                  <span className="ip-detail-value" style={{ fontWeight: 600, color: '#0D9488' }}>
                    {instructor.school || 'Individual / Freelance Coach'}
                  </span>
                </div>
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
                  <span className="ip-detail-value">{instructor.rates || '—'}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Location</span>
                  <span className="ip-detail-value">{instructor.location || '—'}</span>
                </div>
                <div className="ip-detail-row">
                  <span className="ip-detail-label">Specializations</span>
                  <span className="ip-detail-value" style={{ maxWidth: '180px', textAlign: 'right', whiteSpace: 'normal' }}>
                    {(instructor.specializations || []).join(', ') || '—'}
                  </span>
                </div>
              </div>
              <div className="ip-divider" />
              <div className="ip-bio">
                <span className="ip-bio-label">Bio</span>
                <p className="ip-bio-text">{instructor.bio || 'No bio added yet.'}</p>
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
                  {monthlyStats.map((m, i) => (
                    <div 
                      key={i} 
                      className="ip-bar" 
                      style={{ height: `${Math.max((m.count / maxCount) * 60, 4)}px` }} 
                      title={`${m.label} ${m.year}: ${m.count} sessions`}
                    />
                  ))}
                </div>
              </div>
              <div className="ip-card ip-stat-card">
                <span className="ip-stat-label">SUCCESS RATE</span>
                <div className="ip-stat-big">
                  <span className="ip-stat-number">{successRate}%</span>
                  <span className="ip-stat-trend">
                    {totalSessionsCount > 0 
                      ? `${completedSessionsCount} of ${totalSessionsCount} completed` 
                      : '↑ 4% vs last period'}
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Students */}
            <div className="ip-card">
              <h3 className="ip-card-title">Assigned Students ({assignedStudents.length})</h3>
              <div className="ip-student-list">
                {assignedStudents.length > 0 ? (
                  assignedStudents.map((s, i) => (
                    <div 
                      key={s.id} 
                      className="ip-student-row" 
                      style={{ 
                        borderBottom: i === assignedStudents.length - 1 ? 'none' : '1px solid #E2E8F0',
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/students/${s.id}`)}
                    >
                      <div className="ip-student-info">
                        {s.image && !s.image.includes('unsplash.com') && !s.image.includes('1500648767791') ? (
                          <img 
                            src={s.image} 
                            alt={s.name} 
                            className="ip-student-avatar" 
                            onError={e => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement.querySelector('.ip-student-fallback');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="ip-student-fallback"
                          style={{
                            display: (s.image && !s.image.includes('unsplash.com') && !s.image.includes('1500648767791')) ? 'none' : 'flex',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                            color: '#FFFFFF',
                            fontWeight: '800',
                            fontSize: '14px',
                            fontFamily: 'Outfit, sans-serif',
                            flexShrink: 0
                          }}
                        >
                          {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div className="ip-student-name">{s.name}</div>
                          <div className="ip-student-time">{s.last_active || 'Today'}</div>
                        </div>
                      </div>
                      <span className={`ip-level-badge level-${(s.level || 'Beginner').toLowerCase()}`}>{s.level || 'Beginner'}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No students assigned to this coach yet.
                  </div>
                )}
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
                {instructorSessions.length > 0 ? (
                  instructorSessions.slice(0, 5).map((session, index) => (
                    <div key={session.id} className="ip-activity-row">
                      <div className="ip-activity-icon" />
                      <div className="ip-activity-info">
                        <div className="ip-activity-title">Session with {session.student}</div>
                        <div className="ip-activity-sub">{session.location} • {session.date} at {session.time}</div>
                      </div>
                      <span className="ip-badge-primary">{session.type}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No session activity recorded yet.
                  </div>
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
                <h3>Edit Coach Profile</h3>
                <button className="sp-modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="sp-modal-body">
                  {/* Profile Photo Upload */}
                  <div className="sp-form-field" style={{ marginBottom: '16px' }}>
                    <label>Profile Photo</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePhotoUpload}
                    />
                    {(() => {
                      const displayImg = photoPreview || (editForm.image && !editForm.image.startsWith('blob:') ? editForm.image : '');
                      return (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            width: '100%',
                            padding: '12px 16px',
                            background: '#F8FAFC',
                            border: '2px dashed #CBD5E1',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                            {displayImg ? (
                              <img
                                src={displayImg}
                                alt="Coach Avatar"
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '2px solid #00D1B2'
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                                  color: '#FFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '20px'
                                }}
                              >
                                {editForm.name ? editForm.name.charAt(0).toUpperCase() : 'C'}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                              {uploadingPhoto ? 'Uploading to cloud...' : (displayImg ? '✓ Change Photo' : 'Upload Profile Photo')}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              Click to select image (JPG, PNG, WEBP)
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

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
                    <label>Affiliation / Surf School</label>
                    <select
                      value={editForm.school || 'Individual / Freelance Coach'}
                      onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                    >
                      <option value="Individual / Freelance Coach">👤 Individual / Freelance Coach (Independent)</option>
                      {schoolsList.filter(s => s !== 'Individual / Freelance Coach').map(s => (
                        <option key={s} value={s}>🏫 {s}</option>
                      ))}
                    </select>
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
                  <button type="button" className="btn-secondary" onClick={() => { setShowEditModal(false); setPhotoPreview(''); }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving || uploadingPhoto}>
                    {uploadingPhoto ? 'Uploading Photo...' : (saving ? 'Saving...' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Password & Login ID Modal */}
        {showPasswordModal && (
          <div className="sp-modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="sp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="sp-modal-header">
                <div>
                  <h3 className="sp-modal-title">Coach Login & Credentials</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                    Set your email and password to log in directly via the login portal.
                  </p>
                </div>
                <button className="sp-modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
              </div>

              {passError && (
                <div style={{ margin: '16px 24px 0 24px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  ⚠️ {passError}
                </div>
              )}
              {passSuccess && (
                <div style={{ margin: '16px 24px 0 24px', padding: '10px 14px', background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  ✅ {passSuccess}
                </div>
              )}

              <form onSubmit={handleUpdatePassword}>
                <div className="sp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {instructor?.password_plain && (
                    <div style={{ padding: '12px 14px', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '11.5px', color: '#0F766E', fontWeight: 700, textTransform: 'uppercase' }}>Current Password:</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0D9488', fontFamily: 'monospace', marginTop: '2px' }}>
                          {instructor.password_plain}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(instructor.password_plain);
                            setCopiedPass(true);
                            setTimeout(() => setCopiedPass(false), 2000);
                          }
                        }}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: '#0D9488', color: '#FFF', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {copiedPass ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  )}

                  <div className="sp-form-field">
                    <label>Email Address (User ID)</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. coach@school.com"
                      value={coachEmail}
                      onChange={(e) => setCoachEmail(e.target.value)}
                    />
                    <small style={{ color: '#64748B', fontSize: '11.5px', marginTop: '2px' }}>
                      This email will be used as your Coach Login User ID.
                    </small>
                  </div>

                  <div className="sp-form-field">
                    <label>New Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        placeholder="Minimum 6 characters"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        style={{ width: '100%', paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                        title={showNewPass ? 'Hide password' : 'Show password'}
                      >
                        {showNewPass ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="sp-form-field">
                    <label>Confirm New Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        placeholder="Re-type new password"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        style={{ width: '100%', paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                        title={showConfirmPass ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPass ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="sp-modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isSavingPass} style={{ background: '#0D9488', borderColor: '#0D9488' }}>
                    {isSavingPass ? 'Saving Credentials...' : 'Save Password'}
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
