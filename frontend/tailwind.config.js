/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF7A21', // Primary orange
          hover: '#E56715',
          light: '#FFE3CF',
        },
        amber: {
          DEFAULT: '#FFB422', // Secondary accent
          hover: '#E59F12',
          light: '#FFF1D6',
        },
        ink: {
          DEFAULT: '#1E1E1E', // Text, dark buttons, dark chips
          secondary: '#4A4A4A',
          muted: '#757575',
          border: 'rgba(30, 30, 30, 0.12)',
        },
        cream: {
          DEFAULT: '#F3E6D3', // Background
          light: '#FBF5EE',
          dark: '#E7D5BF',
        },
        'soft-orange': '#FFE3CF',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '24px',
        pill: '9999px',
      },
      boxShadow: {
        frosted: '0 8px 32px 0 rgba(255, 122, 33, 0.08)',
        'frosted-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.04)',
        'frosted-hover': '0 12px 36px 0 rgba(255, 122, 33, 0.14)',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
};
