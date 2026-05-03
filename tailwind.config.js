/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#EBF5FF', 100: '#DBEAFE', 500: '#3B82F6', 600: '#1A56DB', 700: '#1447BF', 900: '#042C53' }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}
