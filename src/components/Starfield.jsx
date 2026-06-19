import React, { useMemo } from 'react';
import './Starfield.css';

const Starfield = () => {
  const stars = useMemo(() => {
    const generatedStars = [];
    for (let i = 0; i < 70; i++) {
      // Distribute sizes: mostly 1-1.5px, a few slightly larger
      const rand = Math.random();
      let size = 1.5;
      if (rand > 0.9) size = 2.5;
      else if (rand > 0.7) size = 2;
      else size = Math.random() * 0.5 + 1; // 1 to 1.5px

      // Base opacity: vary from faint to brighter
      const baseOpacity = Math.random() * 0.5 + 0.3; // 0.3 to 0.8

      // Add a soft glow to about 20% of stars
      const hasGlow = Math.random() > 0.8;

      generatedStars.push({
        id: i,
        top: Math.random() * 100, // 0-100%
        left: Math.random() * 100, // 0-100%
        size,
        baseOpacity,
        hasGlow,
      });
    }
    return generatedStars;
  }, []);

  return (
    <div className="home-starfield-container">
      {stars.map((star) => (
        <svg
          key={star.id}
          className={`star-svg ${star.hasGlow ? 'glow' : ''}`}
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.baseOpacity,
          }}
          viewBox="0 0 24 24"
        >
          {/* 4-pointed star shape (✦ style) using Quadratic Bezier Curves */}
          <path d="M12 0 Q12 12 24 12 Q12 12 12 24 Q12 12 0 12 Q12 12 12 0 Z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
};

export default Starfield;
