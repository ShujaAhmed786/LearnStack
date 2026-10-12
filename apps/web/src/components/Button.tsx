import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = size === 'sm' ? 'px-3 py-1.5 text-12' : 'px-5 py-2.5 text-14';

  const variantStyles = {
    primary: 'bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold shadow-sm',
    secondary: 'bg-surface border border-border text-text hover:bg-surface-hover shadow-sm',
    danger: 'bg-danger text-white hover:opacity-90 font-medium shadow-sm',
    ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-hover',
  }[variant];

  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${widthStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
};
