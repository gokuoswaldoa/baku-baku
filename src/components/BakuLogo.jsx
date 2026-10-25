import React, { useState } from 'react';

/**
 * BakuLogo Component
 * Renders the official BAKU-BAKU SUSHI & FIRE brand logo:
 * Red panda mascot with carmine headband holding a crispy golden panko sushi sphere.
 * Preserves exact proportions without distortion.
 */
export default function BakuLogo({ variant = 'default', size = 'md', className = '' }) {
  const [useFallback, setUseFallback] = useState(false);

  // Size mapping with preserved aspect ratios
  const sizeClasses = {
    header: 'h-11 sm:h-12 w-auto',
    sm: 'w-16 h-auto',
    md: 'w-28 sm:w-32 h-auto',
    lg: 'w-44 sm:w-52 h-auto',
    xl: 'w-56 sm:w-64 h-auto',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src={useFallback ? '/baku-logo.png' : '/baku-logo.webp'}
        alt="BAKU-BAKU SUSHI & FIRE"
        onError={() => setUseFallback(true)}
        className={`${selectedSize} object-contain transition-transform`}
        loading="eager"
      />
    </div>
  );
}
