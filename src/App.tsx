import { useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
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

  // Force re-render when privacy settings change
  const handlePrivacyToggle = (hideContact: boolean) => {
    setForceUpdate(prev => prev + 1)
  }

  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem 
      disableTransitionOnChange
    >
      <div className="min-h-screen relative" key={forceUpdate}>
        <AnimatedBackground />
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
    </ThemeProvider>
  )
}

export default App
