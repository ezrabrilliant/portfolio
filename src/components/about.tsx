import { motion, useInView } from "framer-motion";
import { MapPin, GraduationCap, Code2, Coffee, Rocket, GitBranch } from "lucide-react";
import { config } from "@/config/portfolio";
import { avatarUrl } from "@/lib/cloudinary";
import { useRef, useEffect, useState } from "react";
import { GitHubActivity } from "@/components/github-activity";
import { SectionHeading } from "@/components/section-heading";

function AnimatedCounter({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);
  const numericValue = parseInt(value.replace(/\D/g, ""));
  const suffix = value.replace(/[\d]/g, "");

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * numericValue));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isInView, numericValue]);

  return (
    <div ref={ref}>
      <p className="font-display text-2xl font-bold text-teal-glow sm:text-3xl">
        {count}{suffix}
      </p>
      <p className="mt-0.5 text-xs font-medium text-text-muted">{label}</p>
    </div>
  );
}

const icons = [Code2, Coffee, Rocket, GitBranch];

export function About() {
  return (
    <section id="about" className="relative py-16 px-4 sm:py-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-10 sm:mb-14">
          <SectionHeading label="// about me" top="Building digital" bottom="experiences" />
        </div>

        {/* Main layout: 2 columns on desktop */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left column: Avatar card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="glass-card group relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl p-4 sm:p-5 lg:mx-0 lg:max-w-none"
          >
            <div className="relative mb-4">
              <img
                src={avatarUrl(400)}
                alt={config.personal.fullName}
                width={320}
                height={320}
                loading="lazy"
                className="w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute -inset-1 -z-10 rounded-xl bg-gradient-to-br from-teal-glow/20 to-transparent blur-lg" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <MapPin size={14} className="text-teal-glow" />
                {config.personal.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <GraduationCap size={14} className="text-teal-glow" />
                {config.education[1].institution}
              </div>
            </div>
          </motion.div>

          {/* Right column: Bio + Stats */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Bio card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="glass-card rounded-2xl p-5 sm:p-6"
            >
              <p className="text-sm leading-relaxed text-text-secondary sm:text-base lg:text-lg">
                {config.about.introduction}
              </p>
              <div className="mt-4 space-y-2.5">
                {config.about.highlights.map((text, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-xl border border-border-subtle/50 bg-surface/30 p-3"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-primary/20">
                      <span className="text-[10px] font-bold text-teal-glow">{i + 1}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-muted">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Stats row - 4 items in a single row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {config.about.stats.map((stat, i) => {
                const Icon = icons[i] || Code2;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
                    className="glass-card shine group relative overflow-hidden rounded-xl p-4"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-teal-primary/10 text-teal-glow transition-all group-hover:bg-teal-primary/20 group-hover:shadow-[0_0_12px_rgba(0,165,207,0.15)]">
                      <Icon size={15} />
                    </div>
                    <AnimatedCounter value={stat.value} label={stat.label} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Marquee tech strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-6 overflow-hidden rounded-2xl border border-border-subtle/50 bg-surface/30 py-3 sm:mt-8"
        >
          <div className="marquee-track">
            {[...config.skills.flatMap(s => s.items), ...config.skills.flatMap(s => s.items)].map((skill, i) => (
              <span
                key={`${skill}-${i}`}
                className="whitespace-nowrap text-sm font-medium text-text-muted/50"
              >
                {skill}
                <span className="mx-4 text-teal-primary/30">&#x2022;</span>
              </span>
            ))}
          </div>
        </motion.div>

        {/* GitHub Activity */}
        <GitHubActivity />
      </div>
    </section>
  );
}
