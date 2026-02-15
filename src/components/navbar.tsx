import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, FileDown } from "lucide-react";
import { config } from "@/config/portfolio";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "py-3"
          : "py-5"
      )}
    >
      {/* Frosted nav container */}
      <nav
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-6 transition-all duration-500",
          scrolled
            ? "mx-4 border border-white/[0.06] bg-[#0a0a0a]/70 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:mx-auto"
            : "bg-transparent"
        )}
      >
        {/* Logo */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick("#home");
          }}
          className="group flex items-center gap-1.5 font-display text-lg font-semibold tracking-tight text-white transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-primary/20 transition-all group-hover:bg-teal-primary/30 group-hover:shadow-[0_0_15px_rgba(0,165,207,0.2)]">
            <span className="font-display text-sm font-bold text-teal-glow">E</span>
          </div>
          <span>
            Ezra Brilliant<span className="text-teal-glow">.</span>
          </span>
        </a>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-0.5 md:flex">
          {config.navigation.map((item) => {
            const isActive = activeSection === item.href.slice(1);
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }}
                  className={cn(
                    "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "text-teal-glow"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {item.name}
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-lg bg-teal-primary/10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </a>
              </li>
            );
          })}
          <li className="ml-3">
            <a
              href={config.personal.resume}
              target="_blank"
              rel="noopener noreferrer"
              className="shine group inline-flex items-center gap-1.5 rounded-xl border border-teal-primary/30 bg-teal-primary/5 px-4 py-2 text-sm font-medium text-teal-glow transition-all hover:border-teal-primary/60 hover:bg-teal-primary/10 hover:shadow-[0_0_20px_rgba(0,165,207,0.1)]"
            >
              <FileDown size={14} className="transition-transform group-hover:-translate-y-0.5" />
              Resume
            </a>
          </li>
        </ul>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-border-subtle p-2 text-text-secondary transition-all hover:border-teal-primary/30 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mx-4 mt-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/90 shadow-2xl backdrop-blur-xl md:hidden"
          >
            <ul className="flex flex-col p-3">
              {config.navigation.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.href);
                    }}
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition-all",
                      activeSection === item.href.slice(1)
                        ? "bg-teal-primary/10 text-teal-glow"
                        : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                    )}
                  >
                    {item.name}
                  </a>
                </li>
              ))}
              <li className="mt-2 border-t border-border-subtle pt-2">
                <a
                  href={config.personal.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-teal-glow transition-colors hover:bg-teal-primary/10"
                >
                  <FileDown size={14} />
                  Download Resume
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
