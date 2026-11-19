'use client';

/**
 * Shared layout and motion of the bumper scenes (Phase 16). Movement is only translate/scale on top of
 * opacity. With reduced motion (`BumperReducedMotion`) every variant is a plain fade, so the scenes only
 * cross-fade.
 */
import { motion, type Variants } from 'framer-motion';
import { createContext, useContext, type ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

export const sceneVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, staggerChildren: 0.12, delayChildren: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

/** Reduced motion (set by JelajahBumper): opacity only, shorter fades, no stagger. */
export const BumperReducedMotion = createContext(false);

const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

/** The item and pop variants, or plain fades with reduced motion. */
export function useSceneVariants() {
  const reduced = useContext(BumperReducedMotion);
  return reduced ? { item: fadeOnly, pop: fadeOnly } : { item: itemVariants, pop: popVariants };
}

interface SceneLayoutProps {
  kicker: string;
  title: ReactNode;
  text?: ReactNode;
  /** Visual above the title (logo, photos, map, icon). */
  visual?: ReactNode;
  /** Below the text (number tiles, buttons). */
  children?: ReactNode;
}

export function SceneLayout({ kicker, title, text, visual, children }: SceneLayoutProps) {
  const { item, pop } = useSceneVariants();
  return (
    <motion.div
      variants={sceneVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="mx-auto flex w-full max-w-md flex-col items-center px-6 text-center md:max-w-xl"
    >
      {visual && (
        <motion.div variants={pop} className="mb-6 w-full">
          {visual}
        </motion.div>
      )}
      <motion.p
        variants={item}
        className="text-xs font-bold uppercase tracking-[0.2em] text-primary md:text-sm"
      >
        {kicker}
      </motion.p>
      <motion.h2
        variants={item}
        className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl"
      >
        {title}
      </motion.h2>
      {text && (
        <motion.p variants={item} className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">
          {text}
        </motion.p>
      )}
      {children && (
        <motion.div variants={item} className="mt-6 w-full">
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}
