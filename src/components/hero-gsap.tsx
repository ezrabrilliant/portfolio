"use client"

import { useEffect, useState, useRef } from "react"
import { gsap } from "gsap"
import { ArrowDown, Download, Github, Linkedin, Mail, Phone, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { portfolioConfig } from "@/config/portfolio"
import { parseHighlightedText } from '@/components/ui/highlighted-text'

export default function Hero() {
  const [typedText, setTypedText] = useState("")
  const [typingComplete, setTypingComplete] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // Refs for GSAP animations
  const containerRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const greetingRef = useRef<HTMLDivElement>(null)
  const nameWordsRef = useRef<(HTMLSpanElement | null)[]>([])
  const subtitleRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const buttonsRef = useRef<(HTMLDivElement | null)[]>([])
  const socialLinksRef = useRef<(HTMLAnchorElement | null)[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const orb1Ref = useRef<HTMLDivElement>(null)
  const orb2Ref = useRef<HTMLDivElement>(null)

  const titles = [
    portfolioConfig.personal.title,
    "UI/UX Enthusiast", 
    "Problem Solver",
    "Tech Innovator"
  ]

  // Typewriter effect
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
        if (typedText.length > 0) {
          setTypedText(typedText.slice(0, -1))
        } else {
          setCurrentIndex((prev) => (prev + 1) % titles.length)
          setTypingComplete(false)
        }
      }, typingComplete ? 2000 : 50)
      return () => clearTimeout(timeout)
    }
  }, [typedText, currentIndex, typingComplete, titles])

  // GSAP Animations on mount
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

      // Animate floating orbs
      if (orb1Ref.current) {
        gsap.to(orb1Ref.current, {
          scale: 1.2,
          rotate: 360,
          x: 50,
          duration: 20,
          repeat: -1,
          yoyo: true,
          ease: "none"
        })
      }

      if (orb2Ref.current) {
        gsap.to(orb2Ref.current, {
          scale: 0.8,
          rotate: -360,
          y: -30,
          duration: 15,
          repeat: -1,
          yoyo: true,
          ease: "none"
        })
      }

      // Avatar glow pulse
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          scale: 1.2,
          opacity: 0.6,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        })
      }

      // Main entrance animation timeline
      tl.from(avatarRef.current, {
        opacity: 0,
        scale: 0.5,
        duration: 0.8,
        ease: "back.out(1.7)"
      })
      .from(greetingRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.6
      }, "-=0.3")
      .from(nameWordsRef.current.filter(Boolean), {
        opacity: 0,
        y: 50,
        rotationX: -90,
        stagger: 0.1,
        duration: 0.8,
        ease: "back.out(1.7)"
      }, "-=0.3")
      .from(subtitleRef.current, {
        opacity: 0,
        duration: 0.8
      }, "-=0.3")
      .from(descriptionRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.8
      }, "-=0.5")
      .from(buttonsRef.current.filter(Boolean), {
        opacity: 0,
        scale: 0.8,
        stagger: 0.1,
        duration: 0.5,
        ease: "back.out(1.7)"
      }, "-=0.4")
      .from(socialLinksRef.current.filter(Boolean), {
        opacity: 0,
        y: 20,
        stagger: 0.08,
        duration: 0.5,
        ease: "back.out(1.7)"
      }, "-=0.3")
      .from(scrollRef.current, {
        opacity: 0,
        duration: 1
      }, "-=0.2")

      // Scroll indicator bounce
      if (scrollRef.current) {
        gsap.to(scrollRef.current, {
          y: 10,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        })
      }
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const nameWords = portfolioConfig.personal.fullName.split(" ")

  const handleButtonHover = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1.05,
      duration: 0.3,
      ease: "back.out(1.7)"
    })
  }

  const handleButtonLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out"
    })
  }

  const handleSocialHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1.1,
      duration: 0.3,
      ease: "back.out(1.7)"
    })
  }

  const handleSocialLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out"
    })
  }

  return (
    <section 
      ref={containerRef}
      id="home" 
      className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
    >
      {/* Floating orbs */}
      <div
        ref={orb1Ref}
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"
      />
      <div
        ref={orb2Ref}
        className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-purple-500/10 blur-2xl"
      />

      <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center relative z-10">
        <div className="max-w-4xl">
          {/* Avatar */}
          <div
            ref={avatarRef}
            className="mb-8 flex justify-center"
          >
            <div 
              className="relative group cursor-pointer"
              onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.3 })}
              onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3 })}
            >
              {/* Glowing background */}
              <div 
                ref={glowRef}
                className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-xl"
              />
              
              <div 
                className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-border shadow-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm"
              >
                <img 
                  src={portfolioConfig.personal.avatar}
                  alt={portfolioConfig.personal.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Greeting */}
          <div
            ref={greetingRef}
            className="mb-4"
          >
            <span className="text-lg text-muted-foreground font-medium">👋 Hello, I'm</span>
          </div>

          {/* Name with word-by-word animation */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <div className="flex flex-wrap justify-center gap-3">
              {nameWords.map((word, index) => (
                <span
                  key={index}
                  ref={(el) => {nameWordsRef.current[index] = el}}
                  className={`inline-block cursor-pointer ${
                    index === nameWords.length - 1 
                      ? "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent"
                      : "text-foreground"
                  }`}
                  onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.2 })}
                  onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.2 })}
                >
                  {word}
                </span>
              ))}
            </div>
          </h1>

          {/* Animated subtitle with typewriter effect */}
          <div 
            ref={subtitleRef}
            className="mb-6 h-16 flex items-center justify-center"
          >
            <h2 className="text-2xl md:text-3xl font-semibold text-muted-foreground">
              {typedText}
              {!typingComplete && <span className="animate-pulse text-primary">|</span>}
            </h2>
          </div>

          {/* Description */}
          <p 
            ref={descriptionRef}
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            {parseHighlightedText(portfolioConfig.personal.description)}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div 
              ref={(el) => {buttonsRef.current[0] = el}}
              onMouseEnter={handleButtonHover}
              onMouseLeave={handleButtonLeave}
              className="cursor-pointer"
            >
              <Button size="lg" className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                <a href="#contact" className="flex items-center">
                  <Mail className="mr-2 h-5 w-5" />
                  Get In Touch
                </a>
              </Button>
            </div>
            
            <div 
              ref={(el) => {buttonsRef.current[1] = el}}
              onMouseEnter={handleButtonHover}
              onMouseLeave={handleButtonLeave}
              className="cursor-pointer"
            >
              <Button size="lg" variant="outline" className="rounded-full border-2 hover:bg-primary/10">
                <a href="#projects" className="flex items-center">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  View Projects
                </a>
              </Button>
            </div>
            
            <div 
              ref={(el) => {buttonsRef.current[2] = el}}
              onMouseEnter={handleButtonHover}
              onMouseLeave={handleButtonLeave}
              className="cursor-pointer"
            >
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
            </div>
          </div>

          {/* Social links */}
          <div className="flex justify-center space-x-6 mb-12">
            {[
              { href: `mailto:${portfolioConfig.personal.email}`, icon: Mail, label: "Email" },
              { href: `tel:${portfolioConfig.personal.phone}`, icon: Phone, label: "Phone" },
              { href: portfolioConfig.social.linkedin, icon: Linkedin, label: "LinkedIn" },
              { href: portfolioConfig.social.github, icon: Github, label: "GitHub" },
            ].map(({ href, icon: Icon, label }, index) => (
              <a
                key={label}
                ref={(el) => {socialLinksRef.current[index] = el}}
                href={href}
                target={href.startsWith('http') ? "_blank" : undefined}
                rel={href.startsWith('http') ? "noopener noreferrer" : undefined}
                className="p-3 rounded-full bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 group"
                onMouseEnter={handleSocialHover}
                onMouseLeave={handleSocialLeave}
              >
                <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="sr-only">{label}</span>
              </a>
            ))}
          </div>

          {/* Scroll indicator */}
          <div
            ref={scrollRef}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          >
            <a 
              href="#about"
              className="flex flex-col items-center text-muted-foreground hover:text-primary transition-colors group"
            >
              <span className="text-sm mb-2 opacity-0 group-hover:opacity-100 transition-opacity">Scroll Down</span>
              <ArrowDown className="h-6 w-6" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
