import { Link, LinkProps } from '@tanstack/react-router';
import { FC, ReactNode } from 'react';

interface PrettyLinkProps extends LinkProps {
  variant?: 'cyan' | 'fuchsia' | 'blue' | 'pink';
  children: ReactNode;
  className?: string;
}

const PrettyLink: FC<PrettyLinkProps> = ({
  variant = 'cyan',
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-3 py-1.5 rounded-md inline-flex items-center transition-all duration-300 hover-scale border shadow-sm';
  
  const variantClasses = {
    cyan: 'btn-neon-cyan border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 shadow-cyan-500/20',
    fuchsia: 'btn-neon-fuchsia border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 shadow-fuchsia-500/20',
    blue: 'btn-neon-blue border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 shadow-blue-500/20',
    pink: 'btn-neon-pink border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 shadow-pink-500/20',
  };

  return (
    <Link
      {...props}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </Link>
  );
};

export default PrettyLink;
