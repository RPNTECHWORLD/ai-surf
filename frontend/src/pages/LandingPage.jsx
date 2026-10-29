import React from 'react';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Features from '../components/Features';
import Footer from '../components/Footer';

const LandingPage = () => {
  return (
    <div className="app-container">
      <Hero />
      <Stats />
      <Features />
      <Footer />
    </div>
  );
};

export default LandingPage;
