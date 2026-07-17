import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const StudentsManagement = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  // Mock stats based on design
  const stats = [
    { value: 87, label: 'TOTAL', color: '#050B1A', active: false },
    { value: 74, label: 'ACTIVE', color: '#0D9488', active: true },
    { value: 23, label: 'BEGINNER', color: '#F59E0B', active: false },
    { value: 31, label: 'INTERMEDIATE', color: '#0D9488', active: false },
    { value: 22, label: 'ADVANCED', color: '#7C3AED', active: false },
  ];

  // Mock students based on design list
  const allStudents = [
    { id: 1, name: 'Chloe Kim', level: 'Intermediate', date: 'Yesterday', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100', instructor: 'Marcus Silva', email: 'chloe@example.com' },
    { id: 2, name: 'John Miller', level: 'Beginner', date: 'Today', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100', instructor: 'Bethany Hamilton', email: 'john@example.com' },
    { id: 3, name: 'Emma Watson', level: 'Intermediate', date: '2 days ago', image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100', instructor: 'Kai Lenny', email: 'emma@example.com' },
    { id: 4, name: 'Rick Grimes', level: 'Advanced', date: '3 days ago', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100', instructor: 'Carissa Moore', email: 'rick@example.com' },
    { id: 5, name: 'Sarah Connor', level: 'Beginner', date: '4 days ago', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100', instructor: 'Kolohe Andino', email: 'sarah@example.com' },
    { id: 6, name: 'James Bond', level: 'Master', date: '1 week ago', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100', instructor: 'Marcus Silva', email: 'james@example.com' },
  ];

  const filtered = allStudents.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sm-page">
      <Sidebar />
      <main className="sm-main">
        {/* Header */}
        <header className="sm-header">
          <div className="sm-header-text">
            <h1 className="sm-title">Students ({stats[0].value})</h1>
            <p className="sm-sub">Manage your student body and track their progression across badge levels.</p>
          </div>
          <div className="sm-actions">
            <button className="sm-btn-secondary">Export CSV</button>
            <button className="sm-btn-primary">+ Add Student</button>
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
          <select className="sm-select">
            <option>Level: All</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
          <select className="sm-select">
            <option>Instructor: All</option>
            <option>Marcus Silva</option>
            <option>Bethany Hamilton</option>
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
                      <img src={s.image} alt={s.name} className="sm-student-avatar" />
                      <div>
                        <div className="sm-student-name">{s.name}</div>
                        <div className="sm-student-email">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`sm-level-badge level-${s.level.toLowerCase()}`}>{s.level}</span>
                  </td>
                  <td className="sm-instructor-text">{s.instructor}</td>
                  <td className="sm-date-text">{s.date}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="sm-action-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

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
        }

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
        .level-master { background: rgba(255, 255, 255, 0.07); color: #050B1A; border: 1px solid #E2E8F0; }

        .sm-instructor-text { font-size: 13px; color: #64748B; }
        .sm-date-text { font-size: 13px; color: #64748B; }
        
        .sm-action-btn { background: transparent; border: none; color: #94A3B8; cursor: pointer; padding: 8px; border-radius: 4px; }
        .sm-action-btn:hover { background: #F8FAFC; color: #0F172A; }
      `}</style>
    </div>
  );
};

export default StudentsManagement;
