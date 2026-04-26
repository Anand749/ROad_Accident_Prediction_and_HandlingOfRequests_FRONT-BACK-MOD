/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#0D1117',
        accentRed: '#FF2D55',
        accentBlue: '#00D4FF',
      },
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 30px rgba(0, 212, 255, 0.35)',
        'glow-red': '0 0 30px rgba(255, 45, 85, 0.45)',
      },
      backgroundImage: {
        'grid-dark':
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-size': '40px 40px',
      },
    },
  },
  plugins: [],
};

