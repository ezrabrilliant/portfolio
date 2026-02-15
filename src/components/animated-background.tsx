import { useMotionValue, motion, useSpring } from "framer-motion";
import { useEffect } from "react";

export function AnimatedBackground() {
  const mouseX = useMotionValue(-600);
  const mouseY = useMotionValue(-600);

  // Smooth spring for spotlight follow
  const springX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  return (
    <>
      {/* Aurora blobs */}
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
      </div>

      {/* Grid pattern */}
      <div className="grid-pattern" aria-hidden="true" />

      {/* Mouse-follow spotlight - uses motion values directly, no React re-renders */}
      <motion.div
        className="spotlight hidden md:block"
        style={{ left: springX, top: springY }}
        aria-hidden="true"
      />
    </>
  );
}
