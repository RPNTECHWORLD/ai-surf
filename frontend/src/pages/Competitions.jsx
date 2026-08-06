import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:8000';

const Competitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/competitions`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setCompetitions(Array.isArray(data) ? data : []))
      .catch(() => setCompetitions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <header style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#0F172A' }}>Live Competitions & Mock Heats</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0 0' }}>Manage local competition heats and mock training sessions</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {Array.isArray(competitions) && competitions.map((comp) => (
            <div 
              key={comp.id}
              style={{
                backgroundColor: '#FFF',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '1px',
                color: '#0284C7',
                backgroundColor: '#E0F2FE',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                {comp.status}
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '12px 0 8px 0', color: '#0F172A' }}>{comp.name}</h2>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>📅 {comp.date}</p>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#475569' }}>📍 {comp.location}</p>
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', fontSize: '13px', color: '#64748B' }}>
                Division: <strong>{comp.division}</strong>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Competitions;
