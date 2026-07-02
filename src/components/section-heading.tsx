import { motion } from "framer-motion";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const wordVariant = {
  hidden: { y: "115%" },
  visible: {
    y: "0%",
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

/** One heading line whose words reveal from behind a mask. */
function MaskLine({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className="inline-flex flex-wrap">
      {text.split(" ").map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="mr-[0.25em] inline-block overflow-hidden py-[0.08em]"
        >
          <motion.span variants={wordVariant} className={`inline-block ${className}`}>
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/**
 * Shared section heading with a signature entrance: a mono label with a
 * blinking caret, a per-word mask reveal for the title, and a drawing underline.
 */
export function SectionHeading({
  label,
  top,
  bottom,
}: {
  label: string;
  top: string;
  bottom: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={container}
    >
      {/* Mono label + blinking caret */}
      <motion.p
        variants={{
          hidden: { opacity: 0, x: -8 },
          visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
        }}
        className="flex items-center gap-1.5 font-mono text-xs font-medium text-teal-glow sm:text-sm"
      >
        {label}
        <motion.span
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="inline-block h-3.5 w-[3px] bg-teal-glow/80"
        />
      </motion.p>

      {/* Title — per-word mask reveal */}
      <h2 className="mt-2 font-display text-3xl font-bold leading-[1.05] text-white sm:mt-3 sm:text-4xl md:text-5xl">
        <MaskLine text={top} />
        <br />
        <MaskLine text={bottom} className="gradient-text" />
      </h2>

      {/* Drawing underline */}
      <motion.div
        variants={{
          hidden: { scaleX: 0 },
          visible: {
            scaleX: 1,
            transition: { duration: 0.7, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
          },
        }}
        className="mt-4 h-0.5 w-16 origin-left rounded-full bg-gradient-to-r from-teal-glow to-transparent"
      />
    </motion.div>
  );
}
