import * as React from 'react';
import { LABEL_STYLE } from '../../lib/styles';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <label
        className={className}
        style={{ ...LABEL_STYLE, ...style }}
        ref={ref}
        {...props}
      />
    );
  },
);
Label.displayName = 'Label';

export { Label };
