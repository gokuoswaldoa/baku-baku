import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'orange' | 'red' | 'neutral' | 'success';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'orange',
  className = ''
}) => {
  const variantStyles = {
    orange: 'bg-baku-orange/15 text-baku-orange border-baku-orange/30',
    red: 'bg-baku-red/15 text-baku-red border-baku-red/30',
    neutral: 'bg-neutral-800 text-baku-ivory border-baku-border',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
