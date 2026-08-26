import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  variant?: 'full' | 'icon' | 'monochrome' | 'white';
  className?: string;
  animatePulse?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = false,
  variant = 'full',
  className = '',
  animatePulse = false,
}) => {
  // Dimension mapping
  const dim = typeof size === 'number' 
    ? size 
    : size === 'sm' ? 28 
    : size === 'md' ? 36 
    : size === 'lg' ? 48 
    : 64;

  const textFontSize = typeof size === 'number'
    ? Math.max(16, size * 0.5)
    : size === 'sm' ? '1.125rem'
    : size === 'md' ? '1.35rem'
    : size === 'lg' ? '1.75rem'
    : '2.25rem';

  const pinColor = variant === 'white' 
    ? '#FFFFFF' 
    : variant === 'monochrome' 
    ? 'currentColor' 
    : '#6C0022'; // Deep Burgundy from original logo

  const leftPillColor = variant === 'white'
    ? 'rgba(255, 255, 255, 0.45)'
    : variant === 'monochrome'
    ? 'currentColor'
    : '#E5C4CC'; // Soft blush rose overlay

  const rightPillColor = variant === 'white'
    ? 'rgba(255, 255, 255, 0.65)'
    : variant === 'monochrome'
    ? 'currentColor'
    : '#C893A1'; // Translucent dusty rose overlay

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem' }}>
      <div className="relative inline-flex items-center justify-center" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {animatePulse && (
          <span 
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '50%',
              backgroundColor: 'rgba(108, 0, 34, 0.25)',
              animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
            }}
          />
        )}
        <svg
          width={dim}
          height={Math.round(dim * 1.1)}
          viewBox="0 0 100 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ height: 'auto', display: 'block' }}
        >
          <defs>
            {/* Soft shadow under the pin */}
            <filter id="pinShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6C0022" floodOpacity="0.25" />
            </filter>
            
            {/* Subtle Gradient for Burgundy Pin */}
            <linearGradient id="burgundyGrad" x1="14" y1="5" x2="86" y2="95" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7B0C2E" />
              <stop offset="100%" stopColor="#58001B" />
            </linearGradient>

            {/* Inner Pill Translucency */}
            <linearGradient id="leftStrandGrad" x1="32" y1="58" x2="52" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F2D6DC" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#E2B4BF" stopOpacity="0.65" />
            </linearGradient>

            <linearGradient id="rightStrandGrad" x1="68" y1="58" x2="48" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D99BAA" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#B87B8B" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Location Pin Outer Marker */}
          <path
            d="M50 98 C31 72 14 53 14 37 A36 36 0 0 1 86 37 C86 53 69 72 50 98 Z"
            fill={variant === 'full' ? 'url(#burgundyGrad)' : pinColor}
            filter={variant === 'full' ? 'url(#pinShadow)' : undefined}
          />

          {/* Inner "A" Mark - Left Arch Strand */}
          <rect
            x="33"
            y="32"
            width="14"
            height="34"
            rx="7"
            transform="rotate(-26 40 49)"
            fill={variant === 'full' ? 'url(#leftStrandGrad)' : leftPillColor}
            style={{ mixBlendMode: 'normal' }}
          />

          {/* Inner "A" Mark - Right Arch Strand (Overlapping Apex) */}
          <rect
            x="53"
            y="32"
            width="14"
            height="34"
            rx="7"
            transform="rotate(26 60 49)"
            fill={variant === 'full' ? 'url(#rightStrandGrad)' : rightPillColor}
            style={{ mixBlendMode: 'normal' }}
          />
        </svg>
      </div>

      {showText && (
        <span 
          style={{ 
            fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
            fontWeight: 800,
            fontSize: textFontSize,
            letterSpacing: '-0.02em',
            color: variant === 'white' ? '#FFFFFF' : '#1F040D',
            lineHeight: 1
          }}
        >
          Attend<span style={{ color: variant === 'white' ? '#F4DCE2' : '#6C0022' }}>ly</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
