import React from 'react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1>Ride. Train.<br />Dominate.</h1>
        <p className="hero-subtitle">
          The complete coaching platform for surf schools,<br />
          instructors, and world-class athletes.
        </p>
        <div className="hero-buttons">
          <button className="btn-primary" onClick={() => navigate('/register')}>Get Started Free</button>
          <button className="btn-secondary">
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
