import React from 'react';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Features from '../components/Features';

const LandingPage = () => {
  return (
    <div className="app-container">
      <Hero />
      <Stats />
      <Features />
    </div>
  );
};

export default LandingPage;
