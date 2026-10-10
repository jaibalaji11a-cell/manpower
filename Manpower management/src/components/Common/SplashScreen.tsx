import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, minDuration = 4000 }) => {
  const [phase, setPhase] = useState(0); // 0=dark, 1=logo-in, 2=brand-reveal, 3=particles, 4=exit
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Phase 1 – Logo materializes (after 200ms)
    const t1 = setTimeout(() => setPhase(1), 200);
    // Phase 2 – Brand text reveals (after 1100ms)
    const t2 = setTimeout(() => setPhase(2), 1100);
    // Phase 3 – Tagline + sparkles (after 2200ms)
    const t3 = setTimeout(() => setPhase(3), 2200);
    // Phase 4 – Exit wipe (at 4000ms / minDuration)
    const t4 = setTimeout(() => setPhase(4), minDuration);
    // Remove from DOM
    const t5 = setTimeout(() => {
      setHidden(true);
      onComplete?.();
    }, minDuration + 900);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [minDuration, onComplete]);

  if (hidden) return null;

  return (
    <div className={`splash-root ${phase >= 4 ? 'splash-exit' : ''}`}>
      {/* Radial background pulse */}
      <div className="splash-bg-pulse" />

      {/* Animated particle field */}
      <div className={`splash-particles ${phase >= 1 ? 'active' : ''}`}>
        {Array.from({ length: 45 }).map((_, i) => (
          <span
            key={i}
            className="splash-particle"
            style={{
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`,
              '--delay': `${Math.random() * 2}s`,
              '--size': `${2.5 + Math.random() * 3.5}px`,
              '--drift': `${(Math.random() - 0.5) * 140}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Horizontal gold scan line */}
      <div className={`splash-scanline ${phase >= 1 ? 'active' : ''}`} />

      {/* Central content */}
      <div className="splash-center">
        {/* Logo container with rings */}
        <div className={`splash-logo-wrap ${phase >= 1 ? 'visible' : ''}`}>
          {/* Outer orbiting hexagon ring */}
          <svg className="splash-hex-ring splash-hex-outer" viewBox="0 0 100 100">
            <polygon points="50,3 93,25 93,75 50,97 7,75 7,25" />
          </svg>
          {/* Inner orbiting hexagon ring */}
          <svg className="splash-hex-ring splash-hex-inner" viewBox="0 0 100 100">
            <polygon points="50,5 91,27 91,73 50,95 9,73 9,27" />
          </svg>
          {/* Logo image */}
          <div className="splash-logo-frame">
            <img src="/logo.png" alt="MAN POWER" className="splash-logo-img" />
          </div>
        </div>

        {/* Brand text */}
        <div className={`splash-brand ${phase >= 2 ? 'visible' : ''}`}>
          <h1 className="splash-title">
            <span className="splash-letter" style={{ animationDelay: '0s' }}>M</span>
            <span className="splash-letter" style={{ animationDelay: '0.04s' }}>A</span>
            <span className="splash-letter" style={{ animationDelay: '0.08s' }}>N</span>
            <span className="splash-letter-space" />
            <span className="splash-letter" style={{ animationDelay: '0.15s' }}>P</span>
            <span className="splash-letter" style={{ animationDelay: '0.19s' }}>O</span>
            <span className="splash-letter" style={{ animationDelay: '0.23s' }}>W</span>
            <span className="splash-letter" style={{ animationDelay: '0.27s' }}>E</span>
            <span className="splash-letter" style={{ animationDelay: '0.31s' }}>R</span>
          </h1>
          <div className="splash-divider" />
          <p className="splash-subtitle">COIMBATORE</p>
        </div>

        {/* Tagline */}
        <p className={`splash-tagline ${phase >= 3 ? 'visible' : ''}`}>
          Workforce Management System
        </p>
      </div>

      {/* Bottom accent bar */}
      <div className={`splash-bottom-bar ${phase >= 2 ? 'active' : ''}`} />
    </div>
  );
};

export default SplashScreen;
