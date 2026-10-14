/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B0F1A',
          800: '#111827',
          700: '#1E293B',
          600: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-indigo': '0 0 30px rgba(129, 140, 248, 0.15)',
        'glow-coral': '0 0 30px rgba(249, 112, 102, 0.15)',
        'glow-emerald': '0 0 30px rgba(52, 211, 153, 0.15)',
        'soft': '0 8px 30px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
