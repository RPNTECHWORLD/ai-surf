import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:8000';

const fitnessColors = { Elite: '#00D1B2', Advanced: '#7C3AED', Intermediate: '#F59E0B', Beginner: '#6B7280' };

const InstructorManagement = () => {
  const navigate = useNavigate();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', age: '', gender: 'Male', fitness_level: 'Elite',
    experience: '', certifications: '',
  });

  const fetchInstructors = () => {
    fetch(`${API}/api/instructors`)
      .then(r => r.json())
      .then(data => setInstructors(data))
      .catch(() => setInstructors([
        { id: 1, name: 'Kai Lenny', age: 30, gender: 'Male', fitness_level: 'Elite', experience: '12 Years', certifications: ['ISA Level 2', 'CPR'], image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' },
        { id: 2, name: 'Bethany Hamilton', age: 34, gender: 'Female', fitness_level: 'Elite', experience: '15 Years', certifications: ['ISA Level 3', 'First Aid'], image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100' },
        { id: 3, name: 'Kolohe Andino', age: 28, gender: 'Male', fitness_level: 'Advanced', experience: '8 Years', certifications: ['ISA Level 1', 'CPR'], image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
        { id: 4, name: 'Carissa Moore', age: 31, gender: 'Female', fitness_level: 'Elite', experience: '14 Years', certifications: ['ISA Level 3', 'First Aid', 'Water Safety'], image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100' },
      ]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInstructors(); }, []);

  const filtered = instructors.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.fitness_level.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (instructor) => { setSelected(instructor); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setSelected(null); };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const certs = form.certifications.split(',').map(c => c.trim()).filter(Boolean);
      const res = await fetch(`${API}/api/instructors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          age: parseInt(form.age),
          gender: form.gender,
          fitness_level: form.fitness_level,
          experience: form.experience,
          certifications: certs,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setForm({ name: '', age: '', gender: 'Male', fitness_level: 'Elite', experience: '', certifications: '' });
        fetchInstructors();
      }
    } catch (err) {}
    setSaving(false);
  };

  return (
    <div className="im-page">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <main className="im-main">
        <header className="db-header">
          <div>
            <h1 className="db-header-title">Instructors</h1>
            <p className="db-header-sub">Manage your coaching team.</p>
          </div>
          <button className="btn-primary db-cta" onClick={() => setShowAddModal(true)}>+ Add Instructor</button>
        </header>

        {/* Search */}
        <div className="im-search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="im-search-input"
            type="text"
            placeholder="Search by name or fitness level…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="db-loading"><div className="db-spinner" /></div>
        ) : (
          <div className="im-grid">
            {filtered.length === 0 && (
              <div className="im-empty">No instructors match your search.</div>
            )}
            {filtered.map((instructor) => (
              <div key={instructor.id} className="im-card" onClick={() => openModal(instructor)}>
                <div className="im-card-top">
                  <img src={instructor.image} alt={instructor.name} className="im-avatar" onError={(e) => { e.target.style.display = 'none'; }} />
                  <span className="im-fitness-badge" style={{ background: `${fitnessColors[instructor.fitness_level] || '#6B7280'}18`, color: fitnessColors[instructor.fitness_level] || '#6B7280' }}>
                    {instructor.fitness_level}
                  </span>
                </div>
                <h4 className="im-name">{instructor.name}</h4>
                <p className="im-meta">{instructor.gender} · {instructor.age} yrs · {instructor.experience}</p>
                <div className="im-certs">
                  {instructor.certifications.map((c) => (
                    <span key={c} className="im-cert-tag">{c}</span>
                  ))}
                </div>
                <button className="im-view-btn" onClick={(e) => { e.stopPropagation(); navigate(`/instructors/${instructor.id}`); }}>
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* View Modal */}
      {showModal && selected && (
        <div className="im-modal-overlay" onClick={closeModal}>
          <div className="im-modal" onClick={(e) => e.stopPropagation()}>
            <button className="im-modal-close" onClick={closeModal} id="im-modal-close-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="im-modal-hero">
              <img src={selected.image} alt={selected.name} className="im-modal-avatar" onError={(e) => { e.target.style.display = 'none'; }} />
              <div>
                <h3 className="im-modal-name">{selected.name}</h3>
                <p className="im-modal-sub">{selected.experience} experience · {selected.gender}</p>
                <span className="im-fitness-badge" style={{ background: `${fitnessColors[selected.fitness_level] || '#6B7280'}18`, color: fitnessColors[selected.fitness_level] || '#6B7280' }}>
                  {selected.fitness_level}
                </span>
              </div>
            </div>
            <div className="im-modal-details">
              {[
                { label: 'Age', value: `${selected.age} years old` },
                { label: 'Gender', value: selected.gender },
                { label: 'Experience', value: selected.experience },
              ].map(({ label, value }) => (
                <div key={label} className="im-detail-row">
                  <span className="im-detail-label">{label}</span>
                  <span className="im-detail-value">{value}</span>
                </div>
              ))}
              <div className="im-detail-row">
                <span className="im-detail-label">Certifications</span>
                <div className="im-certs" style={{ marginTop: 0 }}>
                  {selected.certifications.map((c) => (
                    <span key={c} className="im-cert-tag">{c}</span>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: '8px', borderRadius: '10px' }}>
              Assign to Session
            </button>
          </div>
        </div>
      )}

      {/* Add Instructor Modal */}
      {showAddModal && (
        <div className="im-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <button className="im-modal-close" onClick={() => setShowAddModal(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="im-modal-name" style={{ marginBottom: '24px' }}>Add New Instructor</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="im-add-row">
                <div className="im-add-field">
                  <label>Full Name</label>
                  <input type="text" placeholder="e.g. Kelly Slater" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="im-add-field">
                  <label>Age</label>
                  <input type="number" placeholder="28" min="18" max="80" value={form.age} onChange={e => setForm({...form, age: e.target.value})} required />
                </div>
              </div>
              <div className="im-add-row">
                <div className="im-add-field">
                  <label>Gender</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                  </select>
                </div>
                <div className="im-add-field">
                  <label>Fitness Level</label>
                  <select value={form.fitness_level} onChange={e => setForm({...form, fitness_level: e.target.value})}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                    <option>Elite</option>
                  </select>
                </div>
              </div>
              <div className="im-add-field">
                <label>Experience</label>
                <input type="text" placeholder="e.g. 8 Years" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} required />
              </div>
              <div className="im-add-field">
                <label>Certifications <span style={{fontWeight:400, opacity:0.6}}>(comma-separated)</span></label>
                <input type="text" placeholder="ISA Level 2, CPR, First Aid" value={form.certifications} onChange={e => setForm({...form, certifications: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="im-cancel-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, borderRadius: '10px', padding: '12px', display:'flex', alignItems:'center', justifyContent:'center' }} disabled={saving}>
                  {saving ? <span className="im-spinner" /> : 'Add Instructor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .im-page {
          display: flex;
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Inter', sans-serif;
        }

        /* Main */
        .im-main { flex: 1; padding: 40px 48px; overflow-y: auto; }

        /* Search */
        .im-search-bar {
          display: flex; align-items: center; gap: 12px;
          background: #fff; border: 1.5px solid #E2E8F0;
          border-radius: 16px; padding: 14px 20px;
          margin-bottom: 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .im-search-bar:focus-within {
          border-color: #00D1B2;
          box-shadow: 0 0 0 3px rgba(0,209,178,0.12);
        }
        .im-search-bar input {
          border: none; outline: none; font-size: 15px;
          font-family: 'Inter', sans-serif; flex: 1; background: transparent; color: #050B1A;
        }
        .im-search-bar input::placeholder { color: #94A3B8; }

        /* Grid */
        .im-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 24px;
        }
        .im-empty { grid-column: 1/-1; text-align: center; color: #9CA3AF; padding: 40px; font-size: 16px; }

        /* Card */
        .im-card {
          background: #fff; border-radius: 20px; padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01);
          border: 1px solid #E2E8F0;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer; display: flex; flex-direction: column; gap: 14px;
          position: relative; overflow: hidden;
        }
        .im-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #00D1B2, #7C3AED); opacity: 0;
          transition: opacity 0.3s ease;
        }
        .im-card:hover { 
          transform: translateY(-5px); 
          box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03); 
          border-color: #CBD5E1;
        }
        .im-card:hover::before { opacity: 1; }
        .im-card-top { display: flex; align-items: center; justify-content: space-between; }
        .im-avatar {
          width: 52px; height: 52px; border-radius: 50%;
          object-fit: cover; border: 2px solid #fff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .im-fitness-badge {
          padding: 4px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        }
        .im-name { font-size: 18px; font-weight: 700; color: #0F172A; }
        .im-meta { font-size: 13.5px; color: #64748B; }
        .im-certs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
        .im-cert-tag {
          background: #F1F5F9; color: #475569;
          font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;
          border: 1px solid #E2E8F0;
        }
        .im-view-btn {
          margin-top: 8px; padding: 11px; width: 100%;
          background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;
          font-size: 13.5px; font-weight: 600; color: #0F172A; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: all 0.2s ease;
        }
        .im-view-btn:hover { 
          background: #0F172A; color: #fff; border-color: #0F172A; 
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        }

        /* Modal */
        .im-modal-overlay {
          position: fixed; inset: 0; background: rgba(5,11,26,0.4);
          backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
          animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes fadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }
        .im-modal {
          background: #fff; border-radius: 28px; padding: 40px;
          width: 100%; max-width: 480px; position: relative;
          box-shadow: 0 24px 60px rgba(5, 11, 26, 0.15);
          animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          max-height: 90vh; overflow-y: auto;
        }
        @keyframes slideUp { from { transform: translateY(40px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .im-modal-close {
          position: absolute; top: 18px; right: 18px;
          background: #F3F4F6; border: none; cursor: pointer;
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #6B7280; transition: background 0.2s;
        }
        .im-modal-close:hover { background: #E5E7EB; }
        .im-modal-hero { display: flex; align-items: center; gap: 18px; margin-bottom: 28px; }
        .im-modal-avatar {
          width: 72px; height: 72px; border-radius: 50%;
          object-fit: cover; border: 3px solid #F3F4F6;
        }
        .im-modal-name { font-size: 22px; font-weight: 800; color: #050B1A; margin-bottom: 4px; }
        .im-modal-sub { font-size: 13px; color: #6B7280; margin-bottom: 10px; }
        .im-modal-details { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
        .im-detail-row { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid #F3F4F6; }
        .im-detail-label { font-size: 13px; color: #9CA3AF; font-weight: 500; }
        .im-detail-value { font-size: 14px; color: #050B1A; font-weight: 600; }

        /* Add form */
        .im-add-row { display: flex; gap: 14px; }
        .im-add-field { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .im-add-field label { font-size: 12px; font-weight: 700; color: #050B1A; text-transform: uppercase; letter-spacing: 0.3px; }
        .im-add-field input, .im-add-field select {
          height: 44px; border: 1.5px solid #E5E7EB; border-radius: 10px;
          padding: 0 12px; font-size: 14px; color: #050B1A; background: #fff;
          outline: none; font-family: 'Inter', sans-serif; transition: border-color 0.2s;
        }
        .im-add-field input:focus, .im-add-field select:focus {
          border-color: #00D1B2; box-shadow: 0 0 0 3px rgba(0,209,178,0.12);
        }
        .im-add-field input::placeholder { color: #9CA3AF; }
        .im-cancel-btn {
          flex: 1; padding: 12px; background: #F3F4F6; border: none; border-radius: 10px;
          font-size: 14px; font-weight: 600; color: #050B1A; cursor: pointer; font-family: 'Inter', sans-serif;
        }
        .im-cancel-btn:hover { background: #E5E7EB; }
        .im-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff; border-radius: 50%; animation: im-spin 0.7s linear infinite;
        }
        @keyframes im-spin { to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .db-sidebar { display: none; }
          .im-main { padding: 24px 20px; }
        }
      `}</style>
    </div>
  );
};

export default InstructorManagement;
