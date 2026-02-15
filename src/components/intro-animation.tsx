import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

export function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"logo" | "expand" | "done">("logo");

  useEffect(() => {
    const expandDelay = isMobile ? 350 : 600;
    const doneDelay = isMobile ? 600 : 1000;
    const t1 = setTimeout(() => setPhase("expand"), expandDelay);
    const t2 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, doneDelay);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]"
        >
          {/* Ambient glow behind logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.15, scale: 1.5 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute h-64 w-64 rounded-full bg-teal-glow blur-[100px]"
          />

          {/* Logo container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={
              phase === "logo"
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 1.5 }
            }
            transition={{
              duration: phase === "logo" ? 0.8 : 0.6,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="relative z-10 flex items-center gap-1"
          >
            {/* Logo icon */}
            <motion.div
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-primary/30 bg-teal-primary/10"
            >
              <span className="font-display text-2xl font-bold text-teal-glow">E</span>
            </motion.div>

            {/* Text */}
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="font-display text-4xl font-bold text-white"
            >
              B<span className="text-teal-glow">.</span>
            </motion.span>
          </motion.div>

          {/* Loading line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.6, ease: "easeInOut", delay: 0.3 }}
            className="absolute bottom-1/3 h-px w-32 origin-left bg-gradient-to-r from-transparent via-teal-glow/50 to-transparent"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
