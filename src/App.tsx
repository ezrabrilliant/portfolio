import { useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AnalyticsProvider } from "@/components/analytics-provider"
import IntroAnimation from "@/components/intro-animation"
import AnimatedBackground from "@/components/animated-background"
import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import About from "@/components/about"
import Projects from "@/components/projects"
import Experience from "@/components/experience"
import Contact from "@/components/contact"
import Footer from "@/components/footer"
import BackToTop from "@/components/ui/back-to-top"

function App() {
  const [forceUpdate, setForceUpdate] = useState(0)
  const [showIntro, setShowIntro] = useState(true)

  // Force re-render when privacy settings change
  const handlePrivacyToggle = (hideContact: boolean) => {
    setForceUpdate(prev => prev + 1)
  }

  const handleIntroComplete = () => {
    setShowIntro(false)
  }

  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem 
      disableTransitionOnChange
    >
      <AnalyticsProvider>
        {showIntro ? (
          <IntroAnimation onComplete={handleIntroComplete} />
        ) : (
          <div className="min-h-screen relative" key={forceUpdate}>
            <AnimatedBackground introComplete={!showIntro} />
            <Navbar />
            <main>
              <Hero />
              <About />
              <Projects />
              <Experience />
              <Contact />
            </main>
            <Footer />
            <BackToTop onPrivacyToggle={handlePrivacyToggle} />
          </div>
        )}
      </AnalyticsProvider>
    </ThemeProvider>
  )
}

export default App
