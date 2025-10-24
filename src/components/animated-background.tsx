"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { gsap } from "gsap"

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  hue: number
}

interface AnimatedBackgroundProps {
  introComplete?: boolean
}

export default function AnimatedBackground({ introComplete = false }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme, systemTheme } = useTheme()
  const fadeOpacityRef = useRef(0) // For controlling fade-in

  // Handle fade-in when intro is complete
  useEffect(() => {
    if (introComplete) {
      // Smooth fade-in animation
      gsap.to(fadeOpacityRef, {
        current: 1,
        duration: 1.2,
        ease: "power2.out"
      })
    } else {
      // Keep hidden during intro
      fadeOpacityRef.current = 0
    }
  }, [introComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []
    let time = 0

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    const initParticles = () => {
      particles = []
      const particleCount = Math.min(Math.floor(window.innerWidth * 0.05), 100)

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          opacity: Math.random() * 0.5 + 0.2,
          hue: Math.random() * 60 + 200 // Blue to purple range
        })
      }
    }

    const drawGradientBackground = () => {
      const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark")
      const fadeOpacity = fadeOpacityRef.current
      
      // Create main gradient
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.5, 
        canvas.height * 0.3, 
        0,
        canvas.width * 0.5, 
        canvas.height * 0.3, 
        Math.max(canvas.width, canvas.height) * 0.8
      )

      if (isDark) {
        // Dark theme with fade
        gradient.addColorStop(0, `rgba(59, 130, 246, ${0.15 * fadeOpacity})`)
        gradient.addColorStop(0.3, `rgba(99, 102, 241, ${0.08 * fadeOpacity})`)
        gradient.addColorStop(0.6, `rgba(139, 92, 246, ${0.05 * fadeOpacity})`)
        gradient.addColorStop(1, "rgba(15, 23, 42, 0)")
        
        ctx.fillStyle = "#0f172a" // slate-900
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        // Light theme with fade
        gradient.addColorStop(0, `rgba(59, 130, 246, ${0.1 * fadeOpacity})`)
        gradient.addColorStop(0.3, `rgba(99, 102, 241, ${0.06 * fadeOpacity})`)
        gradient.addColorStop(0.6, `rgba(139, 92, 246, ${0.04 * fadeOpacity})`)
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
        
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add pulsing effect with fade
      const pulse = Math.sin(time * 0.002) * 0.5 + 0.5
      const pulseGradient = ctx.createRadialGradient(
        canvas.width * 0.7 + Math.sin(time * 0.001) * 100,
        canvas.height * 0.6 + Math.cos(time * 0.0015) * 80,
        0,
        canvas.width * 0.7,
        canvas.height * 0.6,
        300 + pulse * 100
      )

      if (isDark) {
        pulseGradient.addColorStop(0, `rgba(168, 85, 247, ${0.1 * pulse * fadeOpacity})`)
        pulseGradient.addColorStop(1, "rgba(168, 85, 247, 0)")
      } else {
        pulseGradient.addColorStop(0, `rgba(168, 85, 247, ${0.05 * pulse * fadeOpacity})`)
        pulseGradient.addColorStop(1, "rgba(168, 85, 247, 0)")
      }

      ctx.fillStyle = pulseGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const animate = () => {
      time++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      drawGradientBackground()

      const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark")
      const fadeOpacity = fadeOpacityRef.current

      particles.forEach((particle, index) => {
        // Update position
        particle.x += particle.speedX
        particle.y += particle.speedY

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Add subtle floating motion
        particle.x += Math.sin(time * 0.001 + index) * 0.1
        particle.y += Math.cos(time * 0.001 + index) * 0.1

        // Draw particle with glow effect
        const glowRadius = particle.size * 3
        const glowGradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, glowRadius
        )

        if (isDark) {
          glowGradient.addColorStop(0, `hsla(${particle.hue}, 70%, 60%, ${particle.opacity * fadeOpacity})`)
          glowGradient.addColorStop(0.4, `hsla(${particle.hue}, 70%, 60%, ${particle.opacity * 0.3 * fadeOpacity})`)
          glowGradient.addColorStop(1, `hsla(${particle.hue}, 70%, 60%, 0)`)
        } else {
          glowGradient.addColorStop(0, `hsla(${particle.hue}, 50%, 50%, ${particle.opacity * 0.7 * fadeOpacity})`)
          glowGradient.addColorStop(0.4, `hsla(${particle.hue}, 50%, 50%, ${particle.opacity * 0.2 * fadeOpacity})`)
          glowGradient.addColorStop(1, `hsla(${particle.hue}, 50%, 50%, 0)`)
        }

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()

        // Draw core particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = isDark 
          ? `hsla(${particle.hue}, 70%, 70%, ${particle.opacity * 0.8 * fadeOpacity})`
          : `hsla(${particle.hue}, 60%, 40%, ${particle.opacity * 0.6 * fadeOpacity})`
        ctx.fill()

        // Connect nearby particles
        for (let j = index + 1; j < particles.length; j++) {
          const dx = particles[j].x - particle.x
          const dy = particles[j].y - particle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(particles[j].x, particles[j].y)
            
            const connectionOpacity = (1 - distance / 120) * 0.1 * fadeOpacity
            ctx.strokeStyle = isDark
              ? `rgba(147, 197, 253, ${connectionOpacity})`
              : `rgba(59, 130, 246, ${connectionOpacity * 0.7})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    window.addEventListener("resize", resizeCanvas)
    resizeCanvas()
    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [theme, systemTheme])

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none" 
      aria-hidden="true" 
    />
  )
}
