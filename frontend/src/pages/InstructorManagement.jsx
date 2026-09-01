import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const fitnessColors = { Elite: '#FF9800', Advanced: '#7C3AED', Intermediate: '#F59E0B', Beginner: '#6B7280' };

const getCoverImage = (name) => {
  const lowercase = name?.toLowerCase() || '';
  if (lowercase.includes('kai')) return 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=400&q=80'; // Surfer walking
  if (lowercase.includes('bethany')) return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'; // Beach board
  if (lowercase.includes('carissa')) return 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=400&q=80'; // Beach wave
  if (lowercase.includes('john') || lowercase.includes('kolohe') || lowercase.includes('florence')) return 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=400&q=80'; // Palm beach
  return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80';
};

const InstructorManagement = () => {
  const navigate = useNavigate();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [schoolsList, setSchoolsList] = useState(['Aquatic Indica Surf School']);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [inviteModalData, setInviteModalData] = useState(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [headerInviteCopied, setHeaderInviteCopied] = useState(false);

  // Coach Password Management State
  const [passwordModalCoach, setPasswordModalCoach] = useState(null);
  const [coachEmailInput, setCoachEmailInput] = useState('');
  const [coachNewPass, setCoachNewPass] = useState('');
  const [coachPassLoading, setCoachPassLoading] = useState(false);
  const [coachPassSuccess, setCoachPassSuccess] = useState('');
  const [coachPassError, setCoachPassError] = useState('');
  const [showPassCardMap, setShowPassCardMap] = useState({});
  const [copiedCoachPassId, setCopiedCoachPassId] = useState(null);
  const [showFormPass, setShowFormPass] = useState(false);
  const [showModalPass, setShowModalPass] = useState(false);

  const getActiveSchoolName = () => {
    try {
      const activeSchool = sessionStorage.getItem('activeSchool');
      if (activeSchool) {
        const parsed = JSON.parse(activeSchool);
        if (parsed.name) return parsed.name;
      }
      const user = sessionStorage.getItem('user');
      if (user) {
        const parsed = JSON.parse(user);
        if (parsed.school) return parsed.school;
        if (parsed.school_name) return parsed.school_name;
      }
    } catch (e) {}
    return 'Aquatic Indica Surf School';
  };

  const [form, setForm] = useState({
    name: '', email: '', password: '', dob: '', age: 28, gender: 'Male', fitness_level: 'Elite',
    experience: '', certifications: '', languages: '', biography: '', image: '',
    school: getActiveSchoolName()
  });

  const handleCopyGeneralCoachInvite = () => {
    const baseUrl = window.location.origin;
    const schoolName = schoolsList[0] || 'Aquatic Indica Surf School';
    const inviteUrl = `${baseUrl}/coach-portal`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
    }
    setHeaderInviteCopied(true);
    setTimeout(() => setHeaderInviteCopied(false), 3000);
    setInviteModalData({
      name: `Coach / Instructor`,
      school: schoolName,
      link: inviteUrl,
      isGeneral: true
    });
  };

  const handleGenerateCoachInvite = (instructor) => {
    const baseUrl = window.location.origin;
    const schoolName = instructor.school || schoolsList[0] || 'Aquatic Indica Surf School';
    const inviteUrl = `${baseUrl}/coach-portal?id=${instructor.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
    }
    setCopiedInviteId(instructor.id);
    setTimeout(() => setCopiedInviteId(null), 3000);
    setInviteModalData({
      id: instructor.id,
      name: instructor.name,
      school: schoolName,
      link: inviteUrl,
      phone: instructor.phone || instructor.whatsapp_number || ''
    });
  };

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
          setForm(prev => ({ ...prev, image: uploadedUrl }));
        }
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const [allStudents, setAllStudents] = useState([]);

  const fetchInstructors = () => {
    fetch(`${API}/api/instructors`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setInstructors(data);
        }
      })
      .catch(err => {
        console.error('Error fetching instructors:', err);
      })
      .finally(() => setLoading(false));

    fetch(`${API}/api/students`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllStudents(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchInstructors();
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

  const filtered = instructors.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.fitness_level.toLowerCase().includes(search.toLowerCase()) ||
    (i.certifications && i.certifications.some(c => c.toLowerCase().includes(search.toLowerCase())))
  );

  const handleSaveCoachPassword = async (e) => {
    e.preventDefault();
    if (!passwordModalCoach) return;
    setCoachPassError('');
    setCoachPassSuccess('');
    if (!coachNewPass || coachNewPass.length < 6) {
      setCoachPassError('Password must be at least 6 characters.');
      return;
    }
    setCoachPassLoading(true);
    try {
      const res = await fetch(`${API}/api/instructors/${passwordModalCoach.id}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: coachEmailInput.trim(),
          password: coachNewPass.trim()
        })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.message)) {
        setCoachPassSuccess(`Password set successfully for ${passwordModalCoach.name}! Coach can now log in with email: ${data.email || coachEmailInput}`);
        fetchInstructors();
        setTimeout(() => {
          setPasswordModalCoach(null);
          setCoachPassSuccess('');
          setCoachNewPass('');
          setCoachEmailInput('');
        }, 2000);
      } else {
        setCoachPassError(data.detail || data.message || 'Failed to set password.');
      }
    } catch (err) {
      setCoachPassError('Network error. Please try again.');
    } finally {
      setCoachPassLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (uploadingPhoto) return;
    setSaving(true);
    try {
      const certs = typeof form.certifications === 'string'
        ? form.certifications.split(',').map(c => c.trim()).filter(Boolean)
        : form.certifications;

      const safeImage = (form.image && !form.image.startsWith('blob:')) ? form.image : '';

      const res = await fetch(`${API}/api/instructors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || '',
          password: form.password || '',
          dob: form.dob || '',
          age: parseInt(form.age) || 28,
          gender: form.gender,
          fitness_level: form.fitness_level,
          experience: form.experience,
          certifications: certs,
          image: safeImage,
          school: form.school || 'Individual / Freelance Coach',
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setPhotoPreview('');
        setForm({ name: '', email: '', password: '', dob: '', age: 28, gender: 'Male', fitness_level: 'Elite', experience: '', certifications: '', languages: '', biography: '', image: '', school: getActiveSchoolName() });
        fetchInstructors();
      }
    } catch (err) {}
    setSaving(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selected || uploadingPhoto) return;
    setSaving(true);
    try {
      const certs = typeof form.certifications === 'string'
        ? form.certifications.split(',').map(c => c.trim()).filter(Boolean)
        : form.certifications;

      const safeImage = (form.image && !form.image.startsWith('blob:')) ? form.image : '';

      const res = await fetch(`${API}/api/instructors/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || '',
          dob: form.dob || '',
          age: parseInt(form.age) || 28,
          gender: form.gender,
          fitness_level: form.fitness_level,
          experience: form.experience,
          certifications: certs,
          image: safeImage,
          school: form.school || getActiveSchoolName(),
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setSelected(null);
        setPhotoPreview('');
        setForm({ name: '', email: '', dob: '', age: 28, gender: 'Male', fitness_level: 'Elite', experience: '', certifications: '', languages: '', biography: '', image: '', school: getActiveSchoolName() });
        fetchInstructors();
      }
    } catch (err) {}
    setSaving(false);
  };

  const handleDelete = async (e, instructor) => {
    e && e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${instructor.name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(instructor.id);
    try {
      const res = await fetch(`${API}/api/instructors/${instructor.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (selected && selected.id === instructor.id) {
          setSelected(null);
          setShowAddModal(false);
        }
        fetchInstructors();
      } else {
        alert('Failed to delete instructor.');
      }
    } catch (err) {
      alert('Error deleting instructor.');
    } finally {
      setDeletingId(null);
    }
  };

  const hasInstructors = instructors.length > 0;

  return (
    <div className="im-page">
      <Sidebar />

      <main className="im-main">
        {/* Header */}
        <div className="im-header">
          <div>
            <h1 className="im-title">Instructors</h1>
            <p className="im-subtitle">Manage your school's coaching roster and assignments.</p>
          </div>
          <button
            className="im-btn-add-primary"
            onClick={() => {
              setSelected(null);
              setPhotoPreview('');
              setForm({
                name: '', email: '', password: '', dob: '', age: 28, gender: 'Male', fitness_level: 'Elite',
                experience: '', certifications: '', languages: '', biography: '', image: '',
                school: getActiveSchoolName()
              });
              setShowAddModal(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Instructor
          </button>
        </div>

        {/* Search Bar */}
        <div className="im-search-bar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Search by name, certification, or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Layout: Left Column (List) & Right Column (Add/Edit Sidebar) */}
        <div className="im-content-layout">
          {/* Left Column - Instructors List */}
          <div className="im-left-column">

            {loading ? (
              <div className="db-loading"><div className="db-spinner" /></div>
            ) : (
              <div className="im-grid">
                {filtered.length === 0 && (
                  <div className="im-empty">No instructors match your search.</div>
                )}
                {filtered.map((instructor) => {
                  const hasValidImage = instructor.image && !instructor.image.startsWith('blob:');
                  return (
                    <div key={instructor.id} className="im-card">
                      {/* Profile photo avatar only */}
                      <div className="im-avatar-header">
                        <div className="im-avatar-wrapper">
                          {hasValidImage ? (
                            <img
                              src={instructor.image}
                              alt={instructor.name}
                              className="im-avatar-img"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement.querySelector('.im-avatar-fallback');
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="im-avatar-fallback"
                            style={{
                              display: hasValidImage ? 'none' : 'flex',
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
                            {instructor.name ? instructor.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                        </div>
                      </div>

                      <div className="im-card-body">
                        <h3 className="im-card-name">{instructor.name}</h3>
                        <p className="im-card-details">
                          {instructor.age} years • {instructor.location || 'Oahu, HI'}
                        </p>
                        
                        <div className="im-card-badges">
                          <span className="im-badge-cert">
                            {Array.isArray(instructor.certifications) && instructor.certifications[0]
                              ? instructor.certifications[0]
                              : (typeof instructor.certifications === 'string' && instructor.certifications ? instructor.certifications.split(',')[0] : 'ISA Level 1')}
                          </span>
                          <span className="im-badge-level" style={{ background: instructor.school && instructor.school !== 'Individual / Freelance Coach' ? 'rgba(13, 148, 136, 0.12)' : 'rgba(59, 130, 246, 0.12)', color: instructor.school && instructor.school !== 'Individual / Freelance Coach' ? '#0D9488' : '#2563EB', borderColor: 'transparent' }}>
                            {instructor.school ? (instructor.school.length > 20 ? instructor.school.slice(0, 18) + '...' : instructor.school) : 'Individual Coach'}
                          </span>
                        </div>

                        <div className="im-card-divider" />

                        {/* Coach Login Credentials Snippet */}
                        <div style={{
                          margin: '6px 0 10px 0',
                          padding: '7px 12px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <span style={{ color: '#64748B', fontWeight: 600, fontSize: '11.5px' }}>Password:</span>
                            <span style={{
                              fontWeight: 700,
                              fontFamily: showPassCardMap[instructor.id] && instructor.password_plain ? 'monospace' : 'inherit',
                              color: instructor.password_plain ? '#0F766E' : (instructor.has_password ? '#334155' : '#94A3B8'),
                              fontSize: '12px'
                            }}>
                              {instructor.password_plain
                                ? (showPassCardMap[instructor.id] ? instructor.password_plain : '••••••••')
                                : (instructor.has_password ? '••••••••' : 'Not set')}
                            </span>
                          </div>
                          {instructor.password_plain ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowPassCardMap(prev => ({ ...prev, [instructor.id]: !prev[instructor.id] }));
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B', display: 'flex', alignItems: 'center' }}
                                title={showPassCardMap[instructor.id] ? 'Hide Password' : 'Show Password'}
                              >
                                {showPassCardMap[instructor.id] ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (navigator.clipboard) {
                                    navigator.clipboard.writeText(instructor.password_plain);
                                    setCopiedCoachPassId(instructor.id);
                                    setTimeout(() => setCopiedCoachPassId(null), 2000);
                                  }
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: copiedCoachPassId === instructor.id ? '#10B981' : '#64748B', display: 'flex', alignItems: 'center' }}
                                title="Copy Password"
                              >
                                {copiedCoachPassId === instructor.id ? (
                                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 800 }}>Copied!</span>
                                ) : (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                )}
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div className="im-card-stats">
                          <div className="im-card-stat">
                            <span className="stat-label">Students</span>
                            <span className="stat-value">
                              {allStudents.filter(s => 
                                s.instructor_id === instructor.id || 
                                s.instructor_id === parseInt(instructor.id) ||
                                (s.instructor && instructor.name && s.instructor.toLowerCase().trim() === instructor.name.toLowerCase().trim())
                              ).length}
                            </span>
                          </div>
                          <div className="im-card-stat">
                            <span className="stat-label">Experience</span>
                            <span className="stat-value">{instructor.experience || '2 Years'}</span>
                          </div>
                        </div>

                        <div className="im-card-footer">
                          <button className="im-card-view-profile" onClick={() => navigate(`/instructors/${instructor.id}`)}>
                            View Profile
                          </button>
                          <button
                            type="button"
                            className="im-card-key-btn"
                            title="Set or update coach login password"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: instructor.has_password ? 'rgba(13, 148, 136, 0.1)' : 'rgba(245, 158, 11, 0.12)',
                              color: instructor.has_password ? '#0D9488' : '#D97706',
                              border: `1px solid ${instructor.has_password ? 'rgba(13, 148, 136, 0.3)' : 'rgba(245, 158, 11, 0.35)'}`,
                              padding: '8px 11px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              fontFamily: "'Outfit', sans-serif",
                              transition: 'all 0.2s ease',
                              flexShrink: 0
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPasswordModalCoach(instructor);
                              setCoachEmailInput(instructor.email || '');
                              setCoachNewPass('');
                              setCoachPassError('');
                              setCoachPassSuccess('');
                            }}
                          >
                            <span>🔑 {instructor.has_password ? 'Password' : 'Set Pwd'}</span>
                          </button>
                          <button
                            type="button"
                            className="im-card-invite-btn"
                            title="Generate & copy invite link for coach"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: copiedInviteId === instructor.id ? 'rgba(16, 185, 129, 0.12)' : 'rgba(13, 148, 136, 0.1)',
                              color: copiedInviteId === instructor.id ? '#10B981' : '#0D9488',
                              border: `1px solid ${copiedInviteId === instructor.id ? 'rgba(16, 185, 129, 0.3)' : 'rgba(13, 148, 136, 0.3)'}`,
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              fontFamily: "'Outfit', sans-serif",
                              transition: 'all 0.2s ease',
                              flexShrink: 0
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateCoachInvite(instructor);
                            }}
                          >
                            {copiedInviteId === instructor.id ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                <span>Invite</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="im-card-delete"
                            title="Delete Instructor"
                            disabled={deletingId === instructor.id}
                            onClick={(e) => handleDelete(e, instructor)}
                          >
                            {deletingId === instructor.id ? (
                              <span style={{ fontSize: '10px', fontWeight: 700 }}>...</span>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column - Add / Edit Sidebar Panel */}
          {showAddModal && (
            <div className="im-right-column">
              <div className="im-form-header">
                <h2>{selected ? 'Edit Instructor' : 'Add New Instructor'}</h2>
                <button className="im-form-close" onClick={() => { setShowAddModal(false); setSelected(null); setPhotoPreview(''); }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <form onSubmit={selected ? handleUpdate : handleAdd} className="im-sidebar-form">
                {/* Profile photo upload block */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
                {(() => {
                  const displayImage = photoPreview || (form.image && !form.image.startsWith('blob:') ? form.image : '');
                  return (
                    <div
                      className="im-photo-upload"
                      onClick={() => fileInputRef.current?.click()}
                      style={displayImage ? { padding: '16px', background: '#F0FDFA', borderColor: '#00D1B2' } : {}}
                    >
                      {displayImage ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={displayImage}
                            alt="Profile preview"
                            style={{
                              width: '72px',
                              height: '72px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '3px solid #00D1B2',
                              boxShadow: '0 4px 12px rgba(0,209,178,0.25)'
                            }}
                          />
                          <span className="upload-label" style={{ color: '#0F766E', fontWeight: '700', fontSize: '12px' }}>
                            {uploadingPhoto ? 'Uploading to cloud...' : '✓ Photo Selected (Click to change)'}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="upload-circle">
                            {uploadingPhoto ? (
                              <div className="db-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                            ) : (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                              </svg>
                            )}
                          </div>
                          <span className="upload-label">{uploadingPhoto ? 'Uploading to cloud...' : 'Upload profile photo...'}</span>
                        </>
                      )}
                    </div>
                  );
                })()}

                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" placeholder="e.g. Gabriel Medina" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. coach@surfclub.com"
                    value={form.email || ''}
                    onChange={e => setForm({...form, email: e.target.value})}
                  />
                </div>

                {!selected && (
                  <div className="form-group">
                    <label>Login Password (Optional)</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showFormPass ? 'text' : 'password'}
                        placeholder="Set password (min 6 chars) for coach login"
                        value={form.password || ''}
                        onChange={e => setForm({...form, password: e.target.value})}
                        style={{ width: '100%', paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPass(!showFormPass)}
                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                        title={showFormPass ? 'Hide password' : 'Show password'}
                      >
                        {showFormPass ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                    <small style={{ color: '#64748B', fontSize: '11.5px', marginTop: '2px', display: 'block' }}>
                      If set, the coach can immediately log in with their email and this password.
                    </small>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Birth (DOB)</label>
                    <input
                      type="date"
                      value={form.dob || ''}
                      onChange={e => {
                        const dobVal = e.target.value;
                        let calculatedAge = form.age;
                        if (dobVal) {
                          const birthYear = new Date(dobVal).getFullYear();
                          const currentYear = new Date().getFullYear();
                          if (birthYear && birthYear > 1920 && birthYear <= currentYear) {
                            calculatedAge = currentYear - birthYear;
                          }
                        }
                        setForm({ ...form, dob: dobVal, age: calculatedAge });
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Age</label>
                    <input type="number" placeholder="28" value={form.age} onChange={e => setForm({...form, age: e.target.value})} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Gender</label>
                    <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Non-binary</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fitness Level</label>
                    <select value={form.fitness_level} onChange={e => setForm({...form, fitness_level: e.target.value})}>
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>Elite</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Experience</label>
                    <input type="text" placeholder="e.g. 5 Years" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Affiliation / Surf School</label>
                  <select
                    value={form.school || 'Individual / Freelance Coach'}
                    onChange={e => setForm({ ...form, school: e.target.value })}
                  >
                    <option value="Individual / Freelance Coach">👤 Individual / Freelance Coach (Independent)</option>
                    {schoolsList.filter(s => s !== 'Individual / Freelance Coach').map(s => (
                      <option key={s} value={s}>🏫 {s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Certifications (comma separated)</label>
                  <input type="text" placeholder="ISA Level 2, Surf Coach Safety" value={form.certifications} onChange={e => setForm({...form, certifications: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>Languages</label>
                  <input type="text" placeholder="English, Portuguese, Spanish" value={form.languages || ''} onChange={e => setForm({...form, languages: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>Biography</label>
                  <textarea placeholder="Quick bio for students..." value={form.biography || ''} onChange={e => setForm({...form, biography: e.target.value})} rows={3} />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => { setShowAddModal(false); setSelected(null); setPhotoPreview(''); }}>Cancel</button>
                  <button type="submit" className="btn-save" disabled={saving || uploadingPhoto}>
                    {uploadingPhoto ? 'Uploading Photo...' : (saving ? 'Saving...' : 'Save Instructor')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* ── Direct Coach / Instructor Invite Link Modal ── */}
        {inviteModalData && (
          <div
            className="im-modal-overlay"
            onClick={() => setInviteModalData(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(5, 11, 26, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div
              className="im-modal"
              style={{
                maxWidth: '520px',
                width: '100%',
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '28px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.1)', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                    🏄‍♂️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                      Coach / Instructor Invite Link
                    </h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                      Ready for <strong>{inviteModalData.name}</strong> • {inviteModalData.school}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInviteModalData(null)}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Direct Magic Coach Join Link</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '10px' }}>
                    ✓ Copied to Clipboard
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={inviteModalData.link}
                  style={{
                    width: '100%',
                    background: '#0F172A',
                    color: '#00F2FE',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onClick={e => e.target.select()}
                />
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>
                  The coach can open this link to sign up, link their account to <strong>{inviteModalData.school}</strong>, and access the coaching roster.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteModalData.link);
                      setInviteLinkCopied(true);
                      setTimeout(() => setInviteLinkCopied(false), 2500);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: inviteLinkCopied ? '#10B981' : '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
                    }}
                  >
                    {inviteLinkCopied ? '✓ Copied to Clipboard!' : '📋 Copy Invite Link'}
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hi! Here is your coach invitation link to join ${inviteModalData.school}: ${inviteModalData.link}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: '#25D366',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
                    }}
                  >
                    💬 Share WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coach Password Management Modal */}
        {passwordModalCoach && (
          <div className="sp-modal-overlay" onClick={() => setPasswordModalCoach(null)}>
            <div className="sp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
              <div className="sp-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    🔑
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Manage Coach Credentials</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>Coach: <strong>{passwordModalCoach.name}</strong></p>
                  </div>
                </div>
                <button className="sp-modal-close" onClick={() => setPasswordModalCoach(null)}>×</button>
              </div>

              {coachPassError && (
                <div style={{ margin: '14px 20px 0 20px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}>
                  ⚠️ {coachPassError}
                </div>
              )}
              {coachPassSuccess && (
                <div style={{ margin: '14px 20px 0 20px', padding: '10px 14px', background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}>
                  ✅ {coachPassSuccess}
                </div>
              )}

              <form onSubmit={handleSaveCoachPassword}>
                <div className="sp-modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {passwordModalCoach?.password_plain && (
                    <div style={{ padding: '10px 14px', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#0F766E', fontWeight: 700, textTransform: 'uppercase' }}>Current Password:</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0D9488', fontFamily: 'monospace', marginTop: '2px' }}>
                          {passwordModalCoach.password_plain}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(passwordModalCoach.password_plain);
                            setCopiedCoachPassId(passwordModalCoach.id);
                            setTimeout(() => setCopiedCoachPassId(null), 2000);
                          }
                        }}
                        style={{ padding: '5px 10px', borderRadius: '6px', background: '#0D9488', color: '#FFF', border: 'none', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {copiedCoachPassId === passwordModalCoach.id ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  )}

                  <div className="sp-form-field">
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Coach Email (Login ID) *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. coach@surfclub.com"
                      value={coachEmailInput}
                      onChange={(e) => setCoachEmailInput(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                    />
                    <small style={{ color: '#64748B', fontSize: '11.5px' }}>
                      Coach will use this email address to log in to WaveCoach.
                    </small>
                  </div>

                  <div className="sp-form-field">
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>New Password *</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showModalPass ? 'text' : 'password'}
                        required
                        placeholder="Minimum 6 characters"
                        value={coachNewPass}
                        onChange={(e) => setCoachNewPass(e.target.value)}
                        style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalPass(!showModalPass)}
                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                        title={showModalPass ? 'Hide password' : 'Show password'}
                      >
                        {showModalPass ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="sp-modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                  <button type="button" className="btn-secondary" onClick={() => setPasswordModalCoach(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={coachPassLoading}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      background: '#0D9488',
                      color: '#FFF',
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {coachPassLoading ? 'Saving...' : 'Save Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .im-page {
          display: flex;
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Inter', sans-serif;
        }
        .im-main {
          flex: 1;
          padding: 32px 40px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .im-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .im-title {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #050B1A;
          margin: 0;
        }
        .im-subtitle {
          font-size: 14px;
          color: #64748B;
          margin: 4px 0 0 0;
        }
        .im-btn-add-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          background: #F43F5E;
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25);
        }
        .im-btn-add-primary:hover {
          background: #E11D48;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(244, 63, 94, 0.35);
        }

        /* Search input bar */
        .im-search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 14px 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: all 0.2s;
        }
        .im-search-bar:focus-within {
          border-color: #00D1B2;
          box-shadow: 0 0 0 3px rgba(0, 209, 178, 0.12);
        }
        .im-search-bar svg {
          color: #94A3B8;
        }
        .im-search-bar input {
          border: none;
          outline: none;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          flex: 1;
          background: transparent;
          color: #050B1A;
        }
        .im-search-bar input::placeholder {
          color: #94A3B8;
        }

        /* 2-column layout grid */
        .im-content-layout {
          display: flex;
          gap: 32px;
          align-items: flex-start;
          width: 100%;
        }
        .im-left-column {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .im-right-column {
          width: 380px;
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid #E2E8F0;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-sizing: border-box;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
        }

        /* Form Header */
        .im-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 16px;
        }
        .im-form-header h2 {
          font-size: 18px;
          font-weight: 800;
          color: #050B1A;
          margin: 0;
        }
        .im-form-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #94A3B8;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .im-form-close:hover {
          color: #050B1A;
        }

        /* Sidebar Form Styles */
        .im-sidebar-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }
        .form-group label {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .form-group input, .form-group select, .form-group textarea {
          height: 42px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          padding: 0 12px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          background: #FFFFFF;
          color: #0F172A;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .form-group textarea {
          height: auto;
          padding: 12px;
          resize: vertical;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: #00D1B2;
          box-shadow: 0 0 0 3px rgba(0, 209, 178, 0.1);
        }
        .form-group input::placeholder, .form-group textarea::placeholder {
          color: #94A3B8;
        }
        .form-row {
          display: flex;
          gap: 12px;
        }
        .form-row .form-group {
          flex: 1;
        }

        /* Photo Upload UI */
        .im-photo-upload {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed #CBD5E1;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          background: #F8FAFC;
          transition: all 0.2s;
        }
        .im-photo-upload:hover {
          background: #F1F5F9;
          border-color: #94A3B8;
        }
        .upload-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .upload-label {
          font-size: 12.5px;
          color: #64748B;
          font-weight: 600;
        }

        /* Action Buttons */
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }
        .btn-cancel {
          flex: 1;
          padding: 12px;
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
        }
        .btn-cancel:hover {
          background: #F1F5F9;
          color: #0F172A;
        }
        .btn-save {
          flex: 1.2;
          padding: 12px;
          background: #00D1B2;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          color: #FFFFFF;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0, 209, 178, 0.25);
        }
        .btn-save:hover {
          background: #00B89C;
          box-shadow: 0 6px 16px rgba(0, 209, 178, 0.35);
        }

        /* Grid */
        .im-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }
        .im-empty {
          grid-column: 1/-1;
          text-align: center;
          color: #9CA3AF;
          padding: 40px;
          font-size: 16px;
        }

        /* Instructor Card */
        .im-card {
          position: relative;
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
          transition: all 0.22s ease-in-out;
          padding-top: 24px;
        }
        .im-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(5, 11, 26, 0.06);
          border-color: #CBD5E1;
        }
        .im-card-top-actions {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 5;
        }
        .im-card-top-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748B;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }
        .im-btn-top-edit:hover {
          background: #F0FDFA;
          color: #0D9488;
          border-color: #00D1B2;
          transform: scale(1.06);
        }
        .im-btn-top-delete:hover {
          background: #FEF2F2;
          color: #EF4444;
          border-color: #F87171;
          transform: scale(1.06);
        }
        .im-avatar-header {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }
        .im-avatar-wrapper {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          border: 3px solid #E2E8F0;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0,0,0,0.06);
          background: #F8FAFC;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .im-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .im-card-body {
          padding: 16px 20px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: center;
        }
        .im-card-name {
          font-size: 18px;
          font-weight: 750;
          color: #0F172A;
          margin: 0;
          text-align: center;
        }
        .im-card-details {
          font-size: 13px;
          color: #64748B;
          margin: 0;
          text-align: center;
        }
        .im-card-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .im-badge-cert {
          background: #E6F9F5;
          color: #00D1B2;
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .im-badge-level {
          background: #FFF3E0;
          color: #FF9800;
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .im-card-divider {
          height: 1px;
          background: #E2E8F0;
          width: 100%;
          margin: 4px 0;
        }
        .im-card-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .im-card-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
        }
        .im-card-stat .stat-label {
          font-size: 11px;
          color: #94A3B8;
          font-weight: 600;
          text-transform: uppercase;
        }
        .im-card-stat .stat-value {
          font-size: 14px;
          color: #0F172A;
          font-weight: 700;
        }
        .im-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .im-card-view-profile {
          flex: 1;
          padding: 10px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 700;
          color: #0F172A;
          cursor: pointer;
          transition: all 0.2s;
        }
        .im-card-view-profile:hover {
          background: #0F172A;
          color: #FFFFFF;
          border-color: #0F172A;
        }
        .im-card-edit {
          width: 38px;
          height: 38px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748B;
          cursor: pointer;
          background: #FFFFFF;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .im-card-edit:hover {
          background: #F0FDFA;
          color: #0D9488;
          border-color: #00D1B2;
        }
        .im-card-delete {
          width: 38px;
          height: 38px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94A3B8;
          cursor: pointer;
          background: #FFFFFF;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .im-card-delete:hover {
          background: #FEF2F2;
          color: #EF4444;
          border-color: #F87171;
        }

        /* Mobile adjustments */
        @media (max-width: 1100px) {
          .im-content-layout {
            flex-direction: column;
          }
          .im-right-column {
            width: 100%;
            position: static;
            max-height: none;
          }
        }
      `}</style>
    </div>
  );
};

export default InstructorManagement;
