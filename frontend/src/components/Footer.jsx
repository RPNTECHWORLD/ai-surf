import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="landing-footer-container">
        {/* Left: Brand, Copyright & Version */}
        <div className="landing-footer-left">
          <div className="landing-footer-brand">
            <img
              src="/athnexlive-logo.png"
              alt="AthnexLive"
              className="landing-footer-logo"
            />
          </div>
          <div className="landing-footer-info">
            <p className="landing-footer-copy">
              &copy; {currentYear} AthnexLive
            </p>
            <span className="landing-footer-version-tag">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Right: Developed by rpntechworld Pill */}
        <div className="landing-footer-right">
          <a
            href="https://rpntechworld.com"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-footer-pill"
          >
            <span className="landing-footer-devby">Developed by</span>
            <span className="landing-footer-brandlink">rpntechworld</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
