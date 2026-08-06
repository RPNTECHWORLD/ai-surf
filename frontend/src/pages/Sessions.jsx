import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:8000';

const Sessions = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/sessions`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ses-page">
      <Sidebar />
      <main className="ses-main">
        <header className="ses-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 className="ses-title" style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>Sessions</h1>
            <p style={{ color: '#64748B', margin: '4px 0 0 0' }}>Track all coaching sessions and training logs</p>
          </div>
          <button 
            onClick={() => navigate('/sessions/new')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#0284C7',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            + New Session
          </button>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Array.isArray(sessions) && sessions.map((ses, index) => (
            <div 
              key={index}
              style={{
                backgroundColor: '#FFF',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0284C7' }}>{ses.date}</span>
                <h3 style={{ margin: '4px 0', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>{ses.student} with {ses.instructor}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>📍 {ses.location} • {ses.time}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: `${ses.statusColor || '#0284C7'}20`,
                  color: ses.statusColor || '#0284C7',
                  fontSize: '13px',
                  fontWeight: '700'
                }}>
                  {ses.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Sessions;
