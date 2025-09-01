"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowDown, Download, Github, Linkedin, Mail, Phone, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { portfolioConfig } from "@/config/portfolio"
import { parseHighlightedText } from '@/components/ui/highlighted-text'

export default function Hero() {
  const [typedText, setTypedText] = useState("")
  const [typingComplete, setTypingComplete] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const titles = [
    portfolioConfig.personal.title,
    "UI/UX Enthusiast", 
    "Problem Solver",
    "Tech Innovator"
  ]

  useEffect(() => {
    const currentTitle = titles[currentIndex]
    
    if (typedText.length < currentTitle.length) {
      setTypingComplete(false)
      const timeout = setTimeout(() => {
        setTypedText(currentTitle.slice(0, typedText.length + 1))
      }, 100)
      return () => clearTimeout(timeout)
    } else {
      setTypingComplete(true)
      const timeout = setTimeout(() => {
        // Erase and move to next title
        if (typedText.length > 0) {
          setTypedText(typedText.slice(0, -1))
        } else {
          setCurrentIndex((prev) => (prev + 1) % titles.length)
          setTypingComplete(false)
        }
      }, typingComplete ? 2000 : 50) // Pause when complete, then erase faster
      return () => clearTimeout(timeout)
    }
  }, [typedText, currentIndex, typingComplete, titles])

  const nameWords = portfolioConfig.personal.fullName.split(" ")

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const wordVariants = {
    hidden: { opacity: 0, y: 50, rotateX: -90 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
  }

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        damping: 15,
        stiffness: 200,
        delay: 1.5,
      },
    },
  }

  const socialVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 15,
        stiffness: 200,
        delay: 2,
      },
    },
  }

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Floating orbs for extra visual interest */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
          x: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-purple-500/10 blur-2xl"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-4xl"
        >
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4"
          >
            <span className="text-lg text-muted-foreground font-medium">👋 Hello, I'm</span>
          </motion.div>

          {/* Name with word-by-word animation */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <motion.div variants={containerVariants} className="flex flex-wrap justify-center gap-3">
              {nameWords.map((word, index) => (
                <motion.span
                  key={index}
                  variants={wordVariants}
                  className={`inline-block ${
                    index === nameWords.length - 1 
                      ? "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-300% animate-pulse"
                      : "text-foreground"
                  }`}
                  whileHover={{ 
                    scale: 1.05,
                    transition: { type: "spring", stiffness: 400, damping: 10 }
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.div>
          </h1>

          {/* Animated subtitle with typewriter effect */}
          <div className="mb-6 h-16 flex items-center justify-center">
            <motion.h2 
              className="text-2xl md:text-3xl font-semibold text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              {typedText}
              {!typingComplete && <span className="animate-pulse text-primary">|</span>}
            </motion.h2>
          </div>

          {/* Description */}
          <motion.p 
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            {parseHighlightedText(portfolioConfig.personal.description)}
          </motion.p>

          {/* Action buttons */}
          <motion.div 
            className="flex flex-wrap justify-center gap-4 mb-12"
            variants={buttonVariants}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                <a href="#contact" className="flex items-center">
                  <Mail className="mr-2 h-5 w-5" />
                  Get In Touch
                </a>
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="rounded-full border-2 hover:bg-primary/10">
                <a href="#projects" className="flex items-center">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  View Projects
                </a>
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="secondary" className="rounded-full shadow-md">
                <a 
                  href={portfolioConfig.personal.resume} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Resume
                </a>
              </Button>
            </motion.div>
          </motion.div>

          {/* Social links */}
          <motion.div 
            className="flex justify-center space-x-6 mb-12"
            variants={socialVariants}
          >
            {[
              { href: `mailto:${portfolioConfig.personal.email}`, icon: Mail, label: "Email" },
              { href: `tel:${portfolioConfig.personal.phone}`, icon: Phone, label: "Phone" },
              { href: portfolioConfig.social.linkedin, icon: Linkedin, label: "LinkedIn" },
              { href: portfolioConfig.social.github, icon: Github, label: "GitHub" },
            ].map(({ href, icon: Icon, label }) => (
              <motion.a
                key={label}
                href={href}
                target={href.startsWith('http') ? "_blank" : undefined}
                rel={href.startsWith('http') ? "noopener noreferrer" : undefined}
                className="p-3 rounded-full bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 group"
                whileHover={{ 
                  scale: 1.1, 
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  backgroundColor: "hsl(var(--primary) / 0.1)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="sr-only">{label}</span>
              </motion.a>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          >
            <motion.a 
              href="#about"
              className="flex flex-col items-center text-muted-foreground hover:text-primary transition-colors group"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-sm mb-2 opacity-0 group-hover:opacity-100 transition-opacity">Scroll Down</span>
              <ArrowDown className="h-6 w-6" />
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
