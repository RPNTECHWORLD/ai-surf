import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API = 'http://54.242.160.238:8000';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [stats, setStats] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Load user profile context
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }

    // Load active school profile context
    const savedSchool = localStorage.getItem('activeSchool');
    if (savedSchool) {
      try {
        setSchool(JSON.parse(savedSchool));
      } catch (e) {}
    } else {
      fetch(`${API}/api/schools`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const latest = data[data.length - 1];
            setSchool({
              name: latest.name,
              owner: latest.owner,
            });
          }
        })
        .catch(err => console.error("Error fetching school:", err));
    }

    // Fetch quick stats
    fetch(`${API}/api/dashboard/stats`)
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {
        setStats({ active_instructors: 12, active_students: 87, sessions_this_month: 34, upcoming_sessions: 6 });
      });
  }, []);

  const getInitials = (name) => {
    if (!name) return 'SA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeSchool');
    navigate('/auth');
  };

  const getNavItems = () => {
    const role = user?.role || 'admin';
    const items = [];

    if (role === 'admin') {
      items.push({ label: 'Dashboard', path: '/dashboard' });
    }

    if (role === 'athlete') {
      const athleteId = user?.student_id || user?.id || user?._id || 1;
      items.push({ label: 'My Profile', path: `/students/${athleteId}` });
    } else if (role === 'coach') {
      const coachId = user?.instructor_id || user?.id || user?._id || 1;
      items.push({ label: 'My Profile', path: `/instructors/${coachId}` });
      items.push({ label: 'My Students', path: '/students' });
    } else {
      items.push(
        { label: 'Instructors', path: '/instructors' },
        { label: 'Students', path: '/students' }
      );
    }

    items.push(
      { label: 'Sessions', path: '/sessions' },
      { label: 'Analytics', path: '/analytics' },
      { label: 'Competitions', path: '/competitions' }
    );

    if (role === 'admin') {
      items.push({ label: 'Register School', path: '/register' });
    }

    return items;
  };

  const navItems = getNavItems();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <>
      {/* Top Header Navigation */}
      <header className="db-top-header">
        <div className="db-header-left">
          <div className="db-logo" onClick={() => navigate('/dashboard')}>
            <span className="db-logo-name">
              Wave<span style={{ fontWeight: 400 }}>Coach</span>
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="db-header-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.label}
                className={`db-header-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Info Section */}
        <div className="db-header-right">
          <div className="db-header-userinfo">
            <div className="db-header-usertext">
              <div className="db-header-school-name">{school ? school.name : 'North Shore Academy'}</div>
              <div className="db-header-user-role" style={{ textTransform: 'capitalize' }}>
                {user ? user.role : 'Administrator'}
              </div>
            </div>
            <div className="db-header-avatar" style={{ backgroundImage: user?.image ? `url(${user.image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
              {!user?.image && getInitials(user?.name || school?.owner || 'System Admin')}
            </div>
            <button className="db-header-logout" onClick={handleLogout} title="Log Out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>

          {/* Mobile Menu Icon Toggle */}
          <button className="db-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="db-mobile-menu">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.label}
                className={`db-mobile-menu-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
              >
                {item.label}
              </button>
            );
          })}
          <button className="db-mobile-menu-item logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      )}

      {/* Left Sidebar (QUICK STATS) - Only displayed on Dashboard */}
      {isDashboard && (
        <aside className="db-sidebar-stats">
          <div className="db-sidebar-stats-title">Quick Stats</div>
          <div className="db-sidebar-stats-list">
            <div className="db-sidebar-stat-card">
              <div className="stat-card-left">
                <span className="stat-card-label">Active Instructors</span>
                <span className="stat-card-value">{stats?.active_instructors || 0}</span>
              </div>
              <div className="stat-card-right" style={{ color: '#00D1B2', background: 'rgba(0, 209, 178, 0.1)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              </div>
            </div>

            <div className="db-sidebar-stat-card">
              <div className="stat-card-left">
                <span className="stat-card-label">Active Students</span>
                <span className="stat-card-value">{stats?.active_students || 0}</span>
              </div>
              <div className="stat-card-right" style={{ color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
            </div>

            <div className="db-sidebar-stat-card">
              <div className="stat-card-left">
                <span className="stat-card-label">Sessions This Month</span>
                <span className="stat-card-value">{stats?.sessions_this_month || 0}</span>
              </div>
              <div className="stat-card-right" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
            </div>

            <div className="db-sidebar-stat-card">
              <div className="stat-card-left">
                <span className="stat-card-label">Upcoming Sessions</span>
                <span className="stat-card-value">{stats?.upcoming_sessions || 0}</span>
              </div>
              <div className="stat-card-right" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};

export default Sidebar;
