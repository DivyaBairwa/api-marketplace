/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.05)",
        glow: "0 0 0 4px rgba(99, 102, 241, 0.15)",
      },
      backgroundImage: {
        "auth-grad":
          "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.18), transparent 40%), radial-gradient(circle at 80% 60%, rgba(168,85,247,0.15), transparent 45%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        "hero-grad":
          "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)",
      },
    },
  },
  plugins: [],
};
