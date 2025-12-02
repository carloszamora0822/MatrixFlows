/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vestaboard: {
          red: '#dc2626',
          orange: '#ea580c',
          yellow: '#ca8a04',
          green: '#16a34a',
          blue: '#2563eb',
          violet: '#7c3aed',
          white: '#ffffff',
          black: '#000000'
        }
      },
      gridTemplateColumns: {
        '22': 'repeat(22, minmax(0, 1fr))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
