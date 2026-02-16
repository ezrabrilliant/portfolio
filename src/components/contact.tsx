import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import emailjs from "@emailjs/browser";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Github,
  Linkedin,
  Instagram,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import { config } from "@/config/portfolio";
import { cn } from "@/lib/utils";
import { CopyToClipboard } from "@/components/copy-to-clipboard";

const contactInfo = [
  { icon: Mail, label: "Email", value: config.personal.email, href: `mailto:${config.personal.email}` },
  { icon: Phone, label: "Phone", value: config.personal.phone, href: `tel:${config.personal.phone.replace(/[^+\d]/g, "")}` },
  { icon: MapPin, label: "Location", value: config.personal.location, href: null },
];

const socialLinks = [
  { icon: Github, href: config.social.github, label: "GitHub" },
  { icon: Linkedin, href: config.social.linkedin, label: "LinkedIn" },
  { icon: Instagram, href: config.social.instagram, label: "Instagram" },
];

type FormStatus = "idle" | "sending" | "success" | "error";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      setStatus("error");
      return;
    }

    setStatus("sending");

    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
        publicKey
      );
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setStatus("idle"), 5000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <section id="contact" className="relative py-16 px-4 sm:py-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-16"
        >
          <p className="font-mono text-xs font-medium text-teal-glow sm:text-sm">
            {'// let\'s connect'}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white sm:mt-3 sm:text-4xl md:text-5xl">
            Get in
            <br />
            <span className="gradient-text">touch</span>
          </h2>
          <p className="mt-3 max-w-lg text-sm text-text-muted sm:mt-4 sm:text-base">
            Have a project in mind or want to collaborate? Feel free to reach out.
            I'm always open to interesting conversations.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_380px]">
          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="glass-card space-y-4 rounded-2xl p-5 sm:space-y-5 sm:p-6 md:p-8"
          >
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare size={18} className="text-teal-glow" />
              <h3 className="font-display text-base font-semibold text-white">Send a message</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
              <FloatingInput
                label="Name"
                type="text"
                value={formData.name}
                onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
                focused={focused}
                onFocus={setFocused}
                required
              />
              <FloatingInput
                label="Email"
                type="email"
                value={formData.email}
                onChange={(v) => setFormData((p) => ({ ...p, email: v }))}
                focused={focused}
                onFocus={setFocused}
                required
              />
            </div>
            <FloatingInput
              label="Subject"
              type="text"
              value={formData.subject}
              onChange={(v) => setFormData((p) => ({ ...p, subject: v }))}
              focused={focused}
              onFocus={setFocused}
              required
            />
            <div className="relative">
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, message: e.target.value }))
                }
                onFocus={() => setFocused("message")}
                onBlur={() => setFocused(null)}
                rows={5}
                required
                aria-label="Message"
                className={cn(
                  "w-full resize-none rounded-xl border bg-surface/60 px-4 pt-6 pb-3 text-sm text-text-primary transition-all duration-300 focus:outline-none",
                  focused === "message"
                    ? "border-teal-glow/40 shadow-[0_0_15px_rgba(0,165,207,0.08)]"
                    : "border-border-default"
                )}
                placeholder=" "
              />
              <label
                htmlFor="message"
                className={cn(
                  "pointer-events-none absolute left-4 transition-all duration-200",
                  focused === "message" || formData.message
                    ? "top-2 text-[10px] text-teal-glow"
                    : "top-4 text-sm text-text-muted"
                )}
              >
                Message
              </label>
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className={cn(
                "group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-7 py-3 text-sm font-semibold transition-all",
                status === "sending"
                  ? "cursor-wait bg-teal-primary/50 text-white/60"
                  : "bg-teal-primary text-white hover:bg-teal-light hover:shadow-[0_0_30px_rgba(0,165,207,0.2)]"
              )}
            >
              {status === "sending" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  Send Message
                </>
              )}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>

            {/* Status messages */}
            {status === "success" && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-emerald-400"
              >
                <CheckCircle2 size={16} />
                Message sent successfully!
              </motion.p>
            )}
            {status === "error" && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-red-400"
              >
                <XCircle size={16} />
                Failed to send. Please try again or email directly.
              </motion.p>
            )}
          </motion.form>

          {/* Contact info sidebar */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex flex-col gap-3 sm:gap-4"
          >
            {/* Contact cards */}
            {contactInfo.map(({ icon: Icon, label, value, href }) => (
              <div
                key={label}
                className="glass-card group flex items-center gap-3 rounded-2xl p-4 transition-all sm:gap-4 sm:p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-primary/10 transition-all group-hover:bg-teal-primary/20 group-hover:shadow-[0_0_15px_rgba(0,165,207,0.1)] sm:h-11 sm:w-11">
                  <Icon size={16} className="text-teal-glow sm:hidden" />
                  <Icon size={18} className="hidden text-teal-glow sm:block" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">{label}</p>
                  {label === "Email" ? (
                    <CopyToClipboard text={value}>
                      <span className="truncate">{value}</span>
                    </CopyToClipboard>
                  ) : href ? (
                    <a
                      href={href}
                      className="group/link flex items-center gap-1 text-sm font-medium text-text-primary transition-colors hover:text-teal-glow"
                    >
                      <span className="truncate">{value}</span>
                      <ArrowUpRight size={12} className="shrink-0 opacity-0 transition-all group-hover/link:opacity-100" />
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-text-primary">
                      {value}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Social links */}
            <div className="glass-card rounded-2xl p-4 sm:p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-text-muted">
                Find me on
              </p>
              <div className="flex gap-3">
                {socialLinks.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="group flex h-11 w-11 items-center justify-center rounded-xl border border-border-subtle transition-all hover:border-teal-primary/30 hover:shadow-[0_0_15px_rgba(0,165,207,0.1)]"
                  >
                    <Icon size={18} className="text-text-muted transition-all group-hover:scale-110 group-hover:text-teal-glow" />
                  </a>
                ))}
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}

function FloatingInput({
  label,
  type,
  value,
  onChange,
  required,
  focused,
  onFocus,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  focused: string | null;
  onFocus: (field: string | null) => void;
}) {
  const fieldId = label.toLowerCase();
  const isActive = focused === fieldId || value;

  return (
    <div className="relative">
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => onFocus(fieldId)}
        onBlur={() => onFocus(null)}
        required={required}
        aria-label={label}
        className={cn(
          "w-full rounded-xl border bg-surface/60 px-4 pt-5 pb-2 text-sm text-text-primary transition-all duration-300 focus:outline-none",
          focused === fieldId
            ? "border-teal-glow/40 shadow-[0_0_15px_rgba(0,165,207,0.08)]"
            : "border-border-default"
        )}
        placeholder=" "
      />
      <label
        htmlFor={fieldId}
        className={cn(
          "pointer-events-none absolute left-4 transition-all duration-200",
          isActive
            ? "top-1.5 text-[10px] text-teal-glow"
            : "top-3.5 text-sm text-text-muted"
        )}
      >
        {label}
      </label>
    </div>
  );
}
