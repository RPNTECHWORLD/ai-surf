import React, { useState, useEffect, useRef } from 'react';
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const avatarFileInputRef = useRef(null);
  const modalPhotoInputRef = useRef(null);
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
    guests_details: [],
    image: ''
  });

  // Session Configuration Slot Date Filter State
  const [selectedSlotDate, setSelectedSlotDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const formatSlotDateDisplay = (dateStr) => {
    if (!dateStr) return 'Select Date';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // Password Management State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

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
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || currentUser?.invite_token;
      
      let res;
      if (token) {
        res = await fetch(`${API}/api/invite/${token}/set-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        });
      } else {
        res = await fetch(`${API}/api/students/${id}/set-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        });
      }

      const data = await res.json();
      if (res.ok && (data.success || data.message)) {
        setPassSuccess('Password updated successfully! You can now log in anytime with your email.');
        setStudent(prev => ({ ...prev, has_password: true, password_updated: true }));
        if (currentUser) {
          const updatedUser = { ...currentUser, has_password: true, password_updated: true };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        try {
          const emailLower = (student?.email || currentUser?.email || '').toLowerCase().trim();
          if (emailLower) {
            const updatedPassEmails = JSON.parse(localStorage.getItem('passwords_updated_emails') || '[]');
            if (!updatedPassEmails.includes(emailLower)) {
              updatedPassEmails.push(emailLower);
              localStorage.setItem('passwords_updated_emails', JSON.stringify(updatedPassEmails));
            }
            const reqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
            reqs.forEach(r => {
              if ((r.student_email || r.email || '').toLowerCase().trim() === emailLower) {
                r.password_updated = true;
                r.has_password = true;
              }
            });
            localStorage.setItem('school_join_requests', JSON.stringify(reqs));
          }
        } catch (e) {}

        setTimeout(() => {
          setShowPasswordModal(false);
          setPassSuccess('');
          setNewPass('');
          setConfirmPass('');
        }, 1800);
      } else {
        setPassError(data.detail || data.message || 'Failed to update password.');
      }
    } catch (err) {
      setPassError('Network error. Please try again.');
    } finally {
      setIsSavingPass(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setEditForm(prev => ({ ...prev, image: previewUrl }));
    setUploadingPhoto(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/upload-image`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setEditForm(prev => ({ ...prev, image: data.url }));
          const token = sessionStorage.getItem('token');
          await fetch(`${API}/api/students/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ image: data.url })
          });
          fetchStudent();
        }
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Dynamic fallback for registered surfer (never hardcoded Chloe Kim)
  const getFallbackStudent = () => {
    const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    const reqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
    const emailLower = (savedUser.email || '').toLowerCase().trim();
    const req = reqs.find(r => (r.student_email || r.email)?.toLowerCase().trim() === emailLower);
    
    let approvalStatus = savedUser.approval_status || (req ? req.status : 'pending');

    return {
      id: id,
      name: savedUser.name || 'Registered Surfer',
      email: savedUser.email || '',
      level: 'Beginner',
      instructor: 'Aquatic Indica Surf Coach',
      image: savedUser.image || '',
      bio: 'Registered athlete at Aquatic Indica Surf School.',
      age: 24,
      division: "Men's Open",
      stance: 'regular',
      approval_status: approvalStatus,
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
            : []
        };

        let isApproved = data.approval_status === 'approved';
        try {
          const emailToCheck = (data.email || '').toLowerCase();
          const reqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
          const req = reqs.find(r => (r.student_email || r.email)?.toLowerCase() === emailToCheck);
          if (req && req.status === 'approved') {
            isApproved = true;
            cleanStudent.approval_status = 'approved';
          }
        } catch (e) {}

        if (isApproved) {
          cleanStudent.approval_status = 'approved';
          try {
            const saved = sessionStorage.getItem('user');
            if (saved) {
              const u = JSON.parse(saved);
              u.approval_status = 'approved';
              sessionStorage.setItem('user', JSON.stringify(u));
              setCurrentUser(u);
            }
          } catch (e) {}
        }

        // Check if password has been updated or student registered manually with password
        const emailLower = (data.email || cleanStudent.email || '').toLowerCase().trim();
        const updatedPassEmails = (JSON.parse(localStorage.getItem('passwords_updated_emails') || '[]')).map(e => String(e).toLowerCase().trim());
        
        let isPassSet = true; // Default to true for registered students who signed up with password!

        if (data.is_temporary_password || data.has_password === false || data.password_set === false) {
          isPassSet = emailLower ? updatedPassEmails.includes(emailLower) : false;
        }

        try {
          const reqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
          const req = reqs.find(r => (r.student_email || r.email || '').toLowerCase().trim() === emailLower);
          if (req && (req.password_updated || req.has_password || req.password)) {
            isPassSet = true;
          }
        } catch(e) {}

        cleanStudent.has_password = isPassSet;
        cleanStudent.password_updated = isPassSet;

        const urlParams = new URLSearchParams(window.location.search);
        if (!isPassSet && urlParams.has('token')) {
          setShowPasswordModal(true);
        }

        setStudent(cleanStudent);
      })
      .catch(() => {
        const fallback = getFallbackStudent();
        setStudent(fallback);
      })
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
    let u = null;
    if (saved) {
      try {
        u = JSON.parse(saved);
        setCurrentUser(u);
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
      guests_details: student.guests_details || [],
      image: student.image || ''
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
          guests_details: editForm.guests_details || [],
          image: editForm.image || undefined
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

  const isPendingApproval = (() => {
    if (student?.approval_status === 'approved') return false;
    
    try {
      const emailToCheck = (student?.email || currentUser?.email || '').toLowerCase();
      if (emailToCheck) {
        const reqs = JSON.parse(localStorage.getItem('school_join_requests') || '[]');
        const req = reqs.find(r => (r.student_email || r.email)?.toLowerCase() === emailToCheck);
        if (req && req.status === 'approved') return false;
      }
    } catch (e) {}

    if (student?.approval_status === 'pending') return true;
    if (currentUser?.role === 'athlete' && currentUser?.approval_status === 'pending') return true;
    return false;
  })();

  const currentBadge = (student.badges && student.badges.length > 0)
    ? student.badges[student.badges.length - 1]
    : { name: 'Yellow Badge', color: '#F59E0B' };
  const badgeDisplayName = currentBadge.name ? currentBadge.name.replace(' (Student Registered)', '') : 'Yellow Badge';
  const badgeDotColor = currentBadge.color || '#F59E0B';

  const nextSessionTime = student.session_time
    ? (student.session_time.toLowerCase().includes('morning') || student.session_time.toLowerCase().includes('evening')
        ? `Tomorrow, ${student.session_time.replace(/morning\s*/i, '').replace(/evening\s*/i, '')}`
        : `Tomorrow, ${student.session_time}`)
    : 'Tomorrow, 08:30 AM';
  const nextSessionSub = `${student.location || 'Waikiki Beach'} • ${student.course_duration || 'Intro to Barrels'}`;

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



        {/* Hero Section - Exact Match to User Mockup */}
        <section className="sp-hero">
          <input
            type="file"
            ref={avatarFileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
          />
          
          <div className="sp-hero-left">
            <div
              className="sp-avatar-wrapper"
              onClick={() => isOwnProfile && avatarFileInputRef.current?.click()}
              style={{ cursor: isOwnProfile ? 'pointer' : 'default' }}
              title={isOwnProfile ? "Click to change profile photo" : ""}
            >
              {student.image && !student.image.includes('1500648767791') && !student.image.includes('unsplash.com') ? (
                <img
                  src={student.image}
                  alt={student.name}
                  className="sp-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement.querySelector('.sp-avatar-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="sp-avatar-fallback"
                style={{
                  display: (student.image && !student.image.includes('1500648767791') && !student.image.includes('unsplash.com')) ? 'none' : 'flex',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '28px',
                  fontFamily: 'Outfit, sans-serif'
                }}
              >
                {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
              </div>
              {isOwnProfile && (
                <div className="sp-avatar-overlay">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </div>
              )}
            </div>

            <div className="sp-hero-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 className="sp-name">{student.name}</h1>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                    title="Edit Profile"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                )}
              </div>
              <div className="sp-hero-meta">
                <span className="sp-level-badge">
                  {(student.level || 'INTERMEDIATE').toUpperCase()}
                </span>
                <span className="sp-badge-dot-label">
                  <span className="sp-color-dot" style={{ backgroundColor: badgeDotColor }} />
                  {badgeDisplayName}
                </span>
                <span className="sp-instructor-text">
                  Instructor: {student.instructor || 'Marcus Silva'}
                </span>
              </div>
            </div>
          </div>

          <div className="sp-hero-right">
            {/* NEXT SESSION Banner Box */}
            <div className="sp-next-session-box">
              <span className="sp-ns-box-label">NEXT SESSION</span>
              <div className="sp-ns-box-time">{nextSessionTime}</div>
              <div className="sp-ns-box-sub">{nextSessionSub}</div>
            </div>
          </div>
        </section>

        {(new URLSearchParams(window.location.search).has('token') || window.location.search.includes('token=')) && !student?.password_updated && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(239, 68, 68, 0.08) 100%)',
            border: '1.5px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '16px',
            padding: '18px 22px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 8px 20px rgba(245, 158, 11, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0
              }}>
                🔐
              </div>
              <div>
                <h4 style={{ margin: '0 0 3px 0', fontSize: '15px', fontWeight: 800, color: '#92400E', fontFamily: 'Outfit, sans-serif' }}>
                  Action Required: Set Your Permanent Password
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#B45309', lineHeight: 1.4 }}>
                  Your account password is not updated yet. Please set your permanent password to enable direct login with your email anytime.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPassError('');
                setPassSuccess('');
                setShowPasswordModal(true);
              }}
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              🔑 Set Password Now
            </button>
          </div>
        )}



        <div className="sp-content">
          {/* Left Column */}
          <div className="sp-col-left">
            {/* Session History Card */}
            <div className="sp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h2 className="sp-card-title">Session History</h2>
                <button
                  type="button"
                  onClick={() => navigate('/sessions')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3B82F6',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  Show All Sessions
                </button>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', marginBottom: '16px' }}>
                Recents
              </div>

              {((student.sessions || []).filter(s => s.status === 'Completed')).length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>🏄</div>
                  <div style={{ fontWeight: 600, color: '#64748B' }}>No completed sessions yet</div>
                  <div style={{ fontSize: '11.5px', marginTop: '2px' }}>Completed surf logs will be recorded here.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {(student.sessions || []).filter(s => s.status === 'Completed').slice(0, 5).map((session, sIdx) => (
                    <div key={session.id || sIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#0D9488',
                        marginTop: '5px',
                        flexShrink: 0
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {session.date}
                        </span>
                        <strong style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                          {session.location || session.title || 'Surf Training Session'}
                        </strong>
                        <span style={{ fontSize: '13px', color: '#64748B' }}>
                          {session.instructor || student.instructor || 'Surf Coach'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Sessions Card */}
            <div className="sp-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <h2 className="sp-card-title">Pending Sessions</h2>
                <span style={{
                  background: '#F59E0B',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 800,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {((student.sessions || []).filter(s => s.status === 'Upcoming' || s.status === 'Scheduled')).length}
                </span>
              </div>

              {((student.sessions || []).filter(s => s.status === 'Upcoming' || s.status === 'Scheduled')).length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>📅</div>
                  <div style={{ fontWeight: 600, color: '#64748B' }}>No pending sessions</div>
                  <div style={{ fontSize: '11.5px', marginTop: '2px' }}>Upcoming scheduled sessions will appear here.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(student.sessions || []).filter(s => s.status === 'Upcoming' || s.status === 'Scheduled').map((session, pIdx, arr) => (
                    <div
                      key={session.id || pIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: pIdx === 0 ? '0 0 16px 0' : (pIdx === arr.length - 1 ? '16px 0 0 0' : '16px 0'),
                        borderBottom: pIdx !== arr.length - 1 ? '1px solid #F1F5F9' : 'none'
                      }}
                    >
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#F59E0B',
                        marginTop: '5px',
                        flexShrink: 0
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {session.date}
                        </span>
                        <strong style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                          {session.location || session.title || 'Scheduled Session'}
                        </strong>
                        <span style={{ fontSize: '13px', color: '#64748B' }}>
                          {session.instructor || student.instructor || 'Coach'} • {session.time || student.session_time || 'Morning Slot'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  {(() => {
                    const earned = [];
                    const lvl = (student.level || 'Beginner').toLowerCase();
                    earned.push({
                      id: 1,
                      name: 'White Badge',
                      date: student.start_date ? `Earned ${student.start_date}` : 'Earned on Join',
                      color: '#E2E8F0',
                      textColor: '#0F172A'
                    });
                    if (lvl.includes('intermediate') || lvl.includes('advanced') || lvl.includes('master')) {
                      earned.push({
                        id: 2,
                        name: 'Yellow Badge',
                        date: 'Earned Intermediate',
                        color: '#F59E0B',
                        textColor: '#0F172A'
                      });
                    }
                    if (lvl.includes('advanced') || lvl.includes('master')) {
                      earned.push({
                        id: 3,
                        name: 'Blue Badge',
                        date: 'Earned Advanced',
                        color: '#3B82F6',
                        textColor: '#0F172A'
                      });
                    }
                    return earned;
                  })().map(badge => (
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
              {((student.sessions || []).filter(s => s.video_url || s.video)).length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 20px',
                  background: '#F8FAFC',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '14px',
                  textAlign: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '32px' }}>📹</span>
                  <strong style={{ fontSize: '14px', color: '#334155' }}>No Video Analysis Uploaded Yet</strong>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', maxWidth: '320px' }}>
                    Session recordings and AI wave diagnostics will appear here once uploaded by your coach.
                  </p>
                </div>
              ) : (
                <div className="sp-video-grid">
                  {(student.sessions || []).filter(s => s.video_url || s.video).map((sess, idx) => (
                    <div key={sess.id || idx} className="sp-video-card" style={{ background: '#0F172A' }}>
                      <div className="sp-video-overlay">
                        <div className="sp-video-status status-teal">
                          ANALYZED
                        </div>
                        <div className="sp-play-btn" onClick={() => window.open(sess.video_url || sess.video, '_blank')}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                  {/* Photo Upload in Modal */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', background: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '20px' }}>
                      {editForm.image && !editForm.image.includes('1500648767791') ? (
                        <img src={editForm.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        (editForm.name || 'S').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={modalPhotoInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => modalPhotoInputRef.current?.click()}
                        style={{ background: '#0F172A', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {uploadingPhoto ? 'Uploading...' : '📷 Upload Photo'}
                      </button>
                    </div>
                  </div>

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
                        <option value="08:30 AM">08:30 AM · Morning Slot 1 (90m)</option>
                        <option value="10:30 AM">10:30 AM · Morning Slot 2 (90m)</option>
                        <option value="11:30 AM">11:30 AM · Midday Slot (60m)</option>
                        <option value="01:00 PM">01:00 PM · Afternoon Slot (120m)</option>
                        <option value="03:30 PM">03:30 PM · Late Afternoon (90m)</option>
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
        {/* Password Setup Modal */}
        {showPasswordModal && (
          <div className="sp-modal-overlay" onClick={() => {
            if (student?.password_updated || student?.has_password) {
              setShowPasswordModal(false);
            }
          }}>
            <div className="sp-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', background: '#FFFFFF', borderRadius: '20px', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🔐</span>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>Update Account Password</h3>
                </div>
                {(student?.password_updated || student?.has_password) && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748B', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                Set a permanent password for <strong>{student.email || student.name}</strong>. Once saved, you can log in directly anytime from the Login page.
              </p>

              {passError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px' }}>
                  ⚠️ {passError}
                </div>
              )}
              {passSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px' }}>
                  ✅ {passSuccess}
                </div>
              )}

              <form onSubmit={handleUpdatePassword}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>New Password</label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPass}
                    style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #FF3366 0%, #FF6584 100%)', color: '#FFFFFF', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255,51,102,0.3)' }}
                  >
                    {isSavingPass ? 'Saving...' : '💾 Save Password'}
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
 
        /* Hero Header */
        .sp-hero {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 22px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.03);
          box-sizing: border-box;
          width: 100%;
        }
        .sp-hero-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .sp-avatar-wrapper {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          border: 2px solid #E2E8F0;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F1F5F9;
        }
        .sp-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .sp-avatar-overlay {
          position: absolute; inset: 0; background: rgba(15, 23, 42, 0.55);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s; border-radius: 50%;
        }
        .sp-avatar-wrapper:hover .sp-avatar-overlay { opacity: 1; }
        
        .sp-hero-info { display: flex; flex-direction: column; gap: 6px; justify-content: center; }
        .sp-name { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.1; letter-spacing: -0.3px; }
        .sp-hero-meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        
        .sp-level-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: #E6F8F6;
          color: #0D9488;
        }
        
        .sp-badge-dot-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #1E293B;
        }
        .sp-color-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        
        .sp-instructor-text { font-size: 13px; color: #64748B; font-weight: 500; }

        .sp-hero-right {
          display: flex;
          align-items: center;
        }
        .sp-next-session-box {
          background: #008B7A;
          border-radius: 18px;
          padding: 16px 32px;
          min-width: 260px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          color: #FFFFFF;
          box-shadow: 0 4px 14px rgba(0, 139, 122, 0.22);
        }
        .sp-ns-box-label {
          font-size: 10px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.75);
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }
        .sp-ns-box-time {
          font-family: 'Outfit', sans-serif;
          font-size: 21px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 1px 0;
          line-height: 1.2;
        }
        .sp-ns-box-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 500;
        }

        /* Two Column Layout */
        .sp-content { display: flex; gap: 24px; align-items: stretch; }
        .sp-col-left { display: flex; flex-direction: column; gap: 24px; width: 350px; flex-shrink: 0; }
        .sp-col-right { display: flex; flex-direction: column; gap: 24px; flex: 1; }

        /* Cards */
        .sp-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02); }
        .sp-card-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #0F172A; margin: 0; }

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

        /* Top Row (Radar & Badges) */
        .sp-row-top { display: flex; gap: 24px; }
        .sp-skill-card { flex: 1.3; }
        .sp-badge-card { flex: 1; }

        /* Radar Chart Mock */
        .sp-radar-container { display: flex; justify-content: center; align-items: center; padding: 16px 0; }
        .sp-radar-mock { position: relative; width: 170px; height: 170px; display: flex; justify-content: center; align-items: center; }
        .sp-radar-poly { position: absolute; border: 1px solid #E2E8F0; transform: rotate(45deg); }
        .sp-poly-lg { width: 170px; height: 170px; }
        .sp-poly-md { width: 110px; height: 110px; }
        .sp-poly-sm { width: 55px; height: 55px; }
        .sp-radar-fill { position: absolute; width: 130px; height: 120px; background: rgba(13, 148, 136, 0.3); border: 2px solid #0D9488; clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%); }
        .sp-radar-label { position: absolute; font-size: 10px; color: #64748B; font-weight: 700; letter-spacing: 0.5px; }
        .label-top { top: -20px; left: 50%; transform: translateX(-50%); }
        .label-bottom { bottom: -20px; left: 50%; transform: translateX(-50%); }
        .label-left { left: -30px; top: 50%; transform: translateY(-50%); }
        .label-right { right: -35px; top: 50%; transform: translateY(-50%); }

        /* Badge History */
        .sp-badge-list { display: flex; flex-direction: column; gap: 16px; margin-top: 4px; }
        .sp-badge-item { display: flex; align-items: center; gap: 14px; }
        .sp-badge-icon { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .sp-badge-info { display: flex; flex-direction: column; }
        .sp-badge-name { font-size: 14px; font-weight: 800; color: #0F172A; }
        .sp-badge-date { font-size: 12px; color: #64748B; margin-top: 2px; }

        /* Video Grid */
        .sp-video-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .sp-video-card { height: 165px; border-radius: 14px; background-size: cover; background-position: center; position: relative; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .sp-video-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.2); display: flex; justify-content: center; align-items: center;
        }
        .sp-video-status { position: absolute; top: 10px; left: 10px; padding: 4px 8px; border-radius: 5px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-teal { background: rgba(13, 148, 136, 0.95); color: #FFF; }
        .status-orange { background: rgba(245, 158, 11, 0.95); color: #FFF; }
        .sp-play-btn { width: 44px; height: 44px; border-radius: 50%; border: 2px solid #FFF; display: flex; align-items: center; justify-content: center; color: #FFF; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); cursor: pointer; transition: all 0.2s; }
        .sp-play-btn:hover { background: rgba(255,255,255,0.45); transform: scale(1.08); }

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
