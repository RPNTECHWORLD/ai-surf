import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://54.242.160.238:8000';

const calculateAge = (dobString) => {
  if (!dobString) return '';
  try {
    const today = new Date();
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  } catch (e) {
    return '';
  }
};

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('athlete');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // SSO intermediate states
  const [ssoPendingData, setSsoPendingData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Athlete details
    dob: '',
    age: '',
    gender: 'Male',
    stance: 'regular',
    // Coach details
    specializations: [],
    rates: '$75 / hr',
    location: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = { ...formData, [name]: value };
    if (name === 'dob') {
      next.age = calculateAge(value);
    }
    setFormData(next);
  };

  const handleCheckboxChange = (spec) => {
    const specs = [...formData.specializations];
    if (specs.includes(spec)) {
      setFormData({ ...formData, specializations: specs.filter(s => s !== spec) });
    } else {
      setFormData({ ...formData, specializations: [...specs, spec] });
    }
  };

  // Saved device accounts (Only users who have logged in on this software)
  const [savedAccounts, setSavedAccounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('savedAccounts') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [customGoogleMode, setCustomGoogleMode] = useState(false);

  // Email OTP state for registration
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const removeSavedAccount = (e, emailToRemove) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(a => a.email.toLowerCase() !== emailToRemove.toLowerCase());
    setSavedAccounts(updated);
    localStorage.setItem('savedAccounts', JSON.stringify(updated));
  };

  const handleAuthSuccess = (token, user) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    
    // Save only authentic accounts that logged into this software (device-level, stays in localStorage)
    try {
      const existingSaved = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
      const filtered = existingSaved.filter(a => a.email.toLowerCase() !== user.email.toLowerCase());
      const updatedAccounts = [
        {
          name: user.name || user.email.split('@')[0],
          email: user.email.toLowerCase(),
          role: user.role || 'athlete',
          image: user.image || '',
          lastLogin: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        },
        ...filtered
      ];
      localStorage.setItem('savedAccounts', JSON.stringify(updatedAccounts));
      setSavedAccounts(updatedAccounts);
    } catch (e) {}

    // For sidebar backwards compatibility with School Admin mock logic:
    sessionStorage.setItem('activeSchool', JSON.stringify({
      name: user.role === 'admin' ? 'Pipeline Surf School' : user.role === 'coach' ? 'Coach Portal' : 'Student Portal',
      owner: user.name,
      email: user.email,
    }));
    
    if (user.role === 'athlete') {
      navigate(`/students/${user.student_id || user.id || 1}`);
    } else if (user.role === 'coach') {
      navigate(`/instructors/${user.instructor_id || user.id || 1}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      setErrorMsg('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim(), purpose: 'signup' })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setResendCooldown(30);
      } else {
        setErrorMsg(data.detail || 'Failed to send OTP code.');
      }
    } catch (err) {
      setErrorMsg('Error connecting to email OTP service.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim(), otp: otpCode.trim(), purpose: 'signup', role })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpVerified(true);
      } else {
        setErrorMsg(data.detail || 'Invalid verification code.');
      }
    } catch (err) {
      setErrorMsg('Could not verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const executeGoogleLogin = async (email, name, image = '') => {
    setLoading(true);
    setErrorMsg('');
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanName = name || cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const res = await fetch(`${API}/api/auth/sso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          social_id: `google_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: cleanEmail,
          name: cleanName,
          role: role || 'athlete',
          image: image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowGoogleModal(false);
        handleAuthSuccess(data.token, data.user);
      } else {
        setErrorMsg(data.detail || 'Google sign-in failed.');
      }
    } catch (err) {
      setErrorMsg('Error connecting to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = (provider) => {
    if (provider === 'google') {
      const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const isConfigured = rawClientId && rawClientId.includes('.apps.googleusercontent.com') && !rawClientId.includes('aisurf');
      
      // If official Google Client ID is configured, trigger official popup
      if (isConfigured && window.google?.accounts?.oauth2) {
        try {
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: rawClientId,
            scope: 'email profile openid',
            callback: async (tokenResponse) => {
              if (tokenResponse.access_token) {
                setLoading(true);
                try {
                  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                  });
                  const gUser = await userInfoRes.json();
                  executeGoogleLogin(gUser.email, gUser.name, gUser.picture);
                } catch (e) {
                  setErrorMsg('Failed to fetch Google profile.');
                  setLoading(false);
                }
              }
            }
          });
          tokenClient.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (e) {}
      }

      // Otherwise open authentic device account selector modal
      setShowGoogleModal(true);
      return;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // GATE: Registration requires OTP email verification first
    if (!isLogin && !otpVerified) {
      setErrorMsg('Please verify your email address first before signing up.');
      setLoading(false);
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? `${API}/api/auth/login` : `${API}/api/auth/signup`;
      const bodyData = isLogin 
        ? { email: formData.email.toLowerCase().trim(), password: formData.password }
        : {
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
            role: role,
            name: formData.name.trim(),
            dob: formData.dob,
            age: formData.dob ? calculateAge(formData.dob) : (formData.age ? parseInt(formData.age) : null),
            gender: formData.gender,
            stance: formData.stance,
            specializations: formData.specializations,
            rates: formData.rates,
            location: formData.location
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (res.ok) {
        handleAuthSuccess(data.token, data.user);
      } else {
        setErrorMsg(data.detail || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Could not connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel-left">
        <div className="auth-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="auth-brand-dot" />
          <span className="auth-brand-name">AiSurf</span>
        </div>

        <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Join AiSurf'}</h2>
        <p className="auth-subtitle">{isLogin ? 'Log in to continue your training' : 'Start your high-performance surf coaching journey'}</p>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <div className="auth-tabs">
          <button className={`auth-tab ${isLogin ? 'active' : ''}`} type="button" onClick={() => { setIsLogin(true); setErrorMsg(''); }}>Login</button>
          <button className={`auth-tab ${!isLogin ? 'active' : ''}`} type="button" onClick={() => { setIsLogin(false); setErrorMsg(''); }}>Register</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin ? (
            <>
              {/* REGISTRATION STEP 1 & 2: EMAIL OTP VERIFICATION */}
              {!otpVerified ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="auth-fields-row">
                    <div className="auth-field" style={{ flex: 1.5 }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Email Address</span>
                        <span style={{ fontSize: '11px', color: '#00F2FE' }}>Step 1: Verify Email</span>
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="email" 
                          name="email" 
                          placeholder="you@example.com" 
                          value={formData.email} 
                          onChange={handleChange} 
                          required 
                          style={{ flex: 1 }}
                        />
                        <button 
                          type="button"
                          onClick={handleSendOtp}
                          disabled={loading || !formData.email || resendCooldown > 0}
                          style={{
                            background: otpSent ? '#10B981' : 'rgba(0, 242, 254, 0.15)',
                            color: otpSent ? '#FFFFFF' : '#00F2FE',
                            border: '1px solid rgba(0, 242, 254, 0.3)',
                            borderRadius: '12px',
                            padding: '0 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                          }}
                        >
                          {resendCooldown > 0 ? `Wait ${resendCooldown}s` : (otpSent ? '↺ Resend' : 'Send Code')}
                        </button>
                      </div>
                    </div>

                    <div className="auth-field" style={{ flex: 1 }}>
                      <label>Register As</label>
                      <select value={role} onChange={(e) => setRole(e.target.value)} style={{ height: '42px' }}>
                        <option value="athlete">Student</option>
                        <option value="coach">Coach (Instructor)</option>
                        <option value="admin">System Admin / Owner</option>
                      </select>
                    </div>
                  </div>

                  {otpSent && (
                    <div className="auth-field">
                      <label style={{ color: '#00F2FE' }}>
                        Enter 6-Digit Code (Sent to {formData.email})
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          placeholder="123456" 
                          value={otpCode} 
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          style={{ fontSize: '18px', letterSpacing: '4px', textAlign: 'center', fontWeight: 800, color: '#00F2FE', flex: 1 }}
                          required
                        />
                        <button 
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={loading || otpCode.length < 6}
                          style={{
                            background: '#00F2FE',
                            color: '#050B1A',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0 16px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          Verify Code
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* REGISTRATION STEP 3: FILL PROFILE DETAILS AFTER OTP VERIFICATION */
                <>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', color: '#6EE7B7', fontWeight: 600 }}>✓ Email Verified: {formData.email} ({role === 'athlete' ? 'Student' : role === 'coach' ? 'Coach' : 'Admin'})</span>
                    <button type="button" onClick={() => { setOtpVerified(false); setOtpSent(false); }} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>Change</button>
                  </div>

                  <div className="auth-field">
                    <label>Full Name</label>
                    <input type="text" name="name" placeholder="Eric Sheldon" value={formData.name} onChange={handleChange} required />
                  </div>

                  <div className="auth-fields-row">
                    <div className="auth-field">
                      <label>Password</label>
                      <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
                    </div>

                    <div className="auth-field">
                      <label>Confirm Password</label>
                      <input type="password" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="auth-field">
                <label>Email Address</label>
                <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
              </div>
            </>
          )}

          {/* DYNAMIC REGISTRATION FIELDS */}
          {!isLogin && otpVerified && role === 'athlete' && (
            <div className="auth-role-subfields">
              <h4 className="subfields-title">Student Profile Details</h4>
              <div className="auth-fields-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.5fr', gap: '12px' }}>
                <div className="auth-field">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>DOB</span>
                    {formData.dob && <span style={{ color: '#00F2FE', fontSize: '11px', fontWeight: 700 }}>Age: {calculateAge(formData.dob)} yrs</span>}
                  </label>
                  <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} max={new Date().toISOString().split('T')[0]} style={{ colorScheme: 'dark' }} />
                </div>
                <div className="auth-field">
                  <label>Surf Stance</label>
                  <select name="stance" value={formData.stance} onChange={handleChange}>
                    <option value="regular">Regular</option>
                    <option value="goofy">Goofy</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>Gender</label>
                  <select name="gender" value={formData.gender || 'Male'} onChange={handleChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {!isLogin && otpVerified && role === 'coach' && (
            <div className="auth-role-subfields">
              <h4 className="subfields-title">Coach Profile Details</h4>
              <div className="auth-fields-row">
                <div className="auth-field">
                  <label>Hourly Rate</label>
                  <input type="text" name="rates" placeholder="$75 / hr" value={formData.rates} onChange={handleChange} />
                </div>
                <div className="auth-field">
                  <label>Location / Region</label>
                  <input type="text" name="location" placeholder="North Shore, Oahu" value={formData.location} onChange={handleChange} />
                </div>
              </div>
              <div className="auth-field">
                <label>Coaching Specializations</label>
                <div className="specializations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['S&C', 'Nutrition', 'Video Analysis', 'Competition Strategy', 'Water Safety'].map(spec => (
                    <label key={spec} className="checkbox-label">
                      <input type="checkbox" checked={formData.specializations.includes(spec)} onChange={() => handleCheckboxChange(spec)} />
                      <span style={{ fontSize: '11px' }}>{spec}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Only show submit button for login OR for signup after OTP verified */}
          {(isLogin || otpVerified) && (
            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
          )}
        </form>

      </div>

      <div className="auth-panel-right">
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px' }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '48px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginBottom: '16px' }}>Master the ocean.</h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>Elevate your technique with high-performance analytics, video review, and professional athletic intelligence tools.</p>
        </div>
      </div>

      {/* ULTRA-PREMIUM GOOGLE ACCOUNT SELECTOR MODAL */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(5, 11, 26, 0.82)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#FFFFFF', color: '#0F172A', borderRadius: '28px',
            width: '100%', maxWidth: '440px', padding: '32px 28px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 1px 1px rgba(0,0,0,0.06)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => { setShowGoogleModal(false); setCustomGoogleMode(false); }}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                width: '32px', height: '32px', borderRadius: '50%',
                border: 'none', background: '#F1F5F9', color: '#64748B',
                fontSize: '18px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B'; }}
            >
              &times;
            </button>

            {/* Google Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px', marginTop: '4px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '16px',
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '21px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px' }}>Sign in with Google</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748B' }}>
                to continue to <strong style={{ color: '#0F172A' }}>AiSurf Coaching</strong>
              </p>
            </div>

            {savedAccounts.length > 0 && !customGoogleMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Choose Account ({savedAccounts.length})
                  </span>
                </div>

                <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
                  {savedAccounts.map((acc, aIdx) => (
                    <div
                      key={aIdx}
                      onClick={() => executeGoogleLogin(acc.email, acc.name, acc.image)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '12px 14px', borderRadius: '16px', border: '1.5px solid #F1F5F9',
                        background: '#FFFFFF', cursor: 'pointer', textAlign: 'left',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#4285F4';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(66, 133, 244, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#F1F5F9';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                      }}
                    >
                      {acc.image ? (
                        <img src={acc.image} alt={acc.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E2E8F0' }} />
                      ) : (
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4285F4, #2563EB)',
                          color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '16px', boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                        }}>
                          {(acc.name || acc.email || 'U')[0].toUpperCase()}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {acc.name}
                          </span>
                          {acc.role && (
                            <span style={{
                              fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px',
                              background: acc.role === 'coach' ? '#FEF3C7' : acc.role === 'admin' ? '#EDE9FE' : '#E0F2FE',
                              color: acc.role === 'coach' ? '#D97706' : acc.role === 'admin' ? '#7C3AED' : '#0284C7',
                              textTransform: 'capitalize'
                            }}>
                              {acc.role}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {acc.email}
                        </div>
                      </div>

                      <button
                        type="button"
                        title="Remove from device"
                        onClick={(e) => removeSavedAccount(e, acc.email)}
                        style={{
                          background: 'transparent', border: 'none', color: '#CBD5E1',
                          fontSize: '18px', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEE2E2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => { setCustomGoogleMode(true); setGoogleEmail(''); setGoogleName(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '12px 14px', borderRadius: '16px', border: '1.5px dashed #CBD5E1',
                    background: '#F8FAFC', cursor: 'pointer', textAlign: 'left', marginTop: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E2E8F0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                    +
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>Use another Google account</div>
                    <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>Sign in with a different email address</div>
                  </div>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Google Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ericsheldon04@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    autoFocus
                    className="google-input-box"
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '12px',
                      border: '1.5px solid #CBD5E1', fontSize: '14.5px', boxSizing: 'border-box',
                      color: '#0F172A', background: '#FFFFFF', outline: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Your Full Name <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Eric Sheldon"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    className="google-input-box"
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '12px',
                      border: '1.5px solid #CBD5E1', fontSize: '14.5px', boxSizing: 'border-box',
                      color: '#0F172A', background: '#FFFFFF', outline: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {savedAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomGoogleMode(false)}
                      style={{
                        padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #E2E8F0',
                        background: '#FFFFFF', color: '#475569', fontSize: '13.5px', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!googleEmail || loading}
                    onClick={() => executeGoogleLogin(googleEmail, googleName)}
                    style={{
                      flex: 1, padding: '12px 20px', borderRadius: '12px', border: 'none',
                      background: googleEmail ? 'linear-gradient(135deg, #4285F4, #2563EB)' : '#E2E8F0',
                      color: googleEmail ? '#FFFFFF' : '#94A3B8',
                      fontSize: '14px', fontWeight: 700,
                      cursor: googleEmail ? 'pointer' : 'not-allowed',
                      boxShadow: googleEmail ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {loading ? 'Authenticating...' : 'Continue to AiSurf →'}
                  </button>
                </div>
              </div>
            )}

            {/* Google Notice Footer */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', lineHeight: 1.4 }}>
                To continue, Google will securely share your credentials with AiSurf. Review AiSurf's Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
};

const styles = `
.auth-page {
  display: flex;
  flex-direction: row-reverse;
  min-height: 100vh;
  background: #050B1A;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

.auth-panel-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 80px;
  width: 720px;
  min-height: 100vh;
  background: #050B1A;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
  overflow-y: auto;
  flex-shrink: 0;
}

.auth-panel-right {
  flex: 1;
  height: 100vh;
  background-image: linear-gradient(90deg, rgba(5, 11, 26, 0.1) 0%, #050B1A 100%), url('https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=1200');
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 80px;
  box-sizing: border-box;
  position: relative;
}

@media (max-width: 1024px) {
  .auth-panel-right {
    display: none;
  }
  .auth-panel-left {
    width: 100%;
    padding: 40px;
  }
}

.auth-form,
.auth-tabs,
.auth-sso-buttons,
.auth-divider,
.auth-brand,
.auth-title,
.auth-subtitle,
.auth-error,
.role-choices {
  width: 100%;
  max-width: 560px;
}

.auth-brand {
  align-self: flex-start !important;
}

.auth-title,
.auth-subtitle {
  text-align: left !important;
}

/* Fix autofill input styling */
input:-webkit-autofill,
input:-webkit-autofill:hover, 
input:-webkit-autofill:focus, 
input:-webkit-autofill:active {
  transition: background-color 5000s ease-in-out 0s;
  -webkit-text-fill-color: #FFFFFF !important;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  align-self: center;
}

.auth-brand-dot {
  width: 12px;
  height: 12px;
  background-color: #FF4D6D;
  border-radius: 50%;
}

.auth-brand-name {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  font-size: 24px;
  color: #FFFFFF;
  letter-spacing: -0.5px;
}

.auth-title {
  font-family: 'Outfit', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #FFFFFF;
  text-align: center;
  margin-bottom: 4px;
}

.auth-subtitle {
  font-size: 14px;
  color: #94A3B8;
  text-align: center;
  margin-bottom: 16px;
  line-height: 1.5;
}

.auth-error {
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: #FB7185;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
}

.auth-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
  gap: 16px;
}

.auth-tab {
  flex: 1;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94A3B8;
  padding-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-tab.active {
  color: #FF4D6D;
  border-bottom-color: #FF4D6D;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.auth-field label {
  font-size: 13px;
  font-weight: 600;
  color: #E2E8F0;
  letter-spacing: 0.2px;
}

.auth-field input,
.auth-field select {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  font-size: 14px;
  color: #FFFFFF;
  outline: none;
  transition: all 0.2s;
}

.auth-field input::placeholder {
  color: #64748B;
}

.auth-field select option {
  background-color: #0D2040;
  color: #FFFFFF;
}

.auth-field input:focus,
.auth-field select:focus {
  border-color: #FF4D6D;
  box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.auth-fields-row {
  display: flex;
  gap: 16px;
}

.auth-fields-row .auth-field {
  flex: 1;
}

.auth-role-subfields {
  margin-top: 10px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subfields-title {
  font-size: 14px;
  font-weight: 700;
  color: #FF4D6D;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.specializations-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #E2E8F0;
  cursor: pointer;
}

.checkbox-label input {
  cursor: pointer;
  accent-color: #FF4D6D;
}

.auth-submit {
  margin-top: 4px;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  background: #FF4D6D;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
}

.auth-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #64748B;
  font-size: 13px;
  margin: 28px 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.auth-divider span {
  padding: 0 12px;
}

.auth-sso-buttons {
  display: flex;
  gap: 16px;
}

.sso-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;
}

.sso-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

/* SSO Pending Role selection styling */
.role-choices {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 20px 0 32px;
}

.role-choice-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  text-align: left;
  cursor: pointer;
  color: #FFFFFF;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-style: solid;
}

.role-choice-card h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #FF4D6D;
}

.role-choice-card p {
  font-size: 13px;
  color: #94A3B8;
  line-height: 1.4;
  margin: 0;
}

.role-choice-card:hover {
  background: rgba(255, 77, 109, 0.06);
  border-color: #FF4D6D;
  transform: translateY(-2px);
}

.cancel-btn {
  padding: 14px;
  border-color: rgba(255, 255, 255, 0.2);
  font-size: 14px;
  background: transparent;
  color: #94A3B8;
  cursor: pointer;
  border-radius: 12px;
}

.google-input-box {
  color: #0F172A !important;
  background-color: #FFFFFF !important;
  border: 1.5px solid #CBD5E1 !important;
  box-sizing: border-box !important;
}

.google-input-box:focus {
  color: #0F172A !important;
  background-color: #FFFFFF !important;
  border-color: #4285F4 !important;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.2) !important;
}
`;

export default AuthPage;
