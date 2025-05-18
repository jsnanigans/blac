import * as React from 'react';
import {
  BUTTON_BASE_STYLE,
  BUTTON_DISABLED_STYLE,
  BUTTON_FOCUS_STYLE,
  COLOR_DESTRUCTIVE,
  COLOR_DESTRUCTIVE_HOVER,
  COLOR_PRIMARY_ACCENT,
  COLOR_PRIMARY_ACCENT_HOVER,
  COLOR_SECONDARY_ACCENT,
  COLOR_TEXT_ON_DESTRUCTIVE,
  COLOR_TEXT_ON_PRIMARY,
  COLOR_TEXT_PRIMARY
} from '../../lib/styles';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  // size prop is used in demos but its implementation is not part of this focused fix
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, style, disabled, variant = 'default', ...props }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    let variantStyle: React.CSSProperties = {};
    let variantHoverStyle: React.CSSProperties = {};

    let combinedStyle: React.CSSProperties = { ...BUTTON_BASE_STYLE };

    switch (variant) {
      case 'secondary':
        variantStyle = { backgroundColor: COLOR_SECONDARY_ACCENT, color: COLOR_TEXT_PRIMARY, borderColor: COLOR_SECONDARY_ACCENT };
        variantHoverStyle = { backgroundColor: '#D5DBDB', borderColor: '#D5DBDB' };
        break;
      case 'outline':
        variantStyle = { backgroundColor: 'transparent', color: COLOR_PRIMARY_ACCENT, borderColor: COLOR_PRIMARY_ACCENT };
        variantHoverStyle = { backgroundColor: `${COLOR_PRIMARY_ACCENT}1A`, color: COLOR_PRIMARY_ACCENT_HOVER, borderColor: COLOR_PRIMARY_ACCENT_HOVER };
        break;
      case 'destructive':
        variantStyle = { backgroundColor: COLOR_DESTRUCTIVE, color: COLOR_TEXT_ON_DESTRUCTIVE, borderColor: COLOR_DESTRUCTIVE };
        variantHoverStyle = { backgroundColor: COLOR_DESTRUCTIVE_HOVER, borderColor: COLOR_DESTRUCTIVE_HOVER };
        break;
      case 'ghost':
        variantStyle = { backgroundColor: 'transparent', color: COLOR_PRIMARY_ACCENT, border: '1px solid transparent' };
        variantHoverStyle = { backgroundColor: `${COLOR_SECONDARY_ACCENT}99` , color: COLOR_PRIMARY_ACCENT_HOVER };
        break;
      case 'default':
      default:
        variantStyle = { backgroundColor: COLOR_PRIMARY_ACCENT, color: COLOR_TEXT_ON_PRIMARY, borderColor: COLOR_PRIMARY_ACCENT };
        variantHoverStyle = { backgroundColor: COLOR_PRIMARY_ACCENT_HOVER, borderColor: COLOR_PRIMARY_ACCENT_HOVER };
        break;
    }
    
    combinedStyle = { ...combinedStyle, ...variantStyle };

    if (disabled) {
      combinedStyle = { ...combinedStyle, ...BUTTON_DISABLED_STYLE };
    } else {
      if (isHovered) {
        combinedStyle = { ...combinedStyle, ...variantHoverStyle };
      }
      if (isFocused) {
        combinedStyle = { ...combinedStyle, ...BUTTON_FOCUS_STYLE };
      }
    }

    combinedStyle = { ...combinedStyle, ...style };

    return (
      <button
        className={className}
        style={combinedStyle}
        ref={ref}
        disabled={disabled}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
