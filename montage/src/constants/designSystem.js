export const globalTransition = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] };

export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: globalTransition },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2, ease: "easeIn" } }
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: globalTransition }
};

export const AMOLED = {
  bg: '#000000',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  accent: '#6366f1',
  accentGlow: 'rgba(99,102,241,0.35)',
};
