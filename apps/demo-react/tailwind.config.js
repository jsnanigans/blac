/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background-color) / <alpha-value>)',
        foreground: 'rgb(var(--foreground-color) / <alpha-value>)',
        primary: 'rgb(var(--primary-color) / <alpha-value>)',
        'primary-hover': 'rgb(var(--primary-hover-color) / <alpha-value>)',
        secondary: 'rgb(var(--secondary-color) / <alpha-value>)',
        'secondary-hover': 'rgb(var(--secondary-hover-color) / <alpha-value>)',
        accent: 'rgb(var(--accent-color) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover-color) / <alpha-value>)',
        muted: 'rgb(var(--muted-color) / <alpha-value>)',
        border: 'rgb(var(--border-color) / <alpha-value>)',
        card: 'rgb(var(--card-color) / <alpha-value>)',
        'card-foreground': 'rgb(var(--card-foreground-color) / <alpha-value>)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInFromLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInFromTop: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideInFromBottom: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideInRight: 'slideInFromRight 0.3s ease-in-out',
        slideInLeft: 'slideInFromLeft 0.3s ease-in-out',
        slideInTop: 'slideInFromTop 0.3s ease-in-out',
        slideInBottom: 'slideInFromBottom 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
};
