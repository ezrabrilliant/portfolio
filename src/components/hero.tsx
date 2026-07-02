import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, Github, Linkedin, Instagram, Terminal, Sparkles } from "lucide-react";
import { config } from "@/config/portfolio";
import { avatarUrl } from "@/lib/cloudinary";
import { projectImageUrl } from "@/lib/cloudinary";
import { useTypewriter } from "@/hooks/useTypewriter";
import { MagneticButton } from "@/components/magnetic-button";

const socialLinks = [
  { icon: Github, href: config.social.github, label: "GitHub" },
  { icon: Linkedin, href: config.social.linkedin, label: "LinkedIn" },
  { icon: Instagram, href: config.social.instagram, label: "Instagram" },
];

const roles = [
  "Mobile App Developer",
  "Full-Stack Engineer",
  "Business Intelligence",
  "React Developer",
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function Hero() {
  const { text } = useTypewriter({
    words: roles,
    typeSpeed: 80,
    deleteSpeed: 50,
    delayBetweenWords: 2500,
  });

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const parallaxOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const featuredProject = config.projects[0];

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative flex min-h-screen items-center justify-center px-4 pt-20 sm:px-6"
    >
      {/* Top gradient fade */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050505] to-transparent" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ y: parallaxY, opacity: parallaxOpacity }}
        className="relative z-10 mx-auto max-w-5xl"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
          {/* Left content */}
          <div>
            {/* Status badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface/60 px-4 py-1.5 text-xs font-medium text-text-muted backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Available for opportunities
              </span>
            </motion.div>

            {/* Greeting + Name */}
            <motion.div variants={itemVariants}>
              <p className="mb-2 font-mono text-sm text-teal-glow/80">
                <Terminal size={14} className="mr-1.5 inline" />
                hello world, I'm
              </p>
              <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
                {config.personal.name}
                <br />
                <span className="gradient-text-animated">
                  {config.personal.lastName}
                </span>
              </h1>
            </motion.div>

            {/* Typewriter role */}
            <motion.div variants={itemVariants} className="mt-4 sm:mt-5">
              <p className="font-display text-sm font-medium text-text-secondary sm:text-xl md:text-2xl">
                {config.personal.title}
              </p>
              <p className="mt-1 font-display text-base font-semibold text-teal-glow sm:mt-2 sm:text-xl md:text-2xl">
                {text}
                <span className="typewriter-cursor" />
              </p>
            </motion.div>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="mt-4 max-w-xl text-sm leading-relaxed text-text-muted sm:mt-5 sm:text-base"
            >
              {config.personal.description}
            </motion.p>

            {/* CTA Buttons - Magnetic */}
            <motion.div
              variants={itemVariants}
              className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8 sm:gap-4"
            >
              <MagneticButton
                as="a"
                strength={0.25}
                href="#projects"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-teal-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal-light hover:shadow-[0_0_30px_rgba(0,165,207,0.2)] sm:px-7 sm:py-3"
              >
                <Sparkles size={16} className="transition-transform group-hover:rotate-12" />
                View Projects
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </MagneticButton>

              <MagneticButton
                as="a"
                strength={0.25}
                href="#contact"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="glow-border rounded-xl border border-border-default bg-surface/50 px-5 py-2.5 text-sm font-semibold text-text-secondary backdrop-blur-sm transition-all hover:border-teal-primary/40 hover:text-white hover:shadow-[0_0_20px_rgba(0,165,207,0.1)] sm:px-7 sm:py-3"
              >
                Get In Touch
              </MagneticButton>
            </motion.div>

            {/* Social links */}
            <motion.div
              variants={itemVariants}
              className="mt-6 flex items-center gap-3 sm:mt-8"
            >
              <span className="text-xs text-text-muted">Find me on</span>
              <div className="h-px w-8 bg-border-default" />
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="group rounded-xl border border-border-subtle p-2.5 text-text-muted transition-all hover:border-teal-primary/30 hover:text-teal-glow hover:shadow-[0_0_15px_rgba(0,165,207,0.1)]"
                >
                  <Icon size={18} className="transition-transform group-hover:scale-110" />
                </a>
              ))}
            </motion.div>
          </div>

          {/* Right - Avatar with decorative elements */}
          <motion.div
            variants={itemVariants}
            className="relative hidden lg:flex lg:justify-center"
          >
            <div className="relative">
              {/* Glow behind avatar */}
              <div className="absolute inset-0 -m-8 rounded-full bg-teal-glow/10 blur-3xl" />

              {/* Avatar */}
              <div className="pulse-ring relative h-64 w-64 rounded-full">
                <img
                  src={avatarUrl(320)}
                  alt={config.personal.fullName}
                  width={256}
                  height={256}
                  loading="eager"
                  fetchPriority="high"
                  className="relative z-10 h-64 w-64 rounded-full border-2 border-teal-primary/20 object-cover shadow-2xl"
                />
              </div>

              {/* Floating badge - Projects count */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-4 top-4 z-20 rounded-xl border border-border-subtle bg-surface-raised/90 px-3 py-2 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-primary/20">
                    <span className="text-sm font-bold text-teal-glow">15+</span>
                  </div>
                  <span className="text-xs text-text-muted">Projects</span>
                </div>
              </motion.div>

              {/* Floating badge - Top Graduate */}
              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-8 bottom-16 z-20 rounded-xl border border-border-subtle bg-surface-raised/90 px-3 py-2 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                    <span className="text-sm font-bold text-emerald-400">A+</span>
                  </div>
                  <span className="text-xs text-text-muted">Distinction Graduate</span>
                </div>
              </motion.div>

              {/* Floating badge - Featured Project (new) */}
              <motion.div
                animate={{ y: [-3, 7, -3] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -right-12 z-20 w-52 overflow-hidden rounded-xl border border-border-subtle bg-surface-raised/90 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5 p-2">
                  <img
                    src={projectImageUrl(featuredProject.image.replace("/projects/", ""), 100)}
                    alt={featuredProject.title}
                    className="h-10 w-14 rounded-lg object-cover"
                    loading="eager"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] text-teal-glow">Latest Project</p>
                    <p className="truncate text-xs font-medium text-white">{featuredProject.title}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.a
          href="#about"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" });
          }}
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-text-muted transition-colors hover:text-teal-glow"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <ArrowDown size={16} />
        </motion.a>
      </motion.div>
    </section>
  );
}
