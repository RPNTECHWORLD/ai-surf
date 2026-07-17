import React from 'react';
import Sidebar from '../components/Sidebar';

const Analytics = () => {
  const badgeStats = [
    { label: 'WHITE', count: 23, color: '#E2E8F0', text: '#64748B' },
    { label: 'YELLOW', count: 31, color: '#F59E0B', text: '#F59E0B' },
    { label: 'GREEN', count: 18, color: '#10B981', text: '#10B981' },
    { label: 'BLUE', count: 11, color: '#3B82F6', text: '#3B82F6' },
    { label: 'RED', count: 4, color: '#F43F5E', text: '#F43F5E' },
  ];

  const students = [
    { name: 'Chloe Kim', badges: 2, nextTime: '2 weeks', nextColor: '#64748B', instructor: 'Marcus Silva' },
    { name: 'John Miller', badges: 1, nextTime: '1 month', nextColor: '#64748B', instructor: 'Bethany Hamilton' },
    { name: 'Rick Grimes', badges: 4, nextTime: '3 months', nextColor: '#64748B', instructor: 'Kolohe Andino' },
    { name: 'Emma Watson', badges: 3, nextTime: 'Ready Now', nextColor: '#0D9488', instructor: 'Marcus Silva' },
    { name: 'Sarah Connor', badges: 1, nextTime: '3 weeks', nextColor: '#64748B', instructor: 'Carissa Moore' },
  ];

  const maxCount = Math.max(...badgeStats.map(b => b.count));

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
                      style={{ 
                        width: `${widthPct}%`, 
                        backgroundColor: stat.color,
                        color: stat.label === 'WHITE' ? '#0F172A' : '#FFFFFF'
                      }}
                    />
                    <span className="an-funnel-value">{stat.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="an-table-container">
          <table className="an-table">
            <thead>
              <tr>
                <th>STUDENT NAME</th>
                <th>BADGE HISTORY</th>
                <th>ESTIMATED TIME TO NEXT</th>
                <th>CURRENT INSTRUCTOR</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, i) => (
                <tr key={i} style={{ borderBottom: i === students.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                  <td className="an-student-name">{student.name}</td>
                  <td>
                    <div className="an-badge-history">
                      {badgeStats.map((badge, index) => {
                        const earned = index < student.badges;
                        return (
                          <div 
                            key={index}
                            className="an-badge-circle"
                            style={{ 
                              backgroundColor: earned ? badge.color : 'transparent',
                              border: `2px solid ${earned ? badge.color : '#E2E8F0'}` 
                            }}
                          />
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ color: student.nextColor }}>{student.nextTime}</td>
                  <td className="an-instructor-name">{student.instructor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <style>{`
        .an-page { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Instrument Sans', sans-serif; }
        .an-main { flex: 1; padding: 40px 80px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }

        /* Header */
        .an-header { display: flex; justify-content: space-between; align-items: center; }
        .an-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.2; }
        .an-sub { font-size: 16px; color: #64748B; margin: 8px 0 0 0; }
        .an-export-btn {
          background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px;
          padding: 12px 24px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; color: #0F172A; cursor: pointer;
        }

        /* Stats Row */
        .an-stats-row { display: flex; gap: 20px; }
        .an-stat-card {
          flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .an-stat-top { display: flex; justify-content: space-between; align-items: center; }
        .an-stat-label { font-size: 12px; font-weight: 700; color: #64748B; opacity: 0.6; text-transform: uppercase; }
        .an-stat-dot { width: 12px; height: 12px; border-radius: 50%; }
        .an-stat-count { font-family: 'Outfit', sans-serif; font-size: 40px; font-weight: 700; color: #0F172A; line-height: 1.2; }
        .an-stat-desc { font-size: 12px; color: #64748B; }

        /* Funnel Card */
        .an-funnel-card {
          background: #050B1A; border-radius: 24px; padding: 40px;
          display: flex; flex-direction: column; align-items: center; gap: 32px;
        }
        .an-funnel-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #FFFFFF; margin: 0; }
        .an-funnel-chart { display: flex; flex-direction: column; gap: 12px; width: 600px; }
        .an-funnel-row { display: flex; align-items: center; gap: 16px; }
        .an-funnel-label { width: 60px; font-size: 12px; font-weight: 700; color: #FFFFFF; opacity: 0.6; }
        .an-funnel-bar-container { flex: 1; display: flex; align-items: center; gap: 12px; }
        .an-funnel-bar { height: 32px; border-radius: 4px; transition: width 0.3s ease; }
        .an-funnel-value { font-size: 12px; font-weight: 700; color: #FFFFFF; }

        /* Table */
        .an-table-container { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; }
        .an-table { width: 100%; border-collapse: collapse; }
        .an-table th {
          text-align: left; padding: 20px 24px; font-size: 12px; font-weight: 700;
          color: #94A3B8; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; background: #F8F6F2;
        }
        .an-table td { padding: 20px 24px; vertical-align: middle; font-size: 12px; }
        .an-student-name { font-weight: 600; color: #0F172A; }
        .an-instructor-name { color: #0F172A; }
        .an-badge-history { display: flex; gap: 8px; }
        .an-badge-circle { width: 16px; height: 16px; border-radius: 50%; }
      `}</style>
    </div>
  );
};

export default Analytics;
