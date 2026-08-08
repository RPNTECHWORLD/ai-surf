import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = 'http://54.242.160.238:8000';

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
  const [form, setForm] = useState({
    name: '', age: '', gender: 'Male', fitness_level: 'Elite',
    experience: '', certifications: '', languages: '', biography: ''
  });

  const fetchInstructors = () => {
    fetch(`${API}/api/instructors`)
      .then(r => r.json())
      .then(data => setInstructors(data))
      .catch(() => setInstructors([
        { id: 1, name: 'Kai Lenny', age: 28, gender: 'Male', fitness_level: 'Elite', experience: '8 Years', certifications: ['ISA Level 3'], image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120' },
        { id: 2, name: 'Bethany Hamilton', age: 34, gender: 'Female', fitness_level: 'Elite', experience: '8 Years', certifications: ['ISA Level 2'], image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120' },
        { id: 3, name: 'Carissa Moore', age: 32, gender: 'Female', fitness_level: 'Elite', experience: '14 Years', certifications: ['ISA Level 3'], image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=120' },
        { id: 4, name: 'John John Florence', age: 31, gender: 'Male', fitness_level: 'Elite', experience: '10 Years', certifications: ['ISA Level 3'], image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120' },
      ]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInstructors(); }, []);

  const filtered = instructors.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.fitness_level.toLowerCase().includes(search.toLowerCase()) ||
    (i.certifications && i.certifications.some(c => c.toLowerCase().includes(search.toLowerCase())))
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const certs = typeof form.certifications === 'string'
        ? form.certifications.split(',').map(c => c.trim()).filter(Boolean)
        : form.certifications;

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
        setForm({ name: '', age: '', gender: 'Male', fitness_level: 'Elite', experience: '', certifications: '', languages: '', biography: '' });
        fetchInstructors();
      }
    } catch (err) {}
    setSaving(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const certs = typeof form.certifications === 'string'
        ? form.certifications.split(',').map(c => c.trim()).filter(Boolean)
        : form.certifications;

      const res = await fetch(`${API}/api/instructors/${selected.id}`, {
        method: 'PUT',
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
        setSelected(null);
        setForm({ name: '', age: '', gender: 'Male', fitness_level: 'Elite', experience: '', certifications: '', languages: '', biography: '' });
        fetchInstructors();
      }
    } catch (err) {}
    setSaving(false);
  };

  return (
    <div className="im-page">
      {/* Top Header Navigation wrapper */}
      <Sidebar />

      {/* Main Content panel */}
      <main className="im-main">
        <div className="im-content-layout">
          {/* Left Column - Instructors List */}
          <div className="im-left-column">
            <header className="im-list-header">
              <div>
                <h1 className="im-title">Instructors</h1>
                <p className="im-subtitle">Manage your school's coaching roster and assignments.</p>
              </div>
              {!showAddModal && (
                <button className="btn-primary db-cta" onClick={() => { setSelected(null); setForm({ name: '', age: '', gender: 'Male', fitness_level: 'Elite', experience: '', certifications: '', languages: '', biography: '' }); setShowAddModal(true); }}>
                  + Add Instructor
                </button>
              )}
            </header>

            {/* Search Input bar */}
            <div className="im-search-bar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, certification, or language..."
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
                  <div key={instructor.id} className="im-card">
                    {/* Cover photo banner */}
                    <div className="im-card-banner" style={{ backgroundImage: `url(${getCoverImage(instructor.name)})` }} />
                    
                    {/* Overlapping profile circle avatar */}
                    <div className="im-avatar-wrapper">
                      <img src={instructor.image} alt={instructor.name} className="im-avatar-img" />
                    </div>

                    <div className="im-card-body">
                      <h3 className="im-card-name">{instructor.name}</h3>
                      <p className="im-card-details">{instructor.age} years • Oahu, HI</p>
                      
                      <div className="im-card-badges">
                        <span className="im-badge-cert">{instructor.certifications[0] || 'ISA Level 2'}</span>
                        <span className="im-badge-level">{instructor.fitness_level} Coach</span>
                      </div>

                      <div className="im-card-divider" />

                      <div className="im-card-stats">
                        <div className="im-card-stat">
                          <span className="stat-label">Students</span>
                          <span className="stat-value">8</span>
                        </div>
                        <div className="im-card-stat">
                          <span className="stat-label">Experience</span>
                          <span className="stat-value">{instructor.experience}</span>
                        </div>
                      </div>

                      <div className="im-card-footer">
                        <button className="im-card-view-profile" onClick={() => navigate(`/instructors/${instructor.id}`)}>
                          View Profile
                        </button>
                        <button className="im-card-edit" onClick={() => { setSelected(instructor); setForm({ ...instructor, certifications: instructor.certifications.join(', ') }); setShowAddModal(true); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Add / Edit Sidebar Panel */}
          {showAddModal && (
            <div className="im-right-column">
              <div className="im-form-header">
                <h2>{selected ? 'Edit Instructor' : 'Add New Instructor'}</h2>
                <button className="im-form-close" onClick={() => { setShowAddModal(false); setSelected(null); }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <form onSubmit={selected ? handleUpdate : handleAdd} className="im-sidebar-form">
                {/* Profile photo upload block */}
                <div className="im-photo-upload">
                  <div className="upload-circle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  </div>
                  <span className="upload-label">Upload profile photo...</span>
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="e.g. Gabriel Medina" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Age</label>
                    <input type="number" placeholder="28" value={form.age} onChange={e => setForm({...form, age: e.target.value})} required />
                  </div>
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
                    <input type="text" placeholder="10 Years" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Certifications</label>
                  <input type="text" placeholder="ISA Level 2, Red Cross First Aid" value={form.certifications} onChange={e => setForm({...form, certifications: e.target.value})} />
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
                  <button type="button" className="btn-cancel" onClick={() => { setShowAddModal(false); setSelected(null); }}>Cancel</button>
                  <button type="submit" className="btn-save" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Instructor'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <style>{`
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
          background: #EF4444;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          color: #FFFFFF;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        .btn-save:hover {
          background: #DC2626;
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
        }

        /* Search Header spacing */
        .im-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .im-title {
          font-size: 32px;
          font-weight: 800;
          color: #050B1A;
          margin: 0;
          text-align: left;
        }
        .im-subtitle {
          font-size: 14px;
          color: #6B7280;
          margin: 4px 0 0 0;
          text-align: left;
        }

        /* Search input bar */
        .im-search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fff;
          border: 1.5px solid #E2E8F0;
          border-radius: 16px;
          padding: 14px 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: all 0.2s;
        }
        .im-search-bar:focus-within {
          border-color: #00D1B2;
          box-shadow: 0 0 0 3px rgba(0,209,178,0.12);
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
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
          transition: all 0.22s ease-in-out;
        }
        .im-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(5, 11, 26, 0.06);
          border-color: #CBD5E1;
        }
        .im-card-banner {
          height: 120px;
          background-size: cover;
          background-position: center;
          width: 100%;
        }
        .im-avatar-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid #FFFFFF;
          margin-top: -30px;
          margin-left: 20px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.06);
          background: #F1F5F9;
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
        }
        .im-card-name {
          font-size: 18px;
          font-weight: 750;
          color: #0F172A;
          margin: 0;
          text-align: left;
        }
        .im-card-details {
          font-size: 13px;
          color: #64748B;
          margin: 0;
          text-align: left;
        }
        .im-card-badges {
          display: flex;
          gap: 8px;
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
          gap: 12px;
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
        }
        .im-card-edit:hover {
          background: #F1F5F9;
          color: #0F172A;
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
