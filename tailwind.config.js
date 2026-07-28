/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#22C55E',
          medium: '#EAB308',
          high: '#F97316',
          critical: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' }
    }
  },
  plugins: []
};
