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
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setStats(data);
      })
      .catch(err => console.warn("Could not fetch stats, using fallback data", err));
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
