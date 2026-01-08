import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyles = "rounded-3xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl border-4";
  
  const variants = {
    primary: "bg-kid-blue border-white text-white hover:bg-blue-400",
    secondary: "bg-kid-yellow border-white text-yellow-900 hover:bg-yellow-300",
    accent: "bg-kid-pink border-white text-white hover:bg-pink-500",
    outline: "bg-white border-kid-blue text-kid-blue hover:bg-blue-50"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-lg",
    lg: "px-8 py-4 text-xl",
    xl: "px-10 py-6 text-2xl w-full"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="text-current">{icon}</span>}
      {children}
    </button>
  );
};
