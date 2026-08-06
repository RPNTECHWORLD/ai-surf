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

  useEffect(() => {
    fetch(`${API}/api/instructors`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setInstructors(Array.isArray(data) ? data : []))
      .catch(() => setInstructors([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = Array.isArray(instructors) ? instructors.filter((i) =>
    (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.fitness_level || '').toLowerCase().includes(search.toLowerCase())
  ) : [];

  const openModal = (instructor) => { setSelected(instructor); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setSelected(null); };

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
          <button className="btn-primary db-cta" onClick={() => alert('Add Instructor coming soon!')}>+ Add Instructor</button>
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

      {/* Modal */}
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

      <style>{`
        .im-page {
          display: flex;
          min-height: 100vh;
          background: #F0EEE9;
          font-family: 'Inter', sans-serif;
        }

        /* Main */
        .im-main { flex: 1; padding: 40px 48px; overflow-y: auto; }

        /* Search */
        .im-search-bar {
          display: flex; align-items: center; gap: 12px;
          background: #fff; border: 1.5px solid #E5E7EB;
          border-radius: 12px; padding: 12px 18px;
          margin-bottom: 28px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .im-search-bar:focus-within {
          border-color: #00D1B2;
          box-shadow: 0 0 0 3px rgba(0,209,178,0.1);
        }
        .im-search-bar input {
          border: none; outline: none; font-size: 15px;
          font-family: 'Inter', sans-serif; flex: 1; background: transparent; color: #050B1A;
        }
        .im-search-bar input::placeholder { color: #9CA3AF; }

        /* Grid */
        .im-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
        }
        .im-empty { grid-column: 1/-1; text-align: center; color: #9CA3AF; padding: 40px; font-size: 16px; }

        /* Card */
        .im-card {
          background: #fff; border-radius: 18px; padding: 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          transition: transform 0.25s, box-shadow 0.25s;
          cursor: pointer; display: flex; flex-direction: column; gap: 10px;
        }
        .im-card:hover { transform: translateY(-6px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
        .im-card-top { display: flex; align-items: center; justify-content: space-between; }
        .im-avatar {
          width: 56px; height: 56px; border-radius: 50%;
          object-fit: cover; border: 2.5px solid #F3F4F6;
        }
        .im-fitness-badge {
          padding: 4px 12px; border-radius: 20px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        }
        .im-name { font-size: 17px; font-weight: 700; color: #050B1A; }
        .im-meta { font-size: 13px; color: #6B7280; }
        .im-certs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .im-cert-tag {
          background: #F3F4F6; color: #374151;
          font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
        }
        .im-view-btn {
          margin-top: 4px; padding: 10px; width: 100%;
          background: #F8F6F2; border: 1.5px solid #E5E7EB; border-radius: 8px;
          font-size: 13px; font-weight: 600; color: #050B1A; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.2s, border-color 0.2s;
        }
        .im-view-btn:hover { background: #050B1A; color: #fff; border-color: #050B1A; }

        /* Modal */
        .im-modal-overlay {
          position: fixed; inset: 0; background: rgba(5,11,26,0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .im-modal {
          background: #fff; border-radius: 20px; padding: 36px;
          width: 100%; max-width: 420px; position: relative;
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
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

        @media (max-width: 900px) {
          .db-sidebar { display: none; }
          .im-main { padding: 24px 20px; }
        }
      `}</style>
    </div>
  );
};

export default InstructorManagement;
