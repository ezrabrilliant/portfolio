import { motion } from "framer-motion";
import { Briefcase, GraduationCap, MapPin, Award, Calendar, ChevronRight } from "lucide-react";
import { config } from "@/config/portfolio";
import { formatDate } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export function Experience() {
  return (
    <section id="experience" className="relative py-16 px-4 sm:py-28 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-16"
        >
          <p className="font-mono text-xs font-medium text-teal-glow sm:text-sm">
            {'// experience & education'}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white sm:mt-3 sm:text-4xl md:text-5xl">
            My journey
            <br />
            <span className="gradient-text">so far</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Animated vertical line */}
          <div className="absolute left-[23px] top-0 bottom-0 w-px md:left-1/2 md:-translate-x-px">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full w-full origin-top bg-gradient-to-b from-teal-glow/40 via-teal-primary/20 to-transparent"
            />
          </div>

          {/* Work Experience */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {config.experience.map((exp, i) => (
              <motion.div
                key={exp.id}
                variants={fadeUp}
                custom={i}
                className="group relative mb-8 pl-12 sm:mb-12 md:mb-16 md:pl-0"
              >
                {/* Timeline dot */}
                <div className="absolute left-[14px] top-2 z-10 md:left-1/2 md:-translate-x-1/2">
                  <div className="relative flex h-[18px] w-[18px] items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-teal-glow/20 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="h-2.5 w-2.5 rounded-full border-2 border-teal-glow bg-[#050505] sm:h-3 sm:w-3" />
                  </div>
                </div>

                {/* Card */}
                <div
                  className={`md:w-[calc(50%-3rem)] ${
                    i % 2 === 0 ? "md:mr-auto" : "md:ml-auto"
                  }`}
                >
                    <div className="glass-card group relative overflow-hidden rounded-2xl p-5 sm:p-6">
                    {/* Subtle top gradient */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-glow/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                    <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-primary/15 sm:h-8 sm:w-8">
                        <Briefcase size={12} className="text-teal-glow sm:hidden" />
                        <Briefcase size={14} className="hidden text-teal-glow sm:block" />
                      </div>
                      <span className="rounded-full bg-teal-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-teal-glow sm:px-3 sm:text-xs">
                        {exp.type}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-text-muted sm:ml-auto sm:text-xs">
                        <Calendar size={11} />
                        {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-white">
                      {exp.title}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {exp.company}
                    </p>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                      <MapPin size={12} className="text-teal-glow/60" />
                      {exp.location}
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-text-muted">
                      {exp.description}
                    </p>

                    {/* Tech tags */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {exp.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md border border-border-subtle/60 bg-surface/40 px-2.5 py-0.5 text-[11px] font-medium text-text-muted"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Achievements */}
                    <ul className="mt-5 space-y-2">
                      {exp.achievements.slice(0, 3).map((a, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-xs leading-relaxed text-text-muted"
                        >
                          <ChevronRight size={12} className="mt-0.5 shrink-0 text-teal-glow/60" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Education */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {config.education.map((edu, i) => (
              <motion.div
                key={edu.id}
                variants={fadeUp}
                custom={i}
                className="group relative mb-8 pl-12 sm:mb-12 md:mb-16 md:pl-0"
              >
                {/* Timeline dot */}
                <div className="absolute left-[14px] top-2 z-10 md:left-1/2 md:-translate-x-1/2">
                  <div className="h-2.5 w-2.5 rounded-full border-2 border-teal-light bg-[#050505] sm:h-3 sm:w-3" />
                </div>

                {/* Card */}
                <div
                  className={`md:w-[calc(50%-3rem)] ${
                    (config.experience.length + i) % 2 === 0
                      ? "md:mr-auto"
                      : "md:ml-auto"
                  }`}
                >
                  <div className="glass-card overflow-hidden rounded-2xl p-5 sm:p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-light/15 sm:h-8 sm:w-8">
                        <GraduationCap size={12} className="text-teal-light sm:hidden" />
                        <GraduationCap size={14} className="hidden text-teal-light sm:block" />
                      </div>
                      <span className="rounded-full bg-teal-light/10 px-2.5 py-0.5 text-[11px] font-medium text-teal-light sm:px-3 sm:text-xs">
                        Education
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-text-muted sm:ml-auto sm:text-xs">
                        <Calendar size={11} />
                        {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-white">
                      {edu.degree}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {edu.institution}
                    </p>

                    <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-teal-light/60" />
                        {edu.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Award size={12} className="text-teal-glow" />
                        <span className="font-semibold text-teal-glow">{edu.gpa}</span>
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-text-muted">
                      {edu.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
