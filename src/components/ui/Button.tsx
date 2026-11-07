import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none cursor-pointer";
  
  const variantStyles = {
    primary: "bg-gradient-to-r from-baku-orange to-baku-red text-white shadow-lg shadow-baku-orange/25 hover:shadow-baku-orange/40 hover:brightness-110",
    secondary: "bg-baku-card text-baku-ivory border border-baku-border hover:border-baku-orange/50 hover:bg-neutral-800",
    outline: "border-2 border-baku-orange text-baku-orange hover:bg-baku-orange hover:text-white",
    danger: "bg-baku-red text-white hover:bg-red-700 shadow-lg shadow-baku-red/25"
  };

  const sizeStyles = {
    sm: "text-xs px-3.5 py-2 gap-1.5",
    md: "text-sm px-5 py-3 gap-2",
    lg: "text-base px-6 py-4 gap-2.5 font-extrabold"
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
