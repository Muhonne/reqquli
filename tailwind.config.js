/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx}",
    "./src/client/index.html",
  ],
  theme: {
    extend: {
      // Only extend what we actually use
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
      },
      colors: {
        // Define only the colors used in design-system.css
        'ink': '#1a1a1a',
        'paper': '#fafafa',
        'canvas': '#ffffff',
        'border': '#e5e5e5',
      },
    },
  },
  corePlugins: {
    // Disable unused features for smaller bundle
    backdropBlur: false,
    backdropBrightness: false,
    backdropContrast: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropOpacity: false,
    backdropSaturate: false,
    backdropSepia: false,
    backgroundImage: false,
    backgroundOpacity: false,
    blur: false,
    brightness: false,
    contrast: false,
    dropShadow: false,
    grayscale: false,
    hueRotate: false,
    invert: false,
    saturate: false,
    sepia: false,
    filter: false,
    mixBlendMode: false,
    backgroundBlendMode: false,
  },
}