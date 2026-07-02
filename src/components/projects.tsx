import { useState, useRef, useCallback, useEffect, type MouseEvent } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { ExternalLink, Github, ChevronLeft, ChevronRight, ArrowUpRight, Star } from "lucide-react";
import { config } from "@/config/portfolio";
import { projectImageUrl } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { CardSpotlight } from "@/components/card-spotlight";
import { SectionHeading } from "@/components/section-heading";

const ITEMS_PER_PAGE = 4;

/** Most-recent year mentioned in a date string ("2024 – 2025" -> 2025). */
function projectYear(date: string): number {
  const years = date.match(/\d{4}/g);
  return years ? Math.max(...years.map(Number)) : 0;
}

/** Pointer-driven 3D tilt for a card (spring-smoothed, resets on leave). */
function useTilt(max = 8) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 150, damping: 15 });
  const rotateY = useSpring(ry, { stiffness: 150, damping: 15 });
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max);
    rx.set(-py * max);
  };
  const onMouseLeave = () => {
    rx.set(0);
    ry.set(0);
  };
  return { rotateX, rotateY, onMouseMove, onMouseLeave };
}

export function Projects() {
  const [page, setPage] = useState(0);
  // Sort newest-first by year; Array.sort is stable so same-year projects
  // keep their config order (keeps POS Monosuko pinned as the featured one).
  const projects = [...config.projects].sort(
    (a, b) => projectYear(b.date) - projectYear(a.date)
  );
  const featuredProject = projects[0];
  const remainingProjects = projects.slice(1);
  const totalPages = Math.ceil(remainingProjects.length / ITEMS_PER_PAGE);
  const displayed = remainingProjects.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  // Desktop swipe support
  const dragX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const threshold = 50;
    if (info.offset.x < -threshold || info.velocity.x < -500) {
      setPage((p) => Math.min(totalPages - 1, p + 1));
    } else if (info.offset.x > threshold || info.velocity.x > 500) {
      setPage((p) => Math.max(0, p - 1));
    }
  };

  // Mobile carousel state
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [mobileIndex, setMobileIndex] = useState(0);

  const updateMobileIndex = useCallback(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 12
      : 1;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setMobileIndex(Math.min(idx, projects.length - 1));
  }, [projects.length]);

  useEffect(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateMobileIndex, { passive: true });
    return () => el.removeEventListener("scroll", updateMobileIndex);
  }, [updateMobileIndex]);

  const scrollMobileTo = (index: number) => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 12
      : 300;
    el.scrollTo({ left: index * cardWidth, behavior: "smooth" });
  };

  return (
    <section id="projects" className="relative py-16 px-4 sm:py-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading label="// featured work" top="Things I've" bottom="built" />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle text-text-muted transition-all hover:border-teal-primary/30 hover:text-white disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className="p-2"
                    aria-label={`Page ${i + 1}`}
                  >
                    <span
                      className={cn(
                        "block h-2 rounded-full transition-all duration-300",
                        page === i
                          ? "w-8 bg-teal-glow"
                          : "w-2 bg-border-default hover:bg-text-muted"
                      )}
                    />
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page === totalPages - 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle text-text-muted transition-all hover:border-teal-primary/30 hover:text-white disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Featured Project - Desktop only (full width horizontal card) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="mb-8 hidden sm:block"
        >
          <FeaturedProjectCard project={featuredProject} />
        </motion.div>

        {/* Mobile: horizontal carousel with ALL projects (featured first) */}
        <div className="sm:hidden">
          <div
            ref={mobileScrollRef}
            className="snap-carousel gap-3"
          >
            {projects.map((project, i) => (
              <div key={project.id} className="w-[85vw] min-w-[280px] max-w-[360px] shrink-0 first:ml-[7.5vw] last:mr-[7.5vw]">
                <ProjectCard project={project} index={i} />
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {projects.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollMobileTo(i)}
                className="p-2"
                aria-label={`Project ${i + 1}`}
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    mobileIndex === i
                      ? "w-6 bg-teal-glow"
                      : "w-1.5 bg-border-default"
                  )}
                />
              </button>
            ))}
          </div>

          <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-text-muted/40">
            Swipe to see more
          </p>
        </div>

        {/* Desktop: paginated grid (remaining projects, without featured) */}
        <div ref={containerRef} className="hidden overflow-hidden sm:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              style={{ x: dragX }}
              className="grid cursor-grab gap-5 active:cursor-grabbing sm:grid-cols-2"
            >
              {displayed.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ===== Featured Project Card (Horizontal Full-Width) ===== */
function FeaturedProjectCard({
  project,
}: {
  project: (typeof config.projects)[number];
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <CardSpotlight className="glass-card group rounded-2xl">
      <div className="grid md:grid-cols-[1.2fr_1fr]">
        {/* Image side */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl md:aspect-auto md:rounded-l-2xl md:rounded-tr-none">
          {!imgError ? (
            <img
              src={projectImageUrl(
                project.image.replace("/projects/", ""),
                700
              )}
              alt={project.title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-all duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-gradient-to-br from-surface to-surface-raised">
              <span className="font-display text-2xl font-semibold text-text-muted">
                {project.title}
              </span>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#111111]/80 opacity-0 transition-opacity md:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent md:hidden" />

          {/* Featured badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-lg border border-teal-glow/20 bg-teal-primary/20 px-3 py-1 backdrop-blur-sm">
            <Star size={12} className="text-teal-glow" fill="currentColor" />
            <span className="text-xs font-semibold text-teal-glow">Featured</span>
          </div>
        </div>

        {/* Content side */}
        <div className="flex flex-col justify-center p-5 sm:p-6 md:p-8">
          <span className="mb-2 inline-block text-xs font-medium text-text-muted">
            {project.date}
          </span>
          <h3 className="font-display text-xl font-bold text-white transition-colors group-hover:text-teal-glow sm:text-2xl">
            {project.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            {project.description}
          </p>

          {/* Tech tags */}
          <div className="mt-5 flex flex-wrap gap-2">
            {project.technologies.map((tech) => (
              <span
                key={tech}
                className="rounded-lg border border-border-subtle/60 bg-surface/40 px-3 py-1 text-xs font-medium text-text-secondary"
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:gap-3">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-default bg-surface/50 px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:border-teal-primary/40 hover:text-white sm:justify-start sm:px-5"
              >
                <Github size={16} />
                Source Code
              </a>
            )}
            {project.demo && (
              <a
                href={project.demo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-teal-light hover:shadow-[0_0_20px_rgba(0,165,207,0.2)] sm:justify-start sm:px-5"
              >
                <ExternalLink size={16} />
                Live Demo
              </a>
            )}
          </div>
        </div>
      </div>
    </CardSpotlight>
  );
}

/* ===== Regular Project Card ===== */
function ProjectCard({
  project,
  index,
}: {
  project: (typeof config.projects)[number];
  index: number;
}) {
  const [imgError, setImgError] = useState(false);
  const tilt = useTilt(8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
        transformPerspective: 900,
      }}
    >
      <CardSpotlight className="glass-card group rounded-2xl">
        <article className="overflow-hidden">
          {/* Image */}
          <div className="relative aspect-[16/10] overflow-hidden bg-surface">
            {!imgError ? (
              <motion.img
                initial={{ scale: 1.15 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
                src={projectImageUrl(
                  project.image.replace("/projects/", ""),
                  400
                )}
                srcSet={`${projectImageUrl(project.image.replace("/projects/", ""), 400)} 400w, ${projectImageUrl(project.image.replace("/projects/", ""), 640)} 640w`}
                sizes="(max-width: 640px) 400px, 640px"
                alt={project.title}
                loading="lazy"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover transition-[filter] duration-500 group-hover:brightness-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface to-surface-raised">
                <span className="font-display text-xl font-semibold text-text-muted">
                  {project.title}
                </span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80" />

            {/* Year badge */}
            <span className="absolute top-4 left-4 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-xs font-medium text-text-secondary backdrop-blur-sm">
              {project.date}
            </span>

            {/* Quick action buttons */}
            <div className="absolute top-3 right-3 flex gap-1.5 sm:top-4 sm:right-4 sm:gap-2 sm:opacity-0 sm:transition-all sm:duration-300 sm:group-hover:opacity-100">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${project.title} source code`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-teal-primary/80 hover:shadow-[0_0_15px_rgba(0,165,207,0.3)]"
                >
                  <Github size={16} />
                </a>
              )}
              {project.demo && (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${project.title} live demo`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-teal-primary/80 hover:shadow-[0_0_15px_rgba(0,165,207,0.3)]"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="relative p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-base font-semibold text-white transition-colors group-hover:text-teal-glow sm:text-lg">
                {project.title}
              </h3>
              {(project.demo || project.github) && (
                <a
                  href={project.demo || project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${project.title}`}
                  className="mt-1 shrink-0 text-text-muted transition-all hover:text-teal-glow group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-glow"
                >
                  <ArrowUpRight size={18} />
                </a>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-muted line-clamp-2">
              {project.description}
            </p>

            {/* Tech tags */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.technologies.slice(0, 5).map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-border-subtle/60 bg-surface/40 px-2.5 py-0.5 text-[11px] font-medium text-text-muted transition-colors hover:text-text-secondary"
                >
                  {tech}
                </span>
              ))}
              {project.technologies.length > 5 && (
                <span className="rounded-md border border-border-subtle/60 bg-surface/40 px-2.5 py-0.5 text-[11px] font-medium text-teal-glow/60">
                  +{project.technologies.length - 5}
                </span>
              )}
            </div>
          </div>
        </article>
      </CardSpotlight>
    </motion.div>
  );
}
