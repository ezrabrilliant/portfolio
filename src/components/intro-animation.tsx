"use client"

import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"

interface IntroAnimationProps {
  onComplete: () => void
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const kineticTypeRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    const kineticType = kineticTypeRef.current

    if (!container || !kineticType) return

    // Handle resize untuk responsive behavior
    const handleResize = () => {
      // Update font size on resize
      const newFontSize = getResponsiveFontSize()
      typeLines.forEach(line => {
        line.style.fontSize = newFontSize
      })
      
      // Update container width on resize
      const isMobile = window.innerWidth < 768
      kineticType.style.width = isMobile ? '150vw' : '200vw'
      kineticType.style.left = isMobile ? '-25vw' : '-50vw'
    }

    // Create custom ease like CodePen
    const customEase = "power3.out" // Equivalent to CodePen's customEase

    // Create type lines exactly like CodePen
    const typeLines: HTMLElement[] = []
    const oddLines: HTMLElement[] = []
    const evenLines: HTMLElement[] = []

    // Get responsive font size based on screen width
    const getResponsiveFontSize = () => {
      const width = window.innerWidth
      if (width < 640) return '3rem'      // Mobile: 48px
      if (width < 768) return '4rem'      // Small tablet: 64px
      if (width < 1024) return '5rem'     // Tablet: 80px
      if (width < 1280) return '6rem'     // Small desktop: 96px
      return '8rem'                       // Large desktop: 128px
    }

    const responsiveFontSize = getResponsiveFontSize()

    // Create 12 lines like in CodePen with responsive sizing
    for (let i = 0; i < 12; i++) {
      const line = document.createElement('div')
      line.className = `type-line ${i % 2 === 0 ? 'odd' : 'even'}`
      line.style.cssText = `
        font-size: ${responsiveFontSize};
        font-weight: bold;
        color: currentColor;
        opacity: 0.015;
        white-space: nowrap;
        line-height: 1;
        transform: translateX(0%);
        display: block;
        width: max-content;
        overflow: visible;
      `
      
      typeLines.push(line)
      if (i % 2 === 0) {
        oddLines.push(line)
      } else {
        evenLines.push(line)
      }
      
      kineticType.appendChild(line)
    }

    // Set initial state like CodePen
    gsap.set(kineticType, {
      display: "block",
      scale: 1,
      rotation: 0,
      opacity: 1,
      visibility: "visible"
    })

    gsap.set(typeLines, {
      opacity: 0.015,
      x: "0%"
    })

