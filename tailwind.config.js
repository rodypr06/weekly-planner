/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './public/**/*.{html,js}',
    './src/**/*.{html,js}'
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif']
      },
      colors: {
        'glass': {
          'light': 'rgba(255, 255, 255, 0.05)',
          'medium': 'rgba(255, 255, 255, 0.1)',
          'dark': 'rgba(0, 0, 0, 0.2)'
        }
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '20px'
      }
    }
  },
  plugins: []
}