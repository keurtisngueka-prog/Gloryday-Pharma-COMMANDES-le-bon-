import React from 'react';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  size = 'md',
  showSubtitle = true,
  className = ''
}) => {
  const iconDimensions =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9 sm:w-10 sm:h-10';

  const titleSize =
    size === 'sm'
      ? 'text-sm sm:text-base'
      : size === 'lg'
        ? 'text-lg sm:text-xl'
        : 'text-base sm:text-lg';

  const isDarkBg = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none group ${className}`}>
      {/* Official Gloryday Pharma Medical Shield & Cross Emblem */}
      <div
        className={`${iconDimensions} relative rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-xs overflow-hidden`}
        style={{
          background: 'linear-gradient(135deg, #0d44e8 0%, #052585 100%)',
          boxShadow: '0 4px 12px -2px rgba(13, 68, 232, 0.38), inset 0 1px 1px rgba(255, 255, 255, 0.35)'
        }}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5"
          aria-hidden="true"
        >
          {/* Outer Medical Shield Contour */}
          <path
            d="M32 5L52 13V30C52 44.2 43.4 54.6 32 59C20.6 54.6 12 44.2 12 30V13L32 5Z"
            fill="rgba(255, 255, 255, 0.14)"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Inner Clinical Cross */}
          <rect x="27" y="17" width="10" height="28" rx="3" fill="#FFFFFF" />
          <rect x="18" y="26" width="28" height="10" rx="3" fill="#FFFFFF" />
          {/* Cobalt Core Pulse Dot */}
          <circle cx="32" cy="31" r="3.2" fill="#0d44e8" />
        </svg>
      </div>

      {/* Full Brand Wordmark */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span
            className={`font-black tracking-tight ${titleSize} ${
              isDarkBg ? 'text-white' : 'text-[#0f0f12]'
            }`}
          >
            GLORYDAY
          </span>
          <span
            className={`font-extrabold text-xs sm:text-sm uppercase tracking-wider ${
              isDarkBg ? 'text-blue-400' : 'text-[#0d44e8]'
            }`}
          >
            PHARMA
          </span>
        </div>
        {showSubtitle && (
          <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
            <span
              className={`text-[10px] font-semibold tracking-wide ${
                isDarkBg ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Gabon · Matériel Médical
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
