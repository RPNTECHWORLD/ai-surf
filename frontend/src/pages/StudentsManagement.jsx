import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || '';

const StudentsManagement = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [instructorFilter, setInstructorFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', level: 'Beginner', instructor_id: '',
  });

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
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'All' || s.level === levelFilter;
    const matchInstructor = instructorFilter === 'All' || s.instructor === instructorFilter;
    return matchSearch && matchLevel && matchInstructor;
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
          level: form.level,
          instructor_id: form.instructor_id ? parseInt(form.instructor_id) : null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: '', email: '', level: 'Beginner', instructor_id: '' });
        fetchStudents();
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
                  <th>Student</th>
                  <th>Level</th>
                  <th>Primary Instructor</th>
                  <th>Last Active</th>
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
                          <div className="sm-student-email">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`sm-level-badge level-${s.level.toLowerCase()}`}>{s.level}</span>
                    </td>
                    <td className="sm-instructor-text">{s.instructor || '—'}</td>
                    <td className="sm-date-text">{s.last_active}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="sm-action-btn" onClick={e => { e.stopPropagation(); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                      {students.length === 0 ? 'No students yet — add one above.' : 'No students match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Add Student Modal */}
      {showModal && (
        <div className="sm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            <div className="sm-modal-header">
              <h3 className="sm-modal-title">Add New Student</h3>
              <button className="sm-modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="sm-modal-form">
              <div className="sm-field">
                <label>Full Name</label>
                <input type="text" placeholder="e.g. Alex Torres" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="sm-field">
                <label>Email Address</label>
                <input type="email" placeholder="alex@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="sm-field">
                <label>Skill Level</label>
                <select value={form.level} onChange={e => setForm({...form, level: e.target.value})}>
                  {levels.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="sm-field">
                <label>Assign Instructor (optional)</label>
                <select value={form.instructor_id} onChange={e => setForm({...form, instructor_id: e.target.value})}>
                  <option value="">— No instructor yet —</option>
                  {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="sm-modal-actions">
                <button type="button" className="sm-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="sm-btn-primary" disabled={saving}>
                  {saving ? <span className="sm-btn-spinner" /> : 'Add Student'}
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
      `}</style>
    </div>
  );
};

export default StudentsManagement;
