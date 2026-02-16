import { Github, Linkedin, Instagram, ArrowUp, Heart } from "lucide-react";
import { config } from "@/config/portfolio";
import { motion } from "framer-motion";

const socials = [
  { icon: Github, href: config.social.github, label: "GitHub" },
  { icon: Linkedin, href: config.social.linkedin, label: "LinkedIn" },
  { icon: Instagram, href: config.social.instagram, label: "Instagram" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border-subtle/50 px-6 py-12">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-teal-glow/20 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          {/* Left - branding */}
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <span className="font-display text-lg font-semibold text-white">
              Ezra Brilliant<span className="text-teal-glow">.</span>
            </span>
          </div>

          {/* Center - copyright */}
          <p className="text-sm text-text-muted">
            &copy; {new Date().getFullYear()} {config.personal.fullName}
          </p>

          {/* Right - socials + back to top */}
          <div className="flex items-center gap-4">
            {socials.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="group text-text-muted transition-colors hover:text-teal-glow"
              >
                <Icon size={16} className="transition-transform group-hover:scale-110" />
              </a>
            ))}
            <div className="ml-2 h-4 w-px bg-border-subtle" />
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle text-text-muted transition-all hover:border-teal-primary/30 hover:text-teal-glow hover:shadow-[0_0_15px_rgba(0,165,207,0.1)]"
            >
              <ArrowUp size={14} />
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  );
}
