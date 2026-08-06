import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:8000';

const StudentsManagement = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/students`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = Array.isArray(students) ? students.filter(s => 
    (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="sm-page">
      <Sidebar />
      <main className="sm-main">
        <header className="sm-header">
          <div className="sm-header-text">
            <h1 className="sm-title">Students ({filtered.length})</h1>
            <p className="sm-sub">Manage your student body and track their progression across badge levels.</p>
          </div>
          <div className="sm-actions">
            <button className="sm-btn-secondary">Export CSV</button>
            <button className="sm-btn-primary">+ Add Student</button>
          </div>
        </header>

        {/* Search */}
        <div style={{ margin: '24px 0' }}>
          <input 
            type="text" 
            placeholder="Search students..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '12px 16px',
              width: '100%',
              maxWidth: '400px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Student Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filtered.map((student) => (
            <div 
              key={student.id}
              onClick={() => navigate(`/students/${student.id}`)}
              style={{
                backgroundColor: '#FFF',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <img src={student.image} alt={student.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>{student.name}</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>{student.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                <span>Level: <strong>{student.level}</strong></span>
                <span>Instructor: <strong>{student.instructor}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StudentsManagement;
