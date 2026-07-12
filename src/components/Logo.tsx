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
      {/* High-Fidelity Curvada's Kitchen Circle Badge */}
      <div className={`relative ${dimensions[size]} flex-shrink-0 animate-pulse-slow`}>
        <img
          src="/logo.jpg"
          alt="Curvada's Kitchen Logo"
          className="w-full h-full object-cover rounded-full drop-shadow-xl border-2 border-brand-red/30"
        />
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
