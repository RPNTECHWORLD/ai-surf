import React, { useEffect, useState } from 'react';

const Stats = () => {
  const [stats, setStats] = useState([
    { value: "500+", label: "SURF SCHOOLS" },
    { value: "12,000+", label: "STUDENTS" },
    { value: "98%", label: "SATISFACTION RATE" },
    { value: "45", label: "COUNTRIES" }
  ]);

  useEffect(() => {
    // Optionally fetch stats from the backend
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Could not fetch stats, using fallback data", err));
  }, []);

  return (
    <section className="stats-section">
      {stats.map((stat, index) => (
        <div key={index} className="stat-item">
          <div className="stat-value">{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </section>
  );
};

export default Stats;
