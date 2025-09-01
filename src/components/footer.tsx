"use client"

import { motion } from "framer-motion"
import { Heart, ArrowUp } from "lucide-react"
import { portfolioConfig } from "@/config/portfolio"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="relative bg-card/30 backdrop-blur-sm border-t border-border/50 py-12">
      {/* Background decoration */}
      <motion.div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-32 bg-gradient-to-r from-primary/5 to-primary/10 blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-6xl mx-auto">
          {/* Main footer content */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Left section - Name and description */}
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.h3 
                className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                whileHover={{ scale: 1.05 }}
              >
                {portfolioConfig.personal.name}
              </motion.h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Building exceptional digital experiences with modern technologies and creative design.
              </p>
            </motion.div>

            {/* Center section - Quick links */}
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h4 className="font-semibold">Quick Links</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "About", href: "#about" },
                  { name: "Projects", href: "#projects" },
                  { name: "Experience", href: "#experience" },
                  { name: "Skills", href: "#skills" },
                  { name: "Contact", href: "#contact" },
                ].map((link) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                    whileHover={{ x: 5 }}
                    onClick={(e) => {
                      e.preventDefault()
                      const element = document.querySelector(link.href)
                      element?.scrollIntoView({ behavior: "smooth" })
                    }}
                  >
                    {link.name}
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Right section - Social links */}
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h4 className="font-semibold">Connect</h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(portfolioConfig.social).map(([platform, url]) => (
                  <motion.a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors duration-300"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Divider */}
          <motion.div 
            className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8"
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            viewport={{ once: true }}
          />

          {/* Bottom section */}
          <motion.div 
            className="flex flex-col md:flex-row items-center justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            {/* Copyright */}
            <motion.p 
              className="text-sm text-muted-foreground flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
            >
              © {currentYear} {portfolioConfig.personal.name}. Made with 
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              >
                <Heart className="h-4 w-4 text-red-500 fill-current" />
              </motion.span>
              using React & TypeScript
            </motion.p>

            {/* Back to top button */}
            <motion.button
              onClick={scrollToTop}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all duration-300 group"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Back to top</span>
              <motion.div
                className="group-hover:-translate-y-1 transition-transform"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowUp className="h-4 w-4" />
              </motion.div>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </footer>
  )
}
