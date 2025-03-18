/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media', // Use 'media' to respect the OS preference
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        'primary-hover': '#2563eb',
        secondary: '#ec4899',
        'secondary-hover': '#db2777',
        accent: '#8b5cf6',
        'accent-hover': '#7c3aed',
        background: '#f9fafb',
        foreground: '#1f2937',
        card: '#ffffff',
        'card-foreground': '#1f2937',
        border: '#e5e7eb',
        input: '#e5e7eb',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};
