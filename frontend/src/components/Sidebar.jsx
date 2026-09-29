import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [stats, setStats] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const resolveSchoolName = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        if (typeof val.name === 'string') return val.name;
        if (typeof val.name === 'object' && val.name?.name) return String(val.name.name);
        if (typeof val.school_name === 'string') return val.school_name;
      }
      return '';
    };

    const updateHeaderInfo = () => {
      const savedUserStr = sessionStorage.getItem('user');
      let parsedUser = null;
      if (savedUserStr) {
        try {
          parsedUser = JSON.parse(savedUserStr);
          if (parsedUser && typeof parsedUser.school === 'object' && parsedUser.school?.name) {
            parsedUser.school_details = parsedUser.school;
            parsedUser.school = resolveSchoolName(parsedUser.school);
            sessionStorage.setItem('user', JSON.stringify(parsedUser));
          }
          setUser(parsedUser);
        } catch (e) {}
      }

      const savedSchoolStr = sessionStorage.getItem('activeSchool');
      let parsedSchool = null;
      if (savedSchoolStr) {
        try {
          parsedSchool = JSON.parse(savedSchoolStr);
          if (parsedSchool && typeof parsedSchool.name === 'object') {
            parsedSchool.name = resolveSchoolName(parsedSchool.name);
            sessionStorage.setItem('activeSchool', JSON.stringify(parsedSchool));
          }
        } catch (e) {}
      }

      // Determine dynamic display name for top right header (School Name)
      const userSch = resolveSchoolName(parsedUser?.school_name) || resolveSchoolName(parsedUser?.school);
      const activeSch = resolveSchoolName(parsedSchool?.name);

      let displayName = '';
      if (parsedUser?.role === 'athlete' || parsedUser?.role === 'student' || parsedUser?.role === 'user') {
        displayName = userSch || 'No School Selected';
      } else if (parsedUser?.role === 'coach') {
        const cName = parsedUser.name || parsedUser.instructor_name;
        displayName = userSch || activeSch || (cName ? `Coach: ${cName}` : 'Individual Surf Coach');
      } else {
        displayName = activeSch || userSch || 'Aquatic Indica Surf School';
      }

      setSchool({
        name: resolveSchoolName(displayName) || ((parsedUser?.role === 'athlete' || parsedUser?.role === 'student' || parsedUser?.role === 'user') ? 'No School Selected' : 'Aquatic Indica Surf School'),
        owner: typeof parsedUser?.name === 'string' ? parsedUser.name : (typeof parsedSchool?.owner === 'string' ? parsedSchool.owner : '')
      });
    };

    updateHeaderInfo();
    window.addEventListener('storage', updateHeaderInfo);
    window.addEventListener('user_updated', updateHeaderInfo);
    const interval = setInterval(updateHeaderInfo, 1000);

    return () => {
      window.removeEventListener('storage', updateHeaderInfo);
      window.removeEventListener('user_updated', updateHeaderInfo);
      clearInterval(interval);
    };

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
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('activeSchool');
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

    const sessionsLabel = (role === 'athlete' || role === 'student' || role === 'coach' || role === 'user') ? 'My Sessions' : 'Sessions';

    items.push(
      { label: sessionsLabel, path: '/sessions' },
      { label: 'Analytics', path: '/analytics' },
      { label: 'Competitions', path: '/competitions' },
      { label: 'Athlete Intel', path: '/athlete-intelligence' }
    );

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
            <img
              src="/athnexlive-logo.png"
              alt="athnexlive"
              style={{ height: '50px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
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
              <div className="db-header-user-name">
                {user?.name || user?.username || (typeof school?.owner === 'string' ? school.owner : '') || (user?.email ? user.email.split('@')[0] : 'User')}
              </div>
              <div className="db-header-school-name">
                {typeof school?.name === 'string' ? school.name : (school?.name?.name || (user?.role === 'athlete' ? 'No School Selected' : 'Aquatic Indica Surf School'))}
              </div>
              <div className="db-header-user-role" style={{ textTransform: 'capitalize' }}>
                {user ? (user.role === 'admin' ? 'School Admin' : (user.role === 'athlete' ? 'Student' : (user.role === 'coach' ? 'Coach' : user.role))) : 'School Admin'}
              </div>
            </div>
            <div className="db-header-avatar" style={{ backgroundImage: user?.image ? `url(${user.image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
              {!user?.image && getInitials(user?.name || (typeof school?.owner === 'string' ? school.owner : '') || 'School Admin')}
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
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', marginBottom: '6px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
              {typeof school?.name === 'string' ? school.name : (school?.name?.name || (user?.role === 'athlete' ? 'No School Selected' : 'Aquatic Indica Surf School'))}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'capitalize', marginTop: '2px' }}>
              {user?.name || 'User'} • {user ? (user.role === 'admin' ? 'School Admin' : (user.role === 'athlete' ? 'Student' : (user.role === 'coach' ? 'Coach' : user.role))) : 'Student'}
            </div>
          </div>
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

    </>
  );
};

export default Sidebar;
