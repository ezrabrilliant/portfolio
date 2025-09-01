"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUp, Eye, EyeOff } from "lucide-react"

interface BackToTopProps {
  onPrivacyToggle?: (hideContact: boolean) => void
}

export default function BackToTop({ onPrivacyToggle }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [keySequence, setKeySequence] = useState<string[]>([])
  const [isDevMode, setIsDevMode] = useState(false)
  const [hideContact, setHideContact] = useState(true)

  // Secret key combination: "ezra" to toggle dev mode
  const secretSequence = ['e', 'z', 'r', 'a']

  // Show/hide button based on scroll position
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  // Listen for secret key sequence
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const newSequence = [...keySequence, event.key.toLowerCase()].slice(-4)
      setKeySequence(newSequence)

      // Check if secret sequence matches
      if (newSequence.join('') === secretSequence.join('')) {
        setIsDevMode(true)
        setTimeout(() => setIsDevMode(false), 5000) // Hide dev mode after 5 seconds
        setKeySequence([]) // Reset sequence
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [keySequence])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const toggleContactVisibility = () => {
    const newHideState = !hideContact
    setHideContact(newHideState)
    
    // Update global portfolio config
    const { portfolioConfig } = require('@/config/portfolio')
    portfolioConfig.privacy.hideContact = newHideState
    portfolioConfig.privacy.showPublicInfoOnly = newHideState
    
    // Trigger re-render by calling the callback
    if (onPrivacyToggle) {
      onPrivacyToggle(newHideState)
    }

    // Force re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('privacyToggled', { 
      detail: { hideContact: newHideState } 
    }))
  }

  return (
    <>
      {/* Back to Top Button */}
      <AnimatePresence>
        {isVisible && (
          <motion.button
            className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Back to Top"
          >
            <ArrowUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Developer Privacy Toggle (Secret) */}
      <AnimatePresence>
        {isDevMode && (
          <motion.div
            className="fixed bottom-6 left-6 z-50 p-4 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-lg"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <div className="flex items-center gap-3">
              <div className="text-xs">
                <div className="font-bold mb-1">Dev Mode</div>
                <div className="text-purple-200">Contact: {hideContact ? 'Hidden' : 'Visible'}</div>
              </div>
              <motion.button
                onClick={toggleContactVisibility}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={hideContact ? "Show Contact" : "Hide Contact"}
              >
                {hideContact ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  )
}
