"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/dist/ScrollTrigger"
import { BarChart3, Database, Smartphone, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { portfolioConfig } from "../config/portfolio"
import { use3DCard } from '@/hooks/use3DCard'
import { parseHighlightedText } from '@/components/ui/highlighted-text'

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function About() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const underlineRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageGlowRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const highlightsRef = useRef<(HTMLLIElement | null)[]>([])
  const skillCardsRef = useRef<(HTMLDivElement | null)[]>([])
  const orb1Ref = useRef<HTMLDivElement>(null)
  const orb2Ref = useRef<HTMLDivElement>(null)

  const skills = [
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "Business Intelligence",
      description: "Data Visualization, and business insights generation",
    },
    {
      icon: <Database className="h-8 w-8 text-primary" />,
      title: "Data Analytics",
      description: "Business data processing, SQL queries, and statistical analysis",
    },
    {
      icon: <Smartphone className="h-8 w-8 text-primary" />,
      title: "Mobile Development",
      description: "Cross-platform mobile app development with Flutter and Android",
    },
    {
      icon: <Settings className="h-8 w-8 text-primary" />,
      title: "ERP Systems",
      description: "Experienced with Odoo ERP implementation and business process automation",
    }
  ]

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Floating orbs - MORE DRAMATIC movement
      if (orb1Ref.current) {
        gsap.to(orb1Ref.current, {
          scale: 1.4,
          rotate: 360,
          duration: 15,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        })
      }

      if (orb2Ref.current) {
        gsap.to(orb2Ref.current, {
          scale: 0.6,
          rotate: -360,
          duration: 12,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        })
      }

      // Image glow - MORE INTENSE pulse
      if (imageGlowRef.current) {
        gsap.to(imageGlowRef.current, {
          scale: 1.2,
          opacity: 0.6,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "power2.inOut"
        })
      }

      // Section entrance animations - MORE KINETIC AND BOLD
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          end: "top 20%",
          toggleActions: "play none none none"
        }
      })

      // Title - dramatic entrance with rotation
      tl.from(titleRef.current, {
        opacity: 0,
        y: -50,
        scale: 0.7,
        rotation: -10,
        duration: 0.8,
        ease: "back.out(2)"
      })
      // Subtitle - quick pop
      .from(subtitleRef.current, {
        opacity: 0,
        y: 30,
        scale: 0.9,
        duration: 0.6,
        ease: "back.out(1)"
      }, "-=0.4")
      // Underline - fast sweep
      .to(underlineRef.current, {
        width: "100%",
        duration: 0.6,
        ease: "power3.out"
      }, "-=0.3")
      // Image - dramatic slide with rotation
      .from(imageContainerRef.current, {
        opacity: 0,
        x: -100,
        scale: 0.6,
        rotation: -15,
        duration: 0.9,
        ease: "back.out(2)"
      }, "-=0.4")
      // Content - slide from right with scale
      .from(contentRef.current, {
        opacity: 0,
        x: 100,
        scale: 0.9,
        duration: 0.8,
        ease: "back.out(1.7)"
      }, "-=0.7")

      // Highlights - kinetic stagger
      if (highlightsRef.current.length > 0) {
        gsap.from(highlightsRef.current.filter(Boolean), {
          scrollTrigger: {
            trigger: contentRef.current,
            start: "top 90%",
          },
          opacity: 0,
          x: -30,
          rotation: -5,
          stagger: 0.08,
          duration: 0.5,
          ease: "back.out(2)"
        })
      }

      // Skill cards - dramatic pop-in
      if (skillCardsRef.current.length > 0) {
        skillCardsRef.current.filter(Boolean).forEach((card, index) => {
          gsap.from(card, {
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              toggleActions: "play none none none"
            },
            opacity: 0,
            y: 80,
            scale: 0.5,
            rotation: -10,
            duration: 0.7,
            delay: index * 0.08,
            ease: "back.out(2)"
          })
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="about" className="py-20 relative overflow-hidden">
      {/* Background decorations */}
      <div
        ref={orb1Ref}
        className="absolute top-20 right-20 w-72 h-72 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl"
      />
      <div
        ref={orb2Ref}
        className="absolute bottom-20 left-20 w-56 h-56 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-2xl"
      />

      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2
              ref={titleRef}
              className="text-4xl md:text-5xl font-bold mb-4 relative inline-block cursor-pointer"
              onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.1, y: -5, rotation: 2, duration: 0.3, ease: "back.out(2)" })}
              onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, y: 0, rotation: 0, duration: 0.3, ease: "power2.out" })}
            >
              About <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Me</span>
              <div
                ref={underlineRef}
                className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: "0%" }}
              />
            </h2>
            <p
              ref={subtitleRef}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Get to know more about my journey, skills, and passion for creating digital experiences
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Profile Image */}
            <div className="flex justify-center lg:justify-start">
              <div
                ref={imageContainerRef}
                className="relative group cursor-pointer"
                onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.1, rotate: 5, duration: 0.4, ease: "back.out(2)" })}
                onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, rotate: 0, duration: 0.4, ease: "power2.out" })}
              >
                {/* Glowing background */}
                <div
                  ref={imageGlowRef}
                  className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl transform -translate-x-4 translate-y-4"
                />
                
                <div className="relative w-80 h-80 rounded-2xl overflow-hidden border-4 border-border shadow-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm">
                  <img
                    src={portfolioConfig.personal.avatar}
                    alt={portfolioConfig.personal.fullName}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay text */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-white font-semibold text-lg">{portfolioConfig.personal.fullName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* About Content */}
            <div ref={contentRef} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">Who I Am</h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                  {parseHighlightedText(portfolioConfig.about.introduction)}
                </p>
              </div>

              <div>
                <h4 className="text-xl font-semibold mb-3 text-primary">What I Bring</h4>
                <ul className="space-y-2">
                  {portfolioConfig.about.highlights.map((highlight, index) => (
                    <li
                      key={index}
                      ref={(el) => {highlightsRef.current[index] = el}}
                      className="flex items-start gap-3 text-muted-foreground"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>{parseHighlightedText(highlight)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                onMouseEnter={(e) => gsap.to(e.currentTarget.querySelector('button'), { scale: 1.05, duration: 0.3 })}
                onMouseLeave={(e) => gsap.to(e.currentTarget.querySelector('button'), { scale: 1, duration: 0.3 })}
              >
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg"
                >
                  <a href="#contact" className="flex items-center">
                    Let's Work Together
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Skills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill, index) => (
              <SkillCard
                key={index}
                skill={skill}
                index={index}
                cardRef={(el) => {skillCardsRef.current[index] = el}}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

interface SkillCardProps {
  skill: { icon: React.ReactNode; title: string; description: string };
  index: number;
  cardRef: (el: HTMLDivElement | null) => void;
}

function SkillCard({ skill, cardRef }: SkillCardProps) {
  const { cardRef: card3DRef, handleMouseMove, handleMouseLeave } = use3DCard();
  const iconRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseMove(e)
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1.3,
        rotate: 15,
        duration: 0.4,
        ease: "back.out(2)"
      })
    }
  }

  const handleLeave = () => {
    handleMouseLeave()
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1,
        rotate: 0,
        duration: 0.4,
        ease: "power2.out"
      })
    }
  }

  return (
    <div ref={cardRef} className="group">
      <div
        ref={card3DRef}
        onMouseMove={handleMouseEnter}
        onMouseLeave={handleLeave}
        className="holographic-card h-full flex flex-col p-6 rounded-xl bg-gradient-to-br from-background/80 to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg transition-all duration-500 cursor-pointer"
        style={{
          '--mouse-x': '50%',
          '--mouse-y': '50%',
        } as React.CSSProperties}
      >
        {/* Holographic shine overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent"
            style={{
              background: `radial-gradient(circle 200px at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.15) 0%, transparent 50%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg at var(--mouse-x) var(--mouse-y), 
                rgba(59, 130, 246, 0.1) 0deg, 
                rgba(147, 51, 234, 0.1) 120deg, 
                rgba(236, 72, 153, 0.1) 240deg, 
                rgba(59, 130, 246, 0.1) 360deg)`,
            }}
          />
        </div>

        <div className="relative z-10 flex items-center gap-4 h-full">
          {/* Logo di kiri */}
          <div
            ref={iconRef}
            className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0"
          >
            {skill.icon}
          </div>
          
          {/* Text dan deskripsi di kanan */}
          <div className="flex flex-col flex-grow">
            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
              {skill.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {skill.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
