import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserProfileMenu from './UserProfileMenu';

const API = import.meta.env.VITE_API_URL || '';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState({ name: '', owner: '' });
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

      const savedUserStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      let parsedUser = null;
      if (savedUserStr) {
        try {
          parsedUser = JSON.parse(savedUserStr);
          if (parsedUser && typeof parsedUser.school === 'object' && parsedUser.school?.name) {
            parsedUser.school_details = parsedUser.school;
            parsedUser.school = resolveSchoolName(parsedUser.school);
            sessionStorage.setItem('user', JSON.stringify(parsedUser));
            localStorage.setItem('user', JSON.stringify(parsedUser));
          }
          setUser(parsedUser);

          // Real-time server sync for coach Head Coach status
          if (parsedUser && (parsedUser.role === 'coach' || parsedUser.instructor_id || parsedUser.is_head_coach)) {
            const instId = parsedUser.instructor_id || parsedUser.id;
            if (instId) {
              fetch(`${API}/api/instructors/${instId}`)
                .then(r => r.json())
                .then(instData => {
                  if (instData && typeof instData.is_head_coach === 'boolean') {
                    const serverIsHeadCoach = Boolean(instData.is_head_coach);
                    if (Boolean(parsedUser.is_head_coach) !== serverIsHeadCoach) {
                      const updated = { ...parsedUser, is_head_coach: serverIsHeadCoach };
                      if (!serverIsHeadCoach && updated.role === 'head_coach') {
                        updated.role = 'coach';
                      }
                      sessionStorage.setItem('user', JSON.stringify(updated));
                      localStorage.setItem('user', JSON.stringify(updated));
                      setUser(updated);
                      window.dispatchEvent(new Event('user_updated'));
                    }
                  }
                })
                .catch(() => {});
            }
          }
        } catch (e) {}
      }

      const savedSchoolStr = sessionStorage.getItem('activeSchool') || localStorage.getItem('activeSchool');
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
        displayName = userSch || '';
      } else if (parsedUser?.role === 'coach' && !parsedUser?.is_head_coach) {
        const cName = parsedUser.name || parsedUser.instructor_name;
        displayName = userSch || activeSch || (cName ? `Coach: ${cName}` : 'Individual Surf Coach');
      } else {
        displayName = activeSch || userSch || '';
      }

      const newName = resolveSchoolName(displayName) || (parsedUser?.role === 'admin' || parsedUser?.is_head_coach ? 'School Admin' : '');
      const newOwner = typeof parsedUser?.name === 'string' ? parsedUser.name : (typeof parsedSchool?.owner === 'string' ? parsedSchool.owner : '');

      setSchool(prev => {
        if (prev?.name === newName && prev?.owner === newOwner) return prev;
        return { name: newName, owner: newOwner };
      });
    };

    updateHeaderInfo();
    window.addEventListener('storage', updateHeaderInfo);
    window.addEventListener('user_updated', updateHeaderInfo);
    window.addEventListener('focus', updateHeaderInfo);

    // Fetch quick stats once on mount
    fetch(`${API}/api/dashboard/stats`)
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {
        setStats({ active_instructors: 12, active_students: 87, sessions_this_month: 34, upcoming_sessions: 6 });
      });

    return () => {
      window.removeEventListener('storage', updateHeaderInfo);
      window.removeEventListener('user_updated', updateHeaderInfo);
      window.removeEventListener('focus', updateHeaderInfo);
    };
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
    const isHeadCoach = Boolean(user?.is_head_coach || role === 'head_coach');
    const items = [];

    if (role === 'admin' || role === 'guest_admin' || isHeadCoach) {
      items.push({ label: 'Dashboard', path: '/dashboard' });
    }

    if (role === 'athlete') {
      const athleteId = user?.student_id || user?.id || user?._id || 1;
      items.push({ label: 'My Profile', path: `/students/${athleteId}` });
    } else if (isHeadCoach) {
      items.push(
        { label: 'Instructors', path: '/instructors' },
        { label: 'Students', path: '/students' }
      );
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

    const sessionsLabel = (role === 'athlete' || role === 'student' || (role === 'coach' && !isHeadCoach) || role === 'user') ? 'My Sessions' : 'Sessions';

    const isStudentRole = role === 'athlete' || role === 'student' || role === 'user';

    items.push({ label: sessionsLabel, path: '/sessions' });
    items.push({ label: 'Analytics', path: '/analytics' });
    items.push(
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
          {/* User Profile & Settings Menu (replaces raw logout button) */}
          <UserProfileMenu
            user={user}
            school={school}
            onLogout={handleLogout}
          />

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
            {school?.name && (
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                {typeof school?.name === 'string' ? school.name : (school?.name?.name || '')}
              </div>
            )}
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'capitalize', marginTop: '2px' }}>
              {user?.name || 'User'} • {user ? (user.role === 'admin' ? 'School Admin' : (user.is_head_coach ? 'Head Coach 👑' : (user.role === 'guest_admin' ? (user.guest_role === 'view_admin' ? 'View Admin 👁️' : 'Main Admin ⚡') : (user.role === 'athlete' ? 'Student' : (user.role === 'coach' ? 'Coach' : user.role))))) : 'Student'}
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
// updated: 1793352296.6783102
