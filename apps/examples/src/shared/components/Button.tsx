import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'ghost';
  size?: 'small' | 'default' | 'large';
  children: ReactNode;
}

/**
 * Simple, functional button component.
 * No animations or transitions - just clean, accessible buttons.
 */
export function Button({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variantClass = variant !== 'default' ? variant : '';
  const sizeClass = size !== 'default' ? size : '';
  const classes = [variantClass, sizeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
