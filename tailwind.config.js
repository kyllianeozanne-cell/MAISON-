/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        noir: '#10100F',
        anthracite: '#191918',
        brun: '#29231E',
        creme: '#E8DFD0',
        champagne: '#C5AD83',
        ivoire: '#F5F1E9',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Jost"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        maison: '14px',
      },
      boxShadow: {
        depth: '0 18px 40px -18px rgba(0,0,0,0.7), 0 1px 0 0 rgba(232,223,208,0.04) inset',
        gold: '0 0 0 1px rgba(197,173,131,0.35)',
      },
      letterSpacing: {
        caps: '0.22em',
      },
    },
  },
  plugins: [],
}
