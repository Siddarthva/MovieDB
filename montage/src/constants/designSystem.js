// Motion presets and breakpoints. Colour/spacing/type tokens live in styles/globals.css as CSS variables.

export const BREAKPOINTS = { sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1560 };

export const globalTransition = { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] };

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: globalTransition },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
