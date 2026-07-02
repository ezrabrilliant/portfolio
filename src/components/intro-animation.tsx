import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const NAME = "EZRA BRILLIANT";

export function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"enter" | "exit" | "done">("enter");

  useEffect(() => {
    // Accessibility: reduced-motion users get a near-instant intro.
    if (prefersReducedMotion) {
      const t = setTimeout(() => {
        setPhase("done");
        onComplete();
      }, 400);
      return () => clearTimeout(t);
    }

    // ~3.5s total: entrance + name reveal (~1.5s), progress fills (~2.8s),
    // then a cinematic exit (0.6s). Nothing gets cut off.
    const total = isMobile ? 3200 : 3500;
    const exitAt = total - 600;
    const t1 = setTimeout(() => setPhase("exit"), exitAt);
    const t2 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, total);
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
          animate={
            phase === "exit"
              ? { opacity: 0, scale: 1.08, filter: "blur(10px)" }
              : { opacity: 1, scale: 1, filter: "blur(0px)" }
          }
          transition={{ duration: 0.6, ease: [0.7, 0, 0.84, 0] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505]"
        >
          {/* Ambient glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 0.18, scale: 1.6 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute h-72 w-72 rounded-full bg-teal-glow blur-[120px]"
          />

          {/* Logo mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -25 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 13, delay: 0.1 }}
            className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-teal-primary/40 bg-teal-primary/10"
          >
            <span className="font-display text-3xl font-bold text-teal-glow">E</span>
            {/* Shimmer sweep across the mark */}
            <motion.div
              initial={{ x: "-130%" }}
              animate={{ x: "130%" }}
              transition={{ duration: 0.9, delay: 1.1, ease: "easeInOut" }}
              className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            />
          </motion.div>

          {/* Wordmark — per-letter reveal */}
          <div className="z-10 flex">
            {NAME.split("").map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: ch === " " ? 0 : 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.45 + i * 0.045,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="font-display text-lg font-semibold tracking-[0.25em] text-white sm:text-2xl"
              >
                {ch === " " ? " " : ch}
              </motion.span>
            ))}
            {/* Accent dot */}
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.45 + NAME.length * 0.045, ease: "backOut" }}
              className="font-display text-lg font-semibold text-teal-glow sm:text-2xl"
            >
              .
            </motion.span>
          </div>

          {/* Progress line */}
          <div className="relative z-10 mt-8 h-px w-40 overflow-hidden bg-white/10 sm:w-48">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 2.0, delay: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="h-full w-full origin-left bg-gradient-to-r from-teal-primary via-teal-glow to-teal-light"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
