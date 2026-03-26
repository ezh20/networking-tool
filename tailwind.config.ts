import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#fafafa',
        surface: '#ffffff',
        border: '#e5e5e5',
        muted: '#737373',
        primary: '#171717',
        accent: '#2563eb',
      },
    },
  },
  plugins: [],
};

export default config;
