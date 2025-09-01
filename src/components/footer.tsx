"use client"

import { motion } from "framer-motion"
import { ArrowUp, Heart, Code2, Sparkles, Github, Linkedin, Instagram } from "lucide-react"
import { portfolioConfig } from "@/config/portfolio"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'github':
        return Github
      case 'linkedin':
        return Linkedin
      case 'instagram':
        return Instagram
      default:
        return Code2
    }
  }

  const getSocialColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'github':
        return 'hover:text-gray-700 dark:hover:text-gray-300'
      case 'linkedin':
        return 'hover:text-blue-600'
      case 'instagram':
        return 'hover:text-pink-600'
      default:
        return 'hover:text-primary'
    }
  }

  return (
    <footer className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <motion.div 
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)"
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Glass border top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4 py-8 relative">
        <div className="max-w-4xl mx-auto">
          {/* Compact footer content */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            {/* Left section - Branding with animation */}
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.div 
                className="relative"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <Code2 className="h-5 w-5 text-white" />
                </div>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl blur opacity-50"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div>
                <motion.h3 
                  className="text-lg font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"
                  whileHover={{ scale: 1.05 }}
                >
                  {portfolioConfig.personal.name}
                </motion.h3>
                <p className="text-xs text-muted-foreground">Full Stack Developer</p>
              </div>
            </motion.div>

            {/* Center section - Quick navigation pills */}
            <motion.div 
              className="flex flex-wrap items-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              {[
                { name: "About", href: "#about" },
                { name: "Projects", href: "#projects" },
                { name: "Experience", href: "#experience" },
                { name: "Contact", href: "#contact" },
              ].map((link, index) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary bg-card/50 hover:bg-primary/10 rounded-full border border-border/30 hover:border-primary/30 transition-all duration-300 backdrop-blur-sm"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={(e) => {
                    e.preventDefault()
                    const element = document.querySelector(link.href)
                    element?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  {link.name}
                </motion.a>
              ))}
            </motion.div>

            {/* Right section - Social links and back to top */}
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {/* Social links with proper icons */}
              <div className="flex items-center gap-2">
                {Object.entries(portfolioConfig.social).map(([platform, url], index) => {
                  const IconComponent = getSocialIcon(platform)
                  const colorClass = getSocialColor(platform)
                  
                  return (
                    <motion.a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-8 h-8 bg-card/50 hover:bg-primary/20 border border-border/30 hover:border-primary/50 rounded-lg flex items-center justify-center text-muted-foreground ${colorClass} transition-all duration-300 backdrop-blur-sm`}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                    >
                      <IconComponent className="h-4 w-4" />
                    </motion.a>
                  )
                })}
              </div>

              {/* Separator */}
              <div className="w-px h-6 bg-border/50" />

              {/* Back to top button - more compact */}
              <motion.button
                onClick={scrollToTop}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-all duration-300 group backdrop-blur-sm border border-primary/20"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="hidden sm:inline">Top</span>
                <motion.div
                  className="group-hover:-translate-y-0.5 transition-transform"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.3 }}
                >
                  <ArrowUp className="h-3 w-3" />
                </motion.div>
              </motion.button>
            </motion.div>
          </div>

          {/* Elegant divider with sparkle effect */}
          <motion.div 
            className="relative mb-4"
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <motion.div 
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>

          {/* Compact bottom section */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            {/* Copyright with heart */}
            <motion.div 
              className="flex items-center gap-2 text-muted-foreground"
              whileHover={{ scale: 1.02 }}
            >
              <span>© {currentYear}</span>
              <span className="text-primary font-semibold">{portfolioConfig.personal.name}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Built with
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Heart className="h-3 w-3 text-red-500 fill-current" />
                </motion.div>
                & passion
              </span>
            </motion.div>

            {/* Fun tagline */}
            <motion.div 
              className="flex items-center gap-1 text-muted-foreground"
              whileHover={{ scale: 1.02 }}
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Building tomorrow's web</span>
              <Sparkles className="h-3 w-3 text-secondary" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </footer>
  )
}
