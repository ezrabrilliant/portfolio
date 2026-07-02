import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Monitor, Smartphone, Server, CreditCard, BarChart3, Wrench,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { config } from "@/config/portfolio";
import { CardSpotlight } from "@/components/card-spotlight";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, typeof Monitor> = {
  Frontend: Monitor,
  Mobile: Smartphone,
  Backend: Server,
  "Payment & APIs": CreditCard,
  "Data & BI": BarChart3,
  Tools: Wrench,
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const tagsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.15 } },
};

const tagVariant = {
  hidden: { opacity: 0, scale: 0.8, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 24 } as const,
  },
};

function SkillCard({ group }: { group: (typeof config.skills)[number] }) {
  const Icon = categoryIcons[group.category] || Wrench;
  return (
    <CardSpotlight className="glass-card rounded-2xl">
      <div className="relative p-5 sm:p-6">
        {/* Subtle corner glow on hover */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-glow/0 blur-3xl transition-all duration-500 group-hover:bg-teal-glow/5" />

        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-primary/10 transition-all group-hover:bg-teal-primary/20 group-hover:shadow-[0_0_20px_rgba(0,165,207,0.1)] sm:h-10 sm:w-10">
            <Icon size={16} className="text-teal-glow sm:hidden" />
            <Icon size={18} className="hidden text-teal-glow sm:block" />
          </div>
          <h3 className="font-display text-sm font-semibold text-white sm:text-base">
            {group.category}
          </h3>
        </div>

        <motion.div
          variants={tagsContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="flex flex-wrap gap-1.5 sm:gap-2"
        >
          {group.items.map((skill) => (
            <motion.span
              key={skill}
              variants={tagVariant}
              whileHover={{ scale: 1.08, y: -2 }}
              className="cursor-default rounded-lg border border-border-subtle/60 bg-surface/40 px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-teal-primary/30 hover:bg-teal-primary/5 hover:text-teal-glow sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {skill}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </CardSpotlight>
  );
}

export function Skills() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Calculate active index based on scroll position
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 16 // 16 = gap
      : 1;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, config.skills.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState]);

  const scrollTo = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 16
      : 300;
    el.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 16
      : 300;
    el.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
  };

  return (
    <section id="skills" className="relative py-16 px-4 sm:py-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-10 sm:mb-16">
          <SectionHeading label="// skills & tools" top="My tech" bottom="arsenal" />
        </div>

        {/* Mobile: Horizontal carousel */}
        <div className="sm:hidden">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
          >
            {/* Carousel container */}
            <div className="relative">
              {/* Left arrow */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollTo("left")}
                  className="absolute -left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-surface-raised/90 text-text-muted shadow-lg backdrop-blur-sm transition-all active:scale-95"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {/* Right arrow */}
              {canScrollRight && (
                <button
                  onClick={() => scrollTo("right")}
                  className="absolute -right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-surface-raised/90 text-text-muted shadow-lg backdrop-blur-sm transition-all active:scale-95"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={16} />
                </button>
              )}

              {/* Scrollable cards */}
              <div
                ref={scrollRef}
                className="snap-carousel"
              >
                {config.skills.map((group) => (
                  <motion.div
                    key={group.category}
                    variants={cardVariants}
                    className="w-[75vw] min-w-[260px] max-w-[320px] first:ml-[12.5vw] last:mr-[12.5vw]"
                  >
                    <SkillCard group={group} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Dot indicators */}
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {config.skills.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToIndex(i)}
                  className="p-2"
                  aria-label={`Go to category ${i + 1}`}
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all duration-300",
                      activeIndex === i
                        ? "w-6 bg-teal-glow"
                        : "w-1.5 bg-border-default"
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Swipe hint */}
            <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-text-muted/40">
              Swipe to explore
            </p>
          </motion.div>
        </div>

        {/* Desktop/Tablet: Grid layout */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
          className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3"
        >
          {config.skills.map((group) => (
            <motion.div key={group.category} variants={cardVariants}>
              <SkillCard group={group} />
            </motion.div>
          ))}
        </motion.div>

        {/* Total skills indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-6 flex justify-center sm:mt-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface/50 px-4 py-2 backdrop-blur-sm sm:gap-3 sm:px-5 sm:py-2.5">
            <div className="flex -space-x-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full border border-[#050505]"
                  style={{
                    backgroundColor: ["#00A5CF", "#007A8C", "#004E64"][i],
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] text-text-muted sm:text-xs">
              <span className="font-semibold text-text-secondary">
                {config.skills.reduce((acc, s) => acc + s.items.length, 0)}
              </span>{" "}
              technologies across{" "}
              <span className="font-semibold text-text-secondary">
                {config.skills.length}
              </span>{" "}
              categories
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
