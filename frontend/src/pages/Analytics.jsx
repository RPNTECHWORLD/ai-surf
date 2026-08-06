import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API = 'http://localhost:8000';

const Analytics = () => {
  const [badgeStats, setBadgeStats] = useState([
    { label: 'WHITE', count: 0, color: '#E2E8F0', text: '#64748B' },
    { label: 'YELLOW', count: 0, color: '#F59E0B', text: '#F59E0B' },
    { label: 'GREEN', count: 0, color: '#10B981', text: '#10B981' },
    { label: 'BLUE', count: 0, color: '#3B82F6', text: '#3B82F6' },
    { label: 'RED', count: 0, color: '#F43F5E', text: '#F43F5E' },
  ]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/analytics`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        if (data.badgeStats) setBadgeStats(data.badgeStats);
        if (Array.isArray(data.students)) setStudents(data.students);
      })
      .catch(() => {
        setBadgeStats([
          { label: 'WHITE', count: 0, color: '#E2E8F0', text: '#64748B' },
          { label: 'YELLOW', count: 0, color: '#F59E0B', text: '#F59E0B' },
          { label: 'GREEN', count: 0, color: '#10B981', text: '#10B981' },
          { label: 'BLUE', count: 0, color: '#3B82F6', text: '#3B82F6' },
          { label: 'RED', count: 0, color: '#F43F5E', text: '#F43F5E' },
        ]);
        setStudents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const counts = badgeStats.map(b => b.count);
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="an-page">
      <Sidebar />
      <main className="an-main">
        {/* Header */}
        <header className="an-header">
          <div className="an-header-text">
            <h1 className="an-title">Badge Progression</h1>
            <p className="an-sub">Track the distribution of skills and levels across the entire student population.</p>
          </div>
          <button className="an-export-btn">Export PDF Report</button>
        </header>

        {/* Stats Row */}
        <div className="an-stats-row">
          {badgeStats.map(stat => (
            <div key={stat.label} className="an-stat-card">
              <div className="an-stat-top">
                <span className="an-stat-label">{stat.label}</span>
                <div className="an-stat-dot" style={{ backgroundColor: stat.color }} />
              </div>
              <div className="an-stat-count">{stat.count}</div>
              <div className="an-stat-desc">Students currently at this level</div>
            </div>
          ))}
        </div>

        {/* Retention Funnel */}
        <div className="an-funnel-card">
          <h2 className="an-funnel-title">Retention Funnel</h2>
          <div className="an-funnel-chart">
            {badgeStats.map(stat => {
              const widthPct = (stat.count / maxCount) * 100;
              return (
                <div key={stat.label} className="an-funnel-row">
                  <span className="an-funnel-label">{stat.label.charAt(0).toUpperCase() + stat.label.slice(1).toLowerCase()}</span>
                  <div className="an-funnel-bar-container">
                    <div 
                      className="an-funnel-bar" 
                      style={{ width: `${widthPct}%`, backgroundColor: stat.color }}
                    />
                  </div>
                  <span className="an-funnel-val">{stat.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Student Progression Table */}
        <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Student Progression Details</h3>
          {students.length === 0 ? (
            <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>No student progression records logged yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '12px' }}>
                  <th style={{ padding: '12px' }}>STUDENT NAME</th>
                  <th style={{ padding: '12px' }}>BADGE LEVEL</th>
                  <th style={{ padding: '12px' }}>INSTRUCTOR</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{st.name}</td>
                    <td style={{ padding: '12px' }}>{st.badges} Badges</td>
                    <td style={{ padding: '12px' }}>{st.instructor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;
