/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        'status-success': '#22c55e',
        'status-redirect': '#3b82f6',
        'status-client-error': '#f97316',
        'status-server-error': '#ef4444',
      },
    },
  },
  plugins: [],
}
