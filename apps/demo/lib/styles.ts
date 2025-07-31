// Global Font
export const FONT_FAMILY_SANS =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// New Color Palette
export const COLOR_BACKGROUND_LIGHT = '#F7F9FA'; // Very light gray, almost white
export const COLOR_BACKGROUND_SECTION = '#FFFFFF'; // White for cards/sections
export const COLOR_TEXT_PRIMARY = '#2C3E50'; // Dark, slightly desaturated blue/gray
export const COLOR_TEXT_SECONDARY = '#566573'; // Medium gray for secondary text
export const COLOR_PRIMARY_ACCENT = '#3498DB'; // A calm, friendly blue
export const COLOR_PRIMARY_ACCENT_HOVER = '#2980B9'; // Darker blue for hover
export const COLOR_SECONDARY_ACCENT = '#EAECEE'; // Light gray for borders, subtle backgrounds
export const COLOR_DESTRUCTIVE = '#E74C3C'; // A clear red for destructive actions
export const COLOR_DESTRUCTIVE_HOVER = '#C0392B'; // Darker red for hover
export const COLOR_DISABLED = '#BDC3C7'; // Light gray for disabled states
export const COLOR_TEXT_ON_PRIMARY = '#FFFFFF'; // White text on primary accent color
export const COLOR_TEXT_ON_DESTRUCTIVE = '#FFFFFF'; // White text on destructive color
export const COLOR_CODE_BACKGROUND = '#ECF0F1'; // Light gray for code blocks
export const COLOR_CODE_TEXT = '#2C3E50'; // Dark text for code

export const APP_CONTAINER_STYLE = {
  fontFamily: FONT_FAMILY_SANS,
  backgroundColor: COLOR_BACKGROUND_LIGHT,
  color: COLOR_TEXT_PRIMARY,
  padding: '20px',
  minHeight: '100vh',
  lineHeight: '1.6',
};

export const HEADER_STYLE = {
  backgroundColor: COLOR_PRIMARY_ACCENT,
  color: COLOR_TEXT_ON_PRIMARY,
  padding: '15px 20px',
  marginBottom: '30px',
  textAlign: 'center' as const,
  fontSize: '1.5em',
  fontWeight: 'bold' as const,
  borderRadius: '4px',
};

export const SECTION_STYLE = {
  backgroundColor: COLOR_BACKGROUND_SECTION,
  padding: '20px',
  marginBottom: '25px',
  border: `1px solid ${COLOR_SECONDARY_ACCENT}`,
  borderRadius: '6px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
};

export const BUTTON_BASE_STYLE = {
  // Renamed from BUTTON_STYLE to avoid conflict with component prop
  fontFamily: FONT_FAMILY_SANS,
  padding: '10px 18px',
  border: '1px solid transparent',
  borderRadius: '4px',
  cursor: 'pointer',
  margin: '4px',
  fontWeight: '500' as const,
  fontSize: '0.95em',
  textAlign: 'center' as const,
  transition:
    'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
  textTransform: 'none' as const, // Removed uppercase
  letterSpacing: 'normal' as const, // Removed letter spacing
};

export const BUTTON_FOCUS_STYLE = {
  outline: `2px solid ${COLOR_PRIMARY_ACCENT}`,
  outlineOffset: '2px',
};

export const BUTTON_DISABLED_STYLE = {
  backgroundColor: COLOR_DISABLED,
  color: `${COLOR_TEXT_SECONDARY}99`, // Slightly transparent secondary text
  cursor: 'not-allowed',
  borderColor: COLOR_DISABLED,
};

export const CODE_BLOCK_STYLE = {
  fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
  backgroundColor: COLOR_CODE_BACKGROUND,
  color: COLOR_CODE_TEXT,
  padding: '10px 15px',
  border: `1px solid ${COLOR_SECONDARY_ACCENT}`,
  borderRadius: '4px',
  whiteSpace: 'pre-wrap' as const,
  wordWrap: 'break-word' as const,
  fontSize: '0.9em',
  lineHeight: '1.5',
};

export const LINK_STYLE = {
  color: COLOR_PRIMARY_ACCENT,
  textDecoration: 'none',
  fontWeight: '500' as const,
};

LINK_STYLE[':hover'] = {
  // Example for pseudo-class if using a CSS-in-JS lib that supports it
  textDecoration: 'underline',
};

export const FOOTER_STYLE = {
  fontFamily: FONT_FAMILY_SANS,
  marginTop: '40px',
  padding: '20px',
  textAlign: 'center' as const,
  borderTop: `1px solid ${COLOR_SECONDARY_ACCENT}`,
  fontSize: '0.9em',
  color: COLOR_TEXT_SECONDARY,
};

export const LABEL_STYLE = {
  fontFamily: FONT_FAMILY_SANS,
  color: COLOR_TEXT_PRIMARY,
  fontSize: '0.9em',
  fontWeight: '500' as const,
  display: 'block',
  marginBottom: '6px',
};

export const INPUT_STYLE = {
  fontFamily: FONT_FAMILY_SANS,
  padding: '10px 12px',
  margin: '4px 0',
  border: `1px solid ${COLOR_SECONDARY_ACCENT}`,
  borderRadius: '4px',
  backgroundColor: COLOR_BACKGROUND_SECTION,
  color: COLOR_TEXT_PRIMARY,
  fontSize: '0.95em',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  width: '100%', // Make inputs take full width by default
  boxSizing: 'border-box' as const,
};

export const INPUT_FOCUS_STYLE = {
  borderColor: COLOR_PRIMARY_ACCENT,
  boxShadow: `0 0 0 2px ${COLOR_PRIMARY_ACCENT}40`, // Subtle glow
};

export const INPUT_DISABLED_STYLE = {
  backgroundColor: COLOR_SECONDARY_ACCENT,
  borderColor: COLOR_SECONDARY_ACCENT,
  color: COLOR_TEXT_SECONDARY,
  cursor: 'not-allowed',
};

export const DEMO_COMPONENT_CONTAINER_STYLE = {
  margin: '15px 0 10px 0',
  padding: '15px',
  border: `1px solid ${COLOR_SECONDARY_ACCENT}`,
  borderRadius: '4px',
  backgroundColor: COLOR_BACKGROUND_SECTION, // Consistent with section backgrounds
};

// Clean up old LCARS constants
export const FONT_LCARS_INSPIRED = FONT_FAMILY_SANS; // Replace with new default
export const LCARS_BACKGROUND_DARK = COLOR_BACKGROUND_LIGHT;
export const LCARS_BACKGROUND_SECTION = COLOR_BACKGROUND_SECTION;
export const LCARS_BACKGROUND_DEMO_TINT = COLOR_BACKGROUND_SECTION;
export const LCARS_TEXT_LIGHT = COLOR_TEXT_PRIMARY; // This might need context, assuming for on dark
export const LCARS_TEXT_DARK = COLOR_TEXT_PRIMARY; // Assuming for on light
export const LCARS_ORANGE = COLOR_PRIMARY_ACCENT;
export const LCARS_BLUE = COLOR_PRIMARY_ACCENT; // Consolidate accents if possible or define new semantic names
export const LCARS_PURPLE = '#9B59B6'; // Example secondary accent if needed, or remove
export const LCARS_PEACH = '#FDEBD0'; // Example tertiary accent, or remove
export const LCARS_RED_ACCENT = COLOR_DESTRUCTIVE;

// Legacy button styles just map to new base for now, Button.tsx will handle variants.
export const BUTTON_STYLE = BUTTON_BASE_STYLE;
export const BUTTON_HOVER_STYLE = {}; // Will be handled by Button.tsx variants
