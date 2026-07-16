import React, { useEffect, useState } from 'react';

// Simple SVG Icons since we don't have lucide-react installed by default
const icons = {
  camera: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
      <circle cx="12" cy="13" r="3"></circle>
    </svg>
  ),
  activity: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  ),
  award: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"></circle>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
    </svg>
  ),
  users: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  )
};

const Features = () => {
  const [features, setFeatures] = useState([
    {
      icon: "camera",
      title: "AI Video Analysis",
      description: "Break down every turn with frame-by-frame posture and wave positioning analysis."
    },
    {
      icon: "activity",
      title: "Session Tracking",
      description: "Log every wave. Track speed, duration, and performance metrics in real-time."
    },
    {
      icon: "award",
      title: "Badge System",
      description: "Gamify progress. Award students with dynamic badges as they level up skills."
    },
    {
      icon: "users",
      title: "Competition Hub",
      description: "Organize, judge, and live-stream local competitions with pro-grade tools."
    }
  ]);

  useEffect(() => {
    // Optionally fetch features from backend
    fetch('http://localhost:8000/api/features')
      .then(res => res.json())
      .then(data => setFeatures(data))
      .catch(err => console.error("Could not fetch features, using fallback data", err));
  }, []);

  return (
    <section className="features-section">
      <h2>Precision Engineered Coaching</h2>
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon-wrapper">
              {icons[feature.icon]}
            </div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
