import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-48 h-48 md:w-64 md:h-64',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Authentic Curvada's Kitchen Circle Badge SVG */}
      <div className={`relative ${dimensions[size]} flex-shrink-0 animate-pulse-slow`}>
        <svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main outer red thick border */}
          <circle cx="250" cy="250" r="235" fill="#121212" stroke="#d31f24" strokeWidth="15" />
          
          {/* Inner solid red plate */}
          <circle cx="250" cy="250" r="190" fill="#d31f24" />
          
          {/* Concentric black path ring */}
          <circle cx="250" cy="250" r="140" stroke="#121212" strokeWidth="35" strokeDasharray="14 8" />
          <circle cx="250" cy="250" r="140" stroke="#ffffff" strokeWidth="4" strokeDasharray="8 6" />

          {/* Curved Road Representing "Made to Go" / "Curvada" */}
          <path d="M 120 330 Q 250 130 380 330" stroke="#121212" strokeWidth="50" strokeLinecap="round" />
          {/* Road center dashed line */}
          <path d="M 130 320 Q 250 145 370 320" stroke="#ffffff" strokeWidth="4" strokeDasharray="15 15" strokeLinecap="round" />

          {/* Slogans & EST in SVG */}
          <rect x="200" y="380" width="100" height="28" rx="6" fill="#121212" />
          <text x="250" y="398" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">EST. 2026</text>

          {/* Bento box representation in center bottom-left */}
          <g transform="translate(130, 260) scale(0.9)">
            {/* Bento box base */}
            <rect x="0" y="0" width="80" height="60" rx="8" fill="#121212" stroke="#ffffff" strokeWidth="3" />
            {/* Bento compartments */}
            <rect x="8" y="8" width="30" height="20" rx="3" fill="#ffffff" />
            <circle cx="23" cy="18" r="4" fill="#d31f24" /> {/* Rice and plum/egg */}
            <rect x="42" y="8" width="30" height="20" rx="3" fill="#fbbf24" /> {/* Egg yolk/omelette */}
            <rect x="8" y="34" width="64" height="18" rx="3" fill="#d31f24" /> {/* Sausage/Tapa */}
          </g>

          {/* Rice bowl with sunny egg in center bottom-right */}
          <g transform="translate(260, 260) scale(0.9)">
            <path d="M 10 30 Q 10 70 45 70 Q 80 70 80 30 Z" fill="#121212" stroke="#ffffff" strokeWidth="3" />
            <ellipse cx="45" cy="30" rx="33" ry="12" fill="#ffffff" stroke="#ffffff" strokeWidth="1" />
            {/* Sunny side up egg yolk in center of bowl */}
            <circle cx="45" cy="30" r="14" fill="#fbbf24" />
            {/* Bacon/Tapa strip */}
            <path d="M 22 24 Q 30 15 38 24" stroke="#d31f24" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Curvada's Branded Red Cup with "C" in center top-middle */}
          <g transform="translate(210, 140) scale(1.1)">
            {/* Straw */}
            <line x1="45" y1="5" x2="35" y2="25" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            {/* Lid */}
            <ellipse cx="35" cy="27" rx="18" ry="5" fill="#ffffff" />
            {/* Cup body */}
            <path d="M 20 30 L 24 80 L 46 80 L 50 30 Z" fill="#d31f24" stroke="#121212" strokeWidth="2" />
            {/* Black Circle Badge on cup with "C" */}
            <circle cx="35" cy="55" r="11" fill="#121212" />
            <circle cx="35" cy="55" r="8" stroke="#ffffff" strokeWidth="2" fill="none" />
            <text x="35" y="59" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">C</text>
          </g>

          {/* Circular Text Top "CURVADA'S KITCHEN" */}
          <path id="textPathTop" d="M 60 250 A 190 190 0 0 1 440 250" fill="none" />
          <text fill="#ffffff" fontSize="33" fontWeight="900" fontFamily="'Space Grotesk', sans-serif" letterSpacing="6">
            <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">
              CURVADA'S KITCHEN
            </textPath>
          </text>

          {/* Circular Text Bottom "CURVADA'S KITCHEN" */}
          <path id="textPathBottom" d="M 440 250 A 190 190 0 0 1 60 250" fill="none" />
          <text fill="#ffffff" fontSize="33" fontWeight="900" fontFamily="'Space Grotesk', sans-serif" letterSpacing="6">
            <textPath href="#textPathBottom" startOffset="50%" textAnchor="middle">
              CURVADA'S KITCHEN
            </textPath>
          </text>
        </svg>
      </div>

      {showText && size !== 'sm' && (
        <div className="flex flex-col">
          <span className="font-display font-black text-xl tracking-tight text-white leading-none">
            CURVADA'S
          </span>
          <span className="font-marker text-brand-red text-lg leading-none -mt-1 transform rotate-[-2deg] origin-left">
            Kitchen
          </span>
        </div>
      )}
    </div>
  );
}
