/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,jsx,mdx}",
    "./src/components/**/*.{js,jsx,mdx}",
    "./src/screens/**/*.{js,jsx,mdx}",
    "./src/lib/**/*.{js,jsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
