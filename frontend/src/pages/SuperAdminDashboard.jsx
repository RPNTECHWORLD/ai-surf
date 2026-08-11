import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://54.242.160.238:8000';

// ── Custom SVG Icon Components (Replaces lucide-react to avoid dependencies) ──
const IconActivity = ({ size = 18, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const IconUsers = ({ size = 18, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconTrophy = ({ size = 18, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path d="M12 2a6 6 0 0 1 6 6v1c0 2.2-1.8 4-4 4h-4a4 4 0 0 1-4-4V8a6 6 0 0 1 6-6z" />
  </svg>
);

const IconClock = ({ size = 18, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconRefreshCw = ({ size = 14, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const IconCopy = ({ size = 13, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconEye = ({ size = 13, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = ({ size = 13, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconLock = ({ size = 14, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);


const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'users'
  const [coaches, setCoaches] = useState([]);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Password reset state
  const [selectedUser, setSelectedUser] = useState(null); // { user_id, name, email }
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState({}); // maps user_id -> boolean (to show/hide plain password)

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch instructors/credentials
      const coachesRes = await fetch(`${API}/api/superadmin/instructors`);
      if (!coachesRes.ok) throw new Error('Failed to fetch credentials');
      const coachesData = await coachesRes.json();
      setCoaches(coachesData);

      // 2. Fetch dashboard stats
      const statsRes = await fetch(`${API}/api/dashboard/stats`);
      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      // 3. Fetch recent activity
      const activityRes = await fetch(`${API}/api/dashboard/activity`);
      if (!activityRes.ok) throw new Error('Failed to fetch activity');
      const activityData = await activityRes.json();
      setActivity(activityData);

      setError('');
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please verify that the backend server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setResetting(true);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch(`${API}/api/superadmin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.user_id,
          new_password: newPassword,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Successfully updated password for ${selectedUser.name}!`);
        setNewPassword('');
        setTimeout(() => {
          setSelectedUser(null);
          setSuccessMsg('');
          loadData(); // Refresh table to show new plain password
        }, 2000);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error occurred.');
    } finally {
      setResetting(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`Copied ${label} to clipboard!`);
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const toggleShowPassword = (userId) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const statsCards = [
    { icon: IconUsers, label: 'Total Instructors', value: stats?.active_instructors ?? 0, color: '#6366f1', sub: 'Active coaches in roster' },
    { icon: IconActivity, label: 'Active Students', value: stats?.active_students ?? 8, color: '#06b6d4', sub: 'Athletes in training' },
    { icon: IconTrophy, label: 'Sessions This Month', value: stats?.sessions_this_month ?? 2, color: '#10b981', sub: 'Completed sessions' },
    { icon: IconClock, label: 'Upcoming Sessions', value: stats?.upcoming_sessions ?? 5, color: '#f59e0b', sub: 'Scheduled future events' }
  ];

  return (
    <div className="sa-wrapper">
      {/* Top Navbar */}
      <nav className="sa-nav">
        <div className="sa-nav-left">
          <div className="sa-brand" onClick={() => navigate('/dashboard')}>
            <span className="sa-brand-dot" />
            <span className="sa-brand-text">WaveCoach <span className="sa-brand-badge">Super Admin</span></span>
          </div>
          <div className="sa-nav-tabs">
            <button 
              className={`sa-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <IconActivity size={14} /> Dashboard
            </button>
            <button 
              className={`sa-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <IconUsers size={14} /> Instructors Directory
            </button>
          </div>
        </div>
        <button className="sa-exit-btn" onClick={() => navigate('/dashboard')}>
          Back to School Portal &rarr;
        </button>
      </nav>

      {/* Main Container */}
      <main className="sa-container">
        {error && <div className="sa-error-banner">{error}</div>}

        {loading ? (
          <div className="sa-loader">
            <div className="sa-spinner" />
            <p>Loading Console...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="sa-tab-content fade-in">
                {/* Header */}
                <div className="sa-section-header">
                  <div>
                    <h2>Platform Overview</h2>
                    <p>Real-time stats across all surf schools and coach assignments</p>
                  </div>
                  <button className="sa-refresh-btn" onClick={() => loadData(true)} disabled={refreshing}>
                    <IconRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="sa-stats-grid">
                  {statsCards.map((s, idx) => (
                    <div className="sa-stat-card" key={idx}>
                      <div className="sa-stat-header">
                        <span className="sa-stat-label">{s.label}</span>
                        <div className="sa-stat-icon-wrapper" style={{ background: `${s.color}15` }}>
                          <s.icon size={18} color={s.color} />
                        </div>
                      </div>
                      <div className="sa-stat-value">{s.value}</div>
                      <div className="sa-stat-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Recent Activities */}
                <div className="sa-activity-card">
                  <div className="sa-activity-header">
                    <IconActivity size={18} color="#6366f1" />
                    <h3>Recent System Activities</h3>
                  </div>
                  <div className="sa-table-responsive">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Activity Details</th>
                          <th>Group/Type</th>
                          <th style={{ textAlign: 'right' }}>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.map((act) => (
                          <tr key={act.id}>
                            <td className="sa-act-text">{act.text}</td>
                            <td>
                              <span className="sa-type-badge">{act.type || 'System'}</span>
                            </td>
                            <td style={{ textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>
                              {act.time || 'Just now'}
                            </td>
                          </tr>
                        ))}
                        {activity.length === 0 && (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                              No recent activities logged.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="sa-tab-content fade-in">
                {/* Header */}
                <div className="sa-section-header">
                  <div>
                    <h2>Instructors & Credentials</h2>
                    <p>Retrieve plaintext user passwords, copy hashes, and execute credentials management</p>
                  </div>
                  <button className="sa-refresh-btn" onClick={() => loadData(true)} disabled={refreshing}>
                    <IconRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                <div className="sa-split-layout">
                  {/* Table Card */}
                  <div className="sa-card-main">
                    <div className="sa-card-header">
                      <h3>Instructors Roster</h3>
                      <span className="sa-count-badge">{coaches.length} registered</span>
                    </div>

                    <div className="sa-table-responsive">
                      <table className="sa-table">
                        <thead>
                          <tr>
                            <th>Coach Name</th>
                            <th>Email Address</th>
                            <th>Password (Plain)</th>
                            <th>Database Password Hash</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coaches.map((c) => (
                            <tr key={c.user_id}>
                              <td>
                                <div className="sa-user-info">
                                  <div className="sa-avatar">{getInitials(c.name)}</div>
                                  <div>
                                    <div className="sa-user-name">{c.name}</div>
                                    <div className="sa-user-sub">User ID: {c.user_id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="sa-email-cell">{c.email}</td>
                              <td>
                                <div className="sa-password-cell">
                                  <span className="sa-plain-pass">
                                    {showPasswordMap[c.user_id] ? c.password_plain : '••••••••'}
                                  </span>
                                  <div className="sa-pass-actions">
                                    <button 
                                      className="sa-icon-btn" 
                                      onClick={() => toggleShowPassword(c.user_id)}
                                      title={showPasswordMap[c.user_id] ? "Hide Password" : "Show Password"}
                                    >
                                      {showPasswordMap[c.user_id] ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                                    </button>
                                    <button 
                                      className="sa-icon-btn"
                                      onClick={() => copyToClipboard(c.password_plain, 'plain password')}
                                      title="Copy Password"
                                    >
                                      <IconCopy size={13} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="sa-hash-box" onClick={() => copyToClipboard(c.password_hash, 'password hash')}>
                                  <code className="sa-hash-text">{c.password_hash}</code>
                                  <IconCopy size={12} className="copy-icon" />
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button 
                                  className="sa-action-btn"
                                  onClick={() => {
                                    setSelectedUser(c);
                                    setSuccessMsg('');
                                    setError('');
                                  }}
                                >
                                  Update Pass
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Sidebar Form for Resetting */}
                  {selectedUser && (
                    <div className="sa-card-side fade-in">
                      <div className="sa-side-header">
                        <h3>Update Credentials</h3>
                        <button className="sa-close-btn" onClick={() => setSelectedUser(null)}>&times;</button>
                      </div>

                      <div className="sa-side-profile">
                        <div className="sa-avatar large-avatar">{getInitials(selectedUser.name)}</div>
                        <h4>{selectedUser.name}</h4>
                        <p>{selectedUser.email}</p>
                      </div>

                      {successMsg && <div className="sa-success-banner">{successMsg}</div>}

                      <form className="sa-reset-form" onSubmit={handleResetPassword}>
                        <div className="sa-form-group">
                          <label>New Password (Plaintext)</label>
                          <div className="sa-input-wrapper">
                            <IconLock size={14} className="input-icon" />
                            <input 
                              type="text" 
                              placeholder="Enter new password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              minLength={5}
                            />
                          </div>
                          <small>This plaintext password will be saved dynamically to help retrieve it later, and hashed for secure authentication.</small>
                        </div>

                        <div className="sa-form-actions">
                          <button type="button" className="sa-btn-cancel" onClick={() => setSelectedUser(null)}>Cancel</button>
                          <button type="submit" className="sa-btn-submit" disabled={resetting}>
                            {resetting ? 'Updating...' : 'Save Password'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        .sa-wrapper {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Instrument Sans', sans-serif;
          color: #0F172A;
          display: flex;
          flex-direction: column;
        }

        /* Nav layout */
        .sa-nav {
          background: #0F172A;
          padding: 0 40px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #FFF;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .sa-nav-left {
          display: flex;
          align-items: center;
          gap: 40px;
          height: 100%;
        }
        .sa-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .sa-brand-dot {
          width: 8px;
          height: 8px;
          background: #6366f1;
          border-radius: 50%;
        }
        .sa-brand-text {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sa-brand-badge {
          background: rgba(99,102,241,0.15);
          color: #818cf8;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .sa-nav-tabs {
          display: flex;
          gap: 4px;
          height: 100%;
        }
        .sa-tab-btn {
          background: none;
          border: none;
          color: #94a3b8;
          padding: 0 20px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          height: 100%;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .sa-tab-btn:hover {
          color: #FFF;
          background: rgba(255,255,255,0.02);
        }
        .sa-tab-btn.active {
          color: #6366f1;
          border-bottom-color: #6366f1;
          background: rgba(255,255,255,0.03);
        }
        .sa-exit-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: #FFF;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sa-exit-btn:hover {
          background: rgba(255,255,255,0.15);
        }

        .sa-container {
          flex: 1;
          padding: 40px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .sa-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .sa-section-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 4px 0;
          color: #0F172A;
        }
        .sa-section-header p {
          font-size: 13.5px;
          color: #64748B;
          margin: 0;
        }
        .sa-refresh-btn {
          background: #FFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #64748B;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sa-refresh-btn:hover {
          border-color: #CBD5E1;
          color: #475569;
        }

        .sa-error-banner {
          background: #FEE2E2;
          border: 1px solid #FCA5A5;
          color: #B91C1C;
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        /* Stats Grid */
        .sa-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .sa-stat-card {
          background: #FFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sa-stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sa-stat-label {
          font-size: 12px;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sa-stat-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sa-stat-value {
          font-size: 32px;
          font-weight: 900;
          color: #0F172A;
          line-height: 1.1;
        }
        .sa-stat-sub {
          font-size: 12.5px;
          color: #64748B;
        }

        /* Cards layout */
        .sa-activity-card {
          background: #FFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
        }
        .sa-activity-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 14px;
        }
        .sa-activity-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }

        /* Split Directory layout */
        .sa-split-layout {
          display: flex;
          gap: 28px;
          align-items: flex-start;
        }
        .sa-card-main {
          flex: 1;
          background: #FFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
        }
        .sa-card-side {
          width: 360px;
          background: #FFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .sa-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 14px;
        }
        .sa-card-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          margin: 0;
        }
        .sa-count-badge {
          background: #F1F5F9;
          color: #64748B;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
        }

        /* Tables style */
        .sa-table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .sa-table {
          width: 100%;
          border-collapse: collapse;
        }
        .sa-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1.5px solid #E2E8F0;
        }
        .sa-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
          font-size: 13.5px;
        }
        .sa-act-text {
          font-weight: 600;
          color: #1E293B;
        }
        .sa-type-badge {
          background: rgba(99,102,241,0.08);
          color: #6366f1;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        /* User cells */
        .sa-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sa-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
          color: #FFF;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sa-user-name {
          font-weight: 700;
          color: #0F172A;
        }
        .sa-user-sub {
          font-size: 10.5px;
          color: #94A3B8;
          margin-top: 1px;
        }
        .sa-email-cell {
          color: #475569;
          font-weight: 500;
        }

        /* Password Cells */
        .sa-password-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: space-between;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 6px 12px;
          border-radius: 8px;
          max-width: 160px;
        }
        .sa-plain-pass {
          font-family: monospace;
          font-size: 13px;
          color: #0F172A;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .sa-pass-actions {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .sa-icon-btn {
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .sa-icon-btn:hover {
          color: #475569;
          background: #E2E8F0;
        }

        /* Hash boxes */
        .sa-hash-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 6px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 140px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sa-hash-box:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }
        .sa-hash-text {
          font-family: monospace;
          font-size: 10px;
          color: #64748B;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-right: 6px;
        }
        .copy-icon {
          color: #94A3B8;
          flex-shrink: 0;
        }

        /* Actions */
        .sa-action-btn {
          background: #FFF;
          border: 1.5px solid #E2E8F0;
          color: #0f172a;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .sa-action-btn:hover {
          background: #0F172A;
          color: #FFF;
          border-color: #0F172A;
        }

        /* Sidebar Styling */
        .sa-side-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 12px;
        }
        .sa-side-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 800;
          margin: 0;
        }
        .sa-close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #94A3B8;
        }
        .sa-side-profile {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 6px;
        }
        .large-avatar {
          width: 56px;
          height: 56px;
          font-size: 18px;
          background: linear-gradient(135deg, #EC4899 0%, #D946EF 100%);
        }
        .sa-side-profile h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 800;
          margin: 0;
        }
        .sa-side-profile p {
          font-size: 12px;
          color: #64748B;
          margin: 0;
        }
        .sa-success-banner {
          background: #DCFCE7;
          border: 1px solid #86EFAC;
          color: #166534;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          text-align: center;
        }
        .sa-reset-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sa-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sa-form-group label {
          font-size: 11px;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sa-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sa-input-wrapper input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.2s;
        }
        .sa-input-wrapper input:focus {
          border-color: #6366f1;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: #94A3B8;
        }
        .sa-form-group small {
          font-size: 11px;
          color: #94A3B8;
          line-height: 1.4;
          margin-top: 4px;
        }
        .sa-form-actions {
          display: flex;
          gap: 10px;
        }
        .sa-form-actions button {
          flex: 1;
          padding: 10px 0;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sa-btn-cancel {
          background: #FFF;
          border: 1.5px solid #E2E8F0;
          color: #64748B;
        }
        .sa-btn-cancel:hover {
          background: #F1F5F9;
        }
        .sa-btn-submit {
          background: #6366f1;
          border: none;
          color: #FFF;
        }
        .sa-btn-submit:hover {
          background: #4f46e5;
        }

        .sa-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 12px;
          color: #64748B;
        }
        .sa-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(99,102,241,0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: sa-spin 0.8s linear infinite;
        }
        @keyframes sa-spin { to { transform: rotate(360deg); } }

        .fade-in {
          animation: saFadeIn 0.25s ease-out;
        }
        @keyframes saFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-spin {
          animation: sa-spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SuperAdminDashboard;
