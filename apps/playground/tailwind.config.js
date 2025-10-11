/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Concept colors for BlaC concepts
        concept: {
          cubit: {
            DEFAULT: '#3b82f6', // blue-500
            light: '#93c5fd',   // blue-300
            dark: '#1e40af',    // blue-800
          },
          bloc: {
            DEFAULT: '#a855f7', // purple-500
            light: '#d8b4fe',   // purple-300
            dark: '#6b21a8',    // purple-800
          },
          event: {
            DEFAULT: '#f97316', // orange-500
            light: '#fdba74',   // orange-300
            dark: '#c2410c',    // orange-800
          },
        },
        // Lifecycle state colors
        lifecycle: {
          active: {
            DEFAULT: '#22c55e', // green-500
            light: '#86efac',   // green-300
            dark: '#15803d',    // green-800
          },
          disposal: {
            DEFAULT: '#eab308', // yellow-500
            light: '#fde047',   // yellow-300
            dark: '#a16207',    // yellow-800
          },
          disposing: {
            DEFAULT: '#f97316', // orange-500
            light: '#fdba74',   // orange-300
            dark: '#c2410c',    // orange-800
          },
          disposed: {
            DEFAULT: '#6b7280', // gray-500
            light: '#d1d5db',   // gray-300
            dark: '#374151',    // gray-800
          },
        },
        // Instance pattern colors
        instance: {
          shared: {
            DEFAULT: '#06b6d4', // cyan-500
            light: '#67e8f9',   // cyan-300
            dark: '#0e7490',    // cyan-800
          },
          isolated: {
            DEFAULT: '#f97316', // orange-500
            light: '#fdba74',   // orange-300
            dark: '#c2410c',    // orange-800
          },
          keepAlive: {
            DEFAULT: '#8b5cf6', // violet-500
            light: '#c4b5fd',   // violet-300
            dark: '#5b21b6',    // violet-800
          },
        },
        // State value type colors
        stateValue: {
          string: {
            DEFAULT: '#22c55e', // green-500
            light: '#86efac',   // green-300
          },
          number: {
            DEFAULT: '#3b82f6', // blue-500
            light: '#93c5fd',   // blue-300
          },
          boolean: {
            DEFAULT: '#a855f7', // purple-500
            light: '#d8b4fe',   // purple-300
          },
          object: {
            DEFAULT: '#eab308', // yellow-500
            light: '#fde047',   // yellow-300
          },
          function: {
            DEFAULT: '#ec4899', // pink-500
            light: '#f9a8d4',   // pink-300
          },
        },
        // Semantic colors for callouts and feedback
        semantic: {
          tip: {
            DEFAULT: '#3b82f6', // blue-500
            light: '#dbeafe',   // blue-100
            dark: '#1e40af',    // blue-800
          },
          warning: {
            DEFAULT: '#eab308', // yellow-500
            light: '#fef9c3',   // yellow-100
            dark: '#a16207',    // yellow-800
          },
          success: {
            DEFAULT: '#22c55e', // green-500
            light: '#dcfce7',   // green-100
            dark: '#15803d',    // green-800
          },
          info: {
            DEFAULT: '#a855f7', // purple-500
            light: '#f3e8ff',   // purple-100
            dark: '#6b21a8',    // purple-800
          },
          danger: {
            DEFAULT: '#ef4444', // red-500
            light: '#fee2e2',   // red-100
            dark: '#b91c1c',    // red-800
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}