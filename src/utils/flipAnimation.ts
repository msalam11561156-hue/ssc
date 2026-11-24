export const FAST_SCREEN_FLIP = {
  initial: { opacity: 0, rotateY: 65, scale: 0.96 },
  animate: {
    opacity: 1,
    rotateY: 0,
    scale: 1,
    transition: { duration: 0.16, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    rotateY: -65,
    scale: 0.96,
    transition: { duration: 0.11, ease: 'easeIn' as const },
  },
  style: { transformPerspective: 1200 },
};

export const FAST_MODAL_FLIP = {
  initial: { opacity: 0, rotateX: 45, scale: 0.95 },
  animate: {
    opacity: 1,
    rotateX: 0,
    scale: 1,
    transition: { duration: 0.15, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    rotateX: -45,
    scale: 0.95,
    transition: { duration: 0.1, ease: 'easeIn' as const },
  },
  style: { transformPerspective: 1000 },
};

export const FAST_BACKDROP_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};
