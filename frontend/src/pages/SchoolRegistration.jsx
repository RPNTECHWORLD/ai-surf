import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const SchoolRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    schoolName: '',
    country: '',
    city: '',
    ownerName: '',
    email: '',
    phone: '',
    instructorCount: '',
    website: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/api/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.schoolName,
          owner: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          country: formData.country,
          city: formData.city,
          instructor_count: formData.instructorCount,
          website: formData.website,
        }),
      });
      if (res.ok) {
        localStorage.setItem('activeSchool', JSON.stringify({
          name: formData.schoolName,
          owner: formData.ownerName,
          email: formData.email,
        }));
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.detail || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Could not connect to the server. Please check your connection.');
    }
    setLoading(false);
  };

  return (
    <div className="reg-page">
      {/* Left panel */}
      <div className="reg-left">
        <div className="reg-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="reg-brand-dot" />
          <span className="reg-brand-name">AiSurf</span>
        </div>
        <div className="reg-left-content">
          <h2 className="reg-left-title">
            Join 500+ surf<br />schools worldwide.
          </h2>
          <p className="reg-left-sub">
            Unlock AI video analysis, session tracking, badge systems, and a world-class competition hub — all in one platform.
          </p>
          <ul className="reg-perks">
            {[
              '14-day free trial, no card required',
              'Dedicated onboarding support',
              'Unlimited instructor accounts',
              'Real-time student analytics',
            ].map((perk) => (
              <li key={perk} className="reg-perk-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D1B2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {perk}
              </li>
            ))}
          </ul>
        </div>
        <div className="reg-wave-deco" />
      </div>

      {/* Right panel */}
      <div className="reg-right">
        {submitted ? (
          <div className="reg-success">
            <div className="reg-success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00D1B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="reg-success-title">You're on the list!</h3>
            <p className="reg-success-sub">Your school has been registered. We'll reach out within 24 hours to set up your account.</p>
            <button className="btn-primary reg-success-btn" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <>
            <h3 className="reg-form-title">Register your school</h3>
            <p className="reg-form-sub">Fill in the details below to get started.</p>

            {errorMsg && (
              <div className="reg-error">{errorMsg}</div>
            )}

            <form className="reg-form" onSubmit={handleSubmit}>
              <div className="reg-form-row">
                <div className="reg-field">
                  <label htmlFor="schoolName">School Name</label>
                  <input id="schoolName" name="schoolName" type="text" placeholder="Pipeline Surf School" value={formData.schoolName} onChange={handleChange} required />
                </div>
                <div className="reg-field">
                  <label htmlFor="ownerName">Owner / Manager</label>
                  <input id="ownerName" name="ownerName" type="text" placeholder="John Doe" value={formData.ownerName} onChange={handleChange} required />
                </div>
              </div>
              <div className="reg-form-row">
                <div className="reg-field">
                  <label htmlFor="email">Email Address</label>
                  <input id="email" name="email" type="email" placeholder="hello@school.com" value={formData.email} onChange={handleChange} required />
                </div>
                <div className="reg-field">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" name="phone" type="tel" placeholder="+1 808 555 0100" value={formData.phone} onChange={handleChange} />
                </div>
              </div>
              <div className="reg-form-row">
                <div className="reg-field">
                  <label htmlFor="country">Country</label>
                  <input id="country" name="country" type="text" placeholder="United States" value={formData.country} onChange={handleChange} required />
                </div>
                <div className="reg-field">
                  <label htmlFor="city">City</label>
                  <input id="city" name="city" type="text" placeholder="Honolulu" value={formData.city} onChange={handleChange} required />
                </div>
              </div>
              <div className="reg-form-row">
                <div className="reg-field">
                  <label htmlFor="instructorCount">Number of Instructors</label>
                  <select id="instructorCount" name="instructorCount" value={formData.instructorCount} onChange={handleChange} required>
                    <option value="" disabled>Select range</option>
                    <option>1–5</option>
                    <option>6–15</option>
                    <option>16–30</option>
                    <option>30+</option>
                  </select>
                </div>
                <div className="reg-field">
                  <label htmlFor="website">Website (optional)</label>
                  <input id="website" name="website" type="url" placeholder="https://yourschool.com" value={formData.website} onChange={handleChange} />
                </div>
              </div>
              <button id="reg-submit-btn" type="submit" className="btn-primary reg-submit" disabled={loading}>
                {loading ? <span className="reg-spinner" /> : 'Create My School Account'}
              </button>
            </form>
            <p className="reg-login-hint">
              Already registered?{' '}
              <span className="reg-login-link" onClick={() => navigate('/dashboard')}>Go to Dashboard</span>
            </p>
          </>
        )}
      </div>

      <style>{`
        .reg-page {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
        }

        /* ---- Left ---- */
        .reg-left {
          position: relative;
          width: 42%;
          background: #050B1A;
          display: flex;
          flex-direction: column;
          padding: 48px 56px;
          overflow: hidden;
        }
        .reg-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 80px;
        }
        .reg-brand-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #00D1B2;
        }
        .reg-brand-name {
          font-weight: 800;
          font-size: 22px;
          color: #fff;
          letter-spacing: -0.5px;
        }
        .reg-left-content { flex: 1; }
        .reg-left-title {
          font-size: 42px;
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          margin-bottom: 20px;
        }
        .reg-left-sub {
          font-size: 16px;
          color: #8899AA;
          line-height: 1.7;
          margin-bottom: 40px;
        }
        .reg-perks { list-style: none; display: flex; flex-direction: column; gap: 16px; }
        .reg-perk-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          color: #C8D8E8;
          font-weight: 500;
        }
        .reg-wave-deco {
          position: absolute;
          bottom: -60px;
          right: -80px;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,209,178,0.12) 0%, transparent 70%);
        }

        /* ---- Right ---- */
        .reg-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 72px;
          background: #F8F6F2;
          overflow-y: auto;
        }
        .reg-form-title {
          font-size: 32px;
          font-weight: 800;
          color: #050B1A;
          margin-bottom: 8px;
        }
        .reg-form-sub {
          font-size: 15px;
          color: #6B7280;
          margin-bottom: 36px;
        }
        .reg-error {
          background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25);
          border-radius: 10px; padding: 12px 16px; color: #F43F5E;
          font-size: 14px; margin-bottom: 20px; font-weight: 500;
        }
        .reg-form { display: flex; flex-direction: column; gap: 20px; }
        .reg-form-row { display: flex; gap: 20px; }
        .reg-field { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .reg-field label { font-size: 13px; font-weight: 600; color: #050B1A; letter-spacing: 0.3px; }
        .reg-field input,
        .reg-field select {
          padding: 14px 16px;
          border: 1.5px solid #D1D5DB;
          border-radius: 10px;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          background: #fff;
          color: #050B1A;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .reg-field input:focus,
        .reg-field select:focus {
          border-color: #00D1B2;
          box-shadow: 0 0 0 3px rgba(0,209,178,0.15);
        }
        .reg-field input::placeholder { color: #9CA3AF; }
        .reg-submit {
          margin-top: 8px;
          padding: 16px;
          font-size: 16px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 52px;
        }
        .reg-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .reg-spinner {
          width: 20px; height: 20px;
          border: 2.5px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .reg-login-hint { margin-top: 20px; font-size: 14px; color: #6B7280; text-align: center; }
        .reg-login-link { color: #FF4D6D; font-weight: 600; cursor: pointer; }
        .reg-login-link:hover { text-decoration: underline; }

        /* Success state */
        .reg-success {
          display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center;
        }
        .reg-success-icon {
          width: 96px; height: 96px; border-radius: 50%;
          background: rgba(0,209,178,0.1);
          display: flex; align-items: center; justify-content: center;
        }
        .reg-success-title { font-size: 32px; font-weight: 800; color: #050B1A; }
        .reg-success-sub { font-size: 16px; color: #6B7280; max-width: 340px; line-height: 1.6; }
        .reg-success-btn { margin-top: 8px; padding: 14px 40px; }

        @media (max-width: 768px) {
          .reg-page { flex-direction: column; }
          .reg-left { width: 100%; padding: 36px 28px; }
          .reg-right { padding: 40px 28px; }
          .reg-form-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default SchoolRegistration;
