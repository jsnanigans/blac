import * as React from 'react';
import {
  INPUT_DISABLED_STYLE,
  INPUT_FOCUS_STYLE,
  INPUT_STYLE,
} from '../../lib/styles';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, style, type, disabled, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    let combinedStyle: React.CSSProperties = {
      ...INPUT_STYLE,
    };

    if (disabled) {
      combinedStyle = { ...combinedStyle, ...INPUT_DISABLED_STYLE };
    } else {
      if (isFocused) {
        combinedStyle = { ...combinedStyle, ...INPUT_FOCUS_STYLE };
      }
    }

    // Merge with any inline styles passed via the style prop last
    combinedStyle = { ...combinedStyle, ...style };

    return (
      <input
        type={type}
        className={className}
        style={combinedStyle}
        ref={ref}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