    // EXACT startKineticAnimation function from CodePen
    const startKineticAnimation = (text: string) => {
      // Reset everything first
      gsap.killTweensOf([kineticType, typeLines, oddLines, evenLines])

      // Set kinetic type visible (like CodePen)
      kineticType.style.display = "block"
      kineticType.style.opacity = "1"
      kineticType.style.visibility = "visible"

      // Create repeated text like CodePen
      const repeatedText = `${text} ${text} ${text}`

      // Set text content for all lines dengan multiple repetitions untuk seamless wrap
      typeLines.forEach((line, index) => {
        // Create seamless repeating text untuk marquee effect yang panjang
        const seamlessText = Array(8).fill(repeatedText).join(' ') // 8x repetition
        line.textContent = seamlessText
        
        // Set initial positioning untuk seamless loop
        const isEven = index % 2 === 0
        line.style.whiteSpace = 'nowrap'
        line.style.width = 'max-content'
        
        // Responsive starting position
        const isMobile = window.innerWidth < 768
        const startDistance = isMobile ? "30vw" : "50vw"
        
        // Set starting position agar teks selalu terlihat
        gsap.set(line, {
          x: isEven ? startDistance : `-${startDistance}` // Start from opposite side
        })
      })

      // Initial state - text invisible, positioned for marquee
      gsap.set(typeLines, {
        opacity: 0,
        scale: 1,
        rotation: 0
        // x position already set above untuk marquee starting position
      })

      // Dynamic entrance animation with align movement - ALL AT ONCE
      const entranceTl = gsap.timeline()
      
      // All lines appear simultaneously
      // Instant appearance for all lines
      entranceTl.to(typeLines, {
        opacity: 0.9,
        duration: 0.2,
        ease: "power1.out"
      })
      
      // Align animation - all lines move to center smoothly (no left-right movement)
      .to(typeLines, {
        x: "0%", // All lines align to center
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.05 // Slight stagger for organic feel
      }, "+=0.2")
      
      // Optional: subtle breathing/scaling while aligned
      .to(typeLines, {
        scale: 1.02,
        duration: 0.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: 1,
        stagger: 0.03
      }, "+=0.1")
      
      // Final opacity increase before kinetic
      .to(typeLines, {
        opacity: 0.85,
        duration: 0.4,
        ease: "power1.out"
      }, "+=0.2")

      // Wait for align animation to complete, then start kinetic animation
      setTimeout(() => {
        // No need to kill tweens since align animation is finite
        // Lines are already centered and ready for kinetic animation
        
        // Reset container to normal size untuk kinetic animation
        gsap.set(kineticType, {
          width: '100vw',
          left: '0'
        })
        
        // Reset text content to original untuk kinetic animation
        typeLines.forEach((line) => {
          line.textContent = repeatedText // Back to original repeated text
        })
        
        // Start kinetic animation langsung tanpa reset position (keep random positions)
        const timeline = gsap.timeline({
          onComplete: () => {
            console.log('Kinetic animation complete')
          }
        })

        // EXACT animation from CodePen lines 372-416
        timeline.to(kineticType, {
          duration: 1.4,
          ease: customEase,
          scale: 2.7,
          rotation: -90
        })

        // Odd lines animation
        timeline.to(oddLines, {
          keyframes: [
            { x: "20%", duration: 1, ease: customEase },
            { x: "-200%", duration: 1.5, ease: customEase }
          ],
          stagger: 0.08
        }, 0)

        // Even lines animation
        timeline.to(evenLines, {
          keyframes: [
            { x: "-20%", duration: 1, ease: customEase },
            { x: "200%", duration: 1.5, ease: customEase }
          ],
          stagger: 0.08
        }, 0)

        // Type lines opacity animation
        timeline.to(typeLines, {
          keyframes: [
            { opacity: 1, duration: 1, ease: customEase },
            { opacity: 0, duration: 1.5, ease: customEase }
          ],
          stagger: 0.05
        }, 0)

      }, 1500) // 2 seconds delay - wait for complete align animation sequence
    }

    // Start the animation
    setTimeout(() => {
      startKineticAnimation("EZRA BRILLIANT •")
    }, 200)

    // Exit animation - INSTANT transition
    const exitAnimation = () => {
      // No animation timeline - direct instant transition
      setIsVisible(false)
      onComplete() // Instant call to main page
    }

    // Auto exit after animation - align + kinetic timing
    setTimeout(() => {
      exitAnimation()
    }, 3500) // 2s align + 2.5s kinetic animation

    // Skip animation on click
    const handleSkip = () => {
      exitAnimation()
    }

    // Add event listeners
    container.addEventListener('click', handleSkip)
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('click', handleSkip)
      window.removeEventListener('resize', handleResize)
    }
  }, [onComplete])

  if (!isVisible) return null

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-background flex items-center justify-center cursor-pointer overflow-hidden"
    >
      {/* Kinetic type overlay - responsive container untuk seamless marquee */}
      <div 
        ref={kineticTypeRef}
        className="fixed inset-0 flex flex-col justify-center items-center pointer-events-none text-foreground"
        style={{
          zIndex: 200,
          display: 'block',
          visibility: 'visible',
          opacity: 1,
          overflow: 'visible', // Allow text to flow beyond container
          width: window.innerWidth < 768 ? '150vw' : '200vw', // Smaller container on mobile
          left: window.innerWidth < 768 ? '-25vw' : '-50vw' // Adjusted centering for mobile
        }}
      />

      {/* Skip indicator - responsive positioning */}
      <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 text-muted-foreground text-xs md:text-sm hover:text-foreground transition-colors flex items-center gap-1 md:gap-2">
        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-pulse" />
        <span className="hidden sm:inline">Click to skip</span>
        <span className="sm:hidden">Tap to skip</span>
      </div>
    </div>
  )
}
