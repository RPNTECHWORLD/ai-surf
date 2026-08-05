import React from 'react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-section" style={{ position: 'relative' }}>
      {/* Header Navigation */}
      <div className="hero-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 80px', zIndex: 10 }}>
        <div className="hero-brand" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#FF4D6D', borderRadius: '50%' }} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#FFF', letterSpacing: '-0.5px' }}>AiSurf</span>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/auth')} style={{ padding: '10px 24px', fontSize: '15px', borderRadius: '10px', height: 'auto', border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)' }}>
          Sign In
        </button>
      </div>

      <div className="hero-content">
        <h1>Ride. Train.<br />Dominate.</h1>
        <p className="hero-subtitle">
          The complete coaching platform for surf schools,<br />
          instructors, and world-class surfers.
        </p>
        <div className="hero-buttons">
          <button className="btn-primary" onClick={() => navigate('/auth')}>Get Started Free</button>
          <button className="btn-secondary" onClick={() => navigate('/auth')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
