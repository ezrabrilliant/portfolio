import { ThemeProvider } from "@/components/theme-provider"
import AnimatedBackground from "@/components/animated-background"
import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import About from "@/components/about"
import Projects from "@/components/projects"
import Experience from "@/components/experience"
import Contact from "@/components/contact"
import Footer from "@/components/footer"
import { portfolioConfig } from "@/config/portfolio"

function App() {
  const { settings } = portfolioConfig;

  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem 
      disableTransitionOnChange
    >
      <div className="min-h-screen relative">
        <AnimatedBackground />
        <Navbar />
        <main>
          <Hero />
          {settings.showAbout && <About />}
          {settings.showProjects && <Projects />}
          {settings.showExperience && <Experience />}
          {settings.showContact && <Contact />}
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}

export default App
