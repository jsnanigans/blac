import { useState, useEffect } from 'react';

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  // Initialize theme state from localStorage or system preference
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    
    // Update state
    setIsDark(!isDark);
    
    // Update DOM
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative h-8 w-16 rounded-full p-1 transition-all duration-500 ease-in-out
        ${isDark
          ? 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.4)]'
          : 'bg-gradient-to-r from-sky-100 to-indigo-100 border border-sky-300/50 shadow-[0_0_10px_rgba(186,230,253,0.4)]'
        }
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`
          absolute inset-0.5 flex items-center ${isDark ? 'justify-end' : 'justify-start'}
          transition-all duration-500 ease-in-out
        `}
      >
        <span
          className={`
            h-6 w-6 rounded-full flex items-center justify-center transform transition-all duration-500
            ${isDark
              ? 'bg-gradient-to-br from-indigo-400 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.7)]'
              : 'bg-gradient-to-br from-amber-300 to-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
            }
          `}
        >
          {isDark ? (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle; 