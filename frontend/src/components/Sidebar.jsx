import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {}
    }
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
    const items = [
      { label: 'Dashboard', path: '/dashboard', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> }
    ];

    if (role === 'athlete') {
      if (user?.student_id) {
        items.push({ 
          label: 'My Profile', 
          path: `/students/${user.student_id}`, 
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> 
        });
      }
    } else if (role === 'coach') {
      if (user?.instructor_id) {
        items.push({ 
          label: 'My Profile', 
          path: `/instructors/${user.instructor_id}`, 
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> 
        });
      }
      items.push({ 
        label: 'My Students', 
        path: '/students', 
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> 
      });
    } else {
      items.push(
        { label: 'Instructors', path: '/instructors', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
        { label: 'Students', path: '/students', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> }
      );
    }

    items.push(
      { label: 'Sessions', path: '/sessions', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
      { label: 'Analytics', path: '/analytics', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
      { label: 'Competitions', path: '/competitions', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg> },
      { label: 'Video Analysis', path: '/analysis', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg> }
    );

    if (role === 'admin') {
      items.push({ label: 'Register School', path: '/register', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Toggle Hamburger Button */}
      <button 
        className="db-mobile-nav-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Navigation"
        style={{
          display: 'none', // Overridden by media queries on small screens
          position: 'fixed',
          top: '16px',
          left: '16px',
          width: '44px',
          height: '44px',
          backgroundColor: '#050B1A',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          color: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        )}
      </button>

      {/* Overlay backing on mobile when open */}
      {isOpen && (
        <div 
          className="db-sidebar-overlay" 
          onClick={() => setIsOpen(false)} 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
          }}
        />
      )}

      <aside className={`db-sidebar ${isOpen ? 'db-sidebar-open' : ''}`}>
        <div className="db-logo" onClick={() => { navigate('/'); setIsOpen(false); }} style={{ cursor: 'pointer' }}>
          <span className="db-logo-dot" />
          <span className="db-logo-name">AiSurf</span>
        </div>
        <nav className="db-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button 
                key={item.label} 
                className={`db-nav-item${isActive ? ' db-nav-active' : ''}`} 
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false); // Close sidebar on navigate
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="db-sidebar-footer">
          <div 
            className="db-sidebar-userinfo" 
            onClick={() => {
              if (user?.role === 'athlete') navigate(`/students/${user.student_id}`);
              else if (user?.role === 'coach') navigate(`/instructors/${user.instructor_id}`);
              setIsOpen(false);
            }} 
            style={{ cursor: user?.role !== 'admin' ? 'pointer' : 'default' }}
          >
            <div className="db-avatar" style={{ backgroundImage: user?.image ? `url(${user.image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!user?.image && getInitials(user?.name)}
            </div>
            <div>
              <div className="db-user-name">{user ? user.name : 'Guest User'}</div>
              <div className="db-user-role" style={{ textTransform: 'capitalize' }}>{user ? user.role : 'Guest'}</div>
            </div>
          </div>
          <button className="db-logout-btn" onClick={handleLogout} title="Log Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>

      <style>{`
        .db-sidebar-footer {
          display: flex !important;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 16px 24px;
        }
        .db-sidebar-userinfo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .db-logout-btn {
          background: transparent;
          border: none;
          color: #64748B;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .db-logout-btn:hover {
          background: rgba(244, 63, 94, 0.1);
          color: #F43F5E;
        }
      `}</style>
      </aside>
    </>
  );
};

export default Sidebar;
