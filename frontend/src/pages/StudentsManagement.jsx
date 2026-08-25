import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || 'http://54.242.160.238:8000';

const StudentsManagement = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [instructorFilter, setInstructorFilter] = useState('All');
  const [sessionTimeFilter, setSessionTimeFilter] = useState('All');
  const [stayFilter, setStayFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [modalInvite, setModalInvite] = useState(null); // link shown inside the add-student modal after creation
  const [attendanceModal, setAttendanceModal] = useState(null); // student object to mark attendance
  const [attSaving, setAttSaving] = useState(false);
  const [attError, setAttError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', level: 'Beginner', instructor_id: '',
    whatsapp_number: '', course_duration: '3 Days Course', session_time: 'Morning 6:00 AM',
    start_date: new Date().toISOString().split('T')[0], staying_at_school: 'Yes'
  });

  const closeModal = () => {
    setShowModal(false);
    setModalInvite(null);
    setCopied(false);
    setForm({
      name: '', email: '', password: '', level: 'Beginner', instructor_id: '',
      whatsapp_number: '', course_duration: '3 Days Course', session_time: 'Morning 6:00 AM',
      start_date: new Date().toISOString().split('T')[0], staying_at_school: 'Yes'
    });
  };

  const fetchStudents = () => {
    fetch(`${API}/api/students`)
      .then(r => r.json())
      .then(data => setStudents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
    fetch(`${API}/api/instructors`)
      .then(r => r.json())
      .then(data => setInstructors(data))
      .catch(() => {});
  }, []);

  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Master'];

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.whatsapp_number && s.whatsapp_number.includes(search));
    const matchLevel = levelFilter === 'All' || s.level === levelFilter;
    const matchInstructor = instructorFilter === 'All' || s.instructor === instructorFilter;
    const matchSession = sessionTimeFilter === 'All' || s.session_time === sessionTimeFilter;
    const matchStay = stayFilter === 'All' || (stayFilter === 'Lodge' ? s.staying_at_school === 'Yes' : s.staying_at_school === 'No');
    return matchSearch && matchLevel && matchInstructor && matchSession && matchStay;
  });

  const stats = [
    { value: students.length, label: 'TOTAL', color: '#050B1A', active: false },
    { value: students.filter(s => s.last_active === 'Today' || s.last_active === 'Yesterday').length, label: 'ACTIVE', color: '#0D9488', active: true },
    { value: students.filter(s => s.level === 'Beginner').length, label: 'BEGINNER', color: '#F59E0B', active: false },
    { value: students.filter(s => s.level === 'Intermediate').length, label: 'INTERMEDIATE', color: '#0D9488', active: false },
    { value: students.filter(s => s.level === 'Advanced').length, label: 'ADVANCED', color: '#7C3AED', active: false },
  ];

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          level: form.level,
          instructor_id: form.instructor_id ? parseInt(form.instructor_id) : null,
          whatsapp_number: form.whatsapp_number,
          course_duration: form.course_duration,
          session_time: form.session_time,
          start_date: form.start_date,
          staying_at_school: form.staying_at_school,
        }),
      });
      if (res.ok) {
        const newStudent = await res.json();
        fetchStudents();
        const baseUrl = window.location.origin;
        let inviteToken = `inv_${Date.now()}`;
        try {
          const invRes = await fetch(`${API}/api/students/${newStudent.id}/generate-invite`, { method: 'POST' });
          if (invRes.ok) {
            const invData = await invRes.json();
            if (invData.token) inviteToken = invData.token;
          }
        } catch (err) {}

        setModalInvite({
          name: form.name,
          email: form.email,
          link: `${baseUrl}/auth?invite=${inviteToken}`,
        });
      }
    } catch (err) {}
    setSaving(false);
  };

  return (
    <div className="sm-page">
      <Sidebar />
      <main className="sm-main">
        {/* Header */}
        <header className="sm-header">
          <div className="sm-header-text">
            <h1 className="sm-title">Students ({loading ? '…' : students.length})</h1>
            <p className="sm-sub">Manage your student body and track their progression across badge levels.</p>
          </div>
          <div className="sm-actions">
            <button className="sm-btn-secondary">Export CSV</button>
            <button className="sm-btn-primary" onClick={() => setShowModal(true)}>+ Add Student</button>
          </div>
        </header>

        {/* Filters */}
        <div className="sm-filters">
          <div className="sm-search-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder="Search students by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm-search-input"
            />
          </div>
          <select className="sm-select" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
            <option value="All">Level: All</option>
            {levels.map(l => <option key={l}>{l}</option>)}
          </select>
          <select className="sm-select" value={instructorFilter} onChange={e => setInstructorFilter(e.target.value)}>
            <option value="All">Instructor: All</option>
            {instructors.map(i => <option key={i.id}>{i.name}</option>)}
          </select>
          <select className="sm-select" value={sessionTimeFilter} onChange={e => setSessionTimeFilter(e.target.value)}>
            <option value="All">Session: All Slots</option>
            <option value="Morning 6:00 AM">Morning 6:00 AM (Dawn Patrol)</option>
            <option value="Morning 8:00 AM">Morning 8:00 AM</option>
            <option value="Evening 4:00 PM">Evening 4:00 PM</option>
          </select>
          <select className="sm-select" value={stayFilter} onChange={e => setStayFilter(e.target.value)}>
            <option value="All">Stay: All</option>
            <option value="Lodge">On-site Lodge</option>
            <option value="Offsite">Off-site Stay</option>
          </select>
        </div>

        {/* Stats */}
        <div className="sm-stats-grid">
          {stats.map(s => (
            <div key={s.label} className={`sm-stat-card ${s.active ? 'sm-stat-active' : ''}`}>
              <span className="sm-stat-value" style={{ color: s.color }}>{s.value}</span>
              <span className="sm-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="sm-table-container">
          {loading ? (
            <div className="sm-loading"><div className="sm-spinner" /></div>
          ) : (
            <table className="sm-table">
              <thead>
                <tr>
                  <th>Student & WhatsApp</th>
                  <th>Course Progress</th>
                  <th>Session & Stay</th>
                  <th>Primary Instructor</th>
                  <th>Attendance</th>
                  <th>Invite</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #E2E8F0', cursor: 'pointer' }}
                    onClick={() => navigate(`/students/${s.id}`)}
                  >
                    <td>
                      <div className="sm-student-info">
                        <img src={s.image} alt={s.name} className="sm-student-avatar" onError={e => e.target.style.display='none'} />
                        <div>
                          <div className="sm-student-name">{s.name}</div>
                          <div className="sm-student-email">
                            {s.whatsapp_number ? `📱 +91 ${s.whatsapp_number}` : s.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          Day {s.which_day || 1} of {s.total_days || 3}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {s.course_duration || '3 Days Course'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                          ⏰ {s.session_time || 'Morning 6:00 AM'}
                        </span>
                        <span style={{ fontSize: '11px', color: s.staying_at_school === 'Yes' ? '#10B981' : '#64748B' }}>
                          {s.staying_at_school === 'Yes' ? '🏨 On-site Lodge' : '🚗 Off-site Stay'}
                        </span>
                      </div>
                    </td>
                    <td className="sm-instructor-text">{s.instructor || '—'}</td>
                    <td>
                      <button
                        className="sm-invite-btn"
                        style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.25)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttendanceModal(s);
                        }}
                      >
                        ✓ Mark Daily
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                        {!s.user_id && (
                          <button
                            className="sm-invite-btn"
                            title="Generate & copy invite link"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const invRes = await fetch(`${API}/api/students/${s.id}/generate-invite`, { method: 'POST' });
                                if (invRes.ok) {
                                  const invData = await invRes.json();
                                  const baseUrl = window.location.origin;
                                  setModalInvite({
                                    name: s.name,
                                    email: s.email,
                                    link: `${baseUrl}/auth?invite=${invData.token}`,
                                  });
                                }
                              } catch (err) {}
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            Invite
                          </button>
                        )}
                        {s.user_id && (
                          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Joined
                          </span>
                        )}
                      </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="sm-action-btn" onClick={e => { e.stopPropagation(); navigate(`/students/${s.id}`); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                      {students.length === 0 ? 'No students yet — add one above.' : 'No students match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Direct Invite Link Modal */}
      {showModal && (
        <div className="sm-modal-overlay" onClick={closeModal}>
          <div className="sm-modal sm-invite-modal" onClick={e => e.stopPropagation()}>
            <div className="sm-modal-header">
              <h3 className="sm-modal-title">📬 Student Registration Link</h3>
              <button className="sm-modal-close" onClick={closeModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="invite-success-banner" style={{ background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.25)' }}>
              <div className="invite-success-icon" style={{ background: '#0D9488', color: '#FFF' }}>🏄</div>
              <div>
                <div className="invite-success-title" style={{ color: '#0F172A' }}>{modalInvite?.schoolName || 'Surf School'} Registration Link</div>
                <div className="invite-success-sub" style={{ color: '#475569' }}>Share this link with students. When they register, they will automatically be assigned to your school!</div>
              </div>
            </div>

            <div className="invite-link-section" style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Official Registration Link</div>
              <div className="invite-link-box">
                <input
                  type="text"
                  readOnly
                  value={modalInvite?.link || `${window.location.origin}/auth`}
                  className="invite-link-input"
                  onClick={e => e.target.select()}
                  autoFocus
                />
                <button
                  type="button"
                  className={`invite-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={() => {
                    navigator.clipboard.writeText(modalInvite?.link || `${window.location.origin}/auth`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="invite-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Aloha! Here is your official registration link for ${modalInvite?.schoolName}: ${modalInvite?.link}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="invite-action-btn invite-wa"
                style={{ flex: 1, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                💬 WhatsApp Share
              </a>
              <button
                type="button"
                className="sm-btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  closeModal();
                  window.open(modalInvite?.link, '_blank');
                }}
              >
                Open Signup Page ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Attendance Modal — Tamper-Proof Attendance Marking */}
      {attendanceModal && (
        <div className="sm-modal-overlay" onClick={() => setAttendanceModal(null)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="sm-modal-header">
              <h3 className="sm-modal-title">📋 Mark Attendance</h3>
              <button className="sm-modal-close" onClick={() => setAttendanceModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>{attendanceModal.name}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Course: {attendanceModal.course_duration || '3 Days Course'} · Current: Day {attendanceModal.which_day || 1} of {attendanceModal.total_days || 3}
              </div>
            </div>

            {attError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '14px' }}>
                ⚠️ {attError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAttSaving(true);
                setAttError('');
                const formEl = e.target;
                const dateVal = formEl.elements.att_date.value;
                const statusVal = formEl.elements.att_status.value;
                const guestsVal = parseInt(formEl.elements.att_guests.value) || 0;
                const notesVal = formEl.elements.att_notes.value;

                try {
                  const res = await fetch(`${API}/api/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      student_id: attendanceModal.id,
                      date: dateVal,
                      present_status: statusVal,
                      guests_present: guestsVal,
                      notes: notesVal
                    })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setAttendanceModal(null);
                    fetchStudents();
                  } else {
                    setAttError(data.detail || 'Failed to mark attendance.');
                  }
                } catch (err) {
                  setAttError('Server connection error.');
                } finally {
                  setAttSaving(false);
                }
              }}
              className="sm-modal-form"
            >
              <div className="sm-field">
                <label>Attendance Date</label>
                <input type="date" name="att_date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="sm-field" style={{ flex: 1 }}>
                  <label>Status</label>
                  <select name="att_status" defaultValue="Present">
                    <option value="Present">Present (Attended)</option>
                    <option value="Absent">Absent</option>
                    <option value="Excused">Excused Leave</option>
                  </select>
                </div>
                <div className="sm-field" style={{ flex: 1 }}>
                  <label>Guests Present</label>
                  <input type="number" name="att_guests" defaultValue={0} min={0} />
                </div>
              </div>

              <div className="sm-field">
                <label>Notes / Observations</label>
                <input type="text" name="att_notes" placeholder="e.g. Wave pop-up drills performed" />
              </div>

              <div className="sm-modal-actions" style={{ marginTop: '12px' }}>
                <button type="button" className="sm-btn-secondary" onClick={() => setAttendanceModal(null)}>Cancel</button>
                <button type="submit" className="sm-btn-primary" disabled={attSaving}>
                  {attSaving ? <span className="sm-btn-spinner" /> : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .sm-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .sm-main { flex: 1; padding: 40px 80px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }
        
        .sm-header { display: flex; justify-content: space-between; align-items: center; }
        .sm-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.2; }
        .sm-sub { font-size: 16px; color: #64748B; margin: 8px 0 0 0; }
        
        .sm-actions { display: flex; gap: 12px; }
        .sm-btn-secondary {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px;
          padding: 12px 24px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; color: #0F172A; cursor: pointer;
        }
        .sm-btn-primary {
          background: #F43F5E; border: none; border-radius: 8px;
          padding: 12px 24px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; color: #FFFFFF; cursor: pointer;
          display: flex; align-items: center; gap: 8px;
        }
        .sm-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .sm-filters { display: flex; gap: 20px; align-items: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; }
        .sm-search-wrap { display: flex; align-items: center; gap: 12px; background: #F8F6F2; border-radius: 8px; padding: 0 16px; height: 44px; flex: 1; }
        .sm-search-input { border: none; outline: none; background: transparent; font-size: 12px; color: #94A3B8; width: 100%; }
        .sm-select {
          border: 1px solid #E2E8F0; border-radius: 8px; height: 44px; padding: 0 16px; width: 180px;
          font-size: 12px; color: #0F172A; background: #FFF; outline: none; cursor: pointer;
        }

        .sm-stats-grid { display: flex; gap: 20px; }
        .sm-stat-card {
          flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; height: 100px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
        }
        .sm-stat-active { border-color: #0D9488; background: rgba(13, 148, 136, 0.05); }
        .sm-stat-value { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; line-height: 1.2; }
        .sm-stat-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; opacity: 0.6; }

        .sm-table-container { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; }
        .sm-table { width: 100%; border-collapse: collapse; }
        .sm-table th {
          text-align: left; padding: 24px 16px 12px 16px; font-size: 11px; font-weight: 600;
          color: #9CA3AF; text-transform: uppercase; border-bottom: 1px solid #E2E8F0;
        }
        .sm-table td { padding: 16px; vertical-align: middle; }
        
        .sm-student-info { display: flex; align-items: center; gap: 16px; }
        .sm-student-avatar { width: 40px; height: 40px; border-radius: 20px; object-fit: cover; }
        .sm-student-name { font-size: 12px; font-weight: 700; color: #0F172A; }
        .sm-student-email { font-size: 13px; color: #64748B; margin-top: 2px; }
        
        .sm-level-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; display: inline-block; }
        .level-beginner { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
        .level-intermediate { background: rgba(13, 148, 136, 0.12); color: #0D9488; }
        .level-advanced { background: rgba(124, 58, 237, 0.12); color: #7C3AED; }
        .level-master { background: rgba(5, 11, 26, 0.07); color: #050B1A; border: 1px solid #E2E8F0; }

        .sm-instructor-text { font-size: 13px; color: #64748B; }
        .sm-date-text { font-size: 13px; color: #64748B; }
        
        .sm-action-btn { background: transparent; border: none; color: #94A3B8; cursor: pointer; padding: 8px; border-radius: 4px; }
        .sm-action-btn:hover { background: #F8FAFC; color: #0F172A; }

        .sm-loading { display: flex; justify-content: center; align-items: center; height: 200px; }
        .sm-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(244, 63, 94, 0.2);
          border-top-color: #F43F5E;
          border-radius: 50%;
          animation: sm-spin 0.7s linear infinite;
        }
        @keyframes sm-spin { to { transform: rotate(360deg); } }

        /* Modal */
        .sm-modal-overlay {
          position: fixed; inset: 0; background: rgba(5,11,26,0.45);
          backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center;
          z-index: 1000; animation: sm-fadeIn 0.25s ease;
        }
        @keyframes sm-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sm-modal {
          background: #FFFFFF; border-radius: 24px; padding: 36px; width: 100%; max-width: 480px;
          box-shadow: 0 24px 60px rgba(5,11,26,0.18);
          animation: sm-slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes sm-slideUp { from { transform: translateY(32px) scale(0.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .sm-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .sm-modal-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700; color: #0F172A; margin: 0; }
        .sm-modal-close {
          background: #F1F5F9; border: none; width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748B;
        }
        .sm-modal-close:hover { background: #E2E8F0; }
        .sm-modal-form { display: flex; flex-direction: column; gap: 18px; }
        .sm-field { display: flex; flex-direction: column; gap: 6px; }
        .sm-field label { font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.4px; }
        .sm-field input, .sm-field select {
          height: 46px; border: 1.5px solid #E2E8F0; border-radius: 10px;
          padding: 0 14px; font-size: 14px; color: #0F172A; background: #FFF;
          outline: none; font-family: 'Instrument Sans', sans-serif; transition: border-color 0.2s;
        }
        .sm-field input:focus, .sm-field select:focus { border-color: #F43F5E; box-shadow: 0 0 0 3px rgba(244,63,94,0.1); }
        .sm-field input::placeholder { color: #94A3B8; }
        .sm-modal-actions { display: flex; gap: 12px; margin-top: 8px; }
        .sm-modal-actions .sm-btn-secondary { flex: 1; text-align: center; justify-content: center; }
        .sm-modal-actions .sm-btn-primary { flex: 1; justify-content: center; padding: 12px; font-size: 14px; }
        .sm-btn-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
          border-radius: 50%; animation: sm-spin 0.7s linear infinite;
        }

        /* Invite link button in table */
        .sm-invite-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(99,102,241,0.08); color: #6366F1;
          border: 1px solid rgba(99,102,241,0.25); padding: 6px 11px;
          border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .sm-invite-btn:hover { background: rgba(99,102,241,0.16); border-color: #6366F1; }

        /* Invite Modal Extras */
        .sm-invite-modal { max-width: 520px; }
        .invite-success-banner {
          display: flex; align-items: flex-start; gap: 14px;
          background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.2);
          border-radius: 14px; padding: 16px 18px; margin-bottom: 20px;
        }
        .invite-success-icon {
          width: 32px; height: 32px; border-radius: 50%;
          background: #10B981; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
        }
        .invite-success-title { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .invite-success-sub { font-size: 13px; color: #64748B; line-height: 1.5; }
        .invite-link-section { margin-bottom: 20px; }
        .invite-link-box {
          display: flex; gap: 8px; align-items: center;
          background: #F8FAFC; border: 1.5px solid #E2E8F0;
          border-radius: 12px; padding: 4px 4px 4px 14px; overflow: hidden;
        }
        .invite-link-input {
          flex: 1; border: none; outline: none; background: transparent;
          font-size: 13px; color: #334155; font-family: monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .invite-copy-btn {
          background: #F43F5E; color: #fff; border: none;
          border-radius: 8px; padding: 9px 16px; font-size: 13px;
          font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s; flex-shrink: 0;
        }
        .invite-copy-btn.copied { background: #10B981; }
        .invite-copy-btn:hover { opacity: 0.88; }
        .invite-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .invite-action-btn {
          flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          padding: 11px 16px; border-radius: 10px; font-size: 13px; font-weight: 700;
          cursor: pointer; text-decoration: none; border: none; transition: all 0.2s; min-width: 130px;
        }
        .invite-email { background: rgba(99,102,241,0.1); color: #6366F1; border: 1px solid rgba(99,102,241,0.2); }
        .invite-email:hover { background: rgba(99,102,241,0.18); }
        .invite-wa { background: rgba(37,211,102,0.1); color: #16A34A; border: 1px solid rgba(37,211,102,0.2); }
        .invite-wa:hover { background: rgba(37,211,102,0.18); }
        .invite-done { background: #F43F5E; color: #fff; }
        .invite-done:hover { background: #e8374f; }
      `}</style>
    </div>
  );
};

export default StudentsManagement;
