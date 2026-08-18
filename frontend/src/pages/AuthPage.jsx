import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

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
    age: '',
    division: "Men's Open",
    stance: 'regular',
    // Coach details
    specializations: [],
    rates: '$75 / hr',
    location: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (spec) => {
    const specs = [...formData.specializations];
    if (specs.includes(spec)) {
      setFormData({ ...formData, specializations: specs.filter(s => s !== spec) });
    } else {
      setFormData({ ...formData, specializations: [...specs, spec] });
    }
  };

  const handleAuthSuccess = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    // For sidebar backwards compatibility with School Admin mock logic:
    localStorage.setItem('activeSchool', JSON.stringify({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? `${API}/api/auth/login` : `${API}/api/auth/signup`;
      const bodyData = isLogin 
        ? { email: formData.email, password: formData.password }
        : {
            email: formData.email,
            password: formData.password,
            role: role,
            name: formData.name,
            stance: formData.stance,
            age: formData.age ? parseInt(formData.age) : null,
            division: formData.division,
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

  const handleSSOLogin = async (provider) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Simulate OAuth token payload
      const mockSocialId = `sso_${provider}_${Math.random().toString(36).substring(2, 9)}`;
      const mockEmail = `sso_user_${Math.random().toString(36).substring(2, 6)}@gmail.com`;
      const mockName = provider === 'google' ? 'Google Surfer' : 'Apple Wave';

      const res = await fetch(`${API}/api/auth/sso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          social_id: mockSocialId,
          email: mockEmail,
          name: mockName
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.needs_role) {
          // If first-time login, we open intermediate step to pick role
          setSsoPendingData(data);
        } else {
          handleAuthSuccess(data.token, data.user);
        }
      } else {
        setErrorMsg('SSO login failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg('SSO authentication connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSSORoleSelection = async (selectedRole) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/api/auth/sso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: ssoPendingData.provider,
          social_id: ssoPendingData.social_id,
          email: ssoPendingData.email,
          name: ssoPendingData.name,
          role: selectedRole
        })
      });

      const data = await res.json();
      if (res.ok) {
        handleAuthSuccess(data.token, data.user);
      } else {
        setErrorMsg('Could not complete SSO profile registration.');
      }
    } catch (err) {
      setErrorMsg('Error setting up role details.');
    } finally {
      setLoading(false);
      setSsoPendingData(null);
    }
  };

  if (ssoPendingData) {
    return (
      <div className="auth-page">
        <div className="auth-panel-left">
          <div className="auth-brand">
            <span className="auth-brand-dot" />
            <span className="auth-brand-name">AiSurf</span>
          </div>
          <h2 className="auth-title">Choose Your Role</h2>
          <p className="auth-subtitle">To complete your Single Sign-On registration, select your primary account type below:</p>
          
          <div className="role-choices">
            {[
              { type: 'athlete', label: 'Student', desc: 'Log sessions, track stats, and analyze technique.' },
              { type: 'coach', label: 'Coach', desc: 'Manage students, run reviews, and book sessions.' },
              { type: 'admin', label: 'School Admin', desc: 'Full facility oversight, analytics, and settings.' }
            ].map(choice => (
              <button key={choice.type} className="role-choice-card" onClick={() => handleSSORoleSelection(choice.type)}>
                <h3>{choice.label}</h3>
                <p>{choice.desc}</p>
              </button>
            ))}
          </div>

          <button className="btn-secondary cancel-btn" onClick={() => setSsoPendingData(null)}>Cancel SSO Signup</button>
        </div>
        <div className="auth-panel-right">
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px' }}>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '48px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginBottom: '16px' }}>Set up your path.</h1>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>Join as a student to log sessions or as a coach to manage student diagnostics.</p>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

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
              <div className="auth-fields-row">
                <div className="auth-field">
                  <label>Full Name</label>
                  <input type="text" name="name" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
                </div>

                <div className="auth-field">
                  <label>Account Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="athlete">Student</option>
                    <option value="coach">Coach (Instructor)</option>
                    <option value="admin">System Admin / Owner</option>
                  </select>
                </div>
              </div>

              <div className="auth-fields-row">
                <div className="auth-field">
                  <label>Email Address</label>
                  <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
                </div>

                <div className="auth-field">
                  <label>Password</label>
                  <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
                </div>
              </div>

              <div className="auth-fields-row">
                <div className="auth-field">
                  <label>Confirm Password</label>
                  <input type="password" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
                </div>
                <div className="auth-field" style={{ visibility: 'hidden', height: 0 }}>
                  <label>Placeholder</label>
                  <input type="text" disabled />
                </div>
              </div>
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
          {!isLogin && role === 'athlete' && (
            <div className="auth-role-subfields">
              <h4 className="subfields-title">Student Profile Details</h4>
              <div className="auth-fields-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.5fr', gap: '12px' }}>
                <div className="auth-field">
                  <label>Age</label>
                  <input type="number" name="age" placeholder="24" value={formData.age} onChange={handleChange} />
                </div>
                <div className="auth-field">
                  <label>Surf Stance</label>
                  <select name="stance" value={formData.stance} onChange={handleChange}>
                    <option value="regular">Regular</option>
                    <option value="goofy">Goofy</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>Division</label>
                  <select name="division" value={formData.division} onChange={handleChange}>
                    <option value="Juniors">Juniors</option>
                    <option value="Men's Open">Men's Open</option>
                    <option value="Women's Open">Women's Open</option>
                    <option value="Men's Amateur">Men's Amateur</option>
                    <option value="Women's Amateur">Women's Amateur</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {!isLogin && role === 'coach' && (
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

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="auth-sso-buttons">
          <button className="sso-btn google-btn" type="button" onClick={() => handleSSOLogin('google')} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          
          <button className="sso-btn apple-btn" type="button" onClick={() => handleSSOLogin('apple')} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.97.08 2.15-.52 2.81-1.33z"/>
            </svg>
            Apple ID
          </button>
        </div>
      </div>

      <div className="auth-panel-right">
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px' }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '48px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginBottom: '16px' }}>Master the ocean.</h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>Elevate your technique with high-performance analytics, video review, and professional athletic intelligence tools.</p>
        </div>
      </div>

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

.cancel-btn:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: #FFFFFF;
}
`;

export default AuthPage;
