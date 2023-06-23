/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        'display': 'Syne Mono, monospace',
        'body': 'Roboto, sans-serif',
      }
    },
  },
  plugins: [],
  safelist: [
    {
      pattern: /bg-(red|green)-(500)/,
    },
    {
      pattern: /text-(red|green)-(500)/,
    }
  ]
}

