import React from 'react';

// Bespoke, clean SVGs without any emojis
export const FlameSphereIcon = ({ className = "w-8 h-8", color = "#FF7A00" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <radialGradient id="sphereGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FFA463" />
        <stop offset="45%" stopColor="#FF5A00" />
        <stop offset="90%" stopColor="#B32B00" />
        <stop offset="100%" stopColor="#4A0F00" />
      </radialGradient>
      <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Outer aura ring */}
    <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
    
    {/* Inner Crispy sphere */}
    <circle cx="24" cy="25" r="16" fill="url(#sphereGrad)" filter="url(#glowFilter)" />
    
    {/* Crust texture specks */}
    <circle cx="19" cy="20" r="1.5" fill="#FFF" opacity="0.6" />
    <circle cx="27" cy="21" r="1.2" fill="#FFD29D" opacity="0.8" />
    <circle cx="23" cy="28" r="1.6" fill="#7A1D00" opacity="0.6" />
    <circle cx="29" cy="27" r="1.3" fill="#FFF" opacity="0.4" />
    <circle cx="18" cy="26" r="1.2" fill="#FFD29D" opacity="0.7" />

    {/* Dynamic fire crown */}
    <path
      d="M24 4C24 4 28 9.5 28 13C28 14.5 27 16 25.5 16.5C27.5 15 30 17 30 19C30 20.8 28.5 22.2 27 22.8C27 21 26 19.5 24.5 19C23 18.5 21 19.5 20.5 21C20.5 19 19.5 17.5 18 16.5C18.8 15 20 13.5 20 11.5C20 8.5 24 4 24 4Z"
      fill="#FFF"
      opacity="0.95"
    />
    <path
      d="M24 7C24 7 26.5 10.8 26.5 13.2C26.5 14.8 25.2 16 24 16C22.8 16 21.5 14.8 21.5 13.2C21.5 10.8 24 7 24 7Z"
      fill="#FF5A00"
    />
  </svg>
);

export const TacoIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 15C3 8.373 8.373 3 15 3h6v6c0 6.627-5.373 12-12 12H3v-6Z" />
    <circle cx="10" cy="11" r="1" fill="currentColor" />
    <circle cx="14" cy="14" r="1" fill="currentColor" />
    <circle cx="15" cy="8" r="1" fill="currentColor" />
  </svg>
);

export const PizzaIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2L2 20h20L12 2z" />
    <circle cx="12" cy="11" r="1.5" fill="currentColor" />
    <circle cx="9" cy="16" r="1.5" fill="currentColor" />
    <circle cx="15" cy="16" r="1.5" fill="currentColor" />
    <path d="M4 17.5c2.5-1 5.5-1 8 0 2.5-1 5.5-1 8 0" strokeWidth="1.5" />
  </svg>
);

export const BurgerIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 11h16a8 8 0 0 0-16 0Z" />
    <path d="M4 15h16" />
    <path d="M5 19h14a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" />
    <path d="M6 13c1.5 1 3.5 1 5 0 1.5 1 3.5 1 5 0 1.5 1 2 1 2 1" strokeWidth="1.5" />
  </svg>
);

export const WingsIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 4c3.5 0 6 2.5 6 6 0 4.5-5 9.5-10 11-2-1-4-3-4-5 0-3 3-5 5-5 1 0 1.5-.5 1.5-1.5 0-2.5-1-4-2-4.5C12.5 4.5 13.8 4 15 4Z" />
    <circle cx="16" cy="9" r="1.5" fill="currentColor" />
  </svg>
);

export const UtensilsIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2v6a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V2" />
    <path d="M15 11v11" />
    <path d="M6 2v20" />
    <path d="M9 2c0 3-3 4-3 7v13" />
  </svg>
);

export const SushiRollIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" strokeDasharray="2 2" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
  </svg>
);

export const FishIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 16s9-15 20-4c-11 11-20-4-20-4Z" />
    <path d="M22 12c-4 3-7 1-7-1s3-4 7-1" />
    <circle cx="6" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const PepperIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 4c2-2 5-2 7 0" />
    <path d="M18 7c3 4 1 11-4 14-6 4-11 0-11-7 0-4.5 3-9 8-9 2.5 0 5 1 7 2Z" />
  </svg>
);

export const CheeseIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 14l18-8v12H3z" />
    <path d="M3 14c0 3 3 5 8 5s10-2 10-5" />
    <circle cx="8" cy="15" r="1" fill="currentColor" />
    <circle cx="14" cy="14" r="1.5" fill="currentColor" />
  </svg>
);

export const AvocadoIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2C7 2 4 8 4 14c0 5 3.5 8 8 8s8-3 8-8c0-6-3-12-8-12Z" />
    <circle cx="12" cy="14" r="3.5" />
  </svg>
);

export const WhatsAppIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
