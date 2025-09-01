import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Menu, X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { portfolioConfig } from "@/config/portfolio"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  const navVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
  }

  const mobileMenuVariants = {
    hidden: { 
      opacity: 0,
      y: -20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
  }

  const menuItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
  }

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={navVariants}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-background/95 backdrop-blur-md shadow-lg border-b border-border/50" 
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <motion.button 
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
          className="text-2xl font-bold cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {portfolioConfig.personal.name}
          </span>
          <span className="text-primary bg-clip-text font-bold"> {portfolioConfig.personal.lastName}</span>
        </motion.button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {portfolioConfig.navigation.map((item, index) => (
            <motion.button
              key={item.name}
              className="text-muted-foreground hover:text-primary transition-colors relative group"
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                const target = document.querySelector(item.href)
                target?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              {item.name}
              <motion.div
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary origin-left"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="sm" asChild>
              <a 
                href={portfolioConfig.personal.resume} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <Download className="mr-2 h-4 w-4" />
                Resume
              </a>
            </Button>
          </motion.div>
          <ModeToggle />
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center md:hidden">
          <ModeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(!isOpen)}
            className="ml-2"
          >
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.div>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={mobileMenuVariants}
          className="md:hidden fixed inset-x-0 top-[72px] bottom-0 bg-background/95 backdrop-blur-md border-t border-border/50"
        >
          <div className="container mx-auto px-4 py-8">
            <nav className="space-y-6">
              {portfolioConfig.navigation.map((item, index) => (
                <motion.button
                  key={item.name}
                  className="block text-lg font-medium text-muted-foreground hover:text-primary transition-colors w-full text-left"
                  variants={menuItemVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    const target = document.querySelector(item.href)
                    target?.scrollIntoView({ behavior: "smooth" })
                    setIsOpen(false)
                  }}
                >
                  {item.name}
                </motion.button>
              ))}
              
              <motion.div
                variants={menuItemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: portfolioConfig.navigation.length * 0.1 }}
                className="pt-6 border-t border-border/50"
              >
                <Button className="w-full" asChild>
                  <a 
                    href={portfolioConfig.personal.resume} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center"
                    onClick={() => setIsOpen(false)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Resume
                  </a>
                </Button>
              </motion.div>
            </nav>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
