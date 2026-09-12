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

      {showText && (
        <div className="flex flex-col text-left">
          <span className={`font-display font-black tracking-tight text-white leading-none ${
            size === 'sm' ? 'text-xs sm:text-sm' : size === 'md' ? 'text-xl' : 'text-2xl md:text-3xl'
          }`}>
            CURVADA'S
          </span>
          <span className={`font-marker text-brand-red leading-none transform rotate-[-2deg] origin-left ${
            size === 'sm' ? 'text-xs mt-0.5' : 'text-lg -mt-1'
          }`}>
            Kitchen
          </span>
        </div>
      )}
    </div>
  );
}
