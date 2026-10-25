import React, { useState } from 'react';

/**
 * Baku Baku Official Mascot & Logo Component
 * Incorporates exact brand manual guidelines:
 * - Naranja Fuego (#FF9A00)
 * - Rojo Carmín (#D32F2F)
 * - Marrón Café / Chocolate (#3E2723)
 * - Dorado Panko (#E69138)
 * - Crema / Blanco Cálido (#FFF8E7)
 */
export default function BakuLogo({ size = 'md', showBadge = true, className = '' }) {
  const [imgError, setImgError] = useState(false);

  // Dimension presets
  const sizeMap = {
    sm: { container: 'w-10 h-10', text: 'text-sm', badge: 'text-[8px] px-1.5 py-0.2' },
    md: { container: 'w-14 h-14', text: 'text-xl', badge: 'text-[9px] px-2 py-0.5' },
    lg: { container: 'w-24 h-24', text: 'text-3xl', badge: 'text-xs px-3 py-1' },
    xl: { container: 'w-32 h-32', text: 'text-4xl', badge: 'text-sm px-3.5 py-1' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      {/* If the user places an image file at /logo.png in the future, it loads automatically */}
      {!imgError ? (
        <img
          src="/logo.png"
          alt="Baku Baku Logo"
          onError={() => setImgError(true)}
          className={`${currentSize.container} object-contain drop-shadow-[0_4px_12px_rgba(255,154,0,0.45)]`}
        />
      ) : (
        /* Vector SVG Mascot Logo adhering 100% to brand manual */
        <div className={`relative ${currentSize.container} drop-shadow-[0_4px_16px_rgba(255,154,0,0.45)]`}>
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Outer Energy Glow / Fire Aura */}
            <circle cx="60" cy="60" r="58" fill="#FF9A00" fillOpacity="0.15" />
            
            {/* Fondo Circular Principal - Naranja Fuego (#FF9A00) con borde Marrón Café (#3E2723) */}
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="#FF9A00"
              stroke="#3E2723"
              strokeWidth="5"
            />

            {/* Inner dynamic flame accents */}
            <path
              d="M32 30C36 18 48 14 60 14C72 14 84 18 88 30C80 25 70 23 60 23C50 23 40 25 32 30Z"
              fill="#D32F2F"
              opacity="0.3"
            />

            {/* Panda Ears - Marrón Café (#3E2723) con interior Crema (#FFF8E7) */}
            <circle cx="36" cy="38" r="14" fill="#3E2723" stroke="#3E2723" strokeWidth="2" />
            <circle cx="37" cy="39" r="7" fill="#FFF8E7" />

            <circle cx="84" cy="38" r="14" fill="#3E2723" stroke="#3E2723" strokeWidth="2" />
            <circle cx="83" cy="39" r="7" fill="#FFF8E7" />

            {/* Panda Head Base - Crema (#FFF8E7) */}
            <ellipse cx="60" cy="58" rx="34" ry="30" fill="#FFF8E7" stroke="#3E2723" strokeWidth="5" />

            {/* Carmine Red Headband / Cinta de la cabeza (#D32F2F) */}
            <path
              d="M28 46C40 41 80 41 92 46L90 38C76 34 44 34 30 38L28 46Z"
              fill="#D32F2F"
              stroke="#3E2723"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Headband knot ribbons */}
            <path
              d="M90 42C96 40 102 44 104 48C99 49 94 48 91 45Z"
              fill="#D32F2F"
              stroke="#3E2723"
              strokeWidth="2.5"
            />

            {/* Eye Patches - Marrón Café (#3E2723) */}
            <ellipse cx="46" cy="56" rx="9" ry="11" transform="rotate(-15 46 56)" fill="#3E2723" />
            <ellipse cx="74" cy="56" rx="9" ry="11" transform="rotate(15 74 56)" fill="#3E2723" />

            {/* Lively Anime Eyes - Crema / Blanco Cálido (#FFF8E7) */}
            <circle cx="48" cy="55" r="3.5" fill="#FFF8E7" />
            <circle cx="46" cy="58" r="1.5" fill="#FFF8E7" />
            <circle cx="72" cy="55" r="3.5" fill="#FFF8E7" />
            <circle cx="74" cy="58" r="1.5" fill="#FFF8E7" />

            {/* Cheeks blush - Rojo Carmín suave */}
            <ellipse cx="38" cy="65" rx="5" ry="3" fill="#D32F2F" fillOpacity="0.4" />
            <ellipse cx="82" cy="65" rx="5" ry="3" fill="#D32F2F" fillOpacity="0.4" />

            {/* Nose & Happy Mouth - Marrón Café (#3E2723) */}
            <ellipse cx="60" cy="64" rx="4.5" ry="3" fill="#3E2723" />
            <path
              d="M54 69C57 73 63 73 66 69"
              stroke="#3E2723"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Mascot Paws holding the Fire Sushi Ball */}
            <circle cx="34" cy="85" r="9" fill="#3E2723" />
            <circle cx="86" cy="85" r="9" fill="#3E2723" />

            {/* Bola de Fuego - Dorado Panko (#E69138) con borde Marrón Café (#3E2723) */}
            <circle
              cx="60"
              cy="90"
              r="22"
              fill="#E69138"
              stroke="#3E2723"
              strokeWidth="4.5"
            />

            {/* Panko Crispy Crumbs Textures */}
            <circle cx="53" cy="84" r="2.2" fill="#FFF8E7" opacity="0.8" />
            <circle cx="67" cy="85" r="2.5" fill="#FF9A00" />
            <circle cx="60" cy="94" r="3" fill="#D32F2F" />
            <circle cx="52" cy="95" r="2" fill="#FFF8E7" opacity="0.7" />
            <circle cx="69" cy="94" r="2" fill="#FFF8E7" opacity="0.8" />
            <circle cx="60" cy="83" r="1.8" fill="#3E2723" opacity="0.5" />

            {/* Fire flame crown topping the sushi sphere */}
            <path
              d="M60 74C64 68 70 71 67 76C71 74 72 79 69 82C66 84 62 85 60 85C58 85 54 84 51 82C48 79 49 74 53 76C50 71 56 68 60 74Z"
              fill="#D32F2F"
              stroke="#3E2723"
              strokeWidth="2"
            />
            <path
              d="M60 77C62 74 65 76 64 79C62 81 60 82 59 82C58 82 57 81 56 79C55 76 58 74 60 77Z"
              fill="#FF9A00"
            />
          </svg>
        </div>
      )}

      {/* Typography Block if rendered as full logo */}
      {showBadge && (
        <div className="mt-2 text-center flex flex-col items-center">
          {/* Main Title: BAKU-BAKU in Pop Rounded style with Chocolate Shadow */}
          <span
            className={`${currentSize.text} font-display font-black text-baku-cream tracking-wider uppercase leading-none drop-shadow-[0_3px_0_#3E2723]`}
            style={{
              textShadow: '2px 2px 0 #3E2723, -2px 2px 0 #3E2723, 2px -2px 0 #3E2723, -2px -2px 0 #3E2723, 0 4px 0 #3E2723',
            }}
          >
            BAKU-BAKU
          </span>

          {/* Subtitle Pill Cartela: SUSHI & FIRE */}
          <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-baku-chocolate border border-baku-orange/50 shadow-sm">
            <span className="font-slogan font-black text-[9px] uppercase tracking-widest text-baku-orange">
              SUSHI & FIRE
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
